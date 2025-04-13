<template>
  <section class="hero is-fullheight-with-navbar">
    <div class="hero-body">
      <div class="container has-text-centered">
        <h1 class="title is-1 has-text-primary mb-4">404</h1>
        <h2 class="subtitle is-3 has-text-dark mb-4">Page Not Found</h2>
        <p class="has-text-grey mb-6">Sorry, we couldn't find the page you're looking for.</p>
        
        <div class="buttons is-centered">
          <router-link to="/" class="button is-primary">
            <span class="icon">
              <i class="fas fa-home"></i>
            </span>
            <span>Go Home</span>
          </router-link>
          <button @click="goBack" class="button is-outlined">
            <span class="icon">
              <i class="fas fa-arrow-left"></i>
            </span>
            <span>Go Back</span>
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { useRouter } from 'vue-router';

const router = useRouter();

const goBack = () => {
  router.go(-1);
};
</script>

<style scoped>
/* Adjust hero height if needed based on actual navbar height */
.hero.is-fullheight-with-navbar {
  min-height: calc(100vh - 3.5rem); /* Adjust 3.5rem based on your navbar height */
}
</style>
