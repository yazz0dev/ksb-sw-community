// /src/App.vue
<template>
  <div id="app" class="flex flex-col min-h-screen">
    <nav class="sticky top-0 z-30 bg-white shadow flex items-center h-16">
      <div class="container mx-auto flex items-center justify-between h-full px-4">
        <router-link to="/" class="text-lg font-semibold text-gray-800 mr-8 flex items-center h-full whitespace-nowrap" @click="closeNavbar">KSB MCA S/W Community</router-link>

        <button class="lg:hidden border-none bg-transparent p-2 rounded text-gray-600 hover:text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50" type="button" @click="toggleNavbar" aria-controls="navbarNav" :aria-expanded="isNavbarOpen.toString()" aria-label="Toggle navigation">
          <i class="fas fa-bars text-xl"></i> <!-- Using Font Awesome for the icon -->
        </button>

        <!-- Mobile Menu (absolute position) vs Desktop Menu (relative position) -->
        <div
          :class="[
            'absolute top-16 left-0 right-0 w-full bg-white shadow-md lg:shadow-none lg:relative lg:top-auto lg:left-auto lg:right-auto lg:flex lg:w-auto lg:items-center lg:bg-transparent transition-all duration-300 ease-in-out',
            isNavbarOpen ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0 lg:opacity-100 lg:max-h-full overflow-hidden lg:overflow-visible'
          ]"
          id="navbarNav"
          ref="navbarCollapseRef"
        >
          <!-- Navigation Links -->
          <ul class="flex flex-col lg:flex-row list-none lg:mr-auto px-4 lg:px-0 py-2 lg:py-0">
             <li v-if="isAuthenticated">
              <router-link to="/home" class="nav-link" active-class="active" @click="closeNavbar">Home</router-link>
            </li>
             <li v-if="isAuthenticated && !isAdmin">
              <router-link to="/profile" class="nav-link" active-class="active" @click="closeNavbar">Profile</router-link>
            </li>
            <li v-if="isAuthenticated">
              <router-link to="/leaderboard" class="nav-link" active-class="active" @click="closeNavbar">Leaderboard</router-link>
            </li>
            <li>
              <router-link to="/resources" class="nav-link" active-class="active" @click="closeNavbar">Resources</router-link>
            </li>
            <li>
              <router-link to="/transparency" class="nav-link" active-class="active" @click="closeNavbar">Transparency</router-link>
            </li>
          </ul>

          <!-- Auth Links -->
           <ul class="flex flex-col lg:flex-row list-none lg:ml-auto px-4 lg:px-0 py-2 lg:py-0 border-t lg:border-none border-gray-200">
              <li v-if="!isAuthenticated">
                <router-link to="/login" class="nav-link" active-class="active" @click="closeNavbar">Login</router-link>
              </li>
               <li v-if="isAuthenticated">
                  <a href="#" @click.prevent="logout" class="nav-link logout-link flex items-center">
                      <i class="fas fa-sign-out-alt mr-1"></i>Logout
                  </a>
                </li>
            </ul>
        </div>
      </div>
    </nav>


    <main class="container mx-auto flex-grow px-4 py-4"> <!-- Use flex-grow to push footer down -->
         <router-view v-slot="{ Component }">
             <transition name="fade" mode="out-in">
                 <component :is="Component" />
             </transition>
         </router-view>
    </main>

    <!-- Keep BottomNav, hide on large screens using Tailwind class -->
    <BottomNav v-if="isAuthenticated" class="lg:hidden" />
  </div>
</template>

<script setup> // Using setup script
import { computed, ref, onMounted, onUnmounted } from 'vue';
import { useStore } from 'vuex';
import { useRouter } from 'vue-router';
import { getAuth, signOut } from 'firebase/auth'; // Import signOut
// import { Collapse } from 'bootstrap'; // REMOVED
import BottomNav from './components/BottomNav.vue'; // Import BottomNav

const store = useStore();
const router = useRouter();
const navbarCollapseRef = ref(null); // Keep ref if needed for other logic, maybe not
const isNavbarOpen = ref(false); // State for mobile navbar toggle

// Computed properties
const isAuthenticated = computed(() => store.getters['user/isAuthenticated']);
const isAdmin = computed(() => store.getters['user/isAdmin']);

// Methods
const toggleNavbar = () => {
  isNavbarOpen.value = !isNavbarOpen.value;
};

const closeNavbar = () => {
  isNavbarOpen.value = false;
};

const logout = () => {
  const auth = getAuth();
  signOut(auth).then(() => { // Use signOut
    // Actions dispatched below handle state clearing
  }).catch((error) => {
      console.error("Logout failed:", error);
      // Still attempt to clear local state even if Firebase signout fails
  }).finally(() => {
      // Always clear local state and redirect
      store.dispatch('user/clearUserData'); // Ensure local state is cleared
      router.replace({ name: 'Login' }); // Use replace to prevent back button to authenticated state
      closeNavbar(); // Close navbar after logout
  });
};


// Lifecycle Hooks
onMounted(() => {
  // Close navbar on route change
  router.afterEach(() => {
    closeNavbar();
  });
});

onUnmounted(() => {
 // Cleanup if needed
});

</script>

<style scoped>
/* Keep transition styles */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Base nav-link styles - apply common styles here or directly with Tailwind */
.nav-link {
  @apply block lg:inline-block px-3 py-2 rounded-md text-gray-600 hover:text-blue-600 hover:bg-blue-50 transition-colors duration-150;
}
.logout-link {
   @apply block lg:inline-block px-3 py-2 rounded-md text-gray-600 hover:text-red-600 hover:bg-red-50 transition-colors duration-150;
}

/* Active link style */
.nav-link.active {
     @apply font-semibold text-blue-600 bg-blue-100;
}
.logout-link.active { /* Might not be needed if logout isn't a route */
     @apply font-semibold text-red-600 bg-red-100;
}

/* Remove mobile padding styles, handled by layout */
</style>
