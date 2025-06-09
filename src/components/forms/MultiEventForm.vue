<template>
  <div class="multi-event-form">
    <div v-if="localPhases.length === 0" class="alert alert-info">
      Click "Add Phase" to define the stages or sub-events for this multi-event.
    </div>

    <div v-for="(phase, index) in localPhases" :key="phase.id" class="phase-card card mb-4 shadow-sm">
      <div class="card-header bg-light d-flex justify-content-between align-items-center py-2">
        <h6 class="mb-0 text-dark">Phase {{ index + 1 }}: {{ phase.phaseName || 'New Phase' }}</h6>
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
        <div class="row g-3">
          <!-- Using EventBasicDetailsForm for consistency -->
          <div class="col-12">
            <EventBasicDetailsForm
              :details="getPhaseAsEventDetails(phase)"
              @update:details="updatePhaseFromEventDetails(index, $event)"
              :isSubmitting="isSubmitting"
              :isEditing="false"
              :isPhaseForm="true"
            />
          </div>

          <!-- Phase Prize (Optional, shown if overall event is a competition) -->
          <div v-if="props.isOverallCompetition" class="col-md-6">
            <label :for="`phasePrize-${phase.id}`" class="form-label fw-medium">Phase Prize (Optional)</label>
            <input
              :id="`phasePrize-${phase.id}`"
              type="text"
              class="form-control form-control-sm"
              v-model.trim="phase.prize"
              placeholder="e.g., Vouchers for phase winner"
              :disabled="isSubmitting"
            />
          </div>
          
          <!-- Allow Project Submission for Phase -->
          <div class="col-12">
            <div class="form-check form-switch">
              <input
                class="form-check-input"
                type="checkbox"
                role="switch"
                :id="`phaseAllowSubmission-${phase.id}`"
                v-model="phase.allowProjectSubmission"
                :disabled="isSubmitting"
              />
              <label class="form-check-label fw-medium" :for="`phaseAllowSubmission-${phase.id}`">
                Allow Project Submissions for this Phase
              </label>
            </div>
          </div>

          <!-- Phase Specific Configurations -->
          <div class="col-12 mt-3 border-top pt-3">
            <h6 class="text-muted small mb-2">Phase Specific Details:</h6>
            <!-- Phase Participants -->
            <div class="mb-2">
              <label class="form-label form-label-sm">Participants for this Phase:</label>
              <EventParticipantForm
                :participants="getPhaseParticipants(phase)"
                :coreParticipants="getPhaseCoreParticipants(phase)"
                @update:participants="updatePhaseParticipants(index, $event)"
                @update:coreParticipants="updatePhaseCoreParticipants(index, $event)"
                :allUsers="props.allUsers"
                :eventFormat="phase.format"
                :isSubmitting="isSubmitting"
                :nameCache="props.nameCache"
                :is-editing="false"
                :max-participants="MAX_PARTICIPANTS_PER_PHASE"
              />
            </div>

            <!-- Phase Teams (if phase format is Team) -->
            <div v-if="phase.format === EventFormat.Team" class="mb-2">
              <label class="form-label form-label-sm">Teams for this Phase:</label>
              <ManageTeamsComponent
                :initial-teams="phase.teams || []"
                :students="props.allUsers.filter(u => phase.participants?.includes(u.uid))"
                :is-submitting="isSubmitting"
                :can-auto-generate="true"
                :event-id="''"
                @update:teams="(teams: Team[]) => updatePhaseTeams(index, teams)"
                @error="(msg: string) => handleError(msg)"
              />
            </div>
            
            <!-- Phase Criteria -->
            <div>
              <label class="form-label form-label-sm">Rating Criteria for this Phase:</label>
              <EventCriteriaForm
                :criteria="getPhaseCriteria(phase)"
                @update:criteria="updatePhaseCriteria(index, $event)"
                :isSubmitting="isSubmitting"
                :eventFormat="phase.format"
                :assignableXpRoles="assignableXpRoles"
                :totalXP="calculateTotalXP(phase.criteria)"
              />
            </div>
          </div>

        </div>
      </div>
    </div>

    <button
      type="button"
      class="btn btn-primary btn-sm mt-3"
      @click="addPhase"
      :disabled="isSubmitting"
    >
      <i class="fas fa-plus me-1"></i> Add Phase
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, type PropType } from 'vue';
import { EventFormat, type EventPhase, type Team, type EventCriteria, type EventFormData } from '@/types/event';
import type { UserData } from '@/types/student';
import EventParticipantForm from '@/components/forms/EventParticipantForm.vue';
import ManageTeamsComponent from '@/components/forms/ManageTeamsComponent.vue';
import EventCriteriaForm from '@/components/forms/EventCriteriaForm.vue';
import EventBasicDetailsForm from '@/components/forms/EventBasicDetailsForm.vue';
import { teamEventTypes } from '@/utils/eventTypes';
import { individualEventTypes } from '@/utils/eventTypes';

// Constants
const MAX_PARTICIPANTS_PER_PHASE = 50; // Maximum participants per phase
const assignableXpRoles = ['developer', 'designer', 'presenter', 'problemSolver'];

const props = defineProps({
  modelValue: {
    type: Array as PropType<EventPhase[]>,
    default: () => [],
  },
  isSubmitting: {
    type: Boolean,
    default: false,
  },
  isOverallCompetition: { // New prop
    type: Boolean,
    default: false,
  },
  allUsers: { // Prop for participant selection within phases
    type: Array as PropType<UserData[]>,
    default: () => [],
  },
  nameCache: {
    type: Object as PropType<Record<string, string>>,
    default: () => ({}),
  },
});

const emit = defineEmits<{
  (e: 'update:modelValue', value: EventPhase[]): void;
  (e: 'submit'): void;
  (e: 'error', message: string): void;
}>();

const localPhases = ref<EventPhase[]>(props.modelValue.map(phase => ({ ...phase })));

// Helper function to convert EventPhase to EventFormData['details'] for EventBasicDetailsForm
const getPhaseAsEventDetails = (phase: EventPhase): EventFormData['details'] => {
  return {
    eventName: phase.phaseName,
    description: phase.description,
    format: phase.format,
    type: phase.type,
    organizers: [], // Not used for phases
    coreParticipants: phase.coreParticipants || [],
    allowProjectSubmission: phase.allowProjectSubmission,
    date: { start: null, end: null }, // Dates managed at parent level
    rules: phase.rules,
    prize: phase.prize
  };
};

// Helper function to update phase from EventBasicDetailsForm output
const updatePhaseFromEventDetails = (phaseIndex: number, details: EventFormData['details']) => {
  if (localPhases.value[phaseIndex]) {
    const phase = localPhases.value[phaseIndex];
    phase.phaseName = details.eventName;
    phase.description = details.description;
    phase.format = details.format as EventFormat.Individual | EventFormat.Team;
    phase.type = details.type || '';
    phase.rules = details.rules ?? null; // Convert undefined to null to match EventPhase.rules type
    
    // Update teams array if format changed
    if (phase.format === EventFormat.Individual && phase.teams && phase.teams.length > 0) {
      phase.teams = []; // Clear teams if format changed to Individual
    }
    
    emit('update:modelValue', localPhases.value);
  }
};

// Helper functions to handle participants, coreParticipants, and criteria
const getPhaseParticipants = (phase: EventPhase): string[] => {
  return phase.participants || [];
};

const getPhaseCoreParticipants = (phase: EventPhase): string[] => {
  return phase.coreParticipants || [];
};

const getPhaseCriteria = (phase: EventPhase): EventCriteria[] => {
  return phase.criteria || [];
};

const updatePhaseParticipants = (phaseIndex: number, participants: string[]) => {
  if (localPhases.value[phaseIndex]) {
    localPhases.value[phaseIndex].participants = participants;
    emit('update:modelValue', localPhases.value);
  }
};

const updatePhaseCoreParticipants = (phaseIndex: number, coreParticipants: string[]) => {
  if (localPhases.value[phaseIndex]) {
    localPhases.value[phaseIndex].coreParticipants = coreParticipants;
    emit('update:modelValue', localPhases.value);
  }
};

const updatePhaseCriteria = (phaseIndex: number, criteria: EventCriteria[]) => {
  if (localPhases.value[phaseIndex]) {
    localPhases.value[phaseIndex].criteria = criteria;
    emit('update:modelValue', localPhases.value);
  }
};

const calculateTotalXP = (criteria: EventCriteria[] | null | undefined) => {
  if (!criteria) return 0;
  return criteria.reduce((sum, criterion) => sum + (criterion.points || 0), 0);
};

const updatePhaseTeams = (phaseIndex: number, teams: Team[]) => {
  if (localPhases.value[phaseIndex]) {
    localPhases.value[phaseIndex].teams = teams;
    emit('update:modelValue', localPhases.value);
  }
};

const handleError = (message: string) => {
  emit('error', message);
};

// Watch for external changes to modelValue prop
watch(() => props.modelValue, (newVal) => {
  localPhases.value = newVal.map(phase => ({ ...phase }));
}, { deep: true });

// Helper function to get event types based on phase format
const getEventTypesForFormat = (format: EventFormat) => {
  switch (format) {
    case EventFormat.Team: return teamEventTypes;
    case EventFormat.Individual:
    default: return individualEventTypes;
  }
};

const addPhase = () => {
  const newPhase: EventPhase = {
    id: crypto.randomUUID(), // Generate a unique ID for the new phase
    phaseName: '',
    format: EventFormat.Individual, // Default format for a new phase
    type: '',
    description: '', 
    participants: [], // Initialize as empty array instead of null
    coreParticipants: [], // Initialize as empty array instead of null
    criteria: [], // Initialize as empty array instead of null
    teams: [], // Initialize as empty array instead of null
    rules: null,
    prize: null,
    allowProjectSubmission: false
  };

  localPhases.value.push(newPhase);
  emit('update:modelValue', localPhases.value);
};

const removePhase = (index: number) => {
  localPhases.value.splice(index, 1);
  emit('update:modelValue', localPhases.value);
};

// Add a watch for phase format changes to reset type if not valid for the new format
watch(localPhases, (phases) => {
  phases.forEach(phase => {
    // Reset type if it's not valid for the current format
    if (phase.type && !getEventTypesForFormat(phase.format).includes(phase.type)) {
      phase.type = '';
    }
  });
}, { deep: true });

// Optional: Emit submit event for the entire form

</script>

<style scoped>
.phase-card {
  transition: transform 0.2s;
}

.phase-card:hover {
  transform: scale(1.02);
}
</style>
