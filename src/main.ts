// src/main.ts
import { createApp, App as VueApp } from 'vue';
import App from './App.vue';
import router from './router';
import store from './store';
import { auth, db } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { disableNetwork, enableNetwork } from 'firebase/firestore';
import AuthGuard from './components/AuthGuard.vue';
import { isSupabaseConfigured } from './notifications';

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

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    // Show a UI prompt to reload, or force reload automatically:
    window.location.reload();
  });
}

// --- Supabase Push Notification Registration START ---
async function registerForPushNotifications() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
        console.log('Push notifications not supported by this browser.');
        return;
    }
    if (!isSupabaseConfigured()) {
         console.log('Supabase not configured, skipping push registration.');
         return;
    }
    // Registration logic for push with Supabase would go here (if needed)
    // For now, just log
    console.log("Supabase push registration is handled by the backend Edge Function.");
}
// --- Supabase Integration END ---

// --- OneSignal Initialization ---
const oneSignalAppId = import.meta.env.VITE_ONESIGNAL_APP_ID;

// Use the global OneSignal object loaded by the CDN script in index.html
function getOneSignal(): any {
    return (window as any).OneSignal;
}

async function initOneSignal() {
    if (!oneSignalAppId) {
        console.warn("OneSignal App ID not configured. Skipping OneSignal initialization.");
        return;
    }
    if (!isSupabaseConfigured()) {
         console.warn('Supabase not configured, OneSignal features requiring backend interaction might be limited.');
    }

    try {
        const OneSignal = getOneSignal();
        if (!OneSignal || typeof OneSignal.init !== 'function') {
            console.warn("OneSignal SDK not loaded on window. Make sure the CDN script is included in index.html.");
            return;
        }
        console.log("Initializing OneSignal SDK...");
        await OneSignal.init({
            appId: oneSignalAppId,
            allowLocalhostAsSecureOrigin: true,
            notifyButton: { enable: false },
        });
        console.log("OneSignal SDK Initialized");

        // If user is already logged in when SDK loads, set their ID
        const checkInitialAuth = () => {
            const currentUserId = store.state.user.uid;
            if (currentUserId && typeof OneSignal.setExternalUserId === 'function') {
                console.log(`Setting OneSignal external_user_id on init: ${currentUserId}`);
                OneSignal.setExternalUserId(currentUserId).catch((e: any) => console.error("OneSignal: Failed to set external user ID on init:", e));
            }
        }
        setTimeout(checkInitialAuth, 500);
    } catch (error) {
        console.error("Error initializing OneSignal:", error);
    }
}

initOneSignal();
// --- End OneSignal Initialization ---

// --- Firebase Auth State Listener ---
const unsubscribe = onAuthStateChanged(auth, async (user: User | null) => {
    console.log("Firebase Auth State Changed. User:", user ? user.uid : 'null');

    if (!authInitialized) {
        unsubscribe();
        authInitialized = true;
        console.log("Auth listener unsubscribed after first run.");
    }

    try {
        const OneSignal = getOneSignal();
        if (user) {
            // --- Set OneSignal External User ID ---
            try {
                if (OneSignal && typeof OneSignal.setExternalUserId === 'function') {
                    console.log(`Attempting to set OneSignal external_user_id: ${user.uid}`);
                    await OneSignal.setExternalUserId(user.uid);
                    console.log(`OneSignal external_user_id set to: ${user.uid}`);
                }
            } catch(osError) {
                console.error("OneSignal Error setting external user ID:", osError);
            }
            // --- End OneSignal ---

            if (store.state.user.uid !== user.uid || !store.state.user.hasFetched) {
                console.log("Fetching user data for logged-in user:", user.uid);
                await store.dispatch('user/fetchUserData', user.uid);
            } else {
                console.log("User data already present or fetched for:", user.uid);
            }

            // --- Register for push notifications only after login ---
            // Only the latest device per user will receive notifications (enforced by backend/device registration).
            await registerForPushNotifications();
        } else {
            // --- Remove OneSignal External User ID ---
            try {
                if (OneSignal && typeof OneSignal.removeExternalUserId === 'function') {
                    console.log("Attempting to remove OneSignal external_user_id.");
                    await OneSignal.removeExternalUserId();
                    console.log("OneSignal external_user_id removed.");
                }
            } catch (osError) {
                console.error("OneSignal Error removing external user ID:", osError);
            }

            console.log("User logged out. Clearing user data.");
            store.commit('user/clearUserData');
            store.commit('user/setHasFetched', true);

            const currentRouteName = router.currentRoute.value.name;
            if (!['Landing', 'Login', 'ForgotPassword'].includes(currentRouteName as string)) {
                console.log("Redirecting to Landing page after logout.");
                await router.replace({ name: 'Landing' });
            }
        }
    } catch (error) {
        console.error("Error processing auth state change:", error);
        if (!user) {
            store.commit('user/clearUserData');
        }
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


