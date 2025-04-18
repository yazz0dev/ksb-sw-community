<template>
  <div id="app" class="d-flex flex-column app-container">
    <!-- Fixed Position Utilities -->
    <OfflineStateHandler />
    <NotificationSystem />

    <!-- Top Navigation Bar -->
    <nav
      class="navbar navbar-expand-lg navbar-dark bg-primary shadow-sm fixed-top app-navbar"
      :class="{ 'navbar-hidden': !showNavbar }"
      role="navigation"
      aria-label="main navigation"
    >
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
             <!-- Admin Dashboard (Desktop only if Admin) -->
             <li class="nav-item d-none d-lg-block" v-if="isAdmin">
                 <router-link
                    class="nav-link"
                    active-class="active fw-semibold"
                    to="/admin/dashboard"
                    @click="closeNavbar"
                 >
                    Admin
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
                      @click="handleLogout"
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

    <!-- Example Push Notification Prompt Banner -->
    <div v-if="showPushPrompt" class="push-prompt-banner alert alert-info">
      <span>Enable notifications for important event updates?</span>
      <button @click="requestPushPermission" class="btn btn-sm btn-light ms-2">Enable</button>
    </div>

    <!-- Bottom Navigation (Mobile Only) -->
    <BottomNav
      v-if="isAuthenticated"
      class="d-lg-none"
      :class="{ 'nav-hidden': !showNavbar }"
    />
  </div>
</template>

<script setup lang="ts">
// --- Core Vue/External Imports ---
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useStore } from 'vuex';
import { useRouter } from 'vue-router';
import { getAuth, signOut } from 'firebase/auth';

// --- Internal Components ---
import BottomNav from './components/BottomNav.vue';
import OfflineStateHandler from './components/OfflineStateHandler.vue';
import NotificationSystem from './components/NotificationSystem.vue';

// --- Appwrite/SendPulse Integration START ---
import { isAppwriteConfigured } from './appwrite'; // Appwrite config check
import { initSendpulse, promptForPushSubscription } from './sendpulse'; // SendPulse logic
// --- Appwrite/SendPulse Integration END ---

// --- Types ---
// Define Bootstrap Collapse type (if not using @types/bootstrap)
interface Collapse {
  toggle(): void;
  hide(): void;
  show(): void;
  dispose(): void; // Add dispose for cleanup
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
const scrollThreshold = 50; // Pixels to scroll before hiding/showing nav
const isPushSubscribed = ref<boolean | null>(null); // null initially, true/false after check
const showPushPrompt = computed(() => isAppwriteConfigured() && isPushSubscribed.value === false);

// --- Computed Vuex Getters ---
const isAuthenticated = computed(() => store.getters['user/isAuthenticated']);
const isAdmin = computed(() => store.getters['user/isAdmin']); // Use direct getter
const userName = computed(() => store.getters['user/getUser']?.name || 'User'); // Safer access
const userId = computed(() => store.getters['user/userId']); // Use direct getter

// --- Methods ---

// Logout Logic
const logout = async (): Promise<void> => {
  const auth = getAuth();
  try {
    await signOut(auth);
    console.log("Firebase logout successful.");
    // --- Appwrite/SendPulse Integration START ---
    // Logout from Appwrite session as well
    if (isAppwriteConfigured()) {
        try {
            const { account } = await import('./appwrite');
            await account.deleteSession('current');
            console.log("Appwrite session deleted.");
        } catch (appwriteError) {
            console.warn("Could not delete Appwrite session:", appwriteError);
        }
    }
    isPushSubscribed.value = false; // Reset push status on logout
    // --- Appwrite/SendPulse Integration END ---
  } catch (error) {
    console.error("Firebase logout failed:", error);
    // Optionally notify user
    store.dispatch('notification/showNotification', { message: 'Logout failed. Please try again.', type: 'error' });
  } finally {
    // Always clear local user data and redirect
    await store.dispatch('user/clearUserData');
    router.replace({ name: 'Login' }).catch(err => {
      if (err.name !== 'NavigationDuplicated' && err.name !== 'NavigationCancelled') {
        console.error('Router navigation error after logout:', err);
      }
    });
  }
};

// Close Navbar (Mobile)
const closeNavbar = () => {
  try {
    const navbarContent = document.getElementById('navbarNav');
    if (navbarContent && window.bootstrap?.Collapse) {
      const bsCollapse = window.bootstrap.Collapse.getInstance(navbarContent);
      if (bsCollapse) {
        bsCollapse.hide();
      }
    }
  } catch (error) {
    console.warn('Failed to close navbar:', error);
  }
};

// Combine closing navbar and logging out
const handleLogout = async (): Promise<void> => {
  closeNavbar();
  await logout();
};

// Scroll Handler for Navbar Hiding/Showing
const handleScroll = () => {
  const currentScrollPosition = window.scrollY;
  // Ignore small scrolls
  if (Math.abs(currentScrollPosition - lastScrollPosition.value) < scrollThreshold && currentScrollPosition > 0) {
    return;
  }
  // Show if scrolling up or near the top, hide if scrolling down
  showNavbar.value = currentScrollPosition < lastScrollPosition.value || currentScrollPosition < 10;
  lastScrollPosition.value = currentScrollPosition;
};

// --- Appwrite/SendPulse Integration START ---
// Request Push Permission
const requestPushPermission = async () => {
    try {
        await promptForPushSubscription(); // Call the imported function
        // Re-check status after prompting (SendPulse SDK might have callbacks)
        setTimeout(checkPushStatus, 1000); // Delay check slightly
    } catch (error) {
        console.error("Error prompting for push subscription:", error);
        store.dispatch('notification/showNotification', { message: 'Could not enable notifications.', type: 'error' });
    }
};

// Check SendPulse Subscription Status
const checkPushStatus = () => {
    if (typeof window.oSpP === 'undefined' || typeof window.oSpP.push !== 'function') {
        console.warn("SendPulse SDK not ready for status check.");
        isPushSubscribed.value = null; // Status unknown
        return;
    }
    window.oSpP.push('getSubscriptionStatus', (status) => {
        console.log('SendPulse Subscription Status:', status);
        isPushSubscribed.value = (status === 'subscribed');
    });
};
// --- Appwrite/SendPulse Integration END ---

// --- Lifecycle Hooks ---
onMounted(() => {
  // Initialize offline capabilities
  store.dispatch('app/initOfflineCapabilities');
  // Add scroll listener
  window.addEventListener('scroll', handleScroll, { passive: true });

  // --- Appwrite/SendPulse Integration START ---
  // Initialize SendPulse only if Appwrite is configured and user is potentially logged in
  if (isAppwriteConfigured() && isAuthenticated.value) {
      // Delay slightly to allow SDK script to potentially load
      setTimeout(() => {
          initSendpulse();
          checkPushStatus(); // Check status on mount
      }, 500);
  } else {
       isPushSubscribed.value = false; // Assume not subscribed if not configured/logged in
  }
  // --- Appwrite/SendPulse Integration END ---

  // Initialize Bootstrap Collapse listeners (safer approach)
  setTimeout(() => {
    try {
        const navbarContent = document.getElementById('navbarNav');
        const toggler = document.querySelector<HTMLElement>('.navbar-toggler'); // Type assertion

        if (navbarContent && toggler && window.bootstrap?.Collapse) {
            // Ensure only one instance is created
            let bsCollapse = window.bootstrap.Collapse.getInstance(navbarContent);
            if (!bsCollapse) {
                bsCollapse = new window.bootstrap.Collapse(navbarContent, { toggle: false });
            }

            // Use event delegation or ensure listener is added correctly
            // This example assumes direct listener is okay, but check for duplicates if issues arise
            toggler.onclick = (e) => { // Use onclick for simplicity here, or manage listeners carefully
                e.preventDefault();
                bsCollapse?.toggle();
            };

            // Add listeners to close menu on link click (mobile)
            navbarContent.querySelectorAll('.nav-link, .dropdown-item').forEach(link => {
                link.addEventListener('click', () => {
                    if (window.innerWidth < 992 && navbarContent.classList.contains('show')) {
                        bsCollapse?.hide();
                    }
                });
            });
        }
    } catch(e) {
        console.error("Error initializing Bootstrap Collapse:", e);
    }
  }, 150); // Delay slightly
});

onUnmounted(() => {
  // Remove scroll listener
  window.removeEventListener('scroll', handleScroll);
  // Optional: Dispose Bootstrap components if needed
   try {
       const navbarContent = document.getElementById('navbarNav');
       if (navbarContent && window.bootstrap?.Collapse) {
           const bsCollapse = window.bootstrap.Collapse.getInstance(navbarContent);
           bsCollapse?.dispose();
       }
   } catch(e) {
       console.warn("Error disposing Bootstrap Collapse:", e);
   }
});

</script>

<style scoped>
.app-container {
  min-height: 100vh;
  background-color: var(--bs-light); /* Use Bootstrap light background */
  color: var(--bs-body-color); /* Use Bootstrap default body color */
}

/* Navbar Styling */
.app-navbar {
  /* Background color set by Bootstrap class (bg-primary) */
  border-bottom: 1px solid rgba(0, 0, 0, 0.1); /* Subtle border */
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
    color: rgba(255, 255, 255, 0.75); /* Lighter text for links */
    transition: color 0.2s ease-in-out;
}
.navbar-dark .navbar-nav .nav-link:hover,
.navbar-dark .navbar-nav .nav-link:focus {
    color: rgba(255, 255, 255, 1); /* Full white on hover/focus */
}
/* Active link styling */
.navbar-dark .navbar-nav .nav-link.active {
  color: var(--bs-white) !important; /* Full white for active */
  font-weight: 600;
}

/* Mobile Menu Background */
@media (max-width: 991.98px) {
  .app-navbar-menu.navbar-collapse {
    background-color: var(--bs-primary); /* Match navbar */
    padding: 0.5rem 1rem;
    margin-top: 0.5rem; /* Add some space */
    border-top: 1px solid rgba(255, 255, 255, 0.1);
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
  /* Padding bottom adjusted by BottomNav presence */
  padding-bottom: 80px; /* Default padding if bottom nav isn't shown */
  min-height: 100vh;
  position: relative;
  z-index: 1;
  overflow-x: hidden;
}
/* Adjust padding-bottom when bottom nav is visible */
.app-container:has(.bottom-nav:not(.nav-hidden)) .app-main-content {
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

/* Scroll-based Navbar Hiding */
.navbar, .bottom-nav {
  transition: transform 0.3s ease-in-out;
  will-change: transform;
}
.navbar-hidden {
  transform: translateY(-100%);
}
.nav-hidden { /* For BottomNav */
  transform: translateY(100%);
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

/* Push Notification Prompt Banner */
.push-prompt-banner {
    position: fixed;
    bottom: 1rem; /* Default position */
    left: 1rem;
    right: 1rem;
    z-index: 1045; /* Above default bottom nav */
    max-width: 500px; /* Limit width on larger screens */
    margin: 0 auto; /* Center */
    transition: bottom 0.3s ease-in-out; /* Animate with navbars */
}
/* Adjust prompt position when bottom nav is visible */
.app-container:has(.bottom-nav:not(.nav-hidden)) .push-prompt-banner {
    bottom: calc(64px + 1rem + env(safe-area-inset-bottom)); /* Position above bottom nav */
}
.push-prompt-banner span {
    margin-right: 0.5rem;
}

</style>