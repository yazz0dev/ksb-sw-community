<!-- src/skeletons/EventCardSkeleton.vue -->
<template>
  <div
    class="card skeleton-card h-100"
    style="
      background-color: var(--bs-light);
      border-radius: var(--bs-border-radius);
      border: 1px solid var(--bs-border-color);
      overflow: hidden;
      min-height: 14.375rem; /* Match EventCard--full min-height */
    "
  >
    <div class="card-body p-3 d-flex flex-column">
      <!-- Header Row: Title and Status Badge -->
      <div class="d-flex justify-content-between align-items-start mb-2">
        <div class="flex-grow-1 me-2">
          <BaseSkeleton type="text" width="80%" height="1.1rem" class="mb-1" />
          <BaseSkeleton type="text" width="50%" height="1.1rem" />
        </div>
        <BaseSkeleton type="text" width="60px" height="20px" :rounded="true" />
      </div>

      <!-- Event Type & Format Row -->
      <div class="d-flex align-items-center flex-wrap gap-2 small text-muted mb-2">
        <BaseSkeleton type="text" width="40px" height="14px" />
        <BaseSkeleton type="text" width="50px" height="14px" />
      </div>

      <!-- Date and Organizer Row -->
      <div class="d-flex justify-content-between align-items-center mb-2 small">
        <BaseSkeleton type="text" width="40%" height="14px" />
        <BaseSkeleton type="text" width="35%" height="14px" />
      </div>

      <!-- Description -->
      <div class="card-text small text-secondary mb-3 flex-grow-1">
        <BaseSkeleton type="text" width="100%" height="12px" class="mb-1" />
        <BaseSkeleton type="text" width="100%" height="12px" class="mb-1" />
        <BaseSkeleton type="text" width="75%" height="12px" />
      </div>

      <!-- Footer: Action Button -->
      <div class="mt-auto">
        <BaseSkeleton type="text" width="100%" height="32px" border-radius="var(--bs-border-radius)" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import BaseSkeleton from './BaseSkeleton.vue';
</script>

<style scoped>
/* The skeleton-card has a pulse animation in the global file now */
/* No local styles needed */
.skeleton-card {
  animation: pulse-subtle 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
</style>