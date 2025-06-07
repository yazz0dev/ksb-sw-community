<template>
  <section class="events-list-skeleton-wrapper">
    <div class="container-lg">
      <!-- Header with filtering -->
      <div class="mb-5">
        <div class="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
          <!-- Left side - Title -->
          <div>
            <BaseSkeleton type="text" width="120px" height="2rem" class="mb-0" />
          </div>
          <!-- Right side - Filter buttons -->
          <div class="ms-md-auto">
            <div class="btn-group btn-group-sm" role="group">
              <BaseSkeleton 
                v-for="i in 3" 
                :key="`filter-${i}`" 
                type="text" 
                width="80px" 
                height="32px" 
                :rounded="true" 
                class="me-1"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Section Title -->
      <div class="mb-4">
        <BaseSkeleton type="text" width="180px" height="1.5rem" />
      </div>

      <!-- Events Grid -->
      <div class="row g-4">
        <div 
          v-for="i in 6" 
          :key="`event-${i}`" 
          class="col-md-6 col-lg-4"
        >
          <EventCardSkeleton />
        </div>
      </div>

      <!-- Additional Section (for multiple sections) -->
      <div class="mt-5">
        <hr class="my-5" style="border-color: var(--bs-border-color-translucent);">
        <div class="mb-4">
          <BaseSkeleton type="text" width="160px" height="1.5rem" />
        </div>
        
        <!-- Additional Events Grid -->
        <div class="row g-4">
          <div 
            v-for="i in 3" 
            :key="`additional-event-${i}`" 
            class="col-md-6 col-lg-4"
          >
            <EventCardSkeleton />
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import BaseSkeleton from './BaseSkeleton.vue';
import EventCardSkeleton from './EventCardSkeleton.vue';
</script>

<style scoped>
.events-list-skeleton-wrapper {
  background: linear-gradient(135deg, var(--bs-light) 0%, var(--bs-primary-bg-subtle) 100%);
  min-height: calc(100vh - var(--navbar-height-mobile));
  padding: 2rem 0 4rem 0;
}

@media (min-width: 992px) {
  .events-list-skeleton-wrapper {
    min-height: calc(100vh - var(--navbar-height-desktop));
  }
}

.btn-group {
  display: flex;
  gap: 0.25rem;
}

hr {
  opacity: 0.3;
}
</style> 