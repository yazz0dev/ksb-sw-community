// src/router/index.js

import { createRouter, createWebHistory } from 'vue-router';
import Home from '../views/HomeView.vue';
import Login from '../views/LoginView.vue';
import EventDetails from '../views/EventDetails.vue';
import LeaderboardView from '../views/LeaderboardView.vue';
import RatingForm from '../views/RatingForm.vue';
import Resources from '../views/ResourcesView.vue';
import Transparency from '../views/TransparencyView.vue';
import CreateEventView from '../views/CreateEventView.vue';
import ManageRequestsView from '../views/ManageRequestsView.vue';
import store from '../store';
// Removed UserProfile and PublicProfile imports
import ForgotPasswordView from '../views/ForgotPasswordView.vue';
import LandingView from '../views/LandingView.vue';
import ProfileView from '../views/ProfileView.vue'; // Import the new unified view
import NotFoundView from '../views/NotFoundView.vue'; // Import 404 page component

const routes = [
  { path: '/', name: 'Landing', component: LandingView, meta: { requiresAuth: false, guestOnly: true } },
  { path: '/home', name: 'Home', component: Home, meta: { requiresAuth: true } },
  { path: '/login', name: 'Login', component: Login, meta: { requiresAuth: false, guestOnly: true } },
  { path: '/event/:id', name: 'EventDetails', component: EventDetails, meta: { requiresAuth: true }, props: true },
  { path: '/leaderboard', name: 'Leaderboard', component: LeaderboardView, meta: { requiresAuth: true } },
  { path: '/rating/:eventId/:teamId?', name: 'RatingForm', component: RatingForm, meta: { requiresAuth: true }, props: true },
  { path: '/resources', name: 'Resources', component: Resources, meta: { requiresAuth: false } },
  { path: '/transparency', name: 'Transparency', component: Transparency, meta: { requiresAuth: false } },
  { 
    path: '/create-event', 
    name: 'CreateEvent', 
    component: CreateEventView, 
    meta: { requiresAuth: true }
  },
  { 
    path: '/edit-event/:eventId', 
    name: 'EditEvent', 
    component: CreateEventView, 
    meta: { requiresAuth: true, requiresAdmin: true },
    props: true
  },
  { 
    path: '/manage-requests', 
    name: 'ManageRequests', 
    component: ManageRequestsView, 
    meta: { requiresAuth: true, requiresAdmin: true } 
  },
  {
    path: '/profile', // Route for the current user's profile
    name: 'Profile',
    component: ProfileView, // Use the new unified view
    meta: { requiresAuth: true, adminForbidden: true } // Keep meta fields
    // No props needed here, the component determines user from auth state
  },
  {
    path: '/user/:userId', // Route for public profiles
    name: 'PublicProfile',
    component: ProfileView, // Use the new unified view
    props: true, // Pass route params (userId) as props
    meta: { requiresAuth: false } // Keep meta fields
  },
  { path: '/forgot-password', name: 'ForgotPassword', component: ForgotPasswordView, meta: { requiresAuth: false, guestOnly: true } },
  // 404 page - must be last route
  { path: '/:pathMatch(.*)*', name: 'NotFound', component: NotFoundView, meta: { requiresAuth: false } },
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
  if (!store.getters['user/hasFetchedUserData']) {
    await new Promise(resolve => {
      const unwatch = store.watch(
        (state, getters) => getters['user/hasFetchedUserData'],
        (newVal) => {
          if (newVal) {
            unwatch();
            resolve();
          }
        }
      );
    });
  }

  const isAuthenticated = store.getters['user/isAuthenticated'];
  const isAdmin = store.getters['user/isAdmin'];

  if (to.meta.guestOnly && isAuthenticated) {
    next({ name: 'Home' }); return;
  }
  if (to.meta.requiresAuth && !isAuthenticated) {
    next({ name: 'Login' }); return;
  }
  if (to.meta.requiresAdmin && !isAdmin) {
    next({ name: 'Home' }); return;
  }
  if (to.meta.adminForbidden && isAdmin) {
    next({ name: 'Home' }); 
    return;
  }

  next();
});

export default router;
