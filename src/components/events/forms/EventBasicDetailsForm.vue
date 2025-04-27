<template>
  <div>
    <div class="mb-3">
      <label class="form-label">Event Format <span class="text-danger">*</span></label>
      <div>
        <div class="form-check form-check-inline">
          <input class="form-check-input" type="radio" name="eventFormat" id="formatIndividual" value="Individual" v-model="localDetails.format" @change="emitDetailsUpdate" :disabled="isSubmitting">
          <label class="form-check-label" for="formatIndividual">Individual</label>
        </div>
        <div class="form-check form-check-inline">
          <input class="form-check-input" type="radio" name="eventFormat" id="formatTeam" value="Team" v-model="localDetails.format" @change="emitDetailsUpdate" :disabled="isSubmitting">
          <label class="form-check-label" for="formatTeam">Team</label>
        </div>
      </div>
    </div>

    <div class="mb-3">
      <label for="eventName" class="form-label">Event Name <span class="text-danger">*</span></label>
      <input
        id="eventName"
        class="form-control"
        type="text"
        v-model="localDetails.eventName"
        :disabled="isSubmitting"
        placeholder="Enter event name"
        required
        @input="emitDetailsUpdate"
      />
    </div>

    <div class="mb-3">
      <label for="eventType" class="form-label">Event Type <span class="text-danger">*</span></label>
      <div class="input-group">
        <span class="input-group-text"><i class="fas fa-tag"></i></span>
        <select
          id="eventType"
          class="form-select"
          v-model="localDetails.type"
          :disabled="isSubmitting"
          required
          @change="emitDetailsUpdate"
        >
          <option value="" disabled>Select Type</option>
          <option
            v-for="type in availableEventTypes"
            :key="type"
            :value="type"
          >{{ type }}</option>
        </select>
      </div>
    </div>

    <div class="mb-3">
      <label for="eventDescription" class="form-label">Description <span class="text-danger">*</span></label>
      <textarea
        id="eventDescription"
        class="form-control"
        rows="4"
        v-model="localDetails.description"
        :disabled="isSubmitting"
        placeholder="Enter event description (supports Markdown)"
        required
        @input="emitDetailsUpdate"
      ></textarea>
      <small class="form-text text-muted">You can use Markdown for formatting.</small>
    </div>

    <div class="mb-3">
      <div class="form-check form-switch">
        <input
          class="form-check-input"
          type="checkbox"
          id="allowProjectSubmission"
          v-model="localDetails.allowProjectSubmission"
          :disabled="isSubmitting"
          @change="emitDetailsUpdate"
        />
        <label class="form-check-label" for="allowProjectSubmission">
          Allow Project Submission
        </label>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, toRefs } from 'vue';
import type { EventFormData } from '@/types/event';

interface Props {
  details: EventFormData['details'];
  isSubmitting: boolean;
  availableEventTypes: string[];
}

const emit = defineEmits(['update:details']);

const props = defineProps<Props>();
const { details, isSubmitting, availableEventTypes } = toRefs(props);

// Local copy for two-way binding
const localDetails = ref({ ...details.value });

watch(details, (newVal) => {
  localDetails.value = { ...newVal };
});

function emitDetailsUpdate() {
  emit('update:details', { ...localDetails.value });
}
</script>

<style scoped>
</style>
