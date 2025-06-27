// src/components/events/EventCriteriaDisplay.vue
<template>
  <div class="card criteria-card shadow-sm animate-fade-in">
    <div class="card-header bg-warning-subtle border-0">
      <div class="d-flex align-items-center">
        <i class="fas text-primary me-2" :class="isIndividualCompetitionAward ? 'fa-award' : 'fa-tasks'"></i>
        <h5 class="mb-0 fw-semibold text-gradient-primary">
          {{ titleText }}
        </h5>
        <span class="badge bg-primary-subtle text-primary-emphasis ms-auto">
          {{ criteria.length }} {{ criteria.length === 1 ? (isIndividualCompetitionAward ? 'award' : 'criteria') : (isIndividualCompetitionAward ? 'awards' : 'criteria') }}
        </span>
      </div>
    </div>
    <div class="card-body p-0">
      <div v-if="criteria.length === 0" class="empty-state">
        <i class="fas text-muted text-display mb-3" :class="isIndividualCompetitionAward ? 'fa-award' : 'fa-star'"></i>
        <p class="text-muted mb-0">No {{ isIndividualCompetitionAward ? 'awards' : 'rating criteria' }} defined for this event.</p>
      </div>
      <div v-else class="criteria-list">
        <div v-for="(criteria, idx) in criteria" :key="criteria.constraintIndex ?? idx" class="criteria-item">
          <div class="criteria-content">
            <div class="criteria-header">
              <div class="criteria-icon">
                <i class="fas text-warning" :class="isIndividualCompetitionAward ? 'fa-medal' : 'fa-star'"></i>
              </div>
              <div class="criteria-details">
                <h6 class="criteria-title mb-1">{{ criteria.title || (isIndividualCompetitionAward ? 'Unnamed Award' : 'Unnamed criteria') }}</h6>
                <div class="criteria-meta">
                  <span class="xp-badge">
                    <i class="fas fa-trophy me-1"></i>
                    {{ criteria.points }} XP
                  </span>
                  <span v-if="!isIndividualCompetitionAward" class="role-badge">
                    <i class="fas fa-user-tag me-1"></i>
                    {{ formatRoleName(criteria.role || '') }}
                  </span>
                </div>
              </div>
            </div>
            <div v-if="criteria.description" class="criteria-description">
              <p class="text-muted small mb-0">{{ criteria.description }}</p>
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
import { formatRoleName } from '@/utils/formatters'; // Use the centralized formatter

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
  if (isIndividualCompetitionAward.value) {
    return 'Competition Awards';
  }
  if (props.eventFormat === 'MultiEvent' && props.isCompetition) {
    return 'Overall Competition Series Awards';
  }
  return 'Rating Criteria';
});

// The local getRoleDisplay function is no longer needed.
// The template now directly uses the imported `formatRoleName` function.
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

.criteria-item {
  border-bottom: 1px solid var(--bs-border-color-translucent);
  transition: background-color 0.15s ease;
}

.criteria-item:last-child {
  border-bottom: none;
}

.criteria-item:hover {
  background-color: var(--bs-light);
}

.criteria-content {
  padding: 1.25rem;
}

.criteria-header {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
}

.criteria-icon {
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

.criteria-details {
  flex-grow: 1;
  min-width: 0;
}

.criteria-title {
  font-weight: 600;
  color: var(--bs-dark);
  margin-bottom: 0.5rem;
  line-height: 1.3;
}

.criteria-meta {
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

.criteria-description {
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--bs-border-color-translucent);
}

.empty-state {
  text-align: center;
  padding: 3rem 2rem;
  color: var(--bs-secondary);
}

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
</style>