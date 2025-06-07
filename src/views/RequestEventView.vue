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
          <div v-if="errorMessage" class="alert alert-danger alert-dismissible fade show d-flex align-items-center mb-4" role="alert">
            <i class="fas fa-times-circle me-2"></i>
            <div>{{ errorMessage }}</div>
            <button type="button" class="btn-close btn-sm" @click="errorMessage = ''" aria-label="Close"></button>
          </div>

          <form @submit.prevent="handleSubmitForm" class="needs-validation" novalidate>
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

            <!-- Rating Criteria Card (Conditional) -->
            <div v-if="formData.details.format !== EventFormat.Competition" class="card shadow-sm mb-4 rounded-3 overflow-hidden">
              <div class="card-header bg-primary-subtle text-primary-emphasis py-3">
                <h5 class="mb-0 fw-medium"><i class="fas fa-star me-2"></i>{{ criteriaCardNumber }}. Rating Criteria & XP</h5>
              </div>
              <div class="card-body p-4">
                <EventCriteriaForm
                  v-model:criteria="formData.criteria"
                  :isSubmitting="isSubmitting"
                  :eventFormat="formData.details.format"
                  :assignableXpRoles="assignableXpRoles"
                  :totalXP="totalXP"
                />
              </div>
            </div>
            
            <!-- Team Configuration Card (Conditional) -->
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
import AuthGuard from '@/components/AuthGuard.vue';
import { EventFormat, EventStatus, type EventFormData, type Team, type EventCriteria } from '@/types/event';
import { useEventStore } from '@/stores/eventStore';
import { useProfileStore } from '@/stores/profileStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { DateTime } from 'luxon';

const route = useRoute();
const router = useRouter();
// TODO: Consider using strongly typed store if possible, instead of 'as any'.
const eventStore = useEventStore() as any;
const profileStore = useProfileStore();
const notificationStore = useNotificationStore();

// Reactive state
const loading = ref(true);
const editError = ref('');
const isEditing = ref(false);
const hasActiveRequest = ref(false);
const errorMessage = ref('');
const isSubmitting = ref(false);
const eventId = ref(route.params.eventId as string || '');
const allUsers = ref<InstanceType<typeof ManageTeamsComponent>['students']>([]);
const nameCache = ref<Record<string, string>>({});
const assignableXpRoles = ref<readonly string[]>(['developer', 'designer', 'presenter', 'problemSolver']);
const teamsComponentReady = ref(true); // Add this line to define the missing property

// Form data structure
const formData = ref<EventFormData>({
  details: {
    eventName: '',
    type: '',
    format: EventFormat.Individual,
    description: '',
    rules: '',
    prize: '',
    allowProjectSubmission: true, // Default to true, can be overridden by format logic
    organizers: [], 
    date: { // Dates are string | null (ISO YYYY-MM-DD)
      start: null,
      end: null
    }
  },
  criteria: [] as EventCriteria[],
  teams: [] as Team[],
  status: EventStatus.Pending, // Default for new requests
  votingOpen: false,
  // Ensure all required fields from EventFormData are initialized
});

const isDateAvailable = ref(true);

const pageTitle = computed(() => isEditing.value ? 'Edit Event' : 'Request New Event');
const pageSubtitle = computed(() => isEditing.value ? 'Update the details of the existing event.' : 'Submit a request for a new community event.');

const isFormValid = computed(() => {
  const details = formData.value.details;
  if (!details.eventName.trim() || !details.type || !details.format) {
    console.log("Validation fail: Basic details missing");
    return false;
  }
  if (!details.date.start || !details.date.end) {
    console.log("Validation fail: Dates missing");
    return false;
  }
  if (!isDateAvailable.value) {
    console.log("Validation fail: Date not available");
    return false;
  }
  if (details.format === EventFormat.Team && (!formData.value.teams || formData.value.teams.length === 0)) {
     // For team events, could add validation for at least one team, or min members per team
     // console.log("Validation fail: Team event with no teams");
     // return false; // Optional: enforce teams at this stage
  }
  if (formData.value.criteria.some(c => !c.title?.trim() || (c.points ?? 0) <= 0 || !c.role)) {
    // console.log("Validation fail: Invalid criteria entry"); // Be more specific in EventCriteriaForm
    // return false; // Criteria validation should ideally be handled within EventCriteriaForm
  }
  return true;
});

const totalXP = computed(() => formData.value.criteria.reduce((sum, c) => sum + (c.points || 0), 0));

const scheduleCardNumber = computed(() => {
  let num = 2;
  if (formData.value.details.format !== EventFormat.Competition) num++;
  if (formData.value.details.format === EventFormat.Team) num++;
  return num;
});

const teamConfigCardNumber = computed(() => (formData.value.details.format !== EventFormat.Competition) ? 3 : 2);
const criteriaCardNumber = 2;

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
  errorMessage.value = msg;
  setTimeout(() => errorMessage.value = '', 5000);
}

function handleAvailabilityChange(isAvailable: boolean) {
  isDateAvailable.value = isAvailable;
}

function populateFormData(event: any) {
  // Deep copy to avoid mutating store state directly
  const eventData = JSON.parse(JSON.stringify(event));

  formData.value.details.eventName = eventData.details?.eventName || '';
  formData.value.details.type = eventData.details?.type || '';
  formData.value.details.format = eventData.details?.format || EventFormat.Individual;
  formData.value.details.description = eventData.details?.description || '';
  formData.value.details.rules = eventData.details?.rules || '';
  formData.value.details.prize = eventData.details?.prize || '';
  formData.value.details.allowProjectSubmission = eventData.details?.allowProjectSubmission ?? true;
  formData.value.details.organizers = eventData.details?.organizers || [];

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
    
    const canEdit = (event.requestedBy === profileStore.studentId && [EventStatus.Pending, EventStatus.Rejected].includes(event.status));
    if (!canEdit) {
      throw new Error(`You cannot edit this event. It is currently in '${event.status}' status.`);
    }
    
    populateFormData(event);
  } catch (err: any) {
    editError.value = err.message || 'An unknown error occurred while fetching event data.';
  } finally {
    loading.value = false;
  }
}

async function handleSubmitForm() {
  if (!isFormValid.value) {
    errorMessage.value = "Please fill out all required fields and correct any errors.";
    return;
  }

  isSubmitting.value = true;
  errorMessage.value = '';

  try {
    let success = false;
    let newEventId = '';

    if (isEditing.value) {
      success = await eventStore.editMyEventRequest(eventId.value, formData.value);
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
    errorMessage.value = error.message || `An unknown error occurred.`;
  } finally {
    isSubmitting.value = false;
  }
}

onMounted(async () => {
  loading.value = true;
  isEditing.value = !!eventId.value;

  try {
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
    }
  } catch (error: any) {
    errorMessage.value = "Failed to load necessary data. " + error.message;
  } finally {
    loading.value = false;
  }
});

watch(() => formData.value.details.format, (newFormat) => {
  if (newFormat === EventFormat.Competition) {
    formData.value.criteria = [];
    formData.value.teams = [];
    formData.value.details.allowProjectSubmission = false;
  } else {
    formData.value.details.allowProjectSubmission = true;
  }

  // A trick to force re-render ManageTeamsComponent if it was previously not shown
  if (newFormat === EventFormat.Team) {
    teamsComponentReady.value = false;
    setTimeout(() => { teamsComponentReady.value = true; }, 0);
  }
}, { immediate: true });
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