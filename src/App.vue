// /src/App.vue (Bootstrap styling)
<template>
  <div id="app">
    <nav class="navbar navbar-expand-lg navbar-dark bg-dark">
      <div class="container-fluid">
        <router-link to="/" class="navbar-brand">KSB MCA S/W Community</router-link>
        <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav" aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
          <span class="navbar-toggler-icon"></span>
        </button>
        <div class="collapse navbar-collapse" id="navbarNav">
          <ul class="navbar-nav">
            <li class="nav-item">
              <router-link to="/" class="nav-link">Home</router-link>
            </li>
             <li class="nav-item" v-if="isAuthenticated">
              <router-link to="/profile" class="nav-link">Profile</router-link>
            </li>
            <li class="nav-item">
              <router-link to="/leaderboard" class="nav-link">Leaderboard</router-link>
            </li>
            <li class="nav-item">
              <router-link to="/resources" class="nav-link">Resources</router-link>
            </li>
            <li class="nav-item">
              <router-link to="/transparency" class="nav-link">Transparency</router-link>
            </li>
            <li class="nav-item" v-if="isAuthenticated">
              <router-link to="/portfolio" class="nav-link">My Portfolio</router-link>
            </li>

          </ul>
           <ul class="navbar-nav ms-auto">
              <li class="nav-item" v-if="!isAuthenticated">
                <router-link to="/login" class="nav-link">Login</router-link>
              </li>
               <li class="nav-item" v-if="isAuthenticated">
                  <a href="#" @click.prevent="logout" class="nav-link">Logout</a>
                </li>
            </ul>
        </div>
      </div>
    </nav>
    <div class="container mt-4">
      <router-view />
    </div>
  </div>
</template>

<script>
import { computed } from 'vue';
import { useStore } from 'vuex';

export default {
  setup() {
    const store = useStore();
    const isAuthenticated = computed(() => store.getters.isAuthenticated);

     const logout = () => {
       store.dispatch('clearUserData');
        // Redirect to login or home page
        this.$router.push('/login');
      };

    return {
      isAuthenticated,
      logout
    };
  },
};
</script>