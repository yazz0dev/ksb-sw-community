<template>
  <div class="multi-event-form">
    <!-- Validation Summary -->
    <div v-if="localPhases.length > 0" class="alert alert-sm py-2 mb-3" :class="{
      'alert-success': isFormValid,
      'alert-warning': !isFormValid && localPhases.length > 0,
      'alert-info': localPhases.length === 0
    }">
      <i class="fas me-1" :class="{
        'fa-check-circle': isFormValid,
        'fa-exclamation-triangle': !isFormValid && localPhases.length > 0,
        'fa-info-circle': localPhases.length === 0
      }"></i>
      {{ validationSummary }}
    </div>

    <div v-if="localPhases.length === 0" class="alert alert-info">
      Click "Add Phase" to define the stages or sub-events for this multi-event.
    </div>

    <div v-for="(phase, index) in localPhases" :key="phase.id" class="phase-card card mb-4 shadow-sm">
      <div class="card-header bg-light d-flex justify-content-between align-items-center py-2">
        <div class="d-flex align-items-center">
          <h6 class="mb-0 text-dark me-2">Phase {{ index + 1 }}: {{ phase.phaseName || 'New Phase' }}</h6>
          <!-- Phase Validation Indicator -->
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
        <!-- Phase Validation Errors -->
        <div v-if="validationState.phases[index] && !validationState.phases[index].isValid" class="alert alert-warning alert-sm py-2 mb-3">
          <small>
            <i class="fas fa-exclamation-triangle me-1"></i>
            <strong>Issues to fix:</strong>
            <ul class="mb-0 mt-1 ps-3">
              <li v-for="error in validationState.phases[index].errors" :key="error" class="small">{{ error }}</li>
            </ul>
          </small>
        </div>

        <div class="row g-3">
          <!-- Phase Format Selection -->
          <div class="col-12">
            <label class="form-label fw-medium">Phase Format <span class="text-danger">*</span></label>
            <div class="d-flex flex-wrap gap-3">
              <div class="form-check">
                <input 
                  class="form-check-input" 
                  type="radio" 
                  :name="`phaseFormat-${phase.id}`" 
                  :id="`formatIndividual-${phase.id}`" 
                  :value="EventFormat.Individual" 
                  v-model="phase.format" 
                  :disabled="isSubmitting"
                >
                <label class="form-check-label" :for="`formatIndividual-${phase.id}`">Individual</label>
              </div>
              <div class="form-check">
                <input 
                  class="form-check-input" 
                  type="radio" 
                  :name="`phaseFormat-${phase.id}`" 
                  :id="`formatTeam-${phase.id}`" 
                  :value="EventFormat.Team" 
                  v-model="phase.format" 
                  :disabled="isSubmitting"
                >
                <label class="form-check-label" :for="`formatTeam-${phase.id}`">Team</label>
              </div>
            </div>
          </div>

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
                :isIndividualCompetition="phase.format === EventFormat.Individual && props.isOverallCompetition"
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
import { ref, watch, computed, onUnmounted, type PropType } from 'vue';
import { EventFormat, type EventPhase, type Team, type EventCriteria, type EventFormData } from '@/types/event';
import type { UserData } from '@/types/student';
import EventParticipantForm from '@/components/forms/EventParticipantForm.vue';
import ManageTeamsComponent from '@/components/forms/ManageTeamsComponent.vue';
import EventCriteriaForm from '@/components/forms/EventCriteriaForm.vue';
import EventBasicDetailsForm from '@/components/forms/EventBasicDetailsForm.vue';

// Constants
const MAX_PARTICIPANTS_PER_PHASE = 50;
const assignableXpRoles = ['developer', 'designer', 'presenter', 'problemSolver'];

const props = defineProps({
  modelValue: {
    type: Array as PropType<EventPhase[]>,
    default: () => [],
    required: true,
  },
  isSubmitting: {
    type: Boolean,
    default: false,
  },
  isOverallCompetition: {
    type: Boolean,
    default: false,
  },
  allUsers: {
    type: Array as PropType<UserData[]>,
    default: () => [],
    required: true,
  },
  nameCache: {
    type: Object as PropType<Record<string, string>>,
    default: () => ({}),
  },
});

const emit = defineEmits<{
  'update:modelValue': [value: EventPhase[]];
  'submit': [];
  'error': [message: string];
  'validity-change': [isValid: boolean];
}>();

const localPhases = ref<EventPhase[]>([]);
const validityTimeout = ref<number | null>(null);

// Initialize localPhases properly
const initializeLocalPhases = () => {
  localPhases.value = (props.modelValue || []).map(phase => ({ 
    ...phase,
    id: phase.id || crypto.randomUUID(),
    participants: phase.participants || [],
    coreParticipants: phase.coreParticipants || [],
    criteria: phase.criteria || [],
    teams: phase.teams || [],
    type: phase.type || '',
    rules: phase.rules ?? null,
    prize: phase.prize ?? null,
    allowProjectSubmission: Boolean(phase.allowProjectSubmission)
  }));
};

// Initialize on mount
initializeLocalPhases();

// Helper function to get event types based on phase format
const getEventTypesForFormat = (format: EventFormat): string[] => {
  // You'll need to import these from your event types utility
  // For now, returning basic arrays - replace with actual imports
  switch (format) {
    case EventFormat.Team: 
      return ['Hackathon', 'Project Competition', 'Case Study', 'Design Challenge'];
    case EventFormat.Individual:
    default: 
      return ['Quiz', 'Presentation', 'Code Challenge', 'Interview'];
  }
};

// Helper function to convert EventPhase to EventFormData['details'] for EventBasicDetailsForm
const getPhaseAsEventDetails = (phase: EventPhase): EventFormData['details'] => {
  return {
    eventName: phase.phaseName,
    description: phase.description,
    format: phase.format,
    type: phase.type,
    organizers: [], // Not used for phases
    coreParticipants: phase.coreParticipants || [],
    allowProjectSubmission: Boolean(phase.allowProjectSubmission),
    date: { start: null, end: null }, // Dates managed at parent level
    rules: phase.rules,
    prize: phase.prize,
    isCompetition: false // Default for phases
  };
};

// Helper function to update phase from EventBasicDetailsForm output
const updatePhaseFromEventDetails = (phaseIndex: number, details: EventFormData['details']) => {
  if (localPhases.value[phaseIndex]) {
    const phase = localPhases.value[phaseIndex];
    phase.phaseName = details.eventName;
    phase.description = details.description;
    // Don't update format from EventBasicDetailsForm since we handle it separately
    phase.type = details.type || '';
    phase.rules = details.rules ?? null;
    
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
  if (newVal && Array.isArray(newVal)) {
    initializeLocalPhases();
  }
}, { deep: true });

// Enhanced validation with detailed error tracking
const validationState = ref<{
  phases: Array<{
    isValid: boolean;
    errors: string[];
  }>
}>({
  phases: []
});

// Add validation computed property with detailed phase validation
const isFormValid = computed(() => {
  if (localPhases.value.length === 0) {
    return false;
  }
  
  // Update validation state for each phase
  validationState.value.phases = localPhases.value.map((phase: EventPhase) => {
    const errors: string[] = [];
    
    // Basic details validation
    if (!phase.phaseName?.trim()) {
      errors.push('Phase name is required');
    }
    if (!phase.description?.trim()) {
      errors.push('Phase description is required');
    }
    if (!phase.type?.trim()) {
      errors.push('Phase type is required');
    }
    
    // Participants validation
    if (!phase.participants || phase.participants.length === 0) {
      errors.push('At least one participant is required');
    }
    
    // Core participants validation for Individual format
    if (phase.format === EventFormat.Individual && (!phase.coreParticipants || phase.coreParticipants.length === 0)) {
      errors.push('At least one core participant is required for Individual format');
    }
    
    // Criteria validation
    if (!phase.criteria || phase.criteria.length === 0) {
      errors.push('At least one rating criterion is required');
    } else {
      const invalidCriteria = phase.criteria.filter(c => 
        !c.title?.trim() || !c.role?.trim() || !c.points || c.points <= 0
      );
      if (invalidCriteria.length > 0) {
        errors.push(`${invalidCriteria.length} rating criteria are incomplete`);
      }
    }
    
    // Teams validation for Team format
    if (phase.format === EventFormat.Team) {
      if (!phase.teams || phase.teams.length === 0) {
        errors.push('At least one team is required for Team format');
      } else {
        const invalidTeams = phase.teams.filter(team => 
          !team.teamName?.trim() || !team.members || team.members.length < 2
        );
        if (invalidTeams.length > 0) {
          errors.push(`${invalidTeams.length} teams are invalid (need name and 2+ members)`);
        }
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  });
  
  return validationState.value.phases.every(phase => phase.isValid);
});

// Add computed property for validation summary
const validationSummary = computed(() => {
  if (localPhases.value.length === 0) {
    return 'No phases defined. Add at least one phase to continue.';
  }
  
  const invalidPhases = validationState.value.phases.filter(p => !p.isValid);
  if (invalidPhases.length === 0) {
    return `All ${localPhases.value.length} phases are valid.`;
  }
  
  return `${invalidPhases.length} of ${localPhases.value.length} phases have validation errors.`;
});

// Enhanced phase validation handlers
const validatePhase = (phaseIndex: number): boolean => {
  const phase = localPhases.value[phaseIndex];
  if (!phase) return false;
  
  const hasBasicDetails = !!(phase.phaseName?.trim() && phase.description?.trim() && phase.type?.trim());
  const hasValidParticipants = phase.participants && phase.participants.length > 0;
  const hasValidCriteria = phase.criteria && phase.criteria.length > 0 && 
    phase.criteria.every(c => c.title?.trim() && c.role?.trim() && c.points > 0);
  
  // For Individual format, check core participants
  if (phase.format === EventFormat.Individual) {
    const hasValidCoreParticipants = phase.coreParticipants && phase.coreParticipants.length > 0;
    return hasBasicDetails && hasValidParticipants && hasValidCriteria && hasValidCoreParticipants;
  }
  
  // For team format, also check teams
  if (phase.format === EventFormat.Team) {
    const hasValidTeams = phase.teams && phase.teams.length > 0 &&
      phase.teams.every(team => team.teamName?.trim() && team.members?.length >= 2);
    return hasBasicDetails && hasValidParticipants && hasValidCriteria && hasValidTeams;
  }
  
  return hasBasicDetails && hasValidParticipants && hasValidCriteria;
};

// Watch form validity and emit changes with debouncing
watch(isFormValid, (newValid) => {
  if (validityTimeout.value) {
    clearTimeout(validityTimeout.value);
  }
  
  validityTimeout.value = window.setTimeout(() => {
    emit('validity-change', newValid);
  }, 100);
}, { immediate: true });

// Enhanced phase management
const addPhase = () => {
  const newPhase: EventPhase = {
    id: crypto.randomUUID(),
    phaseName: `Phase ${localPhases.value.length + 1}`,
    format: EventFormat.Individual,
    type: '',
    description: '', 
    participants: [],
    coreParticipants: [],
    criteria: [],
    teams: [],
    rules: null,
    prize: null,
    allowProjectSubmission: false
  };

  localPhases.value.push(newPhase);
  emit('update:modelValue', localPhases.value);
};

const removePhase = (index: number) => {
  if (localPhases.value.length <= 1) {
    emit('error', 'Cannot remove the last phase. At least one phase is required.');
    return;
  }
  
  localPhases.value.splice(index, 1);
  emit('update:modelValue', localPhases.value);
};

// Enhanced phase format change handler
watch(localPhases, (phases) => {
  if (!Array.isArray(phases)) return;
  
  phases.forEach((phase: EventPhase) => {
    // Ensure phase has required properties
    if (!phase.id) {
      phase.id = crypto.randomUUID();
    }
    
    // Reset type if it's not valid for the current format
    const validTypes = getEventTypesForFormat(phase.format);
    if (phase.type && !validTypes.includes(phase.type)) {
      phase.type = '';
    }
    
    // Clear format-specific data when format changes
    if (phase.format === EventFormat.Individual && phase.teams && phase.teams.length > 0) {
      phase.teams = [];
    }
    
    // Ensure core participants are cleared for Team format
    if (phase.format === EventFormat.Team) {
      phase.coreParticipants = [];
    }

    // Ensure boolean properties are correctly typed
    phase.allowProjectSubmission = Boolean(phase.allowProjectSubmission);
  });
  
  // Emit updated phases
  emit('update:modelValue', phases);
}, { deep: true });

// Add cleanup on unmount
onUnmounted(() => {
  if (validityTimeout.value) {
    clearTimeout(validityTimeout.value);
  }
});

</script>

<style scoped>
.alert-sm {
  padding: 0.5rem 0.75rem;
  font-size: 0.875rem;
}

.badge {
  font-size: 0.75em;
}

.phase-card .card-header {
  background-color: var(--bs-light-bg-subtle) !important;
}

.phase-card:not(:last-child) {
  margin-bottom: 1.5rem;
}
</style>



