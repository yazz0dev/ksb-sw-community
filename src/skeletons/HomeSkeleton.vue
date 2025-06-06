<template>
  <div class="home-skeleton-wrapper">
    <div class="container-lg px-3 px-md-4">
      <!-- Skeleton for Page Header/Welcome Message (if any in HomeView) -->
      <div class="py-3 py-md-4 text-center">
        <BaseSkeleton type="text" width="40%" height="2rem" class="mx-auto mb-3" />
        <BaseSkeleton type="text" width="60%" height="1rem" class="mx-auto" />
      </div>

      <!-- Skeleton for Sections (Upcoming, Active, Completed Events) -->
      <div v-for="section in 3" :key="`section-${section}`" class="section-card-skeleton card mb-4 animate-fade-in">
        <div class="card-header">
          <BaseSkeleton type="text" width="200px" height="1.5rem" />
        </div>
        <div class="card-body">
          <div class="row g-3 g-md-4">
            <div v-for="card in 3" :key="`card-${section}-${card}`" class="col-12 col-md-6 col-lg-4">
              <EventCardSkeleton />
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
  background: linear-gradient(135deg, var(--bs-light) 0%, var(--bs-primary-bg-subtle) 100%);
  min-height: calc(100vh - var(--navbar-height-mobile)); /* Adjust if needed based on actual nav height */
  padding-top: 1rem;
  padding-bottom: 4rem;
}

@media (min-width: 992px) {
  .home-skeleton-wrapper {
    min-height: calc(100vh - var(--navbar-height-desktop));
  }
}

.section-card-skeleton {
  background: var(--bs-card-bg);
  border-radius: var(--bs-border-radius-lg);
  border: 1px solid var(--bs-border-color);
  box-shadow: var(--bs-box-shadow-sm);
  overflow: hidden;
}

.section-card-skeleton .card-header {
  background-color: var(--bs-light); /* or var(--bs-card-cap-bg) */
  border-bottom: 1px solid var(--bs-border-color);
  padding: 1rem 1.5rem;
}

.section-card-skeleton .card-body {
  padding: 1.5rem;
}

.animate-fade-in {
  animation: fadeInSkeleton 0.6s ease-out forwards;
  opacity: 0;
}

@keyframes fadeInSkeleton {
  from { 
    opacity: 0; 
    transform: translateY(15px); 
  }
  to { 
    opacity: 1; 
    transform: translateY(0); 
  }
}

/* Stagger animation for sections */
.section-card-skeleton:nth-child(1) { animation-delay: 0.1s; }
.section-card-skeleton:nth-child(2) { animation-delay: 0.2s; }
.section-card-skeleton:nth-child(3) { animation-delay: 0.3s; }
</style>
