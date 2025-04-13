<template>
  <div 
    id="app" 
    class="is-flex is-flex-direction-column app-container" 
  >
    <!-- Offline State Handler -->
    <OfflineStateHandler />
    <!-- Notification System -->
    <NotificationSystem />

    <!-- Top Navigation Bar -->
    <nav
      class="navbar is-fixed-top has-shadow app-navbar"
      role="navigation" 
      aria-label="main navigation"
    >
      <div class="container">
        <div class="navbar-brand">
          <router-link
            to="/"
            class="navbar-item app-navbar-brand has-text-weight-bold is-size-5 is-size-4-desktop" 
            @click="closeNavbar"
          >
            KSB Tech Community
          </router-link>

          <a
            role="button"
            class="navbar-burger"
            :class="{ 'is-active': isNavbarOpen }"
            aria-label="menu"
            :aria-expanded="isNavbarOpen"
            @click.stop="toggleNavbar"
          >
            <span aria-hidden="true"></span>
            <span aria-hidden="true"></span>
            <span aria-hidden="true"></span>
          </a>
        </div>

        <!-- Navbar Content -->
        <div 
          id="navbarBasicExample" 
          class="navbar-menu app-navbar-menu" 
          :class="{ 'is-active': isNavbarOpen }"
          ref="navbarCollapseRef"
        >
          <!-- Menu Navigation -->
          <div class="navbar-start">
            <router-link
              v-if="isAuthenticated"
              to="/home"
              class="navbar-item"
              :class="{ 'is-active': $route.path === '/home' }"
              @click="closeNavbar"
            >
              Home
            </router-link>
            <router-link
              to="/leaderboard"
              class="navbar-item"
              :class="{ 'is-active': $route.path === '/leaderboard' }"
              @click="closeNavbar"
            >
              Leaderboard
            </router-link>
            <router-link
              v-if="isAuthenticated"
              to="/home"
              class="navbar-item"
              :class="{ 'is-active': $route.path === '/home' }" 
              @click="closeNavbar"
            >
              Events 
            </router-link>
             <router-link
               v-else
               to="/completed-events"
               class="navbar-item"
               :class="{ 'is-active': $route.path === '/completed-events' }"
               @click="closeNavbar"
             >
               Completed Events
             </router-link>
            <router-link
              to="/resources"
              class="navbar-item"
              :class="{ 'is-active': $route.path === '/resources' }"
              @click="closeNavbar"
            >
              Resources
            </router-link>
            <router-link
              to="/transparency"
              class="navbar-item"
              :class="{ 'is-active': $route.path === '/transparency' }"
              @click="closeNavbar"
            >
              Transparency
            </router-link>
          </div>

          <!-- Auth Links -->
          <div class="navbar-end">
            <div class="navbar-item">
              <div class="buttons">
                <router-link
                  v-if="!isAuthenticated"
                  to="/login"
                  class="button is-light"
                  :class="{ 'is-primary is-active': $route.path === '/login' }"
                  @click="closeNavbar"
                >
                  Login
                </router-link>
                <a
                  v-if="isAuthenticated"
                  href="#"
                  @click.prevent="logout"
                  class="button is-danger is-light logout-button"
                >
                  <span class="icon">
                    <i class="fas fa-sign-out-alt"></i>
                  </span>
                  <span>Logout</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </nav>

    <!-- Main Content Area -->
    <main class="section app-main-content">
      <div class="container">
        <router-view v-slot="{ Component }">
          <!-- Keep the fade-in animation class if defined globally -->
          <component :is="Component" class="animate-fade-in" />
        </router-view>
      </div>
    </main>

    <!-- Bottom Navigation -->
    <BottomNav v-if="isAuthenticated" class="is-flex is-hidden-desktop" />
  </div>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'; 
import { useStore } from 'vuex';
import { useRouter } from 'vue-router';
import { getAuth, signOut } from 'firebase/auth';
import BottomNav from './components/BottomNav.vue';
import OfflineStateHandler from './components/OfflineStateHandler.vue';
import NotificationSystem from './components/NotificationSystem.vue';

const store = useStore();
const router = useRouter();
const navbarCollapseRef = ref(null); // Keep ref for potential click-outside logic later if needed
const isNavbarOpen = ref(false);

const isAuthenticated = computed(() => store.getters['user/isAuthenticated']);
const isAdmin = computed(() => store.getters['user/isAdmin']); // Keep isAdmin if used elsewhere or in BottomNav

const toggleNavbar = (event) => {
  // Prevent event propagation to avoid triggering other click handlers
  if (event) event.stopPropagation();
  isNavbarOpen.value = !isNavbarOpen.value;
};

const closeNavbar = (event) => {
  // Prevent event propagation to avoid triggering other click handlers
  // If the click is on the burger itself, toggleNavbar will handle it
  if (event && event.currentTarget.classList.contains('navbar-burger')) {
      return;
  }
  isNavbarOpen.value = false;
};

const logout = (event) => {
  // Prevent event propagation to avoid triggering other click handlers
  if (event) event.stopPropagation();
  closeNavbar(); // Close navbar immediately on click
  const auth = getAuth();
  signOut(auth).then(() => {
    // Success is handled in finally
  }).catch((error) => {
      console.error("Logout failed:", error);
      // Optionally show user feedback about logout failure
  }).finally(() => {
      store.dispatch('user/clearUserData'); // Clear user data in store
      // Use replace to prevent going back to authenticated pages
      router.replace({ name: 'Login' }).catch(err => {
          // Handle potential navigation errors if needed
          if (err.name !== 'NavigationDuplicated' && err.name !== 'NavigationCancelled') { // Added NavigationCancelled check
               console.error('Router navigation error after logout:', err);
          }
      });
  });
};

// Close mobile navbar on route change
onMounted(() => {
  router.afterEach(() => {
    closeNavbar();
  });
  
  // Initialize offline capabilities
  store.dispatch('app/initOfflineCapabilities');

  // Optional: Add click outside listener for mobile navbar
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});

// Click outside handler
const handleClickOutside = (event) => {
  if (navbarCollapseRef.value && !navbarCollapseRef.value.contains(event.target)) {
    // Check if the click target is the burger button itself
    const burger = document.querySelector('.navbar-burger');
    if (burger && !burger.contains(event.target)) {
      closeNavbar();
    }
  }
};

</script>

<style scoped>
.app-container {
  min-height: 100vh; 
  background-color: var(--color-background); /* Use background color variable */
  color: var(--color-text-secondary);
}

.app-navbar {
  background-color: var(--color-surface); 
  border-bottom: 1px solid var(--color-border); 
  z-index: 30; /* Keep z-index */
}

.app-navbar-brand {
  color: var(--color-primary) !important; /* Ensure primary color for brand */
  white-space: nowrap;
}

/* Style burger lines using variables */
.navbar-burger span {
  background-color: var(--color-text-secondary);
}
.navbar-burger:hover span,
.navbar-burger.is-active span {
   background-color: var(--color-primary);
}

.app-navbar-menu {
  background-color: var(--color-surface);
}

/* Active navbar item styling */
.navbar-item.is-active {
  background-color: var(--color-primary-light); 
  color: var(--color-primary-dark); /* Use a darker primary for contrast */
  font-weight: 600; /* Make active item bolder */
}

/* Adjust hover for non-active items */
.navbar-item:not(.is-active):hover {
  background-color: var(--color-surface-variant);
  color: var(--color-text-primary);
}

/* Ensure logout button uses correct danger colors */
.logout-button {
  background-color: var(--color-error-extraLight) !important; /* Use light error */
  color: var(--color-error-dark) !important; /* Use dark error text */
  border-color: transparent; /* Remove default light border */
}
.logout-button:hover {
   background-color: var(--color-error-light) !important; /* Slightly darker on hover */
   color: var(--color-error-text) !important; 
   border-color: transparent;
}

/* Main content padding */
.app-main-content {
  flex-grow: 1; 
  padding-top: 5rem; /* Adjust based on navbar height */
  padding-bottom: 5rem; /* Adjust based on potential bottom nav height */
}

/* Mobile menu adjustments */
@media screen and (max-width: 1023px) {
  .app-navbar-menu.is-active {
    position: absolute; 
    width: 100%;
    left: 0;
    top: 100%; /* Position below the navbar */
    z-index: 20; 
    box-shadow: 0 8px 16px rgba(10, 10, 10, 0.1);
    border-top: 1px solid var(--color-border); 
  }
}

</style>
