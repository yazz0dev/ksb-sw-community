// src/main.ts
import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "@/App.vue";
import router from "./router";
import AuthGuard from "@/components/AuthGuard.vue";
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { initializeAuth } from '@/services/authService'; // Import the initialization function
import { MotionPlugin } from '@vueuse/motion';

// Import stores only once
import { useAppStore } from "@/stores/appStore";
import { useProfileStore } from "@/stores/profileStore";
import { useNotificationStore } from "./stores/notificationStore";

import "@fortawesome/fontawesome-free/css/all.css";
import "./styles/main.scss";
// We no longer need to import bootstrap JS here. Components will import what they need.

// PWA Registration
import { registerSW } from 'virtual:pwa-register'

// --- Initialize App ---
async function initializeApp() {
  try {
    await initializeAuth();

    // Create pinia instance only once
    const pinia = createPinia();

    // Create the Vue application
    const app = createApp(App);
    app.use(pinia);
    app.use(router);
    app.use(MotionPlugin);
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
      onRegisterError(_error) {
        // Handle registration error if needed
      }
    });

    // Make updateSW available globally
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

  } catch (error) {
    console.error('Error initializing auth persistence or app:', error);
    // Handle critical initialization error (e.g., render a static error page)
    const appElement = document.getElementById('app');
    if (appElement) {
      appElement.innerHTML = `
        <div style="text-align: center; padding: 2rem;">
          <h1>Application Error</h1>
          <p>Could not initialize the application. Please try refreshing the page.</p>
        </div>
      `;
    }
  }
}

// Start the application
initializeApp();

