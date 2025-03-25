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
import ManageResource from '../views/ManageResource.vue';


const routes = [
    { path: '/', name: 'Landing', component: LandingView, meta: { requiresAuth: false, guestOnly: true } }, // Mark as guestOnly
    { path: '/home', name: 'Home', component: Home, meta: { requiresAuth: true } },
    { path: '/login', name: 'Login', component: Login, meta: { requiresAuth: false, guestOnly: true } }, // Mark as guestOnly
    { path: '/event/:id', name: 'EventDetails', component: EventDetails, meta: { requiresAuth: true }, props: true },
    { path: '/leaderboard', name: 'Leaderboard', component: LeaderBoard, meta: { requiresAuth: true } },
    { path: '/manage-teams/:id', name: 'ManageTeams', component: ManageTeams, meta: { requiresAuth: true, requiresTeacher: true }, props: true },
    { path: '/rating/:eventId/:teamId?', name: 'RatingForm', component: RatingForm, meta: { requiresAuth: true }, props: true },
    { path: '/resources', name: 'Resources', component: Resources, meta: {requiresAuth: false} },  // Public
    { path: '/transparency', name: 'Transparency', component: Transparency, meta: {requiresAuth: false} }, // Public
    { path: '/request-event', name: 'RequestEvent', component: RequestEvent, meta: { requiresAuth: true } },
    { path: '/manage-requests', name: 'ManageRequests', component: ManageEventRequests, meta: { requiresAuth: true, requiresTeacher: true } },
    { path: '/profile', name: 'Profile', component: UserProfile, meta: {requiresAuth: true}},
    { path: '/forgot-password', name: 'ForgotPassword', component: ForgotPasswordView, meta: {requiresAuth: false, guestOnly: true} }, // Mark as guestOnly
    { path: '/manage-resources', name: 'ManageResource', component: ManageResource, meta: { requiresAuth: true, requiresTeacher: true } },

];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// --- CORRECTED NAVIGATION GUARD ---
router.beforeEach((to, from, next) => {
  const requiresAuth = to.matched.some(record => record.meta.requiresAuth);
  const requiresTeacher = to.matched.some(record => record.meta.requiresTeacher);
  const guestOnly = to.matched.some(record => record.meta.guestOnly); // Check for guestOnly flag

  const isAuthenticated = store.getters['user/isAuthenticated'];
  const isTeacher = store.getters['user/isTeacher'];

  console.log(`Navigating to: ${to.path}, AuthRequired: ${requiresAuth}, TeacherRequired: ${requiresTeacher}, GuestOnly: ${guestOnly}, IsAuth: ${isAuthenticated}, IsTeacher: ${isTeacher}`);

  // 1. If route requires authentication and user is not logged in -> redirect to login
  if (requiresAuth && !isAuthenticated) {
    console.log("Redirecting to /login (Auth Required)");
    next({ name: 'Login', query: { redirect: to.fullPath } }); // Store intended path
  }
  // 2. If route requires teacher role and user is not a teacher -> redirect to home
  // (Assumes user is already authenticated based on previous check or route doesn't require auth)
  else if (requiresTeacher && !isTeacher) {
     // Make sure they are logged in before checking teacher status if the route also requires auth
     if (requiresAuth && !isAuthenticated) {
         console.log("Redirecting to /login (Teacher route, but not logged in)");
         next({ name: 'Login', query: { redirect: to.fullPath } });
     } else if (isAuthenticated) { // Only redirect if logged in but not a teacher
         console.log("Redirecting to /home (Teacher Role Required)");
         next({ name: 'Home' });
     } else {
         // If route somehow requires teacher but not auth, and user is not logged in,
         // redirect to login seems safest. Adjust if you have public teacher routes.
         console.log("Redirecting to /login (Edge case: Teacher route, unauthenticated)");
         next({ name: 'Login', query: { redirect: to.fullPath } });
     }
  }
  // 3. If route is marked as guestOnly (like Login, Landing) and user IS logged in -> redirect to home
  else if (guestOnly && isAuthenticated) {
    console.log("Redirecting to /home (Guest Page Restricted for Auth Users)");
    next({ name: 'Home' });
  }
  // 4. Otherwise (Auth user accessing public/allowed route, or Unauth user accessing public route) -> allow navigation
  else {
    console.log("Allowing navigation");
    next();
  }
});
// --- END CORRECTED GUARD ---


export default router;