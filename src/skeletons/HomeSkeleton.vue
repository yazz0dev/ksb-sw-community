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
              <BaseSkeleton type="text" width="100px" height="1rem" />
            </div>
            <div class="horizontal-skeleton-container">
              <div class="horizontal-skeleton-content">
                <div v-for="i in 3" :key="`active-${i}`" class="skeleton-card-wrapper">
                  <EventCardSkeleton />
                </div>
              </div>
            </div>
          </div>

          <!-- Upcoming Events Section -->
          <div class="section-card shadow-sm rounded-4 p-4 mb-4">
            <div class="d-flex justify-content-between align-items-center mb-4">
              <BaseSkeleton type="text" width="200px" height="1.5rem" />
              <BaseSkeleton type="text" width="100px" height="1rem" />
            </div>
            <div class="horizontal-skeleton-container">
              <div class="horizontal-skeleton-content">
                <div v-for="i in 6" :key="`upcoming-${i}`" class="skeleton-card-wrapper">
                  <EventCardSkeleton />
                </div>
              </div>
            </div>
          </div>

          <!-- Completed Events Section -->
          <div class="section-card shadow-sm rounded-4 p-4 mb-4">
            <div class="d-flex justify-content-between align-items-center mb-4">
              <BaseSkeleton type="text" width="190px" height="1.5rem" />
              <BaseSkeleton type="text" width="100px" height="1rem" />
            </div>
            <div class="horizontal-skeleton-container">
              <div class="horizontal-skeleton-content">
                <div v-for="i in 3" :key="`completed-${i}`" class="skeleton-card-wrapper">
                  <EventCardSkeleton />
                </div>
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

.horizontal-skeleton-container {
  overflow-x: auto;
  overflow-y: hidden;
  margin: -0.5rem;
  padding: 0.5rem;
  scrollbar-width: none;
  -ms-overflow-style: none;
  scroll-behavior: smooth;
  -webkit-overflow-scrolling: touch;
}

.horizontal-skeleton-container::-webkit-scrollbar {
  display: none;
}

.horizontal-skeleton-content {
  display: flex;
  gap: 1rem;
  padding-bottom: 0.5rem;
  min-width: min-content;
}

.skeleton-card-wrapper {
  flex: 0 0 320px;
  max-width: 320px;
  width: 320px;
}

/* Responsive breakpoints matching HomeView */
@media (max-width: 1200px) {
  .skeleton-card-wrapper {
    flex: 0 0 300px;
    max-width: 300px;
    width: 300px;
  }
}

@media (max-width: 992px) {
  .skeleton-card-wrapper {
    flex: 0 0 280px;
    max-width: 280px;
    width: 280px;
  }
  
  .horizontal-skeleton-content {
    gap: 0.875rem;
  }
}

@media (max-width: 768px) {
  .skeleton-card-wrapper {
    flex: 0 0 260px;
    max-width: 260px;
    width: 260px;
  }
  
  .horizontal-skeleton-content {
    gap: 0.75rem;
  }
  
  .home-skeleton-wrapper {
    padding: 1rem 0 3rem 0;
  }
}

@media (max-width: 576px) {
  .skeleton-card-wrapper {
    flex: 0 0 280px;
    max-width: 280px;
    width: 280px;
  }
  
  .horizontal-skeleton-content {
    gap: 0.75rem;
    padding-left: 0.25rem;
    padding-right: 0.25rem;
  }
  
  .horizontal-skeleton-container {
    margin: -0.25rem;
    padding: 0.25rem;
  }
}

@media (max-width: 480px) {
  .skeleton-card-wrapper {
    flex: 0 0 260px;
    max-width: 260px;
    width: 260px;
  }
  
  .horizontal-skeleton-content {
    gap: 0.5rem;
  }
}

@media (max-width: 400px) {
  .skeleton-card-wrapper {
    flex: 0 0 240px;
    max-width: 240px;
    width: 240px;
  }
}
</style>
