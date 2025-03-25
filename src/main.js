// src/main.js
import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import store from './store';
import './firebase'; // Import Firebase
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import "vue3-star-ratings";

// Import Bootstrap CSS
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';

const auth = getAuth();

let app;

onAuthStateChanged(auth, (user) => {
  if (user) {
    // User is signed in, fetch data using UID
    store.dispatch('user/fetchUserData', user.uid) // Use user.uid
      .then(() => {
          if(!app){
            app = createApp(App);
            app.use(router);
            app.use(store);
            app.mount('#app');
          }
      });
  } else {
    // User is signed out
      store.dispatch('user/clearUserData');
      if(!app)
          {
              app = createApp(App);
              app.use(router);
              app.use(store);
              app.mount('#app');
          }
  }
});