// src/views/EventDetails.vue
<template>
    <div class="event-details-view">
        <SkeletonProvider
            :loading="loading"
            :skeleton-component="EventDetailsSkeleton"
        >
            <!-- ... (rest of the template remains the same, but check prop bindings) ... -->

            <!-- Event Display Card Section -->
            <div class="card event-display-box p-0 shadow-sm">
                <!-- Pass the raw Map or convert based on EventDisplayCard's prop type -->
                <!-- Assuming EventDisplayCard expects Record<string, string> -->
                <EventDisplayCard 
                    v-if="event" 
                    :event="{
                        eventName: event.details.type,
                        eventType: event.details.type,
                        requester: event.requestedBy,
                        isTeamEvent: event.details.format === 'Team',
                        description: event.details.description,
                        startDate: event.details.date.final?.start ?? undefined,
                        endDate: event.details.date.final?.end ?? undefined,
                        desiredStartDate: event.details.date.desired?.start ?? undefined,
                        desiredEndDate: event.details.date.desired?.end ?? undefined,
                        status: event.status,
                        organizers: event.details.organizers,
                        rejectionReason: event.rejectionReason ?? undefined,
                        xpAllocation: (event.criteria || []).map(c => ({
                            constraintLabel: c.constraintLabel,
                            points: c.points,
                            role: c.targetRole || c.role || '',
                        }))
                    }"
                    :nameCache="Object.fromEntries(nameCache)" 
                    :showStatus="true" />
            </div>

            <!-- Event Management Controls -->
            <EventManageControls
                v-if="canManageEvent && event"
                :event="event"
                class="mb-0"
            />

            <!-- Global Feedback Message Area -->
             <div v-if="globalFeedback.message"
                 class="alert alert-sm mt-auto mb-0 transition-opacity duration-300 d-flex align-items-center"
                 :class="globalFeedback.type === 'success' ? 'alert-success' : 'alert-danger'"
                 role="alert"
             >
                <i class="fas me-2" :class="globalFeedback.type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'"></i>
                <div>{{ globalFeedback.message }}</div>
            </div>

            <!-- ... other sections ... -->

             <!-- Team List Section -->
             <TeamList
                v-if="event && event.details.format === 'Team'"
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

            <!-- Participants Section (Non-Team Events) -->
            <div v-if="event && event.details.format !== 'Team'" class="card participants-box shadow-sm">
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
                        <!-- Participant list content -->
                        <div v-if="organizerNamesLoading" class="text-secondary fst-italic py-3">
                            <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span> Loading participants...
                        </div>
                        <p v-else-if="participantCount === 0" class="text-secondary fst-italic py-3">
                            No participants have joined this event yet.
                        </p>
                        <div v-else>
                            <div class="row g-2">
                                <div v-for="userId in allParticipants" :key="userId" class="col-6 col-md-4">
                                    <div
                                        class="participant-item d-flex align-items-center p-2 border rounded"
                                        :class="{ 'bg-primary-subtle': userId === currentUserId }"
                                    >
                                        <i class="fas fa-user text-secondary me-2"></i>
                                        <router-link
                                            :to="{ name: 'PublicProfile', params: { userId } }"
                                            class="small text-truncate text-decoration-none"
                                            :class="userId === currentUserId ? 'text-primary fw-semibold' : 'text-body-secondary'"
                                        >
                                            <!-- Use getUserNameFromCache correctly -->
                                            {{ getUserNameFromCache(userId) }} {{ userId === currentUserId ? '(You)' : '' }}
                                        </router-link>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </Transition>
            </div>

            <!-- Submission Section -->
            <div v-if="event" class="card submissions-box shadow-sm">
                <div class="card-header bg-light">
                    <h5 class="mb-0">Project Submissions</h5>
                </div>
                <div class="card-body">
                    <!-- Submission list content -->
                    <div v-if="event.details.format !== 'Team'">
                         <!-- Check submissions exist and is array -->
                         <p v-if="!event.submissions || !Array.isArray(event.submissions) || event.submissions.length === 0" class="small text-secondary fst-italic">
                             No project submissions yet for this event.
                         </p>
                        <ul v-else class="list-unstyled d-flex flex-column gap-3">
                            <li v-for="(submission, index) in event.submissions" :key="`ind-sub-${submission.submittedBy || index}`" class="submission-item p-3 rounded border bg-body-tertiary">
                                <p class="h6 fw-medium text-primary">{{ submission.projectName }}</p>
                                <p class="small text-secondary mb-1">Submitted by: {{ getUserNameFromCache(submission.submittedBy) }}</p>
                                <a :href="submission.link" target="_blank" rel="noopener noreferrer" class="small text-primary text-decoration-underline-hover text-break">{{ submission.link }}</a>
                                <p v-if="submission.description" class="mt-1 small text-secondary">{{ submission.description }}</p>
                            </li>
                        </ul>
                    </div>
                    <div v-else>
                        <p v-if="!teams || teams.length === 0 || teams.every(t => !t.submissions || t.submissions.length === 0)" class="small text-secondary fst-italic">
                            No project submissions yet for this event.
                        </p>
                        <div v-else class="d-flex flex-column gap-4">
                            <div v-for="team in teams.filter(t => t.submissions && t.submissions.length > 0)" :key="`team-sub-${team.id || team.teamName}`"> 
                                <h6 class="text-secondary mb-2">Team: {{ team.teamName }}</h6>
                                <ul class="list-unstyled d-flex flex-column gap-2 ms-4 ps-4 border-start border-2">
                                    <li v-for="(submission, index) in team.submissions" :key="`team-${team.id || team.teamName}-sub-${submission.submittedBy || index}`" class="submission-item p-3 rounded border bg-body-tertiary">
                                        <p class="h6 fw-medium text-primary">{{ submission.projectName }}</p>
                                        <p class="small text-secondary mb-1">Submitted by: {{ getUserNameFromCache(submission.submittedBy) }}</p>
                                        <a :href="submission.link" target="_blank" rel="noopener noreferrer" class="small text-primary text-decoration-underline-hover text-break">{{ submission.link }}</a>
                                        <p v-if="submission.description" class="mt-1 small text-secondary">{{ submission.description }}</p>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Rating Section -->
            <div v-if="event" class="card ratings-box shadow-sm">
                <div class="card-header bg-light d-flex justify-content-between align-items-center">
                    <h5 class="mb-0">Ratings / Winner Selection</h5>
                    <div class="d-flex align-items-center">
                         <span v-if="event.status === 'Completed'" class="badge rounded-pill d-inline-flex align-items-center text-bg-secondary">Not Started</span>
                    </div>
                </div>
                <div class="card-body">
                    <!-- Rating section content -->
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

            <!-- ... rest of the template ... -->

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
import { computed, onMounted, onBeforeUnmount, ref, watch } from 'vue';
import { useStore, Store } from 'vuex'; // Import Store type
import { useRouter, useRoute } from 'vue-router';
import TeamList from '@/components/TeamList.vue';
import EventDisplayCard from '@/components/events/EventDisplayCard.vue';
import EventManageControls from '@/components/events/EventManageControls.vue';
import EventDetailsSkeleton from '@/components/skeletons/EventDetailsSkeleton.vue';
import SkeletonProvider from '@/components/skeletons/SkeletonProvider.vue';
import { EventStatus, type Event, Team as EventTeamType, Submission } from '@/types/event'; // Remove EventFormat
import { User } from '@/types/user';

// --- Interfaces ---

// Define a more specific Event type based on usage, ensure it aligns with Event type
interface EventDetails extends Event { // Extend the base Event type
    // Add any additional properties specific to this view if necessary
    // Ensure properties used in the template exist in the base Event type or are added here
}

// Use EventTeamType for consistency
interface Team extends EventTeamType {
    // Add local view-specific properties if needed
}

// Manual definition if types aren't installed:
interface BootstrapModal {
  show(): void;
  hide(): void;
  dispose(): void;
}

declare global {
  interface Window {
    // Use a more generic type or install @types/bootstrap
    bootstrap?: {
      Modal?: any; // Use optional to match App.vue/global definition
      // Add other Bootstrap components if needed (e.g., Collapse)
      Collapse?: any;
    };
  }
}

// --- Props, Store, Router ---
interface Props {
  id: string;
}
const props = defineProps<Props>();

// Provide type hint for the store if you have RootState defined
// import { RootState } from '@/store'; // Assuming you have RootState type
// const store: Store<RootState> = useStore();
const store = useStore(); // Use generic store if RootState isn't set up

const router = useRouter();
const route = useRoute();

// --- State Refs ---
const loading = ref<boolean>(true);
const event = ref<EventDetails | null>(null); // Use EventDetails type
const teams = ref<Team[]>([]); // Use Team type
const initialFetchError = ref<string>('');
const nameCache = ref<Map<string, string>>(new Map()); // Map UID to Name
const organizerNamesLoading = ref<boolean>(false);
const submissionModalRef = ref<HTMLElement | null>(null); // Ref for modal DOM element
const showParticipants = ref<boolean>(false);
interface SubmissionFormData {
	projectName: string;
	link: string;
	description: string;
}
const submissionForm = ref<SubmissionFormData>({ projectName: '', link: '', description: '' });
const submissionError = ref<string>('');
const isSubmittingProject = ref<boolean>(false);
const actionInProgress = ref<boolean>(false); // General purpose loading flag
interface FeedbackState {
	message: string;
	type: 'success' | 'error';
}
const globalFeedback = ref<FeedbackState>({ message: '', type: 'success' });

// --- Getters (Computed) ---
const currentUserId = computed<string | null>(() => store.getters['user/userId'] ?? null);
const currentUserRole = computed<string | null>(() => store.getters['user/userRole'] ?? null);
const isAdmin = computed<boolean>(() => currentUserRole.value === 'Admin');
const currentUser = computed<User | null>(() => store.getters['user/getUser'] ?? null);

// --- Computed Properties ---

const isCurrentUserOrganizer = computed<boolean>(() => {
    if (!event.value || !currentUserId.value) return false;
    const isOrganizer = (event.value.details.organizers || []).includes(currentUserId.value);
    const isRequester = event.value.requestedBy === currentUserId.value;
    return isOrganizer || isRequester;
});

const canManageEvent = computed<boolean>(() => {
    // No need to check currentUser.value as isAdmin and isCurrentUserOrganizer depend on it
    return isAdmin.value || isCurrentUserOrganizer.value;
});

const currentUserCanRate = computed<boolean>(() => {
  if (!event.value || !currentUserId.value || event.value.status !== EventStatus.Completed) {
    return false;
  }
  // Prevent organizers/participants from rating
  const isOrganizer = event.value.details.organizers?.includes(currentUserId.value);
  let isParticipant = false;
  if (event.value.details.format === 'Team' && Array.isArray(event.value.teams)) {
      isParticipant = event.value.teams.some(team => team.members?.includes(currentUserId.value ?? ''));
  } else if (Array.isArray(event.value.participants)) {
      isParticipant = event.value.participants.includes(currentUserId.value ?? '');
  }

  if (isOrganizer || isParticipant) return false;

  return true; // Allow rating if none of the above conditions met
});

const allParticipants = computed<string[]>(() => {
    if (!event.value) return [];

    const userIds = new Set<string>();

    // Add core roles
    if (event.value.requestedBy) userIds.add(event.value.requestedBy);
    if (Array.isArray(event.value.details.organizers)) {
        event.value.details.organizers.forEach(id => { if (id) userIds.add(id); });
    }

    // Add participants based on event type
    if (event.value.details.format === 'Team' && Array.isArray(event.value.teams)) {
        event.value.teams.forEach(team => {
            if (Array.isArray(team.members)) {
                team.members.forEach(id => { if (id) userIds.add(id); });
            }
        });
    } else if (Array.isArray(event.value.participants)) {
        // Handle modern array format
        event.value.participants.forEach(id => { if (id) userIds.add(id); });
    } else if (typeof event.value.participants === 'object' && event.value.participants !== null) {
        // Handle legacy object format { userId: true/data }
        Object.keys(event.value.participants).forEach(id => { if (id) userIds.add(id); });
    }

    return Array.from(userIds); // Set automatically handles uniqueness and filters falsy values during add
});

const participantCount = computed<number>(() => allParticipants.value.length);

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

const getUserNameFromCache = (userId: string | null | undefined): string => {
    if (!userId) return 'Unknown User';
    return nameCache.value.get(userId) || `User (${(userId ?? '').substring(0, 5)}...)`;
};

async function fetchUserNames(userIds: string[]): Promise<void> {
    if (!Array.isArray(userIds) || userIds.length === 0) return;

    // Filter out invalid IDs and IDs already in cache
    const uniqueIdsToFetch = [...new Set(userIds)].filter(id => id && !nameCache.value.has(id));

    if (uniqueIdsToFetch.length === 0) return; // Nothing new to fetch

    organizerNamesLoading.value = true;
    try {
        // Assuming 'user/fetchUserNamesBatch' returns Record<string, string | null>
        const names: Record<string, string | null> = await store.dispatch('user/fetchUserNamesBatch', uniqueIdsToFetch);
        uniqueIdsToFetch.forEach(id => {
            nameCache.value.set(id, names[id] || `User (${id.substring(0, 5)}...)`);
        });
    } catch (error: any) {
        console.error("Error fetching user names batch:", error);
        // Set a fallback name in the cache on error to avoid repeated attempts
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
  event.value = null; // Reset event state
  teams.value = [];   // Reset teams state

  try {
    await store.dispatch('events/fetchEventDetails', props.id);
    const storeEvent = store.state.events.currentEventDetails as EventDetails | null;

    if (!storeEvent || storeEvent.id !== props.id) {
      throw new Error('Event not found or inaccessible.');
    }

    event.value = storeEvent;
    teams.value = (storeEvent.details.format === 'Team' && Array.isArray(storeEvent.teams))
                  ? [...storeEvent.teams]
                  : [];

    const isClosed = storeEvent.status === 'Completed' && storeEvent.closedAt !== null;
    store.dispatch('app/setEventClosedState', { eventId: props.id, isClosed });

    await fetchUserNames(allParticipants.value);

  } catch (error: any) {
    console.error('Error fetching event data:', error);
    initialFetchError.value = error.message || 'Failed to load event data';
    event.value = null;
    teams.value = [];
  } finally {
    loading.value = false;
  }
}

// Use Bootstrap 5 JS API for modal control
const getModalInstance = (): BootstrapModal | null => {
    if (!submissionModalRef.value || !window.bootstrap?.Modal) return null;
    return window.bootstrap.Modal.getInstance(submissionModalRef.value);
};

const getOrCreateModalInstance = (): BootstrapModal | null => {
    if (!submissionModalRef.value || !window.bootstrap?.Modal) return null;
    return window.bootstrap.Modal.getOrCreateInstance(submissionModalRef.value);
}

const triggerSubmitModalOpen = (): void => {
    submissionForm.value = { projectName: '', link: '', description: '' }; // Reset form
    submissionError.value = ''; // Clear errors
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


const handleTeamRated = (feedback: { message: string; type: 'success' | 'error' }): void => {
    setGlobalFeedback(feedback.message, feedback.type);
};

const openRatingForm = (): void => {
    if (currentUserCanRate.value && event.value) {
        router.push({ name: 'RatingForm', params: { eventId: props.id } });
    } else {
        setGlobalFeedback('You are not eligible to rate/select winners for this event, or the period is closed.', 'error');
    }
};


// --- Lifecycle Hooks ---
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

</script>

<style scoped>
/* Styles remain the same */
.event-details-section {
  background-color: var(--bs-body-bg); /* Updated variable */
}

.event-display-box,
.team-list-box {
    padding: 0; /* Keep padding override */
}

.text-decoration-underline-hover:hover {
    text-decoration: underline;
}

.text-break {
    word-break: break-all; /* Keep if BS doesn't cover it */
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

/* Style participant items */
.participant-item {
    background-color: var(--bs-body-bg); /* Use theme variable */
    border-color: var(--bs-border-color);
    transition: background-color 0.2s ease;
}
.participant-item:hover {
    background-color: var(--bs-tertiary-bg);
}
/* Specific style for current user */
.participant-item.bg-primary-subtle {
    border-left: 3px solid var(--bs-primary);
    background-color: var(--bs-primary-bg-subtle) !important; /* Ensure override if needed */
}

/* Style submission items */
.submission-item {
    background-color: var(--bs-tertiary-bg); /* Light background for submissions */
    border-color: var(--bs-border-color-translucent);
}
</style>