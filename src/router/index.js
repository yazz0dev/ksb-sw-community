// src/router/index.js
import { createRouter, createWebHistory } from 'vue-router';
import Home from '../views/HomeView.vue';
import Login from '../views/LoginView.vue';
import CreateEvent from '../views/CreateEvent.vue';
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


const routes = [
    { path: '/', component: Home, meta: { requiresAuth: true } },
    { path: '/login', component: Login },
    { path: '/create-event', component: CreateEvent, meta: { requiresAuth: true, requiresTeacher: true } },
    { path: '/event/:id', component: EventDetails, meta: { requiresAuth: true }, props: true },
    { path: '/leaderboard', component: LeaderBoard, meta: { requiresAuth: true } },
    { path: '/manage-teams/:id', component: ManageTeams, meta: { requiresAuth: true, requiresTeacher: true }, props: true },
    { path: '/portfolio', component: Portfolio, meta: { requiresAuth: true } },
    { path: '/rating/:eventId/:teamId?', component: RatingForm, meta: { requiresAuth: true }, props: true }, // Optional teamId
    { path: '/resources', component: Resources },
    { path: '/transparency', component: Transparency },
    { path: '/request-event', component: RequestEvent, meta: { requiresAuth: true } }, // Add route
    { path: '/manage-requests', component: ManageEventRequests, meta: { requiresAuth: true, requiresTeacher: true } }, // Add route
    {path: '/profile', component: UserProfile, meta: {requiresAuth: true}}
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});


router.beforeEach((to, from, next) => {
    const requiresAuth = to.matched.some(record => record.meta.requiresAuth);
    const requiresTeacher = to.matched.some(record => record.meta.requiresTeacher);
    const isAuthenticated = store.state.user.isAuthenticated; // Access user module state
    const userRole = store.state.user.role;

  if (requiresAuth && !isAuthenticated) {
    next('/login'); // Redirect to login if not authenticated
  } else if (requiresTeacher && userRole !== 'Teacher') {
      next('/'); // Redirect to a suitable page if not a teacher
  }
  else {
    next(); // Proceed to the route
  }
});

export default router;