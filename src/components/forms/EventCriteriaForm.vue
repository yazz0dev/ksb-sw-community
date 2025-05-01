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
              <option v-for="role in assignableXpRoles" :key="role" :value="role">{{ formatRoleName(role) }}</option>
            </select>
          </div>

          <!-- Remove Button -->
          <div class="col-md-2 text-md-end text-center mt-2 mt-md-0">
            <button
              v-if="!isBestPerformerCriterion(criterion) && localCriteria.filter(c => !isBestPerformerCriterion(c)).length > 1"
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
    <p v-if="!canAddMoreCriteria && eventFormat !== 'Competition'" class="form-text text-warning mt-2">
        Maximum number of rating criteria reached ({{ maxUserCriteria }} user-defined + default/best performer).
    </p>
    <p v-if="eventFormat === 'Competition'" class="form-text text-muted mt-2">
        Rating criteria are typically not defined for competitions.
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, toRefs, computed } from 'vue';
import type { EventCriteria, EventFormat } from '@/types/event';
import { formatRoleName } from '@/utils/formatters'; // Import formatter

interface Props {
  criteria: EventCriteria[];
  isSubmitting: boolean;
  eventFormat: EventFormat;
  assignableXpRoles: readonly string[];
  totalXP: number;
}

const emit = defineEmits(['update:criteria']);
const props = defineProps<Props>();
const { criteria, isSubmitting, eventFormat, assignableXpRoles, totalXP } = toRefs(props);

const localCriteria = ref<EventCriteria[]>([...criteria.value]);
const maxUserCriteria = 4; // Maximum number of criteria user can add

// --- Computed Properties ---
const userAddedCriteriaCount = computed(() => {
    return localCriteria.value.filter(c => !isBestPerformerCriterion(c)).length;
});

const canAddMoreCriteria = computed(() => {
    // Competitions typically don't have user-defined criteria for XP in the same way
    if (eventFormat.value === 'Competition') return false;
    // Otherwise, check against the limit
    return userAddedCriteriaCount.value < maxUserCriteria;
});

// --- Watchers ---
watch([criteria, eventFormat], ([newCriteria, format]) => {
    let updated = JSON.parse(JSON.stringify(newCriteria || [])); // Deep copy

    // Remove any existing Best Performer criteria initially for clean slate
    updated = updated.filter((c: EventCriteria) => !isBestPerformerCriterion(c));

    // Add Best Performer for Team format if not present
    if (format === 'Team') {
        if (!updated.some((c: EventCriteria) => isBestPerformerCriterion(c))) {
             updated.push({
                constraintIndex: -1, // Use a fixed indicator or unique temporary ID
                constraintLabel: 'Best Performer',
                points: 10,
                role: '', // Best performer doesn't target a specific assignable role
                criteriaSelections: {}
             });
        }
    }

    // Ensure at least one default criterion if none exist (excluding Best Performer)
    if (updated.filter((c: EventCriteria) => !isBestPerformerCriterion(c)).length === 0 && format !== 'Competition') {
        updated.unshift({ // Add to the beginning
            constraintIndex: Date.now(), // Unique key
            constraintLabel: 'Overall Performance',
            points: 10, // Default points
            role: assignableXpRoles.value[0] || '', // Default role
            criteriaSelections: {}
        });
    }

    localCriteria.value = updated;
    emitCriteriaUpdate(); // Emit after initialization/update
}, { immediate: true, deep: true });

// --- Methods ---
function getCriterionKey(criterion: EventCriteria, index: number): string | number {
  // Use constraintIndex if it's a valid number, otherwise use index for temporary key
  return typeof criterion.constraintIndex === 'number' ? criterion.constraintIndex : `temp-${index}`;
}


function emitCriteriaUpdate() {
  // Filter out potentially empty criteria before emitting
  const validCriteria = localCriteria.value.filter(c => c.constraintLabel || isBestPerformerCriterion(c));
  emit('update:criteria', JSON.parse(JSON.stringify(validCriteria))); // Emit deep copy
}

function addCriterion() {
  if (!canAddMoreCriteria.value) return;

  const newCriterion: EventCriteria = {
    constraintIndex: Date.now(), // Unique temporary key
    constraintLabel: '',
    points: 1,
    role: '',
    criteriaSelections: {}
  };

  // Insert before Best Performer if it exists
  const bestPerformerIndex = localCriteria.value.findIndex(isBestPerformerCriterion);
  if (bestPerformerIndex !== -1) {
      localCriteria.value.splice(bestPerformerIndex, 0, newCriterion);
  } else {
      localCriteria.value.push(newCriterion);
  }

  emitCriteriaUpdate();
}

function removeCriterion(idx: number) {
    // Prevent removing the last non-best-performer criterion
   if (userAddedCriteriaCount.value <= 1 && !isBestPerformerCriterion(localCriteria.value[idx])) {
       return;
   }
   localCriteria.value.splice(idx, 1);
   emitCriteriaUpdate();
}

function getCriterionMaxPoints(idx: number): number {
    // Max points is 50 minus sum of other criteria points
    const sumOthers = localCriteria.value.reduce((sum, c, i) => {
        // Exclude the current criterion and the fixed Best Performer points
        if (i === idx || isBestPerformerCriterion(c)) {
            return sum;
        }
        return sum + (Number(c.points) || 0);
    }, 0);

    // Also subtract the fixed 10 points for Best Performer if it exists
    const bestPerformerPoints = localCriteria.value.some(isBestPerformerCriterion) ? 10 : 0;

    return Math.max(1, 50 - sumOthers - bestPerformerPoints); // Ensure max is at least 1
}

function handlePointsInput(idx: number) {
    // Ensure points are within valid range [1, max]
    const criterion = localCriteria.value[idx];
    const maxPoints = getCriterionMaxPoints(idx);
    criterion.points = Math.max(1, Math.min(Number(criterion.points) || 1, maxPoints));
    emitCriteriaUpdate();
}

function isBestPerformerCriterion(criterion: EventCriteria): boolean {
    // Check based on the specific label used
    return criterion.constraintLabel === 'Best Performer';
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
</style>