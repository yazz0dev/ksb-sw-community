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
      class="navbar navbar-expand-lg navbar-dark bg-primary shadow-sm fixed-top" 
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
                  data-bs-toggle="collapse" data-bs-target="#navbarNav"
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
                  data-bs-toggle="collapse" data-bs-target="#navbarNav"
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
                   data-bs-toggle="collapse" data-bs-target="#navbarNav"
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
                    data-bs-toggle="collapse" data-bs-target="#navbarNav"
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
                    data-bs-toggle="collapse" data-bs-target="#navbarNav"
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
                    data-bs-toggle="collapse" data-bs-target="#navbarNav"
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
                    data-bs-toggle="collapse" data-bs-target="#navbarNav"
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
                       <li>
                          <router-link 
                              v-if="userId"
                              class="dropdown-item"
                              :to="{ name: 'Profile' }"
                              data-bs-toggle="collapse" data-bs-target="#navbarNav" 
                          >
                              <i class="fas fa-user me-2"></i>Profile
                          </router-link>
                       </li>
                       <li><hr class="dropdown-divider"></li>
                       <li>
                          <button 
                             class="dropdown-item" 
                             @click="handleLogout"
                             data-bs-toggle="collapse" data-bs-target="#navbarNav" 
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

    <!-- Main Content Area -->
    <main class="flex-grow-1 py-5 app-main-content"> 
      <div class="container">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </div>
    </main>

    <!-- Bottom Navigation -->
    <BottomNav v-if="isAuthenticated" class="d-flex d-lg-none" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useStore } from 'vuex';
import { useRouter } from 'vue-router';
import { getAuth, signOut } from 'firebase/auth';
import BottomNav from './components/BottomNav.vue';
import OfflineStateHandler from './components/OfflineStateHandler.vue';
import NotificationSystem from './components/NotificationSystem.vue';

const store = useStore();
const router = useRouter();

const isAuthenticated = computed(() => store.getters['user/isAuthenticated']);
const isAdmin = computed(() => store.getters['user/getUserRole'] === 'Admin');
const userName = computed(() => store.state.user.name || 'User');
const userId = computed(() => store.state.user.uid);

const logout = () => {
  const auth = getAuth();
  signOut(auth).then(() => {
  }).catch((error) => {
      console.error("Logout failed:", error);
  }).finally(() => {
      store.dispatch('user/clearUserData');
      router.replace({ name: 'Login' }).catch(err => {
          if (err.name !== 'NavigationDuplicated' && err.name !== 'NavigationCancelled') { 
               console.error('Router navigation error after logout:', err);
          }
      });
  });
};

const handleLogout = async () => {
  const navbar = document.getElementById('navbarNav');
  if (navbar?.classList.contains('show')) {
    const toggler = document.querySelector('.navbar-toggler');
    if (toggler) (toggler as HTMLElement).click(); 
  }
  logout();
};

onMounted(() => {
  store.dispatch('app/initOfflineCapabilities');
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


/* Main content padding */
.app-main-content {
  /* flex-grow: 1; handled by flex-grow-1 class */
  padding-top: 70px; /* Adjust based on actual navbar height */
  padding-bottom: 70px; /* Adjust based on potential bottom nav height */
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Remove Bulma specific styles if any remained */
</style>
