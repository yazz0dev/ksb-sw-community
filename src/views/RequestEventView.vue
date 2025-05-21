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

      <!-- Error state for editing - NEW COMPONENT -->
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

      <!-- Auth Guard - Render only AFTER loading is false and no edit error -->
      <AuthGuard v-else :key="'auth-guard'" message="You must be logged in to request or edit events.">

        <!-- Active Request Warning (Show after loading, only when creating) -->
        <div v-if="!isEditing && hasActiveRequest" :key="'active-request-warning'" class="alert alert-warning d-flex align-items-start mb-5 shadow-sm border-warning-subtle" role="alert" style="background-color: var(--bs-warning-bg-subtle);">
          <i class="fas fa-exclamation-triangle text-warning me-3 fs-4 mt-1"></i>
          <div>
            <h6 class="alert-heading mb-1 fw-medium">Pending Request Active</h6>
            <small class="text-body">You already have a pending event request. Please wait for it to be reviewed before submitting a new one, or <router-link :to="{ name: 'Profile' }" class="alert-link">view your requests</router-link>.</small>
          </div>
        </div>

        <!-- Main Form Content (Render only when not loading and no active request conflict) -->
        <div v-else :key="'event-form-content'">
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
            <div class="card shadow-sm mb-4" key="event-details-card">
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
            <div v-if="formData.details.format === EventFormat.Team" class="card shadow-sm mb-4" :key="`team-config-card-${2}`">
              <div class="card-header bg-light">
                <h4 class="h5 mb-0 text-dark">2. Team Configuration</h4>
              </div>
              <div class="card-body p-4 p-lg-5">
                 <ManageTeamsComponent
                  :initial-teams="formData.teams ?? []"
                  :students="availableStudents"
                  :is-submitting="isSubmitting"
                  :can-auto-generate="true"
                  :event-id="eventId || ''"
                  @update:teams="handleTeamUpdate"
                  @error="handleFormError"
                />
              </div>
            </div>

             <!-- Event Schedule Card -->
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
                   @availability-change="(val) => isDateAvailable = val"
                 />
               </div>
             </div>

 <!-- Rating Criteria Card (Not for Competition Format) -->
             <div v-if="formData.details.format !== EventFormat.Competition" class="card shadow-sm mb-4" :key="`criteria-card-${criteriaCardNumber}`">
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
             <div class="card shadow-sm mb-4" :key="`coorganizer-card-${coorganizerCardNumber}`">
               <div class="card-header bg-light">
                 <h4 class="h5 mb-0 text-dark">{{ coorganizerCardNumber }}. Co-organizers (Optional)</h4>
               </div>
               <div class="card-body p-4 p-lg-5">
                 <EventCoOrganizerForm
                   v-model:organizers="formData.details.organizers"
                   :isSubmitting="isSubmitting"
                   :nameCache="nameCacheObject"
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
import { useUserStore } from '@/store/studentProfileStore';
import { useEventStore } from '@/store/studentEventStore';
import { useNotificationStore } from '@/store/studentNotificationStore';
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
import { UserData } from '@/types/student'; // Use UserData consistently
import { BEST_PERFORMER_LABEL } from '@/utils/constants'; // Corrected import path (removed semicolon)


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
        details: { 
            eventName: '', 
            format: EventFormat.Individual, 
            type: '', 
            description: '',
            rules: '', // Added rules field
            date: { start: null, end: null }, 
            organizers: [], 
            allowProjectSubmission: true, 
            prize: '' 
        },
        status: EventStatus.Pending, 
        teams: [],
        criteria: [{ constraintIndex: Date.now(), constraintLabel: 'Overall Performance', points: 10, role: assignableXpRoles[0], criteriaSelections: {} }]
    };
}

// --- State ---
const loading = ref(true); // Single loading flag
const isSubmitting = ref(false);
const errorMessage = ref('');
const editError = ref(''); // NEW: Specific error for editing issues
const hasActiveRequest = ref(false);
const initialEventData = ref<EventFormData | null>(null);
const isDateAvailable = ref(true);
const formData = ref<EventFormData>(createDefaultFormData());

// --- Computed Properties ---
const eventId = computed(() => route.params.eventId as string | undefined);
const isEditing = computed(() => !!eventId.value);
const currentUserUid = computed<string | null>(() => userStore.uid);

// Type as UserData[]
// Fallback to empty array if the getter doesn't exist or returns falsy.
const allUsers = computed<UserData[]>(() => userStore.getAllUsers); 
const availableStudents = computed<UserData[]>(() => userStore.getStudentList); 

const nameCacheObject = computed(() => {
    const cache = userStore.nameCache;
    const obj: Record<string, string> = {};
    if (cache instanceof Map) {
        cache.forEach((entry, uid) => {
            obj[uid] = entry.name;
        });
    }
    return obj;
});


const totalXP = computed(() => formData.value.criteria?.reduce((sum, c) => (c.constraintLabel === BEST_PERFORMER_LABEL ? sum : sum + (Number(c.points) || 0)), 0) || 0);

const isFormValid = computed(() => {
  if (loading.value) {
    return false;
  }

  const d = formData.value.details;

  // Basic Details Check
  if (!d.eventName.trim()) { return false; }
  if (!d.format) { return false; }
  if (!d.type) { return false; }
  if (!d.description.trim()) { return false; }
  if (!d.date.start) { return false; }
  if (!d.date.end) { return false; }

  // Date Availability Check
  if (!isDateAvailable.value) {
    return false;
  }

  // Team Check
  if (d.format === EventFormat.Team) {
    const teams = formData.value.teams ?? [];
    if (teams.length < 2) {
        return false;
    }
    const minMembers = 2; // Define minimum explicitly
    const teamsAreValid = teams.every((team) => { // Removed unused 'index'
        const teamIsValid =
            team.teamName?.trim() &&
            Array.isArray(team.members) &&
            team.members.length >= minMembers &&
            team.teamLead &&
            team.members.includes(team.teamLead);

        return teamIsValid;
    });

    if (!teamsAreValid) {
        return false; // Exit if any team is invalid
    }
  }

  // Criteria Check
  if (d.format !== EventFormat.Competition) {
    const criteria = formData.value.criteria ?? [];
    if (criteria.length === 0) {
        return false; // Must have at least default/best performer
    }
    // Filter out the best performer criterion for validation checks
    const nonBestPerformerCriteria = criteria.filter(c => c.constraintLabel !== BEST_PERFORMER_LABEL);
    const currentTotalXP = totalXP.value; // Use computed totalXP

    // Validate total XP (excluding best performer)
    if (currentTotalXP <= 0 || currentTotalXP > 50) {
      return false;
    }
    // Check each non-best-performer criterion for label and role
    const criteriaAreValid = nonBestPerformerCriteria.every((criterion) => { // Removed unused 'index'
        const isValid = criterion.constraintLabel?.trim() && criterion.role;
        return isValid;
    });

     if (!criteriaAreValid) {
         return false; // Exit if any user criterion is invalid
     }
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
const handleTeamUpdate = (updatedTeams: Team[]) => {
    formData.value.teams = updatedTeams;
};

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
        dataToSubmit.criteria = dataToSubmit.criteria.filter((c: EventCriteria) => c.constraintLabel !== BEST_PERFORMER_LABEL);
    }

    if (isEditing.value && eventId.value) {
      await eventStore.updateEventDetails({ eventId: eventId.value, updates: dataToSubmit });
      notificationStore.showNotification({ message: 'Event updated successfully!', type: 'success' });
      router.push({ name: 'EventDetails', params: { id: eventId.value } });
    } else {
      await eventStore.requestEvent(dataToSubmit);
      notificationStore.showNotification({ message: 'Event request submitted successfully!', type: 'success' });
      router.push({ name: 'Home' });
    }
  } catch (error: any) { handleFormError(error.message || 'An unexpected error occurred.'); }
  finally { isSubmitting.value = false; }
};

const loadInitialData = async () => {
  try {
      loading.value = true;
      errorMessage.value = '';
      editError.value = ''; // Reset edit error
      hasActiveRequest.value = false;

      await Promise.all([
          userStore.fetchAllStudents ? userStore.fetchAllStudents() : Promise.resolve(), 
          userStore.fetchAllUsers ? userStore.fetchAllUsers() : Promise.resolve()
      ]);

      // Log store state immediately after fetches
      console.log('[RequestEventView loadInitialData] After fetchAllStudents promise resolved. Store studentList length:', userStore.getStudentList.length);
      if (userStore.getStudentList.length > 0) {
          console.log('[RequestEventView loadInitialData] First student from store after fetch:', JSON.stringify(userStore.getStudentList[0]));
      }


      const tempFormData = createDefaultFormData(); // Start with default

      if (!isEditing.value) {
          const hasRequest = await eventStore.checkExistingRequests();
          hasActiveRequest.value = hasRequest;
          if (hasRequest) {
              loading.value = false; // Stop loading if user can't proceed
              return; // Exit early
          }
      } else if (eventId.value) {
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
          // Map fetched event data
          Object.assign(tempFormData, mapEventToFormData(storeEvent));
      }

      // Update reactive state
      formData.value = tempFormData;
      initialEventData.value = JSON.parse(JSON.stringify(tempFormData));

  } catch (error: any) {
      // Handle editing errors without auto-redirect
      if (isEditing.value) {
          // Set the edit error message that will trigger the error UI
          editError.value = error.message || 'Access denied or invalid status';
          
          // Show notification but don't auto-redirect
          notificationStore.showNotification({ 
              message: `Cannot edit event: ${editError.value}`, 
              type: 'warning',
              duration: 8000 // Longer duration since we're not redirecting
          });
      } else {
          // Only handle errors locally if we're not editing (new event creation)
          handleFormError(error.message || 'Failed to initialize the event form.');
      }
  } finally {
      loading.value = false; // Set loading false *after* all async ops are done
  }
};


const mapEventToFormData = (eventData: Event): EventFormData => {
    // Helper function to safely convert various date formats to ISO date string
    const convertDateToISOString = (date: any): string | null => {
        if (!date) return null;
        
        try {
            // Handle Firestore Timestamp objects
            if (date.toDate && typeof date.toDate === 'function') {
                return DateTime.fromJSDate(date.toDate()).toISODate();
            } 
            // Handle regular Date objects
            else if (date instanceof Date) {
                return DateTime.fromJSDate(date).toISODate();
            } 
            // Handle ISO strings
            else if (typeof date === 'string') {
                return DateTime.fromISO(date).toISODate();
            }
            // Unknown format
            console.warn("Unknown date format:", date);
            return null;
        } catch (error) {
            console.error("Error converting date:", error);
            return null;
        }
    };

    const startDate = convertDateToISOString(eventData.details.date.start);
    const endDate = convertDateToISOString(eventData.details.date.end);
    
    let mappedCriteria: EventCriteria[] = [];
    const criteriaSource = eventData.criteria;

    if (criteriaSource) {
        if (Array.isArray(criteriaSource)) {
            mappedCriteria = criteriaSource;
        } else if (typeof criteriaSource === 'object' && criteriaSource !== null) {
            // Handles cases where Firestore might return an object like {0: {...}, 1: {...}}
            mappedCriteria = Object.values(criteriaSource);
        }
    }
    
    // If after processing, criteria is empty and it's not a competition, add default
    if (mappedCriteria.length === 0 && eventData.details.format !== EventFormat.Competition) {
         mappedCriteria = [{ constraintIndex: Date.now(), constraintLabel: 'Overall Performance', points: 10, role: assignableXpRoles[0], criteriaSelections: {} }];
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
             rules: eventData.details.rules || '', // Added rules
         },
        criteria: mappedCriteria, // Use the processed mappedCriteria
        teams: Array.isArray(eventData.teams) ? eventData.teams : [],
        status: eventData.status || EventStatus.Pending,
    };
};

// --- Watchers ---
watch(() => formData.value.details.format, (newFormat, oldFormat) => {
    // Prevent watcher running during initial load or if format hasn't changed
    if (loading.value || newFormat === oldFormat) return;

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
     const bestPerformerCriterion = { constraintIndex: -1, constraintLabel: BEST_PERFORMER_LABEL, points: 10, role: '', criteriaSelections: {} };
     const criteriaList = formData.value.criteria || [];
     const hasBestPerf = criteriaList.some(c => c.constraintLabel === BEST_PERFORMER_LABEL);

     if (newFormat === EventFormat.Team && !hasBestPerf) {
         formData.value.criteria = [...criteriaList, bestPerformerCriterion];
     } else if (newFormat !== EventFormat.Team && hasBestPerf) {
          formData.value.criteria = criteriaList.filter(c => c.constraintLabel !== BEST_PERFORMER_LABEL);
     }
}, { deep: true });

// Watch availableStudents to see when it updates
watch(availableStudents, (newStudents, oldStudents) => {
  console.log(`[RequestEventView] Watcher: availableStudents changed. New length: ${newStudents.length}, Old length: ${oldStudents?.length ?? 0}`);
  if (newStudents.length > 0) {
    console.log('[RequestEventView] Watcher: First student in availableStudents:', JSON.stringify(newStudents[0]));
  }
}, { deep: true, immediate: true }); // Add immediate to see initial state

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