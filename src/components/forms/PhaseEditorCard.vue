<template>
  <div class="card phase-editor-card shadow-sm" :class="{ 'border-danger': !isPhaseInternallyValid && hasAttemptedSubmit }">
    <div class="card-header bg-light py-2 px-3">
      <div class="d-flex justify-content-between align-items-center">
        <div class="d-flex align-items-center">
          <span class="phase-drag-handle me-2 text-muted" title="Drag to reorder">
            <i class="fas fa-grip-vertical"></i>
          </span>
          <h6 class="mb-0 fw-medium text-dark">
            Phase {{ phaseNumber }}: {{ localPhase.phaseName || 'Untitled Phase' }}
          </h6>
          <span v-if="isPhaseInternallyValid" class="ms-2 badge bg-success-subtle text-success-emphasis rounded-pill small">
            <i class="fas fa-check me-1"></i>Valid
          </span>
          <span v-else class="ms-2 badge bg-warning-subtle text-warning-emphasis rounded-pill small">
            <i class="fas fa-exclamation-triangle me-1"></i>Incomplete
          </span>
        </div>
        <button
          type="button"
          class="btn btn-sm btn-outline-danger py-1 px-2"
          @click="requestRemovePhase"
          :disabled="isSubmitting"
          title="Remove Phase"
        >
          <i class="fas fa-trash"></i>
        </button>
      </div>
    </div>

    <div class="card-body p-3 p-md-4">
        <div class="row g-3">
            <!-- Phase Name -->
            <div class="col-md-6">
                <label :for="`phaseName-${phase.id}`" class="form-label fw-medium">Phase Name <span class="text-danger">*</span></label>
                <input type="text" class="form-control form-control-sm" :id="`phaseName-${phase.id}`" v-model.trim="localPhase.phaseName" :disabled="isSubmitting" required>
                <div class="invalid-feedback">Phase name is required.</div>
            </div>

            <!-- Phase Format -->
            <div class="col-md-6">
                <label class="form-label fw-medium">Phase Format <span class="text-danger">*</span></label>
                <div class="d-flex flex-wrap gap-3">
                    <div class="form-check">
                        <input class="form-check-input" type="radio" :name="`phaseFormat-${phase.id}`" :id="`formatIndividual-${phase.id}`" :value="EventFormat.Individual" v-model="localPhase.format" :disabled="isSubmitting">
                        <label class="form-check-label" :for="`formatIndividual-${phase.id}`">Individual</label>
                    </div>
                    <div class="form-check">
                        <input class="form-check-input" type="radio" :name="`phaseFormat-${phase.id}`" :id="`formatTeam-${phase.id}`" :value="EventFormat.Team" v-model="localPhase.format" :disabled="isSubmitting">
                        <label class="form-check-label" :for="`formatTeam-${phase.id}`">Team</label>
                    </div>
                </div>
            </div>

            <!-- Phase Type -->
            <div class="col-md-6">
                <label :for="`phaseType-${phase.id}`" class="form-label fw-medium">Phase Type <span class="text-danger">*</span></label>
                <!-- This should ideally be a select dropdown populated from a predefined list based on format -->
                <input type="text" class="form-control form-control-sm" :id="`phaseType-${phase.id}`" v-model.trim="localPhase.type" placeholder="e.g., Coding Challenge, Presentation" :disabled="isSubmitting" required>
                 <div class="invalid-feedback">Phase type is required.</div>
            </div>

            <!-- Allow Project Submission -->
            <div class="col-md-6 d-flex align-items-end">
                 <div class="form-check form-switch mb-2">
                    <input class="form-check-input" type="checkbox" role="switch" :id="`phaseAllowSubmission-${phase.id}`" v-model="localPhase.allowProjectSubmission" :disabled="isSubmitting || overallEventIsCompetition">
                    <label class="form-check-label fw-medium" :for="`phaseAllowSubmission-${phase.id}`">Allow Project Submissions</label>
                     <small v-if="overallEventIsCompetition" class="text-muted d-block">(Submissions managed by overall event competition structure)</small>
                </div>
            </div>


            <!-- Phase Description -->
            <div class="col-12">
                <label :for="`phaseDescription-${phase.id}`" class="form-label fw-medium">Description <span class="text-danger">*</span></label>
                <textarea class="form-control form-control-sm" :id="`phaseDescription-${phase.id}`" v-model.trim="localPhase.description" rows="3" :disabled="isSubmitting" required></textarea>
                <div class="invalid-feedback">Description is required.</div>
            </div>

            <!-- Phase Rules -->
            <div class="col-md-6">
                <label :for="`phaseRules-${phase.id}`" class="form-label fw-medium">Rules (Optional)</label>
                <textarea class="form-control form-control-sm" :id="`phaseRules-${phase.id}`" v-model.trim="localPhase.rules" rows="2" placeholder="Enter any specific rules for this phase" :disabled="isSubmitting"></textarea>
            </div>

            <!-- Phase Prize -->
            <div class="col-md-6">
                <label :for="`phasePrize-${phase.id}`" class="form-label fw-medium">Prize (Optional)</label>
                <input type="text" class="form-control form-control-sm" :id="`phasePrize-${phase.id}`" v-model.trim="localPhase.prize" placeholder="e.g., Vouchers for phase winner" :disabled="isSubmitting">
            </div>
        </div>

        <!-- Participants Section -->
        <hr class="my-3 my-md-4">
        <div class="phase-section">
            <h6 class="text-muted small mb-2"><i class="fas fa-users me-1"></i>Participants for this Phase <span class="text-danger">*</span></h6>
            <EventParticipantForm
                :participants="localPhase.participants || []"
                :coreParticipants="localPhase.coreParticipants || []"
                @update:participants="val => localPhase.participants = val"
                @update:coreParticipants="val => localPhase.coreParticipants = val"
                :allUsers="allUsers"
                :eventFormat="localPhase.format"
                :isSubmitting="isSubmitting"
                :nameCache="nameCache"
                :is-editing="true"
                :max-participants="50"
                @validity-change="isParticipantsValid = $event"
            />
            <small v-if="!isParticipantsValid && hasAttemptedSubmit" class="text-danger d-block mt-1">Participant configuration is required and must be valid.</small>
        </div>

        <!-- Teams Section (if phase format is Team) -->
        <div v-if="localPhase.format === EventFormat.Team" class="phase-section mt-3">
             <hr class="my-3 my-md-4">
            <h6 class="text-muted small mb-2"><i class="fas fa-users-cog me-1"></i>Teams for this Phase <span class="text-danger">*</span></h6>
            <ManageTeamsComponent
                :initial-teams="localPhase.teams || []"
                :students="allUsers.filter(u => localPhase.participants?.includes(u.uid))"
                :is-submitting="isSubmitting"
                :can-auto-generate="true"
                :event-id="phase.id"
                @update:teams="val => localPhase.teams = val"
                @error="handleError"
                @validity-change="isTeamsValid = $event"
            />
            <small v-if="!isTeamsValid && hasAttemptedSubmit" class="text-danger d-block mt-1">Team configuration is required and must be valid for Team format.</small>
        </div>

        <!-- Criteria Section -->
        <hr class="my-3 my-md-4">
        <div class="phase-section">
            <h6 class="text-muted small mb-2"><i class="fas fa-star me-1"></i>Rating Criteria for this Phase <span class="text-danger">*</span></h6>
            <EventCriteriaForm
                :criteria="localPhase.criteria || []"
                @update:criteria="val => localPhase.criteria = val"
                :isSubmitting="isSubmitting"
                :eventFormat="localPhase.format"
                :isIndividualCompetition="localPhase.format === EventFormat.Individual && overallEventIsCompetition"
                :assignableXpRoles="['developer', 'designer', 'presenter', 'problemSolver']"
                @validity-change="isCriteriaValid = $event"
            />
            <small v-if="!isCriteriaValid && hasAttemptedSubmit" class="text-danger d-block mt-1">Rating criteria are required and must be valid.</small>
        </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, type PropType, onMounted, nextTick } from 'vue';
import { EventFormat, type EventPhase } from '@/types/event';
import type { UserData } from '@/types/student';

// Import child form components (assuming they exist and are compatible)
import EventParticipantForm from '@/components/forms/EventParticipantForm.vue';
import ManageTeamsComponent from '@/components/forms/ManageTeamsComponent.vue';
import EventCriteriaForm from '@/components/forms/EventCriteriaForm.vue';

const props = defineProps({
  phase: {
    type: Object as PropType<EventPhase>,
    required: true,
  },
  phaseNumber: {
    type: Number,
    required: true,
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
  'update:phase': [phase: EventPhase];
  'remove-phase': [];
  'validity-change': [isValid: boolean];
  'error': [message: string];
}>();

const localPhase = ref<EventPhase>({ ...props.phase });
const hasAttemptedSubmit = ref(false); // To show errors only after a submit attempt on parent

// Internal validity states for sub-components
const isParticipantsValid = ref(false);
const isTeamsValid = ref(true); // Default true, only becomes false if format is Team and teams invalid
const isCriteriaValid = ref(false);

const isPhaseInternallyValid = computed(() => {
  const basicDetailsValid = localPhase.value.phaseName?.trim() &&
                            localPhase.value.description?.trim() &&
                            localPhase.value.type?.trim();

  let formatSpecificValid = true;
  if (localPhase.value.format === EventFormat.Team) {
    formatSpecificValid = isTeamsValid.value && (localPhase.value.teams?.length || 0) > 0;
  } else if (localPhase.value.format === EventFormat.Individual) {
    formatSpecificValid = (localPhase.value.coreParticipants?.length || 0) > 0;
  }

  return basicDetailsValid &&
         isParticipantsValid.value &&
         (localPhase.value.participants?.length || 0) > 0 &&
         isCriteriaValid.value &&
         (localPhase.value.criteria?.length || 0) > 0 &&
         formatSpecificValid;
});

// Watch for changes in localPhase and emit update
watch(localPhase, (newVal) => {
  emit('update:phase', newVal);
}, { deep: true });

// Watch for prop changes to update localPhase (e.g., if parent resets phases)
watch(() => props.phase, (newVal) => {
  localPhase.value = { ...newVal };
}, { deep: true });


// Watch for internal validity changes and emit overall validity
watch(isPhaseInternallyValid, (newVal) => {
  emit('validity-change', newVal);
});

// Watch for format changes to reset specific fields
watch(() => localPhase.value.format, (newFormat, oldFormat) => {
  if (newFormat !== oldFormat) {
    if (newFormat === EventFormat.Individual) {
      localPhase.value.teams = []; // Clear teams if switching to Individual
      isTeamsValid.value = true; // Reset team validity
    } else if (newFormat === EventFormat.Team) {
      localPhase.value.coreParticipants = []; // Clear core participants if switching to Team
    }
    // Re-validate participants as rules might change
    // This might need a more sophisticated way to trigger re-validation in EventParticipantForm
  }
});

function requestRemovePhase() {
  // Could add a confirmation modal here if desired
  emit('remove-phase');
}

function handleError(message: string) {
  emit('error', message);
}

// Expose a method for parent to trigger validation display (optional)
function showValidationErrors() {
  hasAttemptedSubmit.value = true;
}
defineExpose({ showValidationErrors });


onMounted(() => {
  // Initial validity emit
  // Child forms will emit their own validity, this captures the initial state based on them.
  // A short delay might be needed for children to mount and emit.
  nextTick(() => {
     emit('validity-change', isPhaseInternallyValid.value);
  });
});

</script>

<style scoped>
.phase-editor-card {
  background-color: #fff;
  border: 1px solid #e9ecef;
  transition: box-shadow 0.2s ease-in-out;
}
.phase-editor-card:hover {
  box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.1) !important;
}
.card-header {
  cursor: default; /* Default cursor for header, drag handle is specific */
}
.phase-drag-handle {
  cursor: grab;
}
.phase-drag-handle:active {
  cursor: grabbing;
}
.phase-section {
  padding-left: 0.5rem;
  border-left: 3px solid var(--bs-gray-300);
}
.form-label.fw-medium {
    font-weight: 500 !important;
}
.badge.small {
    font-size: 0.75em;
    padding: 0.3em 0.5em;
}
</style>
