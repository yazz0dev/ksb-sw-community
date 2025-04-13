// src/views/EventDetails.vue
<template>
    <div class="section event-details-view event-details-section">
      <div class="container is-max-desktop">
        <!-- Back Button -->
        <div class="mb-6">
          <button @click="$router.back()" class="button is-small is-outlined">
             <span class="icon is-small"><i class="fas fa-arrow-left"></i></span>
             <span>Back</span>
          </button>
        </div>
        
        <!-- Loading State -->
        <div v-if="loading" class="has-text-centered py-6">
           <div class="loader is-loading is-inline-block mb-3" style="height: 4rem; width: 4rem;"></div>
           <p class="has-text-grey">Loading event details...</p>
        </div>

        <!-- Error State -->
        <div v-else-if="initialFetchError" class="message is-danger">
          <div class="message-body">
             <span class="icon is-small mr-2"><i class="fas fa-exclamation-triangle"></i></span>
             Error: {{ initialFetchError }}
          </div>
        </div>

        <!-- Not Found State -->
        <div v-else-if="!event" class="message is-warning">
           <div class="message-body">
              <span class="icon is-small mr-2"><i class="fas fa-info-circle"></i></span>
              Event data not found or not yet loaded.
           </div>
        </div>

        <!-- Main Content -->
        <div v-else class="is-flex is-flex-direction-column animate-fade-in" style="gap: 1.5rem;"> 
            <!-- Event Display Card Section -->
            <div class="box event-display-box p-0">
                <EventDisplayCard :event="event" :nameCache="Object.fromEntries(nameCache)" :showStatus="true" />
            </div>

            <!-- Event Management Controls -->
            <EventManageControls
                v-if="canManageEvent"
                :event="event"
                class="mb-0" 
            />

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
                class="box team-list-box p-0" /> 
            
            <!-- Participants Section (Non-Team Events) -->
            <div v-if="!event.isTeamEvent" class="box participants-box">
                <div class="is-flex is-justify-content-space-between is-align-items-center mb-4 pb-3" style="border-bottom: 1px solid var(--color-border);">
                    <h3 class="title is-5 mb-0">Participants</h3>
                    <button 
                        @click="showParticipants = !showParticipants"
                        class="button is-small is-outlined"
                    >
                        <span class="icon is-small">
                           <i class="fas transition-transform duration-200" :class="showParticipants ? 'fa-chevron-up' : 'fa-chevron-down'"></i>
                        </span>
                        <span>{{ showParticipants ? 'Hide' : `Show (${participantCount})` }}</span>
                    </button>
                </div>
                
                <Transition name="slide-fade">
                    <div v-if="showParticipants" class="animate-fade-in">
                        <div v-if="organizerNamesLoading" class="has-text-grey is-italic py-3">
                            <span class="icon is-small"><i class="fas fa-spinner fa-spin"></i></span> Loading participants...
                        </div>
                        <p v-else-if="participantCount === 0" class="has-text-grey is-italic py-3">
                            No participants have joined this event yet.
                        </p>
                        <div v-else>
                           <div class="columns is-multiline is-mobile is-variable is-2">
                              <div v-for="userId in allParticipants" :key="userId" class="column is-half-mobile is-one-third-tablet">
                                 <div 
                                    class="participant-item is-flex is-align-items-center p-2 rounded-md transition-colors duration-150"
                                    :style="{ border: '1px solid var(--color-border)', backgroundColor: userId === currentUserId ? 'var(--color-primary-extralight)' : 'transparent' }"
                                  >
                                     <span class="icon is-small has-text-grey mr-2"><i class="fas fa-user"></i></span>
                                     <router-link
                                       :to="{ name: 'PublicProfile', params: { userId } }"
                                       class="is-size-7 is-truncated"
                                       :class="{'has-text-primary has-text-weight-semibold': userId === currentUserId, 'has-text-link': userId !== currentUserId }"
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

            <!-- Global Feedback Message Area -->
            <div v-if="globalFeedback.message" 
                 class="message is-small mb-0 transition-opacity duration-300"
                 :class="globalFeedback.type === 'success' ? 'is-success' : 'is-danger'"
                 role="alert"
              >
                 <div class="message-body is-flex is-align-items-center">
                    <span class="icon is-small mr-2"><i class="fas" :class="globalFeedback.type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'"></i></span>
                    {{ globalFeedback.message }}
                 </div>
            </div>

            <!-- Submission Section -->
            <div class="box submissions-box">
               <h3 class="title is-5 mb-4 pb-3" style="border-bottom: 1px solid var(--color-border);">Project Submissions</h3>
               
               <!-- Individual Event Submissions -->
               <div v-if="!event.isTeamEvent">
                  <p v-if="!event.submissions || event.submissions.length === 0" class="is-size-7 has-text-grey is-italic">
                      No project submissions yet for this event.
                  </p>
                  <ul v-else class="is-flex is-flex-direction-column" style="gap: 1rem;">
                      <li v-for="(submission, index) in event.submissions" :key="`ind-sub-${index}`" class="submission-item p-3 rounded-md" style="background-color: var(--color-background); border: 1px solid var(--color-border-light);">
                          <p class="is-size-6 has-text-weight-medium has-text-primary">{{ submission.projectName }}</p>
                          <p class="is-size-7 has-text-grey mb-1">Submitted by: {{ getUserNameFromCache(submission.submittedBy) || submission.submittedBy }}</p>
                          <a :href="submission.link" target="_blank" rel="noopener noreferrer" class="is-size-7 has-text-link is-underlined-hover break-all">{{ submission.link }}</a>
                          <p v-if="submission.description" class="mt-1 is-size-7 has-text-grey">{{ submission.description }}</p>
                      </li>
                  </ul>
               </div>

               <!-- Team Event Submissions -->
               <div v-else>
                  <p v-if="!teams || teams.length === 0 || teams.every(t => !t.submissions || t.submissions.length === 0)" class="is-size-7 has-text-grey is-italic">
                      No project submissions yet for this event.
                  </p>
                  <div v-else class="is-flex is-flex-direction-column" style="gap: 1.5rem;">
                      <div v-for="team in teams.filter(t => t.submissions && t.submissions.length > 0)" :key="`team-sub-${team.teamName}`">
                           <h4 class="title is-6 has-text-grey mb-2">Team: {{ team.teamName }}</h4>
                           <ul class="is-flex is-flex-direction-column ml-4 pl-4" style="gap: 0.75rem; border-left: 2px solid var(--color-border-light);">
                              <li v-for="(submission, index) in team.submissions" :key="`team-${team.teamName}-sub-${index}`" class="submission-item p-3 rounded-md" style="background-color: var(--color-background); border: 1px solid var(--color-border-light);">
                                  <p class="is-size-6 has-text-weight-medium has-text-primary">{{ submission.projectName }}</p>
                                   <p class="is-size-7 has-text-grey mb-1">Submitted by: {{ getUserNameFromCache(submission.submittedBy) || submission.submittedBy }}</p>
                                  <a :href="submission.link" target="_blank" rel="noopener noreferrer" class="is-size-7 has-text-link is-underlined-hover break-all">{{ submission.link }}</a>
                                  <p v-if="submission.description" class="mt-1 is-size-7 has-text-grey">{{ submission.description }}</p>
                              </li>
                           </ul>
                      </div>
                  </div>
               </div>
            </div>

            <!-- Rating Section -->
            <div class="box ratings-box">
                <div class="is-flex is-align-items-center is-justify-content-space-between mb-4">
                    <h3 class="title is-5 mb-0">Ratings</h3>
                    <div class="is-flex is-align-items-center">
                        <span 
                            class="tag is-rounded is-small"
                            :class="event.ratingsOpen ? 'is-success' : 'is-warning'">
                            <span class="icon is-small mr-1"><i class="fas" :class="event.ratingsOpen ? 'fa-lock-open' : 'fa-lock'"></i></span>
                            {{ event.ratingsOpen ? 'Open' : 'Closed' }}
                        </span>
                        <span class="ml-2 is-size-7 has-text-grey-light">({{ event.ratingsOpenCount }}/2 periods used)</span>
                    </div>
                </div>
                 
                 <!-- Rating section content -->
                 <div v-if="event.status === 'Completed'">
                    <div v-if="event.ratingsOpen" class="message is-success is-small">
                       <div class="message-body is-flex is-align-items-center">
                          <span class="icon is-small mr-1"><i class="fas fa-star"></i></span> Ratings are currently open for this event.
                          <!-- TODO: Add link/button to rating form if applicable and user hasn't rated -->
                       </div>
                    </div>
                    <p v-else class="is-size-7 has-text-grey is-italic">
                        Ratings are currently closed for this event.
                        <!-- Optionally display aggregated results here -->
                    </p>
                 </div>
                 <p v-else class="is-size-7 has-text-grey is-italic">
                     Ratings will be available once the event is completed.
                 </p>
            </div>

        </div>

        <!-- Submission Modal -->
        <div class="modal" :class="{ 'is-active': showSubmissionModal }">
          <div class="modal-background" @click="closeSubmissionModal"></div>
          <div class="modal-card submission-modal-card" ref="submissionModalRef" style="max-width: 520px;">
              <header class="modal-card-head">
                <p class="modal-card-title is-size-5">Submit Your Project</p>
                <button class="delete" aria-label="close" @click="closeSubmissionModal"></button>
              </header>
              <section class="modal-card-body">
                 <form @submit.prevent="submitProject" class="is-flex is-flex-direction-column" style="gap: 1rem;">
                    <div class="field">
                        <label for="projectName" class="label is-small">Project Name <span class="has-text-danger">*</span></label>
                        <div class="control">
                           <input type="text" id="projectName" v-model="submissionForm.projectName" required class="input is-small">
                        </div>
                    </div>
                    <div class="field">
                        <label for="projectLink" class="label is-small">Project Link (GitHub, Demo, etc.) <span class="has-text-danger">*</span></label>
                        <div class="control">
                            <input type="url" id="projectLink" v-model="submissionForm.link" required placeholder="https://..." class="input is-small">
                        </div>
                    </div>
                    <div class="field">
                        <label for="projectDescription" class="label is-small">Brief Description</label>
                        <div class="control">
                            <textarea id="projectDescription" v-model="submissionForm.description" rows="3" class="textarea is-small"></textarea>
                        </div>
                    </div>
                    <p v-if="submissionError" class="help is-danger is-flex is-align-items-center"><span class="icon is-small mr-1"><i class="fas fa-exclamation-circle"></i></span> {{ submissionError }}</p>
                 </form>
              </section>
              <footer class="modal-card-foot is-justify-content-flex-end">
                  <button type="button" @click="closeSubmissionModal" class="button is-small">
                      Cancel
                  </button>
                  <button 
                    type="button" 
                    @click="submitProject" 
                    :disabled="isSubmittingProject || actionInProgress"
                    class="button is-primary is-small"
                    :class="{ 'is-loading': isSubmittingProject }"
                  >
                      {{ isSubmittingProject ? 'Submitting...' : 'Submit Project' }}
                  </button>
              </footer>
          </div>
        </div>
      </div> 
    </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useStore } from 'vuex';
import { useRouter, useRoute } from 'vue-router';
import TeamList from '../components/TeamList.vue';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Timestamp } from 'firebase/firestore';
import EventDisplayCard from '../components/EventDisplayCard.vue';
import EventManageControls from '../components/EventManageControls.vue';
import AuthGuard from '../components/AuthGuard.vue';

// Props, Store, Router
const props = defineProps({ id: { type: String, required: true } });
const store = useStore();
const router = useRouter();
const route = useRoute();

// Getters
const currentUserId = computed(() => store.getters['user/userId']);
const currentUserRole = computed(() => store.getters['user/userRole']);
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
const actionInProgress = ref(false);
const actionType = ref('');
const globalFeedback = ref({ message: '', type: 'success' });


// Computed property: Is current user an organizer or admin?
const isCurrentUserOrganizer = computed(() => {
    if (!event.value || !currentUserId.value) return false;
    return (event.value.organizers || []).includes(currentUserId.value) || event.value.requester === currentUserId.value;
});

// Computed property: Can the current user manage this event? (Admin or Organizer)
const canManageEvent = computed(() => {
    if (!currentUser.value || !event.value) return false;
    return currentUser.value.role === 'Admin' || isCurrentUserOrganizer.value;
});

// Removed showBottomNav computed property as it wasn't used

// Computed property: Get all unique participant/organizer/requester IDs
const allParticipants = computed(() => {
    if (!event.value) return [];
    const userIds = new Set();
    if (event.value.requester) userIds.add(event.value.requester);
    if (Array.isArray(event.value.organizers)) event.value.organizers.forEach(id => userIds.add(id));
    
    if (event.value.isTeamEvent && Array.isArray(event.value.teams)) {
        event.value.teams.forEach(team => {
            if (Array.isArray(team.members)) team.members.forEach(id => userIds.add(id));
        });
    } else if (Array.isArray(event.value.participants)) {
        event.value.participants.forEach(id => userIds.add(id));
    } else if (typeof event.value.participants === 'object' && event.value.participants !== null) {
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
    return nameCache.value.get(userId) || userId; // Return ID if name not found
};

// Function to fetch names for a list of user IDs
async function fetchUserNames(userIds) {
    if (!Array.isArray(userIds) || userIds.length === 0) return;
    organizerNamesLoading.value = true;
    const uniqueIds = [...new Set(userIds)].filter(id => id && !nameCache.value.has(id)); // Ensure IDs are valid
    if (uniqueIds.length === 0) {
        organizerNamesLoading.value = false;
        return;
    }
    try {
        const names = await store.dispatch('user/fetchUserNamesBatch', uniqueIds);
        uniqueIds.forEach(id => {
            nameCache.value.set(id, names[id] || `User (${id.substring(0, 5)}...)`); // Use ID snippet if name missing
        });
    } catch (error) {
        console.error("Error fetching user names batch:", error);
        uniqueIds.forEach(id => { if (!nameCache.value.has(id)) nameCache.value.set(id, `Error (${id.substring(0, 5)}...)`); });
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
      event.value = null; // Ensure event is nullified
      teams.value = []; // Clear teams
      return;
    }
    
    event.value = storeEvent;
    teams.value = (storeEvent.isTeamEvent && Array.isArray(storeEvent.teams)) ? [...storeEvent.teams] : [];
    
    // Check and dispatch closed state if applicable
    const isClosed = storeEvent.status === 'Completed' && !storeEvent.ratingsOpen;
    if (isClosed) {
      store.dispatch('app/setEventClosedState', { eventId: props.id, isClosed: true });
    }
    
    // Fetch names for all relevant users
    await fetchUserNames(allParticipants.value); // Use computed property directly
    
  } catch (error) {
    console.error('Error fetching event data:', error);
    initialFetchError.value = error.message || 'Failed to load event data';
    event.value = null; // Nullify on error
    teams.value = [];
  } finally {
    loading.value = false;
  }
}

// Function to open the submission modal
const triggerSubmitModalOpen = () => {
    showSubmissionModal.value = true;
};

// Function to close the submission modal
const closeSubmissionModal = () => {
    showSubmissionModal.value = false;
    submissionForm.value = { projectName: '', link: '', description: '' }; // Reset form
    submissionError.value = ''; // Clear errors
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

    try {
        const submissionData = {
            eventId: props.id,
            userId: currentUserId.value,
            projectName: submissionForm.value.projectName,
            link: submissionForm.value.link,
            description: submissionForm.value.description,
            submittedAt: Timestamp.now(), // Use Firestore Timestamp
        };

        await store.dispatch('submissions/addSubmission', submissionData);
        setGlobalFeedback('Project submitted successfully!', 'success');
        closeSubmissionModal();
        // Re-fetch event data to show new submission? Or rely on listener?
        // await fetchEventData(); 

    } catch (error) {
        console.error("Error submitting project:", error);
        submissionError.value = error.message || 'Failed to submit project.';
    } finally {
        isSubmittingProject.value = false;
    }
};

// Function to handle rating event organization (placeholder)
const rateEventOrganization = async (rating) => {
    // Implementation remains the same
    if (actionInProgress.value) return;
    actionInProgress.value = true;
    actionType.value = 'rateOrg';
    try {
        await store.dispatch('events/rateEventOrganization', { eventId: props.id, userId: currentUserId.value, rating });
        setGlobalFeedback('Organization rating submitted successfully!');
        if (event.value?.organizationRatings) {
             event.value.organizationRatings[currentUserId.value] = rating;
        }
    } catch (error) {
        console.error("Error submitting organization rating:", error);
        setGlobalFeedback(error.message || 'Failed to submit rating.', 'error');
    } finally {
        actionInProgress.value = false;
        actionType.value = '';
    }
};

// Function to handle feedback from TeamList component
const handleTeamRated = (feedback) => {
    setGlobalFeedback(feedback.message, feedback.type);
};

// Function to navigate to the rating form
const openTeamRatingForm = () => {
    router.push({ name: 'RatingForm', params: { eventId: props.id } }); 
};

// Lifecycle Hooks
onMounted(() => {
    fetchEventData(); // Fetch data when component mounts
});

// Watch for changes in event ID prop to refetch data
watch(() => props.id, fetchEventData);

</script>

<style scoped>
.event-details-section {
  background-color: var(--color-background);
}

.event-details-view .box {
    background-color: var(--color-surface);
    border: 1px solid var(--color-border);
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
}

.event-details-view .box:not(:last-child) {
    margin-bottom: 1.5rem; /* consistent spacing */
}

.event-display-box,
.team-list-box {
    padding: 0; /* Remove default box padding if content handles it */
}

.participant-item:hover {
   background-color: var(--color-neutral-light) !important; 
}

.is-underlined-hover:hover {
    text-decoration: underline;
}

.break-all {
    word-break: break-all;
}

.rounded-md {
  border-radius: 0.375rem; /* 6px */
}

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

/* Loader styling */
.loader {
    border: 5px solid var(--color-border-light);
    border-left-color: var(--color-primary);
    border-radius: 50%;
    width: 3em;
    height: 3em;
}

.submission-modal-card .modal-card-head,
.submission-modal-card .modal-card-foot {
   background-color: var(--color-surface-variant);
   border-color: var(--color-border);
}

.submission-modal-card .modal-card-body {
   background-color: var(--color-surface);
}

</style>
