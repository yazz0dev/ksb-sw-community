<template>
  <div class="flex flex-col items-center justify-center min-h-[calc(100vh-8rem)] px-4 py-16 bg-background">
    <div class="text-center max-w-md">
      <h1 class="text-9xl font-bold text-primary mb-4">404</h1>
      <h2 class="text-2xl font-semibold text-text-primary mb-4">Page Not Found</h2>
      <p class="text-text-secondary mb-8">Sorry, we couldn't find the page you're looking for.</p>
      <div class="flex flex-col sm:flex-row gap-4 justify-center">
        <router-link 
          to="/" 
          class="inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-primary-text bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors">
          <i class="fas fa-home mr-2"></i> Go Home
        </router-link>
        <button 
          @click="$router.go(-1)" 
          class="inline-flex items-center justify-center px-5 py-3 border border-border text-base font-medium rounded-md text-text-secondary bg-surface hover:bg-neutral-light focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-light transition-colors">
          <i class="fas fa-arrow-left mr-2"></i> Go Back
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
// No additional script needed
</script>
