// src/router/index.ts
import { createRouter, createWebHistory, RouteRecordRaw, NavigationGuardNext, RouteLocationNormalized } from 'vue-router';
import { useProfileStore } from '@/stores/profileStore';

interface RouteMeta {
  requiresAuth?: boolean;
  guestOnly?: boolean;
  roles?: string[];
  publicAccess?: boolean;
  title?: string;
  description?: string;
}

const routes: Array<RouteRecordRaw> = [
    { path: '/', name: 'Landing', component: () => import('@/views/LandingView.vue'), meta: { requiresAuth: false, guestOnly: true, title: 'Welcome to KSB Tech Community', description: 'Discover the KSB Tech Community: a hub for MCA students to manage events, collaborate on software projects, and access shared resources. Join us to learn, build, and grow.' } as RouteMeta },
    { path: '/home', name: 'Home', component: () => import('@/views/HomeView.vue'), meta: { requiresAuth: true, title: 'Home Dashboard', description: 'Your personalized dashboard in the KSB Tech Community.' } as RouteMeta },
    { path: '/login', name: 'Login', component: () => import('@/views/LoginView.vue'), meta: { requiresAuth: false, guestOnly: true, title: 'Login', description: 'Login to your KSB Tech Community account.' } as RouteMeta },
    { path: '/event/:id', name: 'EventDetails', component: () => import('@/views/EventDetailsView.vue'), meta: { requiresAuth: true, title: 'Event Details', description: 'View details for a specific event.' }, props: true },
    { path: '/leaderboard', name: 'Leaderboard', component: () => import('@/views/LeaderboardView.vue'), meta: { requiresAuth: false, title: 'Leaderboard', description: 'Check out the KSB Tech Community leaderboard.' } as RouteMeta },
    { path: '/resources', name: 'Resources', component: () => import('@/views/ResourcesView.vue'), meta: { requiresAuth: false, title: 'Resources', description: 'Access learning resources and materials from the KSB Tech Community.' } as RouteMeta },
    { path: '/transparency', name: 'Transparency', component: () => import('@/views/TransparencyView.vue'), meta: { requiresAuth: false, publicAccess: true, title: 'Transparency', description: 'View KSB Tech Community\'s transparency reports and data.' } as RouteMeta },
    { path: '/request-event', name: 'RequestEvent', meta: { requiresAuth: true, roles: ['Student'], title: 'Request Event', description: 'Request a new event to be hosted by the KSB Tech Community.' } as RouteMeta, component: () => import('@/views/RequestEventView.vue'), },
    { path: '/edit-event/:eventId', name: 'EditEvent', meta: { requiresAuth: true, roles: ['Student'], title: 'Edit Event', description: 'Edit an existing event request.' } as RouteMeta, component: () => import('@/views/RequestEventView.vue'), props: true },
    { path: '/profile', name: 'Profile', component: () => import('@/views/ProfileView.vue'), meta: { requiresAuth: true, title: 'My Profile', description: 'View and manage your KSB Tech Community profile.' } as RouteMeta },
    { path: '/profile/:id/edit', name: 'EditProfile', component: () => import('@/views/EditProfileView.vue'), meta: { requiresAuth: true, title: 'Edit Profile', description: 'Edit your KSB Tech Community profile information.' } as RouteMeta, props: true },
    { path: '/user/:userId', name: 'PublicProfile', component: () => import('@/views/ProfileView.vue'), props: true, meta: { requiresAuth: false, title: 'User Profile', description: 'View a KSB Tech Community member\'s public profile.' } as RouteMeta },
    { path: '/forgot-password', name: 'ForgotPassword', component: () => import('@/views/ForgotPasswordView.vue'), meta: { requiresAuth: false, guestOnly: true, title: 'Forgot Password', description: 'Reset your KSB Tech Community account password.' } as RouteMeta },
    { path: '/signup', name: 'StudentSignup', component: () => import('@/views/SignupView.vue'), meta: { requiresAuth: false, publicAccess: true, title: 'Student Registration', description: 'Register for KSB Tech Community with your batch signup link.' } as RouteMeta },
    { path: '/events', name: 'EventsList', component: () => import('@/views/EventsListView.vue'), meta: { requiresAuth: false, title: 'Events', description: 'Browse upcoming and past events by KSB Tech Community.' } as RouteMeta },
    { path: '/selection/:eventId/:teamId?', name: 'SelectionForm', component: () => import('@/views/SelectionForm.vue'), meta: { requiresAuth: true, title: 'Team Selection', description: 'Participate in team selection for an event.' } as RouteMeta, props: true },
    { path: '/legal', name: 'Legal', component: () => import('@/views/LegalView.vue'), meta: { requiresAuth: false, title: 'Terms & Privacy', description: 'Read the Terms of Service and Privacy Policy for the KSB Tech Community.' } as RouteMeta },
    { path: '/:pathMatch(.*)*', name: 'NotFound', component: () => import('@/views/NotFoundView.vue'), meta: { requiresAuth: false, title: 'Page Not Found', description: 'The page you are looking for does not exist.' } as RouteMeta },
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
  const studentStore = useProfileStore(); // Get store instance
  // const eventStore = useEventStore(); // Uncomment if needed

  // --- Check if initial auth fetch is complete ---
  // If not, we shouldn't navigate yet. main.ts handles delaying the mount,
  // so this check acts as a safety net if navigation somehow happens before mount completes.
  // In a correctly functioning setup post main.ts changes, this might become less critical,
  // but it's good practice.
  if (!studentStore.hasFetched && to.name !== 'Landing' && to.name !== 'Login' && to.name !== 'ForgotPassword') {
    // If the initial check isn't done AND we are trying to access a potentially protected route,
    // it's safer to wait or redirect to a loading/landing page.
    // However, since main.ts delays mounting, hasFetched SHOULD be true here.
    // We'll log a warning if this unexpected state occurs.
     // Let's allow navigation for now, assuming main.ts fixed the core issue.
     // If problems persist, we might need a dedicated loading route or better waiting here.
     // next({ name: 'Loading' }); // Example: Redirect to a loading route
     // return;
  }

  const isAuthenticated = studentStore.isAuthenticated;
  const routeMeta = to.meta as RouteMeta; // Cast meta

  // --- Guest Only routes ---
  if (routeMeta.guestOnly && isAuthenticated) {
    next({ name: 'Home', replace: true });
    return;
  }

  // --- Requires Auth routes ---
  // Now that mounting is delayed, hasFetched should be true here.
  if (routeMeta.requiresAuth && !isAuthenticated) {
     next({ name: 'Login', query: { redirect: to.fullPath } });
     return;
  }

  // If none of the above conditions were met, allow navigation
  const routeNameStr = String(to.name ?? 'Unnamed Route');
  next();
});

const DEFAULT_TITLE = 'KSB Tech Community';
const DEFAULT_DESCRIPTION = 'KSB Software Community Platform for Events & Learning. Join us for skill development, networking, and tech discussions.';
const SITE_URL = 'https://www.ksbtechs.web.app'; // Updated to match the sitemap and meta tags

router.afterEach((to) => {
  const routeMeta = to.meta as RouteMeta;
  const title = routeMeta.title ? `${routeMeta.title} | KSB Tech Community` : DEFAULT_TITLE;
  const description = routeMeta.description || DEFAULT_DESCRIPTION;
  const fullUrl = SITE_URL + to.fullPath;

  document.title = title;

  const setMetaTag = (attrs: { [key: string]: string }) => {
    let element = document.querySelector(
      attrs.name ? `meta[name="${attrs.name}"]` : `meta[property="${attrs.property}"]`
    );
    if (!element) {
      element = document.createElement('meta');
      document.head.appendChild(element);
    }
    Object.keys(attrs).forEach(attr => {
      (element as HTMLMetaElement).setAttribute(attr, attrs[attr]);
    });
  };
  
  const setLinkTag = (attrs: { [key: string]: string }) => {
    let element = document.querySelector(`link[rel="${attrs.rel}"]`);
    if (!element) {
      element = document.createElement('link');
      document.head.appendChild(element);
    }
     Object.keys(attrs).forEach(attr => {
      (element as HTMLLinkElement).setAttribute(attr, attrs[attr]);
    });
  };

  setMetaTag({ name: 'description', content: description });

  // Open Graph
  setMetaTag({ property: 'og:title', content: title });
  setMetaTag({ property: 'og:description', content: description });
  setMetaTag({ property: 'og:url', content: fullUrl });
  setMetaTag({ property: 'og:image', content: SITE_URL + '/logo.png' });
  setMetaTag({ property: 'og:type', content: 'website' });
  setMetaTag({ property: 'og:site_name', content: 'KSB Tech Community' });

  // Canonical URL
  setLinkTag({ rel: 'canonical', href: fullUrl });
});

export default router;