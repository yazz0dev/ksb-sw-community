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
            // No Supabase session logic needed for push
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
