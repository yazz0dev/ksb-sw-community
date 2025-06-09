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
                />
                <hr class="my-4">
                <EventCoOrganizerForm
                  v-model:organizers="formData.details.organizers"
                  :isSubmitting="isSubmitting"
                  :nameCache="nameCache"
                  :currentUserUid="profileStore.studentId"
                  :allUsers="allUsers"
                />
              </div>
            </div>

            <!-- Rating Criteria Card (Hidden for MultiEvent as criteria are per-phase) -->
            <div v-if="formData.details.format !== EventFormat.MultiEvent" class="card shadow-sm mb-4 rounded-3 overflow-hidden">
              <div class="card-header bg-primary-subtle text-primary-emphasis py-3">
                <h5 class="mb-0 fw-medium"><i class="fas fa-star me-2"></i>{{ criteriaCardNumber }}. Rating Criteria & XP</h5>
              </div>
              <div class="card-body p-4">
                <EventCriteriaForm
                  v-model:criteria="formDataCriteria"
                  :isSubmitting="isSubmitting"
                  :eventFormat="formData.details.format"
                  :assignableXpRoles="assignableXpRoles"
                  :totalXP="totalXP"
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

// Form data structure
const formData = ref<EventFormData>({
  details: {
    eventName: '', 
    description: '', 
    isCompetition: false,
    format: EventFormat.Individual, 
    allowProjectSubmission: true,
    organizers: [],
    coreParticipants: [], 
    date: {
      start: null,
      end: null
    },
    rules: null,
    prize: null,
  },
  participants: [], // Initialize as empty array, never undefined
  criteria: [],
  teams: [],
  status: EventStatus.Pending,
  votingOpen: false,
});

const isDateAvailable = ref(true);

const pageTitle = computed(() => isEditing.value ? 'Edit Event' : 'Request New Event');
const pageSubtitle = computed(() => isEditing.value ? 'Update the details of the existing event.' : 'Submit a request for a new community event.');

const totalXP = computed(() => {
  if (!formData.value.criteria) return 0;
  return formData.value.criteria.reduce((sum, criterion) => sum + (criterion.points || 0), 0); // Changed criterion.xp to criterion.points
});

const formPhases = computed({
  get: () => formData.value.details.phases ?? [],
  set: (value: any[]) => { // Consider using specific EventPhase[] type if available
    formData.value.details.phases = value;
  }
});

const isFormValid = computed(() => {
  const nativeValidation = formRef.value?.checkValidity() ?? false;
  return nativeValidation && isDateAvailable.value;
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

function populateFormData(event: any) {
  // Deep copy to avoid mutating store state directly
  const eventData = JSON.parse(JSON.stringify(event));

  formData.value.details.eventName = eventData.details?.eventName || '';
  // formData.value.details.type = eventData.details?.type || ''; // 'type' removed from details
  formData.value.details.format = eventData.details?.format || EventFormat.Individual;
  formData.value.details.description = eventData.details?.description || '';
  formData.value.details.rules = eventData.details?.rules || '';
  formData.value.details.prize = eventData.details?.prize || null;
  formData.value.details.allowProjectSubmission = eventData.details?.allowProjectSubmission ?? true;
  formData.value.details.organizers = eventData.details?.organizers || [];
  formData.value.details.isCompetition = eventData.details?.isCompetition || false; // Populate isCompetition

  // Participants and coreParticipants are only for non-MultiEvent overall settings
  if (eventData.details?.format !== EventFormat.MultiEvent) {
    formData.value.participants = eventData.participants || []; 
    formData.value.details.coreParticipants = eventData.details?.coreParticipants || []; 
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

  formData.value.criteria = eventData.criteria || []; // Ensure it's always an array
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
  if (!isFormValid.value) {
    if (formEl) {
      formEl.classList.add('was-validated');
    }
    return;
  }

  isSubmitting.value = true;

  try {
    let success = false;
    let newEventId = '';

    // Ensure coreParticipants is empty if not an Individual event (overall)
    if (formData.value.details.format !== EventFormat.Individual && formData.value.details.format !== EventFormat.MultiEvent) {
      formData.value.details.coreParticipants = [];
    }
    // For MultiEvent, overall coreParticipants, participants, criteria, teams are cleared
    if (formData.value.details.format === EventFormat.MultiEvent) {
      formData.value.details.coreParticipants = [];
      formData.value.participants = [];
      formData.value.criteria = [];
      formData.value.teams = [];
      // Ensure type is not set at the top level for MultiEvent
      // formData.value.details.type = ''; // Type is already removed from EventFormData.details
    }


    // If not MultiEvent, ensure phases is empty
    if (formData.value.details.format !== EventFormat.MultiEvent) {
      formData.value.details.phases = [];
    } else {
      // Basic validation for phases if it's a MultiEvent
      if (!formData.value.details.phases || formData.value.details.phases.length === 0) {
        handleFormError("For 'Multiple Events' format, at least one phase must be configured.");
        isSubmitting.value = false;
        return;
      }
      // Further validation for each phase would go here or in MultiEventForm
      for (const phase of formData.value.details.phases) {
        if (!phase.phaseName?.trim() || !phase.type?.trim()) { // Removed check for phase.description
          handleFormError(`Phase "${phase.phaseName || 'Unnamed Phase'}" is missing required fields (Name, Type).`);
          isSubmitting.value = false;
          return;
        }
      }
    }

    if (isEditing.value) {
      const payload = { ...formData.value };
      if (originalStatus.value === EventStatus.Rejected) {
        payload.status = EventStatus.Pending;
      }
      // Ensure participants is part of the payload if it's at the root - This check might be redundant if participants is always in details.
      // if (!payload.details.participants) payload.details.participants = formData.value.details.participants; // Adjusted for details
      
      success = await eventStore.editMyEventRequest(eventId.value, payload);
    } else {
      newEventId = await eventStore.requestNewEvent(formData.value);
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
      formData.value.details.organizers = profileStore.studentId ? [profileStore.studentId] : [];
      
      // Auto-populate participants for new Individual events
      if (formData.value.details.format === EventFormat.Individual && profileStore.studentId) {
        // For Individual events, auto-add up to MAX_PARTICIPANTS_INDIVIDUAL_AUTO_ADD participants
        const availableUsers = allUsers.value
          .filter(user => user.uid && user.uid !== profileStore.studentId) // Exclude current user for now
          .slice(0, MAX_PARTICIPANTS_INDIVIDUAL_AUTO_ADD - 1); // Leave room for current user
        
        // Add current user first, then other users
        formData.value.participants = [
          profileStore.studentId,
          ...availableUsers.map(user => user.uid!).filter(Boolean)
        ];
      } else {
        // For other event types, just add the current user if they're an organizer
        if (profileStore.studentId && formData.value.details.organizers.includes(profileStore.studentId)) {
          formData.value.participants = [profileStore.studentId];
        }
      }
    }
  } catch (error: any) {
    notificationStore.showNotification({
      message: "Failed to load necessary data. " + error.message,
      type: 'error',
      duration: 7000 // Longer duration for initial load errors
    });
  } finally {
    loading.value = false;
  }
});

watch(() => formData.value.details.format, (newFormat) => {
  if (newFormat === EventFormat.MultiEvent) {
    formData.value.criteria = []; 
    formData.value.teams = []; 
    formData.value.details.allowProjectSubmission = false; // No overall setting
    formData.value.participants = []; // No overall participants
    formData.value.details.coreParticipants = []; 
    formData.value.details.prize = null; // No overall prize
    formData.value.details.rules = null; // No overall rules
    formData.value.details.isCompetition = formData.value.details.isCompetition ?? false; // Default for new MultiEvent
    if (!formData.value.details.phases || formData.value.details.phases.length === 0) {
      formData.value.details.phases = []; 
    }
  } else if (newFormat === EventFormat.Individual) {
    // For Individual events, auto-populate participants if this is a new event
    if (!isEditing.value && profileStore.studentId) {
      const availableUsers = allUsers.value
        .filter(user => user.uid && user.uid !== profileStore.studentId)
        .slice(0, MAX_PARTICIPANTS_INDIVIDUAL_AUTO_ADD - 1);
      
      formData.value.participants = [
        profileStore.studentId,
        ...availableUsers.map(user => user.uid!).filter(Boolean)
      ];
    }
    formData.value.details.coreParticipants = [];
  } else { // Covers Team and any other non-Multi, non-Individual formats
    formData.value.details.allowProjectSubmission = true;
    // Initialize criteria as empty array if not already set
    if (!formData.value.criteria) {
      formData.value.criteria = [];
    }
    // Clear core participants if not individual (this covers Team format)
    formData.value.details.coreParticipants = [];
  }

  // A trick to force re-render ManageTeamsComponent if it was previously not shown
  if (newFormat === EventFormat.Team) {
    teamsComponentReady.value = false;
    setTimeout(() => { teamsComponentReady.value = true; }, 0);
  }
}, { immediate: true });

// Computed property to ensure participants is always an array for v-model
const formDataParticipants = computed({
  get: () => formData.value.participants || [],
  set: (value: string[]) => {
    formData.value.participants = value;
  }
});

// Computed property to ensure criteria is always an array
const formDataCriteria = computed({
  get: () => formData.value.criteria || [],
  set: (value) => {
    formData.value.criteria = value;
  }
});

// Add this at the beginning of the script to ensure participants is always an array
watch(() => formData.value, (newValue) => {
  if (!Array.isArray(newValue.participants)) {
    newValue.participants = [];
  }
}, { deep: true, immediate: true });
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