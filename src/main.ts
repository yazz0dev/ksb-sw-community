// src/main.ts
import { createApp, App as VueApp } from 'vue';
import App from './App.vue';
import router from './router';
import store from './store';
import { auth, db } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { disableNetwork, enableNetwork } from 'firebase/firestore';
import AuthGuard from './components/AuthGuard.vue';

// --- Appwrite Integration START ---
import { isAppwriteConfigured, account } from './appwrite';
// --- Appwrite Integration END ---

import '@fortawesome/fontawesome-free/css/all.css';
import './assets/styles/main.scss';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';

let appInstance: VueApp | null = null;
let authInitialized: boolean = false;

let isOnline: boolean = navigator.onLine;
window.addEventListener('online', () => {
    isOnline = true;
    enableNetwork(db).catch(console.error);
});
window.addEventListener('offline', () => {
    isOnline = false;
    disableNetwork(db).catch(console.error);
});

// --- Appwrite Integration START ---
// Function to handle Appwrite JWT Login and Push Registration
async function handleAppwriteSessionAndPush(firebaseUser: User) {
    if (!firebaseUser || !isAppwriteConfigured()) {
         console.log("Skipping Appwrite session/push: Firebase user missing or Appwrite not configured.");
         return; // Exit if no user or Appwrite isn't configured
    }

    console.log("Attempting Appwrite JWT session creation via verification for:", firebaseUser.uid);
    try {
        // 1. Verify Firebase token validity with your Appwrite Function
        const idToken = await firebaseUser.getIdToken(true);
        // APPWRITE FUNCTION EXECUTION ENDPOINT !!!
        const verificationEndpoint = 'https://fra.cloud.appwrite.io/v1/functions/68023bde0015546b5dbc/executions'; 

        const verificationResponse = await fetch(verificationEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json', // Appwrite Functions expect JSON by default
                'Authorization': `Bearer ${idToken}`,
                // Add Appwrite specific headers if needed, e.g., for synchronous execution
                'x-appwrite-synchronous': 'true' // Optional: waits for function completion
            },
            // Appwrite Functions often don't need a body for this type of verification if using headers
            // body: JSON.stringify({}) // Send empty body if required by your function implementation
        });

        // Check the function execution response status directly
        if (verificationResponse.status !== 200) { // Assuming your function returns 200 on success
            const errorText = await verificationResponse.text();
            console.error("Backend Firebase token verification failed via Appwrite Function:", verificationResponse.status, errorText);
            throw new Error(`Backend verification failed (Status: ${verificationResponse.status})`);
        }
        console.log("Firebase token verified by backend Appwrite Function.");

        // 2. Create Appwrite Session using JWT (Client-side SDK initiates)
        await account.createJWT(); // This tells Appwrite to create a session based on the current Firebase user
        console.log('Appwrite JWT session created successfully.');

        // 3. After successful Appwrite login, attempt push registration
        await registerForPushNotifications();

    } catch (error) {
        console.error("Appwrite session creation or Push Registration failed:", error);
        store.dispatch('notification/showNotification', {
            message: 'Could not sync session with Appwrite/Push Service.',
            type: 'warning',
            duration: 5000
        }, { root: true }); // Ensure root dispatch for notification module
    }
}

// Function to handle Push Notification registration
async function registerForPushNotifications() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
        console.log('Push notifications not supported by this browser.');
        return;
    }
    if (!isAppwriteConfigured()) {
         console.log('Appwrite not configured, skipping push registration.');
         return;
    }

    console.log("Attempting push notification registration...");
    try {
        // Ensure Service Worker is ready
        const registration = await navigator.serviceWorker.ready;
        console.log('Service Worker ready:', registration);

        // Check current permission status
        if (Notification.permission === 'denied') {
             console.log('Push notification permission denied previously.');
             return; // Don't ask again if denied
        }

        if (Notification.permission === 'granted') {
             console.log('Push permission already granted. Subscribing...');
             // Use 'as any' to bypass type error for createPushSubscription
             await (account as any).createPushSubscription(registration);
             console.log('Successfully subscribed/re-subscribed to Appwrite push notifications.');
        } else {
             console.log('Push permission is default. Requesting permission...');
             // Request permission only if 'default' - will be handled by UI prompt in App.vue
             // We don't call requestPermission() here directly anymore,
             // the UI prompt in App.vue handles that interaction.
             // If permission is granted via the prompt, registerForPushNotifications might be called again.
             console.log("Push permission request deferred to UI prompt.");
        }

    } catch (error) {
        console.error('Failed to register for push notifications:', error);
        store.dispatch('notification/showNotification', {
            message: 'Failed to enable push notifications.',
            type: 'error',
            duration: 5000
        }, { root: true });
    }
}
// --- Appwrite Integration END ---

// --- Firebase Auth State Listener ---
const unsubscribe = onAuthStateChanged(auth, async (user: User | null) => {
    console.log("Firebase Auth State Changed. User:", user ? user.uid : 'null');

    // Unsubscribe only after the *very first* determination
    if (!authInitialized) {
        unsubscribe();
        authInitialized = true;
    }

    try {
        if (user) {
            if (store.state.user.uid !== user.uid || !store.state.user.hasFetched) {
                await store.dispatch('user/fetchUserData', user.uid);
            }
            await handleAppwriteSessionAndPush(user);
        } else {
            // Clear state immediately on logout
            store.commit('user/clearUserData');
            store.commit('user/setHasFetched', true);
            // Force landing page on logout if not already there
            if (router.currentRoute.value.name !== 'Landing') {
                await router.replace({ name: 'Landing' });
            }
        }
    } catch (error) {
        console.error("Error processing auth state change:", error);
        store.commit('user/setHasFetched', true);
    } finally {
        mountApp();
    }
});
// --- End Firebase Auth State Listener ---

function mountApp(): void {
    if (!appInstance && authInitialized) { // Mount only if initialized
        appInstance = createApp(App);
        appInstance.use(router);
        appInstance.use(store);
        appInstance.component('AuthGuard', AuthGuard);
        appInstance.mount('#app');
        console.log("Vue app mounted.");
    } else if (appInstance) {
         console.log("Vue app already mounted.");
    } else {
          console.log("Auth not initialized yet, delaying app mount.");
    }
}
