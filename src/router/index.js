// src/router/index.js
import { createRouter, createWebHistory } from 'vue-router';
import Home from '../views/HomeView.vue';
import Login from '../views/LoginView.vue';
import EventDetails from '../views/EventDetails.vue';
import LeaderBoard from '../views/LeaderBoard.vue';
import ManageTeams from '../views/ManageTeams.vue';
import Portfolio from '../views/PortfolioView.vue';
import RatingForm from '../views/RatingForm.vue';
import Resources from '../views/ResourcesView.vue';
import Transparency from '../views/TransparencyView.vue';
import RequestEvent from '../views/RequestEvent.vue';
import ManageEventRequests from '../views/ManageEventRequests.vue';
import store from '../store';
import UserProfile from '../views/UserProfile.vue';
import ForgotPasswordView from '../views/ForgotPasswordView.vue';
import LandingView from '../views/LandingView.vue'; // Import LandingView


const routes = [
    { path: '/', component: LandingView, meta: { requiresAuth: false } }, // Default to Landing
    { path: '/home', component: Home, meta: { requiresAuth: true } }, // Add /home for authenticated users
    { path: '/login', component: Login, meta: { requiresAuth: false } }, // Allow unauthenticated access
    { path: '/event/:id', component: EventDetails, meta: { requiresAuth: true }, props: true },
    { path: '/leaderboard', component: LeaderBoard, meta: { requiresAuth: true } },
    { path: '/manage-teams/:id', component: ManageTeams, meta: { requiresAuth: true, requiresTeacher: true }, props: true },
    { path: '/portfolio', component: Portfolio, meta: { requiresAuth: true } },
    { path: '/rating/:eventId/:teamId?', component: RatingForm, meta: { requiresAuth: true }, props: true },
    { path: '/resources', component: Resources, meta: {requiresAuth: false} },  // Resources can be public
    { path: '/transparency', component: Transparency, meta: {requiresAuth: false} }, // Transparency can be public
    { path: '/request-event', component: RequestEvent, meta: { requiresAuth: true } },
    { path: '/manage-requests', component: ManageEventRequests, meta: { requiresAuth: true, requiresTeacher: true } },
    {path: '/profile', component: UserProfile, meta: {requiresAuth: true}},
    { path: '/forgot-password', component: ForgotPasswordView, meta: {requiresAuth: false} }, // Allow unauthenticated access
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to, from, next) => {
  const requiresAuth = to.matched.some(record => record.meta.requiresAuth);
  const requiresTeacher = to.matched.some(record => record.meta.requiresTeacher);
  const isAuthenticated = store.getters['user/isAuthenticated']; // Use namespaced getter

    if (requiresAuth && !isAuthenticated) {
        next('/login'); // Redirect to login if authentication is required but the user is not authenticated
    } else if (requiresTeacher && !store.getters['user/isTeacher']) {
        next('/'); // Redirect to home if teacher role is required but the user is not a teacher
    } else if (!requiresAuth && isAuthenticated) {
        next('/home'); // Redirect to home if authentication is not required, but user is authenticated
    }
    else {
        next(); // Proceed to the requested route
    }
});

export default router;