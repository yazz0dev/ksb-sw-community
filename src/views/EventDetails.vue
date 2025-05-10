<template>
  <div class="event-details-view container-fluid px-0 px-md-2 event-details-bg">
    <SkeletonProvider
      :loading="loading"
      :skeleton-component="EventDetailsSkeleton"
    >
      <!-- Error Display -->
      <div v-if="initialFetchError" class="container-lg mt-4">
        <div class="alert alert-danger" role="alert">
          <i class="fas fa-exclamation-triangle me-2"></i>
          {{ initialFetchError }}
        </div>
      </div>

      <!-- Event Content (Render only if event data is loaded successfully) -->
      <template v-if="event && !initialFetchError">
        <!-- Event Header -->
        <EventDetailsHeader
          :event="mapEventToHeaderProps(event)"
          :canJoin="canJoin"
          :canLeave="canLeave"
          :isJoining="isJoining"
          :isLeaving="isLeaving"
          :name-cache="nameCacheRecord"
          @join="handleJoin"
          @leave="handleLeave"
          class="animate-fade-in"
        />

        <!-- Floating Action Button for Submission (conditionally rendered) -->
        <template v-if="canSubmitProject && event.details.allowProjectSubmission !== false">
          <div class="d-none d-md-block text-end mb-3">
            <button
              class="btn btn-lg btn-primary shadow submit-fab"
              @click="triggerSubmitModalOpen"
              title="Submit Project"
            >
              <i class="fas fa-upload me-2"></i> Submit Project
            </button>
          </div>
          <button
            class="btn btn-primary shadow submit-fab-mobile d-md-none"
            @click="triggerSubmitModalOpen"
            title="Submit Project"
          >
            <i class="fas fa-upload"></i>
          </button>
        </template>

        <div class="row g-4 mt-0">
          <!-- Main Content Column -->
          <div class="col-12 col-lg-8">
            <!-- Event Management Controls -->
            <div class="mb-4">
              <EventManageControls
                :event="event"
                class="mb-0 animate-fade-in"
                @update="fetchData"
              />
            </div>

            <!-- XP/Criteria Section -->
            <EventCriteriaDisplay v-if="event.criteria?.length" :criteria="event.criteria" />

            <!-- Feedback Message -->
            <transition name="fade-pop">
              <div v-if="globalFeedback.message"
                class="alert alert-sm mt-3 mb-3 d-flex align-items-center animate-fade-in"
                :class="globalFeedback.type === 'success' ? 'alert-success' : 'alert-danger'"
                role="alert"
              >
                <i class="fas me-2" :class="globalFeedback.type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'"></i>
                <div>{{ globalFeedback.message }}</div>
              </div>
            </transition>

            <!-- Teams/Participants Section -->
            <div class="mt-4">
              <!-- Team List -->
              <div v-if="isTeamEvent" class="mb-4">
                <div class="section-header mb-3">
                  <i class="fas fa-users text-primary me-2"></i>
                  <span class="h5 mb-0 text-primary">Teams</span>
                </div>
                <TeamList
                  :teams="teams"
                  :event-id="props.id"
                  :ratingsOpen="event.ratingsOpen"
                  :getUserName="getUserNameFromCache"
                  :organizerNamesLoading="organizerNamesLoading"
                  :currentUserUid="currentUserId"
                  class="card team-list-box p-0 shadow-sm animate-fade-in"
                />
              </div>
              <!-- Participant List (Individual/Competition) -->
              <EventParticipantList
                v-else
                :participants="event.participants ?? []"
                :loading="loading"
                :getUserName="getUserNameFromCache"
                :currentUserId="currentUserId"
                class="mb-4"
              />
            </div>
          </div>

          <!-- Sidebar Column: Submissions & Ratings -->
          <div class="col-12 col-lg-4">
            <div class="sticky-lg-top" style="top: 80px;">
              <!-- Submission Section -->
              <EventSubmissionsSection
                v-if="event.details.allowProjectSubmission !== false"
                :event="event"
                :teams="teams"
                :loading="loading"
                :getUserName="getUserNameFromCache"
                :canSubmitProject="canSubmitProject"
                @open-submission-modal="triggerSubmitModalOpen"
                class="mb-4"
              />
              <!-- Rating Section -->
              <EventRatingTrigger
                :event="event"
                :currentUser="currentUser"
                :isCurrentUserParticipant="isCurrentUserParticipant"
                :canRateOrganizer="canRateOrganizer"
                :loading="loading"
                :isCurrentUserOrganizer="isCurrentUserOrganizer"
                class="mb-4"
              >
                 <template v-if="loading">
                    <div class="d-flex align-items-center gap-2">
                      <div class="spinner-border spinner-border-sm" role="status"><span class="visually-hidden">Loading...</span></div>
                      <span class="small text-secondary">Loading eligibility...</span>
                    </div>
                 </template>
                 <template v-else-if="!currentUser">
                    <p class="small text-secondary fst-italic">Please log in to participate.</p>
                 </template>
                 <template v-else-if="event.status !== EventStatus.Completed">
                    <p class="small text-secondary fst-italic">Selection/Rating available once event is completed.</p>
                 </template>
                 <template v-else-if="event.ratingsOpen !== true">
                    <p class="small text-secondary fst-italic">Selection/Rating is currently closed.</p>
                 </template>
                 <template v-else-if="!isCurrentUserParticipant">
                    <p class="small text-secondary fst-italic">Must be a participant to select/rate.</p>
                 </template>
                 <template v-else-if="hasUserRated">
                     <p class="alert alert-success alert-sm py-2 d-flex align-items-center mb-2">
                         <i class="fas fa-check-circle me-2"></i> You have submitted selections/ratings.
                     </p>
                     <button v-if="canEditSubmission" @click="openRatingForm" class="btn btn-sm btn-outline-secondary d-inline-flex align-items-center">
                         <i class="fas fa-edit me-1"></i> Edit Selection
                     </button>
                 </template>
                 <template v-else>
                    <button @click="openRatingForm" class="btn btn-sm btn-primary d-inline-flex align-items-center mt-2">
                      <i class="fas fa-trophy me-1"></i> Select/Rate Now
                    </button>
                 </template>
              </EventRatingTrigger>

              <!-- Organizer Rating Form -->
              <OrganizerRatingForm
                v-if="canRateOrganizer"
                :event-id="event.id"
                :current-user-id="currentUser?.uid ?? ''"
                :existing-ratings="event.organizerRating || []"
                class="mt-3"
              />
            </div>
          </div>
        </div>

        <!-- Submission Modal -->
        <div
          class="modal fade"
          id="submissionModal"
          tabindex="-1"
          aria-labelledby="submissionModalLabel"
          aria-hidden="true"
          ref="submissionModalRef"
          v-if="event?.details.allowProjectSubmission !== false"
        >
          <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content rounded-4 shadow-lg animate-fade-in">
              <div class="modal-header border-0 pb-0">
                <h5 class="modal-title h5" id="submissionModalLabel"><i class="fas fa-upload me-2 text-primary"></i>Submit Your Project</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
              </div>
              <div class="modal-body">
                <form @submit.prevent="submitProject" id="submissionFormInternal">
                  <div class="mb-3">
                    <label for="projectName" class="form-label small">Project Name <span class="text-danger">*</span></label>
                    <input type="text" id="projectName" v-model="submissionForm.projectName" required class="form-control form-control-sm">
                  </div>
                  <div class="mb-3">
                    <label for="projectLink" class="form-label small">Project Link (GitHub, Demo, etc.) <span class="text-danger">*</span></label>
                    <input type="url" id="projectLink" v-model="submissionForm.link" required placeholder="https://..." class="form-control form-control-sm">
                  </div>
                  <div class="mb-3">
                    <label for="projectDescription" class="form-label small">Brief Description</label>
                    <textarea id="projectDescription" v-model="submissionForm.description" rows="3" class="form-control form-control-sm"></textarea>
                  </div>
                  <div v-if="submissionError" class="form-text text-danger d-flex align-items-center small"><i class="fas fa-exclamation-circle me-1"></i> {{ submissionError }}</div>
                </form>
              </div>
              <div class="modal-footer border-0 pt-0">
                <button type="button" class="btn btn-sm btn-secondary" data-bs-dismiss="modal">
                  Cancel
                </button>
                <button
                  type="button"
                  @click="submitProject"
                  :disabled="isSubmittingProject || actionInProgress"
                  class="btn btn-sm btn-primary"
                >
                  <span v-if="isSubmittingProject" class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                  {{ isSubmittingProject ? 'Submitting...' : 'Submit Project' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </template> <!-- End v-if="event && !initialFetchError" -->
    </SkeletonProvider>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useUserStore } from '@/store/user';
import { useEventStore } from '@/store/events';
import { useNotificationStore } from '@/store/notification';

// Component Imports
import EventCriteriaDisplay from '@/components/events/EventCriteriaDisplay.vue';
import EventParticipantList from '@/components/events/EventParticipantList.vue';
import EventSubmissionsSection from '@/components/events/EventSubmissionsSection.vue';
import EventRatingTrigger from '@/components/events/EventRatingTrigger.vue';
import OrganizerRatingForm from '@/components/events/OrganizerRatingForm.vue';
import TeamList from '@/components/events/TeamList.vue';
import EventManageControls from '@/components/events/EventManageControls.vue';
import EventDetailsSkeleton from '@/skeletons/EventDetailsSkeleton.vue';
import SkeletonProvider from '@/skeletons/SkeletonProvider.vue';
import EventDetailsHeader from '@/components/events/EventDetailsHeader.vue';

// Type Imports
import { EventStatus, type Event, type Team, type Submission, EventFormat, type EventCriteria } from '@/types/event';
import { User } from '@/types/user';

// --- Local Types & Interfaces ---
interface SubmissionFormData {
	projectName: string;
	link: string;
	description: string;
}
interface FeedbackState {
	message: string;
	type: 'success' | 'error';
}
// Interface for Bootstrap Modal JS object
interface BootstrapModal {
  show(): void;
  hide(): void;
  dispose(): void;
  handleUpdate(): void; // Optional method
}
// Interface defining the expected props for EventDetailsHeader
interface EventHeaderProps {
  id: string;
  status: string;
  title: string;
  details: {
    format: EventFormat;
    date: { start: any; end: any; };
    description: string;
    organizers?: string[];
    prize?: string;
    eventName?: string;
    type?: string;
    rules?: string; // Add rules field
  };
  closed?: boolean;
  teams?: Team[];
  participants?: string[];
}

// --- Props ---
interface Props {
  id: string;
}
const props = defineProps<Props>();

// --- Composables ---
// FIX: Initialize stores only ONCE at the top level of <script setup>
const userStore = useUserStore();
const eventStore = useEventStore();
const notificationStore = useNotificationStore();
const router = useRouter();
const route = useRoute();

// --- Refs and Reactive State ---
const loading = ref<boolean>(true);
const event = ref<Event | null>(null);
const teams = ref<Team[]>([]);
const initialFetchError = ref<string>('');
const nameCache = ref<Map<string, string>>(new Map());
const organizerNamesLoading = ref<boolean>(false);
const submissionModalRef = ref<HTMLElement | null>(null);
let submissionModalInstance: BootstrapModal | null = null; // Store modal instance

const submissionForm = ref<SubmissionFormData>({ projectName: '', link: '', description: '' });
const submissionError = ref<string>('');
const isSubmittingProject = ref<boolean>(false);
const actionInProgress = ref<boolean>(false); // General flag for any async action
const isJoining = ref(false);
const isLeaving = ref(false);
const globalFeedback = ref<FeedbackState>({ message: '', type: 'success' });

// --- Computed Properties ---
const currentUserId = computed<string | null>(() => userStore.uid);
const currentUser = computed<User | null>(() => userStore.currentUser);

// Transforms the nameCache Map into a plain object for props compatibility
const nameCacheRecord = computed(() => Object.fromEntries(nameCache.value));

const isTeamEvent = computed<boolean>(() => event.value?.details.format === EventFormat.Team);

// Determines if the current user is an organizer or the requester of the event
const isCurrentUserOrganizer = computed<boolean>(() => {
    if (!event.value || !currentUserId.value) return false;
    const organizers = event.value.details?.organizers ?? [];
    const requester = event.value.requestedBy ?? '';
    return organizers.includes(currentUserId.value) || requester === currentUserId.value;
});

// Determines if the current user is a participant (directly or via team)
const isCurrentUserParticipant = computed<boolean>(() => {
    if (!event.value || !currentUser.value?.uid) return false;
    const uid = currentUser.value.uid;
    // Organizers are implicitly participants for rating purposes etc.
    if (isCurrentUserOrganizer.value) return true;
    // Check specific participation based on format
    if (isTeamEvent.value) {
        return event.value.teams?.some(team => Array.isArray(team.members) && team.members.includes(uid)) ?? false;
    } else {
        return event.value.participants?.includes(uid) ?? false;
    }
});

// Logic for enabling the "Join Event" button
const canJoin = computed(() => {
  if (!event.value || !currentUserId.value || isJoining.value || actionInProgress.value) return false;
  // Can only join Approved or InProgress events
  if (![EventStatus.Approved, EventStatus.InProgress].includes(event.value.status as EventStatus)) return false;
  // Organizers cannot join explicitly
  if (isCurrentUserOrganizer.value) return false;
  // Check if already participating based on format
  if (isTeamEvent.value) {
      return !event.value.teams?.some(team => team.members?.includes(currentUserId.value!));
  } else {
      return !event.value.participants?.includes(currentUserId.value);
  }
});

// Logic for enabling the "Leave Event" button
const canLeave = computed(() => {
  if (!event.value || !currentUserId.value || isLeaving.value || actionInProgress.value) return false;
  // Cannot leave Completed, Cancelled, or Closed events
  if ([EventStatus.Completed, EventStatus.Cancelled, EventStatus.Closed].includes(event.value.status as EventStatus)) return false;
  // Organizers cannot leave
  if (isCurrentUserOrganizer.value) return false;
  // Check if currently participating based on format
  if (isTeamEvent.value) {
     return event.value.teams?.some(team => team.members?.includes(currentUserId.value!)) ?? false;
  } else {
     return event.value.participants?.includes(currentUserId.value) ?? false;
  }
});

// Determines if the user can submit a project
const canSubmitProject = computed(() => {
  if (!event.value || !currentUserId.value || actionInProgress.value) return false;
  // Can only submit during InProgress status
  if (event.value.status !== EventStatus.InProgress) return false;
  // Check if submissions are allowed for the event
  if (event.value.details.allowProjectSubmission === false) return false;
  // Organizers cannot submit
  if (isCurrentUserOrganizer.value) return false;
  // Check based on format
  const uid = currentUserId.value;
  if (isTeamEvent.value) {
    // Only the team lead can submit for the team
    const userTeam = event.value.teams?.find(team => team.members?.includes(uid));
    return !!userTeam && userTeam.teamLead === uid;
  } else {
    // Individual participants can submit
    return event.value.participants?.includes(uid) ?? false;
  }
});

// Checks if the user has already submitted ratings/selections
const hasUserRated = computed(() => {
    if (!event.value || !currentUser.value?.uid) return false;
    const uid = currentUser.value.uid;
    const criteriaArray = Array.isArray(event.value.criteria) ? event.value.criteria : [];

    if (isTeamEvent.value) {
        const criteriaRated = criteriaArray.some((c: EventCriteria) => c.criteriaSelections?.[uid]);
        const bestPerformerRated = !!event.value.bestPerformerSelections?.[uid];
        return criteriaRated || bestPerformerRated;
    } else {
        return criteriaArray.some((c: EventCriteria) => c.criteriaSelections?.[uid]);
    }
});

// Determines if the user can edit their previous submission/rating
const canEditSubmission = computed(() => {
    // Can edit if they have rated AND ratings are currently open
    return hasUserRated.value && event.value?.ratingsOpen === true;
});

// Determines if the current user can rate the organizer
const canRateOrganizer = computed(() => {
  if (!event.value || !currentUser.value?.uid) return false;
  // Can only rate Completed events
  if (event.value.status !== EventStatus.Completed) return false;
  // Check if the user participated (but wasn't an organizer)
  const uid = currentUser.value.uid;
  let participated = false;
  if (isTeamEvent.value) {
    participated = event.value.teams?.some(team => team.members?.includes(uid)) ?? false;
  } else { // Individual or Competition
    participated = event.value.participants?.includes(uid) ?? false;
  }
  return participated && !isCurrentUserOrganizer.value;
});

// Gathers all unique user IDs associated with the event
const allAssociatedUserIds = computed<string[]>(() => {
    if (!event.value) return [];
    const userIds = new Set<string>();
    // Add requester and organizers
    if (event.value.requestedBy) userIds.add(event.value.requestedBy);
    (event.value.details.organizers || []).forEach(id => { if (id) userIds.add(id); });
    // Add participants or team members
    if (isTeamEvent.value) {
        (event.value.teams || []).forEach(team => { (team.members || []).forEach(id => { if (id) userIds.add(id); }); });
    } else {
        (event.value.participants || []).forEach(id => { if (id) userIds.add(id); });
    }
    // Add submitters if submissions exist
    (event.value.submissions || []).forEach(sub => { if (sub.submittedBy) userIds.add(sub.submittedBy); });
    // Add raters if ratings exist (example structure)
    (event.value.organizerRating || []).forEach(rating => { if (rating.userId) userIds.add(rating.userId); });

    return Array.from(userIds).filter(Boolean); // Ensure no falsy IDs
});

// --- Methods ---

// Displays feedback message and optionally clears it after a duration
function setGlobalFeedback(message: string, type: 'success' | 'error' = 'success', duration: number = 4000): void {
  globalFeedback.value = { message, type };
  if (duration > 0) {
    setTimeout(clearGlobalFeedback, duration);
  }
}
function clearGlobalFeedback(): void {
  globalFeedback.value = { message: '', type: 'success' };
}

// Safely gets user name from cache, providing a fallback
const getUserNameFromCache = (userId: string): string => {
  return nameCache.value.get(userId) || `User (${userId.substring(0, 5)}...)`;
};

// Fetches names for a list of user IDs and updates the local cache
async function fetchUserNames(userIds: string[]): Promise<void> {
    if (!Array.isArray(userIds) || userIds.length === 0) return;
    const uniqueIdsToFetch = [...new Set(userIds)].filter(id => id && !nameCache.value.has(id));
    if (uniqueIdsToFetch.length === 0) return;

    organizerNamesLoading.value = true;
    try {
        // FIX: Use userStore action directly
        const names: Record<string, string> = await userStore.fetchUserNamesBatch(uniqueIdsToFetch);
        uniqueIdsToFetch.forEach(id => {
            nameCache.value.set(id, names[id] || `User (${id.substring(0, 5)}...)`);
        });
    } catch (error: any) {
        console.error("Error fetching user names:", error);
        // Provide a fallback name in case of error
        uniqueIdsToFetch.forEach(id => {
            if (!nameCache.value.has(id)) nameCache.value.set(id, `Error Loading Name`);
        });
    } finally {
        organizerNamesLoading.value = false;
    }
}

// Main data fetching function for the view
async function fetchData(): Promise<void> {
  loading.value = true;
  initialFetchError.value = '';
  event.value = null;
  teams.value = [];
  // Keep existing names in cache unless explicitly cleared elsewhere
  // nameCache.value.clear();

  try {
    // Fetch event details from the store
    await eventStore.fetchEventDetails(props.id);
    const storeEvent = eventStore.currentEventDetails as Event | null;

    if (!storeEvent || storeEvent.id !== props.id) {
      throw new Error('Event not found or you do not have permission to view it.');
    }

    event.value = { ...storeEvent }; // Use a copy
    teams.value = (isTeamEvent.value && Array.isArray(storeEvent.teams)) ? [...storeEvent.teams] : [];

    // Fetch names for all associated users
    await fetchUserNames(allAssociatedUserIds.value);

  } catch (error: any) {
    console.error('Failed to load event details:', error);
    initialFetchError.value = error.message || 'Failed to load event data. Please try again.';
    event.value = null; // Clear event data on error
    teams.value = [];
  } finally {
    loading.value = false;
  }
}

// Gets or creates the Bootstrap modal instance
const getOrCreateModalInstance = (): BootstrapModal | null => {
    if (!submissionModalRef.value || !window.bootstrap?.Modal) return null;
    if (!submissionModalInstance) {
        submissionModalInstance = new window.bootstrap.Modal(submissionModalRef.value);
    }
    return submissionModalInstance;
};

// Opens the submission modal
const triggerSubmitModalOpen = (): void => {
  submissionForm.value = { projectName: '', link: '', description: '' }; // Reset form
  submissionError.value = ''; // Clear previous errors
  getOrCreateModalInstance()?.show();
};

// Handles the project submission logic
const submitProject = async (): Promise<void> => {
    if (!submissionForm.value.projectName || !submissionForm.value.link) {
        submissionError.value = 'Project Name and Link are required.';
        return;
    }
    if (!currentUserId.value) {
        submissionError.value = 'You must be logged in to submit.';
        return;
    }
    if (!event.value) {
        submissionError.value = 'Event data not loaded.';
        return;
    }
    // Basic URL validation
    try { new URL(submissionForm.value.link); } catch (_) {
        submissionError.value = 'Please enter a valid URL (e.g., https://github.com/...).'; return;
    }

    submissionError.value = '';
    isSubmittingProject.value = true;
    actionInProgress.value = true;

    try {
        await eventStore.submitProjectToEvent({
            eventId: props.id,
            submissionData: {
                projectName: submissionForm.value.projectName.trim(),
                link: submissionForm.value.link.trim(),
                description: submissionForm.value.description.trim() || null, // Send null if empty
            }
        });
        setGlobalFeedback('Project submitted successfully!', 'success');
        getOrCreateModalInstance()?.hide(); // Hide modal on success
        await fetchData(); // Refresh event data to show submission
    } catch (error: any) {
        console.error("Project submission error:", error);
        submissionError.value = error.message || 'Failed to submit project.';
    } finally {
        isSubmittingProject.value = false;
        actionInProgress.value = false;
    }
};

// Handles joining the event
const handleJoin = async (): Promise<void> => {
    if (!event.value || !currentUserId.value || isJoining.value || actionInProgress.value) return;
    isJoining.value = true;
    actionInProgress.value = true;
    try {
        await eventStore.joinEvent(props.id);
        setGlobalFeedback('Successfully joined the event!', 'success');
        await fetchData(); // Refresh data
    } catch (error: any) {
        setGlobalFeedback(`Failed to join event: ${error.message}`, 'error');
    } finally {
        isJoining.value = false;
        actionInProgress.value = false;
    }
};

// Handles leaving the event
const handleLeave = async (): Promise<void> => {
    if (!event.value || !currentUserId.value || isLeaving.value || actionInProgress.value) return;
    if (!window.confirm('Are you sure you want to leave this event?')) return;

    isLeaving.value = true;
    actionInProgress.value = true;
    try {
        await eventStore.leaveEvent(props.id);
        setGlobalFeedback('Successfully left the event.', 'success');
        await fetchData(); // Refresh data
    } catch (error: any) {
        setGlobalFeedback(`Failed to leave event: ${error.message}`, 'error');
    } finally {
        isLeaving.value = false;
        actionInProgress.value = false;
    }
};

// Navigates to the rating/selection form
const openRatingForm = (): void => {
  if (!event.value) return;
  router.push({ name: 'SelectionForm', params: { eventId: props.id } });
};

// Maps the full Event object to the props expected by EventDetailsHeader
const mapEventToHeaderProps = (evt: Event): EventHeaderProps => ({
    id: evt.id,
    status: evt.status,
    title: evt.details.eventName || evt.details.type || 'Event', // Fallback title
    closed: !!evt.closedAt, // Convert Timestamp to boolean
    teams: evt.teams,
    participants: evt.participants,
    // Pass only necessary detail fields for the header
    details: {
        eventName: evt.details.eventName,
        type: evt.details.type,
        format: evt.details.format,
        date: { start: evt.details.date.start, end: evt.details.date.end },
        description: evt.details.description, // Header might show truncated description or none
        organizers: evt.details.organizers,
        prize: evt.details.prize,
        rules: evt.details.rules, // Add rules from event details
    }
});

// Handler for when the submission modal is hidden
const modalHiddenHandler = () => {
    // Reset form state when modal closes
    submissionForm.value = { projectName: '', link: '', description: '' };
    submissionError.value = '';
};

// --- Lifecycle Hooks ---
onMounted(() => {
  fetchData();
  // Set up modal event listener
  if (submissionModalRef.value) {
    submissionModalRef.value.addEventListener('hidden.bs.modal', modalHiddenHandler);
  }
});

onBeforeUnmount(() => {
  // Clean up modal event listener and instance
  if (submissionModalRef.value) {
    submissionModalRef.value.removeEventListener('hidden.bs.modal', modalHiddenHandler);
  }
  submissionModalInstance?.dispose();
  submissionModalInstance = null;
});

// Refetch data if the event ID prop changes
watch(() => props.id, (newId, oldId) => {
  if (newId && newId !== oldId) {
    fetchData();
  }
});

// Expose methods if needed by parent (though unlikely here)
defineExpose({ handleJoin, handleLeave });

const isOrganizer = computed(() => {
  if (!event.value || !currentUser.value?.uid) return false;
  const organizerIds = event.value.details?.organizers || [];
  return organizerIds.includes(currentUser.value.uid) || event.value.requestedBy === currentUser.value.uid;
});

</script>

<style scoped>
/* --- Layout & Responsive --- */
.event-details-bg {
  background: linear-gradient(135deg, var(--bs-light) 0%, var(--bs-primary-bg-subtle) 100%); /* Use theme vars */
  min-height: calc(100vh - 56px); /* Adjust based on actual navbar height */
  padding-top: 1rem;
  padding-bottom: 4rem; /* Space for FAB */
}
.event-details-view {
  max-width: 1280px;
  margin-left: auto;
  margin-right: auto;
}
@media (max-width: 991.98px) { .event-details-view { padding-left: 1rem; padding-right: 1rem; } }
@media (max-width: 767.98px) { .sticky-lg-top { position: static; } }

/* --- Floating Action Button --- */
.submit-fab {
  position: sticky; /* Sticky within its column */
  top: 80px; /* Adjust based on navbar height */
  float: right;
  z-index: 10; /* Below navbar/modals */
}
.submit-fab-mobile {
  position: fixed;
  bottom: calc(64px + 1rem); /* Above bottom nav */
  right: 1rem;
  z-index: 1045; /* Above most content, below modals */
  border-radius: 50%;
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  box-shadow: var(--bs-box-shadow-lg); /* Use theme var */
}
/* Hide buttons based on screen size */
@media (min-width: 768px) { .submit-fab-mobile { display: none !important; } }
@media (max-width: 767.98px) { .submit-fab { display: none !important; } }

/* --- Cards & Sections --- */
.section-header {
  display: flex;
  align-items: center;
  font-size: 1.1rem; /* Slightly smaller */
  font-weight: 600;
  gap: 0.6rem;
  color: var(--bs-body-color); /* Use theme var */
  margin-bottom: 1rem;
}
.team-list-box, /* Add specific classes if needed */
.card {
  border-radius: var(--bs-border-radius-lg); /* Use theme var */
  border: 1px solid var(--bs-border-color-translucent); /* Use theme var */
  box-shadow: var(--bs-box-shadow-sm); /* Use theme var */
  overflow: hidden; /* Prevent content overflow */
  background-color: var(--bs-card-bg); /* Use theme var */
}

/* --- Animations & Transitions --- */
.animate-fade-in { animation: fadeIn 0.5s ease-out forwards; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

.fade-pop-enter-active { animation: fadeIn .5s ease; }
.fade-pop-leave-active { animation: fadeOut .3s ease forwards; } /* Add 'forwards' to keep final state */
@keyframes fadeOut { from { opacity: 1; } to { opacity: 0; } }

/* --- Modal Styling --- */
.modal.fade .modal-dialog { transition: transform .3s ease-out; transform: translateY(-25px); }
.modal.show .modal-dialog { transform: none; }
.modal-content { border-radius: var(--bs-border-radius-lg); border: none; }

/* --- Sticky Sidebar --- */
.sticky-lg-top {
    position: sticky;
    top: 80px; /* Match submit-fab sticky top */
    z-index: 5; /* Below header/nav */
}

/* --- General Utility --- */
.alert-sm { /* Ensure alert-sm is defined */
    padding: 0.5rem 0.75rem;
    font-size: 0.875em;
}
</style>