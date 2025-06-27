// src/components/forms/EventCriteriaForm.vue
<template>
  <div>
    <!-- Display existing criteria -->
    <div v-if="localCriteria.length > 0">
      <div v-for="(criteria, idx) in localCriteria" :key="getcriteriaKey(criteria, idx)" class="mb-4 border-bottom pb-3 criteria-item">
        <div class="row g-3 align-items-center">
          <!-- criteria Label -->
          <div class="col-md-4">
            <label :for="`criteria-label-${idx}`" class="form-label small visually-hidden">criteria Label</label>
            <input
              :id="`criteria-label-${idx}`"
              class="form-control form-control-sm"
              :class="{ 'is-invalid': !criteria.title && criteria.touched?.title }"
              type="text"
              v-model.trim="criteria.title"
              placeholder="Enter criteria name (e.g., Code Quality, Creativity)"
              :disabled="isSubmitting || isBestPerformercriteria(criteria)"
              @blur="criteria.touched && (criteria.touched.title = true)"
            />
          </div>

          <!-- Points Slider/Display -->
          <div class="col-md-3">
            <label :for="`criteria-points-${idx}`" class="form-label small visually-hidden">Points</label>
            <div v-if="isBestPerformercriteria(criteria)" class="d-flex align-items-center justify-content-center">
              <span class="badge bg-info-subtle text-info-emphasis rounded-pill">Fixed: {{ BEST_PERFORMER_POINTS }} XP</span>
            </div>
            <div v-else class="d-flex align-items-center">
              <input
                :id="`criteria-points-${idx}`"
                type="range"
                class="form-range me-2 flex-grow-1"
                min="1"
                :max="getcriteriaMaxPoints(idx)"
                step="1"
                v-model.number="criteria.points"
                :disabled="isSubmitting"
                @input="handlePointsInput(idx)"
              />
              <span class="badge bg-primary-subtle text-primary-emphasis rounded-pill xp-badge">{{ criteria.points }} XP</span>
            </div>
          </div>

          <!-- Target Role Selection -->
          <div class="col-md-3">
             <label :for="`criteria-role-${idx}`" class="form-label small visually-hidden">Target Role</label>
            <select
              :id="`criteria-role-${idx}`"
              class="form-select form-select-sm"
              :class="{ 'is-invalid': !criteria.role && criteria.touched?.role }"
              v-model="criteria.role"
              :disabled="isSubmitting || isBestPerformercriteria(criteria)"
              @blur="criteria.touched && (criteria.touched.role = true)"
            >
              <option value="" disabled>Select Role...</option>
              <option v-for="role in props.assignableXpRoles" :key="role" :value="role">{{ formatRoleName(role) }}</option>
            </select>
          </div>

          <!-- Remove Button -->
          <div class="col-md-2 text-md-end text-center mt-2 mt-md-0">
            <button
              v-if="!isBestPerformercriteria(criteria) && userAddedCriteriaCount > 1"
              type="button"
              class="btn btn-sm btn-outline-danger"
              :disabled="isSubmitting"
              @click.prevent="removecriteria(idx)"
              title="Remove criteria"
            >
              <i class="fas fa-trash"></i>
            </button>
             <span v-else-if="!isBestPerformercriteria(criteria)" class="text-muted small fst-italic">(Default)</span>
          </div>
        </div>
        <!-- Validation message for label -->
        <small v-if="!criteria.title && !isBestPerformercriteria(criteria) && criteria.touched?.title" class="text-danger d-block mt-1">
            criteria name is required.
        </small>
         <!-- Validation message for role -->
         <small v-if="!criteria.role && !isBestPerformercriteria(criteria) && criteria.touched?.role" class="text-danger d-block mt-1">
             Target role selection is required.
         </small>
      </div>
    </div>
     <p v-else class="text-muted small fst-italic">No rating criteria added yet.</p>

    <!-- Add criteria Button -->
    <button
        type="button"
        class="btn btn-outline-primary btn-sm mt-3"
        :disabled="isSubmitting || !canAddMoreCriteria"
        @click="addcriteria"
    >
      <i class="fas fa-plus me-1"></i> Add criteria
    </button>
    <p v-if="!canAddMoreCriteria && props.eventFormat !== EventFormat.MultiEvent" class="form-text text-warning mt-2">
        Maximum number of rating criteria reached ({{ MAX_USER_CRITERIA_CONST }} user-defined + default/best performer).
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { EventFormat, type EventCriteria } from '@/types/event'; // Use EventCriteria
import { formatRoleName } from '@/utils/formatters';
import {
  BEST_PERFORMER_LABEL,
  BEST_PERFORMER_POINTS,
  MAX_USER_CRITERIA,
  MAX_TOTAL_XP
} from '@/utils/constants';

interface criteriaWithState extends EventCriteria {
  touched?: {
    title: boolean;
    role: boolean;
  };
}

// --- Constants ---
const DEFAULT_criteria_LABEL = 'Overall Performance';
const DEFAULT_criteria_POINTS = 10;
const MAX_USER_CRITERIA_CONST = MAX_USER_CRITERIA; // Expose to template

// --- Props & Emits ---
interface Props {
  criteria: EventCriteria[];
  isSubmitting: boolean;
  eventFormat: EventFormat;
  isIndividualCompetition: boolean; // Keep it as boolean
  assignableXpRoles: readonly string[];
}
const props = defineProps<Props>();
const emit = defineEmits(['update:criteria', 'validity-change']);

// --- State ---
const localCriteria = ref<criteriaWithState[]>([]); // Use EventCriteria

// --- Helper Functions ---
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const isBestPerformercriteria = (criteria: EventCriteria): boolean => { // Use EventCriteria
  return criteria.title === BEST_PERFORMER_LABEL;
};

const createBestPerformercriteria = (): criteriaWithState => ({ // Return EventCriteria
  constraintIndex: -1,
  title: BEST_PERFORMER_LABEL,
  points: BEST_PERFORMER_POINTS,
  role: '',
  touched: { title: false, role: false },
});

function createDefaultcriteria(): criteriaWithState { // Return EventCriteria
  const uniqueId = Date.now() + Math.floor(Math.random() * 1000);
  return {
    constraintIndex: uniqueId,
    title: DEFAULT_criteria_LABEL,
    points: DEFAULT_criteria_POINTS,
    role: props.assignableXpRoles[0] || '',
    touched: { title: false, role: false },
  };
}

// --- Computed Properties ---
const userAddedCriteria = computed(() => {
  return localCriteria.value.filter(c => !isBestPerformercriteria(c));
});
const userAddedCriteriaCount = computed(() => {
  return userAddedCriteria.value.length;
});

const canAddMoreCriteria = computed(() => {
  if (props.eventFormat === EventFormat.Individual && !props.isIndividualCompetition) {
    return false; // Cannot add/remove criteria for non-competition individual events
  }
  return props.eventFormat !== EventFormat.MultiEvent && userAddedCriteriaCount.value < MAX_USER_CRITERIA_CONST;
});

// Add validation computed property
const isCriteriaValid = computed(() => {
  if (props.eventFormat === EventFormat.MultiEvent) return true; // Criteria handled per phase
  
  if (localCriteria.value.length === 0) return false;
  
  return localCriteria.value.every(criteria => {
    const hasTitle = !!(criteria.title?.trim());
    const hasRole = !!(criteria.role?.trim());
    const hasValidPoints = typeof criteria.points === 'number' && criteria.points > 0;
    
    // Best performer criteria are always valid if they exist
    if (isBestPerformercriteria(criteria)) return true;
    
    return hasTitle && hasRole && hasValidPoints;
  });
});

// --- Watcher for Prop Changes ---
let isUpdatingFromProp = false;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
watch(
  [() => props.criteria, () => props.eventFormat, () => props.isIndividualCompetition],
  ([newCriteria, newFormat, isIndividualComp], [, oldFormat]) => {
    if (isUpdatingFromProp) return;
    
    let workingCriteria = JSON.parse(JSON.stringify(newCriteria || [])) as criteriaWithState[];

    // Handle Individual Non-Competition case
    if (newFormat === EventFormat.Individual && !isIndividualComp) {
      const roleBasedCriteria: criteriaWithState[] = props.assignableXpRoles.map((role, index) => {
        const existing = workingCriteria.find(c => c.role === role);
        return existing || {
          constraintIndex: -(index + 1), // Use negative indices to signify fixed criteria
          title: formatRoleName(role),
          points: DEFAULT_criteria_POINTS,
          role: role,
          touched: { title: false, role: false }
        };
      });
      workingCriteria = roleBasedCriteria;
    } else if (newFormat !== oldFormat) {
      if (newFormat === EventFormat.MultiEvent) {
        workingCriteria = [];
      } else {
        if (oldFormat === EventFormat.Team) {
          workingCriteria = workingCriteria.filter(c => !isBestPerformercriteria(c));
        }
        if (newFormat === EventFormat.Team && !workingCriteria.some(c => isBestPerformercriteria(c))) {
          workingCriteria.push(createBestPerformercriteria());
        }
      }
    } else {
      const hasBestPerf = workingCriteria.some(c => isBestPerformercriteria(c));
      if (newFormat === EventFormat.Team && !hasBestPerf) {
        workingCriteria.push(createBestPerformercriteria());
      } else if (newFormat !== EventFormat.Team && hasBestPerf) {
        workingCriteria = workingCriteria.filter(c => !isBestPerformercriteria(c));
      }
    }

    const nonBestPerfCriteria = workingCriteria.filter(c => !isBestPerformercriteria(c));
    if (newFormat !== EventFormat.MultiEvent && nonBestPerfCriteria.length === 0) {
      workingCriteria.unshift(createDefaultcriteria());
    }

    workingCriteria.forEach(c => {
      if (!c.touched) {
        c.touched = { title: false, role: false };
      }
    });

    if (JSON.stringify(workingCriteria) !== JSON.stringify(localCriteria.value)) {
      localCriteria.value = workingCriteria;
    }
  },
  { immediate: true, deep: true }
);

// Watch localCriteria and emit updates
watch(localCriteria, (newVal) => {
  isUpdatingFromProp = true;
  emit('update:criteria', JSON.parse(JSON.stringify(newVal)));
  setTimeout(() => {
    isUpdatingFromProp = false;
  }, 0);
}, { deep: true });

// Watch criteria validity and emit changes
watch(isCriteriaValid, (newValid) => {
  emit('validity-change', newValid);
}, { immediate: true });

// --- Methods ---
function getcriteriaKey(criteria: EventCriteria, index: number): string | number { // Use EventCriteria
  if (typeof criteria.constraintIndex === 'number' && criteria.constraintIndex !== 0) {
    return criteria.constraintIndex;
  }
  return criteria.title || `temp-${index}`;
}

function addcriteria() {
  if (!canAddMoreCriteria.value) return;
  const newcriteria = createDefaultcriteria();
  newcriteria.title = '';
  newcriteria.points = 1;
  const bestPerformerIndex = localCriteria.value.findIndex(isBestPerformercriteria);
  const insertIndex = bestPerformerIndex !== -1 ? bestPerformerIndex : localCriteria.value.length;
  localCriteria.value.splice(insertIndex, 0, newcriteria);
}

function removecriteria(idx: number) {
  if (props.eventFormat === EventFormat.Individual && !props.isIndividualCompetition) {
    return; // Cannot remove criteria for non-competition individual events
  }
  const criteria = localCriteria.value[idx];
  if (userAddedCriteriaCount.value <= 1 && criteria && !isBestPerformercriteria(criteria)) {
    console.warn("Cannot remove the last criteria.");
    return;
  }
  localCriteria.value.splice(idx, 1);
}

function getcriteriaMaxPoints(idx: number): number {
  const currentcriteria = localCriteria.value[idx];
  if (!currentcriteria || isBestPerformercriteria(currentcriteria)) return BEST_PERFORMER_POINTS;

  const sumOtherPoints = localCriteria.value.reduce((sum, c, i) => {
    if (i === idx || isBestPerformercriteria(c)) {
      return sum;
    }
    return sum + (Number(c.points) || 0);
  }, 0);

  const bestPerformerPoints = localCriteria.value.some(c => isBestPerformercriteria(c)) ? BEST_PERFORMER_POINTS : 0;
  const remainingXP = MAX_TOTAL_XP - bestPerformerPoints - sumOtherPoints;
  return Math.max(1, remainingXP);
}

function handlePointsInput(idx: number) {
  const criteria = localCriteria.value[idx];
  if (!criteria || isBestPerformercriteria(criteria)) return;
  const maxPoints = getcriteriaMaxPoints(idx);
  criteria.points = Math.max(1, Math.min(Number(criteria.points) || 1, maxPoints));
}

</script>

<style scoped>
.criteria-item {
  background-color: var(--bs-light-bg-subtle);
  padding: 1rem;
  border-radius: var(--bs-border-radius-sm);
}
.form-range {
    padding-top: 0.6rem; /* Adjust vertical alignment */
}
.badge {
    font-size: 0.8em;
    padding: 0.4em 0.6em;
}
.xp-badge {
  min-width: 50px;
  text-align: center;
}

.form-control:focus,
.form-select:focus {
  border-color: var(--bs-primary);
  box-shadow: 0 0 0 0.2rem rgba(var(--bs-primary-rgb), 0.25);
}

.invalid-feedback {
  color: var(--bs-danger);
}
</style>