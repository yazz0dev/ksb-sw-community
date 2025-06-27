// src/views/RequestEventView.vue
<template>
  <section class="section-spacing create-event-section bg-light">
    <div class="container-lg">

      <!-- Back Button and Title -->
      <div class="d-flex justify-content-between align-items-center mb-4 pb-3 border-bottom">
        <div>
          <h1 class="h2 text-gradient-primary mb-1">{{ pageTitle }}</h1>
          <p class="text-subtitle mb-0">{{ pageSubtitle }}</p>
        </div>
        <!-- Mobile Back Button -->
        <div class="mobile-back-button d-block d-md-none">
          <button
            class="btn btn-back btn-sm d-flex align-items-center"
            @click="goBack"
            aria-label="Go back"
          >
            <i class="fas fa-arrow-left me-2"></i>
            <span>Back</span>
          </button>
        </div>
        <!-- Desktop Back Button -->
        <button
          class="btn btn-back btn-sm btn-icon d-none d-md-inline-flex"
          @click="goBack"
          aria-label="Go back"
        >
          <i class="fas fa-arrow-left me-1"></i>
          <span>Back</span>
        </button>
      </div>
      
      <!-- Loading State -->
      <div v-if="loading" class="text-center py-5 my-5">
        <div class="spinner-border text-primary" role="status" style="width: 3rem; height: 3rem;">
          <span class="visually-hidden">Loading...</span>
        </div>
        <p class="text-muted mt-3">Loading event data...</p>
      </div>

      <!-- Error State for Editing -->
      <div v-else-if="editError" class="alert alert-danger p-4 shadow-sm border-danger-subtle mb-5">
        <div class="d-flex align-items-start">
                      <i class="fas fa-exclamation-circle text-danger me-3 h4 mt-1"></i>
          <div>
            <h5 class="alert-heading mb-2">Cannot Edit Event</h5>
            <p class="mb-2">{{ editError }}</p>
            <p class="small text-muted">You may not have permission, or the event is not in an editable state. {{ editError.includes("Multi-Stage event") ? "Please use the dedicated editor for Multi-Stage events." : "" }}</p>
            <div class="mt-3">
              <button type="button" class="btn btn-primary btn-sm btn-icon me-2" @click="$router.push({ name: 'Home' })">
                <i class="fas fa-home me-1"></i> Go to Home
              </button>
              <button type="button" class="btn btn-outline-secondary btn-sm btn-icon" @click="goBack">
                <i class="fas fa-arrow-left me-1"></i> Go Back
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Main Form Content -->
      <AuthGuard v-else :key="'auth-guard'" message="You must be logged in to request or edit events.">
        <div v-if="!isEditing && hasActiveRequest" :key="'active-request-warning'" class="alert alert-warning d-flex align-items-start mb-4 shadow-sm border-warning-subtle" role="alert" style="background-color: var(--bs-warning-bg-subtle);">
          <i class="fas fa-exclamation-triangle text-warning me-3 h4 mt-1"></i>
          <div>
            <h6 class="alert-heading mb-1 fw-medium">Pending Request Active</h6>
            <small class="text-body">You already have a pending event request. Please wait for it to be reviewed before submitting a new one, or <router-link :to="{ name: 'Profile' }" class="alert-link fw-medium">view your requests</router-link>.</small>
          </div>
        </div>

        <div v-else :key="'event-form-content'">
          <!-- Link to Multi-Stage Event Creation -->
          <div class="mb-4 p-3 bg-info-subtle border border-info-subtle rounded-3 text-center">
            <p class="mb-2 fs-small text-info-emphasis">
              <i class="fas fa-info-circle me-1"></i>
              Looking to create an event with multiple stages or sub-events (e.g., a competition with several rounds)?
            </p>
            <router-link :to="{ name: 'CreateMultiEvent' }" class="btn btn-info btn-sm btn-icon">
              <i class="fas fa-layer-group me-1"></i> Create Multi-Stage Event
            </router-link>
          </div>

          <form @submit.prevent="handleSubmitForm" class="needs-validation" novalidate ref="formRef">
            <!-- Event Basic Details Card -->
            <div class="card shadow-sm mb-4 rounded-3 overflow-hidden">
              <div class="card-header bg-primary-subtle text-primary-emphasis py-3">
                <h5 class="mb-0 fw-medium"><i class="fas fa-info-circle me-2"></i>1. Event Details</h5>
              </div>
              <div class="card-body p-4">
                <EventBasicDetailsForm
                  v-model:details="formData.details"
                  :isSubmitting="isSubmitting"
                  :isEditing="isEditing"
                  :is-phase-form="false"
                  :hide-multi-event-option="true"
                  @validity-change="handleBasicDetailsValidityChange"
                />
                <hr class="my-4">
                <EventCoOrganizerForm
                  v-model:organizers="formData.details.organizers"
                  :isSubmitting="isSubmitting"
                  :nameCache="nameCache"
                  :currentUserUid="profileStore.studentId"
                  :allUsers="allUsers"
                  @validity-change="handleOrganizersValidityChange"
                />
              </div>
            </div>

            <!-- Rating Criteria Card -->
            <div class="card shadow-sm mb-4 rounded-3 overflow-hidden">
              <div class="card-header bg-primary-subtle text-primary-emphasis py-3">
                <h5 class="mb-0 fw-medium"><i class="fas fa-star me-2"></i>{{ criteriaCardNumber }}. {{ formData.details.format === EventFormat.Individual && formData.details.isCompetition ? 'Competition Awards' : 'Rating Criteria' }} & XP</h5>
              </div>
              <div class="card-body p-4">
                <EventCriteriaForm
                  v-model:criteria="formDataCriteria"
                  :isSubmitting="isSubmitting"
                  :eventFormat="formData.details.format"
                  :isIndividualCompetition="!!(formData.details.format === EventFormat.Individual && formData.details.isCompetition)"
                  :assignableXpRoles="assignableXpRoles"
                  @validity-change="handleCriteriaValidityChange"
                />
              </div>
            </div>

            <!-- Event Participants Card (Only shown for Individual format) -->
            <div v-if="formData.details.format === EventFormat.Individual" class="card shadow-sm mb-4 rounded-3 overflow-hidden">
              <div class="card-header bg-primary-subtle text-primary-emphasis py-3">
                <h5 class="mb-0 fw-medium"><i class="fas fa-users me-2"></i>{{ participantCardNumber }}. Event Participants</h5>
              </div>
              <div class="card-body p-4">
                <EventParticipantForm
                  v-model:participants="formDataParticipants"
                  v-model:coreParticipants="formData.details.coreParticipants"
                  :allUsers="allUsers"
                  :eventFormat="formData.details.format"
                  :isSubmitting="isSubmitting"
                  :nameCache="nameCache"
                  :is-editing="isEditing"
                  :max-participants="MAX_PARTICIPANTS_INDIVIDUAL_AUTO_ADD"
                  @validity-change="handleParticipantsValidityChange"
                />
              </div>
            </div>
            
            <!-- Team Configuration Card (Only shown for Team format) -->
            <div 
              v-if="formData.details.format === EventFormat.Team && teamsComponentReady" 
              class="card shadow-sm mb-4 rounded-3 overflow-hidden"
            >
              <div class="card-header bg-primary-subtle text-primary-emphasis py-3">
                <h5 class="mb-0 fw-medium"><i class="fas fa-users-cog me-2"></i>{{ teamConfigCardNumber }}. Team Configuration</h5>
              </div>
              <div class="card-body p-4">
                  <ManageTeamsComponent
                  :initial-teams="formData.teams ?? []"
                  :students="allUsers"
                  :is-submitting="isSubmitting"
                  :can-auto-generate="true" 
                  :event-id="eventId || ''"
                  @update:teams="handleTeamUpdate"
                  @error="handleFormError"
                  @validity-change="handleTeamsValidityChange"
                />
              </div>
            </div>

            <!-- Event Schedule Card -->
             <div class="card shadow-sm mb-4 rounded-3 overflow-hidden">
               <div class="card-header bg-primary-subtle text-primary-emphasis py-3">
                 <h5 class="mb-0 fw-medium"><i class="fas fa-calendar-alt me-2"></i>{{ scheduleCardNumber }}. Event Schedule</h5>
               </div>
               <div class="card-body p-4">
                 <EventScheduleForm
                   v-model:dates="formData.details.date"
                   :isSubmitting="isSubmitting"
                   :eventId="eventId"
                   @error="handleFormError"
                   @availability-change="handleAvailabilityChange"
                   @validity-change="handleScheduleValidityChange"
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
                 :disabled="isSubmitting || !isFormValid"
               >
                 <span class="btn-text">{{ isEditing ? 'Update Event' : 'Submit Request' }}</span>
               </button>
             </div>
          </form>
        </div>
      </AuthGuard>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import EventBasicDetailsForm from '@/components/forms/EventBasicDetailsForm.vue';
import EventScheduleForm from '@/components/forms/EventScheduleForm.vue';
import ManageTeamsComponent from '@/components/forms/ManageTeamsComponent.vue';
import EventCoOrganizerForm from '@/components/forms/EventCoOrganizerForm.vue';
import EventCriteriaForm from '@/components/forms/EventCriteriaForm.vue';
import EventParticipantForm from '@/components/forms/EventParticipantForm.vue';
// MultiEventForm import removed
import AuthGuard from '@/components/AuthGuard.vue';
import { EventFormat, EventStatus, type EventFormData, type Team } from '@/types/event';
import { useEventStore } from '@/stores/eventStore';
import { useProfileStore } from '@/stores/profileStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { DateTime } from 'luxon';
import type { UserData } from '@/types/student';

const route = useRoute();
const router = useRouter();

const eventStore = useEventStore();
const profileStore = useProfileStore();
const notificationStore = useNotificationStore();

const MAX_PARTICIPANTS_INDIVIDUAL_AUTO_ADD = 50;

const loading = ref(true);
const editError = ref('');
const isEditing = ref(false);
const hasActiveRequest = ref(false);
const isSubmitting = ref(false);
const eventId = ref(route.params.eventId as string || '');
const originalStatus = ref<EventStatus | null>(null);
const allUsers = ref<UserData[]>([]);
const nameCache = ref<Record<string, string>>({});
const assignableXpRoles = ref<readonly string[]>(['developer', 'designer', 'presenter', 'problemSolver']);
const teamsComponentReady = ref(true);
const formRef = ref<HTMLFormElement | null>(null);

const isDateAvailable = ref(true);
const isBasicDetailsValid = ref(false);
const isCriteriaValid = ref(true); // Criteria are always relevant now
const isParticipantsValid = ref(true);
const isTeamsValid = ref(true);
const isScheduleValid = ref(false);
const isOrganizersValid = ref(true);
// isMultiEventValid removed

const defaultInitialFormat = EventFormat.Individual; // Default to Individual or Team

const formData = ref<EventFormData>({
  details: {
    eventName: '', 
    description: '', 
    isCompetition: false,
    format: defaultInitialFormat,
    type: '',
    allowProjectSubmission: false,
    organizers: [],
    coreParticipants: [], 
    date: { start: null, end: null },
    rules: null,
    prize: null,
    phases: [], // Will remain empty
  },
  participants: [],
  criteria: [],
  teams: [],
  status: EventStatus.Pending,
  votingOpen: false,
});

const isFormValid = computed(() => {
  if (!formData.value?.details) return false;
  
  const basicChecks = isBasicDetailsValid.value &&
                      isScheduleValid.value &&
                      isDateAvailable.value &&
                      isOrganizersValid.value &&
                      isCriteriaValid.value; // Criteria are always checked
  
  if (formData.value.details.format === EventFormat.Team) {
    return basicChecks && isTeamsValid.value;
  } else if (formData.value.details.format === EventFormat.Individual) {
    return basicChecks && isParticipantsValid.value;
  }
  // Should not reach here if EventBasicDetailsForm prevents other formats
  return false;
});

const pageTitle = computed(() => {
  return isEditing.value ? 'Edit Event Request' : 'Request New Event';
});

const pageSubtitle = computed(() => {
  return isEditing.value 
    ? 'Update your event details and configurations for an Individual or Team event.'
    : 'Fill out the form below to submit your event request for review (Individual or Team event).';
});

const formDataParticipants = computed({
  get: () => formData.value?.participants || [],
  set: (value: string[]) => {
    if (formData.value) {
      formData.value.participants = value;
    }
  }
});

const formDataCriteria = computed({
  get: () => formData.value?.criteria || [],
  set: (value) => {
    if (formData.value) {
      formData.value.criteria = value;
    }
  }
});

// formPhases computed property removed

const criteriaCardNumber = computed(() => 2); // Event Details (1) -> Criteria (2)

const participantCardNumber = computed(() => {
  // Event Details (1) -> Criteria (2) -> Participants (3)
  return formData.value.details.format === EventFormat.Individual ? 3 : 0;
});

const teamConfigCardNumber = computed(() => {
  // Event Details (1) -> Criteria (2) -> Team Config (3)
  return formData.value.details.format === EventFormat.Team ? 3 : 0;
});

const scheduleCardNumber = computed(() => {
  let num = 1; // Event Details
  num++;     // Criteria
  if (formData.value.details.format === EventFormat.Individual || formData.value.details.format === EventFormat.Team) {
    num++; // Either Participants or Team Config
  }
  num++; // Schedule
  return num;
});

function goBack() {
  if (window.history.length > 1) {
    router.go(-1);
  } else {
    router.push({ name: 'Home' });
  }
}

function handleTeamUpdate(newTeams: Team[]) {
  formData.value.teams = newTeams;
}

function handleFormError(msg: string) {
  notificationStore.showNotification({ message: msg, type: 'error', duration: 5000 });
}

function handleAvailabilityChange(isAvailable: boolean) {
  isDateAvailable.value = isAvailable;
}

function handleBasicDetailsValidityChange(isValid: boolean) {
  isBasicDetailsValid.value = isValid;
}
function handleCriteriaValidityChange(isValid: boolean) {
  isCriteriaValid.value = isValid;
}
function handleParticipantsValidityChange(isValid: boolean) {
  isParticipantsValid.value = isValid;
}
function handleTeamsValidityChange(isValid: boolean) {
  isTeamsValid.value = isValid;
}
function handleScheduleValidityChange(isValid: boolean) {
  isScheduleValid.value = isValid;
}
// handleMultiEventValidityChange removed
function handleOrganizersValidityChange(isValid: boolean) {
  isOrganizersValid.value = isValid;
}

function populateFormData(event: any) {
  const eventData = JSON.parse(JSON.stringify(event));

  if (!formData.value) { // Should ideally not happen with ref initialization
    formData.value = { details: {} } as EventFormData; // Basic init
  }
   formData.value.details = { // Ensure details object exists
    ...formData.value.details,
    eventName: eventData.details?.eventName || '',
    format: eventData.details?.format || defaultInitialFormat,
    description: eventData.details?.description || '',
    rules: eventData.details?.rules || null,
    prize: eventData.details?.prize || null,
    allowProjectSubmission: eventData.details?.allowProjectSubmission ?? (eventData.details?.format === EventFormat.Team),
    organizers: eventData.details?.organizers || [],
    isCompetition: eventData.details?.isCompetition || false,
    type: eventData.details?.type || '',
    coreParticipants: [], // Initialize and then populate if Individual
    date: {
      start: null,
      end: null
    },
    phases: [], // Always empty for this form
  };

  formData.value.participants = eventData.participants || [];
  formData.value.criteria = eventData.criteria || [];
  formData.value.teams = eventData.teams || [];
  formData.value.status = eventData.status || EventStatus.Pending;
  formData.value.votingOpen = eventData.votingOpen || false;

  if (formData.value.details.format === EventFormat.Individual) {
    formData.value.details.coreParticipants = eventData.details?.coreParticipants || [];
    const currentParticipants = new Set([...(formData.value.participants || []), ...(formData.value.details.coreParticipants || [])]);
    formData.value.participants = Array.from(currentParticipants);
  } else if (formData.value.details.format === EventFormat.Team) {
     formData.value.details.coreParticipants = []; // Ensure empty for Team
  }
  
  const toYYYYMMDD = (ts: any) => {
    if (!ts) return null;
    return DateTime.fromSeconds(ts.seconds).toFormat('yyyy-MM-dd');
  };
  formData.value.details.date.start = toYYYYMMDD(eventData.details?.date?.start);
  formData.value.details.date.end = toYYYYMMDD(eventData.details?.date?.end);
}

async function initializeFormForEdit(id: string) {
  loading.value = true;
  editError.value = '';
  try {
    let event = eventStore.events.find(e => e.id === id);
    if (!event) {
      const fetchedEvent = await eventStore.fetchEventDetails(id);
      if (!fetchedEvent) throw new Error("Event not found or access denied.");
      event = fetchedEvent;
    }
    
    if (event.details.format === EventFormat.MultiEvent) {
      router.replace({ name: 'EditMultiEvent', params: { eventId: id } });
      return;
    }
    
    const { isEventOrganizer, isEventEditable } = await import('@/utils/permissionHelpers');
    const isOrganizer = isEventOrganizer(event, profileStore.studentId);
    const isOwnRequest = event.requestedBy === profileStore.studentId && [EventStatus.Pending, EventStatus.Rejected].includes(event.status);
    const canEdit = (isOrganizer && isEventEditable(event.status)) || isOwnRequest;
    
    if (!canEdit) {
      throw new Error(`You cannot edit this event. You must be an organizer and the event must be in an editable state.`);
    }
    
    populateFormData(event);
    originalStatus.value = event.status;
  } catch (err: any) {
    editError.value = err.message || 'An unknown error occurred while fetching event data.';
  } finally {
    loading.value = false;
  }
}

async function handleSubmitForm() {
  const formEl = formRef.value;
  if (!isFormValid.value) {
    if (formEl) formEl.classList.add('was-validated');
    
    const validationErrors = [];
    if (!isBasicDetailsValid.value) validationErrors.push('Event details are incomplete');
    if (!isScheduleValid.value) validationErrors.push('Event schedule is invalid');
    if (!isDateAvailable.value) validationErrors.push('Selected dates conflict with existing events');
    if (!isCriteriaValid.value) validationErrors.push('Rating criteria are incomplete');
    if (formData.value.details.format === EventFormat.Individual && !isParticipantsValid.value) {
      validationErrors.push('Event participants are required');
    }
    if (formData.value.details.format === EventFormat.Team && !isTeamsValid.value) {
      validationErrors.push('Team configuration is incomplete');
    }
    
    handleFormError(`Please fix the following issues: ${validationErrors.join('; ')}`);
    return;
  }

  isSubmitting.value = true;
  try {
    const submissionData = JSON.parse(JSON.stringify(formData.value));
    submissionData.details.phases = []; // Ensure phases are always empty
      
    if (!submissionData.details.type?.trim()) {
      throw new Error("Event type is required.");
    }
      
    if (submissionData.details.format === EventFormat.Individual) {
      submissionData.details.allowProjectSubmission = false;
      submissionData.details.rules = null;
      if (!submissionData.details.coreParticipants || submissionData.details.coreParticipants.length === 0) {
        throw new Error("Individual events require at least one core participant.");
      }
    } else if (submissionData.details.format === EventFormat.Team) {
      submissionData.details.coreParticipants = [];
      if (!submissionData.teams || submissionData.teams.length === 0) {
        throw new Error("Team events require at least one team to be configured.");
      }
    } else {
      throw new Error(`Unsupported event format: ${submissionData.details.format}. This form only supports Individual and Team events.`);
    }

    let success = false;
    let newEventId = '';

    if (isEditing.value) {
      const payload = { ...submissionData };
      if (originalStatus.value === EventStatus.Rejected) {
        payload.status = EventStatus.Pending;
      }
      success = await eventStore.editMyEventRequest(eventId.value, payload);
      newEventId = eventId.value;
    } else {
      const eventId = await eventStore.requestNewEvent(submissionData);
      if (!eventId) throw new Error("Failed to create event");
      newEventId = eventId;
      success = !!newEventId;
    }

    if (success) {
      notificationStore.showNotification({
        message: `Event ${isEditing.value ? 'updated' : 'requested'} successfully!`,
        type: 'success',
      });
      router.push({ name: 'EventDetails', params: { id: newEventId } });
    }
  } catch (error: any) {
    handleFormError(error.message || `An unknown error occurred.`);
  } finally {
    isSubmitting.value = false;
  }
}

onMounted(async () => {
  loading.value = true;
  isEditing.value = !!eventId.value;

  try {
    allUsers.value = await profileStore.fetchAllStudentProfiles();
    nameCache.value = allUsers.value.reduce((acc, user) => {
      if (user.uid && user.name) acc[user.uid] = user.name;
      return acc;
    }, {} as Record<string, string>);

    if (isEditing.value) {
      await initializeFormForEdit(eventId.value);
    } else {
      hasActiveRequest.value = await eventStore.checkExistingPendingRequest();
      formData.value = {
        details: {
          eventName: '', description: '', isCompetition: false,
          format: defaultInitialFormat, type: '', allowProjectSubmission: defaultInitialFormat === EventFormat.Individual,
          organizers: profileStore.studentId ? [profileStore.studentId] : [],
          coreParticipants: [], date: { start: null, end: null },
          rules: null, prize: null, phases: [],
        },
        participants: [], criteria: [], teams: [],
        status: EventStatus.Pending, votingOpen: false,
      };
       // Trigger validity update for EventBasicDetailsForm
      await new Promise(r => setTimeout(r,0)); // Wait for next tick
      if (formRef.value?.querySelector) { // Check if formRef is available
         const eventNameInput = formRef.value.querySelector('#eventName') as HTMLInputElement | null;
         if (eventNameInput) {
            isBasicDetailsValid.value = eventNameInput.checkValidity(); // Basic check
         }
      }
    }
  } catch (error: any) {
    handleFormError("Failed to load necessary data: " + error.message);
  } finally {
    loading.value = false;
  }
});

watch(() => formData.value?.details?.format, (newFormat, oldFormat) => {
  if (!formData.value?.details || newFormat === oldFormat || newFormat === EventFormat.MultiEvent) {
    // If newFormat is MultiEvent, this form shouldn't handle it.
    // This might occur if EventBasicDetailsForm still allows selecting it before hideMultiEventOption takes full effect.
    if (newFormat === EventFormat.MultiEvent) {
        console.warn("RequestEventView: MultiEvent format selected. This should be handled by ManageMultiEventView.");
        // Potentially reset to a valid format for this view or show error.
        // For now, we'll rely on EventBasicDetailsForm's :hide-multi-event-option="true"
        // and the redirection logic in initializeFormForEdit.
        return;
    }
    return;
  }
  
  isParticipantsValid.value = true;
  isTeamsValid.value = true;
  isCriteriaValid.value = true; // Criteria always relevant

  if (newFormat === EventFormat.Individual) {
    formData.value.details.phases = [];
    formData.value.details.isCompetition = false;
    formData.value.details.allowProjectSubmission = false;
    formData.value.details.rules = null;
    formData.value.teams = [];
    if (!formData.value.details.type) formData.value.details.type = '';
    if (!formData.value.participants) formData.value.participants = [];
    if (!formData.value.details.coreParticipants) formData.value.details.coreParticipants = [];
  } else if (newFormat === EventFormat.Team) {
    formData.value.details.phases = [];
    formData.value.details.isCompetition = false;
    formData.value.details.allowProjectSubmission = true;
    formData.value.details.coreParticipants = [];
    formData.value.participants = [];
    if (!formData.value.details.type) formData.value.details.type = '';
    teamsComponentReady.value = false;
    setTimeout(() => { teamsComponentReady.value = true; }, 0);
  }
}, { immediate: false });

watch(() => [formData.value.details.format, formData.value.details.isCompetition], ([newFormat, newIsCompetition]) => {
  if (newFormat === EventFormat.MultiEvent) return;

  if (newFormat === EventFormat.Team && newIsCompetition) {
    if (formData.value.details) formData.value.details.isCompetition = false;
  }
}, { deep: true, immediate: false });

watch(() => formData.value, (newValue) => {
  if (newValue?.details && newValue.details.format === EventFormat.MultiEvent) {
    // This is a safeguard. If somehow a MultiEvent data is loaded here,
    // it might be better to clear the form or show an error.
    console.warn("RequestEventView: formData changed to MultiEvent. This is unexpected.");
    // editError.value = "This form does not support Multi-Stage events. Please use the correct editor.";
    return;
  }
  if (newValue && !Array.isArray(newValue.participants)) {
    newValue.participants = [];
  }
  if (newValue?.details && typeof newValue.details.type === 'undefined') {
    newValue.details.type = '';
  }
}, { deep: true, immediate: true });

watch(() => [formData.value?.participants, formData.value?.details?.coreParticipants], ([newParticipants, newCoreParticipants]) => {
  if (formData.value?.details?.format === EventFormat.Individual && newParticipants && newCoreParticipants) {
    const currentParticipantsSet = new Set(newParticipants || []);
    (newCoreParticipants || []).forEach(cp => currentParticipantsSet.add(cp));
    const updatedParticipants = Array.from(currentParticipantsSet);
    
    if (JSON.stringify(updatedParticipants.sort()) !== JSON.stringify((newParticipants || []).sort())) {
      if (formData.value) formData.value.participants = updatedParticipants;
    }
  }
}, { deep: true });
</script>

<style scoped>
/* Scoped styles here */
.create-event-section {
  min-height: 100vh;
}
.card-header {
  border-bottom: 2px solid rgba(var(--bs-primary-rgb), 0.2);
}
.btn:disabled {
  cursor: not-allowed;
}
.form-floating > .form-control:not(:placeholder-shown) ~ label {
  opacity: .65;
  transform: scale(.85) translateY(-.5rem) translateX(.15rem);
}
.form-floating > label {
  padding: 1rem .75rem;
}
</style>