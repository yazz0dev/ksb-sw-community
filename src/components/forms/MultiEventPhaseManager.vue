<template>
  <div class="multi-event-phase-manager">
    <div v-if="localPhases.length === 0" class="alert alert-info text-center">
      <i class="fas fa-info-circle me-2"></i>
      A Multi-Stage Event requires at least one phase. Click "Add New Phase" to begin.
    </div>

    <draggable
      v-model="localPhases"
      item-key="id"
      handle=".phase-drag-handle"
      ghost-class="ghost-phase"
      animation="200"
      @end="onDragEnd"
      class="phases-list"
    >
      <template #item="{ element: phase, index }">
        <PhaseEditorCard
          :phase="phase"
          :phaseNumber="index + 1"
          :isSubmitting="isSubmitting"
          :overallEventIsCompetition="overallEventIsCompetition"
          :allUsers="allUsers"
          :nameCache="nameCache"
          @update:phase="updatedPhase => updatePhase(index, updatedPhase)"
          @remove-phase="() => removePhase(index)"
          @validity-change="isValid => handlePhaseValidityChange(index, isValid)"
          @error="handleError"
          class="mb-3"
        />
      </template>
    </draggable>

    <div class="mt-4 text-end">
      <button
        type="button"
        class="btn btn-success btn-sm btn-icon"
        @click="addPhase"
        :disabled="isSubmitting"
      >
        <i class="fas fa-plus me-1"></i> Add New Phase
      </button>
    </div>

    <!-- Validation Summary (Optional) -->
     <div v-if="localPhases.length > 0 && !areAllPhasesValid" class="alert alert-warning mt-3 small">
        <i class="fas fa-exclamation-triangle me-1"></i> Some phases have incomplete or invalid configurations. Please review each phase.
     </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, onMounted } from 'vue';
import type { PropType } from 'vue';
import draggable from 'vuedraggable';
import PhaseEditorCard from './PhaseEditorCard.vue'; // New component
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

// Initialize localPhases from modelValue
watch(() => props.modelValue, (newVal) => {
  localPhases.value = newVal ? JSON.parse(JSON.stringify(newVal)) : [];
  // Initialize validity states based on current phases
  phaseValidityStates.value = localPhases.value.map(() => false); // Default to false, PhaseEditorCard will report actual validity
}, { immediate: true, deep: true });


const areAllPhasesValid = computed(() => {
  if (localPhases.value.length === 0) return false; // Requires at least one phase for the manager to be "valid" in context of an event
  return phaseValidityStates.value.every(isValid => isValid);
});

// Emit overall validity change
watch(areAllPhasesValid, (newVal) => {
  emit('validity-change', newVal);
}, { immediate: true });

watch(localPhases, (newPhases) => {
    // If a phase is removed, ensure its validity state is also removed.
    if (newPhases.length < phaseValidityStates.value.length) {
        phaseValidityStates.value = newPhases.map((_, i) => phaseValidityStates.value[i] ?? false);
    }
}, {deep: true});


function addPhase() {
  const newPhase: EventPhase = {
    id: crypto.randomUUID(),
    phaseName: `New Phase ${localPhases.value.length + 1}`,
    description: '',
    format: EventFormat.Individual, // Default format
    type: '',
    participants: [],
    coreParticipants: [],
    criteria: [],
    teams: [],
    rules: null,
    prize: null,
    allowProjectSubmission: false,
  };
  localPhases.value.push(newPhase);
  phaseValidityStates.value.push(false); // New phase starts as invalid until configured
  emit('update:modelValue', localPhases.value);
}

function removePhase(index: number) {
  localPhases.value.splice(index, 1);
  phaseValidityStates.value.splice(index, 1);
  emit('update:modelValue', localPhases.value);
}

function updatePhase(index: number, updatedPhase: EventPhase) {
  if (localPhases.value[index]) {
    localPhases.value[index] = { ...localPhases.value[index], ...updatedPhase };
    emit('update:modelValue', localPhases.value);
  }
}

function handlePhaseValidityChange(index: number, isValid: boolean) {
  if (phaseValidityStates.value[index] !== undefined) {
    phaseValidityStates.value[index] = isValid;
  }
}

function handleError(message: string) {
  emit('error', message);
}

function onDragEnd() {
  // Emit updated modelValue after drag
  emit('update:modelValue', localPhases.value);
}

onMounted(() => {
  // Ensure initial validity check if modelValue has initial phases
  if (props.modelValue && props.modelValue.length > 0) {
    // PhaseEditorCard instances will emit their validity on their mount
    // but we need to ensure phaseValidityStates array is correctly sized.
     phaseValidityStates.value = props.modelValue.map(() => false); // Will be updated by children
  }
   emit('validity-change', areAllPhasesValid.value);
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
</style>
