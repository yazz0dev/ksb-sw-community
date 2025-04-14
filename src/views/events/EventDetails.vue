// src/views/EventDetails.vue
<template>
    <div class="event-details-view">
        <SkeletonProvider
            :loading="loading"
            :skeleton-component="EventDetailsSkeleton"
        >
            <div class="py-5 event-details-section">
                <div class="container-lg">
                    <!-- Back Button -->
                    <div class="mb-5">
                        <button @click="$router.back()" class="btn btn-sm btn-outline-secondary d-inline-flex align-items-center">
                            <i class="fas fa-arrow-left me-1"></i>
                            <span>Back</span>
                        </button>
                    </div>

                    <!-- Loading State -->
                    <div v-if="loading" class="text-center py-5">
                        <div class="spinner-border text-primary" role="status" style="width: 3rem; height: 3rem;">
                            <span class="visually-hidden">Loading...</span>
                        </div>
                        <p class="text-secondary mt-2">Loading event details...</p>
                    </div>

                    <!-- Error State -->
                    <div v-else-if="initialFetchError" class="alert alert-danger d-flex align-items-center" role="alert">
                        <i class="fas fa-exclamation-triangle me-2"></i>
                        <div>Error: {{ initialFetchError }}</div>
                    </div>

                    <!-- Not Found State -->
                    <div v-else-if="!event" class="alert alert-warning d-flex align-items-center" role="alert">
                        <i class="fas fa-info-circle me-2"></i>
                        <div>Event data not found or not yet loaded.</div>
                    </div>

                    <!-- Main Content Grid -->
                    <div v-else class="row g-4 animate-fade-in">
                        <!-- Left Column (Event Info & Controls) -->
                        <div class="col-lg-5 d-flex flex-column gap-4">
                            <!-- Event Display Card Section -->
                            <div class="card event-display-box p-0 shadow-sm">
                                <EventDisplayCard :event="event" :nameCache="Object.fromEntries(nameCache)" :showStatus="true" />
                            </div>

                            <!-- Event Management Controls -->
                            <EventManageControls
                                v-if="canManageEvent"
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

                        </div>

                        <!-- Right Column (Lists & Details) -->
                        <div class="col-lg-7 d-flex flex-column gap-4">
                            <!-- Team List Section -->
                            <TeamList
                                v-if="event.isTeamEvent"
                                :teams="teams"
                                :event-id="props.id"
                                :event-status="event.status"
                                :user-role="currentUserRole"
                                :user-id="currentUserId"
                                :ratingsOpen="event.ratingsOpen"
                                :getUserName="getUserNameFromCache"
                                @teamRated="handleTeamRated"
                                class="card team-list-box p-0 shadow-sm" /> 
                            
                            <!-- Participants Section (Non-Team Events) -->
                            <div v-if="!event.isTeamEvent" class="card participants-box shadow-sm">
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
                                                            {{ getUserNameFromCache(userId) || userId }} {{ userId === currentUserId ? '(You)' : '' }}
                                                        </router-link>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </Transition>
                            </div>

                            <!-- Submission Section -->
                            <div class="card submissions-box shadow-sm">
                                <div class="card-header bg-light">
                                    <h5 class="mb-0">Project Submissions</h5>
                                </div>
                                <div class="card-body">
                                    <!-- Submission list content -->
                                    <div v-if="!event.isTeamEvent">
                                        <p v-if="!event.submissions || event.submissions.length === 0" class="small text-secondary fst-italic">
                                            No project submissions yet for this event.
                                        </p>
                                        <ul v-else class="list-unstyled d-flex flex-column gap-3">
                                            <li v-for="(submission, index) in event.submissions" :key="`ind-sub-${index}`" class="submission-item p-3 rounded border bg-body-tertiary">
                                                <p class="h6 fw-medium text-primary">{{ submission.projectName }}</p>
                                                <p class="small text-secondary mb-1">Submitted by: {{ getUserNameFromCache(submission.submittedBy) || submission.submittedBy }}</p>
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
                                            <div v-for="team in teams.filter(t => t.submissions && t.submissions.length > 0)" :key="`team-sub-${team.teamName}`">
                                                <h6 class="text-secondary mb-2">Team: {{ team.teamName }}</h6>
                                                <ul class="list-unstyled d-flex flex-column gap-2 ms-4 ps-4 border-start border-2">
                                                    <li v-for="(submission, index) in team.submissions" :key="`team-${team.teamName}-sub-${index}`" class="submission-item p-3 rounded border bg-body-tertiary">
                                                        <p class="h6 fw-medium text-primary">{{ submission.projectName }}</p>
                                                        <p class="small text-secondary mb-1">Submitted by: {{ getUserNameFromCache(submission.submittedBy) || submission.submittedBy }}</p>
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
                            <div class="card ratings-box shadow-sm">
                                <div class="card-header bg-light d-flex justify-content-between align-items-center">
                                    <h5 class="mb-0">Ratings</h5>
                                    <div class="d-flex align-items-center">
                                        <span 
                                            class="badge rounded-pill d-inline-flex align-items-center"
                                            :class="event.ratingsOpen ? 'text-bg-success' : 'text-bg-warning'">
                                            <i class="fas me-1" :class="event.ratingsOpen ? 'fa-lock-open' : 'fa-lock'"></i>
                                            {{ event.ratingsOpen ? 'Open' : 'Closed' }}
                                        </span>
                                        <span v-if="canManageEvent" class="ms-2 small text-body-secondary">({{ event.ratingsOpenCount ?? 0 }}/2 periods used)</span>
                                    </div>
                                </div>
                                <div class="card-body">
                                    <!-- Rating section content -->
                                    <div v-if="event.status === 'Completed'">
                                        <div v-if="event.ratingsOpen" class="alert alert-success alert-sm d-flex align-items-center" role="alert">
                                            <i class="fas fa-star me-1"></i> Ratings are currently open.
                                            <!-- TODO: Add rating button/link if user can rate -->
                                            <button v-if="!isAdmin && !isCurrentUserOrganizer && currentUserCanRate" @click="openTeamRatingForm" class="btn btn-sm btn-outline-success ms-auto">Rate Now</button>
                                        </div>
                                        <p v-else class="small text-secondary fst-italic">
                                            Ratings are currently closed for this event.
                                            <!-- Optionally display aggregated results here -->
                                        </p>
                                    </div>
                                    <p v-else class="small text-secondary fst-italic">
                                        Ratings will be available once the event is completed.
                                    </p>
                                </div>
                            </div>

                        </div>
                    </div>

                    <!-- Submission Modal (keep outside the grid) -->
                    <div class="modal fade" id="submissionModal" tabindex="-1" aria-labelledby="submissionModalLabel" aria-hidden="true" ref="submissionModalRef">
                        <!-- Modal Content -->
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
                </div> 
            </div>
        </SkeletonProvider>
    </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useStore } from 'vuex';
import { useRouter, useRoute } from 'vue-router';
import TeamList from '../components/TeamList.vue';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { Timestamp } from 'firebase/firestore';
import EventDisplayCard from '../components/EventDisplayCard.vue';
import EventManageControls from '../components/EventManageControls.vue';
import EventDetailsSkeleton from '@/components/skeletons/EventDetailsSkeleton.vue';
import SkeletonProvider from '@/components/SkeletonProvider.vue';

// Props, Store, Router
const props = defineProps({ id: { type: String, required: true } });
const store = useStore();
const router = useRouter();
const route = useRoute();

// Getters
const currentUserId = computed(() => store.getters['user/userId']);
const currentUserRole = computed(() => store.getters['user/userRole']);
const isAdmin = computed(() => currentUserRole.value === 'Admin');
const currentUser = computed(() => store.getters['user/getUser']);

// State Refs
const loading = ref(true);
const event = ref(null);
const teams = ref([]);
const initialFetchError = ref('');
const nameCache = ref(new Map());
const organizerNamesLoading = ref(false);
const submissionModalRef = ref(null); // Ref for modal element if needed
const showSubmissionModal = ref(false);
const showParticipants = ref(false);
const submissionForm = ref({ projectName: '', link: '', description: '' });
const submissionError = ref('');
const isSubmittingProject = ref(false);
const actionInProgress = ref(false); // General purpose loading flag for actions
const globalFeedback = ref({ message: '', type: 'success' });


// Computed property: Is current user an organizer or admin?
const isCurrentUserOrganizer = computed(() => {
    if (!event.value || !currentUserId.value) return false;
    // Check if user is in organizers array OR is the original requester
    return (event.value.organizers || []).includes(currentUserId.value) || event.value.requester === currentUserId.value;
});

// Computed property: Can the current user manage this event? (Admin or Organizer)
const canManageEvent = computed(() => {
    if (!currentUser.value || !event.value) return false;
    return isAdmin.value || isCurrentUserOrganizer.value;
});

// New Computed: Can the current user rate (assuming they haven't already)?
const currentUserCanRate = computed(() => {
  if (!event.value || !currentUserId.value || isAdmin.value || isCurrentUserOrganizer.value) {
    return false; // Admins/Organizers don't rate
  }
  // Basic check: are ratings open and event completed?
  if (event.value.status !== 'Completed' || !event.value.ratingsOpen) {
      return false;
  }
  // TODO: Add more sophisticated check based on whether the user has *already* rated
  // This might involve checking `event.value.ratings` or `event.value.teams[...].ratings`
  // depending on event type. For now, this allows the button to show if ratings are open.
  return true; 
});

// Computed property: Get all unique participant/organizer/requester IDs
const allParticipants = computed(() => {
    if (!event.value) return [];
    const userIds = new Set();
    if (event.value.requester) userIds.add(event.value.requester);
    if (Array.isArray(event.value.organizers)) event.value.organizers.forEach(id => userIds.add(id));
    
    // Include team members or individual participants
    if (event.value.isTeamEvent && Array.isArray(event.value.teams)) {
        event.value.teams.forEach(team => {
            if (Array.isArray(team.members)) team.members.forEach(id => userIds.add(id));
        });
    } else if (Array.isArray(event.value.participants)) {
        event.value.participants.forEach(id => userIds.add(id));
    } else if (typeof event.value.participants === 'object' && event.value.participants !== null) {
        // Handle legacy object format if necessary
        Object.keys(event.value.participants).forEach(id => userIds.add(id));
    }
    
    return Array.from(userIds).filter(id => id); // Filter out any null/undefined IDs
});

// Computed property: Count of participants
const participantCount = computed(() => allParticipants.value.length);

// --- Methods ---

// Function to show feedback messages
function setGlobalFeedback(message, type = 'success', duration = 4000) {
    globalFeedback.value = { message, type };
    if (duration > 0) {
        setTimeout(clearGlobalFeedback, duration);
    }
}
function clearGlobalFeedback() {
    globalFeedback.value = { message: '', type: 'success' };
}

// Function to get user name from cache (passed to child components)
const getUserNameFromCache = (userId) => {
    return nameCache.value.get(userId) || `User (${String(userId).substring(0, 5)}...)`; // Improved fallback
};

// Function to fetch names for a list of user IDs
async function fetchUserNames(userIds) {
    if (!Array.isArray(userIds) || userIds.length === 0) return;
    organizerNamesLoading.value = true;
    const uniqueIds = [...new Set(userIds)].filter(id => id && !nameCache.value.has(id)); // Ensure IDs are valid and not cached
    if (uniqueIds.length === 0) {
        organizerNamesLoading.value = false;
        return;
    }
    try {
        const names = await store.dispatch('user/fetchUserNamesBatch', uniqueIds);
        uniqueIds.forEach(id => {
            nameCache.value.set(id, names[id] || `User (${String(id).substring(0, 5)}...)`); // Use ID snippet if name missing
        });
    } catch (error) {
        console.error("Error fetching user names batch:", error);
        // Set a fallback name in the cache on error to avoid repeated attempts
        uniqueIds.forEach(id => { if (!nameCache.value.has(id)) nameCache.value.set(id, `Error (${String(id).substring(0, 5)}...)`); });
    } finally {
        organizerNamesLoading.value = false;
    }
}

// Function to fetch the main event data
async function fetchEventData() {
  loading.value = true;
  initialFetchError.value = '';
  try {
    await store.dispatch('events/fetchEventDetails', props.id);
    const storeEvent = store.state.events.currentEventDetails;
    
    if (!storeEvent || storeEvent.id !== props.id) {
      initialFetchError.value = 'Event not found or inaccessible.';
      event.value = null; 
      teams.value = []; 
      return;
    }
    
    event.value = storeEvent;
    // Ensure teams is always an array, even if null/undefined in Firestore
    teams.value = (storeEvent.isTeamEvent && Array.isArray(storeEvent.teams)) ? [...storeEvent.teams] : [];
    
    // Check and dispatch closed state if applicable
    const isClosed = storeEvent.status === 'Completed' && storeEvent.closed === true; // Explicitly check for closed: true
    if (isClosed) {
      store.dispatch('app/setEventClosedState', { eventId: props.id, isClosed: true });
    }
    
    // Fetch names for all relevant users AFTER event data is set
    await fetchUserNames(allParticipants.value); // Use computed property directly
    
  } catch (error) {
    console.error('Error fetching event data:', error);
    initialFetchError.value = error.message || 'Failed to load event data';
    event.value = null; 
    teams.value = [];
  } finally {
    loading.value = false;
  }
}

// Function to open the submission modal (using Bootstrap 5 JS API if available)
const triggerSubmitModalOpen = () => {
    submissionForm.value = { projectName: '', link: '', description: '' }; // Reset form
    submissionError.value = ''; // Clear errors
    const modalElement = document.getElementById('submissionModal');
    if (modalElement && window.bootstrap?.Modal) {
        const modalInstance = window.bootstrap.Modal.getOrCreateInstance(modalElement);
        modalInstance.show();
    } else if (modalElement) {
        // Fallback for simple show if BS JS not loaded
        modalElement.classList.add('show');
        modalElement.style.display = 'block'; 
        document.body.classList.add('modal-open');
    }
};

// Function to close the submission modal (using Bootstrap 5 JS API if available)
const closeSubmissionModal = () => {
    const modalElement = document.getElementById('submissionModal');
    if (modalElement && window.bootstrap?.Modal) {
        const modalInstance = window.bootstrap.Modal.getInstance(modalElement);
        if (modalInstance) modalInstance.hide();
    } else if (modalElement) {
        // Fallback hide
        modalElement.classList.remove('show');
        modalElement.style.display = 'none';
        document.body.classList.remove('modal-open');
    }
    // Resetting form here might be too soon if hide animation exists
    // Consider resetting in a 'hidden.bs.modal' event listener if using BS JS
};

// Function to handle project submission
const submitProject = async () => {
    if (!submissionForm.value.projectName || !submissionForm.value.link) {
        submissionError.value = 'Project Name and Link are required.';
        return;
    }
    if (!currentUserId.value) {
        submissionError.value = 'You must be logged in to submit.';
        return;
    }

    submissionError.value = '';
    isSubmittingProject.value = true;
    actionInProgress.value = true; // Use general flag

    try {
        const submissionData = {
            eventId: props.id,
            userId: currentUserId.value, // Submitted by the current user
            projectName: submissionForm.value.projectName,
            link: submissionForm.value.link,
            description: submissionForm.value.description,
            // submittedAt will be set by the action using server timestamp
        };

        // Dispatch action to handle adding submission (might add to event or team)
        await store.dispatch('submissions/addSubmission', submissionData);
        setGlobalFeedback('Project submitted successfully!', 'success');
        closeSubmissionModal();
        // Optionally trigger a refetch or rely on listener for updates
        // await fetchEventData(); 

    } catch (error) {
        console.error("Error submitting project:", error);
        submissionError.value = error.message || 'Failed to submit project.';
    } finally {
        isSubmittingProject.value = false;
        actionInProgress.value = false; // Release general flag
    }
};


// Function to handle feedback from TeamList component
const handleTeamRated = (feedback) => {
    setGlobalFeedback(feedback.message, feedback.type);
};

// Function to navigate to the rating form
const openTeamRatingForm = () => {
    if (currentUserCanRate.value) { // Double check condition
        router.push({ name: 'RatingForm', params: { eventId: props.id } }); 
    } else {
        setGlobalFeedback('You are not eligible to rate this event or ratings are closed.', 'error');
    }
};

// Lifecycle Hooks
onMounted(() => {
    fetchEventData(); // Fetch data when component mounts
    // Add listener for modal close event if using Bootstrap JS
    const modalElement = document.getElementById('submissionModal');
    if (modalElement) {
        modalElement.addEventListener('hidden.bs.modal', () => {
            // Reset form fields after modal is fully hidden
            submissionForm.value = { projectName: '', link: '', description: '' }; 
            submissionError.value = ''; 
        });
    }
});

// Watch for changes in event ID prop to refetch data
watch(() => props.id, (newId, oldId) => {
    if (newId !== oldId) {
        fetchEventData();
    }
});

// Cleanup listener on unmount
onUnmounted(() => {
     const modalElement = document.getElementById('submissionModal');
    if (modalElement) {
        // You might need to store the handler function to remove it correctly
        // For simplicity, this example doesn't store it.
        // If using BS5 API, cleanup might be handled automatically.
        // modalElement.removeEventListener('hidden.bs.modal', handlerFunction);
        const modalInstance = window.bootstrap?.Modal?.getInstance(modalElement);
        if (modalInstance) {
            modalInstance.dispose(); // Clean up BS modal instance
        }
    }
});

</script>

<style scoped>
.event-details-section {
  background-color: var(--bs-body-bg); /* Updated variable */
}

.event-display-box,
.team-list-box {
    padding: 0; /* Keep padding override */
}

/* participant-item hover handled by Bootstrap hover utilities if needed */

.text-decoration-underline-hover:hover {
    text-decoration: underline;
}

.text-break {
    word-break: break-all; /* Keep if BS doesn't cover it */
}

/* Removed rounded-md, use BS .rounded */

.transition-opacity {
    transition-property: opacity;
}
.duration-300 {
    transition-duration: 300ms;
}

/* Tailwind animate-fade-in equivalent */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
.animate-fade-in {
  animation: fadeIn 0.5s ease-out forwards;
}

/* Slide-fade transition for participants */
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

/* Fallback simple modal show/hide if Bootstrap JS is not integrated */
.modal:not(.show) {
    display: none;
    opacity: 0;
}
.modal.show {
    display: block; /* Or flex/grid depending on alignment needs */
    opacity: 1;
    /* Add backdrop styling if needed */
    background-color: rgba(0,0,0,0.5);
}

</style>
