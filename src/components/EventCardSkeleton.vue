<!-- src/components/EventCardSkeleton.vue -->
<template>
  <div class="bg-surface rounded-lg shadow-sm border border-border overflow-hidden animate-pulse">
    <div class="p-4 space-y-3">
      <!-- Placeholder for title -->
      <div class="h-5 bg-neutral-light rounded w-3/4"></div>
      <!-- Placeholder for date -->
      <div class="h-4 bg-neutral-light rounded w-1/2"></div>
      <!-- Placeholder for type/status -->
      <div class="h-4 bg-neutral-light rounded w-1/3"></div>
      <!-- Placeholder for participants/teams & icon -->
      <div class="flex justify-between items-center pt-2">
        <div class="h-4 bg-neutral-light rounded w-1/4"></div>
        <div class="h-6 w-6 bg-neutral-light rounded-full"></div>
      </div>
    </div>
  </div>
</template>

<script setup>
// No script needed for a simple skeleton
</script>
