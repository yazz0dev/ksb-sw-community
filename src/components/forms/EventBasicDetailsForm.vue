<template>
  <div>
    <!-- Event Format Selection -->
    <div class="mb-4">
      <label class="form-label fw-medium">Event Format <span class="text-danger">*</span></label>
      <div class="d-flex flex-wrap gap-3">
        <div class="form-check">
          <input class="form-check-input" type="radio" name="eventFormat" id="formatIndividual" :value="EventFormat.Individual" v-model="localDetails.format" @change="emitDetailsUpdate" :disabled="isSubmitting">
          <label class="form-check-label" for="formatIndividual">Individual</label>
        </div>
        <div class="form-check">
          <input class="form-check-input" type="radio" name="eventFormat" id="formatTeam" :value="EventFormat.Team" v-model="localDetails.format" @change="emitDetailsUpdate" :disabled="isSubmitting">
          <label class="form-check-label" for="formatTeam">Team</label>
        </div>
        <div class="form-check">
          <input class="form-check-input" type="radio" name="eventFormat" id="formatCompetition" :value="EventFormat.Competition" v-model="localDetails.format" @change="emitDetailsUpdate" :disabled="isSubmitting">
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
        @input="emitDetailsUpdate"
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
          @change="emitDetailsUpdate"
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
        @input="emitDetailsUpdate"
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
        @input="emitDetailsUpdate"
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
        @input="emitDetailsUpdate"
      ></textarea>
      <small class="form-text text-muted">Use Markdown for formatting (e.g., **bold**, *italic*, lists).</small>
    </div>

    <!-- Allow Project Submission Toggle -->
    <div class="mb-3">
      <div class="form-check form-switch">
        <input
          class="form-check-input"
          type="checkbox"
          role="switch"
          id="allowProjectSubmission"
          v-model="localDetails.allowProjectSubmission"
          :disabled="isSubmitting"
          @change="emitDetailsUpdate"
        />
        <label class="form-check-label" for="allowProjectSubmission">
          Allow Project Submissions
          <span class="text-muted small ms-1">(Required for Hackathons, Ideathons, etc.)</span>
        </label>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, toRefs, computed, PropType } from 'vue';
import { EventFormData, EventFormat } from '@/types/event'; // Import EventFormat

interface Props {
  details: EventFormData['details'];
  isSubmitting: boolean;
}

const emit = defineEmits(['update:details']);
const props = defineProps<Props>();
const { details, isSubmitting } = toRefs(props);

// Local copy for two-way binding, ensuring type safety
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

watch(details, (newVal) => {
  // Ensure the local copy is always in sync with the prop
  localDetails.value = { ...newVal };
  // Reset type if format changes and current type is not valid for the new format
  if (!eventTypesForFormat.value.includes(localDetails.value.type ?? '')) {
    localDetails.value.type = '';
  }
}, { deep: true });

function emitDetailsUpdate() {
  // Reset type if format changes and current type is not valid
  if (!eventTypesForFormat.value.includes(localDetails.value.type ?? '')) {
      localDetails.value.type = '';
  }
  // Remove prize field if format is not Competition
  if (localDetails.value.format !== EventFormat.Competition) {
      delete localDetails.value.prize;
  }
  emit('update:details', { ...localDetails.value });
}
</script>