// src/components/events/EventCriteriaDisplay.vue
<template>
  <div class="card criteria-card shadow-sm animate-fade-in">
    <div class="card-header bg-warning-subtle border-0">
      <div class="d-flex align-items-center">
        <!-- Updated icon and title styling -->
        <i class="fas text-primary me-2" :class="isIndividualCompetitionAward ? 'fa-award' : 'fa-tasks'"></i>
        <h5 class="mb-0 fw-semibold text-gradient-primary">
          {{ titleText }}
        </h5>
        <span class="badge bg-primary-subtle text-primary-emphasis ms-auto">
          {{ criteria.length }} {{ criteria.length === 1 ? (isIndividualCompetitionAward ? 'award' : 'criterion') : (isIndividualCompetitionAward ? 'awards' : 'criteria') }}
        </span>
      </div>
    </div>
    <div class="card-body p-0">
      <div v-if="criteria.length === 0" class="empty-state">
        <i class="fas text-muted text-display mb-3" :class="isIndividualCompetitionAward ? 'fa-award' : 'fa-star'"></i>
        <p class="text-muted mb-0">No {{ isIndividualCompetitionAward ? 'awards' : 'rating criteria' }} defined for this event.</p>
      </div>
      <div v-else class="criteria-list">
        <div v-for="(criterion, idx) in criteria" :key="criterion.constraintIndex ?? idx" class="criterion-item">
          <div class="criterion-content">
            <div class="criterion-header">
              <div class="criterion-icon">
                <i class="fas text-warning" :class="isIndividualCompetitionAward ? 'fa-medal' : 'fa-star'"></i>
              </div>
              <div class="criterion-details">
                <h6 class="criterion-title mb-1">{{ criterion.title || (isIndividualCompetitionAward ? 'Unnamed Award' : 'Unnamed Criterion') }}</h6>
                <div class="criterion-meta">
                  <span class="xp-badge">
                    <i class="fas fa-trophy me-1"></i>
                    {{ criterion.points }} XP
                  </span>
                  <span v-if="!isIndividualCompetitionAward" class="role-badge">
                    <i class="fas fa-user-tag me-1"></i>
                    {{ getRoleDisplay(criterion) }}
                  </span>
                </div>
              </div>
            </div>
            <div v-if="criterion.description" class="criterion-description">
              <p class="text-muted small mb-0">{{ criterion.description }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { EventCriteria, EventFormat } from '@/types/event'; 
import { formatRoleName } from '@/utils/formatters';

interface Props {
  criteria: EventCriteria[],
  eventFormat?: EventFormat, 
  isCompetition?: boolean    
}
const props = withDefaults(defineProps<Props>(), {
  isCompetition: false,
});

const isIndividualCompetitionAward = computed(() => {
  return props.eventFormat === 'Individual' && props.isCompetition;
});

const titleText = computed(() => {
  if (props.eventFormat === 'Individual' && props.isCompetition) {
    return 'Competition Awards';
  }
  if (props.eventFormat === 'MultiEvent' && props.isCompetition) {
    return 'Overall Competition Series Awards'; // Or similar if criteria are for overall multi-event
  }
  return 'Rating Criteria';
});

// Handle both role and targetRole properties consistently
function getRoleDisplay(criterion: EventCriteria): string {
  const role = criterion.targetRole || criterion.role; // targetRole is optional on EventCriteria
  return role ? formatRoleName(String(role)) : 'No Role'; // Ensure role is string for formatRoleName
}
</script>

<style scoped>
.criteria-card {
  background: var(--bs-card-bg);
  border: 1px solid var(--bs-border-color);
  border-radius: var(--bs-border-radius-lg);
  overflow: hidden;
}

.card-header {
  padding: 1rem 1.25rem;
  border-bottom: 1px solid rgba(var(--bs-warning-rgb), 0.2);
}

.criteria-list {
  padding: 0;
}

.criterion-item {
  border-bottom: 1px solid var(--bs-border-color-translucent);
  transition: background-color 0.15s ease;
}

.criterion-item:last-child {
  border-bottom: none;
}

.criterion-item:hover {
  background-color: var(--bs-light);
}

.criterion-content {
  padding: 1.25rem;
}

.criterion-header {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
}

.criterion-icon {
  flex-shrink: 0;
  width: 2rem;
  height: 2rem;
  background: rgba(var(--bs-warning-rgb), 0.1);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 0.125rem;
}

.criterion-details {
  flex-grow: 1;
  min-width: 0;
}

.criterion-title {
  font-weight: 600;
  color: var(--bs-dark);
  margin-bottom: 0.5rem;
  line-height: 1.3;
}

.criterion-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
}

.xp-badge,
.role-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.5rem;
  border-radius: var(--bs-border-radius);
  font-size: 0.8rem;
  font-weight: 500;
}

.xp-badge {
  background: rgba(var(--bs-success-rgb), 0.1);
  color: var(--bs-success);
  border: 1px solid rgba(var(--bs-success-rgb), 0.2);
}

.role-badge {
  background: rgba(var(--bs-info-rgb), 0.1);
  color: var(--bs-info);
  border: 1px solid rgba(var(--bs-info-rgb), 0.2);
}

.criterion-description {
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--bs-border-color-translucent);
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 3rem 2rem;
  color: var(--bs-secondary);
}

/* Animation */
.animate-fade-in {
  animation: fadeIn 0.5s ease-out forwards;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Responsive Design */
@media (max-width: 768px) {
  .card-header {
    padding: 0.875rem 1rem;
  }
  
  .criterion-content {
    padding: 1rem;
  }
  
  .criterion-header {
    gap: 0.5rem;
  }
  
  .criterion-icon {
    width: 1.75rem;
    height: 1.75rem;
  }
  
  .criterion-title {
    font-size: 0.95rem;
  }
  
  .criterion-meta {
    gap: 0.375rem;
  }
  
  .xp-badge,
  .role-badge {
    padding: 0.2rem 0.4rem;
    font-size: 0.75rem;
  }
  
  .empty-state {
    padding: 2rem 1rem;
  }
}

@media (max-width: 480px) {
  .criterion-meta {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .xp-badge,
  .role-badge {
    width: 100%;
    justify-content: center;
  }
}
</style>