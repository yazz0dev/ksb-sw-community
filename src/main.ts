// src/main.ts
import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "@/App.vue";
import router from "./router";
import AuthGuard from "@/components/AuthGuard.vue";
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { initializeAuth } from '@/services/authService'; // Import the initialization function

// Import stores only once
import { useAppStore } from "@/stores/appStore";
import { useProfileStore } from "@/stores/profileStore";
import { useNotificationStore } from "./stores/notificationStore";

import "@fortawesome/fontawesome-free/css/all.css";
import "./styles/main.scss";
import "bootstrap/dist/js/bootstrap.bundle.min.js";

// PWA Registration
import { registerSW } from 'virtual:pwa-register'

// Initialize auth persistence before creating the app
initializeAuth().then(() => {
  // Create pinia instance only once
  const pinia = createPinia();

  // Create the Vue application
  const app = createApp(App);
  app.use(pinia);
  app.use(router);
  app.component("AuthGuard", AuthGuard);

  // Initialize app stores
  const appStore = useAppStore();
  const profileStore = useProfileStore();

  // Initialize app listeners
  appStore.initAppListeners();

  // PWA Service Worker Registration
  const updateSW = registerSW({
    onNeedRefresh() {
      appStore.setNewAppVersionAvailable(true);
    },
    onOfflineReady() {
      const notificationStore = useNotificationStore();
      notificationStore.showNotification({
        message: 'App is ready to work offline!',
        type: 'success',
        duration: 3000
      });
    },
    onRegisterError(error) {
    }
  });

  // Make updateSW available globally for the reload functionality
  window.__updateSW = updateSW;

  // Set up auth initialization
  const auth = getAuth();

  // Mount app immediately
  app.mount('#app');

  // Handle auth state changes AFTER mounting
  onAuthStateChanged(auth, async (user) => {
    try {
      if (user) {
        console.log('Auth state changed: User is signed in');
        await profileStore.handleAuthStateChange(user);
      } else {
        console.log('Auth state changed: User is signed out');
        await profileStore.clearStudentSession(false);
      }
    } catch (error) {
      console.error('Error handling auth state change:', error);
    } finally {
      if (!appStore.hasFetchedInitialAuth) {
        appStore.setHasFetchedInitialAuth(true);
      }
    }
  }, (error) => {
    console.error('Error in auth state change listener:', error);
    appStore.setHasFetchedInitialAuth(true);
  });
}).catch(error => {
  console.error('Error initializing auth persistence:', error);
  // Fallback: Create and mount the app anyway if auth persistence fails
  const app = createApp(App);
  const pinia = createPinia(); // Create a new pinia instance for the fallback app
  app.use(pinia);
  app.use(router);
  app.component("AuthGuard", AuthGuard);

  // Initialize app stores for the fallback app
  // Make sure Pinia is used before initializing stores
  const appStore = useAppStore();
  const profileStore = useProfileStore();
  const notificationStore = useNotificationStore(); // Ensure notification store is available

  // Initialize app listeners for the fallback app
  appStore.initAppListeners();

  // PWA Service Worker Registration for the fallback app
  const updateSW = registerSW({
    onNeedRefresh() {
      appStore.setNewAppVersionAvailable(true);
    },
    onOfflineReady() {
      // Use the already initialized notificationStore
      notificationStore.showNotification({
        message: 'App is ready to work offline!',
        type: 'success',
        duration: 3000
      });
    },
    onRegisterError(swError) { // Added swError parameter
      console.error('Service Worker registration error in fallback:', swError);
    }
  });

  // Make updateSW available globally for the reload functionality for the fallback app
  window.__updateSW = updateSW;
  
  app.mount('#app');
  
  // Even in fallback, we need to set initial auth fetched to true to unblock UI/guards
  // And potentially try to listen to auth changes if getAuth() is available
  if (!appStore.hasFetchedInitialAuth) {
    appStore.setHasFetchedInitialAuth(true);
  }
  // Optionally, you could try to set up onAuthStateChanged here too, 
  // but the main setup failed, so it might be problematic.
  // For now, just ensure the app doesn't hang indefinitely on auth checks.
});

