// /src/App.vue
<template>
  <div id="app">
    <nav class="navbar navbar-expand-lg"> 
      <div class="container">
        <router-link to="/" class="navbar-brand" @click="closeNavbar">KSB MCA S/W Community</router-link>
        <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav" aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
          <span class="navbar-toggler-icon"></span>
        </button>
        <div class="collapse navbar-collapse" id="navbarNav" ref="navbarCollapse">
         
          <ul class="navbar-nav main-nav">

             <li class="nav-item" v-if="isAuthenticated">
              <router-link to="/home" class="nav-link">Home</router-link>
            </li>
             <li class="nav-item" v-if="isAuthenticated && !isAdmin">
              <router-link to="/profile" class="nav-link">Profile</router-link>
            </li>
            <li class="nav-item" v-if="isAuthenticated">
              <router-link to="/leaderboard" class="nav-link">Leaderboard</router-link>
            </li>
            <li class="nav-item">
              <router-link to="/resources" class="nav-link">Resources</router-link>
            </li>
            <li class="nav-item">
              <router-link to="/transparency" class="nav-link">Transparency</router-link>
            </li>
            
          </ul>


           <ul class="navbar-nav auth-nav">

              <li class="nav-item" v-if="!isAuthenticated">
                <router-link to="/login" class="nav-link">Login</router-link>
              </li>
               <li class="nav-item" v-if="isAuthenticated">
                  
                  <a href="#" @click.prevent="logout" class="nav-link logout-link">Logout</a>
                </li>
            </ul>
        </div>
      </div>
    </nav>

    <main class="container main-content mt-4">
      <router-view />
    </main>
  </div>
</template>

<script>
import { computed, ref, onMounted, onUnmounted } from 'vue';
import { useStore } from 'vuex';
import { useRouter } from 'vue-router';
import { getAuth } from 'firebase/auth';
import { Collapse } from 'bootstrap';

export default {
  setup() {
    const store = useStore();
    const router = useRouter();
    const navbarCollapse = ref(null);
    let collapseInstance = null;

    onMounted(() => {
      // Initialize collapse instance
      if (navbarCollapse.value) {
        collapseInstance = new Collapse(navbarCollapse.value, {
          toggle: false
        });

        // Add click event listener to close navbar when clicking outside
        document.addEventListener('click', closeNavbarOnClickOutside);
      }

      // Add route change handler to close navbar
      router.afterEach(() => {
        closeNavbar();
      });
    });

    onUnmounted(() => {
      document.removeEventListener('click', closeNavbarOnClickOutside);
    });

    const closeNavbarOnClickOutside = (event) => {
      if (navbarCollapse.value && !navbarCollapse.value.contains(event.target) 
          && !event.target.closest('.navbar-toggler')) {
        closeNavbar();
      }
    };

    const closeNavbar = () => {
      if (collapseInstance && window.innerWidth < 992) { // 992px is Bootstrap's lg breakpoint
        collapseInstance.hide();
      }
    };

    const isAuthenticated = computed(() => store.getters['user/isAuthenticated']);
    const isAdmin = computed(() => store.getters['user/getUserRole'] === 'Admin');

    const logout = () => {
      const auth = getAuth();
      auth.signOut().then(() => {
        store.dispatch('user/clearUserData');
        router.replace('/login');
        closeNavbar(); // Close navbar after logout
      });
    };

    return {
      isAuthenticated,
      isAdmin,
      logout,
      navbarCollapse,
      closeNavbar
    };
  },
};
</script>

<style scoped> 
.main-content {
  /* padding-top removed as navbar is sticky, not fixed */
  /* Add some bottom space */
  padding-bottom: var(--space-12);
}

/* Optional: Add a subtle transition for router-view changes */
.router-view-enter-active,
.router-view-leave-active {
  transition: opacity 0.2s ease;
}
.router-view-enter-from,
.router-view-leave-to {
  opacity: 0;
}
</style>