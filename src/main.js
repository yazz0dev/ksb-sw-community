// src/main.js
import { createApp } from 'vue';
import { createChakra } from '@chakra-ui/vue-next';
import theme from './theme';
import App from './App.vue';
import router from './router';
import store from './store';
import { auth, db } from './firebase'; // Import auth and db from firebase.js
import { onAuthStateChanged } from 'firebase/auth';
import { disableNetwork, enableNetwork } from 'firebase/firestore';
import AuthGuard from './components/AuthGuard.vue';

// Import Custom Global Styles
import './assets/styles/main.css';

// Import Font Awesome CSS
import '@fortawesome/fontawesome-free/css/all.css';

let appInstance = null;
let authInitialized = false; // Flag to prevent multiple initializations

// Add network state handling
let isOnline = navigator.onLine;
window.addEventListener('online', () => {
    isOnline = true;
    enableNetwork(db).catch(console.error);
});
window.addEventListener('offline', () => {
    isOnline = false;
    disableNetwork(db).catch(console.error);
});

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
    if (!appInstance && authInitialized) {
        const chakra = createChakra({
            theme,
            cssReset: true
        });
        
        appInstance = createApp(App);
        appInstance.use(router);
        appInstance.use(store);
        appInstance.use(chakra);

        // Register AuthGuard globally
        appInstance.component('AuthGuard', AuthGuard);

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
        console.error("Firebase Auth state check timed out. Mounting app with current state...");
        // Mark as initialized to allow app mount
        authInitialized = true;
        // Only set hasFetched to true if it's still false
        if (!store.getters['user/hasFetchedUserData']) {
           store.commit('user/setHasFetched', true);
        }
        mountApp();
    }
}, 7000); // 7 second timeout
