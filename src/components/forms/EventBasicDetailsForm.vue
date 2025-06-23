// src/components/forms/EventBasicDetailsForm.vue
<template>
  <div>
    <!-- Event Format Selection - Hidden when isPhaseForm is true -->
    <div v-if="!isPhaseForm" class="mb-4">
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
        <div class="form-check form-check-custom">
          <input class="form-check-input" type="radio" name="eventFormat" id="formatMultiEvent" :value="EventFormat.MultiEvent" v-model="localDetails.format" :disabled="isSubmitting || isEditing">
          <label class="form-check-label" for="formatMultiEvent">Multiple Events</label>
        </div>
      </div>
    </div>

    <!-- Event Name -->
    <div class="mb-3">
      <label for="eventName" class="form-label fw-medium">{{ isPhaseForm ? 'Phase Name' : 'Event Name' }} <span class="text-danger">*</span></label>
      <input
        id="eventName"
        class="form-control"
        :class="{ 'is-invalid': !localDetails.eventName && touched.eventName }"
        @blur="touched.eventName = true"
        type="text"
        v-model.trim="localDetails.eventName"
        :disabled="isSubmitting"
        :placeholder="isPhaseForm ? 'Enter a clear phase name' : 'Enter a clear and concise event name'"
        maxlength="100"
      />
      <div class="invalid-feedback">{{ isPhaseForm ? 'Phase name' : 'Event name' }} is required.</div>
    </div>

    <!-- Event Type (Hidden if MultiEvent) -->
    <div v-if="showTypeField" class="mb-3">
      <label for="eventType" class="form-label fw-medium">{{ isPhaseForm ? 'Phase Type' : 'Event Type' }} <span class="text-danger">*</span></label>
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
            v-for="type in eventTypesForFormat"
            :key="type"
            :value="type"
          >{{ type }}</option>
        </select>
        <div class="invalid-feedback">{{ isPhaseForm ? 'Phase type' : 'Event type' }} is required.</div>
      </div>
    </div>

    <!-- Is Competition Checkbox (Only for MultiEvent) - Hide in phase form -->
    <div v-if="showMultiEventCompetitionToggle && !isPhaseForm" class="mb-3">
      <div class="form-check form-switch form-switch-custom">
        <input
          class="form-check-input"
          type="checkbox"
          role="switch"
          id="isCompetitionSeries"
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
          <span class="text-muted small ms-1 fw-normal">(Points per criterion awarded to one core participant)</span>
        </label>
      </div>
    </div>
    
    <!-- Overall Event Prize (shown if !isPhaseForm and isCompetition is true for Individual or MultiEvent) -->
    <div v-if="!isPhaseForm && localDetails.isCompetition && (isMultiEvent || isIndividualEvent)" class="mb-3">
      <label for="eventOverallPrize" class="form-label fw-medium">Overall Event Prize</label>
      <input
        id="eventOverallPrize"
        type="text"
        class="form-control"
        v-model.trim="localDetails.prize"
        :placeholder="isMultiEvent ? 'e.g., Grand Prize for the entire series' : 'e.g., Prize for the winner'"
        :disabled="isSubmitting"
      />
      <small v-if="isMultiEvent" class="form-text text-muted">
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
        :placeholder="isPhaseForm ? 'Provide details about this phase' : 'Provide a detailed description of the event, including goals, rules, and expected outcomes. Markdown is supported.'"
      ></textarea>
      <small class="form-text text-muted">Use Markdown for formatting (e.g., **bold**, *italic*, lists).</small>
       <div class="invalid-feedback">Description is required.</div>
    </div>

    <!-- Overall Event Rules (Hidden if MultiEvent or Individual or if phase form) -->
    <div v-if="showRulesField && !isPhaseForm" class="mb-3">
      <label for="eventRules" class="form-label fw-medium">Overall Event Rules (Optional)</label>
      <textarea
        id="eventRules"
        class="form-control"
        rows="4"
        :value="localDetails.rules || ''"
        @input="(e: Event) => localDetails.rules = (e.target as HTMLTextAreaElement).value"
        :disabled="isSubmitting"
        placeholder="Enter specific overall event rules. For 'Multiple Events', rules are set per phase."
      ></textarea>
      <small class="form-text text-muted">Use Markdown for formatting. These are general rules; for 'Multiple Events', rules are set per phase.</small>
    </div>

    <!-- Overall Allow Project Submission Toggle (Hidden if MultiEvent or Individual or if phase form) -->
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
          <span class="text-muted small ms-1 fw-normal">(For 'Multiple Events', this is set per phase)</span>
        </label>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, toRefs, computed } from 'vue';
import { type EventFormData, EventFormat } from '@/types/event'; // Import from shared utility
import { individualEventTypes, teamEventTypes } from '@/utils/eventTypes';

interface Props {
  details: EventFormData['details'];
  isSubmitting: boolean;
  isEditing: boolean;
  isPhaseForm?: boolean; // New prop to control the display mode
}

const emit = defineEmits(['update:details', 'validity-change']);
const props = withDefaults(defineProps<Props>(), {
  isPhaseForm: false
});

const { details, isSubmitting, isEditing, isPhaseForm } = toRefs(props);

// Local copy for two-way binding
const localDetails = ref<EventFormData['details']>({ ...details.value });

const touched = ref({
  eventName: false,
  type: false, 
  description: false,
});

// Computed properties for UI visibility based on format
const isMultiEvent = computed(() => localDetails.value.format === EventFormat.MultiEvent);
const isIndividualEvent = computed(() => localDetails.value.format === EventFormat.Individual);
const showTypeField = computed(() => !isMultiEvent.value || isPhaseForm.value);
const showRulesField = computed(() => !isMultiEvent.value && !isIndividualEvent.value);
const showSubmissionToggle = computed(() => !isMultiEvent.value && !isIndividualEvent.value);
const showMultiEventCompetitionToggle = computed(() => isMultiEvent.value);
const showIndividualCompetitionToggle = computed(() => isIndividualEvent.value);

// Event types based on format
const eventTypesForFormat = computed(() => {
  switch (localDetails.value.format) {
    case EventFormat.Team: return teamEventTypes;
    case EventFormat.Individual:
    default: return individualEventTypes;
  }
});

// Add validation computed property
const isBasicDetailsValid = computed(() => {
  const hasEventName = !!(localDetails.value.eventName?.trim());
  const hasDescription = !!(localDetails.value.description?.trim());
  const hasFormat = !!(localDetails.value.format);
  
  // Type is required unless it's MultiEvent format (and not phase form)
  const hasType = (isMultiEvent.value && !isPhaseForm.value) || !!(localDetails.value.type?.trim());
  
  return hasEventName && hasDescription && hasFormat && hasType;
});

// Watch basic details validity and emit changes
watch(isBasicDetailsValid, (newValid) => {
  emit('validity-change', newValid);
}, { immediate: true });

// Watch for prop changes from parent (only update local if different)
let isUpdatingFromProp = false;
watch(details, (newVal) => {
  if (!isUpdatingFromProp) {
    localDetails.value = { ...newVal };
    // Ensure that if the format is Individual, rules and submission are correctly set
    if (localDetails.value.format === EventFormat.Individual) {
      localDetails.value.rules = null;
      localDetails.value.allowProjectSubmission = false;
    }
  }
}, { deep: true });

// Watch for format changes to reset type and handle competition-specific logic
watch(() => localDetails.value.format, (newFormat, oldFormat) => {
  if (newFormat !== oldFormat) {
    // Handle 'type' field based on format change
    if (newFormat !== EventFormat.MultiEvent) {
      const availableTypes = eventTypesForFormat.value;
      if (!availableTypes.includes(localDetails.value.type ?? '')) {
        localDetails.value.type = availableTypes.length > 0 ? (availableTypes[0] ?? '') : '';
      }
    } else { // MultiEvent
      localDetails.value.type = ''; // Type is handled by phases
    }

    // Handle 'isCompetition' based on the new format
    if (newFormat === EventFormat.Individual) {
      if (localDetails.value.isCompetition === undefined) {
        localDetails.value.isCompetition = false;
      }
      // Specific Individual event fields
      localDetails.value.allowProjectSubmission = false;
      localDetails.value.rules = null;
      localDetails.value.phases = []; 
    } else if (newFormat === EventFormat.Team) {
      localDetails.value.isCompetition = false; // Always false for Team
      // Specific Team event fields
      localDetails.value.allowProjectSubmission = true; 
      localDetails.value.phases = []; 
      // rules can exist for Team events, so don't nullify here unless intended
    } else if (newFormat === EventFormat.MultiEvent) {
      if (localDetails.value.isCompetition === undefined) {
        localDetails.value.isCompetition = false;
      }
      // Specific MultiEvent fields (overall event level)
      localDetails.value.rules = null; // Rules are per-phase
      localDetails.value.allowProjectSubmission = false; // Submissions are per-phase
      // phases array is managed by MultiEventForm component, not reset here
    }
  }
});

// Watch local changes and emit to parent
watch(localDetails, (newVal) => {
  isUpdatingFromProp = true;
  emit('update:details', { ...newVal });
  setTimeout(() => {
    isUpdatingFromProp = false;
  }, 0);
}, { deep: true });
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