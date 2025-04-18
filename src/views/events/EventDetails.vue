<template>
  <div class="event-details-view container-fluid px-0 px-md-2">
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
        @join="handleJoin"
        @leave="handleLeave"
      />

      <!-- Floating Action Button for Submission (visible if eligible) -->
      <div class="d-none d-md-flex flex-column align-items-end">
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
        v-if="event && canSubmitProject"
        class="btn btn-primary shadow submit-fab-mobile d-md-none"
        @click="triggerSubmitModalOpen"
        title="Submit Project"
      >
        <i class="fas fa-upload"></i>
      </button>

      <!-- Event Management Controls -->
      <div class="mb-4">
        <EventManageControls
          v-if="canManageEvent && event"
          :event="event"
          class="mb-0"
        />
      </div>

      <!-- XP/Criteria Section -->
      <div v-if="event?.criteria?.length" class="card mb-4 shadow-sm">
        <div class="card-body">
          <h5 class="mb-3 text-primary">Rating Criteria &amp; XP</h5>
          <ul class="list-unstyled mb-0">
            <li v-for="(alloc, idx) in event.criteria" :key="alloc.constraintIndex ?? idx" class="mb-2">
              <span class="text-warning me-2"><i class="fas fa-star"></i></span>
              <span class="fw-semibold">{{ alloc.constraintLabel || 'Unnamed Criteria' }}</span>
              <span class="text-secondary ms-2">({{ alloc.points }} XP, {{ formatRoleName((alloc.targetRole || alloc.role) ?? '') }})</span>
            </li>
          </ul>
        </div>
      </div>

      <!-- Feedback Message -->
      <div v-if="globalFeedback.message"
        class="alert alert-sm mt-auto mb-0 transition-opacity duration-300 d-flex align-items-center"
        :class="globalFeedback.type === 'success' ? 'alert-success' : 'alert-danger'"
        role="alert"
      >
        <i class="fas me-2" :class="globalFeedback.type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'"></i>
        <div>{{ globalFeedback.message }}</div>
      </div>

      <!-- Main Content Grid -->
      <div class="row g-4">
        <!-- Teams/Participants -->
        <div class="col-12 col-lg-6">
          <!-- Team List Section -->
          <div v-if="event && event.details.format === 'Team'" class="mb-4">
            <h5 class="mb-3 text-primary">Teams</h5>
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
              class="card team-list-box p-0 shadow-sm" />
          </div>
          <!-- Participants Section (Non-Team Events) -->
          <div v-if="event && event.details.format !== 'Team'" class="card participants-box shadow-sm mb-4">
            <div class="card-header d-flex justify-content-between align-items-center bg-light">
              <h5 class="mb-0">Participants</h5>
              <button
                @click="showParticipants = !showParticipants"
                class="btn btn-sm btn-outline-secondary d-inline-flex align-items-center"
              >
                <i class="fas transition-transform duration-200 me-1" :class="showParticipants ? 'fa-chevron-up' : 'fa-chevron-down'"></i>
                <span>{{ showParticipants ? 'Hide' : `Show (${participantCount})` }}</span>
              </button>
            </div>
            <Transition name="slide-fade">
              <div v-if="showParticipants" class="card-body animate-fade-in">
                <div v-if="organizerNamesLoading" class="text-secondary fst-italic py-3">
                  <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span> Loading participants...
                </div>
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
                        <i class="fas fa-user text-secondary me-2"></i>
                        <router-link
                          :to="{ name: 'PublicProfile', params: { userId: safeString(userId) } }"
                          class="small text-truncate text-decoration-none"
                          :class="userId === currentUserId ? 'text-primary fw-semibold' : 'text-body-secondary'"
                        >
                          {{ getUserNameFromCache(safeString(userId)) }} {{ userId === currentUserId ? '(You)' : '' }}
                        </router-link>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Transition>
          </div>
        </div>
        <!-- Submissions & Ratings -->
        <div class="col-12 col-lg-6">
          <!-- Submission Section -->
          <div v-if="event" class="card submissions-box shadow-sm mb-4">
            <div class="card-header bg-light d-flex align-items-center justify-content-between">
              <h5 class="mb-0">Project Submissions</h5>
              <button
                v-if="canSubmitProject"
                class="btn btn-sm btn-outline-primary d-flex align-items-center"
                @click="triggerSubmitModalOpen"
              >
                <i class="fas fa-upload me-1"></i> Submit
              </button>
            </div>
            <div class="card-body">
              <div v-if="event.details.format !== 'Team'">
                <ul class="list-unstyled d-flex flex-column gap-3">
                  <li v-for="(submission, index) in event.submissions" :key="`ind-sub-${submission.submittedBy || index}`" class="submission-item p-3 rounded border bg-body-tertiary">
                    <p class="small text-secondary mb-1">Submitted by: {{ getUserNameFromCache(safeString(submission.submittedBy)) }}</p>
                    <a :href="submission.link || ''" target="_blank" rel="noopener noreferrer" class="small text-primary text-decoration-underline-hover text-break">{{ submission.link }}</a>
                    <p v-if="submission.description" class="mt-1 small text-secondary">{{ submission.description }}</p>
                  </li>
                </ul>
              </div>
              <div v-else>
                <p v-if="!teams || teams.length === 0 || teams.every(t => !hasTeamSubmissions(t))" class="small text-secondary fst-italic">
                  No project submissions yet for this event.
                </p>
                <div v-else class="d-flex flex-column gap-4">
                  <div v-for="team in teams.filter(hasTeamSubmissions)" :key="getTeamKey(team)">
                    <h6 class="text-secondary mb-2">Team: {{ team.teamName }}</h6>
                    <ul class="list-unstyled d-flex flex-column gap-2 ms-4 ps-4 border-start border-2">
                      <li v-for="(submission, index) in team.submissions" :key="`team-${team.id || team.teamName}-sub-${submission.submittedBy || index}`" class="submission-item p-3 rounded border bg-body-tertiary">
                        <p class="small text-secondary mb-1">Submitted by: {{ getUserNameFromCache(safeString(submission.submittedBy)) }}</p>
                        <a :href="submission.link || ''" target="_blank" rel="noopener noreferrer" class="small text-primary text-decoration-underline-hover text-break">{{ submission.link }}</a>
                        <p v-if="submission.description" class="mt-1 small text-secondary">{{ submission.description }}</p>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <!-- Rating Section -->
          <div v-if="event" class="card ratings-box shadow-sm mb-4">
            <div class="card-header bg-light d-flex justify-content-between align-items-center">
              <h5 class="mb-0">Ratings / Winner Selection</h5>
              <div class="d-flex align-items-center">
                <span v-if="event.status === 'Completed'" class="badge rounded-pill d-inline-flex align-items-center text-bg-secondary">Not Started</span>
              </div>
            </div>
            <div class="card-body">
              <div v-if="event.status === 'Completed'">
                <p class="small text-secondary fst-italic">
                  Rating/Winner selection is currently closed for this event.
                </p>
              </div>
              <p v-else class="small text-secondary fst-italic">
                Rating/Winner selection will be available once the event is completed.
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Submission Modal -->
      <div class="modal fade" id="submissionModal" tabindex="-1" aria-labelledby="submissionModalLabel" aria-hidden="true" ref="submissionModalRef">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title h5" id="submissionModalLabel">Submit Your Project</h5>
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
            <div class="modal-footer">
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
import { useRouter, useRoute } from 'vue-router';
import TeamList from '@/components/TeamList.vue';
import EventManageControls from '@/components/events/EventManageControls.vue';
import EventDetailsSkeleton from '@/components/skeletons/EventDetailsSkeleton.vue';
import SkeletonProvider from '@/components/skeletons/SkeletonProvider.vue';
import EventDetailsHeader from '@/components/events/EventDetailsHeader.vue';
import { EventStatus, type Event, Team as EventTeamType, Submission, EventFormat } from '@/types/event'; // Add EventFormat
import { User } from '@/types/user';
import { formatRoleName } from '@/utils/formatters';

interface EventDetails extends Event {}

interface Team extends EventTeamType {}

// Add Collapse interface for type safety
interface Collapse {
  toggle(): void;
  hide(): void;
  show(): void;
  dispose(): void;
}

// Add BootstrapModal interface
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
    const isOrganizer = (event.value.details.organizers || []).includes(currentUserId.value);
    const isRequester = event.value.requestedBy === currentUserId.value;
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
  const isOrganizer = event.value.details.organizers?.includes(uid);
  let isParticipant = false;
  if (event.value.details.format === EventFormat.Team && Array.isArray(event.value.teams)) {
      isParticipant = event.value.teams.some(team => team.members?.includes(uid));
  } else if (Array.isArray(event.value.participants)) {
      isParticipant = event.value.participants.includes(uid);
  }

  if (isOrganizer || isParticipant) return false;

  return true;
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

  const userTeam = event.value.teams?.find(team => team.members?.includes(currentUserId.value));
  return userTeam?.teamLead === currentUserId.value;
});

const canJoin = computed(() => {
  if (!event.value || !currentUserId.value) return false;
  if (![EventStatus.Approved, EventStatus.InProgress].includes(event.value.status as EventStatus)) return false;
  if (event.value.details.organizers?.includes(currentUserId.value)) return false;
  if (event.value.details.format === EventFormat.Team) {
    return event.value.teams?.some(team => !team.members?.includes(currentUserId.value)) ?? true;
  } else {
    return !(event.value.participants?.includes(currentUserId.value));
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
  if (event.value.details.organizers?.includes(uid)) return false;
  if (event.value.details.format === EventFormat.Team) {
    return event.value.teams?.some(team => team.members?.includes(uid)) ?? false;
  } else {
    return event.value.participants?.includes(uid) ?? false;
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
    } else if (typeof event.value.participants === 'object' && event.value.participants !== null) {
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

// Update safeString function
const safeString = (value: string | null | undefined): string => value || '';

// Update the getUserNameFromCache function
const getUserNameFromCache = (userId: string): string => {
    return nameCache.value.get(userId) || userId;
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
        console.error("Error fetching user names batch:", error);
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
    console.error('Error fetching event data:', error);
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
        console.error("Error submitting project:", error);
        submissionError.value = error.message || 'Failed to submit project.';
    } finally {
        isSubmittingProject.value = false;
        actionInProgress.value = false;
    }
};

const handleJoin = (): void => {
    // Implement join logic here
    isJoining.value = true;
    // Example: Call store action to join event
    setTimeout(() => {
        isJoining.value = false;
        setGlobalFeedback('Successfully joined the event!', 'success');
    }, 1000);
};

const handleLeave = (): void => {
    // Implement leave logic here
    isLeaving.value = true;
    // Example: Call store action to leave event
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

function statusBadgeClass(status: string | undefined) {
    switch (status) {
        case 'Approved': return 'bg-success-subtle text-success-emphasis';
        case 'Pending': return 'bg-warning-subtle text-warning-emphasis';
        case 'InProgress': return 'bg-info-subtle text-info-emphasis';
        case 'Rejected': return 'bg-danger-subtle text-danger-emphasis';
        case 'Completed': return 'bg-dark text-white';
        case 'Cancelled': return 'bg-secondary-subtle text-secondary-emphasis';
        default: return 'bg-secondary-subtle text-secondary-emphasis';
    }
}

function formatDateRange(start: any, end: any): string {
    try {
        if (!start) return 'N/A';
        const toDateString = (d: any) =>
            d && d.toDate ? d.toDate().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '';
        const startStr = toDateString(start);
        const endStr = toDateString(end);
        return endStr && startStr !== endStr ? `${startStr} - ${endStr}` : startStr;
    } catch {
        return 'N/A';
    }
}

// Add type guard
const isNonNullString = (value: string | null): value is string => value !== null;

// Fix event mapping function
const mapEventToHeaderProps = (event: Event) => ({
  ...event,
  title: event.details.type || '',
  teamSize: event.teams?.length || 0,
  description: event.details.description || '',
  details: {
    ...event.details
  }
});

// Add team key generation function
const getTeamKey = (team: Team): string => {
  return team.id || team.teamName;
};

// Fix the filterUserIds function
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

// Expose these to the template for SkeletonProvider slot context
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
.event-details-view {
  max-width: 1100px;
  margin: 0 auto;
  padding-bottom: 2.5rem;
}
.event-header-section {
  border-radius: 1rem;
  background: var(--bs-white, #fff);
  border: 1px solid var(--bs-border-color, #dee2e6);
  margin-bottom: 1.5rem;
  position: relative;
}
@media (max-width: 768px) {
  .event-details-view {
    padding-left: 0.5rem;
    padding-right: 0.5rem;
  }
  .event-header-section {
    margin-bottom: 1.25rem !important;
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

.team-list-box,
.participants-box,
.submissions-box,
.ratings-box {
  padding: 0;
  border-radius: 0.75rem;
  background: var(--bs-white, #fff);
  border: 1px solid var(--bs-border-color, #dee2e6);
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
.animate-fade-in {
  animation: fadeIn 0.5s ease-out forwards;
}
.slide-fade-enter-active {
  transition: all 0.3s ease-out;
}
.slide-fade-leave-active {
  transition: all 0.2s cubic-bezier(1, 0.5, 0.8, 1);
}
.slide-fade-enter-from,
.slide-fade-leave-to {
  transform: translateY(-10px);
  opacity: 0;
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
</style>