<template>
  <div class="leaderboard-skeleton-wrapper">
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
              <div class="p-3">
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
              <div class="p-3">
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
            <div class="p-3">
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

.section-card {
  background: var(--bs-card-bg);
  border: 1px solid var(--bs-border-color);
  border-radius: var(--bs-border-radius-lg);
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
</style>