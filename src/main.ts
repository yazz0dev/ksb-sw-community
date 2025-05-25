// src/main.ts
import { createApp, App as VueApp } from "vue";
import { createPinia } from "pinia";
import App from "@/App.vue";
import router from "./router";
import { auth } from "./firebase"; // db is not directly used here
import { onAuthStateChanged, User } from "firebase/auth";
import AuthGuard from "@/components/AuthGuard.vue";
import { getOneSignal } from "./utils/oneSignalUtils";

import { useAppStore } from "@/stores/appStore";
import { useProfileStore } from "@/stores/profileStore";
import { useNotificationStore } from "./stores/notificationStore";

import "@fortawesome/fontawesome-free/css/all.css";
import "./styles/main.scss";
import "bootstrap/dist/js/bootstrap.bundle.min.js";

let appInstance: VueApp | null = null;

// --- Pinia Instance ---
const pinia = createPinia();

// --- Firebase Auth State Listener ---
let unsubscribeAuth: (() => void) | null = null;

function setupAuthListener() {
  if (unsubscribeAuth) return;
  console.log("Setting up Firebase Auth State Listener...");

  unsubscribeAuth = onAuthStateChanged(auth, async (user: User | null) => {
    console.log("Firebase Auth State Changed. User:", user ? user.uid : "null");
    const studentStore = useProfileStore(pinia); // Pass pinia instance
    const appStore = useAppStore(pinia);     // Pass pinia instance
    const notificationStore = useNotificationStore(pinia); // Pass pinia instance

    const isInitialAuthCheck = !appStore.hasFetchedInitialAuth; // Use appStore's flag

    try {
      const OneSignal = getOneSignal();
      OneSignal.push(async () => {
        console.log("OneSignal SDK ready (in auth listener callback).");
        try {
          if (user) {
            if (typeof OneSignal.setExternalUserId === "function") {
              await OneSignal.setExternalUserId(user.uid);
              console.log(`Push Queue: external_user_id set to: ${user.uid}`);
            }
          } else {
            if (typeof OneSignal.removeExternalUserId === "function") {
              await OneSignal.removeExternalUserId();
              console.log("Push Queue: external_user_id removed.");
            }
          }
        } catch (osError) {
          console.error("OneSignal Error (within push queue):", osError);
        }
      });

      // Let studentProfileStore handle its own state based on auth changes
      await studentStore.handleAuthStateChange(user);

      if (isInitialAuthCheck) {
        appStore.setHasFetchedInitialAuth(true); // Mark initial auth processed
        console.log("Auth state initialized (hasFetchedInitialAuth set to true).");
      }

    } catch (error) {
      console.error("Error processing auth state change:", error);
      await studentStore.clearStudentSession(false); // Clear session but don't sign out from Firebase again
      if (isInitialAuthCheck) {
        appStore.setHasFetchedInitialAuth(true);
      }
      notificationStore.showNotification({
        message: "Error processing login/logout state.",
        type: "error",
      });
    } finally {
      if (isInitialAuthCheck && appStore.hasFetchedInitialAuth && !appInstance) {
        console.log("Initial auth state processed, mounting app...");
        mountApp();
      } else if (!appInstance && appStore.hasFetchedInitialAuth) {
        console.warn("App not mounted but auth fetched, attempting mount.");
        mountApp();
      }

      if (appInstance && !user && router.currentRoute.value.meta.requiresAuth) {
        console.log("Redirecting to Landing page after logout from protected route.");
        await router.replace({ name: "Landing" });
      }
    }
  });
}

// --- Mount App Function ---
function mountApp(): void {
  if (appInstance) {
    console.log("Vue app already mounted.");
    return;
  }

  console.log("Mounting Vue app...");
  appInstance = createApp(App);
  appInstance.use(pinia);
  appInstance.use(router);
  appInstance.component("AuthGuard", AuthGuard);
  appInstance.mount("#app");
  console.log("Vue app mounted.");

  const appStore = useAppStore();
  const studentStore = useProfileStore();

  appStore.initAppListeners(); // Initialize network listeners and other app-level logic
  // studentStore.clearStaleNameCache(); // Ensure this is active and the method exists in studentStore
}

// --- Initial Setup ---
setupAuthListener();