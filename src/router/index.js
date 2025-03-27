// src/router/index.js

import { createRouter, createWebHistory } from 'vue-router';
import Home from '../views/HomeView.vue';
import Login from '../views/LoginView.vue';
import EventDetails from '../views/EventDetails.vue';
import LeaderBoard from '../views/LeaderBoard.vue';
import RatingForm from '../views/RatingForm.vue';
import Resources from '../views/ResourcesView.vue';
import Transparency from '../views/TransparencyView.vue';
import RequestEvent from '../views/RequestEvent.vue';
import ManageRequestsView from '../views/ManageRequestsView.vue'; // Update import
import store from '../store';
import UserProfile from '../views/UserProfile.vue';
import ForgotPasswordView from '../views/ForgotPasswordView.vue';
import LandingView from '../views/LandingView.vue';
import PublicProfile from '../views/PublicProfile.vue';


const routes = [
  { path: '/', name: 'Landing', component: LandingView, meta: { requiresAuth: false, guestOnly: true } },
  { path: '/home', name: 'Home', component: Home, meta: { requiresAuth: true } },
  { path: '/login', name: 'Login', component: Login, meta: { requiresAuth: false, guestOnly: true } },
  { path: '/event/:id', name: 'EventDetails', component: EventDetails, meta: { requiresAuth: true }, props: true },
  { path: '/leaderboard', name: 'Leaderboard', component: LeaderBoard, meta: { requiresAuth: true } },
  { path: '/rating/:eventId/:teamId?', name: 'RatingForm', component: RatingForm, meta: { requiresAuth: true }, props: true },
  { path: '/resources', name: 'Resources', component: Resources, meta: { requiresAuth: false } },
  { path: '/transparency', name: 'Transparency', component: Transparency, meta: { requiresAuth: false } },
  { 
    path: '/request-event', 
    name: 'RequestEvent', 
    component: RequestEvent, 
    meta: { requiresAuth: true },
    props: route => ({ step: route.query.step || '1' })
  }, // Also serves as Create Event
  { 
    path: '/manage-requests', 
    name: 'ManageRequests', 
    component: ManageRequestsView, 
    meta: { requiresAuth: true, requiresAdmin: true } 
  }, // Renamed Route/Component

  {
    path: '/profile',
    name: 'Profile',
    component: UserProfile,
    meta: { requiresAuth: true }
  },
  {
    path: '/user/:userId',
    name: 'PublicProfile',
    component: PublicProfile,
    props: true,
    meta: { requiresAuth: false }
  },
  { path: '/forgot-password', name: 'ForgotPassword', component: ForgotPasswordView, meta: { requiresAuth: false, guestOnly: true } },

];

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) { return savedPosition; }
    else { return { top: 0 }; }
  }
});

// --- Navigation Guard ---
router.beforeEach(async (to, from, next) => {
  while (!store.getters['user/hasFetchedUserData']) {
    // console.log("Router Guard: Waiting for auth/user data fetch...");
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  // console.log("Router Guard: Auth/user data fetch complete. Proceeding...");

  const isAuthenticated = store.getters['user/isAuthenticated'];
  const isAdmin = store.getters['user/isAdmin'];

  if (to.meta.guestOnly && isAuthenticated) {
    // console.log("Router Guard: Authenticated user accessing guest page. Redirecting to /home.");
    next({ name: 'Home' }); return;
  }
  if (to.meta.requiresAuth && !isAuthenticated) {
    // console.log("Router Guard: Unauthenticated user accessing protected page. Redirecting to /login.");
    next({ name: 'Login' }); return;
  }
  if (to.meta.requiresAdmin && !isAdmin) {
    // console.log("Router Guard: Non-admin accessing admin page. Redirecting to /home.");
    next({ name: 'Home' }); return;
  }

  // console.log(`Router Guard: Allowing navigation to ${to.path}`);
  next();
});

export default router;