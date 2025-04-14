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
        <div v-if="sanitizedPendingRequests.length === 0" class="alert alert-info text-center" role="alert">
          <i class="fas fa-info-circle me-2"></i>
          No pending event requests.
        </div>

        <div v-else class="row g-4">
          <div 
            v-for="request in sanitizedPendingRequests" 
            :key="request.id" 
            class="col-12 animate-fade-in"
          >
            <div class="card shadow-sm">
              <div class="card-body">
                <div class="d-flex justify-content-between align-items-start mb-3">
                  <h3 class="h5 mb-0 text-primary">{{ request.eventName }}</h3>
                  <span :class="['badge rounded-pill', getStatusClass(request.status)]">
                    {{ request.status }}
                  </span>
                </div>
                
                <div class="row g-3">
                  <div class="col-md-6">
                    <p class="mb-2"><strong>Event Format:</strong> {{ request.eventFormat }}</p>
                    <p class="mb-2"><strong>Event Type:</strong> {{ request.eventType }}</p>
                    <p class="mb-2"><strong>Start Date:</strong> {{ formatDate(request.startDate) }}</p>
                    <p class="mb-2"><strong>End Date:</strong> {{ formatDate(request.endDate) }}</p>
                  </div>
                  <div class="col-md-6">
                    <p class="mb-2"><strong>Requestor:</strong> {{ request.requesterName }}</p>
                    <p class="mb-2"><strong>Organizer:</strong> {{ request.organizerName }}</p>
                    <p class="mb-2"><strong>Description:</strong></p>
                    <p class="text-secondary">{{ request.description }}</p>
                  </div>
                </div>

                <div class="mt-3 d-flex gap-2 justify-content-end">
                  <button 
                    class="btn btn-success" 
                    :disabled="isProcessing(request.id)"
                    @click="approveRequest(request.id)"
                  >
                    <span v-if="isProcessing(request.id)" class="spinner-border spinner-border-sm me-1"></span>
                    Approve
                  </button>
                  <button 
                    class="btn btn-danger" 
                    :disabled="isProcessing(request.id)"
                    @click="confirmRejectRequest(request.id)"
                  >
                    Reject
                  </button>
                </div>
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

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useStore } from 'vuex';
import ConfirmationModal from '../components/ConfirmationModal.vue';
import { EventStatus } from '@/types';

interface RequestFeedback {
    message: string;
    type: 'success' | 'error';
}

const store = useStore();
const loading = ref<boolean>(false);
const error = ref<string | null>(null);
const processingRequestId = ref<string | null>(null);
const showRejectConfirmModal = ref<boolean>(false);
const eventIdToReject = ref<string | null>(null);

const pendingRequests = computed(() => store.getters['events/pendingEvents']);

// Sanitized requests with type safety
const sanitizedPendingRequests = computed(() => {
    return pendingRequests.value.map(request => ({
        ...request,
        eventFormat: request.eventFormat || 'Not specified',
        eventType: request.eventType || 'Not specified',
        requesterName: request.requesterName || 'Unknown',
        organizerName: request.organizerName || 'Unknown',
        description: request.description || 'No description provided',
        startDate: request.startDate || null,
        endDate: request.endDate || null,
    }));
});

const getStatusClass = (status: EventStatus): string => {
    switch (status) {
        case EventStatus.Pending: return 'bg-warning-subtle text-warning-emphasis';
        case EventStatus.Approved: return 'bg-success-subtle text-success-emphasis';
        case EventStatus.Rejected: return 'bg-danger-subtle text-danger-emphasis';
        default: return 'bg-secondary-subtle text-secondary-emphasis';
    }
};

const isProcessing = (requestId: string): boolean => {
    return processingRequestId.value === requestId;
};

const formatDate = (date: any): string => {
  if (!date || !date.toDate) return 'Not specified';
  try {
    const d = date.toDate();
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    console.error('Date formatting error:', error);
    return 'Invalid date';
  }
};

async function fetchRequests(): Promise<void> {
  loading.value = true;
  error.value = null;
  try {
    await store.dispatch('events/fetchEvents');
  } catch (err: any) {
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

const approveRequest = async (eventId: string): Promise<void> => {
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
  } catch (err: any) {
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

const confirmRejectRequest = (eventId: string): void => {
  if (processingRequestId.value) return;
  eventIdToReject.value = eventId;
  showRejectConfirmModal.value = true;
};

const cancelRejectRequest = (): void => {
  showRejectConfirmModal.value = false;
  eventIdToReject.value = null;
};

const rejectRequestConfirmed = async (): Promise<void> => {
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
  } catch (err: any) {
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
