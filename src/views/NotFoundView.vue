<template>
  <div class="container d-flex align-items-center justify-content-center" style="min-height: calc(100vh - 70px);">
    <div class="text-center">
      <h1 class="display-1 text-primary mb-4">404</h1>
      <h2 class="h3 text-dark mb-4">Page Not Found</h2>
      <p class="text-secondary mb-5">Sorry, we couldn't find the page you're looking for.</p>
      
      <div class="d-flex justify-content-center gap-2">
        <router-link to="/" class="btn btn-primary d-inline-flex align-items-center">
          <i class="fas fa-home me-2"></i>
          <span>Go Home</span>
        </router-link>
        <button type="button" @click="goBack" class="btn btn-outline-secondary d-inline-flex align-items-center">
          <i class="fas fa-arrow-left me-2"></i>
          <span>Go Back</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router';

const router = useRouter();

const goBack = () => {
  router.go(-1);
};
</script>

<style scoped>
/* No component-specific styles needed now */
</style>
