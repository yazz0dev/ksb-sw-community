<template>
  <div class="user-requests-container">
    <!-- Loading State -->
    <div v-if="loadingRequests" class="loading-section animate-fade-in">
      <div class="section-card shadow-sm rounded-4">
        <div class="loading-content text-center py-5">
          <div class="spinner-border text-primary mb-3" role="status" style="width: 3rem; height: 3rem;">
            <span class="visually-hidden">Loading...</span>
          </div>
          <p class="text-secondary fw-medium">Loading requests...</p>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div
      v-else-if="allRequests.length === 0 && !errorMessage"
      class="empty-section animate-fade-in"
    >
      <div class="section-card shadow-sm rounded-4">
        <div class="empty-state">
          <div class="empty-icon mb-4">
            <i class="fas fa-calendar-times fa-3x text-muted opacity-50"></i>
          </div>
          <h6 class="empty-title mb-2">No Event Requests</h6>
          <p class="empty-description mb-3">You don't have any pending or rejected event requests at the moment.</p>
          
        </div>
      </div>
    </div>

    <!-- Requests List -->
    <div v-if="!loadingRequests && allRequests.length > 0" class="requests-section animate-fade-in">
      <div class="section-card shadow-sm rounded-4">
        <!-- Header -->
        <div class="section-header bg-primary-subtle text-primary-emphasis rounded-top-4 p-4 border-bottom">
          <div class="d-flex align-items-center justify-content-between">
            <div class="header-content">
              <div class="header-icon bg-primary-subtle">
                <i class="fas fa-clipboard-list fa-lg"></i>
              </div>
              <div>
                <h5 class="section-title mb-1 text-primary-emphasis">Event Requests</h5>
                <p class="d-none d-sm-block section-subtitle small mb-0">
                  {{ pendingRequests.length }} pending, {{ rejectedRequests.length }} rejected
                </p>
              </div>
            </div>
            <div class="header-badge">
              <span class="badge bg-primary text-white rounded-pill px-3 py-2">
                {{ allRequests.length }}
              </span>
            </div>
          </div>
        </div>

        <!-- Filter Tabs -->
        <div v-if="pendingRequests.length > 0 && rejectedRequests.length > 0" class="filter-tabs p-3 bg-body-tertiary border-bottom">
          <div class="btn-group w-100" role="group">
            <input type="radio" class="btn-check" name="statusFilter" id="pending-requests" v-model="statusFilter" value="pending" autocomplete="off">
            <label class="btn btn-outline-primary flex-fill" for="pending-requests">
              <i class="fas fa-clock me-2"></i>Pending ({{ pendingRequests.length }})
            </label>
            
            <input type="radio" class="btn-check" name="statusFilter" id="rejected-requests" v-model="statusFilter" value="rejected" autocomplete="off">
            <label class="btn btn-outline-primary flex-fill" for="rejected-requests">
              <i class="fas fa-times-circle me-2"></i>Rejected ({{ rejectedRequests.length }})
            </label>
          </div>
        </div>

        <!-- Requests Content -->
        <div class="item-list">
          <div 
            v-for="(request, index) in filteredRequests" 
            :key="request.id" 
            class="list-item p-4"
            :class="{ 'border-bottom': index < filteredRequests.length - 1 }"
          >
            <!-- Request Header -->
            <div class="request-header mb-3">
              <div class="d-flex align-items-start mb-2 flex-wrap">
                <div class="d-flex align-items-center me-auto mb-2">
                  <div class="item-icon me-3 bg-primary-subtle">
                    <i class="fas fa-calendar-alt text-primary"></i>
                  </div>
                  <div class="request-title-container">
                    <router-link 
                      :to="{ name: 'EventDetails', params: { id: request.id } }" 
                      class="request-title text-decoration-none fw-semibold text-dark hover-primary"
                    >
                      {{ request.eventName }}
                    </router-link>
                  </div>
                </div>

                <!-- Request Status -->
                <div class="request-status-section mb-2">
                  <span :class="['status-badge badge rounded-pill', getStatusClass(request.status)]">
                    <i class="fas fa-circle me-2"></i>
                    {{ request.status }}
                  </span>
                </div>
              </div>

              <!-- Rejection Message -->
              <div v-if="request.status === 'Rejected' && request.rejectionReason" class="rejection-reason mt-2 p-3 bg-danger-subtle border border-danger-subtle rounded">
                <div class="d-flex align-items-start">
                  <i class="fas fa-info-circle text-danger me-2 mt-1"></i>
                  <div>
                    <h6 class="text-danger-emphasis mb-1">Rejection Reason</h6>
                    <p class="text-danger-emphasis mb-0 small">{{ request.rejectionReason }}</p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Request Actions -->
            <div v-if="request.status === 'Pending'" class="request-actions">
              <div class="actions-grid">
                <button
                  class="btn btn-outline-primary btn-sm-mobile d-inline-flex align-items-center action-btn"
                  @click="editRequest(request)"
                >
                  <i class="fas fa-edit me-2"></i>Edit Request
                </button>
                
                <button
                  class="btn btn-outline-danger btn-sm-mobile d-inline-flex align-items-center action-btn"
                  :disabled="!!request._deleting"
                  @click="deleteRequest(request, index)"
                >
                  <span v-if="request._deleting" class="spinner-border spinner-border-sm me-2" role="status"></span>
                  <i v-else class="fas fa-trash me-2"></i>
                  {{ request._deleting ? 'Deleting...' : 'Delete Request' }}
                </button>
              </div>
            </div>

            <!-- Action for Rejected Events -->
            <div v-else-if="request.status === 'Rejected'" class="request-actions">
              <div class="actions-grid">
                <button
                  class="btn btn-outline-primary btn-sm-mobile d-inline-flex align-items-center action-btn"
                  @click="editRequest(request)"
                >
                  <i class="fas fa-edit me-2"></i>Resubmit Request
                </button>
                
                <button
                  class="btn btn-outline-danger btn-sm-mobile d-inline-flex align-items-center action-btn"
                  :disabled="!!request._deleting"
                  @click="deleteRequest(request, index)"
                >
                  <span v-if="request._deleting" class="spinner-border spinner-border-sm me-2" role="status"></span>
                  <i v-else class="fas fa-trash me-2"></i>
                  {{ request._deleting ? 'Deleting...' : 'Delete Request' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Error Alert -->
    <div v-if="errorMessage" class="error-section animate-fade-in">
      <div class="alert alert-danger alert-dismissible fade show shadow-sm rounded-4" role="alert">
        <div class="d-flex align-items-center">
          <div class="alert-icon me-3">
            <i class="fas fa-exclamation-triangle fa-lg"></i>
          </div>
          <div class="alert-content flex-grow-1">
            <h6 class="alert-heading mb-1">Error</h6>
            <p class="mb-0">{{ errorMessage }}</p>
          </div>
        </div>
        <button type="button" class="btn-close" @click="errorMessage = ''" aria-label="Close"></button>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <ConfirmationModal
      ref="deleteConfirmationModal"
      modal-id="deleteRequestModal"
      title="Delete Request"
      message="Are you sure you want to delete this pending event request? This action cannot be undone and the request will be permanently removed."
      confirm-text="Delete"
      cancel-text="Cancel"
      variant="danger"
      @confirm="confirmDeleteRequest"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useProfileStore } from '@/stores/profileStore';
import { useEventStore } from '@/stores/eventStore';
import { useRouter } from 'vue-router';
import ConfirmationModal from '@/components/ui/ConfirmationModal.vue';
import type { Event as StoreEvent } from '@/types/event';

// Local interface for the component's needs
interface Request {
    id: string;
    eventName: string;
    status: 'Pending' | 'Rejected';
    rejectionReason?: string;
    _deleting?: boolean;
    [key: string]: any;
}

// Define StatusFilter type without 'all'
type StatusFilter = 'pending' | 'rejected';

// Stores and router
const profileStore = useProfileStore();
const eventStore = useEventStore();
const router = useRouter();

// Local state
const errorMessage = ref<string>('');
const pendingDeleteRequest = ref<{ request: Request; index: number } | null>(null);
const deleteConfirmationModal = ref<InstanceType<typeof ConfirmationModal> | null>(null);
const statusFilter = ref<StatusFilter>('pending');

// Computed properties for reactive data from stores
const loadingRequests = computed(() => {
  const val = profileStore.isLoadingUserRequests;
  return val;
});
const storeRequests = computed(() => {
  const val = profileStore.userRequests;
  return val;
});

// Transform store data to component format
const allRequests = computed<Request[]>(() => {
  const mapped = storeRequests.value.map((event: StoreEvent): Request => {
    // Base object without rejectionReason
    const baseRequestData = {
      id: event.id,
      eventName: event.details?.eventName || 'Unnamed Request',
      status: event.status as Request['status'], // Assuming event.status aligns with 'Pending' | 'Rejected'
      requestedBy: event.requestedBy, // Assuming StoreEvent has requestedBy: string
      _deleting: (event as any)._deleting || false,
    };

    // Conditionally add rejectionReason if it's a non-null string
    // StoreEvent (Event type from @/types/event) has rejectionReason: string | null
    if (event.rejectionReason !== null && event.rejectionReason !== undefined) {
      return {
        ...baseRequestData,
        rejectionReason: event.rejectionReason,
      };
    }
    // If event.rejectionReason is null or undefined, return the base object.
    // The rejectionReason property will be omitted, making it `undefined` on the Request type.
    return baseRequestData;
  });
  return mapped;
});

// Filtered requests by status
const pendingRequests = computed(() => 
  allRequests.value.filter(request => request.status === 'Pending')
);

const rejectedRequests = computed(() => 
  allRequests.value.filter(request => request.status === 'Rejected')
);

const filteredRequests = computed(() => {
  return statusFilter.value === 'pending' 
    ? pendingRequests.value 
    : rejectedRequests.value;
});

// Utility functions
const getStatusClass = (status: Request['status']): string => {
    switch (status) {
        case 'Pending': return 'bg-warning-subtle text-warning-emphasis';
        case 'Rejected': return 'bg-danger-subtle text-danger-emphasis';
        default: return 'bg-secondary-subtle text-secondary-emphasis';
    }
};

const deleteRequest = (request: Request, index: number) => {
  if (request._deleting) return;
  pendingDeleteRequest.value = { request, index };
  deleteConfirmationModal.value?.show();
};

const confirmDeleteRequest = async () => {
  if (!pendingDeleteRequest.value) return;
  
  const { request } = pendingDeleteRequest.value;
  
  // Set deleting state directly on the request object in the store
  const storeRequest = storeRequests.value.find(r => r.id === request.id);
  if (storeRequest) {
    (storeRequest as any)._deleting = true;
  }
  
  try {
    const success = await eventStore.deleteEventRequest(request.id);
    if (!success) {
      if (storeRequest) {
        (storeRequest as any)._deleting = false;
      }
    }
  } catch (error) {
    errorMessage.value = 'An unexpected error occurred while deleting the request.';
    if (storeRequest) {
      (storeRequest as any)._deleting = false;
    }
  } finally {
    pendingDeleteRequest.value = null;
  }
};

const editRequest = (request: Request): void => {
  router.push({ name: 'EditEvent', params: { eventId: request.id } });
};

// Watch for fetch errors from the store
watch(() => profileStore.fetchError, (newError) => {
  if (newError) {
    errorMessage.value = newError;
  }
});

// Clear error message when store error is cleared
watch(() => profileStore.fetchError, (newError) => {
  if (!newError && errorMessage.value === profileStore.fetchError) {
    errorMessage.value = '';
  }
});

// Set default filter based on available data
watch([pendingRequests, rejectedRequests], ([pending, rejected]) => {
  if (pending.length > 0) {
    statusFilter.value = 'pending';
  } else if (rejected.length > 0) {
    statusFilter.value = 'rejected';
  }
}, { immediate: true });
</script>

<style scoped>
/* Container */
.user-requests-container {
  margin: 1.5rem 0;
}

/* Loading content specific */
.loading-content {
  background: linear-gradient(135deg, var(--bs-light), rgba(var(--bs-primary-rgb), 0.05));
}

/* Cards and Sections */
.section-card {
  overflow: hidden;
  transition: all 0.3s ease;
}

.empty-state {
  padding: 3rem 1.5rem;
  text-align: center;
}

.list-item {
  padding: 1.25rem;
  transition: background-color 0.2s ease;
}

.list-item:hover {
  background-color: rgba(var(--bs-primary-rgb), 0.03);
}

/* Status Section */
.status-badge {
  font-size: 0.8rem;
  padding: 0.5rem 0.85rem;
  font-weight: 600;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
  letter-spacing: 0.01em;
}

.status-badge i {
  font-size: 0.7rem;
}

/* Request-specific styles */
.request-title {
  font-size: 1.15rem;
  line-height: 1.4;
  transition: color 0.2s ease;
  display: inline-block;
}

.request-title.hover-primary:hover {
  color: var(--bs-primary) !important;
  text-decoration: underline !important;
}

/* Icons */
.item-icon {
  width: 42px;
  height: 42px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

/* Filter tabs */
.filter-tabs {
  position: sticky;
  top: 0;
  z-index: 5;
}

.filter-tabs .btn-group {
  gap: 0.5rem;
}

.filter-tabs .btn-group .btn {
  border-radius: 6px !important;
  padding: 0.6rem 1rem;
  font-weight: 500;
}

.filter-tabs .btn-group .btn-check:checked + .btn {
  background-color: var(--bs-primary);
  border-color: var(--bs-primary);
  color: white;
  box-shadow: 0 2px 5px rgba(var(--bs-primary-rgb), 0.3);
}

/* Rejection reason */
.rejection-reason {
  border-left: 4px solid var(--bs-danger);
  border-radius: 8px;
  margin-top: 1rem;
}

/* Actions */
.request-actions {
  margin-top: 1.5rem;
}

.actions-grid {
  display: flex;
  gap: 1rem;
}

.action-btn {
  transition: all 0.2s ease;
  border-width: 2px;
  font-weight: 500;
  padding: 0.6rem 1.2rem;
  border-radius: 6px;
  min-width: 140px;
  justify-content: center;
}

.action-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.1);
}

.action-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Error Section */
.error-section {
  margin-top: 1.5rem;
}

.alert {
  border: none;
  border-left: 4px solid var(--bs-danger);
}

.alert-icon {
  color: var(--bs-danger);
  opacity: 0.8;
}

.alert-content .alert-heading {
  color: var(--bs-danger-emphasis);
  font-weight: 600;
}

/* Responsive Design */
@media (max-width: 992px) {
  .section-header {
    padding: 1.25rem !important;
  }
  
  .request-title {
    font-size: 1.05rem;
  }
  
  .action-btn {
    min-width: 120px;
    padding: 0.5rem 1rem;
  }
}

@media (max-width: 768px) {
  .action-btn {
    width: 100%;
    font-size: 0.9rem;
    padding: 0.7rem 1rem;
  }
  
  .list-item {
    padding: 1.25rem 1rem;
  }
  
  .request-header .request-title {
    font-size: 1rem;
  }
}

@media (max-width: 576px) {
  .user-requests-container {
    margin: 1rem 0;
  }
  
  .actions-grid {
    flex-direction: column;
    gap: 0.75rem;
  }
  
  .action-btn {
    width: 100%;
    justify-content: center;
    padding: 0.75rem;
    border-radius: 8px;
  }
  
  .status-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0.4rem 0.75rem;
  }
  
  .filter-tabs .btn-group .btn {
    padding: 0.75rem 0.5rem;
    font-size: 0.875rem;
  }
  
  .list-item {
    padding: 1.25rem 0.85rem;
  }
  
  .section-header {
    padding: 1rem !important;
  }
  
  .section-header .section-title {
    font-size: 1.1rem;
  }
  
  .rejection-reason {
    padding: 0.75rem !important;
  }
}
</style>