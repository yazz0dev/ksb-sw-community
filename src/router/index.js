// src/router/index.js

import { createRouter, createWebHistory } from 'vue-router';
import store from '../store';
// Removed static imports for views, they will be dynamically imported below

const routes = [
  { path: '/', name: 'Landing', component: () => import('../views/LandingView.vue'), meta: { requiresAuth: false, guestOnly: true } },
  { path: '/home', name: 'Home', component: () => import('../views/HomeView.vue'), meta: { requiresAuth: true } },
  { path: '/login', name: 'Login', component: () => import('../views/LoginView.vue'), meta: { requiresAuth: false, guestOnly: true } },
  { path: '/event/:id', name: 'EventDetails', component: () => import('../views/EventDetails.vue'), meta: { requiresAuth: true }, props: true },
  { path: '/leaderboard', name: 'Leaderboard', component: () => import('../views/LeaderboardView.vue'), meta: { requiresAuth: false } },
  { path: '/rating/:eventId/:teamId?', name: 'RatingForm', component: () => import('../views/RatingForm.vue'), meta: { requiresAuth: true }, props: true },
  { path: '/resources', name: 'Resources', component: () => import('../views/ResourcesView.vue'), meta: { requiresAuth: false } },
  { 
    path: '/transparency', 
    name: 'Transparency', 
    component: () => import('../views/TransparencyView.vue'), 
    meta: { 
      requiresAuth: false,
      publicAccess: true 
    } 
  },
  { 
    path: '/create-event', 
    name: 'CreateEvent', 
    component: () => import('../views/CreateEventView.vue'), 
    meta: { requiresAuth: true }
  },
  { 
    path: '/edit-event/:eventId', 
    name: 'EditEvent', 
    component: () => import('../views/CreateEventView.vue'), // Keep same component for edit
    meta: { requiresAuth: true, requiresAdmin: true },
    props: true
  },
  { 
    path: '/manage-requests', 
    name: 'ManageRequests', 
    component: () => import('../views/ManageRequestsView.vue'), 
    meta: { requiresAuth: true, requiresAdmin: true } 
  },
  {
    path: '/profile', 
    name: 'Profile',
    component: () => import('../views/ProfileView.vue'), 
    meta: { requiresAuth: true, adminForbidden: true } 
  },
  {
    path: '/user/:userId', 
    name: 'PublicProfile',
    component: () => import('../views/ProfileView.vue'), // Keep same component for public profile
    props: true, 
    meta: { requiresAuth: false } 
  },
  { path: '/forgot-password', name: 'ForgotPassword', component: () => import('../views/ForgotPasswordView.vue'), meta: { requiresAuth: false, guestOnly: true } },
  {
    path: '/events', // General events list route
    name: 'EventsList',
    component: () => import('../views/EventsListView.vue'),
    meta: { requiresAuth: true } // Requires auth to see filters other than completed
  },
  {
    path: '/completed-events',
    name: 'CompletedEvents',
    // Point to the existing EventsListView, assuming it handles completed events
    component: () => import('../views/EventsListView.vue'), 
    meta: { requiresAuth: false },
    // Optionally pass a prop or query param to filter for completed events if needed
    // props: { defaultFilter: 'completed' }
  },
  { path: '/:pathMatch(.*)*', name: 'NotFound', component: () => import('../views/NotFoundView.vue'), meta: { requiresAuth: false } },
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
