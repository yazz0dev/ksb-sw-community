// src/main.ts
import { createApp, App as VueApp } from "vue";
import { createPinia } from "pinia";
import App from "@/App.vue";
import router from "./router";
import { auth, db } from "./firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { disableNetwork, enableNetwork } from "firebase/firestore";
import AuthGuard from "@/components/AuthGuard.vue";
import {
  getOneSignal,
} from "./utils/oneSignalUtils";

import { useAppStore } from "@/store/app";
import { useUserStore } from "@/store/user";
import { useNotificationStore } from "./store/notification";

import "@fortawesome/fontawesome-free/css/all.css";
import "./assets/styles/main.scss";
import "bootstrap/dist/js/bootstrap.bundle.min.js";

let appInstance: VueApp | null = null;
let isOnline: boolean = navigator.onLine;

// --- Pinia Instance ---
const pinia = createPinia();

// --- Network Listeners ---
window.addEventListener("online", () => {
  isOnline = true;
  enableNetwork(db).catch(console.error);
  // Ensure stores are available before using them in listeners
  if (appInstance) {
    // Check if app is mounted
    const appStore = useAppStore(pinia);
    appStore.setOnlineStatus(true);
    appStore.syncOfflineChanges();
  } else {
    console.warn("Network listener fired before app mount.");
  }
});
window.addEventListener("offline", () => {
  isOnline = false;
  disableNetwork(db).catch(console.error);
  if (appInstance) {
    const appStore = useAppStore(pinia);
    appStore.setOnlineStatus(false);
  } else {
    console.warn("Network listener fired before app mount.");
  }
});

// --- Service Worker Update Prompt ---
// (Keep existing code)
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (confirm("A new version of the app is available. Reload now?")) {
      window.location.reload();
    }
  });
}

// --- Push Notification Setup (Keep existing functions) ---
async function registerForPushNotifications() {
  /* ... */
}
async function initOneSignal() {
  /* ... */
}

// --- Firebase Auth State Listener ---
let unsubscribeAuth: (() => void) | null = null;

function setupAuthListener() {
  if (unsubscribeAuth) return;
  console.log("Setting up Firebase Auth State Listener...");

  unsubscribeAuth = onAuthStateChanged(auth, async (user: User | null) => {
    console.log("Firebase Auth State Changed. User:", user ? user.uid : "null");
    // Get store instances *inside* the listener callback
    const userStore = useUserStore(pinia);
    const notificationStore = useNotificationStore(pinia);

    // Determine if this is the *first* time the listener is running
    const isInitialAuthCheck = !userStore.hasFetched;

    try {
      const OneSignal = getOneSignal();
      // Use OneSignal.push safely even if SDK not fully loaded yet
      OneSignal.push(async () => {
        console.log("OneSignal SDK ready (in auth listener callback).");
        try {
          if (user) {
            if (typeof OneSignal.setExternalUserId === "function") {
              await OneSignal.setExternalUserId(user.uid);
              console.log(`Push Queue: external_user_id set to: ${user.uid}`);
            } else {
              console.warn(
                "Push Queue: setExternalUserId function not available yet.",
              );
            }
          } else {
            if (typeof OneSignal.removeExternalUserId === "function") {
              await OneSignal.removeExternalUserId();
              console.log("Push Queue: external_user_id removed.");
            } else {
              console.warn(
                "Push Queue: removeExternalUserId function not available yet.",
              );
            }
          }
        } catch (osError) {
          console.error("OneSignal Error (within push queue):", osError);
        }
      });

      // Process user state (fetch or clear)
      if (user) {
        // Fetch only if UID differs or it's the initial fetch
        if (userStore.uid !== user.uid || isInitialAuthCheck) {
          console.log(
            `Fetching user data (UID: ${user.uid}, Initial: ${isInitialAuthCheck})`,
          );
          await userStore.fetchUserData(user.uid);
        } else {
          console.log(`User data already loaded for ${user.uid}`);
        }
      } else {
        // Clear only if currently authenticated or it's the initial check
        if (userStore.isAuthenticated || isInitialAuthCheck) {
          console.log(
            `Clearing user data (Authenticated: ${userStore.isAuthenticated}, Initial: ${isInitialAuthCheck})`,
          );
          // await userStore.clearUserData(); // Commented out due to missing method
        } else {
          console.log("No user and already not authenticated, skipping clear.");
        }
      }

      // Mark initial fetch complete *after* processing state
      if (isInitialAuthCheck) {
        userStore.$patch({ hasFetched: true });
        console.log("Auth state initialized (hasFetched set to true).");
      }
    } catch (error) {
      console.error("Error processing auth state change:", error);
      // Ensure state reflects error scenario
      if (!user) {
        // await userStore.clearUserData(); // Commented out due to missing method
      }
      if (isInitialAuthCheck) {
        userStore.$patch({ hasFetched: true }); // Mark fetched even on error
      } 
      notificationStore.showNotification({
        message: "Error processing login/logout state.",
        type: "error",
      });
    } finally {
      // --- Crucial Change: Mount App *after* the first auth state check ---
      if (isInitialAuthCheck && userStore.hasFetched && !appInstance) {
        console.log("Initial auth state processed, mounting app...");
        mountApp(); // Mount the app here
      } else if (!appInstance && userStore.hasFetched) {
        // If somehow mountApp wasn't called but we are fetched, try mounting.
        console.warn("App not mounted but auth fetched, attempting mount.");
        mountApp();
      }

      // Handle post-mount logic like redirects
      if (appInstance && !user && router.currentRoute.value.meta.requiresAuth) {
        console.log(
          "Redirecting to Landing page after logout from protected route.",
        );
        await router.replace({ name: "Landing" });
      } else if (appInstance && user && !userStore.isAuthenticated) {
        // Rare case: Auth state mismatch
        // If Firebase has a user, but the store says not authenticated.

        // If this is part of the initial auth check for this specific user,
        // the main `try` block already attempted to fetch their data.
        // Avoid an immediate re-fetch here, even if userStore.uid is null
        // (which would be the case if their profile wasn't found during the initial fetch).
        if (isInitialAuthCheck) {
          console.warn(
            `Auth state: Firebase user ${user.uid} present, store.isAuthenticated is false. ` +
            `This is during initial auth check. Primary fetch attempt was made in 'try' block. ` +
            `Current store UID: ${userStore.uid || "null/empty"}.`
          );
          
          // Recovery option: If currentUser exists in the store but isAuthenticated flag is false,
          // we can safely patch the isAuthenticated flag without triggering another fetch
          if (userStore.currentUser?.uid === user.uid) {
            console.log(`Found valid user data in store for ${user.uid}, fixing authentication state.`);
            userStore.$patch({ isAuthenticated: true });
          } else if (userStore.uid === user.uid) {
            // UID matches but currentUser might be incomplete - still safer to patch than refetch
            console.log(`User UID matches but isAuthenticated is false. Setting authenticated flag.`);
            userStore.$patch({ isAuthenticated: true });
          } else {
            console.warn(`Cannot safely recover authentication state. User may need to log in again.`);
          }
        } else {
          // Not an initial auth check, so this might be a genuine later mismatch.
          // Only re-fetch if the store's UID also differs from the current Firebase user's UID.
          // If UIDs match but isAuthenticated is false, it's an internal store state issue
          // that re-fetching might exacerbate.
          if (userStore.uid !== user.uid) {
            console.warn(
              `Auth state mismatch (non-initial check) AND UID differs: Firebase user ${user.uid}, store UID ${userStore.uid || "null/empty"}. Re-fetching user data.`
            );
            await userStore.fetchUserData(user.uid); // Attempt recovery
          } else {
            console.warn(
              `Auth state mismatch (non-initial check): Firebase user ${user.uid} present, store.isAuthenticated is false, but store.uid matches. ` +
              `Skipping re-fetch to avoid potential Firestore errors. This indicates an issue in userStore logic.`
            );
            // At this point, userStore.currentUser might have data. If so, and only isAuthenticated is false,
            // it's a strong indicator of an internal store problem. Forcing isAuthenticated might be an option
            // but is risky without full knowledge of userStore.
            // Example: if (userStore.currentUser) userStore.$patch({ isAuthenticated: true });
          }
        }
      }
    }
  });
}
// --- End Firebase Auth State Listener ---

// --- Mount App Function ---
function mountApp(): void {
  if (appInstance) {
    console.log("Vue app already mounted.");
    return;
  }

  console.log("Mounting Vue app...");
  appInstance = createApp(App);
  appInstance.use(pinia); // Use Pinia FIRST
  appInstance.use(router); // Then Router
  appInstance.component("AuthGuard", AuthGuard);
  appInstance.mount("#app");
  console.log("Vue app mounted.");

  // Get stores *after* mounting and using Pinia
  const appStore = useAppStore(); // No need to pass pinia explicitly here
  const userStore = useUserStore();

  // Initialize post-mount features
  appStore.setOnlineStatus(isOnline);
  appStore.checkNetworkAndSync();
  appStore.initOfflineCapabilities();
  // userStore.clearStaleCache(); // Commented out due to missing method

  // Initialize Push Notifications after mount and auth check complete
  initOneSignal().then(() => {
    if (userStore.isAuthenticated) {
      registerForPushNotifications();
    }
  });
}

// --- Initial Setup ---
setupAuthListener(); // Start the listener, which will eventually call mountApp.
// Do NOT call mountApp() directly here.
