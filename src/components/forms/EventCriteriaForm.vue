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
              type="text"
              v-model="criterion.constraintLabel"
              :readonly="isBestPerformerCriterion(criterion)"
              :disabled="isSubmitting || isBestPerformerCriterion(criterion)"
              @input="emitCriteriaUpdate"
              placeholder="Criterion Name (e.g., Functionality)"
              required
            />
          </div>

          <!-- Points Slider/Display -->
          <div class="col-md-3">
            <label :for="`criterion-points-${idx}`" class="form-label small visually-hidden">Points</label>
            <div v-if="isBestPerformerCriterion(criterion)" class="d-flex align-items-center justify-content-center">
              <span class="badge bg-info-subtle text-info-emphasis rounded-pill">Fixed: 10 XP</span>
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
              <span class="badge bg-primary-subtle text-primary-emphasis rounded-pill" style="min-width: 50px; text-align: center;">{{ criterion.points }} XP</span>
            </div>
          </div>

          <!-- Target Role Selection -->
          <div class="col-md-3">
             <label :for="`criterion-role-${idx}`" class="form-label small visually-hidden">Target Role</label>
            <select
              :id="`criterion-role-${idx}`"
              class="form-select form-select-sm"
              v-model="criterion.role"
              :disabled="isSubmitting || isBestPerformerCriterion(criterion)"
              @change="emitCriteriaUpdate"
              required
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
        <small v-if="!criterion.constraintLabel && !isBestPerformerCriterion(criterion)" class="text-danger d-block mt-1">
            Criterion name is required.
        </small>
         <!-- Validation message for role -->
         <small v-if="!criterion.role && !isBestPerformerCriterion(criterion)" class="text-danger d-block mt-1">
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
    <p v-if="!canAddMoreCriteria && props.eventFormat !== 'Competition'" class="form-text text-warning mt-2">
        Maximum number of rating criteria reached ({{ maxUserCriteria }} user-defined + default/best performer).
    </p>
    <p v-if="props.eventFormat === 'Competition'" class="form-text text-muted mt-2">
        Rating criteria are typically not defined for competitions.
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, nextTick } from 'vue';
// Remove 'type' from EventFormat import
import { EventFormat, type EventCriteria } from '@/types/event';
import { formatRoleName } from '@/utils/formatters';
// Import constants from centralized location
import { 
  BEST_PERFORMER_LABEL, 
  BEST_PERFORMER_POINTS, 
  MAX_USER_CRITERIA,
  MAX_TOTAL_XP 
} from '@/utils/constants';

// --- Constants ---
const DEFAULT_CRITERION_LABEL = 'Overall Performance';
const DEFAULT_CRITERION_POINTS = 10;

// --- Props & Emits ---
interface Props {
  criteria: EventCriteria[];
  isSubmitting: boolean;
  eventFormat: EventFormat;
  assignableXpRoles: readonly string[];
  totalXP: number; // Keep receiving totalXP for display in parent, but calculate max points locally
}
const props = defineProps<Props>();
const emit = defineEmits(['update:criteria']);

// --- State ---
const localCriteria = ref<EventCriteria[]>([]);

// --- Helper Functions ---
const isBestPerformerCriterion = (criterion: EventCriteria): boolean => {
  return criterion.constraintLabel === BEST_PERFORMER_LABEL;
};

const createBestPerformerCriterion = (): EventCriteria => ({
  constraintIndex: -1, // Fixed index for easy identification
  constraintLabel: BEST_PERFORMER_LABEL,
  points: BEST_PERFORMER_POINTS,
  role: '', // No specific role
  criteriaSelections: {}
});

function createDefaultCriterion(): EventCriteria {
  // Use a more unique ID rather than just Date.now()
  // A combination of timestamp and a random component would be more robust
  const uniqueId = Date.now() + Math.floor(Math.random() * 1000);
  return {
    constraintIndex: uniqueId,
    constraintLabel: DEFAULT_CRITERION_LABEL,
    points: DEFAULT_CRITERION_POINTS,
    role: props.assignableXpRoles[0] || '',
    criteriaSelections: {}
  };
}

// --- Computed Properties ---
const userAddedCriteriaCount = computed(() => {
  return localCriteria.value.filter(c => !isBestPerformerCriterion(c)).length;
});

const canAddMoreCriteria = computed(() => {
  return props.eventFormat !== EventFormat.Competition && userAddedCriteriaCount.value < MAX_USER_CRITERIA;
});

// --- Watcher for Prop Changes ---
watch(
  [() => props.criteria, () => props.eventFormat],
  ([newCriteria, newFormat], [oldCriteria, oldFormat]) => {
    // Deep copy to avoid modifying props directly
    let workingCriteria = JSON.parse(JSON.stringify(newCriteria || [])) as EventCriteria[];

    // 1. Handle Format Change Effects
    if (newFormat !== oldFormat) {
      if (newFormat === EventFormat.Competition) {
        // Clear all criteria for Competition format
        workingCriteria = [];
      } else {
        // Remove Best Performer if switching away from Team
        if (oldFormat === EventFormat.Team) {
          workingCriteria = workingCriteria.filter(c => !isBestPerformerCriterion(c));
        }
        // Add Best Performer if switching to Team
        if (newFormat === EventFormat.Team && !workingCriteria.some(isBestPerformerCriterion)) {
          workingCriteria.push(createBestPerformerCriterion());
        }
      }
    } else {
      // If format didn't change, but criteria prop did, ensure Best Performer consistency
      const hasBestPerf = workingCriteria.some(isBestPerformerCriterion);
      if (newFormat === EventFormat.Team && !hasBestPerf) {
        workingCriteria.push(createBestPerformerCriterion());
      } else if (newFormat !== EventFormat.Team && hasBestPerf) {
        workingCriteria = workingCriteria.filter(c => !isBestPerformerCriterion(c));
      }
    }

    // 2. Ensure Default Criterion (if not Competition and no user criteria exist)
    const nonBestPerfCriteria = workingCriteria.filter(c => !isBestPerformerCriterion(c));
    if (newFormat !== EventFormat.Competition && nonBestPerfCriteria.length === 0) {
      // Add default criterion at the beginning
      workingCriteria.unshift(createDefaultCriterion());
    }

    // 3. Update local state if different from current
    // Compare stringified versions to avoid infinite loops from object references
    if (JSON.stringify(workingCriteria) !== JSON.stringify(localCriteria.value)) {
      localCriteria.value = workingCriteria;
      // Emit update in next tick to allow DOM update cycle
      nextTick(emitCriteriaUpdate);
    }
  },
  { immediate: true, deep: true } // Run immediately and watch deeply
);

// --- Methods ---
function getCriterionKey(criterion: EventCriteria, index: number): string | number {
  // Use constraintIndex if valid, otherwise use a more stable temporary key
  if (typeof criterion.constraintIndex === 'number' && criterion.constraintIndex !== 0) {
    return criterion.constraintIndex;
  }
  // Use a temporary prefix for new criteria that don't have a stable index yet
  return criterion.constraintLabel || `temp-${index}`;
}

function emitCriteriaUpdate() {
  // Emit a deep copy of the current local state
  emit('update:criteria', JSON.parse(JSON.stringify(localCriteria.value)));
}

function addCriterion() {
  if (!canAddMoreCriteria.value) return;

  const newCriterion = createDefaultCriterion(); // Start with default values
  newCriterion.constraintLabel = ''; // Clear label for user input
  newCriterion.points = 1; // Start points at 1

  const bestPerformerIndex = localCriteria.value.findIndex(isBestPerformerCriterion);
  const insertIndex = bestPerformerIndex !== -1 ? bestPerformerIndex : localCriteria.value.length;

  // Use splice to insert the new criterion
  localCriteria.value.splice(insertIndex, 0, newCriterion);

  nextTick(emitCriteriaUpdate);
}

function removeCriterion(idx: number) {
  // Prevent removing the last non-best-performer criterion
  if (userAddedCriteriaCount.value <= 1 && !isBestPerformerCriterion(localCriteria.value[idx])) {
    console.warn("Cannot remove the last criterion.");
    return;
  }
  localCriteria.value.splice(idx, 1);
  nextTick(emitCriteriaUpdate);
}

function getCriterionMaxPoints(idx: number): number {
  const currentCriterion = localCriteria.value[idx];
  if (isBestPerformerCriterion(currentCriterion)) return BEST_PERFORMER_POINTS; // Should be readonly, but safeguard

  const sumOtherPoints = localCriteria.value.reduce((sum, c, i) => {
    // Exclude current criterion and Best Performer (handled separately)
    if (i === idx || isBestPerformerCriterion(c)) {
      return sum;
    }
    return sum + (Number(c.points) || 0);
  }, 0);

  // Use MAX_TOTAL_XP from constants
  const bestPerformerPoints = localCriteria.value.some(isBestPerformerCriterion) ? BEST_PERFORMER_POINTS : 0;
  const remainingXP = MAX_TOTAL_XP - bestPerformerPoints - sumOtherPoints;

  return Math.max(1, remainingXP); // Ensure max is at least 1
}

function handlePointsInput(idx: number) {
  const criterion = localCriteria.value[idx];
  if (isBestPerformerCriterion(criterion)) return; // Should not happen via input

  const maxPoints = getCriterionMaxPoints(idx);
  // Clamp the value between 1 and the calculated max
  criterion.points = Math.max(1, Math.min(Number(criterion.points) || 1, maxPoints));

  // No need to emit immediately, @input on label/role or @change on select will trigger emit
  // If only points change, we might need an explicit emit or watch points
  nextTick(emitCriteriaUpdate); // Emit after value is clamped
}

// Expose constants used in the template
defineExpose({
    MAX_USER_CRITERIA
});

// Add this line to make MAX_USER_CRITERIA available as maxUserCriteria in the template
const maxUserCriteria = MAX_USER_CRITERIA;

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
</style>