<template>
  <section class="py-5 create-event-section">
    <div class="container-lg">

      <!-- Loading State - Placed OUTSIDE AuthGuard -->
      <div v-if="loading" class="text-center py-5">
        <div class="spinner-border text-primary" role="status" style="width: 3rem; height: 3rem;">
          <span class="visually-hidden">Loading...</span>
        </div>
        <p class="text-muted mt-2">Loading initial data...</p>
      </div>

      <!-- Auth Guard - Render only AFTER loading is false -->
      <AuthGuard v-else message="You must be logged in to request or edit events.">

        <!-- Active Request Warning (Show after loading, only when creating) -->
        <div v-if="!isEditing && hasActiveRequest" class="alert alert-warning d-flex align-items-start mb-5 shadow-sm border-warning-subtle" role="alert" style="background-color: var(--bs-warning-bg-subtle);">
          <i class="fas fa-exclamation-triangle text-warning me-3 fs-4 mt-1"></i>
          <div>
            <h6 class="alert-heading mb-1 fw-medium">Pending Request Active</h6>
            <small class="text-body">You already have a pending event request. Please wait for it to be reviewed before submitting a new one, or <router-link :to="{ name: 'Profile' }" class="alert-link">view your requests</router-link>.</small>
          </div>
        </div>

        <!-- Main Form Content (Render only when not loading and no active request conflict) -->
        <!-- The v-else below is now relative to the v-else-if above, ensuring it only shows when NOT loading AND no active request conflict -->
        <div v-else>
          <!-- Header -->
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

          <!-- Global Error Message -->
          <div v-if="errorMessage" class="alert alert-danger alert-dismissible fade show d-flex align-items-center mb-4" role="alert">
            <i class="fas fa-times-circle me-2"></i>
            <div>{{ errorMessage }}</div>
            <button type="button" class="btn-close btn-sm" @click="errorMessage = ''" aria-label="Close"></button>
          </div>

          <!-- Event Form -->
          <form @submit.prevent="handleSubmitForm" class="mb-5 needs-validation" novalidate>
            <!-- Event Details Card -->
            <div class="card shadow-sm mb-4">
              <div class="card-header bg-light">
                <h4 class="h5 mb-0 text-dark">1. Event Details</h4>
              </div>
              <div class="card-body p-4 p-lg-5">
                <EventBasicDetailsForm
                  v-model:details="formData.details"
                  :isSubmitting="isSubmitting"
                />
              </div>
            </div>

            <!-- Team Configuration Card (Only for Team Format) -->
            <div v-if="formData.details.format === EventFormat.Team" class="card shadow-sm mb-4">
              <div class="card-header bg-light">
                <h4 class="h5 mb-0 text-dark">2. Team Configuration</h4>
              </div>
              <div class="card-body p-4 p-lg-5">
                <ManageTeamsComponent
                  :initial-teams="formData.teams ?? []"
                  :students="availableStudents"
                  :name-cache="nameCache"
                  :is-submitting="isSubmitting"
                  :can-auto-generate="true"
                  :event-id="eventId || ''"
                  @update:teams="handleTeamUpdate"
                  @error="handleFormError"
                />
              </div>
            </div>

            <!-- Event Schedule Card -->
            <div class="card shadow-sm mb-4">
              <div class="card-header bg-light">
                <h4 class="h5 mb-0 text-dark">{{ scheduleCardNumber }}. Event Schedule</h4>
              </div>
              <div class="card-body p-4 p-lg-5">
                <EventScheduleForm
                  v-model:dates="formData.details.date"
                  :isSubmitting="isSubmitting"
                  :eventId="eventId"
                  @error="handleFormError"
                  @availability-change="(val) => isDateAvailable = val"
                />
              </div>
            </div>

            <!-- Rating Criteria Card (Not for Competition Format) -->
            <div v-if="formData.details.format !== EventFormat.Competition" class="card shadow-sm mb-4">
              <div class="card-header bg-light">
                <h4 class="h5 mb-0 text-dark">{{ criteriaCardNumber }}. Selection Criteria & XP</h4>
              </div>
              <div class="card-body p-4 p-lg-5">
                <p class="small text-secondary mb-4">Define how participants will be rated and earn XP. Total XP cannot exceed 50. <span v-if="formData.details.format === EventFormat.Team">A fixed 'Best Performer' criterion (10 XP) is added automatically.</span></p>
                <EventCriteriaForm
                  v-model:criteria="formData.criteria"
                  :isSubmitting="isSubmitting"
                  :eventFormat="formData.details.format"
                  :assignableXpRoles="assignableXpRoles"
                  :totalXP="totalXP"
                />
                <p class="small fw-medium mt-3 mb-0" :class="{ 'text-danger': totalXP > 50, 'text-success': totalXP > 0 && totalXP <= 50 }">
                  Total Assignable XP: {{ totalXP }} / 50
                </p>
                <p v-if="totalXP > 50" class="form-text text-danger mt-1">Total XP must not exceed 50.</p>
              </div>
            </div>

            <!-- Co-organizers Card -->
            <div class="card shadow-sm mb-4">
              <div class="card-header bg-light">
                <h4 class="h5 mb-0 text-dark">{{ coorganizerCardNumber }}. Co-organizers (Optional)</h4>
              </div>
              <div class="card-body p-4 p-lg-5">
                <EventCoOrganizerForm
                  v-model:organizers="formData.details.organizers"
                  :isSubmitting="isSubmitting"
                  :nameCache="nameCache"
                  :currentUserUid="currentUserUid"
                  :allUsers="allUsers"
                />
              </div>
            </div>

            <!-- Submit Button -->
            <div class="text-end mt-5">
              <button type="submit" class="btn btn-primary btn-lg" :disabled="!canSubmitForm">
                <span v-if="isSubmitting" class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                {{ submitButtonText }}
              </button>
            </div>
          </form>
        </div>

      </AuthGuard> <!-- End AuthGuard -->

    </div> <!-- End container-lg -->
  </section>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useUserStore } from '@/store/user';
import { useEventStore } from '@/store/events';
import { useNotificationStore } from '@/store/notification';
import { DateTime } from 'luxon';
// Form Components
import EventBasicDetailsForm from '@/components/forms/EventBasicDetailsForm.vue';
import EventScheduleForm from '@/components/forms/EventScheduleForm.vue';
import EventCriteriaForm from '@/components/forms/EventCriteriaForm.vue';
import EventCoOrganizerForm from '@/components/forms/EventCoOrganizerForm.vue';
import ManageTeamsComponent from '@/components/forms/ManageTeamsComponent.vue';
import AuthGuard from '@/components/AuthGuard.vue';
// Types
import { EventFormData, EventFormat, Event, Team, EventStatus, EventCriteria } from '@/types/event';
import { User } from '@/types/user';

// --- Composables ---
const userStore = useUserStore();
const eventStore = useEventStore();
const notificationStore = useNotificationStore();
const router = useRouter();
const route = useRoute();

// --- Constants ---
const assignableXpRoles = ['developer', 'presenter', 'designer', 'problemSolver'] as const;

// --- Helper Functions ---
function createDefaultFormData(): EventFormData {
    return {
        details: { eventName: '', format: EventFormat.Individual, type: '', description: '', date: { start: null, end: null }, organizers: [], allowProjectSubmission: true, prize: '', },
        status: EventStatus.Pending, teams: [],
        criteria: [{ constraintIndex: Date.now(), constraintLabel: 'Overall Performance', points: 10, role: assignableXpRoles[0], criteriaSelections: {} }]
    };
}

// --- State ---
const loading = ref(true); // Single loading flag
const isSubmitting = ref(false);
const errorMessage = ref('');
const hasActiveRequest = ref(false);
const initialEventData = ref<EventFormData | null>(null);
const isDateAvailable = ref(true);
const formData = ref<EventFormData>(createDefaultFormData());

// --- Computed Properties ---
const eventId = computed(() => route.params.eventId as string | undefined);
const isEditing = computed(() => !!eventId.value);
const isAuthenticated = computed(() => userStore.isAuthenticated);
const currentUserUid = computed<string | null>(() => userStore.uid);

// Removed loading checks from inside computed properties
const allUsers = computed<User[]>(() => userStore.allUsers || []);
const availableStudents = computed<User[]>(() => userStore.studentList || []);
const nameCache = computed(() => {
    const cache = userStore.nameCache;
    const obj: Record<string, string> = {};
    if (cache instanceof Map) { cache.forEach((entry, uid) => { obj[uid] = entry.name; }); }
    return obj;
});

const totalXP = computed(() => formData.value.criteria?.reduce((sum, c) => (c.constraintLabel === 'Best Performer' ? sum : sum + (Number(c.points) || 0)), 0) || 0);

const isFormValid = computed(() => {
  // Keep this check - form isn't valid if still loading data
  if (loading.value) return false;
  const d = formData.value.details;
  if (!(d.eventName.trim() && d.format && d.type && d.description.trim() && d.date.start && d.date.end)) return false;
  if (!isDateAvailable.value) return false;
  if (d.format === EventFormat.Team) {
    const teams = formData.value.teams ?? [];
    if (teams.length < 2) return false;
    for (const team of teams) { if (!team.teamName?.trim() || !Array.isArray(team.members) || team.members.length < 2 || !team.teamLead) return false; }
  }
  if (d.format !== EventFormat.Competition) {
      if (!Array.isArray(formData.value.criteria) || formData.value.criteria.length === 0) return false;
      if (totalXP.value <= 0 || totalXP.value > 50) return false;
      for (const criterion of formData.value.criteria) { if (criterion.constraintLabel !== 'Best Performer' && (!criterion.constraintLabel?.trim() || !criterion.role)) return false; }
  }
  return true;
});

const canSubmitForm = computed(() => !isSubmitting.value && isFormValid.value);
const submitButtonText = computed(() => isSubmitting.value ? 'Processing...' : (isEditing.value ? 'Update Event' : 'Submit Request'));

const scheduleCardNumber = computed(() => formData.value.details.format === EventFormat.Team ? 3 : 2);
const criteriaCardNumber = computed(() => scheduleCardNumber.value + 1);
const coorganizerCardNumber = computed(() => criteriaCardNumber.value + (formData.value.details.format !== EventFormat.Competition ? 1 : 0));

// --- Methods ---
const handleFormError = (message: string) => { errorMessage.value = message; window.scrollTo({ top: 0, behavior: 'smooth' }); };
const handleTeamUpdate = (updatedTeams: Team[]) => { formData.value.teams = updatedTeams; };

const handleSubmitForm = async () => {
  if (!isFormValid.value) { handleFormError("Please fix validation errors before submitting."); return; }
  isSubmitting.value = true; errorMessage.value = '';
  try {
    const dataToSubmit = JSON.parse(JSON.stringify(formData.value));
    // Cleanup data based on format
    if (dataToSubmit.details.format !== EventFormat.Team) delete dataToSubmit.teams;
    if (dataToSubmit.details.format === EventFormat.Competition) delete dataToSubmit.criteria;
    else delete dataToSubmit.details.prize; // Remove prize if not competition
    // Ensure Best Performer criteria is removed if not a Team event
    if (dataToSubmit.details.format !== EventFormat.Team && dataToSubmit.criteria) {
        dataToSubmit.criteria = dataToSubmit.criteria.filter((c: EventCriteria) => c.constraintLabel !== 'Best Performer');
    }

    if (isEditing.value && eventId.value) {
      await eventStore.updateEventDetails({ eventId: eventId.value, updates: dataToSubmit });
      notificationStore.showNotification({ message: 'Event updated successfully!', type: 'success' });
      router.push({ name: 'EventDetails', params: { id: eventId.value } });
    } else {
      const newEventId = await eventStore.requestEvent(dataToSubmit);
      notificationStore.showNotification({ message: 'Event request submitted successfully!', type: 'success' });
      // Optionally redirect to the new event details page or home
      router.push({ name: 'Home' });
      // router.push({ name: 'EventDetails', params: { id: newEventId } });
    }
  } catch (error: any) { handleFormError(error.message || 'An unexpected error occurred.'); }
  finally { isSubmitting.value = false; }
};

const loadInitialData = async () => {
  try {
      // Set loading state first, outside of any reactive effects
      loading.value = true;
      errorMessage.value = '';
      hasActiveRequest.value = false;

      // Create a local variable for temp storage
      const tempFormData = createDefaultFormData();
      
      // Fetch initial data
      await Promise.all([
          userStore.fetchAllStudents(),
          userStore.fetchAllUsers()
      ]);

      if (!isEditing.value) {
          const hasRequest = await eventStore.checkExistingRequests();
          hasActiveRequest.value = hasRequest;
          if (hasRequest) {
              loading.value = false;
              return;
          }
      }

      if (isEditing.value && eventId.value) {
          await eventStore.fetchEventDetails(eventId.value);
          const storeEvent = eventStore.currentEventDetails;
          if (!storeEvent) throw new Error('Event not found or inaccessible.');

          const userId = currentUserUid.value;
          const isOrganizer = storeEvent.details.organizers?.includes(userId ?? '') || storeEvent.requestedBy === userId;
          if (!isOrganizer) {
              throw new Error('You do not have permission to edit this event.');
          }
          if ([EventStatus.Completed, EventStatus.Cancelled, EventStatus.Closed].includes(storeEvent.status as EventStatus)) {
              throw new Error(`Cannot edit an event with status: ${storeEvent.status}`);
          }

          // Map to temp data first
          Object.assign(tempFormData, mapEventToFormData(storeEvent));
      }

      // Finally, update the reactive state in one batch
      formData.value = tempFormData;
      initialEventData.value = JSON.parse(JSON.stringify(tempFormData));

  } catch (error: any) {
      console.error("Error loading initial data:", error);
      handleFormError(error.message || 'Failed to initialize the event form.');
      if (isEditing.value) {
          router.push({ name: 'Home' });
      }
  } finally {
      loading.value = false;
  }
};

const mapEventToFormData = (eventData: Event): EventFormData => {
    const startDate = eventData.details.date.start ? DateTime.fromJSDate(eventData.details.date.start.toDate()).toISODate() : null;
    const endDate = eventData.details.date.end ? DateTime.fromJSDate(eventData.details.date.end.toDate()).toISODate() : null;
    // Ensure criteria is always an array, default if missing/not array
    let criteria = Array.isArray(eventData.criteria) ? eventData.criteria : [];
    if (criteria.length === 0 && eventData.details.format !== EventFormat.Competition) {
         criteria = [{ constraintIndex: Date.now(), constraintLabel: 'Overall Performance', points: 10, role: assignableXpRoles[0], criteriaSelections: {} }];
    }

    return {
        details: {
             ...eventData.details,
             eventName: eventData.details.eventName || '',
             format: eventData.details.format || EventFormat.Individual,
             type: eventData.details.type || '',
             description: eventData.details.description || '',
             organizers: Array.isArray(eventData.details.organizers) ? eventData.details.organizers : [],
             allowProjectSubmission: typeof eventData.details.allowProjectSubmission === 'boolean' ? eventData.details.allowProjectSubmission : true,
             prize: eventData.details.prize || '',
             date: { start: startDate, end: endDate },
         },
        criteria: criteria,
        teams: Array.isArray(eventData.teams) ? eventData.teams : [],
        status: eventData.status || EventStatus.Pending, // Default status if missing
    };
};

// --- Watchers ---
watch(() => formData.value.details.format, (newFormat, oldFormat) => {
    // --- Only run watcher after initial load and if format actually changed ---
    if (!loading.value && newFormat !== oldFormat) {
        // Reset teams if format changes away from Team
        if (newFormat !== EventFormat.Team) formData.value.teams = [];

        // Reset criteria if changing to Competition, or add default if changing away and criteria is empty
        if (newFormat === EventFormat.Competition) formData.value.criteria = [];
        else if (oldFormat === EventFormat.Competition && (!formData.value.criteria || formData.value.criteria.length === 0)) {
             formData.value.criteria = [{ constraintIndex: Date.now() + 1, constraintLabel: 'Overall Performance', points: 10, role: assignableXpRoles[0], criteriaSelections: {} }];
        }

        // Remove prize if not Competition
        if (newFormat !== EventFormat.Competition) formData.value.details.prize = '';

        // Add/Remove 'Best Performer' criterion based on Team format
         const bestPerformerCriterion = { constraintIndex: -1, constraintLabel: 'Best Performer', points: 10, role: '', criteriaSelections: {} };
         const criteriaList = formData.value.criteria || []; // Ensure array
         const hasBestPerf = criteriaList.some(c => c.constraintLabel === 'Best Performer');

         if (newFormat === EventFormat.Team && !hasBestPerf) {
             formData.value.criteria = [...criteriaList, bestPerformerCriterion];
         } else if (newFormat !== EventFormat.Team && hasBestPerf) {
              formData.value.criteria = criteriaList.filter(c => c.constraintLabel !== 'Best Performer');
         }
    }
}, { deep: true });

// --- Lifecycle Hooks ---
onMounted(loadInitialData);

</script>

<style scoped>
.create-event-section { background-color: var(--bs-light); }
.card { border: none; border-radius: 0.75rem; }
.card-header { background-color: var(--bs-light); border-bottom: 1px solid var(--bs-border-color-translucent); padding: 1rem 1.5rem; }
.card-body { padding: 1.5rem; }
/* Improved validation styling */
.needs-validation .form-control.is-invalid,
.needs-validation .form-select.is-invalid {
    border-color: var(--bs-danger);
    background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12' width='12' height='12' fill='none' stroke='%23dc3545'%3e%3ccircle cx='6' cy='6' r='4.5'/%3e%3cpath stroke-linejoin='round' d='M5.8 3.6h.4L6 6.5z'/%3e%3ccircle cx='6' cy='8.2' r='.6' fill='%23dc3545' stroke='none'/%3e%3c/svg%3e");
    background-repeat: no-repeat;
    background-position: right calc(0.375em + 0.1875rem) center;
    background-size: calc(0.75em + 0.375rem) calc(0.75em + 0.375rem);
}
.needs-validation .invalid-feedback { display: block; font-size: 0.8em; margin-top: 0.25rem; color: var(--bs-danger); }
.form-label .text-danger { font-size: 1.2em; line-height: 1; vertical-align: text-top; margin-left: 0.1em; }
</style>