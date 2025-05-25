// src/components/events/EventCriteriaDisplay.vue
<template>
  <div class="card mb-4 shadow-sm animate-fade-in">
    <div class="card-body">
      <h5 class="mb-3 text-primary"><i class="fas fa-star me-2"></i>Rating Criteria & XP</h5>
      <ul class="list-unstyled mb-0">
        <li v-for="(alloc, idx) in criteria" :key="alloc.constraintIndex ?? idx" class="mb-2">
          <span class="text-warning me-2"><i class="fas fa-star"></i></span>
          <span class="fw-semibold">{{ alloc.constraintLabel || 'Unnamed Criteria' }}</span>
          <span class="text-secondary ms-2">
            ({{ alloc.points }} XP, {{ getRoleDisplay(alloc) }})
          </span>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { EventCriterion } from '@/types/event'; // Changed from EventCriteria to EventCriterion
import { formatRoleName } from '@/utils/formatters';

defineProps<{ criteria: EventCriterion[] }>(); // Changed from EventCriteria to EventCriterion

// Handle both role and targetRole properties consistently
function getRoleDisplay(criterion: EventCriterion): string { // Changed from EventCriteria to EventCriterion
  const role = criterion.targetRole || criterion.role; // targetRole is optional on EventCriterion
  return role ? formatRoleName(String(role)) : 'No Role'; // Ensure role is string for formatRoleName
}
</script>