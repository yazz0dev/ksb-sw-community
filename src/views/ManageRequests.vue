<template>
    <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6"> <!-- Container -->
        <h2 class="text-2xl font-bold text-gray-900 mb-6">Manage Event Requests</h2>

        <!-- Loading State -->
        <div v-if="loading" class="flex justify-center py-10">
            <svg class="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                 <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                 <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
        </div>
        
        <!-- Error State -->
        <div v-else-if="error" class="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md text-sm">
            {{ error }}
        </div>
        
        <!-- Empty State -->
        <div v-else-if="requests.length === 0" class="bg-blue-50 text-blue-700 p-4 rounded-md text-sm">
            No pending event requests.
        </div>
        
        <!-- Requests Table -->
        <div v-else class="overflow-x-auto shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
            <table class="min-w-full divide-y divide-gray-300">
                <thead class="bg-gray-50">
                    <tr>
                        <th scope="col" class="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">Event Name</th>
                        <th scope="col" class="hidden px-3 py-3.5 text-left text-sm font-semibold text-gray-900 lg:table-cell">Requester</th>
                        <th scope="col" class="hidden px-3 py-3.5 text-left text-sm font-semibold text-gray-900 md:table-cell">Type</th>
                        <th scope="col" class="hidden px-3 py-3.5 text-left text-sm font-semibold text-gray-900 lg:table-cell">Desired Dates</th>
                        <th scope="col" class="relative py-3.5 pl-3 pr-4 sm:pr-6 text-center text-sm font-semibold text-gray-900">Actions</th>
                        </tr>
                    </thead>
                <tbody class="divide-y divide-gray-200 bg-white">
                        <tr v-for="request in requests" :key="request.id">
                        <td class="py-4 pl-4 pr-3 text-sm sm:pl-6 align-middle">
                            <div class="font-medium text-gray-900">{{ request.eventName }}</div>
                            <div class="text-xs text-gray-500 lg:hidden mt-1"> <!-- Show requester on small screens here -->
                                    Requested by: {{ request.requesterName || 'Loading...' }}
                                </div>
                             <div class="text-xs text-gray-500 md:hidden mt-1"> <!-- Show Type on small screens -->
                                 Type: 
                                 <span :class="['inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', request.isTeamEvent ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800']">
                                     {{ request.isTeamEvent ? 'Team' : 'Individual' }}
                                 </span>
                             </div>
                             <div class="text-xs text-gray-500 lg:hidden mt-1"> <!-- Show Dates on medium/small screens -->
                                 Dates: {{ formatDateRange(request.desiredStartDate, request.desiredEndDate) }}
                            </div>
                            </td>
                        <td class="hidden px-3 py-4 text-sm text-gray-500 lg:table-cell align-middle">{{ request.requesterName || 'Loading...' }}</td>
                        <td class="hidden px-3 py-4 text-sm text-gray-500 md:table-cell align-middle">
                            <span :class="['inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', request.isTeamEvent ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800']">
                                    {{ request.isTeamEvent ? 'Team' : 'Individual' }}
                                </span>
                            <!-- <span class="ml-1 lg:hidden text-xs">({{ request.eventType }})</span> --> <!-- Event type category if available -->
                            </td>
                        <td class="hidden px-3 py-4 text-sm text-gray-500 lg:table-cell align-middle">{{ formatDateRange(request.desiredStartDate, request.desiredEndDate) }}</td>
                        <td class="relative whitespace-nowrap py-4 pl-3 pr-4 text-center text-sm font-medium sm:pr-6 align-middle">
                           <div class="flex justify-center items-center space-x-1">
                                <!-- Review Button -->
                                <button @click="openReviewModal(request)" 
                                        class="inline-flex items-center rounded border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                        title="Review Details">
                                    <i class="fas fa-search h-3 w-3"></i><span class="hidden md:inline ml-1">Review</span>
                                </button>
                                <!-- Approve Button -->
                                <button @click="approveRequest(request.id)" 
                                        class="inline-flex items-center rounded border border-transparent bg-green-600 px-2.5 py-1 text-xs font-medium text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                        :disabled="isProcessing(request.id)" 
                                        title="Approve">
                                    <svg v-if="isProcessing(request.id) && processingAction === 'approve'" class="animate-spin h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                         <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                         <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    <i v-else class="fas fa-check h-3 w-3"></i> <span class="hidden xl:inline ml-1">Approve</span>
                                </button>
                                <!-- Reject Button -->
                                <button @click="openRejectModal(request)" 
                                        class="inline-flex items-center rounded border border-transparent bg-red-600 px-2.5 py-1 text-xs font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                        :disabled="isProcessing(request.id)" 
                                        title="Reject">
                                     <svg v-if="isProcessing(request.id) && processingAction === 'reject'" class="animate-spin h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                         <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                         <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                     </svg>
                                    <i v-else class="fas fa-times h-3 w-3"></i> <span class="hidden xl:inline ml-1">Reject</span>
                                </button>
                            </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
        </div>

        <!-- Review Modal Placeholder -->
        <!-- TODO: Refactor Review Modal with Tailwind -->
        <!-- <ReviewRequestModal v-if="selectedRequestForReview" :request="selectedRequestForReview" @close="selectedRequestForReview = null" /> -->

        <!-- Reject Modal Placeholder -->
        <!-- TODO: Refactor Reject Modal with Tailwind -->
        <!-- <RejectRequestModal v-if="selectedRequestForReject" :request="selectedRequestForReject" @close="selectedRequestForReject = null" @rejected="handleRejected" /> -->

    </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { collection, query, where, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase'; // Adjust the path as necessary
import { DateTime } from 'luxon';
// Import modal components (assuming they exist)
// import ReviewRequestModal from '../components/modals/ReviewRequestModal.vue';
// import RejectRequestModal from '../components/modals/RejectRequestModal.vue';

const requests = ref([]);
const loading = ref(true);
const error = ref(null);
const processingRequestId = ref(null);
const processingAction = ref(''); // 'approve' or 'reject'
const userCache = ref({}); // Cache for requester names

const selectedRequestForReview = ref(null);
const selectedRequestForReject = ref(null);

// Fetch user name helper
const fetchUserName = async (userId) => {
  if (!userId) return 'Unknown User';
  if (userCache.value[userId]) return userCache.value[userId];
  try {
    const userDocRef = doc(db, 'users', userId);
    const userDocSnap = await getDoc(userDocRef);
    if (userDocSnap.exists()) {
      const userName = userDocSnap.data().name || 'Unnamed User';
      userCache.value[userId] = userName;
      return userName;
    } else {
      userCache.value[userId] = 'User Not Found';
      return 'User Not Found';
    }
  } catch (fetchError) {
    console.error(`Error fetching name for user ${userId}:`, fetchError);
    userCache.value[userId] = 'Error Loading Name'; // Cache error state
    return 'Error Loading Name';
  }
};

// Fetch pending requests on mount
onMounted(async () => {
  loading.value = true;
  error.value = null;
  try {
    const q = query(collection(db, 'eventRequests'), where('status', '==', 'Pending'));
    const querySnapshot = await getDocs(q);
    const fetchedRequests = [];
    for (const requestDoc of querySnapshot.docs) {
      const data = requestDoc.data();
      // Fetch requester name immediately
      const requesterName = await fetchUserName(data.requestedByUid);
      fetchedRequests.push({
        id: requestDoc.id,
        ...data,
        requesterName: requesterName
      });
    }
    requests.value = fetchedRequests.sort((a, b) => (a.requestedAt?.seconds || 0) - (b.requestedAt?.seconds || 0)); // Sort oldest first
  } catch (err) {
    console.error("Error fetching event requests:", err);
    error.value = "Failed to load event requests.";
  } finally {
    loading.value = false;
  }
});

// Computed property to check if a specific request is being processed
const isProcessing = (requestId) => processingRequestId.value === requestId;

// Format date range helper
const formatDateRange = (start, end) => {
    if (!start) return 'N/A';
    const startDate = DateTime.fromISO(start.iso).toLocaleString(DateTime.DATE_MED);
    if (!end) return startDate;
    const endDate = DateTime.fromISO(end.iso).toLocaleString(DateTime.DATE_MED);
    return startDate === endDate ? startDate : `${startDate} - ${endDate}`;
};

// Modal handling functions
const openReviewModal = (request) => {
    selectedRequestForReview.value = request;
};
const openRejectModal = (request) => {
    selectedRequestForReject.value = request;
};

// Action functions (Approve/Reject)
const approveRequest = async (requestId) => {
    if (isProcessing(requestId)) return;
    processingRequestId.value = requestId;
    processingAction.value = 'approve';
    try {
        const requestRef = doc(db, 'eventRequests', requestId);
        await updateDoc(requestRef, { status: 'Approved' });
        requests.value = requests.value.filter(req => req.id !== requestId); // Remove from list
        // Optionally add success feedback (e.g., toast notification)
    } catch (err) {
        console.error("Error approving request:", err);
        error.value = "Failed to approve request."; // Show error feedback
    } finally {
        processingRequestId.value = null;
        processingAction.value = '';
    }
};

// Handle rejection (called after reject reason is confirmed in modal)
const handleRejected = async (rejectionDetails) => {
    const { requestId, reason } = rejectionDetails;
    if (isProcessing(requestId)) return; // Should already be handled by modal, but check again
    
    processingRequestId.value = requestId;
    processingAction.value = 'reject'; // Ensure this is set if modal doesn't
    selectedRequestForReject.value = null; // Close modal immediately

    try {
        const requestRef = doc(db, 'eventRequests', requestId);
        await updateDoc(requestRef, { 
            status: 'Rejected',
            rejectionReason: reason // Store the reason
        });
        requests.value = requests.value.filter(req => req.id !== requestId); // Remove from list
        // Optionally add success feedback
    } catch (err) {
        console.error("Error rejecting request:", err);
        error.value = "Failed to reject request."; // Show error feedback
    } finally {
        processingRequestId.value = null;
        processingAction.value = '';
    }
};

</script>

<!-- <style scoped>
td, th {
    padding: var(--space-3) var(--space-2); /* Adjust padding */
    vertical-align: middle;
}

@media (min-width: 768px) { /* md breakpoint */
    td, th {
        padding: var(--space-3) var(--space-4); /* Restore default padding */
    }
}

/* Ensure buttons in actions column don't wrap excessively */
.table td:last-child,
.table th:last-child {
    white-space: nowrap;
}
</style> -->