// src/main.js
import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import store from './store';
import './firebase'; // Import Firebase
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import "vue3-star-ratings";

// Import Bootstrap CSS (Keep for grid/base components unless completely replacing)
import 'bootstrap/dist/css/bootstrap.min.css';
// Import Bootstrap JS Bundle (Needed for dropdowns, toggles, etc.)
import 'bootstrap/dist/js/bootstrap.bundle.min.js';

// --- IMPORT YOUR CUSTOM GLOBAL STYLES ---
import './assets/styles/main.css';

// Font Awesome (if needed, e.g., for ResourcesView)
import '@fortawesome/fontawesome-free/css/all.css';

const auth = getAuth();

let app;

onAuthStateChanged(auth, (user) => {
  // ... (rest of your existing auth logic)
  if (user) {
    store.dispatch('user/fetchUserData', user.uid)
      .finally(() => { // Use finally to ensure app mounts
          if(!app){
            app = createApp(App);
            app.use(router);
            app.use(store);
            app.mount('#app');
          }
      });
  } else {
      store.dispatch('user/clearUserData');
      if(!app) {
          app = createApp(App);
          app.use(router);
          app.use(store);
          app.mount('#app');
      } else {
           // If app already exists, maybe force navigation if needed
           // e.g., if current route requires auth, redirect
           if (router.currentRoute.value.meta.requiresAuth) {
               router.push('/login');
           }
      }
  }
});

// Fallback mount if auth state change takes too long or doesn't fire initially
if (!app) {
    setTimeout(() => {
        if (!app) {
            console.warn("Auth state change timeout, mounting app.");
            app = createApp(App);
            app.use(router);
            app.use(store);
            app.mount('#app');
        }
    }, 1500); // Adjust timeout as needed
}