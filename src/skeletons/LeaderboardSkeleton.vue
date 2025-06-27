<template>
  <div class="leaderboard-skeleton-wrapper">
    <div class="container-lg px-3 px-md-4">
      <!-- Page Header -->
      <div class="text-center mb-4 mb-md-5">
        <BaseSkeleton type="text" width="300px" height="2.5rem" class="mx-auto mb-2" />
        <BaseSkeleton type="text" width="400px" height="1.25rem" class="mx-auto" />
      </div>

      <!-- Role Filter Section -->
      <div class="section-card shadow-sm rounded-4 p-3 p-md-4 mb-4">
        <BaseSkeleton type="text" width="150px" height="1.5rem" class="mx-auto mb-3" />
        <div class="role-filter-grid">
          <BaseSkeleton v-for="i in 6" :key="`filter-${i}`" type="text" height="32px" width="100px" :rounded="true" />
        </div>
      </div>

      <!-- Leaderboard Content Card -->
      <div class="section-card shadow-sm rounded-4 p-3 p-md-4">
        <!-- Stats Header -->
        <div class="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-4 gap-2">
          <BaseSkeleton type="text" width="200px" height="1.5rem" />
          <BaseSkeleton type="text" width="80px" height="1.25rem" :rounded="true" />
        </div>

        <!-- Top 3 Desktop -->
        <div class="d-none d-md-block mb-5">
          <BaseSkeleton type="text" width="80px" height="1.25rem" class="mx-auto mb-3" />
          <div class="row g-3">
            <div v-for="i in 3" :key="`desktop-top-${i}`" class="col-md-4">
              <div class="top-desktop-card">
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

        <!-- Top 3 Mobile -->
        <div class="d-md-none mb-4">
          <BaseSkeleton type="text" width="80px" height="1.25rem" class="mx-auto mb-3" />
          <div class="row g-3">
            <div v-for="i in 3" :key="`mobile-top-${i}`" class="col-12">
              <div class="top-mobile-card">
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

        <!-- Rankings Section Header -->
        <BaseSkeleton type="text" width="100px" height="1.25rem" class="mb-3 mx-auto mx-md-0" />

        <!-- Rankings List - Two Column Layout -->
        <div class="row">
          <div class="col-12 col-md-6" v-for="i in 8" :key="`rank-${i}`">
            <div class="leaderboard-row-card mb-3">
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
  </div>
</template>

<script setup lang="ts">
import BaseSkeleton from './BaseSkeleton.vue';
</script>

<style scoped>
.leaderboard-skeleton-wrapper {
  background: linear-gradient(135deg, var(--bs-light) 0%, var(--bs-primary-bg-subtle) 100%);
  min-height: calc(100vh - var(--navbar-height-mobile));
  padding: 2rem 0 4rem 0;
}

@media (min-width: 992px) {
  .leaderboard-skeleton-wrapper {
    min-height: calc(100vh - var(--navbar-height-desktop));
  }
}

.section-card {
  background: var(--bs-card-bg);
  border: 1px solid var(--bs-border-color);
  border-radius: var(--bs-border-radius-lg);
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

.top-desktop-card {
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.05), rgba(255, 255, 255, 0.95));
  border: 2px solid rgba(255, 215, 0, 0.2);
  border-radius: var(--bs-border-radius-lg);
  height: 100%;
}

.top-mobile-card {
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.05), rgba(255, 255, 255, 0.95));
  border: 2px solid rgba(255, 215, 0, 0.2);
  border-radius: var(--bs-border-radius-lg);
}

.leaderboard-row-card {
  background: var(--bs-white);
  border: 1px solid var(--bs-border-color);
  border-radius: var(--bs-border-radius-lg);
}

.card-body {
  padding: 1rem;
}
</style>