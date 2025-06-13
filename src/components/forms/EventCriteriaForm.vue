// src/components/forms/EventCriteriaForm.vue
<template>
  <div>
    <!-- Display existing criteria -->
    <div v-if="localCriteria.length > 0">
      <div v-for="(criterion, idx) in localCriteria" :key="getCriterionKey(criterion, idx)" class="mb-4 border-bottom pb-3 criterion-item">
        <div class="row g-3 align-items-center">
          <!-- Criterion Label -->
          <div class="col-md-4">
            <label :for="`criterion-label-${idx}`" class="form-label small visually-hidden">Criterion Label</label>
            <input
              :id="`criterion-label-${idx}`"
              class="form-control form-control-sm"
              :class="{ 'is-invalid': !criterion.title && criterion.touched?.title }"
              type="text"
              v-model.trim="criterion.title"
              placeholder="Enter criterion name (e.g., Code Quality, Creativity)"
              :disabled="isSubmitting || isBestPerformerCriterion(criterion)"
              @blur="criterion.touched && (criterion.touched.title = true)"
            />
          </div>

          <!-- Points Slider/Display -->
          <div class="col-md-3">
            <label :for="`criterion-points-${idx}`" class="form-label small visually-hidden">Points</label>
            <div v-if="isBestPerformerCriterion(criterion)" class="d-flex align-items-center justify-content-center">
              <span class="badge bg-info-subtle text-info-emphasis rounded-pill">Fixed: {{ BEST_PERFORMER_POINTS }} XP</span>
            </div>
            <div v-else class="d-flex align-items-center">
              <input
                :id="`criterion-points-${idx}`"
                type="range"
                class="form-range me-2 flex-grow-1"
                min="1"
                :max="getCriterionMaxPoints(idx)"
                step="1"
                v-model.number="criterion.points"
                :disabled="isSubmitting"
                @input="handlePointsInput(idx)"
              />
              <span class="badge bg-primary-subtle text-primary-emphasis rounded-pill xp-badge">{{ criterion.points }} XP</span>
            </div>
          </div>

          <!-- Target Role Selection -->
          <div class="col-md-3">
             <label :for="`criterion-role-${idx}`" class="form-label small visually-hidden">Target Role</label>
            <select
              :id="`criterion-role-${idx}`"
              class="form-select form-select-sm"
              :class="{ 'is-invalid': !criterion.role && criterion.touched?.role }"
              v-model="criterion.role"
              :disabled="isSubmitting || isBestPerformerCriterion(criterion)"
              @blur="criterion.touched && (criterion.touched.role = true)"
            >
              <option value="" disabled>Select Role...</option>
              <option v-for="role in props.assignableXpRoles" :key="role" :value="role">{{ formatRoleName(role) }}</option>
            </select>
          </div>

          <!-- Remove Button -->
          <div class="col-md-2 text-md-end text-center mt-2 mt-md-0">
            <button
              v-if="!isBestPerformerCriterion(criterion) && userAddedCriteriaCount > 1"
              type="button"
              class="btn btn-sm btn-outline-danger"
              :disabled="isSubmitting"
              @click.prevent="removeCriterion(idx)"
              title="Remove Criterion"
            >
              <i class="fas fa-trash"></i>
            </button>
             <span v-else-if="!isBestPerformerCriterion(criterion)" class="text-muted small fst-italic">(Default)</span>
          </div>
        </div>
        <!-- Validation message for label -->
        <small v-if="!criterion.title && !isBestPerformerCriterion(criterion) && criterion.touched?.title" class="text-danger d-block mt-1">
            Criterion name is required.
        </small>
         <!-- Validation message for role -->
         <small v-if="!criterion.role && !isBestPerformerCriterion(criterion) && criterion.touched?.role" class="text-danger d-block mt-1">
             Target role selection is required.
         </small>
      </div>
    </div>
     <p v-else class="text-muted small fst-italic">No rating criteria added yet.</p>

    <!-- Add Criterion Button -->
    <button
        type="button"
        class="btn btn-outline-primary btn-sm mt-3"
        :disabled="isSubmitting || !canAddMoreCriteria"
        @click="addCriterion"
    >
      <i class="fas fa-plus me-1"></i> Add Criterion
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

interface CriterionWithState extends EventCriteria {
  touched?: {
    title: boolean;
    role: boolean;
  };
}

// --- Constants ---
const DEFAULT_CRITERION_LABEL = 'Overall Performance';
const DEFAULT_CRITERION_POINTS = 10;
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
const localCriteria = ref<CriterionWithState[]>([]); // Use EventCriteria

// --- Helper Functions ---
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const isBestPerformerCriterion = (criterion: EventCriteria): boolean => { // Use EventCriteria
  return criterion.title === BEST_PERFORMER_LABEL;
};

const createBestPerformerCriterion = (): CriterionWithState => ({ // Return EventCriteria
  constraintIndex: -1,
  title: BEST_PERFORMER_LABEL,
  points: BEST_PERFORMER_POINTS,
  role: '',
  touched: { title: false, role: false },
});

function createDefaultCriterion(): CriterionWithState { // Return EventCriteria
  const uniqueId = Date.now() + Math.floor(Math.random() * 1000);
  return {
    constraintIndex: uniqueId,
    title: DEFAULT_CRITERION_LABEL,
    points: DEFAULT_CRITERION_POINTS,
    role: props.assignableXpRoles[0] || '',
    touched: { title: false, role: false },
  };
}

// --- Computed Properties ---
const userAddedCriteria = computed(() => {
  return localCriteria.value.filter(c => !isBestPerformerCriterion(c));
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
  
  return localCriteria.value.every(criterion => {
    const hasTitle = !!(criterion.title?.trim());
    const hasRole = !!(criterion.role?.trim());
    const hasValidPoints = typeof criterion.points === 'number' && criterion.points > 0;
    
    // Best performer criteria are always valid if they exist
    if (isBestPerformerCriterion(criterion)) return true;
    
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
    
    let workingCriteria = JSON.parse(JSON.stringify(newCriteria || [])) as CriterionWithState[];

    // Handle Individual Non-Competition case
    if (newFormat === EventFormat.Individual && !isIndividualComp) {
      const roleBasedCriteria: CriterionWithState[] = props.assignableXpRoles.map((role, index) => {
        const existing = workingCriteria.find(c => c.role === role);
        return existing || {
          constraintIndex: -(index + 1), // Use negative indices to signify fixed criteria
          title: formatRoleName(role),
          points: DEFAULT_CRITERION_POINTS,
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
          workingCriteria = workingCriteria.filter(c => !isBestPerformerCriterion(c));
        }
        if (newFormat === EventFormat.Team && !workingCriteria.some(c => isBestPerformerCriterion(c))) {
          workingCriteria.push(createBestPerformerCriterion());
        }
      }
    } else {
      const hasBestPerf = workingCriteria.some(c => isBestPerformerCriterion(c));
      if (newFormat === EventFormat.Team && !hasBestPerf) {
        workingCriteria.push(createBestPerformerCriterion());
      } else if (newFormat !== EventFormat.Team && hasBestPerf) {
        workingCriteria = workingCriteria.filter(c => !isBestPerformerCriterion(c));
      }
    }

    const nonBestPerfCriteria = workingCriteria.filter(c => !isBestPerformerCriterion(c));
    if (newFormat !== EventFormat.MultiEvent && nonBestPerfCriteria.length === 0) {
      workingCriteria.unshift(createDefaultCriterion());
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
function getCriterionKey(criterion: EventCriteria, index: number): string | number { // Use EventCriteria
  if (typeof criterion.constraintIndex === 'number' && criterion.constraintIndex !== 0) {
    return criterion.constraintIndex;
  }
  return criterion.title || `temp-${index}`;
}

function addCriterion() {
  if (!canAddMoreCriteria.value) return;
  const newCriterion = createDefaultCriterion();
  newCriterion.title = '';
  newCriterion.points = 1;
  const bestPerformerIndex = localCriteria.value.findIndex(isBestPerformerCriterion);
  const insertIndex = bestPerformerIndex !== -1 ? bestPerformerIndex : localCriteria.value.length;
  localCriteria.value.splice(insertIndex, 0, newCriterion);
}

function removeCriterion(idx: number) {
  if (props.eventFormat === EventFormat.Individual && !props.isIndividualCompetition) {
    return; // Cannot remove criteria for non-competition individual events
  }
  const criterion = localCriteria.value[idx];
  if (userAddedCriteriaCount.value <= 1 && criterion && !isBestPerformerCriterion(criterion)) {
    console.warn("Cannot remove the last criterion.");
    return;
  }
  localCriteria.value.splice(idx, 1);
}

function getCriterionMaxPoints(idx: number): number {
  const currentCriterion = localCriteria.value[idx];
  if (!currentCriterion || isBestPerformerCriterion(currentCriterion)) return BEST_PERFORMER_POINTS;

  const sumOtherPoints = localCriteria.value.reduce((sum, c, i) => {
    if (i === idx || isBestPerformerCriterion(c)) {
      return sum;
    }
    return sum + (Number(c.points) || 0);
  }, 0);

  const bestPerformerPoints = localCriteria.value.some(c => isBestPerformerCriterion(c)) ? BEST_PERFORMER_POINTS : 0;
  const remainingXP = MAX_TOTAL_XP - bestPerformerPoints - sumOtherPoints;
  return Math.max(1, remainingXP);
}

function handlePointsInput(idx: number) {
  const criterion = localCriteria.value[idx];
  if (!criterion || isBestPerformerCriterion(criterion)) return;
  const maxPoints = getCriterionMaxPoints(idx);
  criterion.points = Math.max(1, Math.min(Number(criterion.points) || 1, maxPoints));
}

</script>

<style scoped>
.criterion-item {
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