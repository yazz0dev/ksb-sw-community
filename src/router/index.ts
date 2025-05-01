// src/router/index.ts

import { createRouter, createWebHistory, RouteRecordRaw, NavigationGuardNext, RouteLocationNormalized } from 'vue-router';
import store from '../store';
import EditProfileView from '../views/EditProfileView.vue';

interface RouteMeta {
  requiresAuth?: boolean;
  guestOnly?: boolean;
  roles?: string[];
  publicAccess?: boolean;
}

const routes: Array<RouteRecordRaw> = [
  { path: '/', name: 'Landing', component: () => import('@/views/LandingView.vue'), meta: { requiresAuth: false, guestOnly: true } },
  { path: '/home', name: 'Home', component: () => import('@/views/HomeView.vue'), meta: { requiresAuth: true } },
  { path: '/login', name: 'Login', component: () => import('@/views/LoginView.vue'), meta: { requiresAuth: false, guestOnly: true } },
  { path: '/event/:id', name: 'EventDetails', component: () => import('@/views/EventDetails.vue'), meta: { requiresAuth: true }, props: true },
  { path: '/leaderboard', name: 'Leaderboard', component: () => import('@/views/LeaderboardView.vue'), meta: { requiresAuth: false } },
  { path: '/resources', name: 'Resources', component: () => import('@/views/ResourcesView.vue'), meta: { requiresAuth: false } },
  { 
    path: '/transparency', 
    name: 'Transparency', 
    component: () => import('@/views/TransparencyView.vue'), 
    meta: { 
      requiresAuth: false,
      publicAccess: true 
    } 
  },
  { 
    path: '/request-event',
    name: 'RequestEvent',
    meta: { requiresAuth: true, roles: ['Student'] }, // Ensure only students can access
    component: () => import('@/views/RequestEventView.vue'), 
  },
  { 
    path: '/edit-event/:eventId', 
    name: 'EditEvent', 
    meta: { requiresAuth: true, roles: ['Student'] }, // Ensure only Organizer can access
    component: () => import('@/views/RequestEventView.vue'),
    props: true
  },
  {
    path: '/profile', 
    name: 'Profile',
    component: () => import('@/views/ProfileView.vue'), 
    meta: { requiresAuth: true } 
  },
  {
    path: '/profile/:id/edit',
    name: 'EditProfile',
    component: EditProfileView,
    meta: { requiresAuth: true }
  },
  {
    path: '/user/:userId', 
    name: 'PublicProfile',
    component: () => import('@/views/ProfileView.vue'), 
    props: true, 
    meta: { requiresAuth: false } 
  },
  { path: '/forgot-password', name: 'ForgotPassword', component: () => import('@/views/ForgotPasswordView.vue'), meta: { requiresAuth: false, guestOnly: true } },
  {
    path: '/events', // General events list route
    name: 'EventsList',
    component: () => import('@/views/EventsListView.vue'),
    meta: { requiresAuth: false } // Allow access for logged-out users (they see completed)
  },
  { path: '/selection/:eventId/:teamId?', name: 'SelectionForm', component: () => import('@/views/SelectionForm.vue'), meta: { requiresAuth: true }, props: true },
  { path: '/:pathMatch(.*)*', name: 'NotFound', component: () => import('@/views/NotFoundView.vue'), meta: { requiresAuth: false } },
] as RouteRecordRaw[];

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) { return savedPosition; }
    return { top: 0 };
  }
});

// --- Navigation Guard ---
// Import logic from navigationGuards.ts
router.beforeEach(async (
  to: RouteLocationNormalized,
  from: RouteLocationNormalized,
  next: NavigationGuardNext
) => {
  // Clear any pending date checks when navigating away from event forms
  if (from.name === 'CreateEvent' || from.name === 'EditEvent') {
    await store.dispatch('events/clearDateCheck');
  }

  if (!store.getters['user/hasFetchedUserData']) {
    await new Promise<void>(resolve => {
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

  if (to.meta.guestOnly && isAuthenticated) {
    next({ name: 'Home' }); return;
  }
  if (to.meta.requiresAuth && !isAuthenticated) {
    next({ name: 'Login' }); return;
  }

  next();
});

export default router;
