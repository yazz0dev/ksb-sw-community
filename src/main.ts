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

// Network Status Management
const updateOnlineStatus = () => {
  const appStore = useAppStore();
  appStore.setNetworkOnlineStatus(navigator.onLine);
};

window.addEventListener('online', updateOnlineStatus);
window.addEventListener('offline', updateOnlineStatus);

// Initialize app stores
const appStore = useAppStore();
const profileStore = useProfileStore();

// Initialize app listeners
appStore.initAppListeners();

// PWA Service Worker Registration
const updateSW = registerSW({
  onNeedRefresh() {
    console.log('New version available, showing update prompt');
    appStore.setNewAppVersionAvailable(true);
  },
  onOfflineReady() {
    console.log('App ready to work offline');
    const notificationStore = useNotificationStore();
    notificationStore.showNotification({
      message: 'App is ready to work offline!',
      type: 'success',
      duration: 3000
    });
  },
  onRegisterError(error) {
    console.error('SW registration error:', error);
  }
});

// Make updateSW available globally for the reload functionality
window.__updateSW = updateSW;

// Set up auth initialization
const auth = getAuth();
console.log('Setting up Firebase Auth State Listener...');

// Mount app immediately
app.mount('#app');
console.log('Vue App Mounted.');

// Handle auth state changes AFTER mounting
onAuthStateChanged(auth, async (user) => {
  console.log('Firebase Auth State Changed. User:', user ? user.uid : 'null');
  
  try {
    if (user) {
      await profileStore.handleAuthStateChange(user);
    } else {
      await profileStore.clearStudentSession(false);
    }
  } catch (error) {
    console.error('Error during auth state change:', error);
  } finally {
    appStore.setHasFetchedInitialAuth(true);
  }
}, (error) => {
  console.error('Auth state change error:', error);
  appStore.setHasFetchedInitialAuth(true);
});

