<template>
  <div class="multi-event-phase-manager">
    <div v-if="localPhases.length === 0" class="alert alert-info text-center">
      <i class="fas fa-info-circle me-2"></i>
      A Multi-Stage Event requires at least one phase. Click "Add New Phase" to begin.
    </div>

    <div class="phases-list">
      <div
        v-for="(phase, index) in localPhases"
        :key="phase.id"
        class="phase-card card mb-3 shadow-sm"
      >
        <div class="card-header bg-light d-flex justify-content-between align-items-center py-2">
          <div class="d-flex align-items-center">
            <div class="phase-drag-handle me-2" title="Drag to reorder">
              <i class="fas fa-grip-vertical text-muted"></i>
            </div>
            <h6 class="mb-0 text-dark me-2">Phase {{ index + 1 }}: {{ phase.phaseName || 'New Phase' }}</h6>
            <span v-if="validatePhase(index)" class="badge bg-success-subtle text-success-emphasis rounded-pill">
              <i class="fas fa-check me-1"></i>Valid
            </span>
            <span v-else class="badge bg-warning-subtle text-warning-emphasis rounded-pill">
              <i class="fas fa-exclamation-triangle me-1"></i>Incomplete
            </span>
          </div>
          <button
            type="button"
            class="btn btn-sm btn-outline-danger py-1 px-2"
            @click="removePhase(index)"
            :disabled="isSubmitting"
            title="Remove Phase"
          >
            <i class="fas fa-trash"></i>
          </button>
        </div>
        <div class="card-body p-3 p-md-4">
          <!-- Use MultiEventForm for each phase -->
          <MultiEventForm
            :model-value="[phase]"
            @update:model-value="(phases) => updatePhase(index, phases[0])"
            :is-submitting="isSubmitting"
            :is-overall-competition="overallEventIsCompetition"
            :all-users="allUsers"
            :name-cache="nameCache"
            @validity-change="(isValid) => handlePhaseValidityChange(index, isValid)"
            @error="handleError"
          />
        </div>
      </div>
    </div>

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

    <div v-if="localPhases.length > 0 && !areAllPhasesValid" class="alert alert-warning mt-3 small">
      <i class="fas fa-exclamation-triangle me-1"></i> Some phases have incomplete or invalid configurations. Please review each phase.
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, onMounted } from 'vue';
import type { PropType } from 'vue';
import MultiEventForm from './MultiEventForm.vue';
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

function validatePhase(index: number): boolean {
  const phase = localPhases.value[index];
  if (!phase) return false;
  
  const hasBasicDetails = !!(phase.phaseName?.trim() && phase.description?.trim() && phase.type?.trim());
  const hasValidParticipants = phase.participants && phase.participants.length > 0;
  const hasValidCriteria = phase.criteria && phase.criteria.length > 0 && 
    phase.criteria.every(c => c.title?.trim() && c.role?.trim() && c.points > 0);
  
  if (phase.format === EventFormat.Individual) {
    const hasValidCoreParticipants = phase.coreParticipants && phase.coreParticipants.length > 0;
    return hasBasicDetails && hasValidParticipants && hasValidCriteria && hasValidCoreParticipants;
  }
  
  if (phase.format === EventFormat.Team) {
    const hasValidTeams = phase.teams && phase.teams.length > 0 &&
      phase.teams.every(team => team.teamName?.trim() && team.members?.length >= 2);
    return hasBasicDetails && hasValidParticipants && hasValidCriteria && hasValidTeams;
  }
  
  return hasBasicDetails && hasValidParticipants && hasValidCriteria;
}

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
