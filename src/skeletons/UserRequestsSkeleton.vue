<template>
  <div class="section-card shadow-sm rounded-4">
    <div class="section-header p-4 border-bottom">
      <div class="d-flex align-items-center">
        <BaseSkeleton type="avatar" size="40px" class="me-3" />
        <div class="flex-grow-1">
          <BaseSkeleton type="text" width="200px" height="1.5rem" />
          <BaseSkeleton type="text" width="250px" height="0.8rem" class="mt-1" />
        </div>
      </div>
    </div>
    <div class="item-list p-4">
      <div v-for="i in 3" :key="i" class="list-item border-bottom pb-4 mb-4">
        <div class="d-flex justify-content-between align-items-center mb-2">
            <BaseSkeleton type="text" width="60%" height="1.25rem" />
            <BaseSkeleton type="text" width="100px" height="24px" :rounded="true" />
        </div>
        <div class="d-flex justify-content-between align-items-center">
          <BaseSkeleton type="text" width="120px" height="1rem" />
          <BaseSkeleton type="text" width="90px" height="1rem" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import BaseSkeleton from '@/skeletons/BaseSkeleton.vue';
</script>

<style scoped>
.list-item:last-child {
  border-bottom: none !important;
  margin-bottom: 0 !important;
  padding-bottom: 0 !important;
}
</style>