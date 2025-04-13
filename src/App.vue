<template>
  <div 
    id="app" 
    class="d-flex flex-column app-container" 
  >
    <!-- Offline State Handler -->
    <OfflineStateHandler />
    <!-- Notification System -->
    <NotificationSystem />

    <!-- Top Navigation Bar -->
    <nav
      class="navbar navbar-expand-lg navbar-light bg-light fixed-top shadow-sm app-navbar" 
      role="navigation" 
      aria-label="main navigation"
    >
      <div class="container">
        <router-link
          to="/"
          class="navbar-brand app-navbar-brand fw-bold fs-5 fs-lg-4" 
        >
          KSB Tech Community
        </router-link>

        <button
          class="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarContent"
          aria-controls="navbarContent"
          aria-expanded="false" 
          aria-label="Toggle navigation"
        >
          <span class="navbar-toggler-icon"></span>
        </button>

        <!-- Navbar Content -->
        <div 
          class="collapse navbar-collapse app-navbar-menu" 
          id="navbarContent"
        >
          <!-- Menu Navigation -->
          <ul class="navbar-nav me-auto mb-2 mb-lg-0">
            <li class="nav-item">
              <router-link
                v-if="isAuthenticated"
                to="/home"
                class="nav-link"
                active-class="active"
              >
                Home
              </router-link>
            </li>
            <li class="nav-item">
              <router-link
                to="/leaderboard"
                class="nav-link"
                active-class="active"
              >
                Leaderboard
              </router-link>
            </li>
            <li class="nav-item">
              <router-link
                v-if="isAuthenticated"
                to="/home" 
                class="nav-link"
                active-class="active"
              >
                Events 
              </router-link>
               <router-link
                 v-if="!isAuthenticated"
                 to="/completed-events"
                 class="nav-link"
                 active-class="active"
               >
                 Completed Events
               </router-link>
            </li>
            <li class="nav-item">
              <router-link
                to="/resources"
                class="nav-link"
                active-class="active"
              >
                Resources
              </router-link>
            </li>
            <li class="nav-item">
              <router-link
                to="/transparency"
                class="nav-link"
                active-class="active"
              >
                Transparency
              </router-link>
            </li>
          </ul>

          <!-- Auth Links -->
          <div class="navbar-nav ms-auto">
            <div class="d-flex align-items-center gap-2"> 
              <router-link
                v-if="!isAuthenticated"
                to="/login"
                class="btn btn-light" 
                :class="{ 'btn-primary active': $route.path === '/login' }"
              >
                Login
              </router-link>
              <a
                v-if="isAuthenticated"
                href="#"
                @click.prevent="logout"
                class="btn btn-outline-danger logout-button d-flex align-items-center gap-1"
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
    </nav>

    <!-- Main Content Area -->
    <main class="flex-grow-1 py-5 app-main-content"> 
      <div class="container">
        <router-view v-slot="{ Component }">
          <!-- Apply Bootstrap transition or keep custom -->
          <component :is="Component" class="animate-fade-in" /> 
        </router-view>
      </div>
    </main>

    <!-- Bottom Navigation -->
    <BottomNav v-if="isAuthenticated" class="d-flex d-lg-none" />
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'; // Removed ref, onUnmounted
import { useStore } from 'vuex';
import { useRouter } from 'vue-router';
import { getAuth, signOut } from 'firebase/auth';
import BottomNav from './components/BottomNav.vue';
import OfflineStateHandler from './components/OfflineStateHandler.vue';
import NotificationSystem from './components/NotificationSystem.vue';

const store = useStore();
const router = useRouter();
// Removed navbarCollapseRef and isNavbarOpen related logic

const isAuthenticated = computed(() => store.getters['user/isAuthenticated']);
// Removed isAdmin computed as it wasn't used in the template provided

// Removed toggleNavbar and closeNavbar methods

const logout = () => { // Removed event param as it's not needed without manual closeNavbar
  // Close navbar is handled automatically by Bootstrap collapse on navigation or can be done manually if needed
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
          if (err.name !== 'NavigationDuplicated' && err.name !== 'NavigationCancelled') { 
               console.error('Router navigation error after logout:', err);
          }
      });
  });
};

// Removed router.afterEach closeNavbar hook
// Removed manual click outside listener logic (onMounted, onUnmounted, handleClickOutside)

onMounted(() => {
  // Initialize offline capabilities
  store.dispatch('app/initOfflineCapabilities');
  // Bootstrap JS handles navbar collapse, no extra listeners needed generally
});

// Removed handleClickOutside method

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
  color: var(--bs-primary) !important; /* Use a darker primary for contrast */
  font-weight: 600; /* Make active item bolder */
}

/* Adjust hover for non-active items */
.nav-link:not(.active):hover {
  color: var(--bs-dark); /* Example: Darker text on hover */
}


/* Main content padding */
.app-main-content {
  /* flex-grow: 1; handled by flex-grow-1 class */
  padding-top: 70px; /* Adjust based on actual navbar height */
  padding-bottom: 70px; /* Adjust based on potential bottom nav height */
}


/* Remove Bulma specific styles if any remained */
</style>
