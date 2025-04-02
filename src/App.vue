// /src/App.vue
<template>
  <div id="app">
    <nav class="navbar navbar-expand-lg"> 
      <div class="container">
        <router-link to="/" class="navbar-brand" @click="closeNavbar">KSB MCA S/W Community</router-link>

        <button class="navbar-toggler" type="button" @click="toggleNavbar" aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
          <span class="navbar-toggler-icon"></span>
        </button>

        <div class="collapse navbar-collapse" id="navbarNav" ref="navbarCollapseRef"> 

          <ul class="navbar-nav me-auto mb-2 mb-lg-0"> 
             <li class="nav-item" v-if="isAuthenticated">
              <router-link to="/home" class="nav-link" active-class="active">Home</router-link>
            </li>
             <li class="nav-item" v-if="isAuthenticated && !isAdmin">
              <router-link to="/profile" class="nav-link" active-class="active">Profile</router-link>
            </li>
            <li class="nav-item" v-if="isAuthenticated">
              <router-link to="/leaderboard" class="nav-link" active-class="active">Leaderboard</router-link>
            </li>
            <li class="nav-item">
              <router-link to="/resources" class="nav-link" active-class="active">Resources</router-link>
            </li>
            <li class="nav-item">
              <router-link to="/transparency" class="nav-link" active-class="active">Transparency</router-link>
            </li>
          </ul>

          
           <ul class="navbar-nav ms-auto"> 
              <li class="nav-item" v-if="!isAuthenticated">
                <router-link to="/login" class="nav-link" active-class="active">Login</router-link>
              </li>
               <li class="nav-item" v-if="isAuthenticated">
                  <a href="#" @click.prevent="logout" class="nav-link logout-link">
                      <i class="fas fa-sign-out-alt me-1"></i>Logout
                  </a>
                </li>
            </ul>
        </div> 
      </div> 
    </nav>

    
    <main class="container main-content py-4"> 
         <router-view v-slot="{ Component }">
             <transition name="fade" mode="out-in">
                 <component :is="Component" />
             </transition>
         </router-view>
    </main>
  </div>
</template>

<script setup> // Using setup script
import { computed, ref, onMounted, onUnmounted } from 'vue';
import { useStore } from 'vuex';
import { useRouter } from 'vue-router';
import { getAuth, signOut } from 'firebase/auth'; // Import signOut
import { Collapse } from 'bootstrap';

const store = useStore();
const router = useRouter();
const navbarCollapseRef = ref(null); // Renamed ref
let collapseInstance = null;

// Computed properties
const isAuthenticated = computed(() => store.getters['user/isAuthenticated']);
const isAdmin = computed(() => store.getters['user/isAdmin']);

// Methods
const toggleNavbar = () => {
  if (collapseInstance) {
    collapseInstance.toggle();
  }
};

const closeNavbar = () => {
  if (collapseInstance && navbarCollapseRef.value?.classList.contains('show')) {
    collapseInstance.hide();
  }
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
      closeNavbar();
  });
};


// Lifecycle Hooks
onMounted(() => {
  if (navbarCollapseRef.value) {
    collapseInstance = new Collapse(navbarCollapseRef.value, { toggle: false });
  }
  // Close navbar on route change
  router.afterEach(() => {
    closeNavbar();
  });
});

onUnmounted(() => {
  // Dispose collapse instance on component unmount
  collapseInstance?.dispose();
});

</script>

<style scoped>
.main-content {
  /* Add some bottom space */
  padding-bottom: var(--space-12);
}

/* Router transition */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Ensure active class matches hover style */
.nav-link.active {
     color: var(--color-primary) !important;
     background-color: var(--color-primary-light);
}
</style>
