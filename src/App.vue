<template>
  <div 
    id="app" 
    class="is-flex is-flex-direction-column" 
    style="min-height: 100vh; background-color: var(--color-neutral-light); color: var(--color-text-secondary);"
  >
    <!-- Offline State Handler -->
    <OfflineStateHandler />
    <!-- Notification System -->
    <NotificationSystem />

    <!-- Top Navigation Bar -->
    <nav
      class="navbar is-fixed-top has-shadow"
      role="navigation" 
      aria-label="main navigation"
      style="background-color: var(--color-surface); border-bottom: 1px solid var(--color-border); z-index: 30;" /* Bulma uses z-index 30 for navbar */
    >
      <div class="container">
        <div class="navbar-brand">
          <router-link
            to="/"
            class="navbar-item has-text-primary has-text-weight-bold is-size-5 is-size-4-desktop" 
            @click="closeNavbar"
            style="white-space: nowrap;"
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
            style="color: var(--color-text-secondary);"
          >
            <span aria-hidden="true"></span>
            <span aria-hidden="true"></span>
            <span aria-hidden="true"></span>
          </a>
        </div>

        <!-- Navbar Content -->
        <div 
          id="navbarBasicExample" 
          class="navbar-menu" 
          :class="{ 'is-active': isNavbarOpen }"
          ref="navbarCollapseRef"
          style="background-color: var(--color-surface);" /* Ensure mobile menu has background */
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
                  class="button is-danger is-light"
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
    <main class="section" style="flex-grow: 1; padding-top: 5rem; padding-bottom: 5rem;"> /* Added padding-top to account for fixed navbar */
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
import { computed, ref, onMounted, onUnmounted } from 'vue'; // Removed h
import { useStore } from 'vuex';
import { useRouter } from 'vue-router';
import { getAuth, signOut } from 'firebase/auth';
// REMOVED Chakra UI Imports
// import {
//   Box as CBox,
//   Flex as CFlex,
//   Container as CContainer,
//   Link as CLink,
//   IconButton as CIconButton,
//   Icon as CIcon,
//   List as CList,
//   ListItem as CListItem,
// } from '@chakra-ui/vue-next'; 
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
/* Add styles for Bulma active navbar items if needed */
.navbar-item.is-active {
  background-color: var(--color-secondary-light); /* Example: use your theme color */
  color: var(--color-primary); /* Example: use your theme color */
}

/* Ensure main content has enough padding top for the fixed navbar */
/* Using inline style for now, but could be moved here */
/* main.section {
  padding-top: 5rem; /* Adjust based on navbar height */
  /* padding-bottom: 5rem; /* Adjust based on bottom nav height if it were fixed */
/* } */

/* Ensure mobile menu takes precedence */
.navbar-menu.is-active {
  position: absolute; /* Or fixed depending on desired behavior */
  width: 100%;
  left: 0;
  z-index: 20; /* Below navbar itself */
  box-shadow: 0 8px 16px rgba(10, 10, 10, 0.1);
  border-top: 1px solid var(--color-border); /* Add separator */
}

/* Style burger lines */
.navbar-burger span {
  background-color: var(--color-text-secondary);
}
.navbar-burger:hover span {
   background-color: var(--color-primary);
}
.navbar-burger.is-active span {
   background-color: var(--color-primary);
}
</style>
