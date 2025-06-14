<!-- src/skeletons/EventCardSkeleton.vue -->
<template>
  <div
    class="card skeleton-card h-100"
    style="background-color: var(--bs-light); border-radius: var(--bs-border-radius); box-shadow: var(--bs-box-shadow-sm); border: 1px solid var(--bs-border-color); overflow: hidden;"
  >
    <div class="card-body p-3">
      <!-- Placeholder for title -->
      <div class="skeleton-line" style="height: 22px; width: 75%; margin-bottom: 12px;"></div>
      
      <!-- Placeholder for type and format -->
      <div class="d-flex gap-2 mb-2">
        <div class="skeleton-line" style="height: 16px; width: 30%; margin-bottom: 0;"></div>
        <div class="skeleton-line" style="height: 16px; width: 30%; margin-bottom: 0;"></div>
      </div>
      
      <!-- Placeholder for date and organizer -->
      <div class="d-flex justify-content-between mb-2">
        <div class="skeleton-line" style="height: 16px; width: 40%; margin-bottom: 0;"></div>
        <div class="skeleton-line" style="height: 16px; width: 30%; margin-bottom: 0;"></div>
      </div>
      
      <!-- Placeholder for status badge -->
      <div class="mb-2">
        <div class="skeleton-line" style="height: 18px; width: 25%; border-radius: 50px; margin-bottom: 0;"></div>
      </div>
      
      <!-- Placeholder for description -->
      <div class="skeleton-description">
        <div class="skeleton-line" style="height: 14px; width: 100%; margin-bottom: 8px;"></div>
        <div class="skeleton-line" style="height: 14px; width: 90%; margin-bottom: 8px;"></div>
        <div class="skeleton-line" style="height: 14px; width: 95%; margin-bottom: 0;"></div>
      </div>
      
      <!-- Placeholder for button -->
      <div class="mt-3">
        <div class="skeleton-line" style="height: 36px; width: 100%; margin-bottom: 0; border-radius: 6px;"></div>
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
  min-height: 180px; /* Match compact card min-height */
  max-height: 260px; /* Match compact card max-height */
}

.skeleton-line,
.skeleton-circle {
  background-color: var(--bs-secondary-bg);
  border-radius: var(--bs-border-radius-sm);
}

.skeleton-circle {
  border-radius: 50%;
}

.skeleton-description {
  margin: 10px 0 15px 0;
  flex-grow: 1;
}

@media (max-width: 992px) {
  .skeleton-card {
    min-height: 190px; /* Match responsive compact card min-height */
  }
}

@media (max-width: 768px) {
  .skeleton-card {
    min-height: 190px; /* Match responsive compact card min-height */
  }
}

@media (max-width: 576px) {
  .skeleton-card {
    min-height: 230px; /* Match responsive compact card min-height */
  }
}
</style>