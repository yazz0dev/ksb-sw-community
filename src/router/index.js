// src/router/index.js

import { createRouter, createWebHistory } from 'vue-router';
import Home from '../views/HomeView.vue';
import Login from '../views/LoginView.vue';
import EventDetails from '../views/EventDetails.vue';
import LeaderBoard from '../views/LeaderBoard.vue';
import ManageTeams from '../views/ManageTeams.vue';
import RatingForm from '../views/RatingForm.vue';
import Resources from '../views/ResourcesView.vue';
import Transparency from '../views/TransparencyView.vue';
import RequestEvent from '../views/RequestEvent.vue';
import ManageEventRequests from '../views/ManageEventRequests.vue';
import store from '../store';
import UserProfile from '../views/UserProfile.vue';
import ForgotPasswordView from '../views/ForgotPasswordView.vue';
import LandingView from '../views/LandingView.vue'; 

const routes = [
    { path: '/', name: 'Landing', component: LandingView, meta: { requiresAuth: false, guestOnly: true } }, // Mark as guestOnly
    { path: '/home', name: 'Home', component: Home, meta: { requiresAuth: true } },
    { path: '/login', name: 'Login', component: Login, meta: { requiresAuth: false, guestOnly: true } }, // Mark as guestOnly
    { path: '/event/:id', name: 'EventDetails', component: EventDetails, meta: { requiresAuth: true }, props: true },
    { path: '/leaderboard', name: 'Leaderboard', component: LeaderBoard, meta: { requiresAuth: true } },
    { path: '/manage-teams/:id', name: 'ManageTeams', component: ManageTeams, meta: { requiresAuth: true, requiresAdmin: true }, props: true },
    { path: '/rating/:eventId/:teamId?', name: 'RatingForm', component: RatingForm, meta: { requiresAuth: true }, props: true },
    { path: '/resources', name: 'Resources', component: Resources, meta: {requiresAuth: false} },  // Public
    { path: '/transparency', name: 'Transparency', component: Transparency, meta: {requiresAuth: false} }, // Public
    { path: '/request-event', name: 'RequestEvent', component: RequestEvent, meta: { requiresAuth: true } },
    { path: '/manage-requests', name: 'ManageRequests', component: ManageEventRequests, meta: { requiresAuth: true, requiresAdmin: true } },
    { 
        path: '/profile', 
        name: 'Profile', 
        component: UserProfile, 
        meta: {
            requiresAuth: true,
            noAdmin: true // Add this meta flag
        }
    },
    { path: '/forgot-password', name: 'ForgotPassword', component: ForgotPasswordView, meta: {requiresAuth: false, guestOnly: true} }, // Mark as guestOnly

];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// --- CORRECTED NAVIGATION GUARD ---
router.beforeEach((to, from, next) => {
  const requiresAuth = to.matched.some(record => record.meta.requiresAuth);
  const requiresAdmin = to.matched.some(record => record.meta.requiresAdmin);
  const guestOnly = to.matched.some(record => record.meta.guestOnly);
  const noAdmin = to.matched.some(record => record.meta.noAdmin);

  const isAuthenticated = store.getters['user/isAuthenticated'];
  const isAdmin = store.getters['user/isAdmin'];

  if (requiresAuth && !isAuthenticated) {
    next({ name: 'Login', query: { redirect: to.fullPath } });
  }
  else if (requiresAdmin && !isAdmin) {
    next({ name: 'Home' });
  }
  else if (guestOnly && isAuthenticated) {
    next({ name: 'Home' });
  }
  else if (noAdmin && isAdmin) {
    next({ name: 'Home' });
  }
  else {
    next();
  }
});
// --- END CORRECTED GUARD ---


export default router;