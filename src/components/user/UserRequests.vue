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
            <div class="header-content d-flex align-items-center">
              <div class="header-icon bg-primary text-white rounded-circle me-3 d-flex align-items-center justify-content-center" style="width: 40px; height: 40px;">
                <i class="fas fa-clipboard-list"></i>
              </div>
              <div>
                <h5 class="section-title mb-1 text-primary-emphasis">Event Requests</h5>
                <p class="d-none d-sm-block section-subtitle small mb-0 text-muted">
                  Manage your event submissions and track their status
                </p>
              </div>
            </div>
            <div class="header-badge">
              <span class="badge bg-primary text-white rounded-pill px-3 py-2 fw-semibold">
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
              <!-- First Row: Request Name and Status Badge -->
              <div class="d-flex align-items-center justify-content-between mb-2">
                <div class="d-flex align-items-center">
                  <div class="item-icon bg-primary-subtle me-3">
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
                
                <!-- Status Badge -->
                <span 
                  class="status-badge badge rounded-pill"
                  :class="{
                    'bg-warning-subtle text-warning-emphasis': request.status === 'Pending',
                    'bg-danger-subtle text-danger-emphasis': request.status === 'Rejected'
                  }"
                >
                  <i class="fas me-1" :class="{
                    'fa-clock': request.status === 'Pending',
                    'fa-times-circle': request.status === 'Rejected'
                  }"></i>{{ request.status }}
                </span>
              </div>
              
              <!-- Second Row: Event Type and Date -->
              <div class="d-flex align-items-center justify-content-between ms-5">
                <!-- Event Type -->
                <span 
                  v-if="request.eventType" 
                  class="meta-badge badge bg-secondary-subtle text-secondary-emphasis rounded-pill"
                >
                  <i class="fas fa-tag me-1"></i>{{ request.eventType }}
                </span>
                <span v-else></span>
                
                <!-- Event Date -->
                <span 
                  v-if="request.eventDate"
                  class="date-badge badge bg-light text-dark border rounded-pill"
                >
                  <i class="fas fa-clock me-1"></i>{{ formatEventDate(request.eventDate) }}
                </span>
              </div>
            </div>

            <!-- Rejection Message -->
            <div v-if="request.status === 'Rejected' && request.rejectionReason" class="rejection-reason p-3 bg-danger-subtle border border-danger-subtle rounded-3 mb-3">
              <div class="d-flex align-items-start">
                <i class="fas fa-exclamation-triangle text-danger me-2 mt-1 flex-shrink-0"></i>
                <div>
                  <h6 class="text-danger-emphasis mb-1 fw-semibold">Rejection Reason</h6>
                  <p class="text-danger-emphasis mb-0 small">{{ request.rejectionReason }}</p>
                </div>
              </div>
            </div>

            <!-- Request Actions -->
            <div class="request-actions">
              <div class="actions-grid">
                <button
                  v-if="request.status === 'Pending'"
                  class="btn btn-outline-primary d-inline-flex align-items-center action-btn"
                  @click="editRequest(request)"
                >
                  <i class="fas fa-edit me-2"></i>Edit Request
                </button>
                
                <button
                  v-else-if="request.status === 'Rejected'"
                  class="btn btn-outline-primary d-inline-flex align-items-center action-btn"
                  @click="editRequest(request)"
                >
                  <i class="fas fa-redo me-2"></i>Resubmit Request
                </button>
                
                <button
                  class="btn btn-outline-danger d-inline-flex align-items-center action-btn"
                  :disabled="!!request._deleting"
                  @click="deleteRequest(request, index)"
                >
                  <span v-if="request._deleting" class="spinner-border spinner-border-sm me-2" role="status"></span>
                  <i v-else class="fas fa-trash me-2"></i>
                  {{ request._deleting ? 'Deleting...' : 'Delete' }}
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
      message="Are you sure you want to delete this event request? This action cannot be undone and the request will be permanently removed."
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
    eventDate?: any;
    eventType?: string | null;
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
const loadingRequests = computed(() => profileStore.isLoadingUserRequests);
const storeRequests = computed(() => profileStore.userRequests);

// Transform store data to component format
const allRequests = computed<Request[]>(() => {
  return storeRequests.value.map((event: StoreEvent): Request => {
    const baseRequestData = {
      id: event.id,
      eventName: event.details?.eventName || 'Unnamed Request',
      eventDate: event.details?.date?.start || null,
      eventType: event.details?.type || null,
      status: event.status as Request['status'],
      requestedBy: event.requestedBy,
      _deleting: (event as any)._deleting || false,
    };

    // Conditionally add rejectionReason if it's a non-null string
    if (event.rejectionReason !== null && event.rejectionReason !== undefined) {
      return {
        ...baseRequestData,
        rejectionReason: event.rejectionReason,
      };
    }
    return baseRequestData;
  });
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

const formatEventDate = (dateValue: any): string => {
  if (!dateValue) return 'Date not set';
  
  try {
    let date: Date;
    
    // Handle Firestore Timestamp
    if (dateValue && typeof dateValue.toDate === 'function') {
      date = dateValue.toDate();
    } 
    // Handle ISO string
    else if (typeof dateValue === 'string') {
      date = new Date(dateValue);
    }
    // Handle Date object
    else if (dateValue instanceof Date) {
      date = dateValue;
    }
    // Handle timestamp number
    else if (typeof dateValue === 'number') {
      date = new Date(dateValue);
    }
    else {
      return 'Invalid date';
    }
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return 'Invalid date';
    }
    
    // Format the date
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    console.warn('Error formatting event date:', error);
    return 'Date error';
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
  margin: 1rem 0;
  
  @media (min-width: 768px) {
    margin: 1.5rem 0;
  }
}

/* Loading content specific */
.loading-content {
  background: linear-gradient(135deg, var(--bs-light), rgba(var(--bs-primary-rgb), 0.05));
  padding: 2rem 1rem;
  
  @media (min-width: 768px) {
    padding: 3rem 1.5rem;
  }
}

/* Cards and Sections */
.section-card {
  overflow: hidden;
  transition: all 0.2s ease;
  border: 1px solid var(--bs-border-color-translucent);
}

.empty-state {
  padding: 2rem 1rem;
  text-align: center;
  
  @media (min-width: 768px) {
    padding: 3rem 1.5rem;
  }
}

.list-item {
  padding: 1rem;
  transition: background-color 0.2s ease;
  
  @media (min-width: 768px) {
    padding: 1.5rem;
  }
}

.list-item:hover {
  background-color: var(--bs-light);
}

/* Header improvements */
.section-header {
  padding: 0.75rem !important;
  
  @media (min-width: 768px) {
    padding: 1rem !important;
  }
}

.header-content {
  flex-grow: 1;
}

.header-icon {
  width: 2rem;
  height: 2rem;
  flex-shrink: 0;
  
  @media (min-width: 768px) {
    width: 2.5rem;
    height: 2.5rem;
  }
}

.section-title {
  font-weight: 600;
  font-size: 1rem;
  
  @media (min-width: 768px) {
    font-size: 1.1rem;
  }
}

.section-subtitle {
  font-size: 0.8rem;
  
  @media (min-width: 768px) {
    font-size: 0.875rem;
  }
}

.header-badge .badge {
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
  
  @media (min-width: 768px) {
    font-size: 0.875rem;
    padding: 0.35rem 0.75rem;
  }
}

/* Request-specific styles */
.request-title {
  font-size: 1rem;
  line-height: 1.4;
  transition: color 0.2s ease;
  
  @media (min-width: 768px) {
    font-size: 1.1rem;
  }
}

.request-title:hover {
  color: var(--bs-primary) !important;
  text-decoration: underline !important;
}

.request-title-container {
  flex-grow: 1;
}

/* Status and meta badges */
.status-badge,
.meta-badge,
.date-badge {
  font-size: 0.75rem;
  padding: 0.35rem 0.65rem;
  font-weight: 500;
}

.status-badge {
  font-weight: 600;
}

.date-badge {
  border: 1px solid var(--bs-border-color) !important;
}

/* Remove old request-meta styles and use consistent spacing */
.request-header .ms-5 {
  @media (max-width: 480px) {
    margin-left: 0 !important;
    margin-top: 0.5rem;
    justify-content: space-between;
  }
}

/* Filter tabs */
.filter-tabs {
  padding: 0.75rem;
  position: sticky;
  top: 0;
  z-index: 5;
  
  @media (min-width: 768px) {
    padding: 1rem;
  }
}

.filter-tabs .btn-group {
  gap: 0.25rem;
  
  @media (min-width: 768px) {
    gap: 0.5rem;
  }
}

.filter-tabs .btn-group .btn {
  border-radius: 6px !important;
  padding: 0.5rem 0.75rem;
  font-weight: 500;
  font-size: 0.8rem;
  transition: all 0.2s ease;
  
  @media (min-width: 768px) {
    border-radius: 8px !important;
    padding: 0.75rem 1rem;
    font-size: 0.875rem;
    font-weight: 600;
  }
}

.filter-tabs .btn-group .btn-check:checked + .btn {
  background-color: var(--bs-primary);
  border-color: var(--bs-primary);
  color: white;
  box-shadow: 0 2px 4px rgba(var(--bs-primary-rgb), 0.3);
  
  @media (min-width: 768px) {
    box-shadow: 0 2px 8px rgba(var(--bs-primary-rgb), 0.3);
    transform: translateY(-1px);
  }
}

/* Rejection reason */
.rejection-reason {
  padding: 0.75rem;
  border-left: 3px solid var(--bs-danger);
  font-size: 0.85rem;
  
  @media (min-width: 768px) {
    padding: 1rem;
    border-left: 4px solid var(--bs-danger);
    font-size: 0.9rem;
  }
}

/* Actions */
.request-actions {
  margin-top: 0.75rem;
  
  @media (min-width: 768px) {
    margin-top: 1rem;
  }
}

.actions-grid {
  display: flex;
  gap: 0.5rem;
  flex-wrap: nowrap;
  
  @media (min-width: 768px) {
    gap: 0.75rem;
  }
}

.action-btn {
  transition: all 0.2s ease;
  border-width: 1px;
  font-weight: 500;
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  flex: 1;
  min-width: 0;
  justify-content: center;
  font-size: 0.8rem;
  white-space: nowrap;
  
  @media (min-width: 768px) {
    border-width: 2px;
    font-weight: 600;
    padding: 0.6rem 1.2rem;
    border-radius: 8px;
    font-size: 0.875rem;
    min-width: 120px;
  }
}

.action-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  
  @media (min-width: 768px) {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  }
}

.action-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Error Section */
.error-section {
  margin-top: 1rem;
  
  @media (min-width: 768px) {
    margin-top: 1.5rem;
  }
}

.alert {
  border: none;
  border-left: 3px solid var(--bs-danger);
  padding: 0.75rem;
  
  @media (min-width: 768px) {
    border-left: 4px solid var(--bs-danger);
    padding: 1rem;
  }
}

.alert-icon {
  color: var(--bs-danger);
  opacity: 0.8;
}

.alert-content .alert-heading {
  color: var(--bs-danger-emphasis);
  font-weight: 600;
  font-size: 0.9rem;
  
  @media (min-width: 768px) {
    font-size: 1rem;
  }
}

/* Mobile-specific responsive adjustments */
@media (max-width: 480px) {
  .section-header .d-flex {
    flex-direction: row;
    align-items: center !important;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  
  .header-badge {
    margin-left: auto;
  }
  
  .request-header .d-flex:first-child {
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  
  .request-header .ms-5 {
    margin-left: 0 !important;
    margin-top: 0.5rem;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  
  .actions-grid {
    gap: 0.4rem;
  }
  
  .action-btn {
    min-width: 0;
    padding: 0.4rem 0.6rem;
    font-size: 0.75rem;
  }
  
  .filter-tabs .btn-group .btn {
    padding: 0.45rem 0.5rem;
    font-size: 0.75rem;
  }
}
</style>