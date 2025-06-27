<template>
  <div>
    <h5 class="h5 mb-4">{{ pageTitle }}</h5>

    <div class="d-flex flex-column gap-3">
      <div
        v-for="allocation in criteria"
        :key="`criteria-${allocation.constraintIndex}`"
        class="p-3 border rounded bg-light"
      >
        <h6 class="h6 mb-2">
          {{ allocation.title }}
          <span class="badge bg-primary-subtle text-primary-emphasis ms-2">{{ allocation.points }} XP</span>
        </h6>
        <small class="text-muted d-block mb-3" v-if="allocation.role && !(isManualMode && isIndividualCompetition)">
          Role: {{ formatRoleName(allocation.role) }}
        </small>

        <div class="mb-2">
          <label :for="`winner-select-${allocation.constraintIndex}`" class="form-label small mb-1">
            {{ (isManualMode && isIndividualCompetition) ? 'Select Award Winner' : (isManualMode ? 'Select Award Winners' : 'Select Winner') }}
          </label>

          <!-- Manual Mode Multi-Select for Non-Competition -->
          <select
            v-if="isManualMode && !isIndividualCompetition"
            :id="`winner-select-${allocation.constraintIndex}`"
            class="form-select form-select-sm"
            :value="manualSelections[`constraint${allocation.constraintIndex}`] || []"
            @change="handleManualMultiSelectionChange(allocation.constraintIndex, $event)"
            :disabled="isSubmitting"
            multiple
          >
            <option
              v-for="participantId in availableParticipants"
              :key="`manual-multi-opt-${allocation.constraintIndex}-${participantId}`"
              :value="participantId"
            >
              {{ getParticipantName(participantId) }}
            </option>
          </select>

          <!-- Manual Mode Single-Select for Competition -->
          <select
            v-else-if="isManualMode && isIndividualCompetition"
            :id="`winner-select-${allocation.constraintIndex}`"
            class="form-select form-select-sm"
            :value="manualSelections[`constraint${allocation.constraintIndex}`] || ''"
            @change="handleManualSelectionChange(allocation.constraintIndex, $event)"
            :disabled="isSubmitting"
          >
            <option value="">{{ (isManualMode && isIndividualCompetition) ? 'Choose award winner...' : 'Choose winner...' }}</option>
            <option
              v-for="participantId in availableParticipants"
              :key="`manual-opt-${allocation.constraintIndex}-${participantId}`"
              :value="participantId"
            >
              {{ getParticipantName(participantId) }}
            </option>
          </select>

          <!-- Voting Mode Dropdown -->
          <select
            v-else
            :id="`winner-select-${allocation.constraintIndex}`"
            class="form-select form-select-sm"
            :value="individualSelections[`constraint${allocation.constraintIndex}`] || ''"
            @change="handleVoteChange(allocation.constraintIndex, $event)"
            :disabled="isSubmitting"
            required
          >
            <option value="">Choose winner...</option>
            <option
              v-for="participantId in selectableParticipants"
              :key="`vote-opt-${allocation.constraintIndex}-${participantId}`"
              :value="participantId"
            >
              {{ getParticipantName(participantId) }}
              <span v-if="participantId === currentUserId && participantId !== ''">(You - Cannot Select)</span>
            </option>
          </select>

          <small class="text-danger mt-1 d-block" v-if="!isManualMode && hasSelectedSelf(allocation.constraintIndex)">
            You cannot vote for yourself in this category.
          </small>
        </div>
      </div>
    </div>
    <div v-if="criteria.length === 0" class="alert alert-warning">
      No {{ (isManualMode && isIndividualCompetition) ? 'awards' : 'criteria' }} available for selection.
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted, type PropType } from 'vue';
import type { EventCriteria } from '@/types/event';
import { formatRoleName } from '@/utils/formatters';
import { EventFormat } from '@/types/event';

const props = defineProps({
  criteria: {
    type: Array as PropType<EventCriteria[]>,
    required: true
  },
  participants: {
    type: Array as PropType<string[]>,
    required: true
  },
  currentUserId: {
    type: String,
    default: ''
  },
  isManualMode: {
    type: Boolean,
    default: false
  },
  isSubmitting: {
    type: Boolean,
    default: false
  },
  eventFormat: {
    type: String as PropType<EventFormat>,
    required: true
  },
  isIndividualCompetition: { // Prop to indicate if it's an individual competition
    type: Boolean,
    default: false
  },
  coreParticipants: {
    type: Array as PropType<string[]>,
    default: () => []
  },
  existingVotes: {
    type: Object as PropType<Record<string, string>>,
    default: () => ({})
  },
  existingManualSelections: { // Expects keys like "constraint0", "constraint1"
    type: Object as PropType<Record<string, string | string[]>>,
    default: () => ({})
  },
  getUserNameFn: {
    type: Function as PropType<(uid: string) => string>,
    required: true
  }
});

const emit = defineEmits<{
  'update:individualVoting': [value: Record<string, string>];
  'update:manualSelections': [value: Record<string, string | string[]>];
}>();

const individualSelections = ref<Record<string, string>>({});
const manualSelections = ref<Record<string, string | string[]>>({}); // Local state, keys "constraintX"

const pageTitle = computed(() => {
  if (props.isManualMode) {
    return props.isIndividualCompetition ? 'Manually Select Award Winners' : 'Manually Set Winners';
  }
  return 'Select Winners for Each criteria:';
});

const availableParticipants = computed<string[]>(() => {
  // For individual competitions in manual mode, selection should be from core participants only.
  if (props.isManualMode && props.isIndividualCompetition) {
    return props.coreParticipants;
  }
  // For other cases (regular individual event manual mode, or voting mode for non-competition individual events)
  return props.coreParticipants.length > 0 ? props.coreParticipants : props.participants;
});

const selectableParticipants = computed<string[]>(() => {
  if (props.isManualMode) {
    // In manual mode (including individual competitions), all availableParticipants are selectable.
    // availableParticipants already correctly sources from coreParticipants for individual competitions.
    return availableParticipants.value;
  }
  // In voting mode (not applicable for individual competitions as per SelectionView logic, but kept for robustness)
  // filter out the current user.
  return availableParticipants.value.filter(id => id !== props.currentUserId);
});

const getParticipantName = (userId: string): string => {
  if (!userId) return 'N/A';
  return props.getUserNameFn(userId) || `User ID: ${userId.substring(0,5)}...`;
};

const hasSelectedSelf = (constraintIndex: number): boolean => {
  if (props.isManualMode || !props.currentUserId) return false;
  const key = `constraint${constraintIndex}`;
  return individualSelections.value[key] === props.currentUserId;
};

const initializeSelections = () => {
  const newIndividual: Record<string, string> = {};
  const newManual: Record<string, string | string[]> = {};
  // Use coreParticipants if it's an individual competition in manual mode for validation of existing selections
  const currentAvailableP = (props.isManualMode && props.isIndividualCompetition) 
                            ? props.coreParticipants 
                            : availableParticipants.value;

  props.criteria.forEach(criteria => {
    if (typeof criteria.constraintIndex === 'number') {
      const key = `constraint${criteria.constraintIndex}`;

      newIndividual[key] = props.existingVotes[key] || '';

      const existingManualSel = props.existingManualSelections[key]; // Check prop for this specific key
      if (props.isManualMode && existingManualSel) {
        if (Array.isArray(existingManualSel)) {
          // Filter out any IDs that are no longer valid participants
          newManual[key] = existingManualSel.filter(id => currentAvailableP.includes(id));
        } else if (currentAvailableP.includes(existingManualSel)) {
          newManual[key] = existingManualSel;
        } else {
          newManual[key] = ''; // Reset if single selection is invalid
        }
      } else {
        newManual[key] = props.isIndividualCompetition ? '' : []; // Default to array for multi-select
      }
    }
  });

  individualSelections.value = newIndividual;
  manualSelections.value = newManual; // This updates the local state for the dropdowns
};

const handleManualSelectionChange = (constraintIndex: number, event: Event) => {
  const target = event.target as HTMLSelectElement;
  const key = `constraint${constraintIndex}`;
  const newSelections = { ...manualSelections.value, [key]: target.value };
  manualSelections.value = newSelections; // Update local state first
  emit('update:manualSelections', newSelections); // Emit to parent
};

const handleManualMultiSelectionChange = (constraintIndex: number, event: Event) => {
  const target = event.target as HTMLSelectElement;
  const key = `constraint${constraintIndex}`;
  const selectedValues = Array.from(target.selectedOptions).map(option => option.value);
  const newSelections = { ...manualSelections.value, [key]: selectedValues };
  manualSelections.value = newSelections;
  emit('update:manualSelections', newSelections);
};

const handleVoteChange = (constraintIndex: number, event: Event) => {
  const target = event.target as HTMLSelectElement;
  const key = `constraint${constraintIndex}`;
  const newSelections = { ...individualSelections.value, [key]: target.value };
  individualSelections.value = newSelections;
  emit('update:individualVoting', newSelections);
};

watch(
  [
    () => props.criteria,
    () => props.existingVotes,
    () => props.existingManualSelections, // Crucial: if this prop changes, re-initialize
    () => props.isManualMode,
    () => props.coreParticipants,
    () => props.participants,
    () => props.currentUserId,
    () => props.isIndividualCompetition // Ensure watcher reacts to this prop change
  ],
  () => {
    initializeSelections();
  },
  { immediate: true, deep: true }
);

onMounted(() => {
  initializeSelections();
});
</script>

<style scoped>
.form-select:focus {
  border-color: var(--bs-primary);
  box-shadow: 0 0 0 0.2rem rgba(var(--bs-primary-rgb), 0.25);
}
.form-label {
  color: var(--bs-dark);
  font-weight: 500;
}
.text-muted {
  color: var(--bs-secondary) !important;
}
.form-select-sm {
  font-size: 0.875rem;
}
.alert-info small {
  display: block;
  word-break: break-all;
}
</style>
