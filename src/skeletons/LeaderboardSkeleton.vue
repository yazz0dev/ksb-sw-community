<template>
  <div class="leaderboard-skeleton-wrapper">
    <div class="container-lg">
      <!-- Header -->
      <div class="text-center mb-4 mb-md-5">
        <BaseSkeleton type="text" width="300px" height="2.5rem" class="mx-auto mb-2" />
        <BaseSkeleton type="text" width="400px" height="1.25rem" class="mx-auto" />
      </div>

      <!-- Role Filters -->
      <div class="card p-3 p-md-4 mb-4 mb-md-5">
        <div class="role-filter-grid">
          <BaseSkeleton v-for="i in 6" :key="`filter-${i}`" type="text" height="32px" width="100px" :rounded="true" />
        </div>
      </div>

      <!-- Podium Skeleton (Desktop) -->
      <div class="top-three-container d-none d-md-block mb-5">
        <div class="podium-row d-flex justify-content-center align-items-end gap-4">
          <!-- 2nd Place -->
          <div class="podium-item">
            <BaseSkeleton type="avatar" size="80px" class="mx-auto mb-2" />
            <BaseSkeleton type="text" width="100px" height="1.25rem" class="mx-auto mb-1" />
            <BaseSkeleton type="text" width="60px" height="1rem" class="mx-auto" />
          </div>
          <!-- 1st Place -->
          <div class="podium-item podium-first-skeleton">
            <BaseSkeleton type="avatar" size="100px" class="mx-auto mb-2" />
            <BaseSkeleton type="text" width="120px" height="1.5rem" class="mx-auto mb-1" />
            <BaseSkeleton type="text" width="80px" height="1.25rem" class="mx-auto" />
          </div>
          <!-- 3rd Place -->
          <div class="podium-item">
            <BaseSkeleton type="avatar" size="80px" class="mx-auto mb-2" />
            <BaseSkeleton type="text" width="100px" height="1.25rem" class="mx-auto mb-1" />
            <BaseSkeleton type="text" width="60px" height="1rem" class="mx-auto" />
          </div>
        </div>
      </div>

      <!-- Top 3 Mobile Skeleton -->
      <div class="d-md-none mb-4">
        <BaseSkeleton type="text" width="80px" height="1.5rem" class="mx-auto mb-3" />
        <div class="row g-3">
          <div v-for="i in 3" :key="`mobile-top-${i}`" class="col-12">
            <div class="card">
              <div class="card-body p-3">
                <div class="d-flex align-items-center gap-3">
                  <BaseSkeleton type="text" width="24px" height="1.5rem" />
                  <BaseSkeleton type="avatar" size="40px" />
                  <div class="flex-grow-1">
                    <BaseSkeleton type="text" width="60%" height="1.25rem" class="mb-2" />
                    <BaseSkeleton type="text" width="40%" height="1rem" />
                  </div>
                  <BaseSkeleton type="text" width="80px" height="1.5rem" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Rankings List Skeleton -->
       <div class="row">
        <div class="col-md-6" v-for="i in 6" :key="`rank-${i}`">
          <div class="leaderboard-row-card mb-3 card">
            <div class="card-body p-3">
               <div class="d-flex align-items-center gap-3">
                <BaseSkeleton type="text" width="24px" height="1.5rem" />
                <BaseSkeleton type="avatar" size="40px" />
                <div class="flex-grow-1">
                  <BaseSkeleton type="text" width="60%" height="1.25rem" class="mb-2" />
                  <BaseSkeleton type="text" width="40%" height="1rem" />
                </div>
                <BaseSkeleton type="text" width="80px" height="1.5rem" />
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
</script>

<style scoped>
.leaderboard-skeleton-wrapper {
  padding: 2rem 0;
}
.card {
  background-color: var(--bs-card-bg);
  border: 1px solid var(--bs-border-color);
  border-radius: var(--bs-border-radius-lg); /* Added for consistency */
}
.role-filter-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
  margin: 0 auto;
  max-width: 100%;
}

@media (min-width: 576px) {
  .role-filter-grid {
    grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
    max-width: 480px;
    gap: 0.75rem;
  }
}

@media (min-width: 768px) {
  .role-filter-grid {
    grid-template-columns: repeat(6, 1fr);
    max-width: 600px;
    gap: 0.75rem;
  }
}

@media (min-width: 992px) {
  .role-filter-grid {
    max-width: 700px;
    gap: 1rem;
  }
}
.podium-item {
  text-align: center;
  padding: 1rem;
  border-radius: var(--bs-border-radius-lg);
  background-color: var(--bs-light);
  width: 200px;
}
.podium-first-skeleton {
  padding-bottom: 2rem; /* Taller */
}
.leaderboard-row-card {
  border: 1px solid var(--bs-border-color);
}
</style>