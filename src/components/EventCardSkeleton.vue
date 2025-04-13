<!-- src/components/EventCardSkeleton.vue -->
<template>
  <div 
    class="card skeleton-card"
    style="background-color: var(--color-surface); border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06); border: 1px solid var(--color-border); overflow: hidden;"
  >
    <div class="card-content">
      <div class="content">
        <!-- Placeholder for title -->
        <div class="skeleton-line" style="height: 20px; width: 75%;"></div>
        <!-- Placeholder for date -->
        <div class="skeleton-line" style="height: 16px; width: 50%;"></div>
        <!-- Placeholder for type/status -->
        <div class="skeleton-line" style="height: 16px; width: 33%;"></div>
        <!-- Placeholder for participants/teams & icon -->
        <div class="is-flex is-justify-content-space-between is-align-items-center pt-2">
          <div class="skeleton-line" style="height: 16px; width: 25%;"></div>
          <div class="skeleton-circle" style="height: 1.5rem; width: 1.5rem;"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
// Removed Chakra UI imports
// No script logic needed for a simple skeleton
</script>

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
  background-color: #e0e0e0; /* Or use a CSS variable */
  border-radius: 4px; /* Match Chakra's borderRadius='md' */
  margin-bottom: 0.75rem; /* Approximate spacing */
}

.skeleton-circle {
  border-radius: 50%;
  margin-bottom: 0; /* Reset margin for the circle in the flex container */
}

/* Remove default card content spacing if needed */
.card-content {
  padding: 1rem; /* Adjust as needed */
}
</style>
