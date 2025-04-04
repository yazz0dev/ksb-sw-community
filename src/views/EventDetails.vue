// src/views/EventDetails.vue
<template>
    <!-- Use theme background, adjusted padding -->
    <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 bg-secondary-light min-h-[calc(100vh-8rem)]"> <!-- Added min-height to prevent jumpy footer -->
      <!-- Loading State: Centered with spinner -->
      <div v-if="loading" class="flex flex-col items-center justify-center py-16 text-gray-500">
          <svg class="animate-spin h-10 w-10 text-primary mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p>Loading event details...</p>
      </div>
      <!-- Error State: Styled error box -->
      <div v-else-if="initialFetchError" class="rounded-md bg-red-100 p-4 text-sm text-red-800 border border-red-200 shadow-sm">
        <i class="fas fa-exclamation-triangle mr-2"></i> Error: {{ initialFetchError }}
      </div>
      <!-- Not Found State: Styled info box -->
      <div v-else-if="!event" class="rounded-md bg-yellow-100 p-4 text-sm text-yellow-800 border border-yellow-200 shadow-sm">
          <i class="fas fa-info-circle mr-2"></i> Event data not found or not yet loaded.
      </div>
      <!-- Main Content: Apply fade-in, space between cards -->
      <div v-else class="space-y-6 animate-fade-in">
          <!-- Event Display Card Section: Wrapped in styled container -->
          <div class="bg-white shadow-md overflow-hidden rounded-lg border border-secondary">
            <div class="px-4 py-5 sm:p-6"> <!-- Adjusted padding -->
                 <EventDisplayCard :event="event" :nameCache="Object.fromEntries(nameCache)" :showStatus="true" />
            </div>
          </div>

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
              class="bg-white shadow-md rounded-lg border border-secondary overflow-hidden" /> <!-- Added base styling, internal padding handled by component -->

          <!-- Global Feedback Message Area -->
          <div v-if="globalFeedback.message"
               :class="[
                    'rounded-md p-4 text-sm mb-4 shadow-sm transition-opacity duration-300',
                    globalFeedback.type === 'success' ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-red-100 text-red-800 border border-red-200'
               ]"
               role="alert"
            >
              <i :class="['fas mr-2', globalFeedback.type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle']"></i>
              {{ globalFeedback.message }}
          </div>

          <!-- Submission Section: Wrapped in styled container -->
          <div class="bg-white shadow-md overflow-hidden rounded-lg border border-secondary">
             <div class="px-4 py-5 sm:p-6"> <!-- Adjusted padding -->
                 <h3 class="text-lg font-semibold leading-6 text-gray-800 mb-4 border-b border-secondary pb-3">Project Submissions</h3>
                 <!-- Submission content placeholder -->
                 <p class="text-sm text-gray-500">Submission details will appear here.</p>
             </div>
          </div>

          <!-- Rating Section: Wrapped in styled container -->
          <div class="bg-white shadow-md overflow-hidden rounded-lg border border-secondary">
              <div class="px-4 py-5 sm:p-6"> <!-- Adjusted padding -->
                  <h3 class="text-lg font-semibold leading-6 text-gray-800 mb-4 border-b border-secondary pb-3">Ratings</h3>
                   <!-- Rating content placeholder -->
                   <p class="text-sm text-gray-500">Rating information will appear here.</p>
              </div>
          </div>

      </div>

      <!-- Commented out Bottom Nav for now -->
      <!-- ... -->

      <!-- Submission Modal: Improved styling -->
      <div v-if="showSubmissionModal" class="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-60 flex items-center justify-center p-4 transition-opacity duration-300" @click.self="closeSubmissionModal"> <!-- Added background overlay and close on click outside -->
          <div ref="submissionModalRef" class="bg-white rounded-lg shadow-xl max-w-lg w-full p-6 relative animate-fade-in"> <!-- Styled modal panel -->
              <button @click="closeSubmissionModal" class="absolute top-3 right-3 text-gray-400 hover:text-gray-600 transition-colors">
                  <i class="fas fa-times text-xl"></i>
                  <span class="sr-only">Close modal</span>
              </button>
              <h3 class="text-xl font-semibold text-gray-800 mb-4">Submit Your Project</h3>
              <form @submit.prevent="submitProject" class="space-y-4">
                  <div>
                      <label for="projectName" class="block text-sm font-medium text-gray-700 mb-1">Project Name <span class="text-red-500">*</span></label>
                      <input type="text" id="projectName" v-model="submissionForm.projectName" required class="mt-1 block w-full rounded-md border-secondary shadow-sm focus:border-primary focus:ring focus:ring-primary-light focus:ring-opacity-50 sm:text-sm">
                  </div>
                  <div>
                      <label for="projectLink" class="block text-sm font-medium text-gray-700 mb-1">Project Link (GitHub, Demo, etc.) <span class="text-red-500">*</span></label>
                      <input type="url" id="projectLink" v-model="submissionForm.link" required placeholder="https://..." class="mt-1 block w-full rounded-md border-secondary shadow-sm focus:border-primary focus:ring focus:ring-primary-light focus:ring-opacity-50 sm:text-sm">
                  </div>
                  <div>
                      <label for="projectDescription" class="block text-sm font-medium text-gray-700 mb-1">Brief Description</label>
                      <textarea id="projectDescription" v-model="submissionForm.description" rows="3" class="mt-1 block w-full rounded-md border-secondary shadow-sm focus:border-primary focus:ring focus:ring-primary-light focus:ring-opacity-50 sm:text-sm"></textarea>
                  </div>
                  <p v-if="submissionError" class="text-sm text-red-600"><i class="fas fa-exclamation-circle mr-1"></i> {{ submissionError }}</p>
                  <div class="pt-4 flex justify-end">
                      <button type="button" @click="closeSubmissionModal" class="mr-3 inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-light focus:ring-offset-2 transition-colors">
                          Cancel
                      </button>
                      <button type="submit" :disabled="isSubmittingProject || actionInProgress"
                              class="inline-flex items-center justify-center rounded-md border border-transparent bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                          <svg v-if="isSubmittingProject" class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                             <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                             <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          {{ isSubmittingProject ? 'Submitting...' : 'Submit Project' }}
                      </button>
                  </div>
              </form>
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
import { Timestamp } from 'firebase/firestore'; // Import Timestamp
import EventDisplayCard from '../components/EventDisplayCard.vue'; // Import the display card
// Removed import for EventActionsNav

// Props, Store, Router
const props = defineProps({ id: { type: String, required: true } });
const store = useStore();
const router = useRouter();
const route = useRoute();

// Getters
const currentUserId = computed(() => store.getters['user/userId']);
const currentUserRole = computed(() => store.getters['user/userRole']);

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
const submissionForm = ref({ projectName: '', link: '', description: '' });
const submissionError = ref(''); // Specific error for submission modal
const isSubmittingProject = ref(false);
const actionInProgress = ref(false); // Generic flag for any background action
const actionType = ref(''); // To identify which action is in progress
const globalFeedback = ref({ message: '', type: 'success' }); // type: 'success' or 'error'

// Computed property to determine if the current user is an organizer
const isCurrentUserOrganizer = computed(() => {
    if (!event.value || !currentUserId.value) return false;
    // Check if user ID is in the organizers array OR if they are the requester
    return event.value.organizers?.includes(currentUserId.value) || event.value.requester === currentUserId.value;
});

// Determine if the bottom nav should be shown
const showBottomNav = computed(() => !!event.value);

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
const fetchEventData = async () => {
    loading.value = true;
    initialFetchError.value = '';
    try {
        // Use Vuex action to get event by ID - UPDATED ACTION NAME
        const fetchedEvent = await store.dispatch('events/fetchEventDetails', props.id);

        if (!fetchedEvent) {
            throw new Error('Event not found.');
        }

        // Store the fetched event reactively
        event.value = fetchedEvent;
        teams.value = fetchedEvent.teams || []; // Ensure teams is an array

        // Gather all user IDs to fetch names for (requester, organizers)
        let userIdsToFetch = new Set();
        if (event.value.requester) userIdsToFetch.add(event.value.requester);
        if (event.value.organizers) event.value.organizers.forEach(id => userIdsToFetch.add(id));
        
        // Also fetch names for team members if it's a team event
        if (event.value.isTeamEvent && teams.value.length > 0) {
            teams.value.forEach(team => {
                if (team.members) team.members.forEach(memberId => userIdsToFetch.add(memberId));
            });
        }

        await fetchUserNames(Array.from(userIdsToFetch).filter(Boolean));

    } catch (error) {
        console.error("Failed to fetch event details:", error);
        initialFetchError.value = error.message || 'Failed to load event details. Please try again later.';
        event.value = null; // Clear event data on error
    } finally {
        loading.value = false;
    }
};

// --- Modal Handling ---
const triggerSubmitModalOpen = () => {
    // Logic to open the submission modal (likely sets showSubmissionModal = true)
    // You might need to initialize the modal instance here if using a library like Bootstrap
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

// --- Lifecycle Hooks ---
onMounted(() => {
    fetchEventData(); // Fetch data when component mounts
    
    // Watch for route changes if needed (e.g., navigating between event details)
    // watch(() => props.id, fetchEventData);
});

</script>

<style scoped>
/* Add component-specific styles if needed */
</style>


