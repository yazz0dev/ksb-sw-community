<template>
  <div class="card shadow-sm">
    <div class="card-header">
      <h5 class="card-title mb-0 d-flex align-items-center">
        <i class="fas fa-medal text-primary me-2"></i>XP Breakdown by Role
      </h5>
    </div>
    <div class="card-body">
      <div v-if="loading" class="text-center py-3">
        <div class="spinner-border spinner-border-sm text-primary" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
        <p class="small text-muted mt-2 mb-0">Loading XP data...</p>
      </div>
      
      <div v-else-if="!hasXpData" class="text-center py-3">
        <p class="text-muted small mb-0">No XP data available.</p>
      </div>
      
      <div v-else class="row g-4">
        <div v-for="(xp, roleKey) in filteredXpByRole" :key="roleKey" class="col-md-6">
          <div class="d-flex justify-content-between align-items-center mb-2">
            <span class="small fw-medium">{{ formatRoleNameForDisplay(roleKey) }}</span>
            <span class="badge bg-primary-subtle text-primary-emphasis rounded-pill">{{ xp }} XP</span>
          </div>
          <div class="progress" role="progressbar" :aria-valuenow="xpPercentage(xp)" aria-valuemin="0" aria-valuemax="100" style="height: 8px;">
            <div class="progress-bar bg-primary" :style="{ width: xpPercentage(xp) + '%' }"></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { formatRoleName as formatRoleNameForDisplay } from '@/utils/formatters';

interface Props {
  xpData: Record<string, number> | null;
  loading?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false
});

const totalXp = computed((): number => {
  if (!props.xpData) return 0;
  return props.xpData.totalCalculatedXp || 0;
});

const hasXpData = computed((): boolean => {
  return !!(props.xpData && totalXp.value > 0 && 
    Object.values(props.xpData).some(val => typeof val === 'number' && val > 0));
});

const filteredXpByRole = computed(() => {
  if (!props.xpData) return {};
  const relevantXp: Record<string, number> = {};
  
  // Iterate over keys of xpData that represent XP roles (e.g., start with 'xp_')
  for (const key in props.xpData) {
    if (key.startsWith('xp_') && (props.xpData as any)[key] > 0) {
      relevantXp[key] = (props.xpData as any)[key];
    }
  }
  return relevantXp;
});

const xpPercentage = (xp: number): number => {
  return totalXp.value > 0 ? Math.min(100, Math.round((xp / totalXp.value) * 100)) : 0;
};
</script>

<style scoped>
.progress {
  background-color: var(--bs-gray-200);
  border-radius: 1rem;
  overflow: hidden;
}

.progress-bar {
  transition: width 0.6s ease;
}

.badge {
  font-weight: 500;
  padding: 0.35em 0.65em;
}
</style>
