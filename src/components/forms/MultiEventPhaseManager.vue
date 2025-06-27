<template>
  <div class="multi-event-phase-manager">
    <div v-if="localPhases.length === 0" class="alert alert-info text-center">
      <i class="fas fa-info-circle me-2"></i>
      A Multi-Stage Event requires at least one phase. Click "Add New Phase" to begin.
    </div>

    <div class="phases-list">
      <PhaseEditorCard
        v-for="(phase, index) in localPhases"
        :key="phase.id"
        class="mb-3"
        :phase="phase"
        :phase-number="index + 1"
        :is-submitting="isSubmitting"
        :overall-event-is-competition="overallEventIsCompetition"
        :all-users="allUsers"
        :name-cache="nameCache"
        @update:phase="(updatedPhase: EventPhase) => updatePhase(index, updatedPhase)"
        @remove-phase="() => removePhase(index)"
        @validity-change="(isValid: boolean) => handlePhaseValidityChange(index, isValid)"
        @error="handleError"
      />
    </div>

    <div class="mt-4 text-end">
      <button
        type="button"
        class="btn btn-success btn-sm"
        @click="addPhase"
        :disabled="isSubmitting"
      >
        <i class="fas fa-plus me-1"></i> Add New Phase
      </button>
    </div>

    <div v-if="localPhases.length > 0 && !areAllPhasesValid" class="alert alert-warning mt-3 small">
      <i class="fas fa-exclamation-triangle me-1"></i> Some phases have incomplete or invalid configurations. Please review each phase.
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, onMounted, nextTick } from 'vue';
import type { PropType } from 'vue';
import PhaseEditorCard from './PhaseEditorCard.vue';
import { EventFormat, type EventPhase } from '@/types/event';
import type { UserData } from '@/types/student';

const props = defineProps({
  modelValue: {
    type: Array as PropType<EventPhase[]>,
    default: () => [],
  },
  isSubmitting: {
    type: Boolean,
    default: false,
  },
  overallEventIsCompetition: {
    type: Boolean,
    default: false,
  },
  allUsers: {
    type: Array as PropType<UserData[]>,
    default: () => [],
  },
  nameCache: {
    type: Object as PropType<Record<string, string>>,
    default: () => ({}),
  },
});

const emit = defineEmits<{
  'update:modelValue': [phases: EventPhase[]];
  'validity-change': [isValid: boolean];
  'error': [message: string];
}>();

const localPhases = ref<EventPhase[]>([]);
const phaseValidityStates = ref<boolean[]>([]);
const isInitializing = ref(true);

// Initialize phases with proper defaults
const createDefaultPhase = (index: number): EventPhase => ({
  id: crypto.randomUUID(),
  phaseName: `Phase ${index + 1}`,
  description: '',
  format: EventFormat.Individual,
  type: '',
  participants: [],
  coreParticipants: [],
  criteria: [],
  teams: [],
  rules: null,
  prize: null,
  allowProjectSubmission: false,
});

const initializePhases = () => {
  const phases = props.modelValue.length > 0 
    ? props.modelValue.map(phase => ({
        ...phase,
        participants: phase.participants || [],
        coreParticipants: phase.coreParticipants || [],
        criteria: phase.criteria || [],
        teams: phase.teams || [],
      }))
    : [];
  
  localPhases.value = phases;
  phaseValidityStates.value = phases.map(() => false);
};

const areAllPhasesValid = computed(() => {
  if (localPhases.value.length === 0) return false;
  return phaseValidityStates.value.every(isValid => isValid);
});

function addPhase() {
  const newPhase = createDefaultPhase(localPhases.value.length);
  localPhases.value.push(newPhase);
  phaseValidityStates.value.push(false);
  emit('update:modelValue', [...localPhases.value]);
}

function removePhase(index: number) {
  if (localPhases.value.length <= 1) {
    emit('error', 'Cannot remove the last phase. At least one phase is required.');
    return;
  }
  
  localPhases.value.splice(index, 1);
  phaseValidityStates.value.splice(index, 1);
  emit('update:modelValue', [...localPhases.value]);
}

function updatePhase(index: number, updatedPhase: EventPhase) {
  if (localPhases.value[index]) {
    localPhases.value[index] = { ...updatedPhase };
    emit('update:modelValue', [...localPhases.value]);
  }
}

function handlePhaseValidityChange(index: number, isValid: boolean) {
  phaseValidityStates.value[index] = isValid;
}

function handleError(message: string) {
  emit('error', message);
}

watch(
  () => props.modelValue,
  () => {
    if (!isInitializing.value) {
      initializePhases();
    }
  },
  { deep: true }
);

watch(
  areAllPhasesValid,
  (newValue) => {
    if (!isInitializing.value) {
      emit('validity-change', newValue);
    }
  }
);

onMounted(() => {
  initializePhases();
  if (localPhases.value.length === 0) {
    addPhase(); // Add first phase by default
  }
  nextTick(() => {
    isInitializing.value = false;
    emit('validity-change', areAllPhasesValid.value);
  });
});
</script>

<style scoped>
.phases-list {
  min-height: 50px; /* Placeholder for when empty, helps with drag-drop libraries if needed */
}
.ghost-phase {
  opacity: 0.5;
  background: #f0f8ff; /* AliceBlue */
  border: 1px dashed #007bff;
}
.phase-drag-handle {
  cursor: grab;
}
.phase-drag-handle:active {
  cursor: grabbing;
}
</style>
