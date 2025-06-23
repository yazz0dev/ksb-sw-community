<template>
  <div class="not-found-section">
    <div class="container d-flex align-items-center justify-content-center">
      <div class="text-center not-found-content animate-fade-in">
        <h1 class="text-display text-gradient-primary mb-4">404</h1>
        <h2 class="h3 mb-3">Page Not Found</h2>
        <p class="lead mb-4">The page you're looking for doesn't exist.</p>
        <router-link to="/" class="btn btn-primary btn-lg">
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
  position: relative;
  overflow: hidden;
}

.not-found-content {
  background: var(--bs-card-bg);
  border-radius: var(--bs-border-radius-lg);
  border: 1px solid var(--bs-border-color);
  box-shadow: var(--bs-box-shadow);
  padding: 3rem 2rem;
  max-width: 500px;
  width: 100%;
  position: relative;
  z-index: 1;
}

.text-gradient-primary {
  background: linear-gradient(45deg, var(--bs-primary) 0%, var(--bs-info) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.animate-fade-in {
  /* Uses global keyframe 'slideInUp' which matches the local 'fadeInContent' */
  animation: slideInUp 0.8s ease-out forwards;
}

/* Local @keyframes fadeInContent removed. */

@media (min-width: 768px) {
  .not-found-content {
    padding: 4rem 3rem;
  }
}

@media (min-width: 992px) {
  .not-found-section {
    min-height: calc(100vh - var(--navbar-height-desktop));
  }
}
</style>


