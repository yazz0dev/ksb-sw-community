// src/components/forms/EventBasicDetailsForm.vue
<template>
  <div>
    <!-- Event Format Selection -->
    <div class="mb-4">
      <label class="form-label fw-medium">Event Format <span class="text-danger">*</span></label>
      <div class="d-flex flex-wrap gap-3">
        <div class="form-check form-check-custom">
          <input class="form-check-input" type="radio" name="eventFormat" id="formatIndividual" :value="EventFormat.Individual" v-model="localDetails.format" :disabled="isSubmitting || isEditing">
          <label class="form-check-label" for="formatIndividual">Individual</label>
        </div>
        <div class="form-check form-check-custom">
          <input class="form-check-input" type="radio" name="eventFormat" id="formatTeam" :value="EventFormat.Team" v-model="localDetails.format" :disabled="isSubmitting || isEditing">
          <label class="form-check-label" for="formatTeam">Team</label>
        </div>
        <div class="form-check form-check-custom">
          <input class="form-check-input" type="radio" name="eventFormat" id="formatCompetition" :value="EventFormat.Competition" v-model="localDetails.format" :disabled="isSubmitting || isEditing">
          <label class="form-check-label" for="formatCompetition">Competition</label>
        </div>
      </div>
    </div>

    <!-- Event Name -->
    <div class="mb-3">
      <label for="eventName" class="form-label fw-medium">Event Name <span class="text-danger">*</span></label>
      <input
        id="eventName"
        class="form-control"
        type="text"
        v-model.trim="localDetails.eventName"
        :disabled="isSubmitting"
        placeholder="Enter a clear and concise event name"
        required
        maxlength="100"
      />
      <div class="invalid-feedback">Event name is required.</div>
    </div>

    <!-- Event Type -->
    <div class="mb-3">
      <label for="eventType" class="form-label fw-medium">Event Type <span class="text-danger">*</span></label>
      <div class="input-group">
        <span class="input-group-text"><i class="fas fa-tag"></i></span>
        <select
          id="eventType"
          class="form-select"
          v-model="localDetails.type"
          :disabled="isSubmitting || !localDetails.format"
          required
        >
          <option value="" disabled>Select type...</option>
          <option
            v-for="type in eventTypesForFormat"
            :key="type"
            :value="type"
          >{{ type }}</option>
        </select>
      </div>
       <div class="invalid-feedback">Event type is required.</div>
    </div>

    <!-- Prize Details (Only for Competition) -->
    <div v-if="localDetails.format === EventFormat.Competition" class="mb-3">
      <label for="eventPrize" class="form-label fw-medium">Prize Details (Optional)</label>
      <input
        id="eventPrize"
        class="form-control"
        type="text"
        v-model.trim="localDetails.prize"
        :disabled="isSubmitting"
        placeholder="e.g., Cash prize, Vouchers, Swag"
        maxlength="150"
      />
      <small class="form-text text-muted">Briefly describe the prize for the competition.</small>
    </div>

    <!-- Description -->
    <div class="mb-3">
      <label for="eventDescription" class="form-label fw-medium">Description <span class="text-danger">*</span></label>
      <textarea
        id="eventDescription"
        class="form-control"
        rows="5"
        v-model="localDetails.description"
        :disabled="isSubmitting"
        placeholder="Provide a detailed description of the event, including goals, rules, and expected outcomes. Markdown is supported."
        required
      ></textarea>
      <small class="form-text text-muted">Use Markdown for formatting (e.g., **bold**, *italic*, lists).</small>
       <div class="invalid-feedback">Description is required.</div>
    </div>

    <!-- Rules -->
    <div class="mb-3">
      <label for="eventRules" class="form-label fw-medium">Rules (Optional)</label>
      <textarea
        id="eventRules"
        class="form-control"
        rows="4"
        v-model="localDetails.rules"
        :disabled="isSubmitting"
        placeholder="Enter specific event rules, guidelines, or judging criteria. Markdown is supported."
      ></textarea>
      <small class="form-text text-muted">Use Markdown for formatting (e.g., **bold**, *italic*, lists).</small>
    </div>

    <!-- Allow Project Submission Toggle -->
    <div class="mb-3">
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
          Allow Project Submissions
          <span class="text-muted small ms-1 fw-normal">(Required for Hackathons, Ideathons, etc.)</span>
        </label>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, toRefs, computed } from 'vue';
import { type EventFormData, EventFormat } from '@/types/event';

interface Props {
  details: EventFormData['details'];
  isSubmitting: boolean;
  isEditing: boolean;
}

const emit = defineEmits(['update:details']);
const props = defineProps<Props>();
const { details, isSubmitting, isEditing } = toRefs(props);

// Local copy for two-way binding
const localDetails = ref<EventFormData['details']>({ ...details.value });

// Event types based on format
const individualEventTypes = [
  'Topic Presentation', 'Discussion Session', 'Hands-on Workshop', 'Quiz',
  'Problem Solving', 'Coding Challenge (Individual)', 'Typing Competition', 'Algorithm Design'
];
const teamEventTypes = [
  'Hackathon', 'Ideathon', 'Debate', 'Design Challenge', 'Testing Competition',
  'Open Source Contribution Drive', 'Tech Business Plan', 'Capture The Flag (CTF)'
];
const competitionEventTypes = [
  'Coding Competition', 'Design Competition', 'Presentation Contest',
  'Robotics Challenge', 'Data Science Challenge', 'Cybersecurity Challenge'
];

const eventTypesForFormat = computed(() => {
  switch (localDetails.value.format) {
    case EventFormat.Team: return teamEventTypes;
    case EventFormat.Competition: return competitionEventTypes;
    case EventFormat.Individual:
    default: return individualEventTypes;
  }
});

// Watch for prop changes from parent (only update local if different)
let isUpdatingFromProp = false;
watch(details, (newVal) => {
  if (!isUpdatingFromProp) {
    localDetails.value = { ...newVal };
  }
}, { deep: true });

// Watch for format changes to reset type and handle competition-specific logic
watch(() => localDetails.value.format, (newFormat, oldFormat) => {
  if (newFormat !== oldFormat) {
    // Reset type if format changes and current type is not valid for the new format
    if (!eventTypesForFormat.value.includes(localDetails.value.type ?? '')) {
      localDetails.value.type = '';
    }
    // Remove prize field if format is not Competition
    if (newFormat !== EventFormat.Competition) {
      delete localDetails.value.prize;
    }
    // For Competition format, set allowProjectSubmission to true
    if (newFormat === EventFormat.Competition) {
      localDetails.value.allowProjectSubmission = true;
    }
  }
});

// Watch local changes and emit to parent
watch(localDetails, (newVal) => {
  isUpdatingFromProp = true;
  emit('update:details', { ...newVal });
  // Reset flag on next tick to allow prop updates
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
  
  /* Applies to the container of Event Format radio buttons */
  .d-flex.flex-wrap.gap-3 { 
    gap: 0.75rem !important; /* Slightly increase gap for better touch targets */
  }
}

@media (max-width: 480px) {
  /* For very small screens, reduce gap further but maintain single row */
  .d-flex.flex-wrap.gap-3 { 
    gap: 0.5rem !important;
  }
  
  .form-check-custom {
    padding: 0.4rem 0.6rem 0.4rem 1rem;
    font-size: 0.9rem; /* Slightly smaller text on very small screens */
  }
  
  .form-check-custom .form-check-input {
    margin-left: -1rem;
    width: 1rem;
    height: 1rem;
  }
  
  .form-switch-custom {
    padding: 0.4rem 0.6rem 0.4rem 3rem; /* Increased left padding for very small screens */
  }
  
  .form-switch-custom .form-check-input {
    margin-left: -3rem; /* Adjusted to match very small screen padding */
  }
}
</style>