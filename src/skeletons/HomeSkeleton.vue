<template>
  <div class="home-skeleton-wrapper">
    <div class="container-lg px-3 px-md-4">
      <div class="row g-3 g-md-4 mb-4">
        <div class="col-12">
          <!-- Header -->
          <div class="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3 mb-4 px-lg-3">
            <BaseSkeleton type="text" width="150px" height="2rem" />
            <BaseSkeleton type="text" width="140px" height="40px" :rounded="true" class="d-none d-md-block" />
          </div>

          <!-- Active Events Section -->
          <div class="section-card shadow-sm rounded-4 p-4 mb-4">
            <div class="d-flex justify-content-between align-items-center mb-4">
              <BaseSkeleton type="text" width="180px" height="1.5rem" />
              <BaseSkeleton type="text" width="80px" height="1rem" />
            </div>
            <div class="row g-3">
              <div v-for="i in 3" :key="`active-${i}`" class="col-md-6 col-lg-4">
                <EventCardSkeleton />
              </div>
            </div>
          </div>

          <!-- Upcoming Events Section -->
          <div class="section-card shadow-sm rounded-4 p-4 mb-4">
            <div class="d-flex justify-content-between align-items-center mb-4">
              <BaseSkeleton type="text" width="200px" height="1.5rem" />
              <BaseSkeleton type="text" width="80px" height="1rem" />
            </div>
            <div class="row g-3">
              <div v-for="i in 6" :key="`upcoming-${i}`" class="col-md-6 col-lg-4">
                <EventCardSkeleton />
              </div>
            </div>
          </div>

          <!-- Completed Events Section -->
          <div class="section-card shadow-sm rounded-4 p-4 mb-4">
            <div class="d-flex justify-content-between align-items-center mb-4">
              <BaseSkeleton type="text" width="190px" height="1.5rem" />
              <BaseSkeleton type="text" width="80px" height="1rem" />
            </div>
            <div class="row g-3">
              <div v-for="i in 3" :key="`completed-${i}`" class="col-md-6 col-lg-4">
                <EventCardSkeleton />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import BaseSkeleton from './BaseSkeleton.vue';
import EventCardSkeleton from './EventCardSkeleton.vue';
</script>

<style scoped>
.home-skeleton-wrapper {
  padding: 2rem 0 4rem 0;
}

.section-card {
  background: var(--bs-white);
  border: 1px solid var(--bs-border-color);
  border-radius: var(--bs-border-radius-lg);
  transition: all 0.3s ease;
}
</style>
