<template>
  <div class="event-details-skeleton-wrapper event-details-bg">
    <div class="container-lg">
      <!-- Skeleton for EventDetailsHeader -->
      <div class="card event-header-skeleton mb-4 animate-fade-in">
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
          <!-- Event Management Controls Skeleton (for organizers) -->
          <div class="card mb-3 mb-md-4">
            <div class="card-body p-4">
              <BaseSkeleton type="text" width="220px" height="1.5rem" class="mb-3" />
              <div class="d-flex flex-wrap gap-2">
                <BaseSkeleton type="text" width="100px" height="36px" :rounded="true" />
                <BaseSkeleton type="text" width="120px" height="36px" :rounded="true" />
                <BaseSkeleton type="text" width="90px" height="36px" :rounded="true" />
              </div>
            </div>
          </div>

          <!-- XP/Criteria Skeleton -->
          <div class="card mb-3 mb-md-4">
            <div class="card-body p-4">
              <BaseSkeleton type="text" width="200px" height="1.75rem" class="mb-4" />
              <div class="row g-3">
                <div v-for="i in 4" :key="`criteria-${i}`" class="col-12 col-md-6">
                  <div class="d-flex align-items-center gap-3 p-3 border rounded-3">
                    <BaseSkeleton type="avatar" size="40px" />
                    <div class="flex-grow-1">
                      <BaseSkeleton type="text" width="80%" height="1rem" class="mb-1" />
                      <BaseSkeleton type="text" width="50%" height="0.875rem" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Teams/Participants Skeleton -->
          <div class="mb-3 mb-md-4">
            <div class="section-header mb-3">
              <BaseSkeleton type="text" width="200px" height="1.5rem" />
            </div>
            <div class="row g-3">
              <div class="col-12 col-lg-6">
                <div class="card team-list-box p-0 shadow-sm">
                  <div class="card-body p-3">
                    <div v-for="i in 6" :key="`participant-${i}`" class="d-flex align-items-center gap-3 mb-3">
                      <BaseSkeleton type="avatar" size="32px" />
                      <div class="flex-grow-1">
                        <BaseSkeleton type="text" width="70%" height="1rem" class="mb-1" />
                        <BaseSkeleton type="text" width="40%" height="0.75rem" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div class="col-12 col-lg-6">
                <div class="card team-list-box p-0 shadow-sm">
                  <div class="card-body p-3">
                    <div v-for="i in 4" :key="`participant-2-${i}`" class="d-flex align-items-center gap-3 mb-3">
                      <BaseSkeleton type="avatar" size="32px" />
                      <div class="flex-grow-1">
                        <BaseSkeleton type="text" width="70%" height="1rem" class="mb-1" />
                        <BaseSkeleton type="text" width="40%" height="0.75rem" />
                      </div>
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
            <div class="card mb-4">
              <div class="card-body p-4">
                <BaseSkeleton type="text" width="150px" height="1.75rem" class="mb-3" />
                <BaseSkeleton type="text" width="100%" height="1rem" class="mb-2" />
                <BaseSkeleton type="text" width="80%" height="1rem" class="mb-3" />
                <BaseSkeleton type="text" width="100%" height="48px" :rounded="true" />
              </div>
            </div>

            <!-- Organizer Rating Skeleton -->
            <div class="card">
              <div class="card-body p-4">
                <BaseSkeleton type="text" width="160px" height="1.75rem" class="mb-3" />
                <BaseSkeleton type="text" width="100%" height="1rem" class="mb-2" />
                <div class="d-flex gap-2 mb-3">
                  <BaseSkeleton v-for="i in 5" :key="`star-${i}`" type="text" width="20px" height="20px" />
                </div>
                <BaseSkeleton type="text" width="100%" height="40px" :rounded="true" />
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

.event-details-bg {
  position: relative;
  z-index: 1;
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

.team-list-box {
  background: var(--bs-white);
  border: 1px solid var(--bs-border-color);
}

.animate-fade-in {
  animation: fadeIn 0.6s ease-out forwards;
  opacity: 0;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>