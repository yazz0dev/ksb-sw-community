<template>
  <div class="profile-skeleton-wrapper">
    <div class="container-lg">
      <div class="row g-4 g-lg-5">
        <!-- Left Column (Sidebar) Skeleton -->
        <div class="col-12 col-lg-4">
          <div class="profile-sidebar-skeleton sticky-lg-top">
            <div class="card p-4">
              <div class="text-center mb-4">
                <BaseSkeleton type="avatar" size="120px" />
              </div>
              <BaseSkeleton type="text" width="60%" height="1.75rem" class="mx-auto mb-2" />
              <BaseSkeleton type="text" width="40%" height="1rem" class="mx-auto mb-4" />
              
              <div class="d-flex justify-content-around mb-4">
                <div v-for="i in 3" :key="`stat-${i}`" class="text-center">
                  <BaseSkeleton type="text" width="40px" height="1.5rem" class="mx-auto mb-1" />
                  <BaseSkeleton type="text" width="70px" height="0.875rem" class="mx-auto" />
                </div>
              </div>
              <BaseSkeleton type="text" width="100%" height="40px" :rounded="true" />
            </div>
          </div>
        </div>

        <!-- Right Column (Main Details) Skeleton -->
        <div class="col-12 col-lg-8">
          <div class="profile-details-skeleton d-flex flex-column gap-4">
            <!-- XP Breakdown Skeleton -->
            <div class="card p-4">
              <BaseSkeleton type="text" width="200px" height="1.5rem" class="mb-4" />
              <div class="row g-3">
                <div v-for="i in 6" :key="`xp-${i}`" class="col-6 col-md-4">
                  <BaseSkeleton type="text" width="90%" height="1rem" class="mb-2" />
                  <BaseSkeleton type="text" width="50%" height="1.25rem" />
                </div>
              </div>
            </div>

            <!-- Event History Skeleton -->
            <div class="card p-4">
              <BaseSkeleton type="text" width="180px" height="1.5rem" class="mb-4" />
              <div class="d-flex flex-column gap-3">
                <div v-for="i in 3" :key="`event-${i}`">
                  <BaseSkeleton type="text" width="80%" height="1rem" />
                  <BaseSkeleton type="text" width="50%" height="0.875rem" class="mt-2" />
                </div>
              </div>
            </div>

            <!-- Projects Skeleton -->
            <div class="card p-4">
              <BaseSkeleton type="text" width="150px" height="1.5rem" class="mb-4" />
              <div class="d-flex flex-column gap-3">
                <div v-for="i in 2" :key="`project-${i}`">
                  <BaseSkeleton type="text" width="70%" height="1.25rem" class="mb-2" />
                  <BaseSkeleton type="text" width="100%" height="3rem" />
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
.profile-skeleton-wrapper {
  padding: 3rem 0;
}
.profile-sidebar-skeleton.sticky-lg-top {
  position: sticky;
  top: 2rem;
  z-index: 10;
}
.card {
  background: rgba(var(--bs-white-rgb), 0.95);
  border-radius: var(--bs-border-radius-lg);
  border: 1px solid rgba(var(--bs-border-color-rgb), 0.5);
}
</style>