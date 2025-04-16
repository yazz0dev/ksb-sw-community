<template>
  <div id="app" class="d-flex flex-column app-container">
    <OfflineStateHandler />
    <NotificationSystem />

    <!-- Top Navigation Bar - Added scroll classes -->
    <nav
      class="navbar navbar-expand-lg navbar-dark bg-primary shadow-sm fixed-top"
      :class="{ 'navbar-hidden': !showNavbar }"
      role="navigation"
      aria-label="main navigation"
    >
      <div class="container-lg">
        <router-link
          class="navbar-brand d-flex align-items-center" 
          to="/"
        >
          <i class="fas fa-users fa-lg me-2"></i>
          <span class="fw-bold">KSB Community</span>
        </router-link>

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

        <!-- Navbar Content -->
        <div 
          class="collapse navbar-collapse" 
          id="navbarNav"
        >
          <!-- Left-aligned Links (Common & Role-Based) -->
          <ul class="navbar-nav me-auto mb-2 mb-lg-0">
             <!-- Home: Only in top bar if logged in (but will be hidden by CSS on mobile) -->
             <li class="nav-item d-none d-lg-block"> 
               <router-link
                  class="nav-link"
                  active-class="active fw-semibold"
                  to="/home"
                  v-if="isAuthenticated" 
                  @click="closeNavbar"
               >
                  <i class="fas fa-home me-1 d-lg-none"></i> Home
               </router-link>
             </li>
             <!-- Events: Only in top bar if logged out -->
             <li class="nav-item" v-if="!isAuthenticated">
               <router-link
                  class="nav-link"
                  active-class="active fw-semibold"
                  to="/events"
                  @click="closeNavbar"
               >
                  <i class="fas fa-calendar-alt me-1 d-lg-none"></i> Events
               </router-link>
             </li>
             <!-- Leaderboard: Only in top bar if logged out -->
             <li class="nav-item d-none d-lg-block" v-if="!isAuthenticated"> 
               <router-link
                  class="nav-link"
                  active-class="active fw-semibold"
                  to="/leaderboard"
                  @click="closeNavbar"
               >
                  <i class="fas fa-trophy me-1 d-lg-none"></i> Leaderboard
               </router-link>
             </li>
             <!-- Resources: Should be visible always -->
             <li class="nav-item"> 
                <router-link
                    class="nav-link"
                    active-class="active fw-semibold"
                    to="/resources"
                    @click="closeNavbar"
                >
                    <i class="fas fa-book me-1 d-lg-none"></i> Resources
                </router-link>
              </li>
              <!-- Transparency: Should be visible always -->
              <li class="nav-item"> 
                <router-link
                    class="nav-link"
                    active-class="active fw-semibold"
                    to="/transparency"
                    @click="closeNavbar"
                >
                    <i class="fas fa-eye me-1 d-lg-none"></i> Transparency
                </router-link>
              </li>
             <!-- Admin: Only in top bar if Admin AND logged out (unlikely) OR on desktop -->
             <li class="nav-item d-none d-lg-block" v-if="isAdmin"> 
                 <router-link
                    class="nav-link"
                    active-class="active fw-semibold"
                    to="/admin/dashboard"
                    @click="closeNavbar"
                 >
                    <i class="fas fa-tachometer-alt me-1 d-lg-none"></i> Admin
                 </router-link>
              </li>
          </ul>

          <!-- Right-aligned Links (Auth/User) -->
          <ul class="navbar-nav ms-auto align-items-lg-center">
            <!-- Logged Out -->
            <template v-if="!isAuthenticated">
                <li class="nav-item">
                  <router-link
                    class="nav-link"
                    active-class="active fw-semibold"
                    to="/login"
                    @click="closeNavbar"
                   >
                     <i class="fas fa-sign-in-alt me-1 d-lg-none"></i> Login
                  </router-link>
                </li>
            </template>

            <!-- Logged In -->
            <template v-if="isAuthenticated">
                 <!-- User Dropdown -->
                  <li class="nav-item dropdown">
                     <a class="nav-link dropdown-toggle" href="#" id="navbarUserDropdown" role="button" data-bs-toggle="dropdown" aria-expanded="false">
                       <i class="fas fa-user-circle me-1"></i>
                       <span>{{ userName }}</span>
                     </a>
                     <ul class="dropdown-menu dropdown-menu-end" aria-labelledby="navbarUserDropdown">
                      <template v-if="!isAdmin">
                       <li>
                          <router-link 
                              v-if="userId"
                              class="dropdown-item"
                              :to="{ name: 'Profile' }"
                              @click="closeNavbar"
                          >
                              <i class="fas fa-user me-2"></i>Profile
                          </router-link>
                       </li>
                      </template>
                       <li><hr class="dropdown-divider"></li>
                       <li>
                          <button 
                             class="dropdown-item" 
                             @click="handleLogout"
                          >
                             <i class="fas fa-sign-out-alt me-2"></i>Logout
                          </button>
                      </li>
                     </ul>
                  </li>
            </template>
          </ul>
        </div>
      </div>
    </nav>

    <!-- Main Content Area - Adjusted padding -->
    <main class="flex-grow-1 app-main-content"> 
      <div class="container">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </div>
    </main>

    <!-- Bottom Navigation - Added scroll classes -->
    <BottomNav 
      v-if="isAuthenticated" 
      class="d-flex d-lg-none"
      :class="{ 'nav-hidden': !showNavbar }" 
    />
  </div>
</template>

<script setup lang="ts">
// Add this at the top of the script block (before other code)
declare global {
  interface Window {
    bootstrap?: {
      Modal?: any;
      Collapse?: any;
    };
  }
}

import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useStore } from 'vuex';
import { useRouter } from 'vue-router';
import { getAuth, signOut } from 'firebase/auth';
import BottomNav from './components/BottomNav.vue';
import OfflineStateHandler from './components/OfflineStateHandler.vue';
import NotificationSystem from './components/NotificationSystem.vue';

// Add type definition for Bootstrap Collapse
interface Collapse {
  toggle(): void;
  hide(): void;
  show(): void;
}

const store = useStore();
const router = useRouter();

const isAuthenticated = computed(() => store.getters['user/isAuthenticated']);
const isAdmin = computed(() => store.getters['user/getUserRole'] === 'Admin');
const userName = computed(() => store.state.user.name || 'User');
const userId = computed(() => store.state.user.uid);

// Move logout and handleLogout functions here, before they're used in template
const logout = async (): Promise<void> => {
  const auth = getAuth();
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Logout failed:", error);
  } finally {
    await store.dispatch('user/clearUserData');
    router.replace({ name: 'Login' }).catch(err => {
      if (err.name !== 'NavigationDuplicated' && err.name !== 'NavigationCancelled') { 
        console.error('Router navigation error after logout:', err);
      }
    });
  }
};

// Add explicit type for handleLogout
const handleLogout = async (): Promise<void> => {
  closeNavbar();
  await logout();
};

// Scroll handling
const showNavbar = ref(true);
const lastScrollPosition = ref(0);
const scrollThreshold = 50;

const handleScroll = () => {
  const currentScrollPosition = window.scrollY;
  if (Math.abs(currentScrollPosition - lastScrollPosition.value) < scrollThreshold) {
    return;
  }
  
  showNavbar.value = currentScrollPosition < lastScrollPosition.value || currentScrollPosition < 50;
  lastScrollPosition.value = currentScrollPosition;
};

// Update the ref type
const navbarCollapse = ref<Collapse | null>(null);

// Add Bootstrap availability check
const isBootstrapAvailable = () => {
  return typeof window !== 'undefined' && window.bootstrap !== undefined;
};

// Update closeNavbar function
const closeNavbar = () => {
  try {
    const navbarContent = document.getElementById('navbarNav');
    if (!navbarContent) return;

    // Always use Bootstrap's Collapse if available
    if (window.bootstrap?.Collapse) {
      const bsCollapse = window.bootstrap.Collapse.getInstance(navbarContent);
      if (bsCollapse) {
        bsCollapse.hide();
      }
    } else {
      // Fallback
      navbarContent.classList.remove('show');
    }
  } catch (error) {
    console.warn('Failed to close navbar:', error);
  }
};

onMounted(() => {
  store.dispatch('app/initOfflineCapabilities');
  window.addEventListener('scroll', handleScroll, { passive: true });

  // Bootstrap navbar initialization
  setTimeout(() => {
    const navbarContent = document.getElementById('navbarNav');
    const toggler = document.querySelector('.navbar-toggler');
    
    if (!navbarContent || !toggler || !window.bootstrap?.Collapse) return;

    // Create a single Collapse instance
    const bsCollapse = new window.bootstrap.Collapse(navbarContent, {
      toggle: false
    });

    // Remove any existing click listeners
    toggler.replaceWith(toggler.cloneNode(true));
    const newToggler = document.querySelector('.navbar-toggler');
    if (!newToggler) return;

    // Add single click handler for toggler
    newToggler.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      bsCollapse.toggle();
    });

    // Add click handlers to nav links
    document.querySelectorAll('.navbar-nav .nav-link').forEach(link => {
      link.addEventListener('click', () => {
        if (window.innerWidth < 992) {
          bsCollapse.hide();
        }
      });
    });

    // Also close on dropdown items
    document.querySelectorAll('.dropdown-item').forEach(item => {
      item.addEventListener('click', () => {
        if (window.innerWidth < 992) {
          bsCollapse.hide();
        }
      });
    });

  }, 100);
});

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll);
});
</script>

<style scoped>
/* Keep essential styles, adapt others for Bootstrap */
.app-container {
  min-height: 100vh; 
  background-color: var(--bs-light); /* Example: Use Bootstrap background variable */
  color: var(--bs-secondary); /* Example: Use Bootstrap text variable */
}

.app-navbar {
  background-color: var(--bs-light); /* Use Bootstrap variable or custom */
  border-bottom: 1px solid var(--bs-gray-300); /* Example: Bootstrap border */
  /* z-index is handled by fixed-top */
}

.app-navbar-brand {
  color: var(--bs-primary) !important; /* Ensure primary color for brand */
  white-space: nowrap;
}

/* Bootstrap handles toggler icon styling */
/* .navbar-toggler span { ... } */

/* Mobile menu bg */
@media (max-width: 991.98px) { /* Bootstrap lg breakpoint */
  .app-navbar-menu.navbar-collapse {
    background-color: var(--bs-light); /* Match navbar or choose different */
     /* Add padding or other styles if needed */
    padding: 0.5rem 1rem; 
    border-top: 1px solid var(--bs-gray-300);
    margin-top: 0.5rem; /* Space between toggler and content */
  }
}


/* Active nav-link styling (Bootstrap handles .active class) */
.nav-link.active {
  /* background-color: rgba(var(--bs-primary-rgb), 0.1); Optional: Subtle bg */
  color: white !important; /* Use white for contrast on primary background */
  font-weight: 600; /* Make active item bolder */
}

/* Adjust hover for non-active items */
.nav-link:not(.active):hover {
  color: var(--bs-dark); /* Example: Darker text on hover */
}


/* Main content spacing */
.app-main-content {
  padding-top: 56px;
  padding-bottom: calc(64px + env(safe-area-inset-bottom));
  min-height: 100vh;
  position: relative;
  z-index: 1;
  overflow-x: hidden; /* Prevent horizontal scroll */
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Navigation positioning */
.navbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1030; /* Lower than bottom nav */
}

/* Mobile menu positioning */
@media (max-width: 991.98px) {
  .navbar-collapse {
    position: fixed;
    top: 56px;
    left: 0;
    right: 0;
    background-color: var(--bs-primary);
    padding: 1rem;
    z-index: 1029; /* Lower than both navbars */
    max-height: calc(100vh - 120px); /* Account for both navbars */
    overflow-y: auto;
  }
}

/* Navigation transition styles */
.navbar, .bottom-nav {
  transition: transform 0.3s ease-in-out;
  will-change: transform;
}

.navbar-hidden {
  transform: translateY(-100%);
}

.nav-hidden {
  transform: translateY(100%);
}

/* Fix dropdown menu positioning */
.dropdown-menu {
  margin-top: 0.5rem;
}

/* Ensure links are clickable in mobile menu */
.nav-link {
  cursor: pointer;
  user-select: none;
}
</style>
