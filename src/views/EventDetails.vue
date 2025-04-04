// src/views/EventDetails.vue
<template>
    <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6"> <!-- Container -->
      <div class="flex flex-wrap justify-between items-center gap-4 mb-6"> <!-- Header Flexbox -->
         <h2 class="text-2xl font-bold text-gray-900">Manage Event Requests</h2>
         <div class="flex space-x-2"> <!-- Button Group -->
             <button
                class="inline-flex items-center rounded-md bg-white px-3 py-1.5 text-xs font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                @click="$router.push('/home')">
                 <i class="fas fa-arrow-left mr-1 h-3 w-3"></i> Back to Dashboard
             </button>
             <router-link
                to="/request-event"
                class="inline-flex items-center rounded-md bg-green-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-green-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600">
                 <i class="fas fa-calendar-plus mr-1 h-3 w-3"></i> Create Event
             </router-link>
         </div>
      </div>

      <div v-if="loading" class="flex justify-center py-10">
          <svg class="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
      </div>
      <div v-else-if="pendingEvents.length === 0" class="rounded-md bg-blue-50 p-4 text-sm text-blue-700 border border-blue-200">
          No pending requests to review at this time.
      </div>
      <div v-else class="space-y-4"> <!-- List container -->
        <div v-for="event in pendingEvents" :key="event.id" class="bg-white shadow overflow-hidden sm:rounded-lg p-4 sm:p-6 border border-gray-200">
            <div class="flex flex-col md:flex-row justify-between md:items-start gap-4">
                <div class="flex-1 min-w-0">
                   <h3 class="text-lg font-semibold text-gray-900 mb-1">{{ event.eventName }} <span class="font-normal text-gray-600">({{ event.eventType }})</span></h3>
                   <p class="text-xs text-gray-500 mb-0.5"><strong class="font-medium text-gray-700 mr-1">Requested by:</strong> {{ nameCache[event.requester] || '(Name not found)' }}</p>
                   <p class="text-xs text-gray-500 mb-0.5"><strong class="font-medium text-gray-700 mr-1">Desired Dates:</strong> {{ formatDate(event.desiredStartDate) }} - {{ formatDate(event.desiredEndDate) }}</p>
                   <p class="text-xs text-gray-500 mb-0.5"><strong class="font-medium text-gray-700 mr-1">Team Event:</strong> {{ event.isTeamEvent ? 'Yes' : 'No' }}</p>
                   <p v-if="event.organizers && event.organizers.length > 0" class="text-xs text-gray-500 mb-1">
                       <strong class="font-medium text-gray-700">Co-Organizers:</strong>
                       <span v-for="(orgId, idx) in event.organizers" :key="orgId">
                           {{ nameCache[orgId] || '(Name not found)' }}{{ idx < event.organizers.length - 1 ? ', ' : '' }}
                       </span>
                   </p>
                   <p class="text-sm text-gray-600 mb-2 mt-1"><strong class="font-medium text-gray-700">Description:</strong> {{ event.description }}</p>
                   <!-- Display XP/Constraint Info -->
                   <div v-if="event.xpAllocation && event.xpAllocation.length > 0" class="mt-2 text-xs">
                       <strong class="block mb-1 font-medium text-gray-700">Rating Criteria & XP:</strong>
                       <ul class="list-disc list-inside space-y-0.5 text-gray-600 pl-2">
                           <li v-for="(alloc, index) in event.xpAllocation" :key="index">
                               {{ alloc.constraintLabel || 'Unnamed Criteria' }}: {{ alloc.points }} XP ({{ formatRoleName(alloc.role) }})
                           </li>
                       </ul>
                   </div>
                </div>
                <div class="flex space-x-2 items-start flex-shrink-0 mt-2 md:mt-0">
                     <button @click="approveRequest(event.id)"
                             class="inline-flex items-center justify-center rounded-md bg-green-600 px-2.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-green-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                             :disabled="isProcessing(event.id)">
                         <svg v-if="isProcessing(event.id) && processingAction === 'approve'" class="animate-spin h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                         <i v-else class="fas fa-check h-3 w-3"></i>
                         <span class="ml-1 hidden sm:inline">Approve</span>
                     </button>
                     <button @click="rejectRequest(event.id)"
                             class="inline-flex items-center justify-center rounded-md bg-yellow-500 px-2.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-yellow-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed"
                             :disabled="isProcessing(event.id)">
                         <svg v-if="isProcessing(event.id) && processingAction === 'reject'" class="animate-spin h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                         <i v-else class="fas fa-times h-3 w-3"></i>
                         <span class="ml-1 hidden sm:inline">Reject</span>
                     </button>
                     <button @click="deleteRequest(event.id)"
                             class="inline-flex items-center justify-center rounded-md bg-red-600 px-2.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-red-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                             :disabled="isProcessing(event.id)">
                         <svg v-if="isProcessing(event.id) && processingAction === 'delete'" class="animate-spin h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                         <i v-else class="fas fa-trash h-3 w-3"></i>
                         <span class="ml-1 hidden sm:inline">Delete</span>
                     </button>
                 </div>
            </div>
            <!-- Conflict Warning -->
            <div v-if="conflictWarnings[event.id]" class="mt-2 rounded-md bg-yellow-50 p-2 text-xs text-yellow-700 border border-yellow-200">
                <i class="fas fa-exclamation-triangle mr-1"></i>
                Warning: Date conflict with "{{ conflictWarnings[event.id] }}"
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
import { Timestamp } from 'firebase/firestore'; // Import Timestamp

// Props, Store, Router
const props = defineProps({ id: { type: String, required: true } });
const store = useStore();
const router = useRouter();
const route = useRoute();

// --- State Refs ---
const loading = ref(true);
const event = ref(null); // Holds reactive event data from store
const initialFetchError = ref(''); // Error during initial load
const linkCopied = ref(false);
const nameCache = ref(new Map()); // Use Map for better performance
const teamNameCache = ref(new Map()); // Cache for team names by ID if needed
const organizerNamesLoading = ref(false);
const submissionModalRef = ref(null);
let submissionModalInstance = null;
const showSubmissionModal = ref(false);
const submissionForm = ref({ projectName: '', link: '', description: '' });
const submissionError = ref(''); // Specific error for submission modal
const isSubmittingProject = ref(false);
const loadingSubmissions = ref(false);
const actionInProgress = ref(false); // Generic flag for any background action
const actionType = ref(''); // To identify which action is in progress
const orgRatingFeedback = ref({ message: '', type: 'success' }); // Feedback for org rating
const organizationRatingScore = ref(null); // v-model for org rating input
const isSubmittingOrgRating = ref(false); // Loading state for org rating submission

// Global Feedback (for actions like status update, delete, etc.)
const globalFeedback = ref({ message: '', type: 'success' }); // type: 'success' or 'error'

// Determine if the bottom nav should be shown (based on screen size potentially, but for now, always true if event data exists)
const showBottomNav = computed(() => {
    // Basic check: We need event data to show relevant actions.
    // In a real app, you might also check screen width here or rely purely on CSS hiding.
    return !!event.value;
});

function setGlobalFeedback(message, type = 'success', duration = 4000) {
    globalFeedback.value = { message, type };
    if (duration > 0) {
        setTimeout(clearGlobalFeedback, duration);
    }
}
function clearGlobalFeedback() {
    globalFeedback.value = { message: '', type: 'success' };
}

// Available Roles (Match RequestEvent.vue)
const availableRoles = [
    { value: 'fullstack', label: 'Full Stack Developer' },
    { value: 'presenter', label: 'Presenter' },
    { value: 'designer', label: 'Designer' },
    { value: 'problemSolver', label: 'Problem Solver' },
    { value: 'general', label: 'General' }
];

// --- Fetch User Names ---
async function fetchUserNames(userIds) {
    if (!Array.isArray(userIds) || userIds.length === 0) return;
    organizerNamesLoading.value = true;
    const uniqueIds = [...new Set(userIds)].filter(id => id && !nameCache.value.has(id));
    if (uniqueIds.length === 0) {
        organizerNamesLoading.value = false;
        return;
    }

    // console.log("Fetching names for IDs:", uniqueIds);

    try {
        const chunkSize = 30; // Firestore 'in' query limit
        for (let i = 0; i < uniqueIds.length; i += chunkSize) {
            const chunk = uniqueIds.slice(i, i + chunkSize);
            // console.log(`Fetching chunk ${i / chunkSize + 1}:`, chunk);
            if (chunk.length > 0) {
                // Use the Vuex action which might handle batching or individual fetches
                const names = await store.dispatch('user/fetchUserNamesBatch', chunk); // Assuming this action exists
                // Update local cache
                chunk.forEach(id => {
                    nameCache.value.set(id, names[id] || id); // Store fetched name or ID as fallback
                });
            }
        }
    } catch (error) {
        console.error("Error fetching user names batch:", error);
        // Fallback: set IDs in cache to prevent repeated failed fetches
        uniqueIds.forEach(id => { if (!nameCache.value.has(id)) nameCache.value.set(id, id); });
    } finally {
        organizerNamesLoading.value = false;
    }
}

// --- Watch Store Getter for Event Data ---
const eventFromStore = computed(() => store.getters['events/currentEventDetails']);

watch(eventFromStore, (newEventData) => {
    // console.log("Watcher: eventFromStore updated", newEventData);
    if (newEventData && newEventData.id === props.id) {
        event.value = newEventData;

        // Collect all relevant user IDs from the new event data
        const idsToFetch = new Set();
        (newEventData.organizers || []).forEach(id => idsToFetch.add(id));
        // Add requester if not already an organizer (relevant for pending/rejected)
        if (newEventData.requester) idsToFetch.add(newEventData.requester);
        (newEventData.participants || []).forEach(id => idsToFetch.add(id));
        (newEventData.teams || []).forEach(team => (team.members || []).forEach(id => idsToFetch.add(id)));
        // Collect submitter IDs (handle both team and individual)
        if (newEventData.isTeamEvent) {
            (newEventData.teams || []).forEach(team => (team.submissions || []).forEach(s => { if (s.submittedBy) idsToFetch.add(s.submittedBy); })); // Team submissions store submitter ID
        } else {
            (newEventData.submissions || []).forEach(sub => { if (sub.submittedBy) idsToFetch.add(sub.submittedBy); }); // Individual submissions store submitter ID
        }
        (newEventData.winners || []).forEach(id => idsToFetch.add(id)); // Add legacy winners
        Object.values(newEventData.winnersPerRole || {}).flat().forEach(id => idsToFetch.add(id)); // Add role-based winners
        (newEventData.ratings || []).forEach(rating => idsToFetch.add(rating.ratedBy)); // Add raters
        (newEventData.teams || []).forEach(team => (team.ratings || []).forEach(rating => idsToFetch.add(rating.ratedBy))); // Add team raters

        fetchUserNames(Array.from(idsToFetch)); // Fetch names based on updated IDs
        loading.value = false; // Ensure loading stops
        initialFetchError.value = ''; // Clear initial error if data is now present
    } else if (!loading.value && eventFromStore.value?.id !== props.id) {
        // Handle case where store details change to a *different* event or becomes null
        // console.log("Watcher: Event in store is different or null");
        // Don't set event.value to null immediately, wait for fetchAndSetEventInitial if needed
        // or let the initial fetch handle not found cases.
        // Maybe set loading to true again if we expect a new fetch?
        // loading.value = true; // Re-enable loading if navigating between event pages
    }
}, { immediate: true, deep: true });

// --- Initial Fetch Function ---
const fetchAndSetEventInitial = async () => {
    loading.value = true;
    initialFetchError.value = '';
    clearGlobalFeedback();
    try {
        // console.log(`Initial fetch for event ID: ${props.id}`);
        const eventData = await store.dispatch('events/fetchEventDetails', props.id);
        if (!eventData) {
            // console.log(`Event ${props.id} not found during initial fetch.`);
            initialFetchError.value = `Event with ID ${props.id} not found or access denied.`;
            event.value = null; // Explicitly set to null if not found
            // No need to fetch names if event is not found
        } else {
             // Watcher will handle setting event.value and fetching names
             // console.log(`Event ${props.id} found, watcher should handle it.`);
             // If the watcher didn't trigger immediately (e.g., cached data was identical but we need fresh names)
             // We might need to manually trigger name fetching here. Check if event.value is set by watcher.
            if (!event.value || event.value.id !== props.id) {
                 event.value = eventData; // Manually set if watcher missed it
                 const userIds = new Set();
                 (eventData.organizers || []).forEach(id => userIds.add(id));
                 if (eventData.requester) userIds.add(eventData.requester);
                 (eventData.participants || []).forEach(id => userIds.add(id));
                 (eventData.teams || []).forEach(team => (team.members || []).forEach(id => userIds.add(id)));
                // Add submitters, winners, raters as in the watcher
                 if (eventData.isTeamEvent) {
                    (eventData.teams || []).forEach(team => (team.submissions || []).forEach(s => { if (s.submittedBy) userIds.add(s.submittedBy); }));
                 } else {
                     (eventData.submissions || []).forEach(sub => { if (sub.submittedBy) userIds.add(sub.submittedBy); });
                 }
                 (eventData.winners || []).forEach(id => userIds.add(id));
                 Object.values(eventData.winnersPerRole || {}).flat().forEach(id => userIds.add(id));
                 (eventData.ratings || []).forEach(rating => userIds.add(rating.ratedBy));
                 (eventData.teams || []).forEach(team => (team.ratings || []).forEach(rating => userIds.add(rating.ratedBy)));

                await fetchUserNames(Array.from(userIds));
            }
        }
    } catch (error) {
        console.error('Error fetching event:', error);
        initialFetchError.value = error.message || 'Failed to load event details.';
        event.value = null;
    } finally {
        loading.value = false;
    }
};

// --- Lifecycle Hooks ---
onMounted(async () => {
    await fetchAndSetEventInitial(); // Fetch data when component mounts
    // Modal setup
    if (submissionModalRef.value) {
        submissionModalInstance = new Modal(submissionModalRef.value);
        submissionModalRef.value.addEventListener('hidden.bs.modal', () => {
            showSubmissionModal.value = false;
            submissionForm.value = { projectName: '', link: '', description: '' };
            submissionError.value = '';
            isSubmittingProject.value = false;
        });
    }
});
onUnmounted(() => {
     submissionModalInstance?.dispose();
     store.commit('events/clearCurrentEventDetails'); // Correct mutation name
});

watch(showSubmissionModal, (newValue) => {
    if (!submissionModalInstance) { return; }
    try { if (newValue) { submissionModalInstance.show(); } else { submissionModalInstance.hide(); } }
    catch (e) { console.error("Modal show/hide error:", e); }
});
const closeSubmissionModal = () => { showSubmissionModal.value = false; };

// --- Computed Properties ---
const currentUser = computed(() => store.getters['user/getUser']);
const isAuthenticated = computed(() => store.getters['user/isAuthenticated']);
const isAdmin = computed(() => currentUser.value?.role === 'Admin');
const isCurrentUserOrganizer = computed(() => {
     if (!currentUser.value || !event.value || !Array.isArray(event.value.organizers)) return false;
     return event.value.organizers.includes(currentUser.value.uid);
});
const canManageEvent = computed(() => isAdmin.value || isCurrentUserOrganizer.value);

// Status Badge and Icon
const statusBadgeClass = computed(() => {
    if (!event.value) return 'bg-light text-dark';
    switch (event.value.status) {
        case 'Approved': return 'bg-info text-dark';
        case 'In Progress': return 'bg-success text-white';
        case 'Completed': return 'bg-secondary text-white';
        case 'Cancelled': return 'bg-danger text-white';
        case 'Rejected': return 'bg-danger text-white';
        case 'Pending': return 'bg-warning text-dark';
        default: return 'bg-light text-dark';
    }
});
const statusIconClass = computed(() => {
     if (!event.value) return 'fa-question-circle';
     switch (event.value.status) {
         case 'Approved': return 'fa-thumbs-up';
         case 'In Progress': return 'fa-running';
         case 'Completed': return 'fa-check-circle';
         case 'Cancelled': return 'fa-ban';
         case 'Rejected': return 'fa-times-circle';
         case 'Pending': return 'fa-hourglass-half';
         default: return 'fa-question-circle';
     }
});

const isParticipantOrTeamMember = computed(() => {
    // Add defensive checks
    if (!currentUser.value || !event.value || typeof event.value.isTeamEvent !== 'boolean') {
        // console.warn('isParticipantOrTeamMember: event or isTeamEvent invalid');
        return false;
    }
    const userId = currentUser.value.uid;
    // Check participants array for individual events
    if (!event.value.isTeamEvent) {
        return Array.isArray(event.value.participants) && event.value.participants.includes(userId);
    }
    // Check teams array for team events
    return Array.isArray(event.value.teams) && event.value.teams.some(team => Array.isArray(team.members) && team.members.includes(userId));
});

// Is the current user relevant (participant, team member, or organizer)?
const isRelevantUser = computed(() => {
     // Add event.value check
     if (!currentUser.value || !event.value) return false;
     return isParticipantOrTeamMember.value || isCurrentUserOrganizer.value;
});

const hasSubmittedProject = computed(() => {
    // Add defensive checks
    if (!currentUser.value || !event.value || typeof event.value.isTeamEvent !== 'boolean') {
        // console.warn('hasSubmittedProject: event or isTeamEvent invalid');
        return false;
    }
    // Delegate primary check to isParticipantOrTeamMember
    if (!isParticipantOrTeamMember.value) return false;

    const userId = currentUser.value.uid;

    if (event.value.isTeamEvent) {
        // Find the team the user belongs to
        const userTeam = (event.value.teams || []).find(team => team.members?.includes(userId));
        // Check if that team has any submissions (assuming team submits once)
        return userTeam?.submissions?.length > 0;
    } else {
        // Check if there's any submission by this participant ID
        // Assuming submissions array has objects like { submittedBy: 'userId', ... }
        return (event.value.submissions || []).some(sub => sub.submittedBy === userId);
    }
});

const canSubmitProject = computed(() => {
    // Must be 'In Progress', user must be a participant/member, and haven't submitted yet
    // Add event.value check
    return event.value && event.value.status === 'In Progress' && isParticipantOrTeamMember.value && !hasSubmittedProject.value;
});

const submissions = computed(() => {
    // Add defensive checks
    if (!event.value || typeof event.value.isTeamEvent !== 'boolean') {
        // console.warn('submissions: event or isTeamEvent invalid');
        return [];
    }
    loadingSubmissions.value = true; // Set loading true initially
    let subs = [];
    if (event.value.isTeamEvent && Array.isArray(event.value.teams)) {
        event.value.teams.forEach(team => {
            (team.submissions || []).forEach(s => {
                // Try to find the user who submitted within the team members
                 // Assume submission object has { link, projectName, description, submittedBy: userId }
                subs.push({ ...s, submitterDisplayName: getSubmitterDisplayName(s.submittedBy, team.teamName) });
            });
        });
    } else if (!event.value.isTeamEvent && Array.isArray(event.value.submissions)) {
        // Assume submission object has { link, projectName, description, submittedBy: userId }
        subs = event.value.submissions.map(s => ({ ...s, submitterDisplayName: getSubmitterDisplayName(s.submittedBy) }));
    }
    loadingSubmissions.value = false;
    // Sort by project name
    return subs.sort((a, b) => (a.projectName || '').localeCompare(b.projectName || ''));
});

const sortedParticipants = computed(() => {
    if (!event.value || !Array.isArray(event.value.participants)) return [];
    return [...event.value.participants].sort((a, b) => {
        const nameA = getUserNameFromCache(a) || a;
        const nameB = getUserNameFromCache(b) || b;
        return nameA.localeCompare(nameB);
    });
});

// Sort XP Allocation by index for display
const sortedXpAllocation = computed(() => {
    if (!event.value || !Array.isArray(event.value.xpAllocation)) return [];
    // Clone and sort
    return [...event.value.xpAllocation].sort((a, b) => (a.constraintIndex ?? 0) - (b.constraintIndex ?? 0));
});

const canActuallyMarkInProgress = computed(() => {
    // Add event.value check
    if (!event.value || event.value.status !== 'Approved') return false;
    if (!event.value.startDate || !(event.value.startDate instanceof Timestamp)) return false;
    const now = new Date();
    const startDate = event.value.startDate.toDate();
    // Compare date part only
    startDate.setHours(0, 0, 0, 0);
    now.setHours(0, 0, 0, 0);
    return now >= startDate;
});

const canActuallyMarkCompleted = computed(() => {
    // Add event.value check
    if (!event.value || event.value.status !== 'In Progress') return false;
    if (!event.value.endDate || !(event.value.endDate instanceof Timestamp)) return false;
    const now = new Date();
    const endDate = event.value.endDate.toDate();
    // Compare date part only
     endDate.setHours(0, 0, 0, 0);
    now.setHours(0, 0, 0, 0);
    return now >= endDate;
});

// Check if the current user has already rated (for individual events)
const alreadyRated = computed(() => {
     // Add defensive checks
     if (!currentUser.value || !event.value || typeof event.value.isTeamEvent !== 'boolean' || event.value.isTeamEvent) {
        // console.warn('alreadyRated: prerequisites not met');
        return false;
     }
     // Check specifically for a 'winner_selection' rating type by the current user
     return (event.value.ratings || []).some(r => r.ratedBy === currentUser.value.uid && r.type === 'winner_selection');
});

// Combined winners from both formats for display
const displayWinners = computed(() => {
    // Add defensive checks
    if (!event.value || typeof event.value.isTeamEvent !== 'boolean') {
        // console.warn('displayWinners: event or isTeamEvent invalid');
        return [];
    }
    const winnersMap = new Map(); // Use map to handle potential duplicates/role overrides

    // Process role-based winners first
    if (event.value.winnersPerRole) {
        for (const [role, winnerIds] of Object.entries(event.value.winnersPerRole)) {
            (winnerIds || []).forEach(id => {
                // Check isTeamEvent here before accessing getUserNameFromCache
                const name = event.value.isTeamEvent ? id : (getUserNameFromCache(id) || id);
                winnersMap.set(id, { id: id, name: name, role: role === 'default' ? null : role });
            });
        }
    }

    // Process legacy winners (add if not already present with a role)
    if (Array.isArray(event.value.winners)) {
        event.value.winners.forEach(id => {
            if (!winnersMap.has(id)) {
                // Check isTeamEvent here before accessing getUserNameFromCache
                const name = event.value.isTeamEvent ? id : (getUserNameFromCache(id) || id);
                winnersMap.set(id, { id: id, name: name, role: null });
            }
        });
    }

    return Array.from(winnersMap.values());
});

// Check if the current user has rated ANY team in this event
const hasRatedAnyTeam = computed(() => {
    // Defensive checks
    if (!currentUser.value || !event.value || !event.value.isTeamEvent || !Array.isArray(event.value.teams)) {
        return false;
    }
    const userId = currentUser.value.uid;
    // Check if *any* team's ratings array includes a rating by the current user
    return event.value.teams.some(team => 
        Array.isArray(team.ratings) && team.ratings.some(rating => rating.ratedBy === userId)
    );
});

// Add computed property for safer template access
const isDefinitelyTeamEvent = computed(() => event.value?.isTeamEvent === true);

// Computed property to check if the user should see the org rating section
const canRateOrganization = computed(() => {
    // Check event status, user participation, and authentication
    return event.value?.status === 'Completed' && isAuthenticated.value && isParticipantOrTeamMember.value;
});

// --- Methods ---
const formatDate = (timestamp) => {
     if (timestamp?.seconds) {
         // Use toLocaleDateString for locale-aware formatting
         return new Date(timestamp.seconds * 1000).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
     }
     return 'N/A';
};

const getUserNameFromCache = (userId) => {
     if (!userId) return null;
     return nameCache.value.get(userId) || null; // Return null if not found
};

// Helper to get display name for submitter (user or team)
const getSubmitterDisplayName = (submitterId, teamName = null) => {
     // Add defensive checks
     if (!event.value || typeof event.value.isTeamEvent !== 'boolean') {
        // console.warn('getSubmitterDisplayName: event or isTeamEvent invalid');
        return submitterId || 'Unknown'; // Fallback
     }
     if (event.value.isTeamEvent) {
         // For team events, submission might store team name or submitting user ID
         // Prioritize team name if available
         return teamName || getUserNameFromCache(submitterId) || submitterId || 'Unknown Team/User';
     }
     // For individual events, it's the user ID
     return getUserNameFromCache(submitterId) || submitterId || 'Anonymous User';
};

const getRoleLabel = (roleValue) => {
    const role = availableRoles.find(r => r.value === roleValue);
    return role ? role.label : (roleValue || 'General');
};

// --- Action Handlers with Loading/Error Feedback ---

const performAction = async (actionName, actionFn, successMessage) => {
    if (actionInProgress.value) return; // Prevent concurrent actions
    actionInProgress.value = true;
    actionType.value = actionName;
    clearGlobalFeedback();
    try {
        await actionFn();
        setGlobalFeedback(successMessage, 'success');
    } catch (error) {
        console.error(`${actionName} error:`, error);
        setGlobalFeedback(error.message || `Failed to ${actionName}.`, 'error', 0); // Keep error message visible
    } finally {
        actionInProgress.value = false;
        actionType.value = '';
    }
};

const updateStatus = async (newStatus) => {
    // Add event.value check
    if (!event.value) return;

    // Confirmation for Cancel
    if (newStatus === 'Cancelled' && !confirm(`Are you sure you want to cancel the event "${event.value.eventName}"? This action cannot be undone.`)) return;

    await performAction('update status', async () => {
        await store.dispatch('events/updateEventStatus', { eventId: props.id, newStatus });
    }, `Event status successfully updated to ${newStatus}.`);
};

const toggleRatingsOpen = async (isOpen) => {
    // Add event.value check
    if (!event.value) return;
    const actionText = isOpen ? 'open ratings' : 'close ratings';
    await performAction(actionText, async () => {
         // The action now returns a status object, check it
        const result = await store.dispatch('events/toggleRatingsOpen', { eventId: props.id, isOpen });
        if (result.status === 'error') {
             // Throw error to be caught by performAction's catch block
             throw new Error(result.message || `Failed to ${actionText}.`);
         }
         // No explicit success message needed here if UI updates reactively
    }, `Ratings successfully ${isOpen ? 'opened' : 'closed'}.`);
};

const deleteEvent = async () => {
    // Add event.value check
    if (!event.value || !canManageEvent.value) return;
    if (confirm(`PERMANENTLY DELETE the event request "${event.value.eventName}"? This cannot be undone.`)) {
        await performAction('delete event', async () => {
            await store.dispatch('events/deleteEvent', props.id);
            // Navigate away after successful deletion
             setGlobalFeedback('Event deleted successfully.', 'success', 0); // Keep message until navigation
            router.push(isAdmin.value ? '/manage-requests' : '/home');
        }, ''); // Success message handled before navigation
    }
};

const calculateWinners = async () => {
    // Add event.value check
    if (!event.value) return;
    await performAction('calculate winners', async () => {
        // Action might show its own alerts, but we catch errors here
        await store.dispatch('events/calculateWinners', props.id);
    }, 'Winner calculation initiated.'); // Or adjust message based on action's return
};

const copyRatingLink = async () => {
    // Use event ID to construct the specific rating link
     // Assuming the route is '/rating/:eventId'
     const ratingBaseUrl = `${window.location.origin}/rating/${props.id}`;
     let linkToCopy = ratingBaseUrl;

     // For team events, maybe copy the base link? Or provide instructions?
     // For individual events, the base link is fine.
     // Let's just copy the base link for now.

    clearGlobalFeedback();
    try {
        await navigator.clipboard.writeText(linkToCopy);
        linkCopied.value = true;
         setGlobalFeedback('Rating link copied to clipboard!', 'success');
        setTimeout(() => { linkCopied.value = false; }, 2500);
    } catch (err) {
        console.error('Copy failed: ', err);
         setGlobalFeedback('Failed to copy link to clipboard.', 'error');
    }
};

const submitProject = async () => {
    submissionError.value = '';
    if (!submissionForm.value.projectName || !submissionForm.value.link) {
        submissionError.value = 'Project Name and Link are required.';
        return;
    }
    // Basic URL validation
    try {
        new URL(submissionForm.value.link);
    } catch (_) {
        submissionError.value = 'Please enter a valid URL (e.g., https://...).';
        return;
    }

    isSubmittingProject.value = true;
    // No need for performAction here as feedback is inside the modal
    try {
        await store.dispatch('events/submitProjectToEvent', {
             eventId: props.id,
             submissionData: { ...submissionForm.value }
        });
        closeSubmissionModal(); // Close modal on success
        setGlobalFeedback('Project submitted successfully!', 'success'); // Show global feedback
    } catch (error) {
        console.error("Submit project error:", error);
        submissionError.value = `Submission failed: ${error.message || 'Unknown error'}`; // Show error in modal
    } finally {
        isSubmittingProject.value = false;
    }
};

const leaveEvent = async () => {
    // Add event.value check
    if (!event.value || !isParticipantOrTeamMember.value) return;
    if (confirm('Are you sure you want to leave this event? You may not be able to rejoin.')) {
        await performAction('leave event', async () => {
            await store.dispatch('events/leaveEvent', props.id);
        }, 'You have successfully left the event.');
    }
};

// Navigate to Rating Form (Individual Winner Selection)
const goToWinnerSelection = () => {
    // Add event.value check
    if (!event.value) return;
    router.push({
        name: 'RatingForm', // Ensure this matches your router definition
        params: { eventId: props.id } // Pass eventId
    });
};

// Check if a participant is a winner (handles both formats)
const isWinner = (participantId) => {
    // Add defensive checks
    if (!event.value || typeof event.value.isTeamEvent !== 'boolean' || !participantId) {
        // console.warn('isWinner: prerequisites not met');
        return false;
    }
    // Check new format first
    if (event.value.winnersPerRole) {
        for (const winnerIds of Object.values(event.value.winnersPerRole)) {
            if (Array.isArray(winnerIds) && winnerIds.includes(participantId)) {
                return true;
            }
        }
    }
    // Check legacy format
    return Array.isArray(event.value.winners) && event.value.winners.includes(participantId);
};

// Check if enough ratings exist for automatic calculation
const hasEnoughRatings = computed(() => {
    // Add defensive checks
    if (!event.value || typeof event.value.isTeamEvent !== 'boolean') {
        // console.warn('hasEnoughRatings: event or isTeamEvent invalid');
        return false;
    }
    const minRatings = 10; // Or configure elsewhere
    let totalRatings = 0;

    if (event.value.isTeamEvent && Array.isArray(event.value.teams)) {
        totalRatings = event.value.teams.reduce((sum, team) => sum + (Array.isArray(team.ratings) ? team.ratings.length : 0), 0);
    } else if (!event.value.isTeamEvent && Array.isArray(event.value.ratings)) {
        totalRatings = event.value.ratings.length;
    }
    return totalRatings >= minRatings;
});

// Can the current user rate/select winners for this event?
// For individual: Organizer can rate if open
// For team: Managed via TeamList component currently
const canRateEvent = computed(() => {
    // Add defensive checks
    if (!event.value || typeof event.value.isTeamEvent !== 'boolean' || !event.value.ratingsOpen || event.value.status !== 'Completed') {
        // console.warn('canRateEvent: prerequisites not met');
        return false;
    }
    if (event.value.isTeamEvent) return false; // Handled in TeamList
    return canManageEvent.value; // Only managers rate individual events directly on this page
});

// Method to handle organization rating submission
const submitOrganizationRatingHandler = async () => {
    if (organizationRatingScore.value === null) {
        orgRatingFeedback.value = { message: 'Please select a rating (1-5 stars).', type: 'error' };
        return;
    }
    if (!event.value?.id) {
         orgRatingFeedback.value = { message: 'Event ID is missing.', type: 'error' };
        return;
    }

    isSubmittingOrgRating.value = true;
    orgRatingFeedback.value = { message: '', type: 'success' }; // Clear previous feedback

    try {
        await store.dispatch('events/submitOrganizationRating', {
            eventId: props.id,
            score: organizationRatingScore.value
        });
        orgRatingFeedback.value = { message: 'Organization rating submitted successfully!', type: 'success' };
        // Consider disabling the form after successful submission if desired
        // organizationRatingScore.value = null; // Optionally clear selection
    } catch (error) {
        console.error("Organization rating submission error:", error);
        orgRatingFeedback.value = { message: `Submission failed: ${error.message || 'Unknown error'}`, type: 'error' };
    } finally {
        isSubmittingOrgRating.value = false;
    }
};

</script>

<style scoped>
/* Remove specific padding/vertical-align from previous BS table styles if they existed */
/* Keep any non-Bootstrap styles if needed */
</style>
