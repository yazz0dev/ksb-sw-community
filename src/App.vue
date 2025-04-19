<template>
  <div id="app" class="d-flex flex-column app-container">
    <!-- Fixed Position Utilities -->
    <OfflineStateHandler />
    <NotificationSystem />

    <!-- Push Notification Prompt -->
    <div v-if="showPushPermissionPrompt" class="push-prompt-banner alert alert-info d-flex justify-content-between align-items-center p-2">
      <span class="small">Enable push notifications for event updates?</span>
      <div>
        <button @click="requestPushPermission" class="btn btn-sm btn-light me-2">Enable</button>
        <button @click="dismissPushPrompt" class="btn btn-sm btn-link text-secondary p-0" aria-label="Dismiss prompt">
          <i class="fas fa-times"></i>
        </button>
      </div>
    </div>

    <!-- Top Navigation Bar -->
    <nav
      class="navbar navbar-expand-lg navbar-dark bg-primary shadow-sm fixed-top app-navbar"
      :class="{ 'navbar-hidden': !showNavbar }"
      role="navigation"
      aria-label="main navigation"
    >
      <!-- Navbar content as previously provided -->
       <div class="container-lg">
        <!-- Brand -->
        <router-link
          class="navbar-brand d-flex align-items-center app-navbar-brand"
          to="/"
        >
          <i class="fas fa-users fa-lg me-2"></i>
          <span class="fw-bold">KSB Community</span>
        </router-link>

        <!-- Toggler Button -->
        <button
          class="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarNav"
          aria-controls="navbarNav"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span class="navbar-toggler-icon"></span>
        </button>

        <!-- Navbar Content (Collapsible) -->
        <div
          class="collapse navbar-collapse app-navbar-menu"
          id="navbarNav"
        >
          <!-- Left-aligned Links -->
          <ul class="navbar-nav me-auto mb-2 mb-lg-0">
            <!-- Home (Desktop only if authenticated) -->
            <li class="nav-item d-none d-lg-block">
              <router-link
                class="nav-link"
                active-class="active fw-semibold"
                to="/home"
                v-if="isAuthenticated"
                @click="closeNavbar"
                @keyup.enter="closeNavbar"
              >
                Home
              </router-link>
            </li>
            <!-- Events (Visible when logged out) -->
            <li class="nav-item" v-if="!isAuthenticated">
              <router-link
                class="nav-link"
                active-class="active fw-semibold"
                to="/events"
                @click="closeNavbar"
              >
                Events
              </router-link>
            </li>
            <!-- Leaderboard (Desktop only when logged out) -->
             <li class="nav-item d-none d-lg-block" v-if="!isAuthenticated">
               <router-link
                  class="nav-link"
                  active-class="active fw-semibold"
                  to="/leaderboard"
                  @click="closeNavbar"
               >
                  Leaderboard
               </router-link>
             </li>
            <!-- Resources (Always Visible) -->
            <li class="nav-item">
              <router-link
                class="nav-link"
                active-class="active fw-semibold"
                to="/resources"
                @click="closeNavbar"
              >
                Resources
              </router-link>
            </li>
            <!-- Transparency (Always Visible) -->
            <li class="nav-item">
              <router-link
                class="nav-link"
                active-class="active fw-semibold"
                to="/transparency"
                @click="closeNavbar"
              >
                Transparency
              </router-link>
            </li>
          </ul>

          <!-- Right-aligned Links (Auth/User) -->
          <ul class="navbar-nav ms-auto align-items-lg-center">
            <!-- Logged Out State -->
            <template v-if="!isAuthenticated">
              <li class="nav-item">
                <router-link
                  class="btn btn-outline-light btn-sm"
                  to="/login"
                  @click="closeNavbar"
                >
                   <i class="fas fa-sign-in-alt me-1"></i> Login
                </router-link>
              </li>
            </template>

            <!-- Logged In State -->
            <template v-if="isAuthenticated">
              <li class="nav-item dropdown">
                <!-- Dropdown Toggle -->
                <a class="nav-link dropdown-toggle d-flex align-items-center" href="#" id="navbarUserDropdown" role="button" data-bs-toggle="dropdown" aria-expanded="false">
                  <i class="fas fa-user-circle me-1"></i>
                  <span>{{ userName }}</span>
                </a>
                <!-- Dropdown Menu -->
                <ul class="dropdown-menu dropdown-menu-end" aria-labelledby="navbarUserDropdown">
                  <!-- Profile Link (Non-Admin Only) -->
                  <li v-if="!isAdmin">
                    <router-link
                      class="dropdown-item"
                      :to="{ name: 'Profile' }"
                      @click="closeNavbar"
                    >
                      <i class="fas fa-user fa-fw me-2"></i>Profile
                    </router-link>
                  </li>
                   <!-- Admin Dashboard Link (Admin Only) -->
                  <li v-if="isAdmin">
                    <router-link
                      class="dropdown-item"
                      :to="{ name: 'AdminDashboard' }"
                       @click="closeNavbar"
                    >
                      <i class="fas fa-tachometer-alt fa-fw me-2"></i>Admin Dashboard
                    </router-link>
                  </li>
                  <li><hr class="dropdown-divider"></li>
                  <!-- Logout Button -->
                  <li>
                    <button
                      class="dropdown-item"
                      @click="() => { closeNavbar(); handleLogout(); }"
                    >
                      <i class="fas fa-sign-out-alt fa-fw me-2"></i>Logout
                    </button>
                  </li>
                </ul>
              </li>
            </template>
          </ul>
        </div>
      </div>
    </nav>

    <!-- Main Content Area -->
    <main class="flex-grow-1 app-main-content">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
    </main>

    <!-- Bottom Navigation (Mobile Only) -->
    <BottomNav
      v-if="isAuthenticated"
      class="d-lg-none"
    />
  </div>
</template>

<script setup lang="ts">
// --- Core Vue/External Imports ---
import { computed, onMounted, onUnmounted, ref, watch, nextTick } from 'vue';
import { useStore } from 'vuex';
import { useRouter } from 'vue-router';
import { getAuth, signOut } from 'firebase/auth';

// --- Internal Components ---
import BottomNav from './components/BottomNav.vue';
import OfflineStateHandler from './components/OfflineStateHandler.vue';
import NotificationSystem from './components/NotificationSystem.vue';

// --- Appwrite Integration START ---
import { isAppwriteConfigured, account } from './appwrite';
// --- Appwrite Integration END ---

// --- Types ---
interface Collapse {
  toggle(): void;
  hide(): void;
  show(): void;
  dispose(): void;
}
declare global {
  interface Window {
    bootstrap?: {
      Modal?: any;
      Collapse?: {
        new(element: Element | string, options?: any): Collapse;
        getInstance(element: Element | string): Collapse | null;
      };
    };
  }
}

// --- Composables ---
const store = useStore();
const router = useRouter();

// --- State ---
const showNavbar = ref(true);
const lastScrollPosition = ref(0);
const scrollThreshold = 50;
const showPushPermissionPrompt = ref(false); // State for the prompt visibility

// --- Computed Vuex Getters ---
const isAuthenticated = computed(() => store.getters['user/isAuthenticated']);
const isAdmin = computed(() => store.getters['user/isAdmin']);
const userName = computed(() => store.getters['user/getUser']?.name || 'User');
const userId = computed(() => store.getters['user/userId']);

// --- Methods ---

// Logout Logic
const logout = async (): Promise<void> => {
  const auth = getAuth();
  try {
    // Clear Vuex state first
    await store.commit('user/clearUserData');
    await store.commit('user/setHasFetched', true);
    
    // Delete Appwrite session if configured
    if(isAppwriteConfigured()) {
      try {
        await account.deleteSession('current');
        console.log("Appwrite session deleted successfully.");
      } catch (e) {
        // Ignore errors if session already expired/doesn't exist
        console.warn("Could not delete Appwrite session:", e);
      }
    }

    // Firebase logout last
    await signOut(auth);
    console.log("Firebase logout successful.");

    // Force navigation to landing page
    await router.replace({ name: 'Landing' });
  } catch (error) {
    console.error("Logout failed:", error);
    store.dispatch('notification/showNotification', { 
      message: 'Logout failed. Please try again.', 
      type: 'error' 
    }, { root: true });
  }
};

// Close Navbar (Mobile)
const closeNavbar = () => {
  try {
    const toggler = document.querySelector('.navbar-toggler') as HTMLElement | null;
    // Only trigger if toggler is visible (mobile)
    if (toggler && window.getComputedStyle(toggler).display !== 'none') {
      toggler.click();
    } else {
      // Fallback to Bootstrap API (desktop, or if toggler missing)
      const navbarContent = document.getElementById('navbarNav');
      if (navbarContent?.classList.contains('show') && window.bootstrap?.Collapse) {
        const bsCollapse = window.bootstrap.Collapse.getInstance(navbarContent);
        bsCollapse?.hide();
      }
    }
  } catch (error) {
    console.warn('Failed to close navbar:', error);
  }
};

// Collapse after navigation (fixes issue with router-link)


// Mobile navbar collapse: collapse on link click, outside click, and route change (mobile only)
onMounted(() => {
  const collapseEl = document.getElementById('navbarNav');
  const toggler = document.querySelector('.navbar-toggler');
  const collapseParent = collapseEl?.closest('.navbar-collapse') as HTMLElement | null;
  if (!collapseEl || !toggler || !window.bootstrap?.Collapse) return;
  // Initialize Collapse instance if not present
  const bsCollapse = window.bootstrap.Collapse.getInstance(collapseEl)
    || new window.bootstrap.Collapse(collapseEl, { toggle: false });

  // Collapse on outside click (capture phase)
  const outsideClickHandler = (e: MouseEvent | TouchEvent) => {
    if (window.innerWidth < 992 && collapseEl.classList.contains('show')
      && !collapseEl.contains(e.target as Node)
      && !toggler.contains(e.target as Node)) {
      bsCollapse.hide();
    }
  };
  document.addEventListener('mousedown', outsideClickHandler, true);
  document.addEventListener('touchstart', outsideClickHandler, true);

  // Collapse on Escape key (when menu is open on mobile)
  const escapeKeyHandler = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && window.innerWidth < 992 && collapseEl.classList.contains('show')) {
      closeNavbar();
    }
  };
  document.addEventListener('keydown', escapeKeyHandler, true);

  // Collapse on route navigation change
  const removeAfterEach = router.afterEach(() => {
    if (window.innerWidth < 992 && collapseEl.classList.contains('show')) {
      bsCollapse.hide();
    }
  });

  // Cleanup listeners on unmount
  onUnmounted(() => {
    document.removeEventListener('mousedown', outsideClickHandler, true);
    document.removeEventListener('touchstart', outsideClickHandler, true);
    document.removeEventListener('keydown', escapeKeyHandler, true);
    removeAfterEach();
  });
});

// Combine closing navbar and logging out
const handleLogout = async (): Promise<void> => {
  closeNavbar();
  await logout(); // Firebase signout triggers onAuthStateChanged which handles redirect/clear
};

// --- Push Notification Methods ---
function isPushSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

function checkPushPermissionState() {
  if (!isAppwriteConfigured() || !isPushSupported()) {
    return; // Not supported or configured
  }
  // Show prompt only if authenticated, permission is default, and not dismissed
  if (isAuthenticated.value && Notification.permission === 'default' && !sessionStorage.getItem('pushPromptDismissed')) {
    showPushPermissionPrompt.value = true;
  } else {
    showPushPermissionPrompt.value = false;
  }
}

async function requestPushPermission() {
  showPushPermissionPrompt.value = false; // Hide prompt immediately
  sessionStorage.setItem('pushPromptDismissed', 'true'); // Don't ask again this session

  if (!isAppwriteConfigured() || !isPushSupported()) {
    store.dispatch('notification/showNotification', { message: 'Push not supported.', type: 'warning' }, { root: true });
    return;
  }

  try {
    const permission = await Notification.requestPermission();

    if (permission !== 'granted') {
      store.dispatch('notification/showNotification', { message: 'Push permission denied.', type: 'warning' }, { root: true });
      return;
    }

    // Permission granted, now register with Appwrite
    console.log("Push permission granted by user. Attempting subscription...");
    const registration = await navigator.serviceWorker.ready;
    // Use 'as any' to bypass type error for createPushSubscription
    await (account as any).createPushSubscription(registration);
    store.dispatch('notification/showNotification', { message: 'Push notifications enabled!', type: 'success' }, { root: true });
    console.log("Successfully subscribed to Appwrite push notifications via UI prompt.");

  } catch (err) {
    store.dispatch('notification/showNotification', { message: 'Failed to enable push notifications.', type: 'error' }, { root: true });
    console.error('Appwrite push registration failed from UI prompt:', err);
  }
}

function dismissPushPrompt() {
    showPushPermissionPrompt.value = false;
    sessionStorage.setItem('pushPromptDismissed', 'true'); // Remember dismissal for this session
}

// Watch isAuthenticated to check push permissions when user logs in
watch(isAuthenticated, (loggedIn) => {
    if (loggedIn) {
        // Use setTimeout to allow auth state/Appwrite login to potentially complete
        setTimeout(checkPushPermissionState, 1500);
    } else {
        showPushPermissionPrompt.value = false; // Hide prompt if logged out
    }
});

// --- Lifecycle Hooks ---
const handleScroll = () => {
  const currentScrollPosition = window.scrollY;
  if (Math.abs(currentScrollPosition - lastScrollPosition.value) < scrollThreshold && currentScrollPosition > 0) {
    return;
  }
  showNavbar.value = currentScrollPosition < lastScrollPosition.value || currentScrollPosition < 10;
  lastScrollPosition.value = currentScrollPosition;
};

onMounted(() => {
  store.dispatch('app/initOfflineCapabilities');
  window.addEventListener('scroll', handleScroll, { passive: true });
  // Initial check for push permission state if already logged in
  if (isAuthenticated.value) {
       setTimeout(checkPushPermissionState, 1500);
  }
});

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll);
});

</script>

<style scoped>
/* Styles as previously provided */
.app-container {
  min-height: 100vh;
  background-color: var(--bs-light); /* Use Bootstrap light background */
  color: var(--bs-body-color); /* Use Bootstrap default body color */
}

/* Navbar Styling */
.app-navbar {
  /* Background color set by Bootstrap class (bg-primary) */
  border-bottom: 1px solid var(--bs-border-color-translucent); /* Use CSS variable */
  transition: transform 0.3s ease-in-out;
  will-change: transform;
}

.navbar-hidden {
  transform: translateY(-100%);
}

.app-navbar-brand {
  color: var(--bs-light) !important; /* Light text for brand on primary bg */
  white-space: nowrap;
}
.app-navbar-brand:hover {
  color: var(--bs-white) !important; /* Slightly brighter on hover */
}

/* Navbar link colors */
.navbar-dark .navbar-nav .nav-link {
    color: var(--bs-navbar-color); /* Use Bootstrap variable */
    transition: color 0.2s ease-in-out;
}
.navbar-dark .navbar-nav .nav-link:hover,
.navbar-dark .navbar-nav .nav-link:focus {
    color: var(--bs-navbar-hover-color); /* Use Bootstrap variable */
}
/* Active link styling */
.navbar-dark .navbar-nav .nav-link.active {
  color: var(--bs-navbar-active-color) !important; /* Use Bootstrap variable */
  font-weight: var(--bs-font-weight-bold); /* Use Bootstrap variable */
}

/* Mobile Menu Background */
@media (max-width: 991.98px) {
  .app-navbar-menu.navbar-collapse {
    background-color: var(--bs-primary); /* Match navbar */
    padding: 0.5rem 1rem;
    margin-top: 0.5rem; /* Add some space */
    border-top: 1px solid var(--bs-border-color-translucent); /* Use CSS variable */
  }
  .navbar-nav {
      width: 100%; /* Ensure full width for layout */
  }
  .navbar-nav .nav-item {
      margin-bottom: 0.25rem; /* Spacing between items */
  }
}

/* Main Content Area Padding */
.app-main-content {
  padding-top: 72px; /* Adjust based on fixed navbar height + extra space */
  padding-bottom: 80px; /* Default padding if bottom nav isn't shown */
  min-height: 100vh;
  position: relative;
  z-index: 1;
  overflow-x: hidden;
}
/* Adjust padding-bottom when bottom nav is visible */
.app-container:has(.bottom-nav) .app-main-content {
   padding-bottom: calc(64px + 1rem + env(safe-area-inset-bottom)); /* BottomNav height + margin + safe area */
}

/* Page Transition */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease-out;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Dropdown Menu Adjustments */
.dropdown-menu {
  margin-top: 0.5rem; /* Add space below navbar */
  box-shadow: var(--bs-box-shadow-sm);
  border-color: var(--bs-border-color-translucent);
}
.dropdown-item {
    font-size: 0.9rem;
    padding-top: 0.5rem;
    padding-bottom: 0.5rem;
}
.dropdown-item i {
    color: var(--bs-secondary);
}

/* Ensure links are clickable */
.nav-link, .dropdown-item, .navbar-brand {
  cursor: pointer;
  user-select: none; /* Prevent text selection on click */
  -webkit-tap-highlight-color: transparent; /* Remove tap highlight on mobile */
}

/* Push Prompt Banner Styling */
.push-prompt-banner {
  position: fixed;
  bottom: calc(64px + 1rem); /* Position above bottom nav */
  left: 1rem;
  right: 1rem;
  z-index: 1045; /* Above bottom nav, below modals */
  border-radius: var(--bs-border-radius); /* Use CSS variable */
  box-shadow: var(--bs-box-shadow); /* Use CSS variable */
  transition: bottom 0.3s ease-in-out;
}
/* Adjust position if bottom nav is hidden */
.app-container:has(.bottom-nav.nav-hidden) .push-prompt-banner {
    bottom: 1rem;
}
@media (min-width: 992px) {
    /* Position differently on desktop */
    .push-prompt-banner {
        bottom: 1rem;
        left: auto; /* Align right */
        right: 1rem;
        width: auto; /* Auto width */
        max-width: 400px;
    }
}
</style>