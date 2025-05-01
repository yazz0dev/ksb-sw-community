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
    // FIX: Use commit for mutations
    store.commit('app/setOnlineStatus', true);
    store.dispatch('app/syncOfflineChanges');
});
window.addEventListener('offline', () => {
    isOnline = false;
    disableNetwork(db).catch(console.error);
    // FIX: Use commit for mutations
    store.commit('app/setOnlineStatus', false);
});

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (confirm('A new version of the app is available. Reload now?')) {
        window.location.reload();
    }
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
    console.log("Supabase push registration is handled by the backend Edge Function.");
}
// --- Supabase Integration END ---

// --- OneSignal Initialization ---
const oneSignalAppId = import.meta.env.VITE_ONESIGNAL_APP_ID;

function getOneSignal(): any {
    // Ensure OneSignal array exists for push queue
    (window as any).OneSignal = (window as any).OneSignal || [];
    return (window as any).OneSignal;
}

async function initOneSignal() {
    if (!oneSignalAppId || window.location.hostname === 'localhost') {
        console.log('Skipping OneSignal initialization for localhost or missing App ID.');
        return;
    }
    if (!isSupabaseConfigured()) {
         console.warn('Supabase not configured, OneSignal features might be limited.');
    }

    try {
        const OneSignal = getOneSignal();
        // Use push for initialization as well
        OneSignal.push(() => {
            console.log("Initializing OneSignal SDK via push queue...");
            OneSignal.init({
                appId: oneSignalAppId,
                allowLocalhostAsSecureOrigin: true,
                notifyButton: { enable: false },
            }).then(() => {
                console.log("OneSignal SDK Initialized (async)");
                // Now SDK is ready, potentially check initial auth state again if needed
                checkAndSetExternalId();
            }).catch((e: any) => {
                 console.error("Error initializing OneSignal via push:", e);
            });
        });

    } catch (error) {
        console.error("Error setting up OneSignal push queue:", error);
    }
}

// Helper function to set external ID safely
function checkAndSetExternalId() {
    const OneSignal = getOneSignal();
    const currentUserId = store.state.user.uid;
    // Check if SDK is ready (sometimes needed even after init promise resolves)
    if (OneSignal && typeof OneSignal.setExternalUserId === 'function' && currentUserId) {
         console.log(`Setting OneSignal external_user_id after init: ${currentUserId}`);
         OneSignal.setExternalUserId(currentUserId).catch((e: any) => console.error("OneSignal: Failed to set external user ID after init:", e));
    }
}
// --- End OneSignal Initialization ---

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

        if (!authInitialized) {
            authInitialized = true;
            console.log("Auth state initialized.");
        }

        try {
            const OneSignal = getOneSignal();
            // Use OneSignal.push to queue operations until SDK is ready
            OneSignal.push(async () => {
                 console.log("OneSignal SDK ready (in auth listener callback).");
                 try {
                     if (user) {
                         // User is signed IN
                         if (typeof OneSignal.setExternalUserId === 'function') {
                             console.log(`Push Queue: Attempting setExternalUserId: ${user.uid}`);
                             await OneSignal.setExternalUserId(user.uid);
                             console.log(`Push Queue: external_user_id set to: ${user.uid}`);
                         } else {
                             console.warn("Push Queue: setExternalUserId function not available yet.");
                         }
                     } else {
                         // User is signed OUT
                         if (typeof OneSignal.removeExternalUserId === 'function') {
                             console.log("Push Queue: Attempting removeExternalUserId.");
                             await OneSignal.removeExternalUserId();
                             console.log("Push Queue: external_user_id removed.");
                         } else {
                             console.warn("Push Queue: removeExternalUserId function not available yet.");
                         }
                     }
                 } catch (osError) {
                     console.error("OneSignal Error (within push queue):", osError);
                 }
            });

            // Proceed with Vuex/App logic immediately (doesn't need to wait for OneSignal push)
            if (user) {
                if (store.state.user.uid !== user.uid || !store.state.user.hasFetched) {
                    console.log("Fetching user data for logged-in user:", user.uid);
                    await store.dispatch('user/fetchUserData', user.uid);
                } else {
                    console.log("User data already present or fetched for:", user.uid);
                }
                // Call initOneSignal here to ensure it starts initialization
                // It's okay if it runs multiple times; the push queue handles readiness.
                await initOneSignal();
                await registerForPushNotifications(); // Can attempt registration

            } else {
                console.log("User logged out. Clearing user data.");
                store.commit('user/clearUserData');
                store.commit('user/setHasFetched', true);

                const currentRouteMeta = router.currentRoute.value.meta;
                if (currentRouteMeta.requiresAuth) {
                     console.log("Redirecting to Landing page after logout from protected route.");
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
            if (authInitialized && !appInstance) {
                mountApp();
            }
        }
    });
}
// --- End Firebase Auth State Listener ---

function mountApp(): void {
    if (!appInstance && authInitialized) {
        appInstance = createApp(App);
        appInstance.use(router);
        appInstance.use(store);
        appInstance.component('AuthGuard', AuthGuard);
        appInstance.mount('#app');
        console.log("Vue app mounted.");
    } else if (appInstance) {
         // console.log("Vue app already mounted.");
    } else {
          console.log("Auth not initialized yet, delaying app mount.");
    }
}

// --- Initial Setup ---
// FIX: Use commit for mutation
store.commit('app/setOnlineStatus', isOnline);
initOneSignal(); // Start OneSignal init early (uses push queue)
setupAuthListener();
store.dispatch('app/checkNetworkAndSync'); // Initial check