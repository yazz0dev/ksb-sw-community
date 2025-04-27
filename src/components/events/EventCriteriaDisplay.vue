<template>
  <div class="card mb-4 shadow-sm animate-fade-in">
    <div class="card-body">
      <h5 class="mb-3 text-primary"><i class="fas fa-star me-2"></i>Rating Criteria &amp; XP</h5>
      <ul class="list-unstyled mb-0">
        <li v-for="(alloc, idx) in criteria" :key="alloc.constraintIndex ?? idx" class="mb-2">
          <span class="text-warning me-2"><i class="fas fa-star"></i></span>
          <span class="fw-semibold">{{ alloc.constraintLabel || 'Unnamed Criteria' }}</span>
          <span class="text-secondary ms-2">({{ alloc.points }} XP, {{ alloc.targetRole || alloc.role || 'No Role' }})</span>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { EventCriteria } from '@/types/event';

defineProps<{ criteria: EventCriteria[] }>();
</script>

<style scoped>
</style>
