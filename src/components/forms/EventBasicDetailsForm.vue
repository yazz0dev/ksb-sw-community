// src/components/forms/EventBasicDetailsForm.vue
<template>
  <div>
    <!-- Event Format Selection - Hidden when isPhaseForm is true OR if isMultiEventOverall is true -->
    <div v-if="!isPhaseForm && !isMultiEventOverall" class="mb-4">
      <label class="form-label fw-medium">Event Format <span class="text-danger">*</span></label>
      <div class="event-format-container d-flex gap-3">
        <div class="form-check form-check-custom">
          <input class="form-check-input" type="radio" name="eventFormat" id="formatIndividual" :value="EventFormat.Individual" v-model="localDetails.format" :disabled="isSubmitting || isEditing">
          <label class="form-check-label" for="formatIndividual">Individual</label>
        </div>
        <div class="form-check form-check-custom">
          <input class="form-check-input" type="radio" name="eventFormat" id="formatTeam" :value="EventFormat.Team" v-model="localDetails.format" :disabled="isSubmitting || isEditing">
          <label class="form-check-label" for="formatTeam">Team</label>
        </div>
        <!-- The hideMultiEventOption prop is used by RequestEventView to hide this specifically -->
        <div v-if="!hideMultiEventOption" class="form-check form-check-custom">
          <input class="form-check-input" type="radio" name="eventFormat" id="formatMultiEvent" :value="EventFormat.MultiEvent" v-model="localDetails.format" :disabled="isSubmitting || isEditing">
          <label class="form-check-label" for="formatMultiEvent">Multiple Events</label>
        </div>
      </div>
    </div>

    <!-- Event Name -->
    <div class="mb-3">
      <label for="eventName" class="form-label fw-medium">{{ nameLabel }} <span class="text-danger">*</span></label>
      <input
        id="eventName"
        class="form-control"
        :class="{ 'is-invalid': !localDetails.eventName && touched.eventName }"
        @blur="touched.eventName = true"
        type="text"
        v-model.trim="localDetails.eventName"
        :disabled="isSubmitting"
        :placeholder="namePlaceholder"
        maxlength="100"
      />
      <div class="invalid-feedback">{{ nameLabel }} is required.</div>
    </div>

    <!-- Event Type (Hidden if overall MultiEvent form) -->
    <div v-if="showTypeField" class="mb-3">
      <label for="eventType" class="form-label fw-medium">{{ typeLabel }} <span class="text-danger">*</span></label>
      <div class="input-group">
        <span class="input-group-text"><i class="fas fa-tag"></i></span>
        <select
          id="eventType"
          class="form-select"
          :class="{ 'is-invalid': !localDetails.type && touched.type }"
          @blur="touched.type = true"
          v-model="localDetails.type"
          :disabled="isSubmitting || !localDetails.format"
        >
          <option value="" disabled>Select type...</option>
          <option
            v-for="typeOpt in eventTypesForFormat"
            :key="typeOpt"
            :value="typeOpt"
          >{{ typeOpt }}</option>
        </select>
        <div class="invalid-feedback">{{ typeLabel }} is required.</div>
      </div>
    </div>

    <!-- Is Competition Checkbox (Only for MultiEvent overall OR Individual Event overall) - Hide in phase form -->
    <div v-if="showOverallCompetitionToggle" class="mb-3">
      <div class="form-check form-switch form-switch-custom">
        <input
          class="form-check-input"
          type="checkbox"
          role="switch"
          :id="isActuallyMultiEventOverall ? 'isCompetitionSeries' : 'isIndividualCompetition'"
          v-model="localDetails.isCompetition"
          :disabled="isSubmitting"
        />
        <label class="form-check-label fw-medium" :for="isActuallyMultiEventOverall ? 'isCompetitionSeries' : 'isIndividualCompetition'">
          {{ isActuallyMultiEventOverall ? 'Is this a Competition series?' : 'Is this an Individual Competition?' }}
          <span v-if="isActuallyMultiEventOverall" class="text-muted small ms-1 fw-normal">(Allows overall prize & phases can be competitive)</span>
          <span v-else class="text-muted small ms-1 fw-normal">(Points per criterion awarded to one core participant)</span>
        </label>
      </div>
    </div>
    
    <!-- Overall Event Prize (shown if !isPhaseForm and isCompetition is true for Individual or overall MultiEvent) -->
    <div v-if="!isPhaseForm && localDetails.isCompetition && (isIndividualEvent || isActuallyMultiEventOverall)" class="mb-3">
      <label for="eventOverallPrize" class="form-label fw-medium">Overall Event Prize</label>
      <input
        id="eventOverallPrize"
        type="text"
        class="form-control"
        v-model.trim="localDetails.prize"
        :placeholder="isActuallyMultiEventOverall ? 'e.g., Grand Prize for the entire series' : 'e.g., Prize for the winner'"
        :disabled="isSubmitting"
      />
      <small v-if="isActuallyMultiEventOverall" class="form-text text-muted">
        Optional overall prize for the MultiEvent competition. Phase-specific prizes can also be set per phase.
      </small>
      <small v-else-if="isIndividualEvent" class="form-text text-muted">
        Prize for the winner of this Individual competition.
      </small>
    </div>

    <!-- Description -->
    <div class="mb-3">
      <label for="eventDescription" class="form-label fw-medium">Description <span class="text-danger">*</span></label>
      <textarea
        id="eventDescription"
        class="form-control"
        :class="{ 'is-invalid': !localDetails.description && touched.description }"
        @blur="touched.description = true"
        rows="5"
        v-model="localDetails.description"
        :disabled="isSubmitting"
        :placeholder="descriptionPlaceholder"
      ></textarea>
      <small class="form-text text-muted">Use Markdown for formatting (e.g., **bold**, *italic*, lists).</small>
       <div class="invalid-feedback">Description is required.</div>
    </div>

    <!-- Overall Event Rules (Only for Overall Team Events or Overall Individual Non-Competition) -->
    <div v-if="showRulesField" class="mb-3">
      <label for="eventRules" class="form-label fw-medium">Overall Event Rules (Optional)</label>
      <textarea
        id="eventRules"
        class="form-control"
        rows="4"
        :value="localDetails.rules || ''"
        @input="(e: Event) => localDetails.rules = (e.target as HTMLTextAreaElement).value"
        :disabled="isSubmitting"
        placeholder="Enter specific overall event rules."
      ></textarea>
      <small class="form-text text-muted">Use Markdown for formatting.</small>
    </div>

    <!-- Overall Allow Project Submission Toggle (Only for Overall Team Events) -->
    <div v-if="showSubmissionToggle" class="mb-3">
      <div class="form-check form-switch form-switch-custom">
        <input
          class="form-check-input"
          type="checkbox"
          role="switch"
          id="allowProjectSubmission"
          v-model="localDetails.allowProjectSubmission"
          :disabled="isSubmitting"
        />
        <label class="form-check-label fw-medium" for="allowProjectSubmission">
          Allow Project Submissions (Overall)
        </label>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, toRefs, computed, onMounted } from 'vue';
import { type EventFormData, EventFormat } from '@/types/event';
import { individualEventTypes, teamEventTypes } from '@/utils/eventTypes';

interface Props {
  details: EventFormData['details'];
  isSubmitting: boolean;
  isEditing: boolean;
  isPhaseForm?: boolean;
  hideMultiEventOption?: boolean;
  isMultiEventOverall?: boolean; // New prop
}

const emit = defineEmits(['update:details', 'validity-change']);
const props = withDefaults(defineProps<Props>(), {
  isPhaseForm: false,
  hideMultiEventOption: false,
  isMultiEventOverall: false, // Default to false
});

const { details, isSubmitting, isEditing, isPhaseForm, hideMultiEventOption, isMultiEventOverall } = toRefs(props);

const localDetails = ref<EventFormData['details']>({ ...details.value });

const touched = ref({
  eventName: false,
  type: false, 
  description: false,
});

// --- Computed properties for UI logic ---
const nameLabel = computed(() => (isPhaseForm.value ? 'Phase Name' : 'Event Name'));
const namePlaceholder = computed(() => (isPhaseForm.value ? 'Enter a clear phase name' : 'Enter a clear and concise event name'));
const typeLabel = computed(() => (isPhaseForm.value ? 'Phase Type' : 'Event Type'));
const descriptionPlaceholder = computed(() => (isPhaseForm.value ? 'Provide details about this phase' : 'Provide a detailed description of the event... Markdown is supported.'));

// Is this form instance for an overall MultiEvent (not a phase, and not a generic form where MultiEvent is just an option)
const isActuallyMultiEventOverall = computed(() => !isPhaseForm.value && isMultiEventOverall.value);

// Is the currently selected format MultiEvent (and not hidden, and not overridden by isMultiEventOverall)
const isSelectedFormatMultiEvent = computed(() => localDetails.value.format === EventFormat.MultiEvent && !hideMultiEventOption.value && !isActuallyMultiEventOverall.value);

const isIndividualEvent = computed(() => localDetails.value.format === EventFormat.Individual);
const isTeamEvent = computed(() => localDetails.value.format === EventFormat.Team);

const showFormatSelection = computed(() => !isPhaseForm.value && !isActuallyMultiEventOverall.value);

const showTypeField = computed(() => {
  if (isPhaseForm.value) return true; // Always show for phases
  return !isActuallyMultiEventOverall.value; // Hide for overall MultiEvent, show for Individual/Team
});

const showRulesField = computed(() => {
  if (isPhaseForm.value || isActuallyMultiEventOverall.value) return false;
  // Show for Team events. For Individual, only if NOT a competition (as competition rules are simpler or covered by criteria)
  return isTeamEvent.value || (isIndividualEvent.value && !localDetails.value.isCompetition);
});

const showSubmissionToggle = computed(() => {
  if (isPhaseForm.value || isActuallyMultiEventOverall.value) return false;
  return isTeamEvent.value; // Only for Team events overall
});

const showOverallCompetitionToggle = computed(() => {
  if (isPhaseForm.value) return false;
  return isActuallyMultiEventOverall.value || isIndividualEvent.value; // Show for Overall MultiEvent or Overall Individual
});

const eventTypesForFormat = computed(() => {
  // For overall MultiEvent, there's no "type". For phases, type depends on phase.format.
  if (isActuallyMultiEventOverall.value && !isPhaseForm.value) return [];

  switch (localDetails.value.format) {
    case EventFormat.Team: return teamEventTypes;
    case EventFormat.Individual: return individualEventTypes;
    default: return individualEventTypes;
  }
});

const isBasicDetailsValid = computed(() => {
  const hasEventName = !!(localDetails.value.eventName?.trim());
  const hasDescription = !!(localDetails.value.description?.trim());
  const hasFormat = !!(localDetails.value.format);
  
  let hasType = true;
  if (showTypeField.value) { // Only validate type if the field is shown
    hasType = !!(localDetails.value.type?.trim());
  }
  return hasEventName && hasDescription && hasFormat && hasType;
});

watch(isBasicDetailsValid, (newValid) => {
  emit('validity-change', newValid);
}, { immediate: true });

let isUpdatingFromProp = false;
watch(details, (newVal) => {
  if (!isUpdatingFromProp) {
    localDetails.value = { ...newVal };
    // Ensure correct format if isMultiEventOverall is true
    if (isMultiEventOverall.value) {
      localDetails.value.format = EventFormat.MultiEvent;
    } else if (hideMultiEventOption.value && localDetails.value.format === EventFormat.MultiEvent) {
      localDetails.value.format = EventFormat.Individual;
    }
    applyFormatDefaults(localDetails.value.format);
  }
}, { deep: true });

function applyFormatDefaults(format: EventFormat) {
  // Defaults for overall MultiEvent (when isMultiEventOverall is true)
  if (isActuallyMultiEventOverall.value) { // This implies format is MultiEvent
    localDetails.value.type = '';
    localDetails.value.rules = null;
    localDetails.value.allowProjectSubmission = false; // Submissions are per-phase
    if (localDetails.value.isCompetition === undefined) localDetails.value.isCompetition = false;
    return; // Exit early for overall MultiEvent
  }

  // Defaults for phases or non-MultiEvent overall forms
  if (format === EventFormat.Individual) {
    localDetails.value.rules = null;
    localDetails.value.allowProjectSubmission = false;
    // For phases, isCompetition is not set at this level. For overall Individual, default to false if undefined.
    if (!isPhaseForm.value && localDetails.value.isCompetition === undefined) localDetails.value.isCompetition = false;
    else if (isPhaseForm.value) localDetails.value.isCompetition = undefined;

  } else if (format === EventFormat.Team) {
    localDetails.value.isCompetition = false; // Team events (overall or phase) are not 'competitions' in the same sense
    if (!isPhaseForm.value) localDetails.value.allowProjectSubmission = true; // Default for overall team event
    // Rules can exist for Team events, don't nullify unless intended by specific logic elsewhere

  } else if (format === EventFormat.MultiEvent && !hideMultiEventOption.value) {
    // This case is for a generic form where MultiEvent might be selected (but not isMultiEventOverall)
    // This should rarely be hit if hideMultiEventOption is true for RequestEventView
    localDetails.value.type = '';
    localDetails.value.rules = null;
    localDetails.value.allowProjectSubmission = false;
    if (localDetails.value.isCompetition === undefined) localDetails.value.isCompetition = false;
  }
}

watch(() => localDetails.value.format, (newFormat, oldFormat) => {
  if (newFormat !== oldFormat) {
    if (isActuallyMultiEventOverall.value && newFormat !== EventFormat.MultiEvent) {
      localDetails.value.format = EventFormat.MultiEvent; // Force back if changed
      return;
    }
    if (hideMultiEventOption.value && newFormat === EventFormat.MultiEvent && !isMultiEventOverall.value) {
      localDetails.value.format = oldFormat || EventFormat.Individual; // Revert or default
      return;
    }

    applyFormatDefaults(newFormat);

    if (showTypeField.value) { // Only reset type if it's visible and relevant
        const availableTypes = eventTypesForFormat.value;
        if (!availableTypes.includes(localDetails.value.type ?? '')) {
            localDetails.value.type = '';
        }
    } else {
        localDetails.value.type = ''; // Clear type if field is hidden
    }
  }
});

watch(localDetails, (newVal) => {
  isUpdatingFromProp = true;
  emit('update:details', { ...newVal });
  setTimeout(() => { isUpdatingFromProp = false; }, 0);
}, { deep: true });

onMounted(() => {
  if (isMultiEventOverall.value) {
    localDetails.value.format = EventFormat.MultiEvent;
  } else if (hideMultiEventOption.value && localDetails.value.format === EventFormat.MultiEvent) {
    localDetails.value.format = EventFormat.Individual;
  }
  applyFormatDefaults(localDetails.value.format);
});

</script>

<style scoped>
.form-control:focus,
.form-select:focus {
  border-color: var(--bs-primary);
  box-shadow: 0 0 0 0.2rem rgba(var(--bs-primary-rgb), 0.25);
}

.form-check-input:checked {
  background-color: var(--bs-primary);
  border-color: var(--bs-primary);
}

.input-group-text {
  background-color: var(--bs-tertiary-bg);
  border-color: var(--bs-border-color);
  color: var(--bs-secondary);
}

.form-text {
  color: var(--bs-secondary);
}

.invalid-feedback {
  color: var(--bs-danger);
  display: none; /* Hide by default */
}

.is-invalid ~ .invalid-feedback {
    display: block; /* Show only when input is invalid */
}

/* Custom Form Check Enhancement */
.form-check-custom {
  transition: all 0.3s ease;
  padding-left: 1.5rem; /* Reduce default Bootstrap padding-left from 2rem to 1.5rem */
}

/* Position radio button closer to the left edge */
.form-check-custom .form-check-input {
  margin-left: -1.5rem; /* Match the reduced padding-left */
  margin-top: 0.2rem; /* Fine-tune vertical alignment */
}

/* Reduce space between radio input and its label */
.form-check-custom .form-check-label {
  margin-left: 0.5rem; /* Reduce space between input and label */
}

/* Ensure radio items within the flex container use gap for all spacing */
.d-flex.flex-wrap.gap-3 > .form-check.form-check-custom {
  margin-bottom: 0; /* Rely on parent's gap property for all spacing */
}

.form-check-custom:hover {
  transform: translateY(-1px);
}

.form-check-custom .form-check-input:focus {
  box-shadow: 0 0 0 0.2rem rgba(var(--bs-primary-rgb), 0.25);
}

/* Switch Enhancement - Override to ensure proper toggle switch appearance */
.form-switch-custom {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  padding-left: 4rem; /* Increased from 3rem to 4rem to move switch further right */
}

.form-switch-custom .form-check-input {
  margin-left: -4rem; /* Adjusted to match increased padding-left */
}

.form-switch-custom:hover {
  transform: translateY(-1px);
}

.form-switch-custom .form-check-input:focus {
  box-shadow: 0 0 0 0.2rem rgba(var(--bs-success-rgb), 0.25);
}

/* Add new event-format-container class */
.event-format-container {
  display: flex;
  flex-wrap: nowrap;
  gap: 0.75rem;
  overflow-x: auto;
  padding-bottom: 0.5rem;
}

/* Responsive improvements */
@media (max-width: 768px) {
  .form-check-custom {
    padding: 0.5rem 0.75rem 0.5rem 1.25rem; /* Adjust padding: top right bottom left */
  }
  
  .form-check-custom .form-check-input {
    margin-left: -1.25rem; /* Match the reduced left padding on mobile */
  }
  
  .form-switch-custom {
    padding: 0.75rem 1rem 0.75rem 3.5rem; /* Increased left padding on mobile */
  }
  
  .form-switch-custom .form-check-input {
    margin-left: -3.5rem; /* Adjusted to match mobile padding */
  }
  
  .event-format-container .form-check-custom {
    flex: 0 0 auto;
    white-space: nowrap;
  }
}

@media (max-width: 480px) {
  /* For very small screens, force single row layout */
  .event-format-container {
    gap: 0.4rem !important;
    padding-bottom: 0.75rem;
  }
  
  .event-format-container .form-check-custom {
    padding: 0.3rem 0.5rem 0.3rem 1rem;
    font-size: 0.8rem;
  }
}
</style>