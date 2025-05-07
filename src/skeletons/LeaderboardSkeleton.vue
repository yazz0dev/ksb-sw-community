<template>
  <div class="leaderboard-skeleton">
    <!-- Header with Role Filters -->
    <div class="mb-5">
      <BaseSkeleton type="text" width="250px" height="2.5rem" class="mb-4" />
      <div class="role-filters d-flex gap-2 flex-wrap">
        <BaseSkeleton v-for="i in 5" :key="i" type="text" width="120px" height="2rem" />
      </div>
    </div>

    <!-- Top Performers Grid -->
    <div class="mb-5">
      <div class="row g-4">
        <div v-for="i in 3" :key="i" class="col-md-4">
          <div class="card shadow-sm">
            <div class="card-body p-4">
              <div class="d-flex align-items-center gap-3">
                <div class="position-relative">
                  <BaseSkeleton type="circle" width="64px" height="64px" />
                  <div class="position-absolute top-0 start-0 translate-middle">
                    <BaseSkeleton type="circle" width="24px" height="24px" />
                  </div>
                </div>
                <div class="flex-grow-1">
                  <BaseSkeleton type="text" width="80%" height="1.5rem" class="mb-2" />
                  <BaseSkeleton type="text" width="50%" height="1rem" />
                </div>
              </div>
              <div class="mt-3">
                <BaseSkeleton type="text" width="40%" height="1rem" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Rankings List -->
    <div class="rankings-list">
      <div v-for="i in 5" :key="i" class="ranking-item p-3 border rounded mb-3">
        <div class="d-flex align-items-center gap-3">
          <BaseSkeleton type="text" width="30px" height="1.5rem" />
          <BaseSkeleton type="circle" width="40px" height="40px" />
          <div class="flex-grow-1">
            <BaseSkeleton type="text" width="60%" height="1.25rem" class="mb-2" />
            <BaseSkeleton type="text" width="40%" height="1rem" />
          </div>
          <BaseSkeleton type="text" width="80px" height="1.5rem" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import BaseSkeleton from './BaseSkeleton.vue';
</script>