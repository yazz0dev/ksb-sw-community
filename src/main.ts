// src/main.ts
import { createApp, App as VueApp } from 'vue';
import App from './App.vue';
import router from './router';
import store from './store';
import { auth, db } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { disableNetwork, enableNetwork } from 'firebase/firestore';
import AuthGuard from './components/AuthGuard.vue';

// --- Appwrite/SendPulse Integration START ---
import { isAppwriteConfigured } from './appwrite'; // Import helper
// --- Appwrite/SendPulse Integration END ---

// Import Font Awesome CSS
import '@fortawesome/fontawesome-free/css/all.css';

// Import our custom Sass file
import './assets/styles/main.scss';

// ADD Bootstrap JS
import 'bootstrap/dist/js/bootstrap.bundle.min.js';

let appInstance: VueApp | null = null;
let authInitialized: boolean = false;

// Add network state handling
let isOnline: boolean = navigator.onLine;
window.addEventListener('online', () => {
    isOnline = true;
    enableNetwork(db).catch(console.error);
});
window.addEventListener('offline', () => {
    isOnline = false;
    disableNetwork(db).catch(console.error);
});

// Listen for the initial auth state change ONCE
const unsubscribe = onAuthStateChanged(auth, async (user: User | null) => {
    console.log("Initial Firebase Auth State Determined. User:", user ? user.uid : 'null');
    unsubscribe(); // Unsubscribe after the first callback

    try {
        if (user) {
            await store.dispatch('user/fetchUserData', user.uid);
            // --- Appwrite/SendPulse Integration START ---
            // Trigger Appwrite JWT login *after* Firebase user data is potentially fetched
            if (isAppwriteConfigured()) {
                // Call the JWT handling logic (defined below or imported)
                await handleAppwriteJwtLogin(user);
            } else {
                console.warn("Appwrite endpoint/project ID not configured. Skipping Appwrite JWT login.");
            }
            // --- Appwrite/SendPulse Integration END ---
        } else {
            store.commit('user/clearUserData');
            store.commit('user/setHasFetched', true);
        }
    } catch (error) {
         console.error("Error during initial auth processing:", error);
         if (!store.getters['user/hasFetchedUserData']) {
              store.commit('user/setHasFetched', true);
         }
    } finally {
        authInitialized = true;
        mountApp();
    }
});

// --- Appwrite/SendPulse Integration START ---
// Function to handle Appwrite JWT Login (call this after Firebase login)
async function handleAppwriteJwtLogin(firebaseUser: User) {
    if (!firebaseUser || !isAppwriteConfigured()) return;

    console.log("Attempting Appwrite JWT login...");
    try {
        const idToken = await firebaseUser.getIdToken(true); // Force refresh token

        // 1. Call your secure backend endpoint to exchange Firebase token for Appwrite JWT
        //    THIS ENDPOINT NEEDS TO BE CREATED BY YOU (e.g., Firebase Cloud Function)
        const response = await fetch('/api/generate-appwrite-jwt', { // Replace with your actual endpoint URL
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${idToken}`
            },
        });

        if (!response.ok) {
            const errorData = await response.text();
            console.error("Backend JWT generation failed:", response.status, errorData);
            throw new Error(`Failed to generate Appwrite token (Status: ${response.status})`);
        }

        const { appwriteJwt } = await response.json();

        if (!appwriteJwt) {
            throw new Error("No Appwrite JWT received from backend");
        }

        // 2. Log in to Appwrite using the obtained JWT
        const { account } = await import('./appwrite'); // Dynamically import to ensure client is ready
        // Appwrite v10+: updateSession(jwt)
        if (typeof account.updateSession === 'function') {
            await account.updateSession(appwriteJwt);
            console.log('Appwrite JWT session updated successfully.');
        } else {
            console.warn('Appwrite SDK does not support updateSession. JWT:', appwriteJwt);
        }

        // 3. (Optional but recommended) Trigger SendPulse subscription process if not already done
        // This could involve checking user prefs or directly calling SendPulse init logic
        // Example: import { initSendpulse } from './sendpulse'; initSendpulse();

    } catch (error) {
        console.error("Appwrite JWT login process failed:", error);
        // Handle error appropriately - maybe notify the user, log out, etc.
        // Depending on severity, you might want to clear the Appwrite session if one exists:
        // try { await account.deleteSession('current'); } catch (e) {}
    }
}
// --- Appwrite/SendPulse Integration END ---


function mountApp(): void {
    if (!appInstance && authInitialized) {
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

// Optional: Add a timeout failsafe
setTimeout(() => {
    if (!authInitialized) {
        console.error("Firebase Auth state check timed out. Mounting app...");
        authInitialized = true;
        if (!store.getters['user/hasFetchedUserData']) {
           store.commit('user/setHasFetched', true);
        }
        mountApp();
    }
}, 7000);