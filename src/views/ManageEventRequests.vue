// /src/views/ManageEventRequests.vue
<template>
    <div class="container mt-4">
      <div class="d-flex justify-content-between align-items-center mb-4 flex-wrap">
         <h2 class="mb-0 me-3">Manage Pending Event Requests</h2>
         <button @click="$router.back()" class="btn btn-secondary btn-sm mt-2 mt-md-0">
             <i class="fas fa-arrow-left me-1"></i> Back
         </button>
      </div>

      <div v-if="loading" class="text-center my-5">
          <div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div>
      </div>
      <div v-else-if="eventRequests.length === 0" class="alert alert-info">No pending event requests.</div>
      <div v-else>
        <ul class="list-group">
          <li v-for="request in eventRequests" :key="request.id" class="list-group-item mb-3 shadow-sm">
            <div class="d-flex justify-content-between align-items-start flex-wrap">
                <div class="me-3 mb-2">
                  <h5 class="mb-1">{{ request.eventName }} <span class="fw-normal text-muted">({{ request.eventType }})</span></h5>
                  <p class="mb-1 small"><strong class="me-1">Requested by:</strong> {{ nameCache[request.requester] || request.requester }}</p>
                  <p class="mb-1 small"><strong class="me-1">Desired Dates:</strong> {{ formatDate(request.desiredStartDate) }} - {{ formatDate(request.desiredEndDate) }}</p>
                  <p class="mb-1 small"><strong class="me-1">Team Event:</strong> {{ request.isTeamEvent ? 'Yes' : 'No' }}</p>
                  <p v-if="request.coOrganizers && request.coOrganizers.length > 0" class="mb-1 small">
                      <strong class="me-1">Proposed Co-Organizers:</strong> {{ getCoOrganizerNames(request.coOrganizers) }}
                  </p>
                  <p class="mb-2 small">Description: {{ request.description }}</p>
                </div>
                 <div class="d-flex gap-2 align-self-start flex-shrink-0">
                      <button @click="approveRequest(request.id)" class="btn btn-success btn-sm" :disabled="isProcessing(request.id)">
                         <span v-if="isProcessing(request.id) && processingAction === 'approve'" class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                         <i v-else class="fas fa-check me-1"></i>
                         Approve
                      </button>
                      <button @click="rejectRequest(request.id)" class="btn btn-danger btn-sm" :disabled="isProcessing(request.id)">
                         <span v-if="isProcessing(request.id) && processingAction === 'reject'" class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                         <i v-else class="fas fa-times me-1"></i>
                          Reject
                      </button>
                 </div>
            </div>
            <div v-if="request.conflictWarning" class="mt-2 alert alert-warning alert-sm p-2 small">
                 <i class="fas fa-exclamation-triangle me-1"></i> Potential date conflict with: "{{ request.conflictWarning }}"
            </div>
          </li>
        </ul>
      </div>
    </div>
  </template>

<script setup>
// *** Add 'watch' to this import statement ***
import { computed, onMounted, ref, watch } from 'vue';
import { useStore } from 'vuex';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

const store = useStore();
const loading = ref(true);
const eventRequests = ref([]);
const nameCache = ref({});
const processingRequests = ref(new Set());
const processingAction = ref('');

// Robust Date Formatting
const formatDate = (dateInput) => {
  if (!dateInput) return 'N/A';
  let date;
  try {
    if (dateInput.seconds) { date = dateInput.toDate(); }
    else if (typeof dateInput === 'string' || dateInput instanceof Date || typeof dateInput === 'number') { date = new Date(dateInput); }
    else { return 'Invalid Input'; }
    if (isNaN(date.getTime())) { return 'Invalid Date'; }
    return date.toLocaleDateString();
  } catch (error) { return 'Format Error'; }
};

// Fetch user names
async function fetchUserNames(userIds) {
    const idsToFetch = [...new Set(userIds)].filter(id => id && !nameCache.value.hasOwnProperty(id));
    if (idsToFetch.length === 0) return;
    try {
        const fetchPromises = idsToFetch.map(async (id) => {
            try {
                const userDocRef = doc(db, 'users', id);
                const docSnap = await getDoc(userDocRef);
                nameCache.value[id] = docSnap.exists() ? (docSnap.data().name || id) : id;
            } catch { nameCache.value[id] = id; }
        });
        await Promise.all(fetchPromises);
    } catch (error) {
        console.error("Error batch fetching user names:", error);
         idsToFetch.forEach(id => { if (!nameCache.value.hasOwnProperty(id)) nameCache.value[id] = id; });
    }
}

// Get co-organizer names
const getCoOrganizerNames = (coOrganizerIds) => {
    if (!Array.isArray(coOrganizerIds) || coOrganizerIds.length === 0) return 'None';
    return coOrganizerIds.map(id => nameCache.value[id] || id).join(', ');
};

// Check processing state
const isProcessing = (requestId) => processingRequests.value.has(requestId);

// Check conflicts
async function checkAllConflicts(requests) {
     for (const request of requests) {
         request.conflictWarning = null; // Reset warning
         if (request.desiredStartDate && request.desiredEndDate) {
            try {
                 const reqStartDate = request.desiredStartDate.toDate();
                 const reqEndDate = request.desiredEndDate.toDate();
                 const conflict = await store.dispatch('events/checkDateConflict', { startDate: reqStartDate, endDate: reqEndDate });
                 if (conflict) { request.conflictWarning = conflict.eventName; }
            } catch (e) { request.conflictWarning = "Error checking dates"; }
         }
     }
     return requests;
}

// Initial data load
async function loadInitialData() {
    loading.value = true;
    eventRequests.value = [];
    nameCache.value = {};
    try {
        await store.dispatch('events/fetchEventRequests');
        let requestsData = store.getters['events/allEventRequests'];
        let userIds = new Set();
        requestsData.forEach(req => { if (req.requester) userIds.add(req.requester); (req.coOrganizers || []).forEach(id => userIds.add(id)); });
        await fetchUserNames(Array.from(userIds));
        requestsData = await checkAllConflicts(requestsData);
        eventRequests.value = requestsData;
    } catch(error) {
        console.error("Failed to load requests:", error);
    } finally {
        loading.value = false;
    }
}

onMounted(loadInitialData);

// Watch for store changes (e.g., after approve/reject)
watch(() => store.getters['events/allEventRequests'], async (newRequests) => {
     if (!loading.value) { // Avoid race condition during initial load
          // console.log("Requests updated in store, refreshing local list and conflicts...");
          let userIds = new Set();
          newRequests.forEach(req => { if (req.requester) userIds.add(req.requester); (req.coOrganizers || []).forEach(id => userIds.add(id)); });
          await fetchUserNames(Array.from(userIds)); // Fetch any new names
          const updatedRequests = await checkAllConflicts(newRequests); // Recheck conflicts
          eventRequests.value = updatedRequests;
     }
}, { deep: true }); // Use deep watch if needed, though getter change should be sufficient

// Approve/Reject actions
const approveRequest = async (requestId) => {
  if (isProcessing(requestId)) return;
  processingRequests.value.add(requestId); processingAction.value = 'approve';
  try { await store.dispatch('events/approveEventRequest', requestId); alert('Request approved successfully!'); }
  catch (error) { console.error('Error approving request:', error); alert(`Error approving request: ${error.message}`); }
  finally { processingRequests.value.delete(requestId); processingAction.value = ''; }
};

const rejectRequest = async (requestId) => {
     if (isProcessing(requestId)) return;
     processingRequests.value.add(requestId); processingAction.value = 'reject';
    try { await store.dispatch('events/rejectEventRequest', requestId); alert('Request rejected.'); }
    catch (error) { console.error("Error rejecting request:", error); alert(`Error rejecting request: ${error.message}`); }
    finally { processingRequests.value.delete(requestId); processingAction.value = ''; }
}

</script>

<style scoped>
 .list-group-item { border: 1px solid var(--color-border); background-color: var(--color-surface); }
 .alert-sm { font-size: var(--font-size-sm); }
</style>