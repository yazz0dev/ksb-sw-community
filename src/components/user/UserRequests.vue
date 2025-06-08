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
      v-else-if="requests.length === 0 && !errorMessage"
      class="empty-section animate-fade-in"
    >
      <div class="section-card shadow-sm rounded-4">
        <div class="empty-state">
          <div class="empty-icon mb-4">
            <i class="fas fa-calendar-times fa-3x text-muted opacity-50"></i>
          </div>
          <h6 class="empty-title mb-2">No Pending Requests</h6>
          <p class="empty-description mb-0">You don't have any pending event requests at the moment.</p>
        </div>
      </div>
    </div>

    <!-- Requests List -->
    <div v-if="!loadingRequests && requests.length > 0" class="requests-section animate-fade-in">
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
                <p class="d-none d-sm-block section-subtitle small mb-0">{{ requests.length }} pending request{{ requests.length === 1 ? '' : 's' }}</p>
              </div>
            </div>
            <div class="header-badge">
              <span class="badge bg-primary text-white rounded-pill px-3 py-2">
                {{ requests.length }}
              </span>
            </div>
          </div>
        </div>

        <!-- Requests Content -->
        <div class="item-list">
          <div 
            v-for="(request, index) in requests" 
            :key="request.id" 
            class="list-item"
            :class="{ 'border-bottom': index < requests.length - 1 }"
          >
            <!-- Request Header -->
            <div class="request-header mb-3">
              <div class="d-flex align-items-center mb-2 flex-wrap">
                <div class="d-flex align-items-center me-3 mb-2">
                  <div class="item-icon me-2 bg-primary-subtle">
                    <i class="fas fa-file-alt text-primary"></i>
                  </div>
                  <div class="request-title-container flex-grow-1">
                    <router-link 
                      :to="{ name: 'EventDetails', params: { id: request.id } }" 
                      class="request-title text-decoration-none fw-semibold text-dark hover-primary"
                    >
                      {{ request.eventName }}
                    </router-link>
                  </div>
                </div>

                <!-- Request Status -->
                <div class="request-status-section ms-md-auto mb-2">
                  <div class="d-flex align-items-center">
                    <span class="status-label text-muted small me-2">Status:</span>
                    <span :class="['status-badge badge rounded-pill', getStatusClass(request.status)]">
                      <i class="fas fa-circle me-1 text-overline"></i>
                      {{ request.status }}
                    </span>
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
                  :disabled="request._deleting"
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
import { ref, onMounted, watchEffect } from 'vue';
import { useProfileStore } from '@/stores/profileStore';
import { useEventStore } from '@/stores/eventStore';
import { useAppStore } from '@/stores/appStore';
import { useRouter } from 'vue-router';
import ConfirmationModal from '@/components/ui/ConfirmationModal.vue';
import type { Event as StoreEvent } from '@/types/event';

// Local interface for the component's needs
interface Request {
    id: string;
    eventName: string; // Needs eventName directly
    status: 'Pending' | 'Approved' | 'Rejected';
    _deleting?: boolean; // Keep temporary state property
    // Allow other properties if needed for flexibility, but try to be specific
    [key: string]: any;
}

// Explicitly type studentStore using ReturnType
const studentStore = useProfileStore();
const eventStore = useEventStore();
const appStore = useAppStore();
const router = useRouter(); // Initialize router from the imported useRouter
const requests = ref<Request[]>([]); // Use the local Request interface
const loadingRequests = ref<boolean>(true);
const errorMessage = ref<string>('');
const pendingDeleteRequest = ref<{ request: Request; index: number } | null>(null);
const deleteConfirmationModal = ref<InstanceType<typeof ConfirmationModal> | null>(null);

const getStatusClass = (status: Request['status']): string => {
    switch (status) {
        case 'Pending': return 'bg-warning-subtle text-warning-emphasis';
        case 'Approved': return 'bg-success-subtle text-success-emphasis'; // Although not fetched, good to have
        case 'Rejected': return 'bg-danger-subtle text-danger-emphasis';
        default: return 'bg-secondary-subtle text-secondary-emphasis';
    }
};

const fetchRequestsInternal = async (uid: string): Promise<void> => {
    errorMessage.value = '';

    try {
        // Use a type assertion with 'as unknown as' for safer casting
        // const typedStore = studentStore as unknown as ProfileStoreWithUserRequests; // No longer needed
        
        // Use the properly typed store reference and passed uid
        await studentStore.fetchUserRequests(uid); // Use studentStore directly
        const storeRequests: StoreEvent[] = studentStore.userRequests; // Use studentStore directly

        // Map StoreEvent[] to Request[] for the component's needs
        requests.value = storeRequests.map((event: StoreEvent): Request => ({
            id: event.id,
            // Extract eventName from details, provide fallback
            eventName: event.details?.eventName || 'Unnamed Request',
            // Cast status to match the local Request type's status enum
            status: event.status as Request['status'],
            // Optionally copy other needed fields if the component uses them
            // For example, if you needed requestedBy:
            requestedBy: event.requestedBy
        }));

    } catch (error) {
        console.error('Error fetching requests:', error);
        errorMessage.value = 'Unable to load requests at this time';
        requests.value = [];
    } finally {
        loadingRequests.value = false;
    }
};

const deleteRequest = (request: Request, index: number) => {
  console.log('deleteRequest called for:', request.id);
  if (request._deleting) return;
  pendingDeleteRequest.value = { request, index };
  console.log('Pending delete request set:', pendingDeleteRequest.value);
  console.log('Attempting to show modal. Ref:', deleteConfirmationModal.value);
  deleteConfirmationModal.value?.show();
};

const confirmDeleteRequest = async () => {
  if (!pendingDeleteRequest.value) return;
  
  const { request, index } = pendingDeleteRequest.value;
  request._deleting = true;
  
  try {
    const success = await eventStore.deleteEventRequest(request.id);
    if (success) {
      requests.value.splice(index, 1);
    } else {
      // Error is handled and notified by the store, but we need to reset the button state
      errorMessage.value = 'Failed to delete the request. Please check notifications for details.';
      if (requests.value[index]) {
          requests.value[index]._deleting = false;
      }
    }
  } catch (error) {
    errorMessage.value = 'An unexpected error occurred while deleting the request.';
    if (requests.value[index]) {
        requests.value[index]._deleting = false;
    }
  } finally {
    pendingDeleteRequest.value = null;
  }
};

const editRequest = (request: Request): void => {
  router.push({ name: 'EditEvent', params: { eventId: request.id } });
};

onMounted(() => {
  watchEffect(async () => {
    // Assuming studentStore.currentStudent is already the EnrichedStudentData | null
    const user = studentStore.currentStudent; 
    const initialAuthDone = appStore.hasFetchedInitialAuth;

    if (user?.uid) {
      loadingRequests.value = true;
      await fetchRequestsInternal(user.uid);
    } else if (initialAuthDone && !user?.uid) {
      requests.value = [];
      loadingRequests.value = false;
    } else if (!initialAuthDone) {
      loadingRequests.value = true; 
    }
  });
});
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

/* Status Section */
.status-label {
  font-weight: 500;
}

.status-badge {
  font-size: 0.75rem;
  padding: 0.35rem 0.65rem;
  font-weight: 500;
}

/* Request-specific styles */
.request-title {
  font-size: 1.1rem;
  line-height: 1.4;
  transition: color 0.3s ease;
}

.request-title.hover-primary:hover {
  color: var(--bs-primary) !important;
}

/* Actions */
.request-actions {
  margin-top: 1rem;
}

.actions-grid {
  display: flex;
  gap: 0.75rem;
}

.action-btn {
  transition: all 0.3s ease;
  border-width: 1.5px;
  font-weight: 500;
  flex-grow: 1;
}

.action-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: var(--bs-box-shadow-sm);
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
@media (max-width: 768px) {
  .user-requests-container {
    margin: 1rem 0;
  }
  
  .request-header .d-flex.flex-wrap {
    flex-direction: column;
    align-items: flex-start !important;
  }
  
  .request-status-section,
  .request-actions {
    margin-left: 2.75rem !important;
  }
  
  .actions-grid {
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .action-btn {
    width: 100%;
    justify-content: center;
  }
}

@media (max-width: 480px) {
  .request-header .d-flex {
    flex-direction: column;
    align-items: flex-start !important;
    gap: 0.5rem;
  }
  
  .request-status-section,
  .request-actions {
    margin-left: 0 !important;
    width: 100%;
  }
  
  .alert {
    flex-direction: column;
    text-align: center;
    gap: 0.75rem;
  }
  
  .alert-icon {
    margin: 0 !important;
  }
}
</style>