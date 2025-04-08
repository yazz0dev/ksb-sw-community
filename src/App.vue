// /src/App.vue
<template>
  <div id="app" class="flex flex-col min-h-screen bg-background">
    <!-- Offline State Handler -->
    <OfflineStateHandler />
    <!-- Notification System -->
    <NotificationSystem />
    <!-- Top Navigation Bar -->
    <nav class="sticky top-0 z-30 bg-surface shadow-sm flex items-center h-12 lg:h-16 border-b border-border">
      <div class="container mx-auto flex items-center justify-between h-full px-4 sm:px-6 lg:px-8">
        <router-link to="/" class="text-lg lg:text-xl font-bold text-primary mr-4 lg:mr-8 flex items-center h-full whitespace-nowrap" @click="closeNavbar">KSB MCA S/W Community</router-link>

        <button class="lg:hidden border-none bg-transparent p-2 rounded text-text-secondary hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary-light focus:ring-opacity-75" type="button" @click.stop="toggleNavbar" aria-controls="navbarNav" :aria-expanded="isNavbarOpen.toString()" aria-label="Toggle navigation">
          <i class="fas fa-bars text-xl"></i>
        </button>

        <!-- Mobile Menu Container: Kept solid background -->
        <div 
          v-if="isNavbarOpen"
          class="fixed inset-0 bg-black/30 lg:hidden z-20"
          @click.stop="closeNavbar"
          aria-hidden="true"
        ></div>
        
        <div
          :class="[
            'fixed lg:static lg:flex top-12 lg:top-auto left-0 right-0 w-full bg-surface shadow-lg lg:shadow-none lg:w-auto lg:items-center lg:bg-transparent transition-all duration-300 ease-in-out overflow-hidden border-b border-border lg:border-none z-20',
            isNavbarOpen ? 'translate-y-0 opacity-100 h-auto' : '-translate-y-full lg:translate-y-0 opacity-0 lg:opacity-100 h-0 lg:h-auto'
          ]"
          id="navbarNav"
          ref="navbarCollapseRef"
        >
          <!-- Menu navigation -->
          <ul class="flex flex-col lg:flex-row list-none lg:mr-auto px-4 lg:px-0 py-3 lg:py-0 divide-y divide-border lg:divide-y-0">
            <li v-if="isAuthenticated" class="hidden lg:block lg:mr-1">
              <router-link to="/home"
                class="block lg:inline-block px-3 py-3 lg:py-2 rounded-md text-text-secondary hover:text-primary hover:bg-secondary-light transition-colors duration-150"
                :class="{ 'font-semibold text-primary bg-secondary-light': $route.path === '/home' }"
                @click="closeNavbar">Home</router-link>
            </li>
            <li v-if="isAuthenticated && !isAdmin" class="hidden lg:block lg:mr-1">
              <router-link to="/profile"
                class="block lg:inline-block px-3 py-3 lg:py-2 rounded-md text-text-secondary hover:text-primary hover:bg-secondary-light transition-colors duration-150"
                :class="{ 'font-semibold text-primary bg-secondary-light': $route.path === '/profile' }"
                @click="closeNavbar">Profile</router-link>
            </li>
            <li v-if="isAuthenticated" class="hidden lg:block lg:mr-1">
              <router-link
                to="/leaderboard"
                class="block lg:inline-block px-3 py-3 lg:py-2 rounded-md text-text-secondary hover:text-primary hover:bg-secondary-light transition-colors duration-150"
                active-class="font-semibold text-primary bg-secondary-light"
                @click="closeNavbar"
              >Leaderboard</router-link>
            </li>
            <li class="lg:mr-1">
              <router-link
                to="/resources"
                class="block lg:inline-block px-3 py-3 lg:py-2 rounded-md text-text-secondary hover:text-primary hover:bg-secondary-light transition-colors duration-150"
                active-class="font-semibold text-primary bg-secondary-light"
                @click="closeNavbar"
              >Resources</router-link>
            </li>
            <li>
              <router-link
                to="/transparency"
                class="block lg:inline-block px-3 py-3 lg:py-2 rounded-md text-text-secondary hover:text-primary hover:bg-secondary-light transition-colors duration-150"
                active-class="font-semibold text-primary bg-secondary-light"
                @click="closeNavbar"
              >Transparency</router-link>
            </li>
          </ul>

           <!-- Auth Links: Use theme colors -->
           <ul class="flex flex-col lg:flex-row list-none lg:ml-auto px-4 lg:px-0 py-3 lg:py-0 border-t lg:border-none border-border">
              <li v-if="!isAuthenticated">
                <router-link
                  to="/login"
                  class="block lg:inline-block px-3 py-3 lg:py-2 rounded-md text-text-secondary hover:text-primary hover:bg-secondary-light transition-colors duration-150"
                  active-class="font-semibold text-primary bg-secondary-light"
                  @click="closeNavbar"
                >Login</router-link>
              </li>
               <li v-if="isAuthenticated">
                  <a
                    href="#"
                    @click.prevent="logout"
                    class="block lg:inline-block px-3 py-3 lg:py-2 rounded-md text-text-secondary hover:text-error hover:bg-error-light transition-colors duration-150 flex items-center"
                  >
                      <i class="fas fa-sign-out-alt mr-2"></i>Logout
                  </a>
                </li>
            </ul>
        </div>
      </div>
    </nav>

    <!-- Main Content Area -->
    <main class="container mx-auto flex-grow px-4 sm:px-6 lg:px-8 py-6 sm:py-8 pb-16 lg:pb-8">
         <router-view v-slot="{ Component }">
             <!-- Add animate-fade-in class here -->
             <component :is="Component" class="animate-fade-in" />
         </router-view>
    </main>

    <!-- Bottom Navigation -->
    <BottomNav v-if="isAuthenticated" class="lg:hidden" />
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
const navbarCollapseRef = ref(null);
const isNavbarOpen = ref(false);

const isAuthenticated = computed(() => store.getters['user/isAuthenticated']);
const isAdmin = computed(() => store.getters['user/isAdmin']);

const toggleNavbar = (event) => {
  // Prevent event propagation to avoid triggering other click handlers
  if (event) event.stopPropagation();
  isNavbarOpen.value = !isNavbarOpen.value;
};

const closeNavbar = (event) => {
  // Prevent event propagation to avoid triggering other click handlers
  if (event) event.stopPropagation();
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
          if (err.name !== 'NavigationDuplicated') {
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
});

// Initialize offline capabilities when the app mounts
onMounted(() => {
  router.afterEach(() => {
    closeNavbar();
  });
  
  // Initialize offline capabilities
  store.dispatch('app/initOfflineCapabilities');
});

// No specific unmount logic needed for this component in this case
onUnmounted(() => {
});
</script>
