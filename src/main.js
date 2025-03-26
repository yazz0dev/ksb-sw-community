// src/main.js
import { createApp, ref, watch } from 'vue'; // Import ref, watch
import App from './App.vue';
import router from './router';
import store from './store';
import './firebase';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import vue3StarRatings from "vue3-star-ratings"; // Correct import

// Import Bootstrap CSS & JS
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';

// --- IMPORT YOUR CUSTOM GLOBAL STYLES ---
import './assets/styles/main.css';

// Font Awesome
import '@fortawesome/fontawesome-free/css/all.css';

const auth = getAuth();
let appInstance = null;
const isAuthReady = ref(false); 

function mountApp() {
    if (!appInstance) {
        appInstance = createApp(App);
        appInstance.use(router);
        appInstance.use(store);
        appInstance.mount('#app');
        console.log("Vue app mounted.");
    }
}

// Listen for auth state changes
onAuthStateChanged(auth, async (user) => {
    console.log("Auth state changed. User:", user ? user.uid : 'null');
    try {
        if (user) {
            // User is signed in, fetch their data
            await store.dispatch('user/fetchUserData', user.uid);
        } else {
            // User is signed out, clear their data
            await store.dispatch('user/clearUserData');
        }
    } catch (error) {
        console.error("Error handling auth state change:", error);
         // Even if fetch fails, proceed to mount/route logic
         if (!store.getters['user/hasFetchedUserData']) {
              store.commit('user/setHasFetched', true); // Ensure fetch state is marked complete
         }
    } finally {
         isAuthReady.value = true; // Mark auth as ready regardless of user state
         console.log("Auth marked as ready.");
         mountApp(); // Ensure app is mounted after auth check completes
    }
});
