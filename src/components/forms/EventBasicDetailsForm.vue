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

    <!-- Event Type (Hidden if MultiEvent AND not a phase form) -->
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

    <!-- Is Competition Checkbox (Only for MultiEvent overall) - Hide in phase form -->
    <div v-if="showMultiEventCompetitionToggle && !isPhaseForm && !hideMultiEventOption" class="mb-3">
      <div class="form-check form-switch form-switch-custom">
        <input
          class="form-check-input"
          type="checkbox"
          role="switch"
          :id="isActuallyMultiEventOverall ? 'isCompetitionSeries' : 'isIndividualCompetition'"
          v-model="localDetails.isCompetition"
          :disabled="isSubmitting"
        />
        <label class="form-check-label fw-medium" for="isCompetitionSeries">
          Is this a Competition series?
          <span class="text-muted small ms-1 fw-normal">(Enables prizes per phase for Multiple Events)</span>
        </label>
      </div>
    </div>

    <!-- Is Competition Checkbox (Only for Individual Event) - Hide in phase form -->
    <div v-if="showIndividualCompetitionToggle && !isPhaseForm" class="mb-3">
      <div class="form-check form-switch form-switch-custom">
        <input
          class="form-check-input"
          type="checkbox"
          role="switch"
          id="isIndividualCompetition"
          v-model="localDetails.isCompetition"
          :disabled="isSubmitting"
        />
        <label class="form-check-label fw-medium" for="isIndividualCompetition">
          Is this an Individual Competition?
          <span class="text-muted small ms-1 fw-normal">(Points per criteria awarded to one core participant)</span>
        </label>
      </div>
    </div>
    
    <!-- Overall Event Prize (shown if !isPhaseForm and isCompetition is true for Individual or MultiEvent (if MultiEvent not hidden)) -->
    <div v-if="!isPhaseForm && localDetails.isCompetition && (isIndividualEvent || (isMultiEvent && !hideMultiEventOption))" class="mb-3">
      <label for="eventOverallPrize" class="form-label fw-medium">Overall Event Prize</label>
      <input
        id="eventOverallPrize"
        type="text"
        class="form-control"
        v-model.trim="localDetails.prize"
        :placeholder="isActuallyMultiEventOverall ? 'e.g., Grand Prize for the entire series' : 'e.g., Prize for the winner'"
        :disabled="isSubmitting"
      />
      <small v-if="isMultiEvent && !hideMultiEventOption" class="form-text text-muted">
        Optional overall prize for the MultiEvent competition. Phase-specific prizes can be set in the phases section.
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

    <!-- Overall Event Rules (Hidden if MultiEvent (and not hidden), or Individual, or if phase form) -->
    <div v-if="showRulesField && !isPhaseForm" class="mb-3">
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
      <small class="form-text text-muted">Use Markdown for formatting. These are general rules; for 'Multiple Events' (if available), rules are set per phase.</small>
    </div>

    <!-- Overall Allow Project Submission Toggle (Hidden if MultiEvent (and not hidden), or Individual, or if phase form) -->
    <div v-if="showSubmissionToggle && !isPhaseForm" class="mb-3">
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
          <span class="text-muted small ms-1 fw-normal">(For 'Multiple Events' (if available), this is set per phase)</span>
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

const isMultiEvent = computed(() => localDetails.value.format === EventFormat.MultiEvent && !hideMultiEventOption.value);
const isIndividualEvent = computed(() => localDetails.value.format === EventFormat.Individual);
const isTeamEvent = computed(() => localDetails.value.format === EventFormat.Team);


// Add the missing computed property
const isActuallyMultiEventOverall = computed(() => isMultiEvent.value && !isPhaseForm.value);


const showTypeField = computed(() => {
  if (isPhaseForm.value) return true; // Always show for phases
  return !isMultiEvent.value; // Show for Individual/Team overall, hide for MultiEvent overall
});

const showRulesField = computed(() => {
  if (isPhaseForm.value) return false;
  return isTeamEvent.value; // Only for Team events at the overall level now
});

const showSubmissionToggle = computed(() => {
  if (isPhaseForm.value) return false;
  return isTeamEvent.value; // Only for Team events at the overall level now
});

const showMultiEventCompetitionToggle = computed(() => !isPhaseForm.value && isMultiEvent.value);
const showIndividualCompetitionToggle = computed(() => !isPhaseForm.value && isIndividualEvent.value);


const eventTypesForFormat = computed(() => {
  // For overall MultiEvent, there's no "type". For phases, type depends on phase.format.
  if (isActuallyMultiEventOverall.value && !isPhaseForm.value) return [];

  switch (localDetails.value.format) {
    case EventFormat.Team: return teamEventTypes;
    case EventFormat.Individual: return individualEventTypes;
    // For MultiEvent (overall), type is not directly set here. For phases, it depends on phase.format.
    default: return individualEventTypes; // Default for safety, though format should be set
  }
});

const isBasicDetailsValid = computed(() => {
  const hasEventName = !!(localDetails.value.eventName?.trim());
  const hasDescription = !!(localDetails.value.description?.trim());
  const hasFormat = !!(localDetails.value.format);
  
  let hasType = true; // Assume true, then check if needed
  if (isPhaseForm.value || !isMultiEvent.value) { // Type is required for phases, and for non-MultiEvent overall
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
    if (hideMultiEventOption.value && localDetails.value.format === EventFormat.MultiEvent) {
      localDetails.value.format = EventFormat.Individual; // Default to Individual if MultiEvent is hidden
    }
    // Apply format-specific defaults upon receiving new details
    applyFormatDefaults(localDetails.value.format);
  }
}, { deep: true });


function applyFormatDefaults(format: EventFormat) {
  if (format === EventFormat.Individual) {
    localDetails.value.rules = null;
    localDetails.value.allowProjectSubmission = false;
    if (isPhaseForm.value) localDetails.value.isCompetition = false; // Competition is per-phase for phases
    else if(localDetails.value.isCompetition === undefined) localDetails.value.isCompetition = false;
  } else if (format === EventFormat.Team) {
    localDetails.value.isCompetition = false; // Team events are not marked as competition overall/phase
    if (!isPhaseForm.value) localDetails.value.allowProjectSubmission = true; // Default for overall team event
  } else if (format === EventFormat.MultiEvent && !hideMultiEventOption.value) {
    // Overall MultiEvent settings
    localDetails.value.type = '';
    localDetails.value.rules = null;
    localDetails.value.allowProjectSubmission = false;
    if (localDetails.value.isCompetition === undefined) localDetails.value.isCompetition = false;
  }
}


watch(() => localDetails.value.format, (newFormat, oldFormat) => {
  if (newFormat !== oldFormat) {
    if (hideMultiEventOption.value && newFormat === EventFormat.MultiEvent) {
      localDetails.value.format = oldFormat || EventFormat.Individual; // Revert or default
      return;
    }
    applyFormatDefaults(newFormat);
    // Reset type if it's not valid for the new format (excluding overall MultiEvent)
    if (newFormat !== EventFormat.MultiEvent || isPhaseForm.value) {
        const availableTypes = eventTypesForFormat.value;
        if (!availableTypes.includes(localDetails.value.type ?? '')) {
            localDetails.value.type = ''; // Reset to empty, user must select
        }
    } else if (newFormat === EventFormat.MultiEvent && !isPhaseForm.value) {
        localDetails.value.type = ''; // Overall MultiEvent has no type
    }
  }
});

watch(localDetails, (newVal) => {
  isUpdatingFromProp = true;
  emit('update:details', { ...newVal });
  setTimeout(() => { isUpdatingFromProp = false; }, 0);
}, { deep: true });

onMounted(() => {
  // If hideMultiEventOption is true and current format is MultiEvent, reset to Individual
  if (hideMultiEventOption.value && localDetails.value.format === EventFormat.MultiEvent) {
    localDetails.value.format = EventFormat.Individual;
  }
  // Apply initial defaults based on the format
  applyFormatDefaults(localDetails.value.format);
});

// Add computed properties for labels that may use isActuallyMultiEventOverall
const nameLabel = computed(() => isPhaseForm.value ? 'Phase Name' : 'Event Name');
const namePlaceholder = computed(() => isPhaseForm.value ? 'Enter phase name' : 'Enter event name');
const typeLabel = computed(() => isPhaseForm.value ? 'Phase Type' : 'Event Type');
const descriptionPlaceholder = computed(() => isPhaseForm.value ? 'Describe this phase...' : 'Describe your event...');

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