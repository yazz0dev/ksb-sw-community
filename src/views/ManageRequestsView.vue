<template>
  <section class="py-5" style="background-color: var(--color-background); min-height: calc(100vh - 8rem);">
    <div class="container-lg">
      <!-- Header -->
      <div class="mb-5 pb-4" style="border-bottom: 1px solid var(--bs-border-color);">
        <h1 class="h1 text-primary">Manage Event Requests</h1>
      </div>

      <!-- Loading state -->
      <div v-if="loading" class="text-center py-5">
        <div class="spinner-border text-primary" role="status" style="width: 3rem; height: 3rem;">
          <span class="visually-hidden">Loading...</span>
        </div>
      </div>

      <!-- Error state -->
      <div v-else-if="error" class="alert alert-danger text-center py-4" role="alert">
         <i class="fas fa-exclamation-circle me-2"></i>
         <strong class="fw-semibold">{{ error }}</strong>
      </div>

      <!-- Event requests list -->
      <div v-else>
        <div v-if="pendingRequests.length === 0" class="alert alert-info text-center" role="alert">
          <i class="fas fa-info-circle me-2"></i>
          No pending event requests.
        </div>

        <div v-else>
          <div v-for="(group, index) in groupedRequests" :key="index" class="mb-5">
            <h2 class="h2 text-dark mb-4 pb-2" style="border-bottom: 1px solid var(--bs-border-color);">
              {{ group.title }}
            </h2>
            <div class="row g-4">
              <div 
                v-for="request in group.requests" 
                :key="request.id" 
                class="col-md-6 col-lg-4 animate-fade-in"
              >
                <RequestCard
                  :request="request" 
                  :processing="isProcessing(request.id)"
                  @approve="approveRequest(request.id)"
                  @reject="confirmRejectRequest(request.id)" 
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Confirmation Modal for Reject Request -->
      <ConfirmationModal
        :visible="showRejectConfirmModal"
        title="Reject Event Request?"
        message="Are you sure you want to reject this event request? This action cannot be undone."
        confirm-text="Reject Request"
        cancel-text="Cancel"
        @confirm="rejectRequestConfirmed"
        @cancel="cancelRejectRequest"
        @close="cancelRejectRequest"
      />
    </div>
  </section>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useStore } from 'vuex';
import RequestCard from '../components/RequestCard.vue';
import ConfirmationModal from '../components/ConfirmationModal.vue';

const store = useStore();
const loading = ref(false); 
const error = ref(null);
const processingRequestId = ref(null); // Track which request is currently being processed

const pendingRequests = computed(() => store.getters['events/pendingEvents']);

const showRejectConfirmModal = ref(false);
const eventIdToReject = ref(null);

const groupedRequests = computed(() => {
  const groups = {};
  const sortedRequests = [...pendingRequests.value].sort((a, b) => {
      const dateA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
      const dateB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
      return dateB - dateA; // Sort newest first
  });

  sortedRequests.forEach(request => {
    const date = request.createdAt?.toDate() || new Date();
    const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (!groups[yearMonth]) {
      groups[yearMonth] = [];
    }
    groups[yearMonth].push(request);
  });

  return Object.entries(groups)
    .sort((a, b) => b[0].localeCompare(a[0])) // Sort groups newest first
    .map(([yearMonth, requests]) => {
      const [year, month] = yearMonth.split('-');
      const monthName = new Date(year, month - 1).toLocaleString('default', { month: 'long' });
      return {
        title: `${monthName} ${year}`,
        requests
      };
    });
});

// Function to check if a specific card is processing
const isProcessing = (requestId) => {
    return processingRequestId.value === requestId;
};

async function fetchRequests() {
  loading.value = true;
  error.value = null;
  try {
    await store.dispatch('events/fetchEvents');
  } catch (err) {
    error.value = 'Failed to load event requests.';
    console.error("Error fetching event requests:", err);
     store.dispatch('notification/showNotification', {
        message: `Failed to load requests: ${err.message || 'Unknown error'}`,
        type: 'error'
    });
  } finally {
    loading.value = false;
  }
}

const approveRequest = async (eventId) => {
  if (processingRequestId.value) return; // Prevent concurrent actions
  processingRequestId.value = eventId; 
  error.value = null;
  try {
    await store.dispatch('events/approveEventRequest', eventId);
     store.dispatch('notification/showNotification', {
        message: 'Event request approved successfully.',
        type: 'success'
    });
    // No need to fetch again if the store getter updates reactively
  } catch (err) {
    error.value = `Failed to approve request: ${err.message}`;
    console.error("Error approving event request:", err);
     store.dispatch('notification/showNotification', {
        message: `Failed to approve request: ${err.message || 'Unknown error'}`,
        type: 'error'
    });
  } finally {
    processingRequestId.value = null;
  }
};

// --- Reject Request Flow with Confirmation Modal ---
const confirmRejectRequest = (eventId) => {
  if (processingRequestId.value) return;
  eventIdToReject.value = eventId;
  showRejectConfirmModal.value = true;
};

const cancelRejectRequest = () => {
  showRejectConfirmModal.value = false;
  eventIdToReject.value = null;
};

const rejectRequestConfirmed = async () => {
  const eventId = eventIdToReject.value;
  if (!eventId || processingRequestId.value) return;

  processingRequestId.value = eventId;
  showRejectConfirmModal.value = false; 
  error.value = null;
  try {
    await store.dispatch('events/rejectEventRequest', { eventId, reason: 'Rejected by admin' });
    store.dispatch('notification/showNotification', {
        message: 'Event request rejected successfully.',
        type: 'success'
    });
     // No need to fetch again if the store getter updates reactively
  } catch (err) {
    error.value = `Failed to reject request: ${err.message}`;
    console.error("Error rejecting event request:", err);
    store.dispatch('notification/showNotification', {
        message: `Failed to reject request: ${err.message || 'Unknown error'}`,
        type: 'error'
    });
  } finally {
    processingRequestId.value = null;
    eventIdToReject.value = null;
  }
};
// --- End Reject Request Flow ---


onMounted(() => {
  fetchRequests();
});
</script>

<style scoped>
/* Removed custom loader styles */

/* Animation */
.animate-fade-in {
  animation: fadeIn 0.5s ease-in-out;
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
