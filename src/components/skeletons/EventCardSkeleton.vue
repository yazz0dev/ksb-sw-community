<!-- src/components/EventCardSkeleton.vue -->
<template>
  <div 
    class="card skeleton-card h-100" 
    style="background-color: var(--bs-light); border-radius: var(--bs-border-radius); box-shadow: var(--bs-box-shadow-sm); border: 1px solid var(--bs-border-color); overflow: hidden;"
  >
    <div class="card-body"> 
      <!-- Placeholder for title -->
      <div class="skeleton-line" style="height: 20px; width: 75%;"></div>
      <!-- Placeholder for date -->
      <div class="skeleton-line" style="height: 16px; width: 50%;"></div>
      <!-- Placeholder for type/status -->
      <div class="skeleton-line" style="height: 16px; width: 33%;"></div>
      <!-- Placeholder for participants/teams & icon -->
      <div class="d-flex justify-content-between align-items-center pt-2">
        <div class="skeleton-line" style="height: 16px; width: 25%; margin-bottom: 0;"></div> 
        <div class="skeleton-circle" style="height: 1.5rem; width: 1.5rem;"></div>
      </div>
    </div>
  </div>
</template>


<style scoped>
@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.skeleton-card {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

.skeleton-line,
.skeleton-circle {
  background-color: var(--bs-gray-300); /* Use Bootstrap gray */
  border-radius: var(--bs-border-radius-sm); /* Match Bootstrap border radius */
  margin-bottom: 0.75rem; /* Keep spacing */
}

.skeleton-circle {
  border-radius: 50%;
  margin-bottom: 0; /* Reset margin for the circle in the flex container */
}

/* Bootstrap card-body provides padding */
/* .card-content { ... } */ 
</style>
