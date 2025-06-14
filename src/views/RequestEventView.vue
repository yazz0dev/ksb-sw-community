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
        <button
          class="btn btn-outline-secondary btn-sm btn-icon"
          :class="{ 'd-none d-md-inline-flex': !isEditing }"
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
            <p class="small text-muted">You may not have permission, or the event is not in an editable state.</p>
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

            <!-- Rating Criteria Card (Hidden for MultiEvent as criteria are per-phase) -->
            <div v-if="formData.details.format !== EventFormat.MultiEvent" class="card shadow-sm mb-4 rounded-3 overflow-hidden">
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
            <!-- MultiEvent Phases Configuration Card -->
            <div v-else-if="formData.details.format === EventFormat.MultiEvent" class="card shadow-sm mb-4 rounded-3 overflow-hidden">
              <div class="card-header bg-info-subtle text-info-emphasis py-3">
                 <h5 class="mb-0 fw-medium"><i class="fas fa-layer-group me-2"></i>{{ multiEventPhasesCardNumber }}. Event Phases Configuration</h5>
              </div>
              <div class="card-body p-4">
                <MultiEventForm 
                  v-model="formPhases"
                  :is-submitting="isSubmitting"
                  :is-overall-competition="formData.details.isCompetition || false"
                  :all-users="allUsers" 
                  :name-cache="nameCache"
                  @validity-change="handleMultiEventValidityChange"
                />
              </div>
            </div>


            <!-- Event Participants Card (Hidden for MultiEvent and Team formats) -->
            <div v-if="formData.details.format !== EventFormat.MultiEvent && formData.details.format !== EventFormat.Team" class="card shadow-sm mb-4 rounded-3 overflow-hidden">
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
                 <p v-if="false" class="small text-muted mt-3"> 
                  These are the overall participants for the event. Specific phases can draw from this list or define their own subset.
                </p>
              </div>
            </div>
            
            <!-- Team Configuration Card (Conditional for Team format, Hidden for MultiEvent) -->
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
import MultiEventForm from '@/components/forms/MultiEventForm.vue';
import AuthGuard from '@/components/AuthGuard.vue';
import { EventFormat, EventStatus, type EventFormData, type Team } from '@/types/event';
import { useEventStore } from '@/stores/eventStore';
import { useProfileStore } from '@/stores/profileStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { DateTime } from 'luxon';
import type { UserData } from '@/types/student';

// Define route and router
const route = useRoute();
const router = useRouter();

// TODO: Consider using strongly typed store if possible, instead of 'as any'.
const eventStore = useEventStore() as any;
const profileStore = useProfileStore();
const notificationStore = useNotificationStore();

// Constants
const MAX_PARTICIPANTS_INDIVIDUAL_AUTO_ADD = 50; // Example value, adjust as needed

// Reactive state
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

// Form validation state
const isDateAvailable = ref(true);
const isBasicDetailsValid = ref(false);
const isCriteriaValid = ref(true);
const isParticipantsValid = ref(true);
const isTeamsValid = ref(true);
const isScheduleValid = ref(false);
const isMultiEventValid = ref(true);
const isOrganizersValid = ref(true);

// Form data structure with better initialization
const formData = ref<EventFormData>({
  details: {
    eventName: '', 
    description: '', 
    isCompetition: false,
    format: EventFormat.Individual, 
    type: '',
    allowProjectSubmission: false,
    organizers: [],
    coreParticipants: [], 
    date: {
      start: null,
      end: null
    },
    rules: null,
    prize: null,
    phases: [],
  },
  participants: [],
  criteria: [],
  teams: [],
  status: EventStatus.Pending,
  votingOpen: false,
});

const isFormValid = computed(() => {
  if (!formData.value?.details) return false;
  
  const basicChecks = isBasicDetailsValid.value && isScheduleValid.value && isDateAvailable.value && isOrganizersValid.value;
  
  if (formData.value.details.format === EventFormat.MultiEvent) {
    return basicChecks && isMultiEventValid.value;
  } else if (formData.value.details.format === EventFormat.Team) {
    return basicChecks && isCriteriaValid.value && isTeamsValid.value;
  } else {
    // Individual format
    return basicChecks && isCriteriaValid.value && isParticipantsValid.value;
  }
});

// Add missing computed properties for pageTitle and pageSubtitle
const pageTitle = computed(() => {
  return isEditing.value ? 'Edit Event Request' : 'Request New Event';
});

const pageSubtitle = computed(() => {
  return isEditing.value 
    ? 'Update your event details and configurations' 
    : 'Fill out the form below to submit your event request for review';
});

// Computed property to ensure participants is always an array for v-model
const formDataParticipants = computed({
  get: () => formData.value?.participants || [],
  set: (value: string[]) => {
    if (formData.value) {
      formData.value.participants = value;
    }
  }
});

// Computed property to ensure criteria is always an array
const formDataCriteria = computed({
  get: () => formData.value?.criteria || [],
  set: (value) => {
    if (formData.value) {
      formData.value.criteria = value;
    }
  }
});

const formPhases = computed({
  get: () => formData.value?.details?.phases ?? [],
  set: (value: any[]) => {
    if (formData.value?.details) {
      formData.value.details.phases = value;
    }
  }
});

const criteriaCardNumber = computed(() => { // This card is for non-MultiEvent criteria
  let num = 2; // Starts after Event Details
  return num;
});

const multiEventPhasesCardNumber = computed(() => { // This card is for MultiEvent phases
  let num = 2; // Starts after Event Details
  return num;
});

const participantCardNumber = computed(() => {
  let num = 2; // Starts after Event Details
  if (formData.value.details.format !== EventFormat.MultiEvent) num++; // Criteria card for non-MultiEvent
  // No participant card if MultiEvent
  return num;
});

const teamConfigCardNumber = computed(() => {
  let num = participantCardNumber.value;
  if (formData.value.details.format === EventFormat.Team) num++; // Only if overall format is Team
  return num;
});

const scheduleCardNumber = computed(() => {
  let num = 2; // Event Details
  if (formData.value.details.format === EventFormat.MultiEvent) {
    num++; // MultiEvent Phases Card
  } else {
    num++; // Criteria Card
    num++; // Participants Card
    if (formData.value.details.format === EventFormat.Team) num++; // Teams Card
  }
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

// Add validation handlers
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

function handleMultiEventValidityChange(isValid: boolean) {
  isMultiEventValid.value = isValid;
}

function handleOrganizersValidityChange(isValid: boolean) {
  isOrganizersValid.value = isValid;
}

function populateFormData(event: any) {
  // Deep copy to avoid mutating store state directly
  const eventData = JSON.parse(JSON.stringify(event));

  // Ensure formData.value exists before populating
  if (!formData.value) {
    formData.value = {
      details: {
        eventName: '',
        description: '',
        isCompetition: false,
        format: EventFormat.Individual,
        type: '',
        allowProjectSubmission: false,
        organizers: [],
        coreParticipants: [],
        date: { start: null, end: null },
        rules: null,
        prize: null,
        phases: [],
      },
      participants: [],
      criteria: [],
      teams: [],
      status: EventStatus.Pending,
      votingOpen: false,
    };
  }

  // Populate basic details
  formData.value.details.eventName = eventData.details?.eventName || '';
  formData.value.details.format = eventData.details?.format || EventFormat.Individual;
  formData.value.details.description = eventData.details?.description || '';
  formData.value.details.rules = eventData.details?.rules || null;
  formData.value.details.prize = eventData.details?.prize || null;
  formData.value.details.allowProjectSubmission = eventData.details?.allowProjectSubmission ?? true;
  formData.value.details.organizers = eventData.details?.organizers || [];
  formData.value.details.isCompetition = eventData.details?.isCompetition || false;

  // Handle type field - ensure it's always a string, never undefined
  formData.value.details.type = eventData.details?.type || '';

  // Handle participants properly for different formats
  if (eventData.details?.format !== EventFormat.MultiEvent) {
    // For Individual and Team events, populate both participants arrays
    formData.value.participants = eventData.participants || []; 
    formData.value.details.coreParticipants = eventData.details?.coreParticipants || [];
    
    // For Individual events, ensure coreParticipants are also in the main participants array
    if (eventData.details?.format === EventFormat.Individual) {
      const currentParticipants = formData.value.participants || [];
      const currentCoreParticipants = formData.value.details.coreParticipants || [];
      const allParticipants = new Set([
        ...currentParticipants,
        ...currentCoreParticipants
      ]);
      formData.value.participants = Array.from(allParticipants);
    }
  } else {
    formData.value.participants = [];
    formData.value.details.coreParticipants = [];
  }
  
  formData.value.details.phases = eventData.details?.phases || []; 

  const toYYYYMMDD = (ts: any) => {
    if (!ts) return null;
    return DateTime.fromSeconds(ts.seconds).toFormat('yyyy-MM-dd');
  };

  formData.value.details.date.start = toYYYYMMDD(eventData.details?.date?.start);
  formData.value.details.date.end = toYYYYMMDD(eventData.details?.date?.end);

  formData.value.criteria = eventData.criteria || [];
  formData.value.teams = eventData.teams || [];
  formData.value.status = eventData.status || EventStatus.Pending;
  formData.value.votingOpen = eventData.votingOpen || false;
}

async function initializeFormForEdit(id: string) {
  loading.value = true;
  editError.value = '';
  try {
    let event = eventStore.getEventById(id);
    if (!event) {
      event = await eventStore.fetchEventDetails(id);
    }
    
    if (!event) {
      throw new Error("Event not found or you don't have permission to edit it.");
    }
    
    // Import and use the permission helpers
    const { isEventOrganizer, isEventEditable } = await import('@/utils/permissionHelpers');
    
    // Allow editing if user is an organizer and event is in editable state
    // OR if user is the requester and event is pending/rejected (for their own requests)
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
  
  // Enhanced form validation
  if (!isFormValid.value) {
    if (formEl) {
      formEl.classList.add('was-validated');
    }
    
    // Provide specific error messages
    const validationErrors = [];
    if (!isBasicDetailsValid.value) validationErrors.push('Event details are incomplete');
    if (!isScheduleValid.value) validationErrors.push('Event schedule is invalid');
    if (!isDateAvailable.value) validationErrors.push('Selected dates conflict with existing events');
    if (formData.value.details.format === EventFormat.MultiEvent && !isMultiEventValid.value) {
      validationErrors.push('Event phases configuration is incomplete');
    }
    if (formData.value.details.format !== EventFormat.MultiEvent && !isCriteriaValid.value) {
      validationErrors.push('Rating criteria are incomplete');
    }
    if (formData.value.details.format === EventFormat.Individual && !isParticipantsValid.value) {
      validationErrors.push('Event participants are required');
    }
    if (formData.value.details.format === EventFormat.Team && !isTeamsValid.value) {
      validationErrors.push('Team configuration is incomplete');
    }
    
    handleFormError(`Please fix the following issues: ${validationErrors.join(', ')}`);
    return;
  }

  isSubmitting.value = true;

  try {
    // New Validation for MultiEvent Competition Prize
    if (
      formData.value.details.format === EventFormat.MultiEvent &&
      formData.value.details.isCompetition === true
    ) {
      const topLevelPrizeSet = !!formData.value.details.prize?.trim();
      const phasePrizes = formData.value.details.phases || [];
      const atLeastOnePhasePrizeSet = phasePrizes.some(phase => !!phase.prize?.trim());

      if (!topLevelPrizeSet && !atLeastOnePhasePrizeSet) {
        throw new Error(
          "For a MultiEvent competition, a prize must be specified for the overall event or for at least one of its phases."
        );
      }
    }

    // Data cleanup based on format
    const submissionData = JSON.parse(JSON.stringify(formData.value));
    
    if (submissionData.details.format === EventFormat.MultiEvent) {
      // For MultiEvent, clear overall-level data
      submissionData.details.coreParticipants = [];
      submissionData.participants = [];
      submissionData.criteria = [];
      submissionData.teams = [];
      submissionData.details.type = '';
      
      // Validate phases
      if (!submissionData.details.phases || submissionData.details.phases.length === 0) {
        throw new Error("Multiple Events format requires at least one phase to be configured.");
      }
      
      // Validate each phase
      for (const [index, phase] of submissionData.details.phases.entries()) {
        if (!phase.phaseName?.trim()) {
          throw new Error(`Phase ${index + 1} is missing a name.`);
        }
        if (!phase.type?.trim()) {
          throw new Error(`Phase ${index + 1} is missing a type.`);
        }
        if (!phase.description?.trim()) {
          throw new Error(`Phase ${index + 1} is missing a description.`);
        }
        if (!phase.participants || phase.participants.length === 0) {
          throw new Error(`Phase ${index + 1} requires at least one participant.`);
        }
        if (!phase.criteria || phase.criteria.length === 0) {
          throw new Error(`Phase ${index + 1} requires at least one rating criterion.`);
        }
        if (phase.format === EventFormat.Team && (!phase.teams || phase.teams.length === 0)) {
          throw new Error(`Phase ${index + 1} is configured as Team format but has no teams.`);
        }
      }
    } else {
      // For non-MultiEvent, clear phases
      submissionData.details.phases = [];
      
      // Ensure type is set for non-MultiEvent
      if (!submissionData.details.type?.trim()) {
        throw new Error("Event type is required.");
      }
      
      // Format-specific validations
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
      }
    }

    let success = false;
    let newEventId = '';

    if (isEditing.value) {
      const payload = { ...submissionData };
      if (originalStatus.value === EventStatus.Rejected) {
        payload.status = EventStatus.Pending;
      }
      success = await eventStore.editMyEventRequest(eventId.value, payload);
    } else {
      newEventId = await eventStore.requestNewEvent(submissionData);
      success = !!newEventId;
    }

    if (success) {
      notificationStore.showNotification({
        message: `Event ${isEditing.value ? 'updated' : 'requested'} successfully!`,
        type: 'success',
      });
      router.push({ name: 'EventDetails', params: { id: isEditing.value ? eventId.value : newEventId } });
    }
  } catch (error: any) {
    notificationStore.showNotification({
      message: error.message || `An unknown error occurred.`,
      type: 'error',
      duration: 5000
    });
  } finally {
    isSubmitting.value = false;
  }
}

onMounted(async () => {
  loading.value = true;
  isEditing.value = !!eventId.value;

  try {
    // Fetch all users first
    allUsers.value = await profileStore.fetchAllStudentProfiles();
    allUsers.value.forEach(u => {
      if (u.uid && u.name) {
        nameCache.value[u.uid] = u.name;
      }
    });

    if (isEditing.value) {
      await initializeFormForEdit(eventId.value);
    } else {
      hasActiveRequest.value = await eventStore.checkExistingPendingRequest();
      
      // Initialize formData with proper defaults for new events, defaulting to Team format
      formData.value = {
        details: {
          eventName: '',
          description: '',
          isCompetition: false, // Team format typically isn't a "competition" in the same way as Individual/MultiEvent
          format: EventFormat.Team, // Default to Team format
          type: '', // Ensure type is always a string, user will select
          allowProjectSubmission: true, // Default for Team format
          organizers: profileStore.studentId ? [profileStore.studentId] : [],
          coreParticipants: [], // Cleared for Team format
          date: { start: null, end: null },
          rules: null,
          prize: null,
          phases: [], // Cleared for Team format
        },
        participants: [], // Cleared for Team format (managed by ManageTeamsComponent)
        criteria: [], // Criteria are still applicable
        teams: [], // Teams will be configured
        status: EventStatus.Pending,
        votingOpen: false,
      };
    }
  } catch (error: any) {
    notificationStore.showNotification({
      message: "Failed to load necessary data. " + error.message,
      type: 'error',
      duration: 7000
    });
  } finally {
    loading.value = false;
  }
});

watch(() => formData.value?.details?.format, (newFormat, oldFormat) => {
  if (!formData.value?.details || newFormat === oldFormat) return;
  
  // Reset validation states when format changes
  isParticipantsValid.value = true;
  isTeamsValid.value = true;
  isCriteriaValid.value = true;
  isMultiEventValid.value = true;
  
  if (newFormat === EventFormat.MultiEvent) {
    // Clear non-MultiEvent data
    formData.value.criteria = []; 
    formData.value.teams = []; 
    formData.value.details.allowProjectSubmission = false;
    formData.value.participants = [];
    formData.value.details.coreParticipants = []; 
    formData.value.details.prize = null;
    formData.value.details.rules = null;
    formData.value.details.type = ''; // Ensure it's a string
    formData.value.details.isCompetition = formData.value.details.isCompetition ?? false;
    
    // Initialize phases if empty
    if (!formData.value.details.phases || formData.value.details.phases.length === 0) {
      formData.value.details.phases = []; 
    }
  } else if (newFormat === EventFormat.Individual) {
    // Individual event setup
    formData.value.details.phases = [];
    formData.value.details.isCompetition = false;
    formData.value.details.allowProjectSubmission = false;
    formData.value.details.rules = null;
    formData.value.teams = [];
    
    // Ensure type is set for Individual events
    if (!formData.value.details.type) {
      formData.value.details.type = '';
    }
    
    // Keep existing participants but ensure core participants are initialized
    if (!formData.value.participants) {
      formData.value.participants = [];
    }
    if (!formData.value.details.coreParticipants) {
      formData.value.details.coreParticipants = [];
    }
  } else if (newFormat === EventFormat.Team) {
    // Team event setup
    formData.value.details.phases = [];
    formData.value.details.isCompetition = false;
    formData.value.details.allowProjectSubmission = true;
    formData.value.details.coreParticipants = [];
    
    // For Team events, clear participants as they're managed through teams
    formData.value.participants = [];
    
    // Ensure type is set for Team events
    if (!formData.value.details.type) {
      formData.value.details.type = '';
    }
    
    // Reset teams component
    teamsComponentReady.value = false;
    setTimeout(() => { teamsComponentReady.value = true; }, 0);
  }
}, { immediate: false });

// Watcher for format and isCompetition changes to enforce rules
watch(() => [formData.value.details.format, formData.value.details.isCompetition], ([newFormat, newIsCompetition], [oldFormat, oldIsCompetition]) => {
  if (newFormat === EventFormat.MultiEvent) {
    // Rule: Top-level allowProjectSubmission for MultiEvents is always false (submissions are per-phase)
    // This is already set by the format watcher, but we re-affirm it here.
    if (formData.value.details.allowProjectSubmission !== false) {
      formData.value.details.allowProjectSubmission = false;
    }

    if (newIsCompetition === false) {
      // Rule: If a MultiEvent is not a competition, it cannot have an overall prize.
      if (formData.value.details.prize !== null) {
        formData.value.details.prize = null;
      }
    }
    // If newIsCompetition is true, user can set a prize. Validation for this is in handleSubmitForm.
    // UI for prize input and allowProjectSubmission in EventBasicDetailsForm should be
    // enabled/disabled by EventBasicDetailsForm itself based on format and isCompetition.
  }

  // If format changed from MultiEvent to something else, or isCompetition changed for non-MultiEvent,
  // existing watchers in EventBasicDetailsForm should handle resetting prize/submission if needed.
}, { deep: true, immediate: false }); // immediate: false to avoid running on initial setup before all child components might be ready

// Add this at the beginning of the script to ensure participants is always an array
watch(() => formData.value, (newValue) => {
  if (newValue && !Array.isArray(newValue.participants)) {
    newValue.participants = [];
  }
  // Ensure type is always a string
  if (newValue?.details && typeof newValue.details.type === 'undefined') {
    newValue.details.type = '';
  }
}, { deep: true, immediate: true });

// Add a watcher to keep participants and coreParticipants in sync for Individual events
watch(() => [formData.value?.participants, formData.value?.details?.coreParticipants], ([newParticipants, newCoreParticipants]) => {
  if (formData.value?.details?.format === EventFormat.Individual && newParticipants && newCoreParticipants) {
    // Ensure all coreParticipants are also in the main participants array
    const currentParticipants = newParticipants || [];
    const currentCoreParticipants = newCoreParticipants || [];
    const allParticipants = new Set([...currentParticipants, ...currentCoreParticipants]);
    const updatedParticipants = Array.from(allParticipants);
    
    if (JSON.stringify(updatedParticipants.sort()) !== JSON.stringify(currentParticipants.sort())) {
      formData.value.participants = updatedParticipants;
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