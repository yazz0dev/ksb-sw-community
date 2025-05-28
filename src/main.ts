// src/main.ts
import { createApp, App as VueApp } from "vue";
import { createPinia } from "pinia";
import App from "@/App.vue";
import router from "./router";
import { auth } from "./firebase";
import { onAuthStateChanged, User, setPersistence, browserLocalPersistence } from "firebase/auth";
import AuthGuard from "@/components/AuthGuard.vue";
import { getOneSignal } from "./utils/oneSignalUtils";

import { useAppStore } from "@/stores/appStore";
import { useProfileStore } from "@/stores/profileStore";
import { useNotificationStore } from "./stores/notificationStore";

import "@fortawesome/fontawesome-free/css/all.css";
import "./styles/main.scss";
import "bootstrap/dist/js/bootstrap.bundle.min.js";

let appInstance: VueApp | null = null;
const pinia = createPinia();

// Service Worker Registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('ServiceWorker registration successful');
      })
      .catch(err => {
        console.log('ServiceWorker registration failed: ', err);
      });
  });
}

// Network Status Management
let isOnline = navigator.onLine;
const updateOnlineStatus = () => {
  const wasOnline = isOnline;
  isOnline = navigator.onLine;
  
  if (appInstance) {
    const appStore = useAppStore(pinia);
    appStore.setNetworkOnlineStatus(isOnline);
    
    // Show notification only when status changes
    if (wasOnline !== isOnline) {
      const notificationStore = useNotificationStore(pinia);
      notificationStore.showNotification({
        message: isOnline ? 'You are back online!' : 'You are offline. Some features may be limited.',
        type: isOnline ? 'success' : 'warning',
        duration: 3000
      });
    }
  }
};

window.addEventListener('online', updateOnlineStatus);
window.addEventListener('offline', updateOnlineStatus);

// Firebase Auth State Listener
let unsubscribeAuth: (() => void) | null = null;

async function setupAuthListener() {
  if (unsubscribeAuth) return;
  console.log("Setting up Firebase Auth State Listener...");

  // Set persistence to LOCAL
  try {
    await setPersistence(auth, browserLocalPersistence);
  } catch (error) {
    console.error("Error setting auth persistence:", error);
  }

  unsubscribeAuth = onAuthStateChanged(auth, async (user: User | null) => {
    console.log("Firebase Auth State Changed. User:", user ? user.uid : "null");
    const studentStore = useProfileStore(pinia);
    const appStore = useAppStore(pinia);
    const notificationStore = useNotificationStore(pinia);

    const isInitialAuthCheck = !appStore.hasFetchedInitialAuth;

    try {
      // OneSignal Setup
      const OneSignal = getOneSignal();
      OneSignal.push(async () => {
        if (!isOnline) return; // Skip OneSignal operations when offline
        
        try {
          if (user) {
            if (typeof OneSignal.setExternalUserId === "function") {
              await OneSignal.setExternalUserId(user.uid);
            }
          } else if (typeof OneSignal.removeExternalUserId === "function") {
            await OneSignal.removeExternalUserId();
          }
        } catch (osError) {
          console.error("OneSignal Error:", osError);
        }
      });

      // Handle auth state in student store
      if (isOnline) {
        await studentStore.handleAuthStateChange(user);
      } else if (user) {
        // If offline, use cached data
        await studentStore.handleAuthStateChange(user);
      }

      if (isInitialAuthCheck) {
        appStore.setHasFetchedInitialAuth(true);
      }

    } catch (error) {
      console.error("Error processing auth state change:", error);
      if (isOnline) {
        await studentStore.clearStudentSession(false);
      }
      if (isInitialAuthCheck) {
        appStore.setHasFetchedInitialAuth(true);
      }
      notificationStore.showNotification({
        message: "Error processing login state.",
        type: "error"
      });
    } finally {
      if ((isInitialAuthCheck && appStore.hasFetchedInitialAuth) || !appInstance) {
        mountApp();
      }

      if (appInstance && !user && router.currentRoute.value.meta.requiresAuth) {
        await router.replace({ name: "Landing" });
      }
    }
  });
}

function mountApp(): void {
  if (appInstance) return;

  appInstance = createApp(App);
  appInstance.use(pinia);
  appInstance.use(router);
  appInstance.component("AuthGuard", AuthGuard);
  
  // Add global properties
  appInstance.config.globalProperties.$isOnline = isOnline;
  
  appInstance.mount("#app");

  const appStore = useAppStore();
  appStore.initAppListeners();
  updateOnlineStatus(); // Initial online status check
}

// Initial Setup
setupAuthListener();