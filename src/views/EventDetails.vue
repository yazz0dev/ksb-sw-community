// src/views/EventDetails.vue
<template>
    <!-- Use theme background, adjusted padding -->
    <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 bg-background min-h-[calc(100vh-8rem)]"> <!-- Updated bg; Added min-height to prevent jumpy footer -->
      <!-- Back Button -->
      <div class="mb-6">
        <button @click="$router.back()" class="inline-flex items-center px-3 py-2 border border-border rounded-md text-sm font-medium text-text-secondary hover:text-primary hover:bg-secondary-light transition-colors">
          <i class="fas fa-arrow-left mr-1.5"></i> Back
        </button>
      </div>
      
      <!-- Loading State: Centered with spinner -->
      <div v-if="loading" class="flex flex-col items-center justify-center py-16 text-text-secondary"> <!-- Updated text color -->
          <svg class="animate-spin h-10 w-10 text-primary mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p>Loading event details...</p>
      </div>
      <!-- Error State: Styled error box -->
      <div v-else-if="initialFetchError" class="rounded-md bg-error-light p-4 text-sm text-error-dark border border-error-light shadow-sm"> <!-- Updated error styles -->
        <i class="fas fa-exclamation-triangle mr-2"></i> Error: {{ initialFetchError }}
      </div>
      <!-- Not Found State: Styled info box -->
      <div v-else-if="!event" class="rounded-md bg-warning-light p-4 text-sm text-warning-dark border border-warning-light shadow-sm"> <!-- Updated warning styles -->
          <i class="fas fa-info-circle mr-2"></i> Event data not found or not yet loaded.
      </div>
      <!-- Main Content: Apply fade-in, space between cards -->
      <div v-else class="space-y-6 animate-fade-in">
          <!-- Event Display Card Section: Wrapped in styled container -->
          <div class="bg-surface shadow-md overflow-hidden rounded-lg border border-border"> <!-- Updated bg, border -->
            <div class="px-4 py-5 sm:p-6"> 
                 <EventDisplayCard :event="event" :nameCache="Object.fromEntries(nameCache)" :showStatus="true" />
            </div>
          </div>

          <!-- Event Management Controls - Add this section -->
          <EventManageControls
              v-if="canManageEvent"
              :event="event"
              class="mb-6"
          />

          <!-- Team List Section: Wrapped in styled container -->
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
              class="bg-surface shadow-md rounded-lg border border-border overflow-hidden" /> 
          
          <!-- Participants Section: Show only if NOT a team event -->
          <div v-if="!event.isTeamEvent" class="bg-surface shadow-md overflow-hidden rounded-lg border border-border">
            <div class="px-4 py-5 sm:p-6">
              <div class="flex justify-between items-center mb-4 border-b border-border pb-3">
                <h3 class="text-lg font-semibold leading-6 text-text-primary">Participants</h3>
                <button 
                  @click="showParticipants = !showParticipants"
                  class="inline-flex items-center px-3 py-1.5 border border-border shadow-sm text-xs font-medium rounded-md text-text-secondary bg-surface hover:bg-neutral-light focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary-light transition-colors">
                  <i :class="['fas w-3 transition-transform duration-200', showParticipants ? 'fa-chevron-up' : 'fa-chevron-down', 'mr-1.5']"></i>
                  {{ showParticipants ? 'Hide Participants' : `Show Participants (${participantCount})` }}
                </button>
              </div>
              
              <transition name="fade-fast">
                <div v-if="showParticipants" class="animate-fade-in">
                  <div v-if="organizerNamesLoading" class="py-3 text-sm text-text-secondary italic">
                    <i class="fas fa-spinner fa-spin mr-1"></i> Loading participants...
                  </div>
                  <div v-else-if="participantCount === 0" class="py-3 text-sm text-text-secondary italic">
                    No participants have joined this event yet.
                  </div>
                  <div v-else>
                    <ul role="list" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      <li v-for="userId in allParticipants" :key="userId"
                          class="flex items-center p-2 rounded-md transition-colors duration-150 border border-border"
                          :class="{ 'bg-primary-extraLight': userId === currentUserId }">
                        <i class="fas fa-user mr-2 text-text-secondary flex-shrink-0 w-4 text-center"></i>
                        <router-link
                          :to="{ name: 'PublicProfile', params: { userId } }"
                          class="text-sm text-text-primary hover:text-primary truncate"
                          :class="{'text-primary font-semibold': userId === currentUserId}">
                          {{ getUserNameFromCache(userId) || userId }} {{ userId === currentUserId ? '(You)' : '' }}
                        </router-link>
                      </li>
                    </ul>
                  </div>
                </div>
              </transition>
            </div>
          </div>

          <!-- Global Feedback Message Area -->
          <div v-if="globalFeedback.message"
               :class="[
                    'rounded-md p-4 text-sm mb-4 shadow-sm transition-opacity duration-300',
                    globalFeedback.type === 'success' ? 'bg-success-light text-success-dark border border-success-light' : 'bg-error-light text-error-dark border border-error-light' // Updated semantic colors
               ]"
               role="alert"
            >
              <i :class="['fas mr-2', globalFeedback.type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle']"></i>
              {{ globalFeedback.message }}
          </div>

          <!-- Submission Section: Wrapped in styled container -->
          <div class="bg-surface shadow-md overflow-hidden rounded-lg border border-border"> <!-- Updated bg, border -->
             <div class="px-4 py-5 sm:p-6"> <!-- Adjusted padding -->
                 <h3 class="text-lg font-semibold leading-6 text-text-primary mb-4 border-b border-border pb-3">Project Submissions</h3> <!-- Updated text color, border -->
                 
                 <!-- Individual Event Submissions -->
                 <div v-if="!event.isTeamEvent">
                    <div v-if="!event.submissions || event.submissions.length === 0" class="text-sm text-text-secondary italic">
                        No project submissions yet for this event.
                    </div>
                    <ul v-else class="space-y-4">
                        <li v-for="(submission, index) in event.submissions" :key="`ind-sub-${index}`" class="p-3 bg-background rounded-md border border-border-light">
                            <p class="text-sm font-medium text-text-primary">{{ submission.projectName }}</p>
                            <p class="text-xs text-text-secondary mb-1">Submitted by: {{ getUserNameFromCache(submission.submittedBy) || submission.submittedBy }}</p>
                            <a :href="submission.link" target="_blank" rel="noopener noreferrer" class="text-sm text-primary hover:underline break-all">{{ submission.link }}</a>
                            <p v-if="submission.description" class="mt-1 text-sm text-text-secondary">{{ submission.description }}</p>
                        </li>
                    </ul>
                 </div>

                 <!-- Team Event Submissions -->
                 <div v-else>
                    <div v-if="!teams || teams.length === 0 || teams.every(t => !t.submissions || t.submissions.length === 0)" class="text-sm text-text-secondary italic">
                        No project submissions yet for this event.
                    </div>
                    <div v-else class="space-y-5">
                        <div v-for="team in teams.filter(t => t.submissions && t.submissions.length > 0)" :key="`team-sub-${team.teamName}`">
                             <h4 class="text-md font-semibold text-text-secondary mb-2">Team: {{ team.teamName }}</h4>
                             <ul class="space-y-3 pl-4 border-l-2 border-border-light">
                                <li v-for="(submission, index) in team.submissions" :key="`team-${team.teamName}-sub-${index}`" class="p-3 bg-background rounded-md border border-border-light">
                                    <p class="text-sm font-medium text-text-primary">{{ submission.projectName }}</p>
                                     <p class="text-xs text-text-secondary mb-1">Submitted by: {{ getUserNameFromCache(submission.submittedBy) || submission.submittedBy }}</p>
                                    <a :href="submission.link" target="_blank" rel="noopener noreferrer" class="text-sm text-primary hover:underline break-all">{{ submission.link }}</a>
                                    <p v-if="submission.description" class="mt-1 text-sm text-text-secondary">{{ submission.description }}</p>
                                </li>
                             </ul>
                        </div>
                    </div>
                 </div>
             </div>
          </div>

          <!-- Rating Section -->
          <div class="bg-surface shadow-md overflow-hidden rounded-lg border border-border">
              <div class="px-4 py-5 sm:p-6">
                  <div class="flex items-center justify-between mb-4">
                      <h3 class="text-lg font-semibold leading-6 text-text-primary">Ratings</h3>
                      <div class="flex items-center">
                          <span 
                              class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                              :class="event.ratingsOpen ? 'bg-success-light text-success-dark' : 'bg-warning-light text-warning-dark'">
                              <i :class="['fas', 'mr-1', event.ratingsOpen ? 'fa-lock-open' : 'fa-lock']"></i>
                              {{ event.ratingsOpen ? 'Open' : 'Closed' }}
                          </span>
                          <span class="ml-2 text-xs text-text-disabled">({{ event.ratingsOpenCount }}/2 periods used)</span>
                      </div>
                  </div>
                   
                   <!-- Rest of the rating section content -->
                   <div v-if="event.status === 'Completed'">
                      <div v-if="event.ratingsOpen" class="text-sm text-success-dark bg-success-light p-3 rounded-md border border-success-light">
                          <i class="fas fa-star mr-1"></i> Ratings are currently open for this event.
                          <!-- Add link/button to rating form if applicable and user hasn't rated -->
                      </div>
                      <div v-else class="text-sm text-text-secondary italic">
                          Ratings are currently closed for this event.
                          <!-- Optionally display aggregated results here -->
                      </div>
                   </div>
                   <div v-else class="text-sm text-text-secondary italic">
                       Ratings will be available once the event is completed.
                   </div>
              </div>
          </div>

      </div>



      <!-- Submission Modal: Improved styling -->
      <div v-if="showSubmissionModal" class="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-60 flex items-center justify-center p-4 transition-opacity duration-300" @click.self="closeSubmissionModal"> <!-- Added background overlay and close on click outside -->
          <div ref="submissionModalRef" class="bg-surface rounded-lg shadow-xl max-w-lg w-full p-6 relative animate-fade-in"> <!-- Updated bg; Styled modal panel -->
              <button @click="closeSubmissionModal" class="absolute top-3 right-3 text-text-secondary hover:text-text-primary transition-colors"> <!-- Updated text colors -->
                  <i class="fas fa-times text-xl"></i>
                  <span class="sr-only">Close modal</span>
              </button>
              <h3 class="text-xl font-semibold text-text-primary mb-4">Submit Your Project</h3> <!-- Updated text color -->
              <form @submit.prevent="submitProject" class="space-y-4">
                  <div>
                      <label for="projectName" class="block text-sm font-medium text-text-secondary mb-1">Project Name <span class="text-error">*</span></label> <!-- Updated text color, error color -->
                      <input type="text" id="projectName" v-model="submissionForm.projectName" required class="mt-1 block w-full rounded-md border-border shadow-sm focus:border-primary focus:ring focus:ring-primary-light focus:ring-opacity-50 sm:text-sm"> <!-- Updated border -->
                  </div>
                  <div>
                      <label for="projectLink" class="block text-sm font-medium text-text-secondary mb-1">Project Link (GitHub, Demo, etc.) <span class="text-error">*</span></label> <!-- Updated text color, error color -->
                      <input type="url" id="projectLink" v-model="submissionForm.link" required placeholder="https://..." class="mt-1 block w-full rounded-md border-border shadow-sm focus:border-primary focus:ring focus:ring-primary-light focus:ring-opacity-50 sm:text-sm"> <!-- Updated border -->
                  </div>
                  <div>
                      <label for="projectDescription" class="block text-sm font-medium text-text-secondary mb-1">Brief Description</label> <!-- Updated text color -->
                      <textarea id="projectDescription" v-model="submissionForm.description" rows="3" class="mt-1 block w-full rounded-md border-border shadow-sm focus:border-primary focus:ring focus:ring-primary-light focus:ring-opacity-50 sm:text-sm"></textarea> <!-- Updated border -->
                  </div>
                  <p v-if="submissionError" class="text-sm text-error"><i class="fas fa-exclamation-circle mr-1"></i> {{ submissionError }}</p> <!-- Updated error color -->
                  <div class="pt-4 flex justify-end">
                      <button type="button" @click="closeSubmissionModal" class="mr-3 inline-flex justify-center rounded-md border border-border bg-surface px-4 py-2 text-sm font-medium text-text-secondary shadow-sm hover:bg-neutral-light focus:outline-none focus:ring-2 focus:ring-primary-light focus:ring-offset-2 transition-colors"> <!-- Updated secondary/outline button styles -->
                          Cancel
                      </button>
                      <button type="submit" :disabled="isSubmittingProject || actionInProgress"
                              class="inline-flex items-center justify-center rounded-md border border-transparent bg-primary px-4 py-2 text-sm font-medium text-primary-text shadow-sm hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"> <!-- Updated text color -->
                          <svg v-if="isSubmittingProject" class="animate-spin -ml-1 mr-2 h-4 w-4 text-primary-text" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"> <!-- Updated text color -->
                              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          {{ isSubmittingProject ? 'Submitting...' : 'Submit Project' }}
                      </button>
                  </div>
              </form>
          </div>
      </div>
      
      {/* Removed TeamRatingForm modal */}
    </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useStore } from 'vuex';
import { useRouter, useRoute } from 'vue-router';
import TeamList from '../components/TeamList.vue';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Timestamp } from 'firebase/firestore'; // Import Timestamp
import EventDisplayCard from '../components/EventDisplayCard.vue'; // Import the display card
import EventManageControls from '../components/EventManageControls.vue'; // Import EventManageControls
import AuthGuard from '../components/AuthGuard.vue'; // Import AuthGuard
// Removed import for TeamRatingForm

// Removed import for EventActionsNav


// Props, Store, Router
const props = defineProps({ id: { type: String, required: true } });
const store = useStore();
const router = useRouter();
const route = useRoute();

// Getters
const currentUserId = computed(() => store.getters['user/userId']);
const currentUserRole = computed(() => store.getters['user/userRole']);
const currentUser = computed(() => store.getters['user/getUser']);

// --- State Refs ---
const loading = ref(true);
const event = ref(null); // Holds reactive event data from store
const teams = ref([]); // Holds team data if applicable
const initialFetchError = ref(''); // Error during initial load
const nameCache = ref(new Map()); // Use Map for better performance
const organizerNamesLoading = ref(false);
const submissionModalRef = ref(null);
let submissionModalInstance = null;
const showSubmissionModal = ref(false);
const showParticipants = ref(false); // Control visibility of participants list
const submissionForm = ref({ projectName: '', link: '', description: '' });
const submissionError = ref(''); // Specific error for submission modal
const isSubmittingProject = ref(false);
const actionInProgress = ref(false); // Generic flag for any background action
const actionType = ref(''); // To identify which action is in progress
const globalFeedback = ref({ message: '', type: 'success' }); // type: 'success' or 'error'
// Removed showTeamRatingModal state

// Removed canRate computed property (will re-add if needed for button logic)

// Computed property to determine if the current user is an organizer
const isCurrentUserOrganizer = computed(() => {
    if (!event.value || !currentUserId.value) return false;
    // Check if user ID is in the organizers array OR if they are the requester
    return event.value.organizers?.includes(currentUserId.value) || event.value.requester === currentUserId.value;
});

// Determine if the bottom nav should be shown
const showBottomNav = computed(() => !!event.value);

// Get all participants from the event
const allParticipants = computed(() => {
    if (!event.value) return [];
    
    let participants = [];
    
    // For team events, collect all team members
    if (event.value.isTeamEvent && Array.isArray(event.value.teams)) {
        event.value.teams.forEach(team => {
            if (Array.isArray(team.members)) {
                participants = [...participants, ...team.members];
            }
        });
    }
    // For non-team events or additional participants
    else if (event.value.participants) {
        if (Array.isArray(event.value.participants)) {
            participants = [...participants, ...event.value.participants];
        } else if (typeof event.value.participants === 'object') {
            participants = [...participants, ...Object.keys(event.value.participants)];
        }
    }
    
    // Add organizers if they exist
    if (Array.isArray(event.value.organizers)) {
        participants = [...participants, ...event.value.organizers];
    }
    
    // Add requester if it exists
    if (event.value.requester) {
        participants.push(event.value.requester);
    }
    
    // Remove duplicates and return
    return [...new Set(participants)];
});

// Count of all participants
const participantCount = computed(() => allParticipants.value.length);

function setGlobalFeedback(message, type = 'success', duration = 4000) {
    globalFeedback.value = { message, type };
    if (duration > 0) {
        setTimeout(clearGlobalFeedback, duration);
    }
}
function clearGlobalFeedback() {
    globalFeedback.value = { message: '', type: 'success' };
}

// Function to pass down to TeamList for getting names from local cache
const getUserNameFromCache = (userId) => {
    return nameCache.value.get(userId) || userId; // Return ID if name not found
};

// --- Fetch User Names ---
async function fetchUserNames(userIds) {
    if (!Array.isArray(userIds) || userIds.length === 0) return;
    organizerNamesLoading.value = true;
    const uniqueIds = [...new Set(userIds)].filter(id => id && !nameCache.value.has(id));
    if (uniqueIds.length === 0) {
        organizerNamesLoading.value = false;
        return;
    }
    try {
        const names = await store.dispatch('user/fetchUserNamesBatch', uniqueIds); // Use Vuex action
        uniqueIds.forEach(id => {
            nameCache.value.set(id, names[id] || id); // Store fetched name or ID
        });
    } catch (error) {
        console.error("Error fetching user names batch:", error);
        uniqueIds.forEach(id => { if (!nameCache.value.has(id)) nameCache.value.set(id, id); });
    } finally {
        organizerNamesLoading.value = false;
    }
}

// --- Fetch Event and Related Data ---
async function fetchEventData() {
  loading.value = true;
  initialFetchError.value = '';
  try {
    // Fetch event data from Vuex store using the correct action name
    await store.dispatch('events/fetchEventDetails', props.id);
    
    // Get event directly from the dedicated state property after fetching
    const storeEvent = store.state.events.currentEventDetails; 
    
    // Ensure the fetched event matches the current route ID before proceeding
    if (!storeEvent || storeEvent.id !== props.id) { 
      initialFetchError.value = 'Event not found';
      return;
    }
    
    event.value = storeEvent;
    
    // Check if event is closed
    const isClosed = storeEvent.status === 'Completed' && !storeEvent.ratingsOpen;
    if (isClosed) {
      store.dispatch('app/setEventClosedState', { eventId: props.id, isClosed: true });
    }
    
    // Extract teams if it's a team event
    if (storeEvent.isTeamEvent && Array.isArray(storeEvent.teams)) {
      teams.value = [...storeEvent.teams];
    }
    
    // Collect user IDs to fetch names
    const userIdsToFetch = [];
    
    // Add organizers
    if (Array.isArray(storeEvent.organizers)) {
      userIdsToFetch.push(...storeEvent.organizers);
    }
    
    // Add requester
    if (storeEvent.requester) {
      userIdsToFetch.push(storeEvent.requester);
    }
    
    // Add team members if applicable
    if (storeEvent.isTeamEvent && Array.isArray(storeEvent.teams)) {
      storeEvent.teams.forEach(team => {
        if (Array.isArray(team.members)) {
          userIdsToFetch.push(...team.members);
        }
      });
    }
    
    // Add participants if applicable
    if (storeEvent.participants) {
      if (Array.isArray(storeEvent.participants)) {
        userIdsToFetch.push(...storeEvent.participants);
      } else if (typeof storeEvent.participants === 'object') {
        userIdsToFetch.push(...Object.keys(storeEvent.participants));
      }
    }
    
    // Fetch user names for all collected IDs
    await fetchUserNames(userIdsToFetch);
    
  } catch (error) {
    console.error('Error fetching event data:', error);
    initialFetchError.value = error.message || 'Failed to load event data';
  } finally {
    loading.value = false;
  }
}

const triggerSubmitModalOpen = () => {
    // Logic to open the submission modal (likely sets showSubmissionModal = true)
    showSubmissionModal.value = true;
};

const closeSubmissionModal = () => {
    showSubmissionModal.value = false;
    submissionForm.value = { projectName: '', link: '', description: '' }; // Reset form
    submissionError.value = ''; // Clear errors
};

// --- Actions ---
const submitProject = async () => {
    // Validate form
    if (!submissionForm.value.projectName || !submissionForm.value.link) {
        submissionError.value = 'Project Name and Link are required.';
        return;
    }
    submissionError.value = '';
    isSubmittingProject.value = true;

    try {
        // Prepare submission data
        const submissionData = {
            eventId: props.id,
            userId: currentUserId.value,
            // teamId: null, // Add if applicable for team submissions later
            projectName: submissionForm.value.projectName,
            link: submissionForm.value.link,
            description: submissionForm.value.description,
            submittedAt: Timestamp.now(),
        };

        // Dispatch Vuex action
        await store.dispatch('submissions/addSubmission', submissionData);

        setGlobalFeedback('Project submitted successfully!', 'success');
        closeSubmissionModal();
        // Optionally refresh submissions list if displayed directly

    } catch (error) {
        console.error("Error submitting project:", error);
        submissionError.value = error.message || 'Failed to submit project.';
    } finally {
        isSubmittingProject.value = false;
    }
};

const rateEventOrganization = async (rating) => {
    if (actionInProgress.value) return;
    actionInProgress.value = true;
    actionType.value = 'rateOrg';
    try {
        await store.dispatch('events/rateEventOrganization', { eventId: props.id, userId: currentUserId.value, rating });
        setGlobalFeedback('Organization rating submitted successfully!');
        // Update local event state if needed, or rely on store reactivity
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

const handleTeamRated = (feedback) => {
    setGlobalFeedback(feedback.message, feedback.type);
};

// --- Method to handle the Rate Teams button (Reverted) ---
const openTeamRatingForm = () => {
    // Navigate to the unified RatingForm view for team rating
    // Pass teamId as a param if needed by RatingForm.vue
    // For now, just navigate based on eventId. RatingForm will need logic to fetch team details if required.
    router.push({ name: 'RatingForm', params: { eventId: props.id } }); 
};

// Removed handleTeamRatingSubmitted method

// --- Lifecycle Hooks ---
onMounted(() => {
    fetchEventData(); // Fetch data when component mounts
    
    // Watch for route changes if needed (e.g., navigating between event details)
    // watch(() => props.id, fetchEventData);
});

const canManageEvent = computed(() => {
    if (!currentUser.value || !event.value) return false;
    return currentUser.value.role === 'Admin' || 
           (event.value.organizers || []).includes(currentUser.value.uid);
});

</script>

<style scoped>
/* Add component-specific styles if needed */
</style>
