<template>
  <section class="section-spacing manage-multi-event-section bg-light">
    <div class="container-lg">
      <div class="d-flex justify-content-between align-items-center mb-4 pb-3 border-bottom">
        <div>
          <h1 class="h2 text-gradient-primary mb-1">{{ pageTitle }}</h1>
          <p class="text-subtitle mb-0">{{ pageSubtitle }}</p>
        </div>
        <button
          class="btn btn-outline-secondary btn-sm btn-icon"
          @click="goBack"
          aria-label="Go back"
        >
          <i class="fas fa-arrow-left me-1"></i>
          <span>Back</span>
        </button>
      </div>

      <div v-if="loading" class="text-center py-5 my-5">
        <div class="spinner-border text-primary" role="status" style="width: 3rem; height: 3rem;">
          <span class="visually-hidden">Loading...</span>
        </div>
        <p class="text-muted mt-3">Loading event data...</p>
      </div>

      <div v-else-if="loadError" class="alert alert-danger">
        {{ loadError }}
      </div>

      <form v-else @submit.prevent="handleSubmitForm" class="needs-validation" novalidate ref="formRef">
        <!-- Overall Event Details Card -->
        <div class="card shadow-sm mb-4 rounded-3 overflow-hidden">
          <div class="card-header bg-primary-subtle text-primary-emphasis py-3">
            <h5 class="mb-0 fw-medium"><i class="fas fa-info-circle me-2"></i>1. Overall Event Details</h5>
          </div>
          <div class="card-body p-4">
            <EventBasicDetailsForm
              v-if="formData.details"
              v-model:details="formData.details"
              :isSubmitting="isSubmitting"
              :isEditing="isEditing"
              :isMultiEventOverall="true"
              @validity-change="handleBasicDetailsValidityChange"
            />
            <hr class="my-4">
            <EventCoOrganizerForm
              v-if="formData.details"
              v-model:organizers="formData.details.organizers"
              :isSubmitting="isSubmitting"
              :nameCache="nameCache"
              :currentUserUid="profileStore.studentId"
              :allUsers="allUsers"
              @validity-change="handleOrganizersValidityChange"
            />
            <hr class="my-4">
            <EventScheduleForm
              v-if="formData.details"
              v-model:dates="formData.details.date"
              :isSubmitting="isSubmitting"
              :eventId="eventId"
              @error="handleFormError"
              @availability-change="handleDateAvailabilityChange"
              @validity-change="handleScheduleValidityChange"
            />
          </div>
        </div>

        <!-- Phases Management Card -->
        <div class="card shadow-sm mb-4 rounded-3 overflow-hidden">
          <div class="card-header bg-info-subtle text-info-emphasis py-3">
            <h5 class="mb-0 fw-medium"><i class="fas fa-layer-group me-2"></i>2. Event Phases Configuration</h5>
          </div>
          <div class="card-body p-4">
            <MultiEventPhaseManager
              v-if="formData.details"
              v-model="formData.details.phases"
              :isSubmitting="isSubmitting"
              :overallEventIsCompetition="formData.details.isCompetition || false"
              :allUsers="allUsers"
              :nameCache="nameCache"
              @validity-change="handlePhasesValidityChange"
              @error="handleFormError"
            />
          </div>
        </div>

        <!-- Submit Button -->
        <div class="d-flex justify-content-end gap-2 mt-5 pt-4 border-top">
          <button type="button" class="btn btn-outline-secondary" @click="goBack" :disabled="isSubmitting">
            Cancel
          </button>
          <button
            type="submit"
            class="btn btn-primary px-4"
            :class="{ 'btn-loading': isSubmitting }"
            :disabled="isSubmitting || !isFormCompletelyValid"
          >
            <span class="btn-text">{{ isEditing ? 'Update Multi-Event' : 'Submit Multi-Event Request' }}</span>
          </button>
        </div>
      </form>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useEventStore } from '@/stores/eventStore';
import { useProfileStore } from '@/stores/profileStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { EventFormat, EventStatus, type EventFormData, type EventPhase } from '@/types/event';
import type { UserData } from '@/types/student';
import { DateTime } from 'luxon';

// Import child components
import EventBasicDetailsForm from '@/components/forms/EventBasicDetailsForm.vue';
import EventCoOrganizerForm from '@/components/forms/EventCoOrganizerForm.vue';
import EventScheduleForm from '@/components/forms/EventScheduleForm.vue';
import MultiEventPhaseManager from '@/components/forms/MultiEventPhaseManager.vue'; // New component

const route = useRoute();
const router = useRouter();
const eventStore = useEventStore();
const profileStore = useProfileStore();
const notificationStore = useNotificationStore();

const eventId = ref(route.params.eventId as string || '');
const isEditing = ref(false);
const loading = ref(true);
const loadError = ref('');
const isSubmitting = ref(false);
const formRef = ref<HTMLFormElement | null>(null);

const allUsers = ref<UserData[]>([]);
const nameCache = ref<Record<string, string>>({});

// Form data structure
const defaultFormData: EventFormData = {
  details: {
    eventName: '',
    description: '',
    format: EventFormat.MultiEvent, // Fixed for this view
    isCompetition: false,
    organizers: [],
    coreParticipants: [], // Will remain empty for MultiEvent overall
    type: '', // Will remain empty for MultiEvent overall
    date: { start: null, end: null },
    rules: null,
    prize: null,
    allowProjectSubmission: false, // Will remain false for MultiEvent overall
    phases: [],
  },
  participants: [], // Will remain empty
  criteria: [], // Will remain empty
  teams: [], // Will remain empty
  status: EventStatus.Pending,
  votingOpen: false,
};

const formData = ref<EventFormData>(JSON.parse(JSON.stringify(defaultFormData)));

// Validation states
const isBasicDetailsValid = ref(false);
const isOrganizersValid = ref(true); // Default to true as it might be optional or prefilled
const isScheduleValid = ref(false);
const isDateAvailable = ref(true);
const arePhasesValid = ref(false);

const pageTitle = computed(() => isEditing.value ? 'Edit Multi-Stage Event' : 'Create New Multi-Stage Event');
const pageSubtitle = computed(() => isEditing.value ? 'Update the details and phases of your multi-stage event.' : 'Define the overall details and configure the phases for your multi-stage event.');

const isFormCompletelyValid = computed(() => {
  return isBasicDetailsValid.value &&
         isOrganizersValid.value &&
         isScheduleValid.value &&
         isDateAvailable.value &&
         arePhasesValid.value &&
         (formData.value.details.phases?.length || 0) > 0; // Must have at least one phase
});

function goBack() {
  if (window.history.length > 1) {
    router.go(-1);
  } else {
    router.push({ name: 'Home' }); // Or a relevant events list page
  }
}

function handleFormError(message: string) {
  notificationStore.showNotification({ message, type: 'error', duration: 5000 });
}

// Validity handlers for child components
function handleBasicDetailsValidityChange(isValid: boolean) {
  isBasicDetailsValid.value = isValid;
}
function handleOrganizersValidityChange(isValid: boolean) {
  isOrganizersValid.value = isValid;
}
function handleScheduleValidityChange(isValid: boolean) {
  isScheduleValid.value = isValid;
}
function handleDateAvailabilityChange(isAvailable: boolean) {
  isDateAvailable.value = isAvailable;
}
function handlePhasesValidityChange(isValid: boolean) {
  arePhasesValid.value = isValid;
}

async function populateFormForEdit(id: string) {
  try {
    let event = eventStore.getEventById(id);
    if (!event) {
      event = await eventStore.fetchEventDetails(id);
    }

    if (!event || event.details.format !== EventFormat.MultiEvent) {
      throw new Error("Event not found, is not a Multi-Stage event, or you don't have permission.");
    }

    // Basic permission check (can be expanded)
    const isOwner = event.requestedBy === profileStore.studentId;
    const isOrganizer = event.details.organizers.includes(profileStore.studentId || '');
     if (!isOwner && !isOrganizer && !(profileStore.isAdmin || profileStore.isFaculty)) {
       throw new Error("You do not have permission to edit this event.");
     }


    // Deep copy and populate form data
    const eventData = JSON.parse(JSON.stringify(event));
    formData.value.details.eventName = eventData.details?.eventName || '';
    formData.value.details.description = eventData.details?.description || '';
    formData.value.details.isCompetition = eventData.details?.isCompetition || false;
    formData.value.details.organizers = eventData.details?.organizers || [];
    formData.value.details.rules = eventData.details?.rules || null;
    formData.value.details.prize = eventData.details?.prize || null;

    const toYYYYMMDD = (ts: any) => {
      if (!ts) return null;
      return DateTime.fromSeconds(ts.seconds).toFormat('yyyy-MM-dd');
    };
    formData.value.details.date.start = toYYYYMMDD(eventData.details?.date?.start);
    formData.value.details.date.end = toYYYYMMDD(eventData.details?.date?.end);

    formData.value.details.phases = (eventData.details?.phases || []).map((phase: any) => ({
        ...phase,
        id: phase.id || crypto.randomUUID(), // Ensure phases have IDs
        // Ensure all required fields for a phase are present, even if null/empty
        participants: phase.participants || [],
        coreParticipants: phase.coreParticipants || [],
        criteria: phase.criteria || [],
        teams: phase.teams || [],
        rules: phase.rules ?? null,
        prize: phase.prize ?? null,
        allowProjectSubmission: phase.allowProjectSubmission ?? false,
        type: phase.type || '',
    }));

    formData.value.status = eventData.status || EventStatus.Pending;
    // Ensure fields not relevant to MultiEvent overall are kept default/empty
    formData.value.details.coreParticipants = [];
    formData.value.details.type = '';
    formData.value.details.allowProjectSubmission = false;
    formData.value.participants = [];
    formData.value.criteria = [];
    formData.value.teams = [];

  } catch (err: any) {
    loadError.value = err.message || 'Failed to load event data for editing.';
    notificationStore.showNotification({ message: loadError.value, type: 'error' });
  }
}

async function handleSubmitForm() {
  if (!isFormCompletelyValid.value) {
    formRef.value?.classList.add('was-validated'); // Trigger browser validation styles
    let errorMessages = [];
    if (!isBasicDetailsValid.value) errorMessages.push("Overall event details are incomplete.");
    if (!isOrganizersValid.value) errorMessages.push("Organizer information is incomplete.");
    if (!isScheduleValid.value) errorMessages.push("Event schedule is invalid.");
    if (!isDateAvailable.value) errorMessages.push("Selected dates conflict with other events.");
    if (!formData.value.details.phases || formData.value.details.phases.length === 0) {
         errorMessages.push("At least one phase is required for a multi-stage event.");
    } else if (!arePhasesValid.value) {
        errorMessages.push("One or more phases have incomplete or invalid configurations.");
    }

    handleFormError(`Please correct the following issues: ${errorMessages.join(' ')}`);
    return;
  }

  isSubmitting.value = true;

  const submissionData: EventFormData = JSON.parse(JSON.stringify(formData.value));
  // Ensure MultiEvent specific data cleanup (already handled by design but good to double check)
  submissionData.details.format = EventFormat.MultiEvent;
  submissionData.details.coreParticipants = [];
  submissionData.details.type = '';
  submissionData.details.allowProjectSubmission = false;
  submissionData.participants = [];
  submissionData.criteria = [];
  submissionData.teams = [];

  // Validate phases again server-side style
  for (const [index, phase] of (submissionData.details.phases || []).entries()) {
    if (!phase.phaseName?.trim()) throw new Error(`Phase ${index + 1} is missing a name.`);
    if (!phase.type?.trim()) throw new Error(`Phase ${index + 1} is missing a type.`);
    if (!phase.description?.trim()) throw new Error(`Phase ${index + 1} is missing a description.`);
    if (!phase.participants || phase.participants.length === 0) throw new Error(`Phase ${index + 1} requires at least one participant.`);
    if (!phase.criteria || phase.criteria.length === 0) throw new Error(`Phase ${index + 1} requires at least one rating criteria.`);
    if (phase.format === EventFormat.Team && (!phase.teams || phase.teams.length === 0)) {
      throw new Error(`Phase ${index + 1} (Team format) requires at least one team.`);
    }
    if (phase.format === EventFormat.Individual && (!phase.coreParticipants || phase.coreParticipants.length === 0)) {
       throw new Error(`Phase ${index + 1} (Individual format) requires at least one core participant.`);
    }
  }

  // Prize validation for overall competition
   if (submissionData.details.isCompetition && !submissionData.details.prize?.trim()) {
        const hasPhasePrizes = submissionData.details.phases?.some(p => !!p.prize?.trim());
        if (!hasPhasePrizes) {
            isSubmitting.value = false;
            return handleFormError("If the overall event is a competition, either an overall prize or at least one phase prize must be specified.");
        }
    }


  try {
    let successMessage = '';
    let newEventId = '';

    if (isEditing.value) {
      await eventStore.editMyEventRequest(eventId.value, submissionData); // Assuming this method can handle MultiEvent updates
      successMessage = 'Multi-Stage Event updated successfully!';
      newEventId = eventId.value;
    } else {
      const createdEventId = await eventStore.requestNewEvent(submissionData); // Assuming this method can handle MultiEvent creation
      if (!createdEventId) throw new Error("Failed to create event ID.");
      successMessage = 'Multi-Stage Event request submitted successfully!';
      newEventId = createdEventId;
    }

    notificationStore.showNotification({ message: successMessage, type: 'success' });
    router.push({ name: 'EventDetails', params: { id: newEventId } });

  } catch (error: any) {
    handleFormError(error.message || 'An unknown error occurred while submitting the event.');
  } finally {
    isSubmitting.value = false;
  }
}

onMounted(async () => {
  loading.value = true;
  isEditing.value = !!eventId.value;
  formData.value = JSON.parse(JSON.stringify(defaultFormData)); // Reset form data

  if (profileStore.studentId) {
    formData.value.details.organizers = [profileStore.studentId];
  }


  try {
    allUsers.value = await profileStore.fetchAllStudentProfiles();
    allUsers.value.forEach(u => {
      if (u.uid && u.name) nameCache.value[u.uid] = u.name;
    });

    if (isEditing.value) {
      await populateFormForEdit(eventId.value);
    }
    // Trigger validity checks after form is potentially populated
    // This might require a tick or slight delay if child components need to initialize
    await new Promise(resolve => setTimeout(resolve, 0));
    handleBasicDetailsValidityChange(formRef.value?.checkValidity() || false); // A bit simplistic
    handlePhasesValidityChange(formData.value.details.phases ? formData.value.details.phases.length > 0 : false);


  } catch (error: any) {
    loadError.value = "Failed to load initial data: " + error.message;
    notificationStore.showNotification({ message: loadError.value, type: 'error' });
  } finally {
    loading.value = false;
  }
});

// Watch for changes in overall event competition status to potentially clear overall prize
watch(() => formData.value.details.isCompetition, (isOverallComp) => {
  if (!isOverallComp) {
    formData.value.details.prize = null; // Clear overall prize if not a competition
  }
});

</script>

<style scoped>
.manage-multi-event-section {
  min-height: 100vh;
}
.card-header {
  border-bottom: 2px solid rgba(var(--bs-primary-rgb), 0.2);
}
.btn-loading .btn-text {
  display: none;
}
.btn-loading::after {
  content: "";
  display: inline-block;
  width: 1rem;
  height: 1rem;
  border: 2px solid currentColor;
  border-right-color: transparent;
  border-radius: 50%;
  animation: spinner-border .75s linear infinite;
  vertical-align: middle;
}
</style>
