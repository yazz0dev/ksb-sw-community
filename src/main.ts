// src/main.ts
import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "@/App.vue";
import router from "./router";
import AuthGuard from "@/components/AuthGuard.vue";
import { getAuth, onAuthStateChanged } from 'firebase/auth';

// Import stores only once
import { useAppStore } from "@/stores/appStore";
import { useProfileStore } from "@/stores/profileStore";
import { useNotificationStore } from "./stores/notificationStore";

import "@fortawesome/fontawesome-free/css/all.css";
import "./styles/main.scss";
import "bootstrap/dist/js/bootstrap.bundle.min.js";

// PWA Registration
import { registerSW } from 'virtual:pwa-register'

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
      await profileStore.handleAuthStateChange(user);
    } else {
      await profileStore.clearStudentSession(false);
    }
  } catch (error) {
  } finally {
    appStore.setHasFetchedInitialAuth(true);
  }
}, (error) => {
  appStore.setHasFetchedInitialAuth(true);
});

