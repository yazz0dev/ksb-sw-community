// src/router/index.js

import { createRouter, createWebHistory } from 'vue-router';
import Home from '../views/HomeView.vue';
import Login from '../views/LoginView.vue';
import EventDetails from '../views/EventDetails.vue';
import LeaderboardView from '../views/LeaderboardView.vue';
import RatingForm from '../views/RatingForm.vue';
import Resources from '../views/ResourcesView.vue';
import Transparency from '../views/TransparencyView.vue';
import RequestEventView from '../views/RequestEventView.vue';
import CreateEditEventView from '../views/CreateEditEventView.vue';
import ManageRequestsView from '../views/ManageRequestsView.vue'; 
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
  { path: '/leaderboard', name: 'Leaderboard', component: LeaderboardView, meta: { requiresAuth: true } },
  { path: '/rating/:eventId/:teamId?', name: 'RatingForm', component: RatingForm, meta: { requiresAuth: true }, props: true },
  { path: '/resources', name: 'Resources', component: Resources, meta: { requiresAuth: false } },
  { path: '/transparency', name: 'Transparency', component: Transparency, meta: { requiresAuth: false } },
  { 
    path: '/request-event', 
    name: 'RequestEvent', 
    component: RequestEventView, 
    meta: { requiresAuth: true, adminForbidden: true },
    props: route => ({ step: route.query.step || '1' })
  },
  { 
    path: '/create-event', 
    name: 'CreateEvent', 
    component: CreateEditEventView, 
    meta: { requiresAuth: true, requiresAdmin: true } 
  },
  { 
    path: '/edit-event/:eventId', 
    name: 'EditEvent', 
    component: CreateEditEventView, 
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
    path: '/profile',
    name: 'Profile',
    component: UserProfile,
    meta: { requiresAuth: true, adminForbidden: true }
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