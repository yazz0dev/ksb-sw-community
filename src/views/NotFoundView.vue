<template>
  <div class="not-found-section">
    <div class="container d-flex align-items-center justify-content-center">
    <div class="text-center">
        <h1 class="display-4 text-primary mb-4">404</h1>
        <h2 class="h3 mb-3">Page Not Found</h2>
        <p class="lead mb-4">The page you're looking for doesn't exist.</p>
        <router-link to="/" class="btn btn-primary">
          <i class="fas fa-home me-2"></i>Go Home
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// No script needed for this simple component
</script>

<style scoped>
.not-found-section {
  background: linear-gradient(135deg, var(--bs-light) 0%, var(--bs-primary-bg-subtle) 100%);
  min-height: calc(100vh - var(--navbar-height-mobile));
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem 1rem;
}

@media (min-width: 992px) {
  .not-found-section {
    min-height: calc(100vh - var(--navbar-height-desktop));
  }
}
</style>


