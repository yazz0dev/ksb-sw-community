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
import PublicProfile from '../views/PublicProfile.vue';

const routes = [
  { path: '/', name: 'Landing', component: LandingView, meta: { requiresAuth: false, guestOnly: true } }, // Mark as guestOnly
  { path: '/home', name: 'Home', component: Home, meta: { requiresAuth: true } },
  { path: '/login', name: 'Login', component: Login, meta: { requiresAuth: false, guestOnly: true } }, // Mark as guestOnly
  { path: '/event/:id', name: 'EventDetails', component: EventDetails, meta: { requiresAuth: true }, props: true },
  { path: '/leaderboard', name: 'Leaderboard', component: LeaderBoard, meta: { requiresAuth: true } },
  { path: '/manage-teams/:id', name: 'ManageTeams', component: ManageTeams, meta: { requiresAuth: true, requiresAdmin: true }, props: true },
  { path: '/rating/:eventId/:teamId?', name: 'RatingForm', component: RatingForm, meta: { requiresAuth: true }, props: true },
  { path: '/resources', name: 'Resources', component: Resources, meta: { requiresAuth: false } },  // Public
  { path: '/transparency', name: 'Transparency', component: Transparency, meta: { requiresAuth: false } }, // Public
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
  { // ---  PUBLIC PROFILE ROUTE ---
    path: '/user/:userId', // Parameterized route
    name: 'PublicProfile',
    component: PublicProfile,
    props: true, // Pass route params (userId) as props to the component
    meta: { requiresAuth: false } // Make it publicly accessible
  },
  { path: '/forgot-password', name: 'ForgotPassword', component: ForgotPasswordView, meta: { requiresAuth: false, guestOnly: true } }, // Mark as guestOnly

];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach(async (to, from, next) => {
  const isAuthenticated = store.getters['user/isAuthenticated'];
  const isAdmin = store.getters['user/isAdmin'];

  if (to.meta.requiresAuth && !isAuthenticated) {
    next({ name: 'Login' });
    return;
  }

  if (to.meta.guestOnly && isAuthenticated) {
    next({ name: 'Home' });
    return;
  }

  if (to.meta.requiresAdmin && !isAdmin) {
    next({ name: 'Home' });
    return;
  }

  next();
});

export default router;