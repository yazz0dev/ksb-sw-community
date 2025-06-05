// src/views/RequestEventView.vue
<template>
  <section class="py-4 py-md-5 create-event-section bg-light">
    <div class="container-lg">

      <!-- Back Button and Title -->
      <div class="d-flex justify-content-between align-items-center mb-4 pb-3 border-bottom">
        <div>
          <h1 class="h3 text-primary mb-1">{{ pageTitle }}</h1>
          <p class="small text-muted mb-0">{{ pageSubtitle }}</p>
        </div>
        <button
          class="btn btn-outline-secondary btn-sm d-inline-flex align-items-center"
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
          <i class="fas fa-exclamation-circle text-danger me-3 fs-4 mt-1"></i>
          <div>
            <h5 class="alert-heading mb-2">Cannot Edit Event</h5>
            <p class="mb-2">{{ editError }}</p>
            <p class="small text-muted">You may not have permission, or the event is not in an editable state.</p>
            <div class="mt-3">
              <button type="button" class="btn btn-primary btn-sm me-2" @click="$router.push({ name: 'Home' })">
                <i class="fas fa-home me-1"></i> Go to Home
              </button>
              <button type="button" class="btn btn-outline-secondary btn-sm" @click="goBack">
                <i class="fas fa-arrow-left me-1"></i> Go Back
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Main Form Content -->
      <AuthGuard v-else :key="'auth-guard'" message="You must be logged in to request or edit events.">
        <div v-if="!isEditing && hasActiveRequest" :key="'active-request-warning'" class="alert alert-warning d-flex align-items-start mb-4 shadow-sm border-warning-subtle" role="alert" style="background-color: var(--bs-warning-bg-subtle);">
          <i class="fas fa-exclamation-triangle text-warning me-3 fs-4 mt-1"></i>
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
                 :disabled="isSubmitting || !isFormValid"
               >
                 <span v-if="isSubmitting" class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                 {{ isEditing ? 'Update Event' : 'Submit Request' }}
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

const baseCardNumber = 1; // Basic Details is always 1

const criteriaCardNumber = computed(() => baseCardNumber + 1);

const teamConfigCardNumber = computed(() => {
  let num = baseCardNumber + 1; // Starts after Basic Details
  if (formData.value.details.format !== EventFormat.Competition) num++; // Criteria card shown
  return num;
});

const scheduleCardNumber = computed(() => {
  let num = baseCardNumber + 1; // Starts after Basic Details
  if (formData.value.details.format !== EventFormat.Competition) num++; // Criteria card shown
  if (formData.value.details.format === EventFormat.Team) num++; // Team config card shown
  return num;
});

const totalXP = computed(() => {
  return formData.value.criteria.reduce((sum, criterion) => sum + (criterion.points || 0), 0);
});

const handleSubmitForm = async () => {
  if (!isFormValid.value) {
    errorMessage.value = "Please ensure all required fields are filled correctly and dates are available.";
    // Scroll to top to show error message
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }

  isSubmitting.value = true;
  errorMessage.value = '';

  try {
    let success: boolean | string | null = false;
    if (isEditing.value) {
      success = await eventStore.editMyEventRequest(eventId.value, formData.value);
      if (success) {
        notificationStore.showNotification({ message: "Event updated successfully!", type: 'success' });
        router.push({ name: 'EventDetails', params: { id: eventId.value } });
      }
    } else {
      if (await eventStore.checkExistingRequests()) {
          errorMessage.value = "You already have a pending event request. Please wait for it to be reviewed.";
          hasActiveRequest.value = true;
          isSubmitting.value = false;
          return;
      }
      success = await eventStore.requestNewEvent(formData.value);
      if (success && typeof success === 'string') {
        notificationStore.showNotification({ message: "Event request submitted successfully!", type: 'success' });
        router.push({ name: 'EventDetails', params: { id: success } });
      }
    }

    if (!success) {
      errorMessage.value = eventStore.actionError || "Failed to save event. Please try again.";
    }
  } catch (err: any) {
    errorMessage.value = err.message || "An unexpected error occurred.";
    notificationStore.showNotification({ message: errorMessage.value, type: 'error' });
  } finally {
    isSubmitting.value = false;
  }
};

const handleTeamUpdate = (updatedTeams: Team[]) => {
  formData.value.teams = updatedTeams;
};

const handleFormError = (error: string) => {
  errorMessage.value = error;
};

const handleAvailabilityChange = (isAvailable: boolean) => {
  isDateAvailable.value = isAvailable;
  if (!isAvailable && !errorMessage.value.includes('date conflict')) { // Avoid duplicate messages
    // errorMessage.value = "Selected event dates are not available. Please choose different dates.";
  } else if (isAvailable && errorMessage.value.includes('date conflict')) {
    // errorMessage.value = ''; // Clear date conflict message if dates become available
  }
};

const goBack = () => {
  if (isEditing.value && eventId.value) {
    router.push({ name: 'EventDetails', params: { id: eventId.value } });
  } else {
    router.back();
  }
};

const convertTimestampToISOString = (timestamp: any): string | null => {
  if (!timestamp) return null;
  try {
    if (timestamp.toDate && typeof timestamp.toDate === 'function') {
      return DateTime.fromJSDate(timestamp.toDate()).toISODate();
    }
    if (timestamp instanceof Date) {
      return DateTime.fromJSDate(timestamp).toISODate();
    }
    if (typeof timestamp === 'string') {
      const dt = DateTime.fromISO(timestamp);
      return dt.isValid ? dt.toISODate() : null;
    }
  } catch (error) {
    console.error('Error converting timestamp to ISO string:', error);
  }
  return null;
};

// Watch for format changes to set default allowProjectSubmission
watch(() => formData.value.details.format, (newFormat) => {
  if (newFormat === EventFormat.Competition || newFormat === EventFormat.Team) {
    formData.value.details.allowProjectSubmission = true;
  } else if (newFormat === EventFormat.Individual) {
     // For individual, it could be either, let's default to false or keep existing
     // formData.value.details.allowProjectSubmission = false; // Or keep as is
  }
}, { immediate: true });


onMounted(async () => {
  loading.value = true;
  errorMessage.value = '';
  editError.value = '';

  try {
    // Fetch all users for team management component
    allUsers.value = await profileStore.fetchAllStudentProfiles();
    
    // Build name cache for co-organizer display
    nameCache.value = {};
    allUsers.value.forEach(user => {
      if (user.uid && user.name) {
        nameCache.value[user.uid] = user.name;
      }
    });

    if (eventId.value) {
      isEditing.value = true;
      const eventData = await eventStore.fetchEventDetails(eventId.value); // Use eventStore.currentEventDetails after fetch
      const event = eventStore.currentEventDetails; // eventStore.currentEventDetails should be populated by fetchEventDetails

      if (event) {
        // Permission check: Only requester of PENDING event or an ORGANIZER of an APPROVED event can edit.
        const canEditPending = event.status === EventStatus.Pending && event.requestedBy === profileStore.studentId;
        const canEditApproved = event.status === EventStatus.Approved && (event.details.organizers?.includes(profileStore.studentId ?? '') || event.requestedBy === profileStore.studentId);

        if (!canEditPending && !canEditApproved) {
            editError.value = `Events with status '${event.status}' cannot be edited by you, or editing is not allowed for this status.`;
            loading.value = false;
            return;
        }
        
        formData.value = {
          details: {
            eventName: event.details.eventName,
            type: event.details.type,
            format: event.details.format,
            description: event.details.description ?? '',
            rules: event.details.rules ?? '',
            prize: event.details.prize ?? '',
            allowProjectSubmission: event.details.allowProjectSubmission ?? (event.details.format === EventFormat.Competition || event.details.format === EventFormat.Team),
            organizers: event.details.organizers || [],
            date: {
              start: convertTimestampToISOString(event.details.date.start),
              end: convertTimestampToISOString(event.details.date.end)
            }
          },
          criteria: event.criteria || [],
          teams: event.teams || [],
          status: event.status, // Keep existing status
          votingOpen: event.votingOpen, // Keep existing votingOpen state
          // Properties not in EventFormData are removed:
          // id: event.id,
          // requestedBy: event.requestedBy,
          // lifecycleTimestamps: event.lifecycleTimestamps,
          // rejectionReason: event.rejectionReason,
          // winners: event.winners,
          // submissions: event.submissions,
          // bestPerformerSelections: event.bestPerformerSelections,
          // organizerRatings: event.organizerRatings,
          // participants: event.participants,
        };
        
      } else {
        editError.value = "Event not found or you don't have permission to edit it.";
      }
    } else {
      isEditing.value = false;
      // For new events, check if the user already has a pending request
      hasActiveRequest.value = await eventStore.checkExistingRequests();
      // Initialize with current user as an organizer for new events
      if (profileStore.studentId) {
        formData.value.details.organizers = [profileStore.studentId];
      }
    }
  } catch (err: any) {
    if (isEditing.value) {
        editError.value = `Failed to load event data: ${err.message}`;
    } else {
        errorMessage.value = `Failed to initialize form: ${err.message}`;
    }
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.create-event-section {
  background-color: var(--bs-gray-100); /* Light background for the whole page */
  min-height: calc(100vh - 56px); /* Adjust based on navbar height */
}
.card-header {
  border-bottom: 1px solid var(--bs-border-color-translucent);
}

/* Ensure form controls have consistent sizing */
.form-control, .form-select {
  font-size: 0.9rem; /* Slightly smaller font for better density */
}
</style>