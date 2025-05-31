// src/views/RequestEventView.vue
<template>
  <section class="py-5 create-event-section">
    <div class="container-lg">

      <div v-if="loading" class="text-center py-5">
        <div class="spinner-border text-primary" role="status" style="width: 3rem; height: 3rem;">
          <span class="visually-hidden">Loading...</span>
        </div>
        <p class="text-muted mt-2">Loading initial data...</p>
      </div>

      <div v-else-if="editError" class="alert alert-danger p-4 shadow-sm border-danger-subtle mb-5">
        <div class="d-flex align-items-start">
          <i class="fas fa-exclamation-circle text-danger me-3 fs-4 mt-1"></i>
          <div>
            <h5 class="alert-heading mb-2">Cannot Edit Event</h5>
            <p>{{ editError }}</p>
            <div class="mt-3">
              <button type="button" class="btn btn-primary me-2" @click="$router.push({ name: 'Home' })">
                <i class="fas fa-home me-1"></i> Go to Home
              </button>
              <button type="button" class="btn btn-outline-secondary" @click="$router.back()">
                <i class="fas fa-arrow-left me-1"></i> Go Back
              </button>
            </div>
          </div>
        </div>
      </div>

      <AuthGuard v-else :key="'auth-guard'" message="You must be logged in to request or edit events.">

        <div v-if="!isEditing && hasActiveRequest" :key="'active-request-warning'" class="alert alert-warning d-flex align-items-start mb-5 shadow-sm border-warning-subtle" role="alert" style="background-color: var(--bs-warning-bg-subtle);">
          <i class="fas fa-exclamation-triangle text-warning me-3 fs-4 mt-1"></i>
          <div>
            <h6 class="alert-heading mb-1 fw-medium">Pending Request Active</h6>
            <small class="text-body">You already have a pending event request. Please wait for it to be reviewed before submitting a new one, or <router-link :to="{ name: 'Profile' }" class="alert-link">view your requests</router-link>.</small>
          </div>
        </div>

        <div v-else :key="'event-form-content'">
          <div class="d-flex justify-content-between align-items-center mb-5 pb-4 border-bottom">
            <div>
              <h2 class="h3 text-primary mb-0">{{ isEditing ? 'Edit Event' : 'Request New Event' }}</h2>
              <p class="small text-muted mt-1">{{ isEditing ? 'Update the details of the existing event.' : 'Submit a request for a new community event.' }}</p>
            </div>
            <div>
              <button
                class="btn btn-outline-secondary btn-sm d-inline-flex align-items-center"
                @click="$router.back()"
              >
                <i class="fas fa-arrow-left me-1"></i>
                <span>Back</span>
              </button>
            </div>
          </div>

          <div v-if="errorMessage" class="alert alert-danger alert-dismissible fade show d-flex align-items-center mb-4" role="alert">
            <i class="fas fa-times-circle me-2"></i>
            <div>{{ errorMessage }}</div>
            <button type="button" class="btn-close btn-sm" @click="errorMessage = ''" aria-label="Close"></button>
          </div>

          <form @submit.prevent="handleSubmitForm" class="mb-5 needs-validation" novalidate>
            <div class="card shadow-sm mb-4" key="event-details-card">
              <div class="card-header bg-light">
                <h4 class="h5 mb-0 text-dark">1. Event Details</h4>
              </div>
              <div class="card-body p-4 p-lg-5">
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

            <div v-if="formData.details.format !== EventFormat.Competition" class="card shadow-sm mb-4" :key="`criteria-card-${criteriaCardNumber}`">
              <div class="card-header bg-light">
                <h4 class="h5 mb-0 text-dark">{{ criteriaCardNumber }}. Rating Criteria</h4>
              </div>
              <div class="card-body p-4 p-lg-5">
                <EventCriteriaForm
                  v-model:criteria="formData.criteria"
                  :isSubmitting="isSubmitting"
                  :eventFormat="formData.details.format"
                  :assignableXpRoles="assignableXpRoles"
                  :totalXP="totalXP"
                />
              </div>
            </div>

            <div v-if="formData.details.format === EventFormat.Team" class="card shadow-sm mb-4" :key="`team-config-card-${2}`">
              <div class="card-header bg-light">
                <h4 class="h5 mb-0 text-dark">3. Team Configuration</h4>
              </div>
              <div class="card-body p-4 p-lg-5">
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

             <div class="card shadow-sm mb-4" :key="`schedule-card-${scheduleCardNumber}`">
               <div class="card-header bg-light">
                 <h4 class="h5 mb-0 text-dark">{{ scheduleCardNumber }}. Event Schedule</h4>
               </div>
               <div class="card-body p-4 p-lg-5">
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
             <div class="d-flex justify-content-end gap-2 mt-4">
               <button type="button" class="btn btn-outline-secondary" @click="$router.back()">
                 Cancel
               </button>
               <button 
                 type="submit" 
                 class="btn btn-primary"
                 :disabled="isSubmitting || !isFormValid"
               >
                 <span v-if="isSubmitting" class="spinner-border spinner-border-sm me-1"></span>
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
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import EventBasicDetailsForm from '@/components/forms/EventBasicDetailsForm.vue';
import EventScheduleForm from '@/components/forms/EventScheduleForm.vue';
import ManageTeamsComponent from '@/components/forms/ManageTeamsComponent.vue';
import EventCoOrganizerForm from '@/components/forms/EventCoOrganizerForm.vue';
import EventCriteriaForm from '@/components/forms/EventCriteriaForm.vue';
import AuthGuard from '@/components/AuthGuard.vue';
import { EventFormat, EventStatus, type EventFormData, type Team } from '@/types/event';
import { useEventStore } from '@/stores/eventStore';
import { useProfileStore } from '@/stores/profileStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { Timestamp } from 'firebase/firestore';
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
const assignableXpRoles = ref<readonly string[]>(['Student', 'TeamLead', 'Mentor']);

// Form data structure
const formData = ref<EventFormData>({
  details: {
    eventName: '',
    type: '', // Assuming type is string, adjust if it's a specific set of values
    format: EventFormat.Individual,
    description: '',
    rules: '',
    prize: '',
    allowProjectSubmission: false,
    organizers: [], // Should be string[] of UIDs
    date: {       // Dates are string | null for EventFormData
      start: null,
      end: null
    }
  },
  criteria: [], // Assuming EventCriterion[]
  teams: [],    // Assuming Team[]
  // Ensure all required fields from EventFormData are initialized
  status: undefined, // Not directly set by student form, but part of EventFormData
  votingOpen: false, // Default for new, may not be editable by student
});

const isDateAvailable = ref(true); // New ref for date availability

const isFormValid = computed(() => {
  const details = formData.value.details;
  if (!details.eventName.trim() || !details.type.trim() || !details.format.trim()) return false;
  if (!details.date.start || !details.date.end) return false;
  if (!isDateAvailable.value) return false;
  // Add other validation as needed, e.g., team constraints for team events
  return true;
});

const scheduleCardNumber = computed(() => {
  let cardNumber = 2;
  if (formData.value.details.format !== EventFormat.Competition) cardNumber++;
  if (formData.value.details.format === EventFormat.Team) cardNumber++;
  return cardNumber;
});

const criteriaCardNumber = computed(() => {
  return 2;
});

const totalXP = computed(() => {
  return formData.value.criteria.reduce((sum, criterion) => sum + (criterion.points || 0), 0);
});

const handleSubmitForm = async () => {
  if (!isFormValid.value) {
    errorMessage.value = "Please correct the errors in the form before submitting.";
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

const handleTeamUpdate = (teams: Team[]) => { // Corrected type
  formData.value.teams = teams;
};

const handleFormError = (error: string) => {
  errorMessage.value = error;
};

const handleAvailabilityChange = (isAvailable: boolean) => {
  isDateAvailable.value = isAvailable;
};

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
      const event = await eventStore.fetchEventDetails(eventId.value);
      if (event) {
        // TODO: Add permission check - e.g., is user an organizer or the requester of a PENDING event
        if (event.status !== EventStatus.Pending && event.status !== EventStatus.Approved) {
            editError.value = `Events with status '${event.status}' cannot be edited.`;
            loading.value = false;
            return;
        }
        // Populate formData with event data
        formData.value.details.eventName = event.details.eventName;
        formData.value.details.type = event.details.type;
        formData.value.details.format = event.details.format;
        formData.value.details.description = event.details.description ?? '';
        formData.value.details.rules = event.details.rules ?? '';
        formData.value.details.prize = event.details.prize ?? '';
        formData.value.details.allowProjectSubmission = event.details.allowProjectSubmission ?? false;
        formData.value.details.organizers = event.details.organizers || [];

        // Convert Firestore Timestamps to ISO date strings for DatePicker
        formData.value.details.date.start = event.details.date.start instanceof Timestamp
            ? DateTime.fromJSDate(event.details.date.start.toDate()).toISODate()
            : null;
        formData.value.details.date.end = event.details.date.end instanceof Timestamp
            ? DateTime.fromJSDate(event.details.date.end.toDate()).toISODate()
            : null;

        formData.value.criteria = event.criteria || [];
        formData.value.teams = event.teams || [];
        // Populate status and votingOpen for editing
        formData.value.status = event.status; // Ensure status is populated
        formData.value.votingOpen = event.votingOpen; // Ensure votingOpen is populated
        
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
  background: var(--bs-body-bg);
  min-height: 100vh;
}
</style>