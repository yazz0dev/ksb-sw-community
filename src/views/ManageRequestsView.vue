<template>
    <div class="container mt-4">
      <div class="d-flex justify-content-between align-items-center mb-4 flex-wrap">
         <h2 class="mb-0 me-3">Manage Event Requests</h2>
         <div class="d-flex gap-2">
             <button class="btn btn-secondary btn-sm" @click="$router.push('/home')">
                 <i class="fas fa-arrow-left me-1"></i> Back to Dashboard
             </button>
             <router-link to="/request-event" class="btn btn-success btn-sm">
                 <i class="fas fa-calendar-plus me-1"></i> Create Event
             </router-link>
         </div>
      </div>

      <div v-if="loading" class="text-center my-5">
          <div class="spinner-border text-primary" role="status">
              <span class="visually-hidden">Loading requests...</span>
          </div>
      </div>
      <div v-else-if="pendingEvents.length === 0" class="alert alert-info">
          No pending requests to review at this time.
      </div>
      <div v-else>
        <ul class="list-group">
          <li v-for="event in pendingEvents" :key="event.id" class="list-group-item mb-3 shadow-sm">
            <div class="d-flex justify-content-between align-items-start flex-wrap">
                <div class="me-3 mb-2">
                   <h5 class="mb-1">{{ event.eventName }} <span class="fw-normal text-muted">({{ event.eventType }})</span></h5>
                   <p class="mb-1 small"><strong class="me-1">Requested by:</strong> {{ nameCache[event.requester] || event.requester }}</p>
                   <p class="mb-1 small"><strong class="me-1">Desired Dates:</strong> {{ formatDate(event.desiredStartDate) }} - {{ formatDate(event.desiredEndDate) }}</p>
                   <p class="mb-1 small"><strong class="me-1">Team Event:</strong> {{ event.isTeamEvent ? 'Yes' : 'No' }}</p>
                   <p v-if="event.coOrganizers && event.coOrganizers.length > 0" class="mb-1 small">
                       <strong>Co-organizers:</strong> 
                       <span v-for="(orgId, idx) in event.coOrganizers" :key="orgId">
                           {{ nameCache[orgId] || orgId }}{{ idx < event.coOrganizers.length - 1 ? ', ' : '' }}
                       </span>
                   </p>
                   <p class="mb-2 small">Description: {{ event.description }}</p>
                   <!-- Display XP/Constraint Info -->
                   <div v-if="event.xpDistribution && Object.values(event.xpDistribution).some(xp => xp > 0)" class="mt-2 small">
                        <strong class="d-block mb-1">XP Allocation:</strong>
                        <ul class="list-unstyled ps-3 mb-1">
                            <li v-for="(xp, role) in event.xpDistribution" :key="role">
                                <span v-if="xp > 0">{{ formatRoleName(role) }}: {{ xp }} XP</span>
                            </li>
                        </ul>
                   </div>
                   <div v-if="event.ratingCriteria && event.ratingCriteria.some(c => c.constraint)" class="mt-2 small">
                        <strong class="d-block mb-1">Rating Criteria:</strong>
                        <ul class="list-unstyled ps-3 mb-1">
                            <li v-for="(crit, index) in event.ratingCriteria" :key="index">
                               <span v-if="crit.constraint">{{ crit.constraint }} {{ crit.role ? '('+formatRoleName(crit.role)+')' : '' }}</span>
                           </li>
                       </ul>
                   </div>
                </div>
                <div class="d-flex gap-2 align-self-start flex-shrink-0">
                     <button @click="approveRequest(event.id)" class="btn btn-success btn-sm" :disabled="isProcessing(event.id)">
                         <i class="fas" :class="processingAction === 'approve' ? 'fa-spinner fa-spin' : 'fa-check'"></i>
                         Approve
                     </button>
                     <button @click="rejectRequest(event.id)" class="btn btn-warning btn-sm" :disabled="isProcessing(event.id)">
                         <i class="fas" :class="processingAction === 'reject' ? 'fa-spinner fa-spin' : 'fa-times'"></i>
                         Reject
                     </button>
                     <button @click="deleteRequest(event.id)" class="btn btn-danger btn-sm" :disabled="isProcessing(event.id)">
                         <i class="fas" :class="processingAction === 'delete' ? 'fa-spinner fa-spin' : 'fa-trash'"></i>
                         Delete
                     </button>
                 </div>
            </div>
            <!-- Conflict Warning -->
            <div v-if="conflictWarnings[event.id]" class="mt-2 alert alert-warning alert-sm p-2 small">
                <i class="fas fa-exclamation-triangle me-1"></i> 
                Warning: Date conflict with "{{ conflictWarnings[event.id] }}"
            </div>
          </li>
        </ul>
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
    const date = dateInput.toDate();
    return new Intl.DateTimeFormat('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    }).format(date);
};

const formatRoleName = (roleKey) => {
    const roleMap = {
        'orgRole': 'Organizer',
        'partRole': 'Participant'
    };
    return roleMap[roleKey] || roleKey;
};

// Fetch user names
async function fetchUserNames(userIds) {
    for (const userId of userIds) {
        if (!nameCache.value[userId]) {
            try {
                const userDoc = await getDoc(doc(db, 'users', userId));
                if (userDoc.exists()) {
                    nameCache.value[userId] = userDoc.data().displayName || userId;
                }
            } catch (error) {
                console.error(`Error fetching user ${userId}:`, error);
                nameCache.value[userId] = userId;
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

// Initial data load & conflict check
async function loadInitialData() {
    loading.value = true;
    Object.keys(conflictWarnings).forEach(key => delete conflictWarnings[key]); // Clear old warnings
    try {
        await store.dispatch('events/fetchEvents'); // Fetch all events to ensure store is up-to-date
        const currentPendingEvents = pendingEvents.value; // Get from getter
        let userIds = new Set();
        currentPendingEvents.forEach(req => { if (req.requester) userIds.add(req.requester); (req.coOrganizers || []).forEach(id => userIds.add(id)); });
        await fetchUserNames(Array.from(userIds));
        await checkAllConflicts(currentPendingEvents); // Check conflicts for current pending list
    } catch(error) {
        console.error("Failed to load pending events:", error);
    } finally {
        loading.value = false;
    }
}

onMounted(loadInitialData);

// Watch the getter for changes and re-run checks
watch(pendingEvents, async (newPendingList) => {
     // Avoid re-running during initial load if fetchEvents triggers update
     if (!loading.value) {
          console.log("Pending events changed, refreshing names and conflicts...");
          let userIds = new Set();
          newPendingList.forEach(req => { if (req.requester) userIds.add(req.requester); (req.coOrganizers || []).forEach(id => userIds.add(id)); });
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
     processingRequests.value.add(eventId); processingAction.value = 'reject';
    try { await store.dispatch('events/rejectEventRequest', eventId); alert('Event rejected.'); } // Uses event ID now
    catch (error) { console.error("Error rejecting event:", error); alert(`Error rejecting event: ${error.message}`); }
    finally { processingRequests.value.delete(eventId); processingAction.value = ''; }
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
 .list-group-item { border: 1px solid var(--color-border); background-color: var(--color-surface); }
 .alert-sm { font-size: var(--font-size-sm); }
</style>
