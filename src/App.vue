// /src/App.vue
<template>
  <div id="app">
    <nav class="navbar navbar-expand-lg"> 
      <div class="container">
        <router-link to="/" class="navbar-brand">KSB MCA S/W Community</router-link>
        <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav" aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
          <span class="navbar-toggler-icon"></span>
        </button>
        <div class="collapse navbar-collapse" id="navbarNav">

         
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
import { computed } from 'vue';
import { useStore } from 'vuex';
import { useRouter } from 'vue-router';
import {getAuth} from 'firebase/auth';

export default {
  setup() {
    const store = useStore();
    const isAuthenticated = computed(() => store.getters['user/isAuthenticated']);
    const isAdmin = computed(() => store.getters['user/getUserRole'] === 'Admin');
    const router = useRouter();

     const logout = () => {
       const auth = getAuth();
        auth.signOut().then(()=>{
            store.dispatch('user/clearUserData');
            router.replace('/login'); // Changed to replace instead of push
        })
      };

    return {
      isAuthenticated,
      isAdmin,
      logout
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