// src/views/EventDetails.vue
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
                :key="`manage-controls-${event.id}-${event.status}-${String(event.votingOpen)}`"
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
                  :votingOpen="event.votingOpen"
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
                :currentUserId="currentUserId"
                class="mb-4"
              />
            </div>
          </div>

          <!-- Sidebar Column: Submissions & Voting -->
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
              <!-- Voting Section -->
              <EventVotingTrigger
                :event="event"
                :currentUser="currentUser"
                :isCurrentUserParticipant="localIsCurrentUserParticipant"
                :canRateOrganizer="canRateOrganizer"
                :loading="loading"
                :isCurrentUserOrganizer="localIsCurrentUserOrganizer"
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
                    <p class="small text-secondary fst-italic">Voting available once event is completed.</p>
                 </template>
                 <template v-else-if="!canVoteInThisEvent">
                    <p class="small text-secondary fst-italic">You are not eligible to vote in this event or voting is not open.</p>
                 </template>
                 <template v-else-if="hasUserVoted">
                     <p class="alert alert-success alert-sm py-2 d-flex align-items-center mb-2">
                         <i class="fas fa-check-circle me-2"></i> You have submitted your vote.
                     </p>
                     <button v-if="canEditSubmission" @click="openVotingForm" class="btn btn-sm btn-outline-secondary d-inline-flex align-items-center">
                         <i class="fas fa-edit me-1"></i> Edit Vote
                     </button>
                 </template>
                 <template v-else>
                    <button @click="openVotingForm" class="btn btn-sm btn-primary d-inline-flex align-items-center mt-2">
                      <i class="fas fa-vote-yea me-1"></i> Vote Now
                    </button>
                 </template>
              </EventVotingTrigger>

              <!-- Organizer Rating Form -->
              <OrganizerRatingForm
                v-if="canRateOrganizer"
                :event-id="event.id"
                :current-user-id="currentUser?.uid ?? ''"
                :existing-ratings="event.organizerRatings || []"
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
import { useStudentProfileStore } from '@/stores/studentProfileStore';
import { useStudentEventStore } from '@/stores/studentEventStore';
import { useStudentNotificationStore } from '@/stores/studentNotificationStore';

// Component Imports
import EventCriteriaDisplay from '@/components/events/EventCriteriaDisplay.vue';
import EventParticipantList from '@/components/events/EventParticipantList.vue';
import EventSubmissionsSection from '@/components/events/EventSubmissionsSection.vue';
import EventVotingTrigger from '@/components/events/EventVotingTrigger.vue';
import OrganizerRatingForm from '@/components/events/OrganizerRatingForm.vue';
import TeamList from '@/components/events/TeamList.vue';
import EventManageControls from '@/components/events/EventManageControls.vue';
import EventDetailsSkeleton from '@/skeletons/EventDetailsSkeleton.vue';
import SkeletonProvider from '@/skeletons/SkeletonProvider.vue';
import EventDetailsHeader from '@/components/events/EventDetailsHeader.vue';

// Type Imports
import { EventStatus, type Event, type Team, type Submission, EventFormat, type EventCriterion } from '@/types/event';
import { type EnrichedStudentData } from '@/types/student'; // Import EnrichedStudentData

// Import utility functions
import { hasUserSubmittedVotes } from '@/utils/eventDataUtils';
import {
  isEventOrganizer,
  isEventParticipant,
  canUserSubmitToEvent,
  canUserVoteInEvent
} from '@/utils/permissionHelpers';

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
interface BootstrapModal {
  show(): void;
  hide(): void;
  dispose(): void;
  handleUpdate(): void;
}
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
    rules?: string;
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
const userStore = useStudentProfileStore();
const eventStore = useStudentEventStore();
const notificationStore = useStudentNotificationStore();
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
let submissionModalInstance: BootstrapModal | null = null;

const submissionForm = ref<SubmissionFormData>({ projectName: '', link: '', description: '' });
const submissionError = ref<string>('');
const isSubmittingProject = ref<boolean>(false);
const actionInProgress = ref<boolean>(false);
const isJoining = ref(false);
const isLeaving = ref(false);
const globalFeedback = ref<FeedbackState>({ message: '', type: 'success' });

// --- Computed Properties ---
const currentUserId = computed<string | null>(() => userStore.studentId); // Corrected to use studentId getter
const currentUser = computed<EnrichedStudentData | null>(() => userStore.currentStudent); // Uses EnrichedStudentData

const nameCacheRecord = computed(() => Object.fromEntries(nameCache.value));
const isTeamEvent = computed<boolean>(() => event.value?.details.format === EventFormat.Team);

const localIsCurrentUserOrganizer = computed<boolean>(() =>
  event.value && currentUser.value ? isEventOrganizer(event.value, currentUser.value.uid) : false
);

const localIsCurrentUserParticipant = computed<boolean>(() =>
  event.value && currentUser.value ? isEventParticipant(event.value, currentUser.value.uid) : false
);

const allAssociatedUserIds = computed<string[]>(() => {
    if (!event.value) return [];
    const userIds = new Set<string>();
    if (event.value.requestedBy) userIds.add(event.value.requestedBy);
    (event.value.details.organizers || []).forEach(id => { if (id) userIds.add(id); });
    if (isTeamEvent.value) {
        (event.value.teams || []).forEach(team => { (team.members || []).forEach(id => { if (id) userIds.add(id); }); });
    } else {
        (event.value.participants || []).forEach(id => { if (id) userIds.add(id); });
    }
    (event.value.submissions || []).forEach(sub => { if (sub.submittedBy) userIds.add(sub.submittedBy); });
    (event.value.organizerRatings || []).forEach(rating => { if (rating.userId) userIds.add(rating.userId); }); // Corrected to organizerRatings

    return Array.from(userIds).filter(Boolean);
});

const canJoin = computed(() => {
  if (!event.value || !currentUser.value || event.value.closedAt) return false;
  if (localIsCurrentUserOrganizer.value || localIsCurrentUserParticipant.value) return false;
  return [EventStatus.Approved, EventStatus.InProgress].includes(event.value.status as EventStatus);
});

const canLeave = computed(() => {
  if (!event.value || !currentUser.value || event.value.closedAt) return false;
  if (localIsCurrentUserOrganizer.value) return false;
  return localIsCurrentUserParticipant.value && [EventStatus.Approved, EventStatus.InProgress].includes(event.value.status as EventStatus);
});

const canSubmitProject = computed(() =>
  event.value && currentUser.value ? canUserSubmitToEvent(event.value, currentUser.value) : false
);

const hasUserVoted = computed(() => {
  return hasUserSubmittedVotes(event.value, currentUser.value?.uid || null);
});

const canEditSubmission = computed(() => {
    return hasUserVoted.value && event.value?.votingOpen === true;
});

const canRateOrganizer = computed(() => {
  if (!event.value || !currentUser.value || event.value.closedAt) return false;
  return localIsCurrentUserParticipant.value &&
         !localIsCurrentUserOrganizer.value &&
         (event.value.status === EventStatus.Completed || event.value.status === EventStatus.Closed) ; // Allow rating for closed events too
});

const canVoteInThisEvent = computed(() =>
  event.value && currentUser.value ? canUserVoteInEvent(event.value, currentUser.value) : false
);

// --- Methods ---
function setGlobalFeedback(message: string, type: 'success' | 'error' = 'success', duration: number = 4000): void {
  globalFeedback.value = { message, type };
  if (duration > 0) {
    setTimeout(clearGlobalFeedback, duration);
  }
}
function clearGlobalFeedback(): void {
  globalFeedback.value = { message: '', type: 'success' };
}

const getUserNameFromCache = (userId: string): string => {
  return nameCache.value.get(userId) || `User (${userId.substring(0, 5)}...)`;
};

async function fetchUserNames(userIds: string[]): Promise<void> {
    if (!Array.isArray(userIds) || userIds.length === 0) return;
    const uniqueIdsToFetch = [...new Set(userIds)].filter(id => id && !nameCache.value.has(id));
    if (uniqueIdsToFetch.length === 0) return;

    organizerNamesLoading.value = true;
    try {
        const names: Record<string, string> = await userStore.fetchUserNamesBatch(uniqueIdsToFetch);
        uniqueIdsToFetch.forEach(id => {
            nameCache.value.set(id, names[id] || `User (${id.substring(0, 5)}...)`);
        });
    } catch (error: any) {
        console.error("Error fetching user names:", error);
        uniqueIdsToFetch.forEach(id => {
            if (!nameCache.value.has(id)) nameCache.value.set(id, `Error Loading Name`);
        });
    } finally {
        organizerNamesLoading.value = false;
    }
}

async function fetchData(): Promise<void> {
  loading.value = true;
  initialFetchError.value = '';
  event.value = null;
  teams.value = [];

  try {
    if (props.id) {
      // Corrected action name
      await eventStore.fetchEventDetails(props.id); 
    }
    const storeEvent = eventStore.viewedEventDetails as Event | null; // Use viewedEventDetails

    if (!storeEvent || storeEvent.id !== props.id) {
      throw new Error('Event not found or you do not have permission to view it.');
    }

    event.value = { ...storeEvent };
    teams.value = (isTeamEvent.value && Array.isArray(storeEvent.teams)) ? [...storeEvent.teams] : [];

    await fetchUserNames(allAssociatedUserIds.value);

  } catch (error: any) {
    console.error('Failed to load event details:', error);
    initialFetchError.value = error.message || 'Failed to load event data. Please try again.';
    event.value = null;
    teams.value = [];
  } finally {
    loading.value = false;
  }
}

const getOrCreateModalInstance = (): BootstrapModal | null => {
    if (!submissionModalRef.value || !window.bootstrap?.Modal) return null;
    if (!submissionModalInstance) {
        submissionModalInstance = new window.bootstrap.Modal(submissionModalRef.value);
    }
    return submissionModalInstance;
};

const triggerSubmitModalOpen = (): void => {
  submissionForm.value = { projectName: '', link: '', description: '' };
  submissionError.value = '';
  getOrCreateModalInstance()?.show();
};

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
    try { new URL(submissionForm.value.link); } catch (_) {
        submissionError.value = 'Please enter a valid URL (e.g., https://github.com/...).'; return;
    }

    submissionError.value = '';
    isSubmittingProject.value = true;
    actionInProgress.value = true;

    try {
        await eventStore.submitProject({ // Corrected action name
            eventId: props.id,
            submissionData: {
                projectName: submissionForm.value.projectName.trim(),
                link: submissionForm.value.link.trim(),
                description: submissionForm.value.description.trim() || undefined, // Send undefined if empty
            }
        });
        setGlobalFeedback('Project submitted successfully!', 'success');
        getOrCreateModalInstance()?.hide();
        await fetchData();
    } catch (error: any) {
        console.error("Project submission error:", error);
        submissionError.value = error.message || 'Failed to submit project.';
    } finally {
        isSubmittingProject.value = false;
        actionInProgress.value = false;
    }
};

const handleJoin = async (): Promise<void> => {
    if (!event.value || !currentUserId.value || isJoining.value || actionInProgress.value) return;
    isJoining.value = true;
    actionInProgress.value = true;
    try {
        await eventStore.joinEvent(props.id);
        setGlobalFeedback('Successfully joined the event!', 'success');
        await fetchData();
    } catch (error: any) {
        setGlobalFeedback(`Failed to join event: ${error.message}`, 'error');
    } finally {
        isJoining.value = false;
        actionInProgress.value = false;
    }
};

const handleLeave = async (): Promise<void> => {
    if (!event.value || !currentUserId.value || isLeaving.value || actionInProgress.value) return;
    if (!window.confirm('Are you sure you want to leave this event?')) return;

    isLeaving.value = true;
    actionInProgress.value = true;
    try {
        await eventStore.leaveEvent(props.id);
        setGlobalFeedback('Successfully left the event.', 'success');
        await fetchData();
    } catch (error: any) {
        setGlobalFeedback(`Failed to leave event: ${error.message}`, 'error');
    } finally {
        isLeaving.value = false;
        actionInProgress.value = false;
    }
};

const openVotingForm = (): void => {
  if (!event.value) return;
  router.push({ name: 'SelectionForm', params: { eventId: props.id } });
};

const mapEventToHeaderProps = (evt: Event): EventHeaderProps => ({
    id: evt.id,
    status: evt.status,
    title: evt.details.eventName || evt.details.type || 'Event',
    closed: !!evt.closedAt,
    teams: evt.teams,
    participants: evt.participants,
    details: {
        eventName: evt.details.eventName,
        type: evt.details.type,
        format: evt.details.format,
        date: { start: evt.details.date.start, end: evt.details.date.end },
        description: evt.details.description,
        organizers: evt.details.organizers,
        prize: evt.details.prize,
        rules: evt.details.rules,
    }
});

const modalHiddenHandler = () => {
    submissionForm.value = { projectName: '', link: '', description: '' };
    submissionError.value = '';
};

// --- Lifecycle Hooks ---
onMounted(() => {
  fetchData();
  if (submissionModalRef.value) {
    submissionModalRef.value.addEventListener('hidden.bs.modal', modalHiddenHandler);
  }
});

onBeforeUnmount(() => {
  if (submissionModalRef.value) {
    submissionModalRef.value.removeEventListener('hidden.bs.modal', modalHiddenHandler);
  }
  submissionModalInstance?.dispose();
  submissionModalInstance = null;
});

watch(() => props.id, (newId, oldId) => {
  if (newId && newId !== oldId) {
    fetchData();
  }
});

defineExpose({ handleJoin, handleLeave });

</script>

<style scoped>
.event-details-bg {
  background: linear-gradient(135deg, var(--bs-light) 0%, var(--bs-primary-bg-subtle) 100%);
  min-height: calc(100vh - 56px);
  padding-top: 1rem;
  padding-bottom: 4rem;
}
.event-details-view { max-width: 1280px; margin-left: auto; margin-right: auto; }
@media (max-width: 991.98px) { .event-details-view { padding-left: 1rem; padding-right: 1rem; } }
@media (max-width: 767.98px) { .sticky-lg-top { position: static; } }
.submit-fab { position: sticky; top: 80px; float: right; z-index: 10; }
.submit-fab-mobile {
  position: fixed;
  bottom: calc(64px + 1rem);
  right: 1rem;
  z-index: 1045;
  border-radius: 50%;
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  box-shadow: var(--bs-box-shadow-lg);
}
@media (min-width: 768px) { .submit-fab-mobile { display: none !important; } }
@media (max-width: 767.98px) { .submit-fab { display: none !important; } }
.section-header { display: flex; align-items: center; font-size: 1.1rem; font-weight: 600; gap: 0.6rem; color: var(--bs-body-color); margin-bottom: 1rem; }
.team-list-box, .card { border-radius: var(--bs-border-radius-lg); border: 1px solid var(--bs-border-color-translucent); box-shadow: var(--bs-box-shadow-sm); overflow: hidden; background-color: var(--bs-card-bg); }
.animate-fade-in { animation: fadeIn 0.5s ease-out forwards; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
.fade-pop-enter-active { animation: fadeIn .5s ease; }
.fade-pop-leave-active { animation: fadeOut .3s ease forwards; }
@keyframes fadeOut { from { opacity: 1; } to { opacity: 0; } }
.modal.fade .modal-dialog { transition: transform .3s ease-out; transform: translateY(-25px); }
.modal.show .modal-dialog { transform: none; }
.modal-content { border-radius: var(--bs-border-radius-lg); border: none; }
.sticky-lg-top { position: sticky; top: 80px; z-index: 5; }
.alert-sm { padding: 0.5rem 0.75rem; font-size: 0.875em; }
</style>