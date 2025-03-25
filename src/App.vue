<template>
  <div id="app">
    <nav>
      <router-link to="/">Home</router-link> |
        <router-link to="/leaderboard">Leaderboard</router-link> |
        <router-link to="/resources">Resources</router-link> |
         <router-link to="/transparency">Transparency</router-link> |
      <router-link v-if="isAuthenticated" to="/portfolio">My Portfolio</router-link> |
      <router-link v-if="!isAuthenticated" to="/login">Login</router-link>
    </nav>
    <router-view />
  </div>
</template>

<script>
import { computed } from 'vue';
import { useStore } from 'vuex';

export default {
  setup() {
    const store = useStore();
    const isAuthenticated = computed(() => store.getters.isAuthenticated);

    return {
      isAuthenticated,
    };
  },
};
</script>