// src/main.ts
import { createApp, App as VueApp } from 'vue';
import { createPinia } from 'pinia'; // Import Pinia
import App from './App.vue';
import router from './router';
import { auth, db } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { disableNetwork, enableNetwork } from 'firebase/firestore';
import AuthGuard from './components/AuthGuard.vue';
import { isSupabaseConfigured } from './notifications';
import { getOneSignal, isPushSupported, isOneSignalConfigured as isOneSignalEnabled } from './utils/oneSignalUtils';

// Import Pinia stores - we'll need them for the auth listener
import { useAppStore } from '@/store/app';
import { useUserStore } from '@/store/user';
import { useNotificationStore } from './store/notification'; // Import notification store

import '@fortawesome/fontawesome-free/css/all.css';
import './assets/styles/main.scss';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';

let appInstance: VueApp | null = null;
let authInitialized: boolean = false;
let isOnline: boolean = navigator.onLine;

// --- Pinia Instance ---
// Create Pinia instance *before* setting up listeners that might need it
const pinia = createPinia();

// --- Network Listeners ---
window.addEventListener('online', () => {
    isOnline = true;
    enableNetwork(db).catch(console.error);
    const appStore = useAppStore(pinia); // Get store instance
    appStore.setOnlineStatus(true);
    appStore.syncOfflineChanges();
});
window.addEventListener('offline', () => {
    isOnline = false;
    disableNetwork(db).catch(console.error);
    const appStore = useAppStore(pinia); // Get store instance
    appStore.setOnlineStatus(false);
});

// --- Service Worker Update Prompt ---
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (confirm('A new version of the app is available. Reload now?')) {
        window.location.reload();
    }
  });
}

// --- Push Notification Setup ---
async function registerForPushNotifications() {
    if (!isPushSupported()) {
        console.log('Push notifications not supported by this browser.');
        return;
    }
    if (!isSupabaseConfigured()) {
         console.log('Supabase not configured, skipping push registration.');
         return;
    }
    console.log("Supabase push registration is handled by the backend Edge Function.");
}

async function initOneSignal() {
    if (!isOneSignalEnabled() || window.location.hostname === 'localhost') {
        console.log('Skipping OneSignal initialization for localhost or missing App ID.');
        return;
    }
    if (!isSupabaseConfigured()) {
         console.warn('Supabase not configured, OneSignal features might be limited.');
    }

    try {
        const OneSignal = getOneSignal();
        OneSignal.push(() => {
            console.log("Initializing OneSignal SDK via push queue...");
            const oneSignalAppId = import.meta.env.VITE_ONESIGNAL_APP_ID;
            OneSignal.init({
                appId: oneSignalAppId,
                allowLocalhostAsSecureOrigin: true,
                notifyButton: { enable: false },
            }).then(() => {
                console.log("OneSignal SDK Initialized (async)");
                checkAndSetExternalId();
            }).catch((e: any) => {
                 console.error("Error initializing OneSignal via push:", e);
            });
        });
    } catch (error) {
        console.error("Error setting up OneSignal push queue:", error);
    }
}

function checkAndSetExternalId() {
    const OneSignal = getOneSignal();
    const userStore = useUserStore(pinia); // Use Pinia store
    const currentUserId = userStore.uid; // Access state directly

    if (OneSignal && typeof OneSignal.setExternalUserId === 'function' && currentUserId) {
         console.log(`Setting OneSignal external_user_id after init: ${currentUserId}`);
         OneSignal.setExternalUserId(currentUserId).catch((e: any) => console.error("OneSignal: Failed to set external user ID after init:", e));
    }
}
// --- End Push Notification Setup ---


// --- Firebase Auth State Listener ---
let unsubscribeAuth: (() => void) | null = null;

function setupAuthListener() {
    if (unsubscribeAuth) {
        console.log("Auth listener already active.");
        return;
    }
    console.log("Setting up Firebase Auth State Listener...");
    unsubscribeAuth = onAuthStateChanged(auth, async (user: User | null) => {
        console.log("Firebase Auth State Changed. User:", user ? user.uid : 'null');
        // Get store instances *inside* the listener callback
        const userStore = useUserStore(pinia);
        const notificationStore = useNotificationStore(pinia); // Get notification store

        if (!authInitialized) {
            authInitialized = true;
            console.log("Auth state initialized.");
        }

        try {
            const OneSignal = getOneSignal();
            OneSignal.push(async () => {
                 console.log("OneSignal SDK ready (in auth listener callback).");
                 try {
                     if (user) {
                         if (typeof OneSignal.setExternalUserId === 'function') {
                             console.log(`Push Queue: Attempting setExternalUserId: ${user.uid}`);
                             await OneSignal.setExternalUserId(user.uid);
                             console.log(`Push Queue: external_user_id set to: ${user.uid}`);
                         } else { console.warn("Push Queue: setExternalUserId function not available yet."); }
                     } else {
                         if (typeof OneSignal.removeExternalUserId === 'function') {
                             console.log("Push Queue: Attempting removeExternalUserId.");
                             await OneSignal.removeExternalUserId();
                             console.log("Push Queue: external_user_id removed.");
                         } else { console.warn("Push Queue: removeExternalUserId function not available yet."); }
                     }
                 } catch (osError) { console.error("OneSignal Error (within push queue):", osError); }
            });

            // Pinia logic
            if (user) {
                if (userStore.uid !== user.uid || !userStore.hasFetched) {
                    console.log("Fetching user data for logged-in user:", user.uid);
                    await userStore.fetchUserData(user.uid); // Call Pinia action
                } else {
                    console.log("User data already present or fetched for:", user.uid);
                }
                await initOneSignal();
                await registerForPushNotifications();
            } else {
                console.log("User logged out. Clearing user data.");
                await userStore.clearUserData(); // Call Pinia action

                const currentRouteMeta = router.currentRoute.value.meta;
                if (currentRouteMeta.requiresAuth) {
                     console.log("Redirecting to Landing page after logout from protected route.");
                     // Use await for router navigation if needed, though replace is usually synchronous
                     await router.replace({ name: 'Landing' });
                }
            }
        } catch (error) {
            console.error("Error processing auth state change:", error);
            if (!user) {
                await userStore.clearUserData(); // Ensure clear on error during logout
            }
            userStore.setHasFetched(true); // Mark as fetched even on error to prevent blocking
             notificationStore.showNotification({ // Use notification store
                 message: "Error processing login/logout state. Please refresh.",
                 type: 'error'
             });
        } finally {
            // Mount the app only after the first auth state check completes
            if (!appInstance) {
                mountApp();
            }
        }
    });
}
// --- End Firebase Auth State Listener ---

// --- Mount App Function ---
function mountApp(): void {
    if (!appInstance) { // Check if already mounted
        appInstance = createApp(App);
        appInstance.use(router);
        appInstance.use(pinia); // Use Pinia instance created earlier
        appInstance.component('AuthGuard', AuthGuard);
        appInstance.mount('#app');
        console.log("Vue app mounted.");

        // Initial network check/sync after app mount and stores are available
        const appStore = useAppStore(pinia);
        appStore.setOnlineStatus(isOnline);
        appStore.checkNetworkAndSync();
        // Initialize offline capabilities listener
        appStore.initOfflineCapabilities();
        // Clear stale cache on startup
        const userStore = useUserStore(pinia);
        userStore.clearStaleCache();


    } else {
         console.log("Vue app already mounted.");
    }
}

// --- Initial Setup ---
// Start listeners immediately
setupAuthListener(); // This will trigger mountApp when auth is ready