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

        <div v-else class="row g-3">
          <div 
            v-for="request in sanitizedPendingRequests" 
            :key="request.id" 
            class="col-12 animate-fade-in"
          >
            <div class="card shadow-sm compact-request-card">
              <div class="card-header d-flex justify-content-between align-items-center py-2 px-3 bg-light flex-wrap">
                <div class="fw-semibold text-primary small d-flex align-items-center gap-2">
                  <i class="fas fa-calendar-alt"></i>
                  <span class="truncate-text">{{ request.eventName }}</span>
                </div>
                <span :class="['badge rounded-pill', getStatusClass(request.status)]">
                  {{ request.status }}
                </span>
              </div>
              <div class="card-body py-3 px-3">
                <div class="row g-2 align-items-center">
                  <div class="col-12 col-md-7">
                    <div class="d-flex flex-wrap gap-2 mb-2">
                      <span class="badge bg-secondary-subtle text-secondary-emphasis small">
                        <i class="fas fa-users me-1"></i>{{ request.eventFormat }}
                      </span>
                      <span class="badge bg-info-subtle text-info-emphasis small">
                        <i class="fas fa-tag me-1"></i>{{ request.eventType }}
                      </span>
                      <span class="badge bg-light text-dark small">
                        <i class="fas fa-user me-1"></i>{{ request.requesterNameDisplay || request.requesterName }}
                      </span>
                      <span v-if="request.organizerName" class="badge bg-light text-dark small">
                        <i class="fas fa-user-friends me-1"></i>{{ request.organizerName }}
                      </span>
                    </div>
                    <div class="d-flex flex-wrap gap-2 small text-secondary">
                      <span>
                        <i class="fas fa-clock me-1"></i>
                        {{ formatDate(request.startDate) }} - {{ formatDate(request.endDate) }}
                      </span>
                      <span v-if="isMissingDates(request)" class="text-warning ms-2">
                        <i class="fas fa-exclamation-triangle me-1"></i>
                        Missing dates
                      </span>
                    </div>
                  </div>
                  <div class="col-12 col-md-5 mt-3 mt-md-0 d-flex flex-md-column flex-row gap-2 align-items-stretch align-items-md-end justify-content-md-end justify-content-start">
                    <button 
                      class="btn btn-success btn-sm flex-fill"
                      :disabled="isProcessing(request.id) || isMissingDates(request)"
                      @click="approveRequest(request.id)"
                      :title="isMissingDates(request) ? 'Cannot approve: missing start/end dates' : ''"
                    >
                      <span v-if="isProcessing(request.id)" class="spinner-border spinner-border-sm me-1"></span>
                      Approve
                    </button>
                    <button 
                      class="btn btn-danger btn-sm flex-fill"
                      :disabled="isProcessing(request.id)"
                      @click="confirmRejectRequest(request.id)"
                    >
                      Reject
                    </button>
                    <router-link
                      :to="{ name: 'EventDetails', params: { id: request.id } }"
                      class="btn btn-outline-primary btn-sm flex-fill"
                      title="View event details"
                    >
                      <i class="fas fa-info-circle me-1"></i> Details
                    </router-link>
                  </div>
                </div>
                <div class="mt-2 small text-secondary">
                  <span class="fw-semibold">Description:</span>
                  <span class="truncate-text">{{ request.details?.description || 'No description provided' }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Confirmation Modal for Reject Request -->
      <ConfirmationModal
        :modalId="'manageRequestsConfirmModal'"  
        :visible="showRejectConfirmModal"
        title="Reject Event Request?"
        message="Are you sure you want to reject this event request? This action cannot be undone."
        confirmText="Reject Request"
        cancelText="Cancel"
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
import { EventStatus } from '@/types/event';
import { getEventStatusBadgeClass } from '@/utils/eventUtils';

const store = useStore();
const loading = ref<boolean>(false);
const error = ref<string | null>(null);
const processingRequestId = ref<string | null>(null);
const showRejectConfirmModal = ref<boolean>(false);
const eventIdToReject = ref<string | null>(null);

const pendingRequests = computed(() => store.getters['events/pendingEvents']);

// --- Helper: Get user name from allUsers in Vuex (like leaderboard logic) ---
function getUserNameByUid(uid: string): string | null {
  // Try to get from Vuex user module (allUsers)
  const allUsers = store.state.user?.allUsers;
  if (Array.isArray(allUsers)) {
    const user = allUsers.find((u: any) => u.uid === uid);
    if (user && user.name) return user.name;
  }
  return null;
}

// --- Ensure allUsers is loaded before rendering requests ---
onMounted(async () => {
  loading.value = true;
  try {
    // Fetch all users for name lookup (if not already loaded)
    if (!Array.isArray(store.state.user?.allUsers) || store.state.user.allUsers.length === 0) {
      await store.dispatch('user/fetchAllUsers');
    }
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
});

const sanitizedPendingRequests = computed(() => {
    return pendingRequests.value.map((request: any) => ({
        ...request,
        eventFormat: request.details?.format || 'Not specified',
        eventType: request.details?.type || 'Not specified',
        eventName: request.details?.eventName || 'Untitled Event',
        requesterName: request.requestedBy || 'Unknown',
        requesterNameDisplay: getUserNameByUid(request.requestedBy) || request.requestedBy || 'Unknown',
        organizerIds: Array.isArray(request.details?.organizers) ? request.details.organizers : [],
        organizerName: Array.isArray(request.details?.organizers) && request.details.organizers.length > 0
            ? request.details.organizers.map((uid: string) => getUserNameByUid(uid) || uid).join(', ')
            : '',
        description: request.details?.description || 'No description provided',
        startDate: request.details?.date?.start || null,
        endDate: request.details?.date?.end || null,
    }));
});

const getStatusClass = (status: EventStatus): string => getEventStatusBadgeClass(status);

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

function isMissingDates(request: any): boolean {
  if (!request) return true;
  return !request.startDate || !request.endDate;
}

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
  if (processingRequestId.value) return;
  const req = sanitizedPendingRequests.value.find((r: any) => r.id === eventId);
  if (isMissingDates(req)) {
    error.value = 'Cannot approve: This request is missing required start/end dates.';
    store.dispatch('notification/showNotification', {
      message: error.value,
      type: 'error'
    });
    return;
  }
  processingRequestId.value = eventId; 
  error.value = null;
  try {
    await store.dispatch('events/approveEventRequest', eventId);
    store.dispatch('notification/showNotification', {
      message: 'Event request approved successfully.',
      type: 'success'
    });
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
  console.log('Reject button clicked for event:', eventId); // DEBUG LOG
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

  console.log('Reject confirmed for event:', eventId); // DEBUG LOG

  processingRequestId.value = eventId;
  showRejectConfirmModal.value = false; 
  error.value = null;
  try {
    await store.dispatch('events/rejectEventRequest', { eventId, reason: 'Rejected by admin' });
    store.dispatch('notification/showNotification', {
        message: 'Event request rejected successfully.',
        type: 'success'
    });
    await fetchRequests();
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
</script>

<style scoped>
.animate-fade-in {
  animation: fadeIn 0.5s ease-in-out;
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

/* --- Compact Request Card Styles --- */
.compact-request-card {
  border-radius: 0.75rem;
  margin-bottom: 0.5rem;
}
.compact-request-card .card-header {
  border-bottom: 1px solid var(--bs-border-color);
  background: var(--bs-light);
  font-size: 1rem;
  padding-top: 0.5rem;
  padding-bottom: 0.5rem;
  flex-wrap: wrap;
}
.compact-request-card .card-body {
  padding: 0.75rem 1rem;
}
.compact-request-card .badge {
  font-size: 0.85em;
  padding: 0.35em 0.7em;
  word-break: break-word;
}
.compact-request-card .btn-sm {
  min-width: 90px;
}
.compact-request-card .small {
  font-size: 0.93em;
}
.truncate-text {
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: inline-block;
  vertical-align: bottom;
}
@media (max-width: 767.98px) {
  .compact-request-card .card-header {
    flex-direction: column;
    align-items: flex-start !important;
    gap: 0.5rem;
  }
  .compact-request-card .card-body {
    padding: 0.75rem 0.5rem;
  }
  .compact-request-card .btn-sm {
    min-width: 0;
    width: 100%;
  }
  .truncate-text {
    max-width: 120px;
  }
  .compact-request-card .row.g-2 {
    flex-direction: column;
  }
  .compact-request-card .col-md-5,
  .compact-request-card .col-md-7 {
    width: 100%;
    max-width: 100%;
    flex: 0 0 100%;
  }
  .compact-request-card .d-flex.flex-md-column {
    flex-direction: row !important;
    gap: 0.5rem !important;
    align-items: stretch !important;
    justify-content: flex-start !important;
  }
}
</style>
