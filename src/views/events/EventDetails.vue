<template>
  <div class="event-details-view container-fluid px-0 px-md-2 event-details-bg">
    <SkeletonProvider
      :loading="loading"
      :skeleton-component="EventDetailsSkeleton"
    >
      <!-- Event Header -->
      <EventDetailsHeader
        v-if="event"
        :event="mapEventToHeaderProps(event)"
        :canJoin="canJoin"
        :canLeave="canLeave"
        :canEdit="canEdit"
        :isJoining="isJoining"
        :isLeaving="isLeaving"
        :name-cache="nameCache"
        @join="handleJoin"
        @leave="handleLeave"
        class="animate-fade-in"
      />

      <!-- Floating Action Button for Submission (visible if eligible) -->
      <div class="d-none d-md-flex flex-column align-items-end" v-if="event?.details.allowProjectSubmission !== false">
        <button
          v-if="event && canSubmitProject"
          class="btn btn-lg btn-primary shadow submit-fab"
          @click="triggerSubmitModalOpen"
          title="Submit Project"
        >
          <i class="fas fa-upload me-2"></i> Submit Project
        </button>
      </div>

      <!-- Mobile FAB for Submission -->
      <button
        v-if="event && canSubmitProject && event.details.allowProjectSubmission !== false"
        class="btn btn-primary shadow submit-fab-mobile d-md-none"
        @click="triggerSubmitModalOpen"
        title="Submit Project"
      >
        <i class="fas fa-upload"></i>
      </button>

      <div class="row g-4 mt-0">
        <!-- Main Content -->
        <div class="col-12 col-lg-8">
          <!-- Event Management Controls -->
          <div class="mb-4">
            <!-- Always render EventManageControls when event is loaded -->
            <template v-if="event">
              <EventManageControls
                :event="event"
                class="mb-0 animate-fade-in"
                v-on:hook:mounted="logEventManageControls"
                @update="fetchEventData"
              />
            </template>
          </div>

          <!-- XP/Criteria Section -->
          <EventCriteriaDisplay v-if="event?.criteria?.length" :criteria="event.criteria" />

          <!-- Feedback Message -->
          <transition name="fade-pop">
            <div v-if="globalFeedback.message"
              class="alert alert-sm mt-auto mb-0 transition-opacity duration-300 d-flex align-items-center animate-fade-in"
              :class="globalFeedback.type === 'success' ? 'alert-success' : 'alert-danger'"
              role="alert"
            >
              <i class="fas me-2" :class="globalFeedback.type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'"></i>
              <div>{{ globalFeedback.message }}</div>
            </div>
          </transition>

          <!-- Teams/Participants -->
          <div class="mt-4">
            <!-- Team List Section -->
            <div v-if="event && event.details.format === 'Team'" class="mb-4">
              <div class="section-header mb-3">
                <i class="fas fa-users text-primary me-2"></i>
                <span class="h5 mb-0 text-primary">Teams</span>
              </div>
              <TeamList
                :teams="teams"
                :event-id="props.id"
                :event-status="event.status"
                :user-role="currentUserRole ?? 'Unknown'" 
                :user-id="currentUserId ?? ''" 
                :ratingsOpen="false"
                :getUserName="getUserNameFromCache"
                @teamRated="handleTeamRated"
                :organizerNamesLoading="organizerNamesLoading"
                :currentUserUid="currentUserId"
                class="card team-list-box p-0 shadow-sm animate-fade-in" />
            </div>
            <!-- Participants Section (Non-Team Events) -->
            <EventParticipantList
              v-if="event && event.details.format !== 'Team'"
              :participants="event.participants ?? []"
              :loading="loading"
              :getUserName="getUserNameFromCache"
              :currentUserId="currentUserId"
            />
            <p v-else-if="participantCount === 0" class="text-secondary fst-italic py-3">
              No participants have joined this event yet.
            </p>
            <div v-else>
              <div class="row g-2">
                <div v-for="userId in allParticipants" :key="userId" class="col-12 col-md-6">
                  <div
                    class="participant-item d-flex align-items-center p-2 border rounded"
                    :class="{ 'bg-primary-subtle': userId === currentUserId }"
                  >
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <!-- Sidebar: Submissions & Ratings -->
        <div class="col-12 col-lg-4">
          <div class="sticky-lg-top" style="top: 2rem;">
            <!-- Submission Section -->
            <EventSubmissionsSection
              v-if="event && event.details.allowProjectSubmission !== false"
              :event="event"
              :teams="teams"
              :loading="loading"
              :getUserName="getUserNameFromCache"
              :canSubmitProject="canSubmitProject"
              @open-submission-modal="triggerSubmitModalOpen"
            />
            <!-- Rating Section -->
            <EventRatingTrigger
              v-if="event"
              :event="event"
              :currentUser="currentUser"
              :isCurrentUserParticipant="isCurrentUserParticipant"
              :canRateOrganizer="canRateOrganizer"
              :loading="loading"
            >
              <template v-if="loading">
                <div class="d-flex align-items-center gap-2">
                  <div class="spinner-border spinner-border-sm" role="status">
                    <span class="visually-hidden">Loading...</span>
                  </div>
                  <span class="small text-secondary">Loading eligibility...</span>
                </div>
              </template>
              <template v-else-if="!currentUser">
                <p class="small text-secondary fst-italic">
                  Please log in to select winners.
                </p>
              </template>
              <template v-else-if="!event">
                <p class="small text-secondary fst-italic">
                  Event data not available.
                </p>
              </template>
              <template v-else-if="event.status !== EventStatus.Completed">
                <p class="small text-secondary fst-italic">
                  Winner selection will be available once the event is completed.
                </p>
              </template>
              <template v-else-if="event.ratingsOpen !== true">
                <p class="small text-secondary fst-italic">
                  Winner selection is currently closed for this event.
                </p>
              </template>
              <template v-else-if="!isCurrentUserParticipant">
                <p class="small text-secondary fst-italic">
                  You must be a participant in this event to select winners.
                </p>
              </template>
              <template v-else>
                <p class="small text-secondary fst-italic">
                  Ratings are open! You can now select winners.
                </p>
                <router-link
                  :to="{ name: 'SelectionForm', params: { eventId: event.id } }"
                  class="btn btn-sm btn-primary d-inline-flex align-items-center mt-3"
                >
                  <i class="fas fa-trophy me-1"></i>
                  <span>Select Winner</span>
                </router-link>
              </template>
            </EventRatingTrigger>
            <!-- Organizer Rating Form: Only for eligible participants (not organizers) --> 
            <OrganizerRatingForm
              v-if="canRateOrganizer && event"
              :event-id="event.id"
              :current-user-id="currentUser?.uid ?? ''"
              :existing-ratings="event.ratings?.organizer || []"
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
        <div class="modal-dialog">
          <div class="modal-content rounded-4 shadow-lg animate-fade-in">
            <div class="modal-header border-0 pb-0">
              <h5 class="modal-title h5" id="submissionModalLabel"><i class="fas fa-upload me-2 text-primary"></i>Submit Your Project</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close" @click="closeSubmissionModal"></button>
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
                <div v-if="submissionError" class="form-text text-danger d-flex align-items-center"><i class="fas fa-exclamation-circle me-1"></i> {{ submissionError }}</div>
              </form>
            </div>
            <div class="modal-footer border-0 pt-0">
              <button type="button" @click="closeSubmissionModal" class="btn btn-sm btn-secondary" data-bs-dismiss="modal">
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
    </SkeletonProvider>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue';
import { useStore } from 'vuex';
import EventCriteriaDisplay from '@/components/events/EventCriteriaDisplay.vue';
import EventParticipantList from '@/components/events/EventParticipantList.vue';
import EventSubmissionsSection from '@/components/events/EventSubmissionsSection.vue';
import EventRatingTrigger from '@/components/events/EventRatingTrigger.vue';
import OrganizerRatingForm from '@/components/events/OrganizerRatingForm.vue';
import { useRouter, useRoute } from 'vue-router';
import TeamList from '@/components/TeamList.vue';
import EventManageControls from '@/components/events/EventManageControls.vue';
import EventDetailsSkeleton from '@/components/skeletons/EventDetailsSkeleton.vue';
import SkeletonProvider from '@/components/skeletons/SkeletonProvider.vue';
import EventDetailsHeader from '@/components/events/EventDetailsHeader.vue';
import { EventStatus, type Event, Team as EventTeamType, Submission, EventFormat } from '@/types/event';
import { User } from '@/types/user';
import { formatRoleName } from '@/utils/formatters';
import { getEventStatusBadgeClass } from '@/utils/eventUtils';
import { formatISTDate } from '@/utils/dateTime';

interface EventDetails extends Event {}

interface Team extends EventTeamType {}


interface Collapse {
  toggle(): void;
  hide(): void;
  show(): void;
  dispose(): void;
}


interface BootstrapModal {
  show(): void;
  hide(): void;
  dispose(): void;
  handleUpdate(): void;
}

declare global {
  interface Window {
    bootstrap?: {
      Modal?: any;
      Collapse?: {
        new(element: Element | string, options?: any): Collapse;
        getInstance(element: Element | string): Collapse | null;
      };
    };
  }
}

interface Props {
  id: string;
}
const props = defineProps<Props>();

const store = useStore();
const router = useRouter();
const route = useRoute();

const loading = ref<boolean>(true);
const event = ref<Event | null>(null);
const teams = ref<Team[]>([]);
const initialFetchError = ref<string>('');
const nameCache = ref<Map<string, string>>(new Map());
const organizerNamesLoading = ref<boolean>(false);
const submissionModalRef = ref<HTMLElement | null>(null);
const showParticipants = ref<boolean>(false);
interface SubmissionFormData {
	projectName: string;
	link: string;
	description: string;
}
const submissionForm = ref<SubmissionFormData>({ projectName: '', link: '', description: '' });
const submissionError = ref<string>('');
const isSubmittingProject = ref<boolean>(false);
const actionInProgress = ref<boolean>(false);
interface FeedbackState {
	message: string;
	type: 'success' | 'error';
}
const globalFeedback = ref<FeedbackState>({ message: '', type: 'success' });

const currentUserId = computed<string | null>(() => store.getters['user/userId'] ?? null);
const currentUserRole = computed<string | null>(() => store.getters['user/userRole'] ?? null);
const isAdmin = computed<boolean>(() => currentUserRole.value === 'Admin');
const currentUser = computed<User | null>(() => store.getters['user/getUser'] ?? null);

const isCurrentUserOrganizer = computed<boolean>(() => {
    if (!event.value || !currentUserId.value) return false;
    const isOrganizer = (event.value.details.organizers || []).includes(currentUserId.value ?? '');
    const isRequester = event.value.requestedBy === (currentUserId.value ?? '');
    return isOrganizer || isRequester;
});

const canManageEvent = computed<boolean>(() => {
    return isAdmin.value || isCurrentUserOrganizer.value;
});

const currentUserCanRate = computed<boolean>(() => {
  if (!event.value || !currentUserId.value || event.value.status !== EventStatus.Completed) {
    return false;
  }
  const uid = ensureUserId(currentUserId.value);
  // Remove the check that blocks organizers who are also participants
  let isParticipant = false;
  if (event.value.details.format === EventFormat.Team && Array.isArray(event.value.teams)) {
      isParticipant = event.value.teams.some(team => team.members?.includes(uid));
  } else if (Array.isArray(event.value.participants)) {
      isParticipant = event.value.participants.includes(uid);
  }
  // Only allow participants to rate
  return isParticipant;
});

const canSubmitProject = computed(() => {
  if (!event.value || !currentUserId.value) return false;
  if (event.value.status !== EventStatus.InProgress) return false;
  const uid = ensureUserId(currentUserId.value);
  if (event.value.details.organizers?.includes(uid)) return false;
  
  if (event.value.details.format === EventFormat.Team) {
    const userTeam = event.value.teams?.find(team => team.members?.includes(uid));
    return userTeam?.teamLead === uid;
  } else {
    return event.value.participants?.includes(uid) ?? false;
  }
});

const canEditTeam = computed(() => {
  if (!event.value || !currentUserId.value) return false;
  if (event.value.status !== EventStatus.Pending && event.value.status !== EventStatus.Approved) return false;
  if (event.value.details.format !== EventFormat.Team) return false;

  const uid = ensureUserId(currentUserId.value);
  const userTeam = event.value.teams?.find(team => team.members?.includes(uid));
  return userTeam?.teamLead === uid;
});

const canJoin = computed(() => {
  if (!event.value || !currentUserId.value) return false;
  if (![EventStatus.Approved, EventStatus.InProgress].includes(event.value.status as EventStatus)) return false;
  if (event.value.details.organizers?.includes(currentUserId.value ?? '')) return false;
  if (event.value.details.format === EventFormat.Team) {
    return event.value.teams?.some(team => !team.members?.includes(currentUserId.value ?? '')) ?? true;
  } else {
    return !(event.value.participants?.includes(currentUserId.value ?? ''));
  }
});

const ensureUserId = (userId: string | null): string => {
  if (!userId) throw new Error('User ID is required');
  return userId;
};

const canLeave = computed(() => {
  if (!event.value || !currentUserId.value) return false;
  if ([EventStatus.Completed, EventStatus.Cancelled].includes(event.value.status as EventStatus)) return false;
  const uid = ensureUserId(currentUserId.value);
  if (event.value.details.organizers?.includes(uid ?? '')) return false;
  if (event.value.details.format === EventFormat.Team) {
    return event.value.teams?.some(team => team.members?.includes(uid ?? '')) ?? false;
  } else {
    return event.value.participants?.includes(uid ?? '') ?? false;
  }
});

const canEdit = computed(() => {
  if (!event.value || !currentUserId.value) return false;
  if ([EventStatus.Completed, EventStatus.Cancelled].includes(event.value.status as EventStatus)) return false;
  return isAdmin.value || isCurrentUserOrganizer.value;
});

const isJoining = ref(false);
const isLeaving = ref(false);

const allParticipants = computed<string[]>(() => {
    if (!event.value) return [];

    const userIds = new Set<string>();

    if (event.value.requestedBy) userIds.add(event.value.requestedBy);
    if (Array.isArray(event.value.details.organizers)) {
        event.value.details.organizers.forEach(id => { if (id) userIds.add(id); });
    }

    if (event.value.details.format === EventFormat.Team && Array.isArray(event.value.teams)) {
        event.value.teams.forEach(team => {
            if (Array.isArray(team.members)) {
                team.members.forEach(id => { if (id) userIds.add(id); });
            }
        });
    } else if (Array.isArray(event.value.participants)) {
        event.value.participants.forEach(id => { if (id) userIds.add(id); });
    } else if (typeof event.value.participants === 'object' && event.value !== null) {
        Object.keys(event.value.participants).forEach(id => { if (id) userIds.add(id); });
    }

    return Array.from(userIds);
});

const participantCount = computed<number>(() => allParticipants.value.length);

function setGlobalFeedback(message: string, type: 'success' | 'error' = 'success', duration: number = 4000): void {
    globalFeedback.value = { message, type };
    if (duration > 0) {
        setTimeout(clearGlobalFeedback, duration);
    }
}

function clearGlobalFeedback(): void {
    globalFeedback.value = { message: '', type: 'success' };
}


const safeString = (value: string | null | undefined): string => value || '';


const getUserNameFromCache = (userId: string): string => {
    return nameCache.value.get(userId) || 'Member';
};

async function fetchUserNames(userIds: string[]): Promise<void> {
    if (!Array.isArray(userIds) || userIds.length === 0) return;

    const uniqueIdsToFetch = [...new Set(userIds)].filter(id => id && !nameCache.value.has(id));

    if (uniqueIdsToFetch.length === 0) return;

    organizerNamesLoading.value = true;
    try {
        const names: Record<string, string | null> = await store.dispatch('user/fetchUserNamesBatch', uniqueIdsToFetch);
        uniqueIdsToFetch.forEach(id => {
            nameCache.value.set(id, safeString(names[id]) || `User (${id.substring(0, 5)}...)`);
        });
    } catch (error: any) {

        uniqueIdsToFetch.forEach(id => {
            if (!nameCache.value.has(id)) {
                nameCache.value.set(id, `Error (${id.substring(0, 5)}...)`);
            }
        });
    } finally {
        organizerNamesLoading.value = false;
    }
}

async function fetchEventData(): Promise<void> {
  loading.value = true;
  initialFetchError.value = '';
  event.value = null;
  teams.value = [];

  try {
    await store.dispatch('events/fetchEventDetails', props.id);
    const storeEvent = store.state.events.currentEventDetails as EventDetails | null;

    if (!storeEvent || storeEvent.id !== props.id) {
      throw new Error('Event not found or inaccessible.');
    }

    event.value = storeEvent;
    teams.value = (storeEvent.details.format === EventFormat.Team && Array.isArray(storeEvent.teams))
                  ? [...storeEvent.teams]
                  : [];

    await fetchUserNames(allParticipants.value.filter(id => typeof id === 'string' && id !== null));

  } catch (error: any) {

    initialFetchError.value = error.message || 'Failed to load event data';
    event.value = null;
    teams.value = [];
  } finally {
    loading.value = false;
  }
}

const getModalInstance = (): BootstrapModal | null => {
    if (!submissionModalRef.value || !window.bootstrap?.Modal) return null;
    return window.bootstrap.Modal.getInstance(submissionModalRef.value);
};

const getOrCreateModalInstance = (): BootstrapModal | null => {
    if (!submissionModalRef.value || !window.bootstrap?.Modal) return null;
    return window.bootstrap.Modal.getOrCreateInstance(submissionModalRef.value);
}

const triggerSubmitModalOpen = (): void => {
    submissionForm.value = { projectName: '', link: '', description: '' };
    submissionError.value = '';
    const modal = getOrCreateModalInstance();
    modal?.show();
};

const closeSubmissionModal = (): void => {
    const modal = getModalInstance();
    modal?.hide();
};

const submitProject = async (): Promise<void> => {
    if (!submissionForm.value.projectName || !submissionForm.value.link) {
        submissionError.value = 'Project Name and Link are required.';
        return;
    }
    const currentUid = currentUserId.value;
    if (!currentUid) {
        submissionError.value = 'You must be logged in to submit.';
        return;
    }
    if (!event.value) {
         submissionError.value = 'Event data not loaded.';
         return;
    }

    submissionError.value = '';
    isSubmittingProject.value = true;
    actionInProgress.value = true;

    try {
        const submissionData = {
            eventId: props.id,
            userId: currentUid,
            projectName: submissionForm.value.projectName,
            link: submissionForm.value.link,
            description: submissionForm.value.description,
        };

        await store.dispatch('submissions/addSubmission', submissionData);

        setGlobalFeedback('Project submitted successfully!', 'success');
        closeSubmissionModal();

    } catch (error: any) {

        submissionError.value = error.message || 'Failed to submit project.';
    } finally {
        isSubmittingProject.value = false;
        actionInProgress.value = false;
    }
};

const handleJoin = (): void => {

    isJoining.value = true;

    setTimeout(() => {
        isJoining.value = false;
        setGlobalFeedback('Successfully joined the event!', 'success');
    }, 1000);
};

const handleLeave = (): void => {

    isLeaving.value = true;

    setTimeout(() => {
        isLeaving.value = false;
        setGlobalFeedback('Successfully left the event!', 'success');
    }, 1000);
};

const handleTeamRated = (feedback: { message: string; type: 'success' | 'error' }): void => {
    setGlobalFeedback(feedback.message, feedback.type);
};

const openRatingForm = (): void => {
    if (currentUserCanRate.value && event.value) {
        router.push({ name: 'RatingForm', params: { eventId: String(props.id) } });
    } else {
        setGlobalFeedback('You are not eligible to rate/select winners for this event, or the period is closed.', 'error');
    }
};


const isNonNullString = (value: string | null): value is string => value !== null;


const mapEventToHeaderProps = (event: Event) => ({
  ...event,
  title: event.details.eventName || event.details.type || '',
  description: event.details.description || '',
  details: {
    ...event.details
  }
});


const getTeamKey = (team: Team): string => {
  return team.id || team.teamName;
};


const filterUserIds = (ids: (string | null)[]): string[] => {
  return ids.filter(isNonNullString);
};

const hasTeamSubmissions = (team: Team): boolean => {
  return Array.isArray(team.submissions) && team.submissions.length > 0;
};

let fetchTimeoutId: number | undefined;

const modalHiddenHandler = () => {
    submissionForm.value = { projectName: '', link: '', description: '' };
    submissionError.value = '';
};

function logEventManageControls() {









}

watch([canManageEvent, event], ([canManage, evt]) => {


});


watch([canManageEvent, event], ([canManage, evt]) => {






















});

onMounted(() => {
    fetchEventData();

    if (submissionModalRef.value) {
        submissionModalRef.value.addEventListener('hidden.bs.modal', modalHiddenHandler);
    }
});

onBeforeUnmount(() => {
    if (fetchTimeoutId) {
        clearTimeout(fetchTimeoutId);
    }
    const modalInstance = getModalInstance();
    modalInstance?.dispose();
});

watch(() => props.id, (newId, oldId) => {
    if (newId && newId !== oldId) {
        fetchEventData();
    }
}, { immediate: false });

const isCurrentUserParticipant = computed(() => {
  if (!event.value || !currentUser.value?.uid) {
    console.log('Early return - missing data:', {
      hasEvent: !!event.value,
      userId: currentUser.value?.uid
    });
    return false;
  }

  const uid = currentUser.value.uid; // Use directly from currentUser
  let isParticipant = false;

  // Check if user is organizer first
  if (event.value.details.organizers?.includes(uid) || event.value.requestedBy === uid) {
    console.log('User is organizer');
    isParticipant = true;
  } 
  // Then check regular participant status
  else if (event.value.details.format === EventFormat.Team && Array.isArray(event.value.teams)) {
    isParticipant = event.value.teams.some(team => 
      Array.isArray(team.members) && team.members.includes(uid)
    );
    console.log('Team format check:', { isParticipant, teams: event.value.teams });
  } else if (Array.isArray(event.value.participants)) {
    isParticipant = event.value.participants.includes(uid);
    console.log('Individual format check:', { isParticipant, participants: event.value.participants });
  }

  console.log('Final participant status:', { 
    uid, 
    isParticipant, 
    format: event.value.details.format,
    hasTeams: Array.isArray(event.value.teams),
    hasParticipants: Array.isArray(event.value.participants)
  });

  return isParticipant;
});

// Update watcher to use currentUser instead of currentUserId
watch([currentUser, event], ([user, evt], [oldUser, oldEvt]) => {
  console.log('Auth/Event State Update:', {
    user: user?.uid,
    oldUser: oldUser?.uid,
    eventId: evt?.id,
    oldEventId: oldEvt?.id,
    format: evt?.details?.format,
    isParticipant: isCurrentUserParticipant.value,
    hasTeams: evt?.teams?.length,
    hasParticipants: evt?.participants?.length
  });
}, { immediate: true });

const getWinnersPerCriterion = computed(() => {
  if (!event.value?.criteria) return {};
  const winners: Record<string, string[]> = {};
  
  // Handle best performer selections separately
  if (event.value.bestPerformerSelections && event.value.details.format === 'Team') {
    const bestPerformerVotes: Record<string, number> = {};
    Object.values(event.value.bestPerformerSelections).forEach(selectedId => {
      if (selectedId) {
        bestPerformerVotes[selectedId] = (bestPerformerVotes[selectedId] || 0) + 1;
      }
    });
    // Find participant(s) with most votes
    const maxVotes = Math.max(0, ...Object.values(bestPerformerVotes));
    const bestPerformers = Object.entries(bestPerformerVotes)
      .filter(([_, count]) => count === maxVotes && maxVotes > 0)
      .map(([participantId]) => participantId);
    
    winners['Best Performer'] = bestPerformers;
  }

  // Handle other criteria
  event.value.criteria.forEach(criterion => {
    // Count votes for each participant/team for this criterion
    const voteCounts: Record<string, number> = {};
    if (criterion.criteriaSelections) {
      Object.values(criterion.criteriaSelections).forEach(sel => {
        if (sel) voteCounts[sel] = (voteCounts[sel] || 0) + 1;
      });
      // Find the participant(s)/team(s) with the most votes
      const maxVotes = Math.max(0, ...Object.values(voteCounts));
      const topWinners = Object.entries(voteCounts)
        .filter(([_, count]) => count === maxVotes && maxVotes > 0)
        .map(([winnerId]) => winnerId);
      winners[criterion.constraintLabel || `Criteria ${criterion.constraintIndex}`] = topWinners;
    }
  });
  
  return winners;
});

const canRateOrganizer = computed(() => {
  if (!event.value || !currentUser.value?.uid) return false;
  if (event.value.status !== EventStatus.Completed) return false;
  const uid = currentUser.value.uid;
  // Must be a participant
  let isParticipant = false;
  if (event.value.details.format === EventFormat.Team && Array.isArray(event.value.teams)) {
    isParticipant = event.value.teams.some(team => team.members?.includes(uid));
  } else if (Array.isArray(event.value.participants)) {
    isParticipant = event.value.participants.includes(uid);
  }
  // Must NOT be an organizer or requester
  const organizers = event.value.details.organizers || [];
  const isOrganizer = organizers.includes(uid) || event.value.requestedBy === uid;
  return isParticipant && !isOrganizer;
});

defineExpose({
  canJoin,
  canLeave,
  canEdit,
  isJoining,
  isLeaving,
  handleJoin,
  handleLeave
});

</script>

<style scoped>
/* --- Layout & Responsive --- */
.event-details-bg {
  background: linear-gradient(135deg, #f8fafc 0%, #e0e7ff 100%);
  min-height: 100vh;
}
.event-details-view {
  max-width: 1200px;
  margin: 0 auto;
  padding-bottom: 2.5rem;
}
@media (max-width: 768px) {
  .event-details-view {
    padding-left: 0.5rem;
    padding-right: 0.5rem;
  }
  .team-list-box,
  .participants-box,
  .submissions-box,
  .ratings-box {
    margin-bottom: 1.25rem !important;
  }
  .card-header, .card-body {
    padding-left: 1rem !important;
    padding-right: 1rem !important;
  }
  .participant-item {
    font-size: 0.95rem;
  }
}

/* --- Floating Action Button for Submission --- */
.submit-fab {
  position: relative;
  top: 0;
  right: 0;
  z-index: 2;
  min-width: 180px;
}
.submit-fab-mobile {
  position: fixed;
  bottom: 1.5rem;
  right: 1.5rem;
  z-index: 1050;
  border-radius: 50%;
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
}
@media (min-width: 768px) {
  .submit-fab-mobile {
    display: none !important;
  }
}

/* --- Cards & Sections --- */
.section-header {
  display: flex;
  align-items: center;
  font-size: 1.1rem;
  font-weight: 600;
  gap: 0.5rem;
}
.team-list-box,
.participants-box,
.submissions-box,
.ratings-box {
  padding: 0;
  border-radius: 1rem;
  background: var(--bs-white, #fff);
  border: 1px solid var(--bs-border-color, #dee2e6);
  box-shadow: 0 4px 24px 0 rgba(37,99,235,0.07);
}
.text-decoration-underline-hover:hover {
  text-decoration: underline;
}
.text-break {
  word-break: break-all;
}
.transition-opacity {
  transition-property: opacity;
}
.duration-300 {
  transition-duration: 300ms;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.modal:not(.show) {
  display: none;
  opacity: 0;
}
.modal.show {
  display: block;
  opacity: 1;
  background-color: rgba(0,0,0,0.5);
}
.participant-item {
  background-color: var(--bs-body-bg);
  border-color: var(--bs-border-color);
  transition: background-color 0.2s ease;
}
.participant-item:hover {
  background-color: var(--bs-tertiary-bg);
}
.participant-item.bg-primary-subtle {
  border-left: 3px solid var(--bs-primary);
  background-color: var(--bs-primary-bg-subtle) !important;
}
.submission-item {
  background-color: var(--bs-tertiary-bg);
  border-color: var(--bs-border-color-translucent);
}
.event-header-card .badge,
.event-header-section .badge {
  font-size: 1rem;
  vertical-align: middle;
  padding: 0.45em 0.9em;
}
.event-header-card .text-secondary,
.event-header-section .text-secondary {
  font-size: 1rem;
}
.event-header-card .text-body,
.event-header-section .text-body {
  font-size: 1rem;
}
.sticky-lg-top {
  position: sticky;
  top: 2rem;
}
</style>
