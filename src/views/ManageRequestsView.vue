<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 bg-background min-h-[calc(100vh-8rem)]">
    <!-- Header -->
    <div class="mb-8 pb-4 border-b border-border">
      <h2 class="text-3xl font-bold text-text-primary">Manage Event Requests</h2>
    </div>

    <!-- Loading state -->
    <div v-if="loading" class="flex justify-center py-16">
      <div class="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
    </div>

    <!-- Error state -->
    <div v-else-if="error" class="text-error text-center py-16">
      <p class="font-semibold">{{ error }}</p>
    </div>

    <!-- Event requests list -->
    <div v-else class="space-y-6">
      <div v-if="pendingRequests.length === 0" class="bg-info-light border border-info-light text-info-dark p-4 rounded-md text-center italic">
        No pending event requests.
      </div>
      <template v-else>
        <div v-for="(group, index) in groupedRequests" :key="index" class="space-y-4">
          <h3 class="text-lg font-medium text-text-primary border-b border-border pb-2">{{ group.title }}</h3>
          <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <RequestCard
              v-for="request in group.requests"
              :key="request.id"
              :event="request"
              @approve="approveRequest(request.id)"
              @reject="confirmRejectRequest(request.id)"
              class="animate-fade-in"
            />
          </div>
        </div>
      </template>
    </div>

    <!-- Confirmation Modal for Reject Request -->
    <ConfirmationModal
      v-if="showRejectConfirmModal"
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
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useStore } from 'vuex';
import RequestCard from '../components/RequestCard.vue';
import ConfirmationModal from '../components/ConfirmationModal.vue'; // Import modal component

const store = useStore();
const loading = ref(false);
const error = ref(null);
const pendingRequests = computed(() => store.getters['events/pendingEvents']);

// State for confirmation modal
const showRejectConfirmModal = ref(false);
const eventIdToReject = ref(null);

const groupedRequests = computed(() => {
  const groups = {};
  
  pendingRequests.value.forEach(request => {
    const date = request.createdAt?.toDate() || new Date();
    const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (!groups[yearMonth]) {
      groups[yearMonth] = [];
    }
    groups[yearMonth].push(request);
  });

  return Object.entries(groups)
    .sort((a, b) => b[0].localeCompare(a[0])) // Sort by date descending
    .map(([yearMonth, requests]) => {
      const [year, month] = yearMonth.split('-');
      const monthName = new Date(year, month - 1).toLocaleString('default', { month: 'long' });
      return {
        title: `${monthName} ${year}`,
        requests
      };
    });
});

async function fetchRequests() {
  loading.value = true;
  error.value = null;
  try {
    // Assuming fetchEvents fetches all events including pending ones
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
  if (loading.value) return;
  loading.value = true;
  try {
    await store.dispatch('events/approveEventRequest', eventId);
     store.dispatch('notification/showNotification', {
        message: 'Event request approved successfully.',
        type: 'success'
    });
    // Re-fetch or update local state if needed
    // await fetchRequests(); // Or remove locally: pendingRequests.value = pendingRequests.value.filter(req => req.id !== eventId);
  } catch (err) {
    error.value = `Failed to approve request: ${err.message}`;
    console.error("Error approving event request:", err);
     store.dispatch('notification/showNotification', {
        message: `Failed to approve request: ${err.message || 'Unknown error'}`,
        type: 'error'
    });
  } finally {
    loading.value = false;
  }
};

// --- Reject Request Flow with Confirmation Modal ---
const confirmRejectRequest = (eventId) => {
  eventIdToReject.value = eventId;
  showRejectConfirmModal.value = true;
};

const cancelRejectRequest = () => {
  showRejectConfirmModal.value = false;
  eventIdToReject.value = null;
};

const rejectRequestConfirmed = async () => {
  const eventId = eventIdToReject.value;
  if (!eventId || loading.value) return;

  loading.value = true;
  showRejectConfirmModal.value = false; // Hide modal after confirm
  try {
    // Assuming rejectEventRequest takes an object { eventId, reason }
    await store.dispatch('events/rejectEventRequest', { eventId, reason: 'Rejected by admin' }); // Provide a default reason or implement input
    store.dispatch('notification/showNotification', {
        message: 'Event request rejected successfully.',
        type: 'success' // Or 'info'
    });
     // Re-fetch or update local state if needed
     // await fetchRequests(); // Or remove locally: pendingRequests.value = pendingRequests.value.filter(req => req.id !== eventId);
  } catch (err) {
    error.value = `Failed to reject request: ${err.message}`;
    console.error("Error rejecting event request:", err);
    store.dispatch('notification/showNotification', {
        message: `Failed to reject request: ${err.message || 'Unknown error'}`,
        type: 'error'
    });
  } finally {
    loading.value = false;
    eventIdToReject.value = null;
  }
};
// --- End Reject Request Flow ---


onMounted(() => {
  fetchRequests();
});
</script>
