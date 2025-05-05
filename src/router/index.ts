// src/router/index.ts
import { createRouter, createWebHistory, RouteRecordRaw, NavigationGuardNext, RouteLocationNormalized } from 'vue-router';
import EditProfileView from '../views/EditProfileView.vue';
import { useUserStore } from '@/store/user';

interface RouteMeta {
  requiresAuth?: boolean;
  guestOnly?: boolean;
  roles?: string[];
  publicAccess?: boolean;
}

const routes: Array<RouteRecordRaw> = [
    { path: '/', name: 'Landing', component: () => import('@/views/LandingView.vue'), meta: { requiresAuth: false, guestOnly: true } as RouteMeta },
    { path: '/home', name: 'Home', component: () => import('@/views/HomeView.vue'), meta: { requiresAuth: true } as RouteMeta },
    { path: '/login', name: 'Login', component: () => import('@/views/LoginView.vue'), meta: { requiresAuth: false, guestOnly: true } as RouteMeta },
    { path: '/event/:id', name: 'EventDetails', component: () => import('@/views/EventDetails.vue'), meta: { requiresAuth: true }, props: true },
    { path: '/leaderboard', name: 'Leaderboard', component: () => import('@/views/LeaderboardView.vue'), meta: { requiresAuth: false } as RouteMeta },
    { path: '/resources', name: 'Resources', component: () => import('@/views/ResourcesView.vue'), meta: { requiresAuth: false } as RouteMeta },
    { path: '/transparency', name: 'Transparency', component: () => import('@/views/TransparencyView.vue'), meta: { requiresAuth: false, publicAccess: true } as RouteMeta },
    { path: '/request-event', name: 'RequestEvent', meta: { requiresAuth: true, roles: ['Student'] } as RouteMeta, component: () => import('@/views/RequestEventView.vue'), },
    { path: '/edit-event/:eventId', name: 'EditEvent', meta: { requiresAuth: true, roles: ['Student'] } as RouteMeta, component: () => import('@/views/RequestEventView.vue'), props: true },
    { path: '/profile', name: 'Profile', component: () => import('@/views/ProfileView.vue'), meta: { requiresAuth: true } as RouteMeta },
    { path: '/profile/:id/edit', name: 'EditProfile', component: EditProfileView, meta: { requiresAuth: true } as RouteMeta, props: true },
    { path: '/user/:userId', name: 'PublicProfile', component: () => import('@/views/ProfileView.vue'), props: true, meta: { requiresAuth: false } as RouteMeta },
    { path: '/forgot-password', name: 'ForgotPassword', component: () => import('@/views/ForgotPasswordView.vue'), meta: { requiresAuth: false, guestOnly: true } as RouteMeta },
    { path: '/events', name: 'EventsList', component: () => import('@/views/EventsListView.vue'), meta: { requiresAuth: false } as RouteMeta },
    { path: '/selection/:eventId/:teamId?', name: 'SelectionForm', component: () => import('@/views/SelectionForm.vue'), meta: { requiresAuth: true } as RouteMeta, props: true },
    { path: '/:pathMatch(.*)*', name: 'NotFound', component: () => import('@/views/NotFoundView.vue'), meta: { requiresAuth: false } as RouteMeta },
] as RouteRecordRaw[];

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) { return savedPosition; }
    return { top: 0 };
  }
});

// --- Navigation Guard (Simplified) ---
router.beforeEach((
  to: RouteLocationNormalized,
  from: RouteLocationNormalized,
  next: NavigationGuardNext
) => {
  const userStore = useUserStore(); // Get store instance
  // const eventStore = useEventStore(); // Uncomment if needed

  // --- Check if initial auth fetch is complete ---
  // If not, we shouldn't navigate yet. main.ts handles delaying the mount,
  // so this check acts as a safety net if navigation somehow happens before mount completes.
  // In a correctly functioning setup post main.ts changes, this might become less critical,
  // but it's good practice.
  if (!userStore.hasFetched && to.name !== 'Landing' && to.name !== 'Login' && to.name !== 'ForgotPassword') {
    // If the initial check isn't done AND we are trying to access a potentially protected route,
    // it's safer to wait or redirect to a loading/landing page.
    // However, since main.ts delays mounting, hasFetched SHOULD be true here.
    // We'll log a warning if this unexpected state occurs.
    console.warn("Router Guard: Navigating before initial auth state fetched. State:", userStore.hasFetched);
     // Let's allow navigation for now, assuming main.ts fixed the core issue.
     // If problems persist, we might need a dedicated loading route or better waiting here.
     // next({ name: 'Loading' }); // Example: Redirect to a loading route
     // return;
  }

  const isAuthenticated = userStore.isAuthenticated;
  const routeMeta = to.meta as RouteMeta; // Cast meta

  // --- Guest Only routes ---
  if (routeMeta.guestOnly && isAuthenticated) {
    console.log("Router Guard: Redirecting authenticated user from guest-only route to Home.");
    next({ name: 'Home', replace: true });
    return;
  }

  // --- Requires Auth routes ---
  // Now that mounting is delayed, hasFetched should be true here.
  if (routeMeta.requiresAuth && !isAuthenticated) {
     console.log("Router Guard: Redirecting unauthenticated user to Login.");
     next({ name: 'Login', query: { redirect: to.fullPath } });
     return;
  }

  // --- Role-based access ---
  if (routeMeta.roles && Array.isArray(routeMeta.roles) && isAuthenticated) {
      const userRole = userStore.currentUser?.role || 'Student'; // Default role if needed
      if (!routeMeta.roles.includes(userRole)) {
           console.log(`Router Guard: User role '${userRole}' not authorized for route ${String(to.name ?? 'Unnamed')}. Redirecting.`);
           next({ name: 'Home', replace: true }); // Redirect to a safe default page
           return;
      }
  }

  // If none of the above conditions were met, allow navigation
  const routeNameStr = String(to.name ?? 'Unnamed Route');
  console.log(`Router Guard: Allowing navigation to ${routeNameStr}.`);
  next();
});

export default router;