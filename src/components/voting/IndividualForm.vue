<template>
  <div>
    <h5 class="h5 mb-4">{{ isManualMode ? 'Manually Set Winners' : 'Select Winners for Each Criterion:' }}</h5>
    <div class="d-flex flex-column gap-3">
      <div
        v-for="allocation in criteria"
        :key="`ind-crit-${allocation.constraintIndex}`"
        class="p-3 border rounded bg-light"
      >
        <h6 class="h6 mb-2">
          {{ allocation.title }}
          <span class="badge bg-primary-subtle text-primary-emphasis ms-2">{{ allocation.points }} XP</span>
        </h6>
        <small class="text-muted d-block mb-3" v-if="allocation.role">
          Role: {{ formatRoleName(allocation.role) }}
        </small>
        <div class="mb-2">
          <label :for="`winner-select-${allocation.constraintIndex}`" class="form-label small mb-1">Select Winner</label>
          <!-- Manual Mode Select -->
          <select
            v-if="isManualMode"
            :id="`winner-select-manual-${allocation.constraintIndex}`"
            class="form-select form-select-sm"
            v-model="manualSelections[`constraint${allocation.constraintIndex}`]"
            required
            :disabled="isSubmitting"
          >
            <option value="" disabled>Choose winner...</option>
            <option
              v-for="participantId in participants"
              :key="`manual-ind-part-${participantId}`"
              :value="participantId"
            >
              {{ getUserName(participantId) }}
            </option>
          </select>
          <!-- Voting Mode Select -->
          <select
            v-else
            :id="`winner-select-vote-${allocation.constraintIndex}`"
            class="form-select form-select-sm"
            v-model="individualVoting[`constraint${allocation.constraintIndex}`]"
            required
            :disabled="isSubmitting"
          >
            <option value="" disabled>Choose winner...</option>
            <option
              v-for="participantId in selectableParticipants"
              :key="`vote-ind-part-${participantId}`"
              :value="participantId"
            >
              {{ getUserName(participantId) }}
              <span v-if="participantId === currentUserId">(You - Cannot Select)</span>
            </option>
          </select>
          <small class="text-danger" v-if="!isManualMode && individualVoting[`constraint${allocation.constraintIndex}`] === currentUserId">
            You cannot vote for yourself
          </small>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, PropType, watch } from 'vue';
import { EventCriteria } from '@/types/event';
import { formatRoleName } from '@/utils/formatters';

interface IndividualVoting {
  [constraintKey: string]: string;
}

interface ManualSelections {
  [constraintKey: string]: string;
}

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
  existingVotes: {
    type: Object as PropType<Record<string, string>>,
    default: () => ({})
  },
  existingManualSelections: {
    type: Object as PropType<Record<string, string>>,
    default: () => ({})
  },
  getUserNameFn: {
    type: Function as PropType<(uid: string) => string>,
    required: true
  }
});

const emit = defineEmits(['update:individualVoting', 'update:manualSelections']);

// Create reactive state to manage form inputs
const individualVoting = reactive<IndividualVoting>({...props.existingVotes});
const manualSelections = reactive<ManualSelections>({...props.existingManualSelections});

// Watch for changes in the voting data and emit events
watch(individualVoting, (newVal) => {
  emit('update:individualVoting', newVal);
}, { deep: true });

watch(manualSelections, (newVal) => {
  emit('update:manualSelections', newVal);
}, { deep: true });

// Computed properties
const selectableParticipants = computed(() => {
  if (!props.participants || !props.currentUserId) return props.participants;
  return props.participants.filter(pId => pId && pId !== props.currentUserId);
});

// Helper functions
const getUserName = (userId: string): string => {
  if (!userId) return 'Unknown User';
  return props.getUserNameFn(userId);
};
</script>

<style scoped>
.form-control:focus,
.form-select:focus {
  border-color: var(--bs-primary);
  box-shadow: 0 0 0 0.2rem rgba(var(--bs-primary-rgb), 0.25);
}

.card {
  background-color: var(--bs-card-bg);
  border: 1px solid var(--bs-border-color);
}

.card-header {
  background-color: var(--bs-tertiary-bg);
  border-bottom: 1px solid var(--bs-border-color);
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
</style>
