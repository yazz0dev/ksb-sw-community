<template>
  <div class="user-requests-container bg-light p-4 rounded border shadow-sm">
    <div v-if="loadingRequests" class="text-center py-5">
      <div class="spinner-border text-primary mb-2" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
      <p class="text-secondary">Loading requests...</p>
    </div>

    <div
      v-else-if="requests.length === 0 && !errorMessage"
      class="alert alert-info text-center small p-3"
      role="alert"
    >
      <div class="mb-2 text-info-emphasis">
        <i class="fas fa-calendar-times fa-2x"></i>
      </div>
      <p class="mb-0" style="font-style: italic;">No pending requests found.</p>
    </div>

    <transition name="fade">
      <div v-if="!loadingRequests && requests.length > 0">
        <!-- Use request.id for key which is guaranteed unique -->
        <div v-for="(request, index) in requests" :key="request.id" class="py-3 request-item">
          <h6 class="h6 text-primary mb-1">
            <!-- Link should still work as request.id maps correctly -->
            <router-link :to="{ name: 'EventDetails', params: { id: request.id } }" class="text-decoration-none">
              <!-- Use request.eventName from the mapped structure -->
              {{ request.eventName }}
            </router-link>
          </h6>
          <div class="d-flex align-items-center mb-2">
            <small class="text-secondary me-2">Status:</small>
            <!-- Use request.status from the mapped structure -->
            <span :class="['badge rounded-pill', getStatusClass(request.status)]">
              {{ request.status }}
            </span>
          </div>
          <div v-if="request.status === 'Pending'" class="d-flex gap-2">
            <button
              class="btn btn-sm btn-outline-primary"
              @click="editRequest(request)"
            >
              <i class="fas fa-edit me-1"></i>
              Edit Request
            </button>
            <button
              class="btn btn-sm btn-outline-danger"
              :disabled="request._deleting"
              @click="deleteRequest(request, index)"
            >
              <span v-if="request._deleting" class="spinner-border spinner-border-sm me-1" role="status"></span>
              <i v-else class="fas fa-trash me-1"></i>
              Delete Request
            </button>
          </div>
        </div>
      </div>
    </transition>

    <div v-if="errorMessage" class="alert alert-danger alert-dismissible fade show mt-4" role="alert">
      {{ errorMessage }}
      <button type="button" class="btn-close" @click="errorMessage = ''" aria-label="Close"></button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { doc, deleteDoc } from 'firebase/firestore';
import { useUserStore } from '@/store/user';
import { useRouter } from 'vue-router'; // Import if needed for routing
import { db } from '@/firebase';
// Import the Event type from the store's perspective
import type { Event as StoreEvent, EventStatus } from '@/types/event';

// Local interface for the component's needs
interface Request {
    id: string;
    eventName: string; // Needs eventName directly
    status: 'Pending' | 'Approved' | 'Rejected';
    _deleting?: boolean; // Keep temporary state property
    // Allow other properties if needed for flexibility, but try to be specific
    [key: string]: any;
}

const userStore = useUserStore();
const router = useRouter(); // Initialize router from the imported useRouter
const requests = ref<Request[]>([]); // Use the local Request interface
const loadingRequests = ref<boolean>(true);
const errorMessage = ref<string>('');

const getStatusClass = (status: Request['status']): string => {
    switch (status) {
        case 'Pending': return 'bg-warning-subtle text-warning-emphasis';
        case 'Approved': return 'bg-success-subtle text-success-emphasis'; // Although not fetched, good to have
        case 'Rejected': return 'bg-danger-subtle text-danger-emphasis';
        default: return 'bg-secondary-subtle text-secondary-emphasis';
    }
};

const fetchRequests = async (): Promise<void> => {
    // Set loading state and clear previous errors at the beginning of the function
    loadingRequests.value = true;
    errorMessage.value = '';

    try {
        const user = userStore.currentUser;
        if (!user?.uid) {
            errorMessage.value = 'User not logged in.';
            // loadingRequests.value = false; // This line is removed; finally block will handle it.
            return;
        }

        // Fetch user requests (returns StoreEvent[])
        await userStore.fetchUserRequests(user.uid);
        const storeRequests: StoreEvent[] = userStore.userRequests; // Type as StoreEvent[]

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

const deleteRequest = async (request: Request, index: number) => {
  // Ensure _deleting doesn't cause type issues
  if (request._deleting) return;
  if (!confirm('Are you sure you want to delete this pending event request?')) return;
  request._deleting = true; // Add temporary state
  try {
    await deleteDoc(doc(db, 'events', request.id));
    requests.value.splice(index, 1); // Remove from local array
  } catch (error) {
    errorMessage.value = 'Failed to delete the request.';
    // Reset temporary state on error
    if (requests.value[index]) { // Check if element still exists
        requests.value[index]._deleting = false;
    }
  }
  // No finally needed here as _deleting is removed with splice on success
};

const editRequest = (request: Request): void => {
  router.push({ name: 'EditEvent', params: { eventId: request.id } });
};

onMounted(fetchRequests);
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.request-item + .request-item {
    border-top: 1px solid var(--bs-border-color); /* Use Bootstrap border color */
}

</style>