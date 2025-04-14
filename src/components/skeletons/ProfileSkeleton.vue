<template>
  <div class="profile-skeleton animate-fade-in">
    <!-- Header Section -->
    <div class="mb-5 pb-4 border-bottom d-flex align-items-center gap-4">
      <BaseSkeleton type="circle" width="100px" height="100px" />
      <div class="flex-grow-1">
        <BaseSkeleton type="text" width="200px" height="2rem" class="mb-2" />
        <BaseSkeleton type="text" width="150px" height="1.25rem" />
      </div>
    </div>

    <!-- Stats Grid -->
    <div class="row g-4 mb-5">
      <div v-for="i in 4" :key="i" class="col-md-3">
        <div class="p-4 border rounded bg-light">
          <BaseSkeleton type="text" width="80px" height="1rem" class="mb-3" />
          <BaseSkeleton type="text" width="60px" height="2rem" />
        </div>
      </div>
    </div>

    <!-- Activity Section -->
    <div class="mb-5">
      <BaseSkeleton type="text" width="150px" height="1.5rem" class="mb-4" />
      <div class="row g-4">
        <div v-for="i in 3" :key="i" class="col-md-4">
          <div class="p-4 border rounded">
            <BaseSkeleton type="text" width="80%" height="1.25rem" class="mb-3" />
            <BaseSkeleton type="text" width="60%" height="1rem" class="mb-2" />
            <BaseSkeleton type="text" width="40%" height="1rem" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import BaseSkeleton from '../BaseSkeleton.vue';
</script>
