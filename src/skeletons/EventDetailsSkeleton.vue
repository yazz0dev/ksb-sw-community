<template>
  <div class="event-details-skeleton-wrapper">
    <div class="container-lg">
      <!-- Skeleton for EventDetailsHeader -->
      <div class="card event-header-skeleton mb-4">
        <div class="card-body">
          <div class="d-flex flex-column flex-md-row justify-content-between">
            <div class="header-main-content">
              <BaseSkeleton type="text" width="60%" height="2.5rem" class="mb-3" />
              <BaseSkeleton type="text" width="80%" height="1rem" class="mb-2" />
              <BaseSkeleton type="text" width="70%" height="1rem" class="mb-3" />
              <div class="d-flex flex-wrap gap-2">
                <BaseSkeleton type="text" width="80px" height="24px" :rounded="true" />
                <BaseSkeleton type="text" width="120px" height="24px" :rounded="true" />
                <BaseSkeleton type="text" width="100px" height="24px" :rounded="true" />
              </div>
            </div>
            <div class="header-actions mt-3 mt-md-0">
              <BaseSkeleton type="text" width="120px" height="48px" :rounded="true" />
            </div>
          </div>
        </div>
      </div>

      <div class="row g-3 g-md-4 mt-0">
        <!-- Main Content Column -->
        <div class="col-12 col-lg-8">
          <!-- Criteria Skeleton -->
          <div class="card mb-4">
            <div class="card-body p-4">
              <BaseSkeleton type="text" width="200px" height="1.75rem" class="mb-4" />
              <div class="row g-3">
                <div v-for="i in 4" :key="`criteria-${i}`" class="col-12 col-md-6">
                  <div class="d-flex align-items-center gap-3 p-3 border rounded-3">
                    <BaseSkeleton type="avatar" size="40px" />
                    <div class="flex-grow-1">
                      <BaseSkeleton type="text" width="80%" height="1rem" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Participants/Teams Skeleton -->
          <div class="card">
            <div class="card-body p-4">
              <BaseSkeleton type="text" width="250px" height="1.75rem" class="mb-4" />
              <div class="row g-3">
                <div v-for="i in 8" :key="`participant-${i}`" class="col-12 col-md-6">
                   <div class="d-flex align-items-center gap-3 p-2">
                    <BaseSkeleton type="avatar" size="32px" />
                    <div class="flex-grow-1">
                      <BaseSkeleton type="text" width="70%" height="1rem" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Sidebar Column Skeleton -->
        <div class="col-12 col-lg-4">
          <div class="sticky-lg-top" style="top: 80px;">
            <!-- Submissions Skeleton -->
            <div class="card mb-4">
              <div class="card-body p-4">
                <BaseSkeleton type="text" width="180px" height="1.75rem" class="mb-3" />
                <BaseSkeleton type="text" width="100%" height="40px" :rounded="true" class="mb-3" />
                <BaseSkeleton type="text" width="90%" height="1rem" class="mb-2" />
                 <BaseSkeleton type="text" width="70%" height="1rem" />
              </div>
            </div>

            <!-- Voting Skeleton -->
            <div class="card">
               <div class="card-body p-4">
                <BaseSkeleton type="text" width="150px" height="1.75rem" class="mb-3" />
                <BaseSkeleton type="text" width="100%" height="1rem" class="mb-2" />
                <BaseSkeleton type="text" width="80%" height="1rem" class="mb-3" />
                <BaseSkeleton type="text" width="100%" height="48px" :rounded="true" />
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
.event-details-skeleton-wrapper {
  padding-top: 1rem;
  padding-bottom: 4rem;
}
.card {
  background: rgba(var(--bs-white-rgb), 0.95);
  backdrop-filter: blur(20px);
  border-radius: var(--bs-border-radius-lg); 
  border: 1px solid rgba(var(--bs-primary-rgb), 0.08);
  box-shadow: 
    0 4px 20px rgba(var(--bs-dark-rgb), 0.08),
    0 1px 3px rgba(var(--bs-dark-rgb), 0.06);
}
.event-header-skeleton .card-body {
  padding: 2rem;
}
</style>