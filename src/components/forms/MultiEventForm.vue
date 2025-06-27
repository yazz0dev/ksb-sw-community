<template>
  <div class="phase-form">
    <div v-if="!localPhase" class="alert alert-danger">
      No phase data provided.
    </div>

    <div v-else>
      <!-- Phase Format Selection -->
      <div class="mb-3">
        <label class="form-label fw-medium">Phase Format <span class="text-danger">*</span></label>
        <div class="d-flex flex-wrap gap-3">
          <div class="form-check">
            <input 
              class="form-check-input" 
              type="radio" 
              :name="`phaseFormat-${localPhase.id}`" 
              :id="`formatIndividual-${localPhase.id}`" 
              :value="EventFormat.Individual" 
              v-model="localPhase.format" 
              :disabled="isSubmitting"
            >
            <label class="form-check-label" :for="`formatIndividual-${localPhase.id}`">Individual</label>
          </div>
          <div class="form-check">
            <input 
              class="form-check-input" 
              type="radio" 
              :name="`phaseFormat-${localPhase.id}`" 
              :id="`formatTeam-${localPhase.id}`" 
              :value="EventFormat.Team" 
              v-model="localPhase.format" 
              :disabled="isSubmitting"
            >
            <label class="form-check-label" :for="`formatTeam-${localPhase.id}`">Team</label>
          </div>
        </div>
      </div>

      <!-- Phase Name -->
      <div class="mb-3">
        <label :for="`phaseName-${localPhase.id}`" class="form-label fw-medium">Phase Name <span class="text-danger">*</span></label>
        <input
          :id="`phaseName-${localPhase.id}`"
          class="form-control"
          type="text"
          v-model.trim="localPhase.phaseName"
          :disabled="isSubmitting"
          placeholder="Enter phase name"
          maxlength="100"
        />
      </div>

      <!-- Phase Type -->
      <div class="mb-3">
        <label :for="`phaseType-${localPhase.id}`" class="form-label fw-medium">Phase Type <span class="text-danger">*</span></label>
        <select
          :id="`phaseType-${localPhase.id}`"
          class="form-select"
          v-model="localPhase.type"
          :disabled="isSubmitting"
        >
          <option value="" disabled>Select type...</option>
          <option v-for="typeOpt in eventTypesForFormat" :key="typeOpt" :value="typeOpt">{{ typeOpt }}</option>
        </select>
      </div>

      <!-- Description -->
      <div class="mb-3">
        <label :for="`phaseDescription-${localPhase.id}`" class="form-label fw-medium">Description <span class="text-danger">*</span></label>
        <textarea
          :id="`phaseDescription-${localPhase.id}`"
          class="form-control"
          rows="4"
          v-model="localPhase.description"
          :disabled="isSubmitting"
          placeholder="Describe this phase..."
        ></textarea>
      </div>

      <!-- Rules -->
      <div class="mb-3">
        <label :for="`phaseRules-${localPhase.id}`" class="form-label fw-medium">Rules (Optional)</label>
        <textarea
          :id="`phaseRules-${localPhase.id}`"
          class="form-control"
          rows="3"
          v-model="localPhase.rules"
          :disabled="isSubmitting"
          placeholder="Enter specific rules for this phase"
        ></textarea>
      </div>

      <!-- Prize (if overall event is competition) -->
      <div v-if="isOverallCompetition" class="mb-3">
        <label :for="`phasePrize-${localPhase.id}`" class="form-label fw-medium">Phase Prize (Optional)</label>
        <input
          :id="`phasePrize-${localPhase.id}`"
          type="text"
          class="form-control"
          v-model.trim="localPhase.prize"
          placeholder="e.g., Vouchers for phase winner"
          :disabled="isSubmitting"
        />
      </div>

      <!-- Allow Project Submission -->
      <div class="mb-3">
        <div class="form-check form-switch">
          <input
            class="form-check-input"
            type="checkbox"
            role="switch"
            :id="`phaseAllowSubmission-${localPhase.id}`"
            v-model="localPhase.allowProjectSubmission"
            :disabled="isSubmitting || isOverallCompetition"
          />
          <label class="form-check-label fw-medium" :for="`phaseAllowSubmission-${localPhase.id}`">
            Allow Project Submissions for this Phase
            <span v-if="isOverallCompetition" class="text-muted small ms-1">(Disabled for competition phases)</span>
          </label>
        </div>
      </div>

      <!-- Participants -->
      <div class="mb-4">
        <h6 class="text-muted mb-2">Participants for this Phase <span class="text-danger">*</span></h6>
        <EventParticipantForm
          :participants="localPhase.participants"
          :coreParticipants="localPhase.coreParticipants"
          @update:participants="localPhase.participants = $event"
          @update:coreParticipants="localPhase.coreParticipants = $event"
          :allUsers="allUsers"
          :eventFormat="localPhase.format"
          :isSubmitting="isSubmitting"
          :nameCache="nameCache"
          :is-editing="false"
          :max-participants="50"
          @validity-change="participantsValid = $event"
        />
      </div>

      <!-- Teams (if Team format) -->
      <div v-if="localPhase.format === EventFormat.Team" class="mb-4">
        <h6 class="text-muted mb-2">Teams for this Phase <span class="text-danger">*</span></h6>
        <ManageTeamsComponent
          :initial-teams="localPhase.teams"
          :students="allUsers.filter(u => localPhase?.participants?.includes(u.uid) || false)"
          :is-submitting="isSubmitting"
          :can-auto-generate="true"
          :event-id="localPhase.id"
          @update:teams="localPhase.teams = $event"
          @error="handleError"
          @validity-change="teamsValid = $event"
        />
      </div>

      <!-- Criteria -->
      <div class="mb-4">
        <h6 class="text-muted mb-2">Rating Criteria for this Phase <span class="text-danger">*</span></h6>
        <EventCriteriaForm
          :criteria="localPhase.criteria"
          @update:criteria="localPhase.criteria = $event"
          :isSubmitting="isSubmitting"
          :eventFormat="localPhase.format"
          :isIndividualCompetition="localPhase.format === EventFormat.Individual && isOverallCompetition"
          :assignableXpRoles="['developer', 'designer', 'presenter', 'problemSolver']"
          :totalXP="totalXP"
          @validity-change="criteriaValid = $event"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, type PropType } from 'vue';
import { EventFormat, type EventPhase } from '@/types/event';
import type { UserData } from '@/types/student';
import EventParticipantForm from '@/components/forms/EventParticipantForm.vue';
import ManageTeamsComponent from '@/components/forms/ManageTeamsComponent.vue';
import EventCriteriaForm from '@/components/forms/EventCriteriaForm.vue';

const props = defineProps({
  modelValue: {
    type: Array as PropType<EventPhase[]>,
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
    required: true,
  },
  nameCache: {
    type: Object as PropType<Record<string, string>>,
    required: true,
  },
});

const emit = defineEmits<{
  'update:modelValue': [value: EventPhase[]];
  'validity-change': [isValid: boolean];
  'error': [message: string];
}>();

const localPhase = computed(() => props.modelValue[0] || null);
const participantsValid = ref(false);
const teamsValid = ref(true);
const criteriaValid = ref(false);

const eventTypesForFormat = computed(() => {
  if (!localPhase.value) return [];
  
  switch (localPhase.value.format) {
    case EventFormat.Team: 
      return ['Hackathon', 'Project Competition', 'Case Study', 'Design Challenge'];
    case EventFormat.Individual:
    default: 
      return ['Quiz', 'Presentation', 'Code Challenge', 'Interview'];
  }
});

const totalXP = computed(() => {
  if (!localPhase.value?.criteria) return 0;
  return localPhase.value.criteria.reduce((sum, criteria) => sum + (criteria.points || 0), 0);
});

const isValid = computed(() => {
  if (!localPhase.value) return false;
  
  const hasBasicInfo = !!(
    localPhase.value.phaseName?.trim() &&
    localPhase.value.description?.trim() &&
    localPhase.value.type?.trim()
  );
  
  const hasValidParticipants = participantsValid.value;
  const hasValidCriteria = criteriaValid.value;
  
  let formatSpecificValid = true;
  if (localPhase.value.format === EventFormat.Team) {
    formatSpecificValid = teamsValid.value && localPhase.value.teams.length > 0;
  } else if (localPhase.value.format === EventFormat.Individual) {
    formatSpecificValid = localPhase.value.coreParticipants.length > 0;
  }
  
  return hasBasicInfo && hasValidParticipants && hasValidCriteria && formatSpecificValid;
});

function handleError(message: string) {
  emit('error', message);
}

// Watch for validity changes
watch(isValid, (newValid) => {
  emit('validity-change', newValid);
}, { immediate: true });

// Watch for changes and emit updates
watch(() => localPhase.value, (newPhase) => {
  if (newPhase) {
    emit('update:modelValue', [newPhase]);
  }
}, { deep: true });

// Watch for format changes to reset incompatible data
watch(() => localPhase.value?.format, (newFormat, oldFormat) => {
  if (!localPhase.value || newFormat === oldFormat) return;
  
  if (newFormat === EventFormat.Individual) {
    localPhase.value.teams = [];
    teamsValid.value = true;
  } else if (newFormat === EventFormat.Team) {
    localPhase.value.coreParticipants = [];
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



