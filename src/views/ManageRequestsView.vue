<template>
    <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div class="flex flex-wrap justify-between items-center gap-4 mb-6">
         <h2 class="text-2xl font-bold text-gray-900">Manage Event Requests</h2>
         <div class="flex space-x-2">
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
      <div v-else class="space-y-4">
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
import { computed, onMounted, ref, watch, reactive } from 'vue'; // Added reactive
import { useStore } from 'vuex';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

const store = useStore();
const loading = ref(true);
// const eventRequests = ref([]); // No longer needed, use getter
const nameCache = ref({});
const processingRequests = ref(new Set());
const processingAction = ref('');
const conflictWarnings = reactive({}); // Use reactive object for conflicts

// Get pending events from store
const pendingEvents = computed(() => store.getters['events/pendingEvents']);

// Robust Date Formatting
const formatDate = (dateInput) => {
    if (!dateInput) return 'N/A';

    let date;
    if (typeof dateInput.toDate === 'function') {
        // Firestore Timestamp
        date = dateInput.toDate();
    } else if (dateInput instanceof Date) {
        // Already a JS Date
        date = dateInput;
    } else {
        // Try parsing (less likely for Firestore, but safe)
        date = new Date(dateInput);
    }

    // Check if the resulting date is valid
    if (isNaN(date.getTime())) {
        console.warn("Invalid date encountered in formatDate:", dateInput);
        return 'Invalid Date';
    }

    try {
        return new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        }).format(date);
    } catch (error) {
        console.error("Error formatting date:", date, error);
        return 'Formatting Error';
    }
};

const formatRoleName = (roleKey) => {
    const roleMap = {
        'orgRole': 'Organizer',
        'partRole': 'Participant'
    };
    return roleMap[roleKey] || roleKey;
};

// Fetch user names (updated to use organizers array)
async function fetchUserNames(userIds) {
    const uniqueIds = new Set(userIds.filter(Boolean)); // Ensure unique and filter out falsy values
    for (const userId of uniqueIds) {
        if (!nameCache.value[userId]) {
            try {
                const userDoc = await getDoc(doc(db, 'users', userId));
                if (userDoc.exists()) {
                    nameCache.value[userId] = userDoc.data().name || '(Name missing)';
                } else {
                     nameCache.value[userId] = '(User not found)';
                }
            } catch (error) {
                console.error(`Error fetching user ${userId}:`, error);
                nameCache.value[userId] = '(Error fetching name)';
            }
        }
    }
}

// Get co-organizer names - function is not used, can be removed

// Check processing state
const isProcessing = (requestId) => processingRequests.value.has(requestId);

// Check conflicts for a list of events
async function checkAllConflicts(eventsToCheck) {
     for (const event of eventsToCheck) {
         conflictWarnings[event.id] = null; // Reset warning using event ID as key
         if (event.desiredStartDate && event.desiredEndDate) {
            try {
                 const reqStartDate = event.desiredStartDate.toDate();
                 const reqEndDate = event.desiredEndDate.toDate();
                 const conflict = await store.dispatch('events/checkDateConflict', { startDate: reqStartDate, endDate: reqEndDate });
                 if (conflict) {
                    conflictWarnings[event.id] = conflict.eventName; // Store warning by event ID
                }
            } catch (e) {
                 console.error(`Error checking conflict for ${event.id}:`, e);
                 conflictWarnings[event.id] = "Error checking dates";
            }
         }
     }
}

// Initial data load & conflict check (updated to fetch names for organizers)
async function loadInitialData() {
    loading.value = true;
    Object.keys(conflictWarnings).forEach(key => delete conflictWarnings[key]); // Clear old warnings
    try {
        await store.dispatch('events/fetchEvents'); // Fetch all events to ensure store is up-to-date
        const currentPendingEvents = pendingEvents.value; // Get from getter
        let userIds = new Set();
        currentPendingEvents.forEach(req => {
             if (req.requester) userIds.add(req.requester);
             (req.organizers || []).forEach(id => userIds.add(id)); // Use organizers array
         });
        await fetchUserNames(Array.from(userIds));
        await checkAllConflicts(currentPendingEvents); // Check conflicts for current pending list
    } catch(error) {
        console.error("Failed to load pending events:", error);
    } finally {
        loading.value = false;
    }
}

onMounted(loadInitialData);

// Watch the getter for changes and re-run checks (updated to fetch names for organizers)
watch(pendingEvents, async (newPendingList) => {
     if (!loading.value) {
          console.log("Pending events changed, refreshing names and conflicts...");
          let userIds = new Set();
          newPendingList.forEach(req => {
              if (req.requester) userIds.add(req.requester);
              (req.organizers || []).forEach(id => userIds.add(id)); // Use organizers array
          });
          await fetchUserNames(Array.from(userIds));
          await checkAllConflicts(newPendingList);
     }
}, { deep: true });


// Actions (Approve, Reject, Delete) - call store actions directly
const approveRequest = async (eventId) => {
  if (isProcessing(eventId)) return;
  processingRequests.value.add(eventId); processingAction.value = 'approve';
  try { await store.dispatch('events/approveEventRequest', eventId); alert('Event approved!'); } // Uses event ID now
  catch (error) { console.error('Error approving event:', error); alert(`Error approving event: ${error.message}`); }
  finally { processingRequests.value.delete(eventId); processingAction.value = ''; }
};

const rejectRequest = async (eventId) => {
    if (isProcessing(eventId)) return;

    // Prompt for rejection reason
    const reason = prompt("Please provide a reason for rejecting this event (optional):");
    // If the user clicks Cancel, prompt returns null. Don't proceed.
    if (reason === null) {
        return;
    }

    processingRequests.value.add(eventId); processingAction.value = 'reject';
    try {
        // Pass eventId and reason to the action
        await store.dispatch('events/rejectEventRequest', { eventId, reason });
        alert('Event rejected.');
    } catch (error) {
        console.error("Error rejecting event:", error);
        alert(`Error rejecting event: ${error.message}`);
    } finally {
        processingRequests.value.delete(eventId);
        processingAction.value = '';
    }
}

const deleteRequest = async (eventId) => {
     if (isProcessing(eventId)) return;
     if (!confirm("Are you sure you want to permanently delete this pending event request?")) return;
     processingRequests.value.add(eventId); processingAction.value = 'delete';
    try { await store.dispatch('events/deleteEvent', eventId); alert('Pending event deleted.'); } // Uses deleteEvent action
    catch (error) { console.error("Error deleting pending event:", error); alert(`Error deleting pending event: ${error.message}`); }
    finally { processingRequests.value.delete(eventId); processingAction.value = ''; }
}

</script>

<style scoped>
/* Remove specific padding/vertical-align from previous BS table styles if they existed */
/* Keep any non-Bootstrap styles if needed */
</style>
