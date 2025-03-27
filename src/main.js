// src/main.js
import { createApp } from 'vue'; // Removed ref, watch
import App from './App.vue';
import router from './router';
import store from './store';
import { auth } from './firebase'; // Import auth from firebase.js
import { onAuthStateChanged } from 'firebase/auth';

// Import Bootstrap CSS & JS (Ensure these are imported only once)
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';

// Import Custom Global Styles
import './assets/styles/main.css';

// Import Font Awesome CSS
import '@fortawesome/fontawesome-free/css/all.css';

let appInstance = null;
let authInitialized = false; // Flag to prevent multiple initializations

// Listen for the initial auth state change ONCE
const unsubscribe = onAuthStateChanged(auth, async (user) => {
    console.log("Initial Auth State Determined. User:", user ? user.uid : 'null');
    unsubscribe(); // Unsubscribe after the first callback

    try {
        if (user) {
            // Fetch data only if user exists on initial load
            await store.dispatch('user/fetchUserData', user.uid);
        } else {
            // Ensure user data is cleared if no user on initial load
            store.commit('user/clearUserData'); // Use commit for direct state change
            store.commit('user/setHasFetched', true); // Mark fetch as complete (no user)
        }
    } catch (error) {
         console.error("Error during initial auth processing:", error);
          // Ensure hasFetched is true even on error so router guard proceeds
         if (!store.getters['user/hasFetchedUserData']) {
              store.commit('user/setHasFetched', true);
         }
    } finally {
        authInitialized = true;
        mountApp(); // Mount the app after initial auth state is processed
    }
});

function mountApp() {
    // Mount only once after auth is initialized
    if (!appInstance && authInitialized) {
        appInstance = createApp(App);
        appInstance.use(router);
        appInstance.use(store);
        // Global components (if any) could be registered here
        // appInstance.component('Vue3StarRatings', vue3StarRatings); // Example if needed globally
        appInstance.mount('#app');
        console.log("Vue app mounted.");
    } else if (appInstance) {
        console.log("Vue app already mounted.");
    } else {
         console.log("Auth not initialized yet, delaying app mount.");
    }
}

// Optional: Add a timeout failsafe for auth state check
setTimeout(() => {
    if (!authInitialized) {
        console.warn("Firebase Auth state check timed out. Mounting app...");
        // Mark as initialized and attempt to mount
        authInitialized = true;
        // Assume no user / clear state if auth timed out? Risky.
        // Best practice is to ensure Firebase initializes correctly.
        // For now, just ensure hasFetched is true so router doesn't block indefinitely.
        if (!store.getters['user/hasFetchedUserData']) {
           store.commit('user/clearUserData');
           store.commit('user/setHasFetched', true);
        }
        mountApp();
    }
}, 7000); // 7 second timeout