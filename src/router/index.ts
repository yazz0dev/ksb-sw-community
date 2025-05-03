// src/router/index.ts
import { createRouter, createWebHistory, RouteRecordRaw, NavigationGuardNext, RouteLocationNormalized } from 'vue-router';
// No longer import Vuex store: import store from '../store';
import EditProfileView from '../views/EditProfileView.vue';

// Import Pinia stores needed in the guard
import { useUserStore } from '@/store/user';
import { useEventStore } from '@/store/events';

interface RouteMeta {
  requiresAuth?: boolean;
  guestOnly?: boolean;
  roles?: string[];
  publicAccess?: boolean;
}

// Routes remain the same
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
    meta: { requiresAuth: true, roles: ['Student'] }, // Role check might need adjustment based on organizer logic
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
    path: '/profile/:id/edit', // Changed param to id to match EditProfileView logic
    name: 'EditProfile',
    component: EditProfileView,
    meta: { requiresAuth: true },
    props: true // Pass route param 'id' as prop
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
router.beforeEach(async (
  to: RouteLocationNormalized,
  from: RouteLocationNormalized,
  next: NavigationGuardNext
) => {
  // Get store instances *inside* the guard
  const userStore = useUserStore();
  const eventStore = useEventStore();

  // Clear any pending date checks when navigating away from event forms
  if (from.name === 'RequestEvent' || from.name === 'EditEvent') {
    // Pinia doesn't have a dedicated state for this, handled in component
    // If needed globally, add state to eventStore and call an action here.
    // eventStore.clearDateCheckState(); // Example if state existed
  }

  // --- Ensure auth state is known before proceeding ---
  // This relies on the auth listener in main.ts having run at least once
  // If userStore.hasFetched is false, it means the listener hasn't finished its first check
  if (!userStore.hasFetched) {
     console.log("Router Guard: Waiting for auth state to be fetched...");
     // Wait for the 'hasFetched' state to become true
     await new Promise<void>(resolve => {
       const unsubscribe = userStore.$subscribe((mutation, state) => {
         if (state.hasFetched) {
           unsubscribe(); // Stop listening
           resolve();
         }
       });
       // If already fetched by the time subscribe runs, resolve immediately
       if (userStore.hasFetched) {
          unsubscribe();
          resolve();
       }
     });
     console.log("Router Guard: Auth state fetched, proceeding.");
  }
  // --- End Auth State Check ---

  const isAuthenticated = userStore.isAuthenticated; // Use Pinia getter/state

  // Guest Only routes: Redirect logged-in users away
  if (to.meta.guestOnly && isAuthenticated) {
    console.log("Router Guard: Redirecting authenticated user from guest-only route to Home.");
    next({ name: 'Home', replace: true }); // Use replace to avoid history entry
    return;
  }

  // Requires Auth routes: Redirect non-logged-in users to Login
  if (to.meta.requiresAuth && !isAuthenticated) {
     console.log("Router Guard: Redirecting unauthenticated user to Login.");
     // Store the intended destination to redirect back after login
     next({ name: 'Login', query: { redirect: to.fullPath } });
     return;
  }

  // Role-based access (Example)
  if (to.meta.roles && isAuthenticated) {
      const userRole = userStore.currentUser?.role || 'Student'; // Get user role (add role to UserState/User if needed)
      if (!to.meta.roles.includes(userRole)) {
           console.log(`Router Guard: User role '${userRole}' not authorized for route ${to.name}. Redirecting.`);
           // Redirect to an unauthorized page or home
           next({ name: 'Home', replace: true }); // Or a specific 'Unauthorized' route
           return;
      }
  }

  // If none of the above conditions met, proceed to the route
  console.log(`Router Guard: Allowing navigation to ${String(to.name)}.`);
  next();
});

export default router;