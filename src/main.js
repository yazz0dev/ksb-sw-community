// src/main.js
import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import store from './store';
import './firebase'; 
import "vue3-star-ratings/dist/vue3-star-ratings.css";

const app = createApp(App);
app.use(router);
app.use(store);
app.mount('#app');