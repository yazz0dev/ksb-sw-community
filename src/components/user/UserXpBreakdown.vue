<template>
  <div class="section-card shadow-sm rounded-4 animate-fade-in">
    <!-- Header -->
    <div class="section-header bg-warning-subtle text-warning-emphasis rounded-top-4 p-4 border-bottom">
      <div class="d-flex align-items-center justify-content-between">
        <div class="header-content d-flex align-items-center">
          <div class="header-icon me-3">
            <i class="fas fa-medal fa-lg"></i>
          </div>
          <div>
            <h5 class="section-title mb-1 fw-semibold">XP Breakdown by Role</h5>
            <p class="section-subtitle text-muted small mb-0">Experience points earned across different roles</p>
          </div>
        </div>
        <div class="header-badge">
          <span class="badge bg-warning text-dark rounded-pill px-3 py-2 fw-semibold">
            {{ totalXp }} XP
          </span>
        </div>
      </div>
    </div>

    <!-- Content -->
    <div class="card-body p-4">
      <!-- Loading State -->
      <div v-if="loading" class="loading-container text-center py-4">
        <div class="spinner-border spinner-border-sm text-warning mb-3" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
        <p class="text-secondary small mb-0">Loading XP data...</p>
      </div>
      
      <!-- No Data State -->
      <div v-else-if="!hasXpData" class="empty-state text-center py-4">
        <div class="empty-icon mb-3">
          <i class="fas fa-chart-bar fa-2x text-muted opacity-50"></i>
        </div>
        <h6 class="empty-title text-secondary fw-semibold mb-2">No XP Data Available</h6>
        <p class="empty-description text-muted small mb-0">No experience points have been earned yet.</p>
      </div>
      
      <!-- XP Breakdown Grid -->
      <div v-else class="xp-breakdown-grid">
        <div 
          v-for="(xp, roleKey) in filteredXpByRole" 
          :key="roleKey" 
          class="xp-role-item"
        >
          <!-- Role Header -->
          <div class="role-header d-flex justify-content-between align-items-center mb-3">
            <div class="role-info d-flex align-items-center">
              <div class="role-icon me-3">
                <i :class="getRoleIcon(roleKey)"></i>
              </div>
              <span class="role-name fw-semibold text-dark">{{ formatRoleNameForDisplay(roleKey) }}</span>
            </div>
            <span class="xp-badge badge bg-warning-subtle text-warning-emphasis rounded-pill px-3 py-2 fw-semibold">
              {{ xp }} XP
            </span>
          </div>
          
          <!-- Progress Bar -->
          <div class="progress-container mb-2">
            <div class="progress role-progress" role="progressbar" :aria-valuenow="xpPercentage(xp)" aria-valuemin="0" aria-valuemax="100">
              <div 
                class="progress-bar progress-bar-striped" 
                :class="getProgressBarClass(roleKey)"
                :style="{ width: xpPercentage(xp) + '%' }"
              ></div>
            </div>
          </div>
          
          <!-- Percentage Display -->
          <div class="percentage-display text-end">
            <small class="text-muted">{{ xpPercentage(xp) }}% of total</small>
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

const getRoleIcon = (roleKey: string): string => {
  const iconMap: Record<string, string> = {
    'xp_developer': 'fas fa-code text-primary',
    'xp_designer': 'fas fa-palette text-info',
    'xp_manager': 'fas fa-users text-success',
    'xp_organizer': 'fas fa-crown text-warning',
    'xp_participant': 'fas fa-user text-secondary',
    'xp_mentor': 'fas fa-chalkboard-teacher text-primary',
    'xp_reviewer': 'fas fa-search text-info'
  };
  
  return iconMap[roleKey] || 'fas fa-star text-secondary';
};

const getProgressBarClass = (roleKey: string): string => {
  const classMap: Record<string, string> = {
    'xp_developer': 'bg-primary',
    'xp_designer': 'bg-info',
    'xp_manager': 'bg-success',
    'xp_organizer': 'bg-warning',
    'xp_participant': 'bg-secondary',
    'xp_mentor': 'bg-primary',
    'xp_reviewer': 'bg-info'
  };
  
  return classMap[roleKey] || 'bg-secondary';
};
</script>

<style scoped>
/* Section Header */
.section-header {
  border-bottom: 1px solid var(--bs-border-color-translucent);
}

.header-icon {
  width: 3rem;
  height: 3rem;
  border-radius: 50%;
  background: rgba(var(--bs-warning-rgb), 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
}

.section-title {
  font-size: 1.25rem;
  color: var(--bs-warning-emphasis);
}

.section-subtitle {
  color: var(--bs-secondary);
}

.header-badge .badge {
  font-size: 0.875rem;
  font-weight: 600;
  border: 1px solid var(--bs-warning);
}

/* Loading and Empty States */
.loading-container,
.empty-state {
  background: var(--bs-light);
  border-radius: var(--bs-border-radius);
  margin: 0;
}

.empty-icon {
  opacity: 0.6;
}

.empty-title {
  font-size: 1rem;
}

.empty-description {
  font-size: 0.9rem;
}

/* XP Breakdown Grid */
.xp-breakdown-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
}

.xp-role-item {
  background: var(--bs-light);
  border-radius: var(--bs-border-radius-lg);
  padding: 1.25rem;
  border: 1px solid var(--bs-border-color-translucent);
  transition: all 0.3s ease;
}

.xp-role-item:hover {
  transform: translateY(-2px);
  box-shadow: var(--bs-box-shadow);
  background: var(--bs-white);
}

/* Role Header */
.role-icon {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 50%;
  background: var(--bs-white);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border: 1px solid var(--bs-border-color-translucent);
}

.role-name {
  font-size: 1rem;
  color: var(--bs-dark);
}

.xp-badge {
  font-size: 0.875rem;
  font-weight: 600;
  border: 1px solid var(--bs-warning);
  min-width: 70px;
  text-align: center;
}

/* Progress Container */
.progress-container {
  position: relative;
}

.role-progress {
  height: 8px;
  background-color: var(--bs-gray-200);
  border-radius: 1rem;
  overflow: hidden;
  box-shadow: inset 0 1px 2px rgba(0,0,0,0.1);
}

.progress-bar {
  transition: width 0.8s ease-in-out;
  border-radius: 1rem;
  position: relative;
  overflow: hidden;
}

.progress-bar-striped {
  background-image: linear-gradient(45deg, rgba(255,255,255,.15) 25%, transparent 25%, transparent 50%, rgba(255,255,255,.15) 50%, rgba(255,255,255,.15) 75%, transparent 75%, transparent);
  background-size: 1rem 1rem;
  animation: progress-bar-stripes 1s linear infinite;
}

/* Percentage Display */
.percentage-display {
  margin-top: 0.5rem;
}

.percentage-display small {
  font-weight: 500;
  font-size: 0.8rem;
}

/* Responsive Design */
@media (max-width: 768px) {
  .section-header {
    padding: 1rem !important;
  }
  
  .header-content {
    flex-direction: column;
    align-items: flex-start !important;
    gap: 0.5rem;
  }
  
  .header-icon {
    width: 2.5rem;
    height: 2.5rem;
    margin-right: 0.75rem !important;
  }
  
  .section-title {
    font-size: 1.1rem;
  }
  
  .card-body {
    padding: 1rem !important;
  }
  
  .xp-breakdown-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
  
  .xp-role-item {
    padding: 1rem;
  }
  
  .role-header {
    flex-direction: column;
    align-items: flex-start !important;
    gap: 0.75rem;
  }
  
  .role-info {
    width: 100%;
  }
  
  .role-icon {
    width: 2rem;
    height: 2rem;
    margin-right: 0.75rem !important;
  }
  
  .role-name {
    font-size: 0.95rem;
  }
  
  .xp-badge {
    align-self: flex-end;
    font-size: 0.8rem;
  }
}

@media (max-width: 480px) {
  .section-header .d-flex {
    flex-direction: column;
    align-items: flex-start !important;
    gap: 1rem;
  }
  
  .header-badge {
    align-self: flex-end;
  }
  
  .xp-breakdown-grid {
    gap: 0.75rem;
  }
  
  .xp-role-item {
    padding: 0.875rem;
  }
  
  .role-header {
    margin-bottom: 0.75rem !important;
  }
  
  .role-info .d-flex {
    flex-direction: column;
    align-items: flex-start !important;
    gap: 0.5rem;
  }
  
  .role-icon {
    margin-right: 0 !important;
  }
  
  .progress-container {
    margin-bottom: 0.5rem !important;
  }
}

/* Animation for progress bar stripes */
@keyframes progress-bar-stripes {
  0% {
    background-position-x: 1rem;
  }
}
</style>
