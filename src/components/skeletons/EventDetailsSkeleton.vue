<template>
  <div class="event-details-skeleton">
    <div class="row g-4">
      <!-- Left Column -->
      <div class="col-lg-5">
        <div class="card shadow-sm p-4">
          <BaseSkeleton type="text" width="70%" height="2rem" class="mb-3" />
          <BaseSkeleton type="text" width="40%" height="1.25rem" class="mb-4" />
          <div class="d-flex gap-2 mb-3">
            <BaseSkeleton type="text" width="100px" height="1rem" />
            <BaseSkeleton type="text" width="120px" height="1rem" />
          </div>
          <BaseSkeleton type="text" width="90%" height="4rem" />
        </div>
      </div>
      
      <!-- Right Column -->
      <div class="col-lg-7">
        <div class="card shadow-sm p-4 mb-4">
          <BaseSkeleton type="text" width="200px" height="1.5rem" class="mb-4" />
          <div class="row g-3">
            <div v-for="i in 3" :key="i" class="col-md-6">
              <BaseSkeleton type="text" width="90%" height="3rem" />
            </div>
          </div>
        </div>
        
        <div class="card shadow-sm p-4">
          <BaseSkeleton type="text" width="150px" height="1.5rem" class="mb-4" />
          <div class="d-flex flex-column gap-3">
            <BaseSkeleton v-for="i in 2" :key="i" type="text" width="100%" height="2rem" />
          </div>
        </div>
        
        <!-- Add Ratings Section -->
        <div class="card shadow-sm p-4 mt-4">
          <div class="d-flex justify-content-between align-items-center mb-4">
            <BaseSkeleton type="text" width="120px" height="1.5rem" />
            <BaseSkeleton type="text" width="80px" height="1.5rem" />
          </div>
          <div class="ratings-grid">
            <div v-for="i in 4" :key="i" class="rating-item p-3 border rounded">
              <BaseSkeleton type="text" width="60%" height="1rem" class="mb-2" />
              <BaseSkeleton type="text" width="40%" height="1rem" />
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
.ratings-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
}
</style>
