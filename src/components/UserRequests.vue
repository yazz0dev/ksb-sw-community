// src/components/UserRequests.vue
<template>
  <div>
    <div v-if="loading" class="text-center">
        <div class="spinner-border spinner-border-sm" role="status">
            <span class="visually-hidden">Loading requests...</span>
        </div>
    </div>
    <div v-else-if="requests.length === 0" class="alert alert-light">
        No event requests found.
    </div>
    <div v-else>
      <ul class="list-group list-group-flush">
        <li v-for="request in requests" :key="request.id" class="list-group-item px-0 py-3">
          <div class="d-flex justify-content-between align-items-start">
            <div>
              <h6 class="mb-1">
                {{ request.eventName }}
                <span class="text-muted fw-normal">({{ request.eventType }})</span>
              </h6>
              <p class="mb-1 small">{{ request.description }}</p>
              <p class="mb-0 small text-muted">
                Desired: {{ formatDate(request.startDate) }} - {{ formatDate(request.endDate) }} |
                Requested: {{ formatDate(request.requestedAt) }}
              </p>
            </div>
            <span :class="['badge', statusBadgeClass(request.status)]">
              {{ request.status }}
            </span>
          </div>
          <!-- Display Rejection Reason -->
          <div v-if="request.status === 'Rejected' && request.rejectionReason" class="alert alert-warning alert-sm mt-2 py-1 px-2">
            <strong>Reason for Rejection:</strong> {{ request.rejectionReason }}
          </div>

          <!-- Action Buttons -->
          <div v-if="request.status === 'Pending' || request.status === 'Rejected'" class="mt-2 d-flex justify-content-end gap-2">
            <button
              @click="editRequest(request)"
              class="btn btn-outline-primary btn-sm"
              :disabled="isSubmitting">
              <i class="fas fa-edit"></i> Edit
            </button>
            <button 
              @click="deleteOwnRequest(request.id)" 
              class="btn btn-outline-danger btn-sm"
              :disabled="isSubmitting"
              v-if="request.status === 'Pending'"> <!-- Only show Delete for Pending -->
              <i class="fas fa-trash"></i> Delete
            </button>
          </div>
        </li>
      </ul>
    </div>
    <div v-if="error" class="alert alert-danger mt-3">{{ error }}</div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useStore } from 'vuex';
import { useRouter } from 'vue-router';

const store = useStore();
const router = useRouter();
const loading = ref(true);
const deletingId = ref(null);
const deleteError = ref('');
const isSubmitting = ref(false);
const error = ref('');

// Get current user from store
const user = computed(() => store.getters['user/getUser']);

// Updated requests computed property using user from store
const requests = computed(() => 
    store.getters['events/allEvents'].filter(event => 
        event.requesterId === user.value?.uid &&
        ['Pending', 'Rejected'].includes(event.status)
    ).sort((a, b) => (b.requestedAt?.seconds ?? 0) - (a.requestedAt?.seconds ?? 0))
);

// Robust Date Formatting
const formatDate = (dateInput) => {
    if (!dateInput) return 'N/A';
    const date = dateInput instanceof Date ? dateInput : new Date(dateInput.seconds * 1000);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

// Status Badge Class
const statusBadgeClass = (status) => {
    switch (status) {
        case 'Pending': return 'bg-warning text-dark';
        case 'Rejected': return 'bg-danger';
        default: return 'bg-secondary';
    }
};

// Delete own pending request
const deleteOwnRequest = async (eventId) => {
     if (deletingId.value) return; // Prevent multiple deletes
     if (!confirm("Are you sure you want to delete this pending request?")) return;
     deletingId.value = eventId;
     deleteError.value = '';
     try {
         // Dispatch the generic deleteEvent action - it has permission checks
         await store.dispatch('events/deleteEvent', eventId);
         alert("Request deleted successfully.");
         // The list will update automatically via the computed property watching the store
     } catch (error) {
         console.error("Error deleting own request:", error);
         deleteError.value = `Failed to delete request: ${error.message}`;
     } finally {
         deletingId.value = null;
     }
};

// New method to handle edit request
const editRequest = (request) => {
    router.push({
        name: 'RequestEvent',
        query: { edit: request.id }
    });
};

onMounted(async () => {
  loading.value = true;
  // Ensure events are fetched initially if not already
  if (store.getters['events/allEvents'].length === 0) {
      try {
          await store.dispatch('events/fetchEvents');
      } catch (error) {
          console.error('Error fetching events for UserRequests:', error);
      }
  }
  loading.value = false; // Loading complete after checking/fetching events
});

// Watch the computed property to potentially stop loading if it populates
watch(requests, () => {
    // This might not be strictly necessary if onMounted handles it,
    // but ensures loading stops if store updates after mount
     if (loading.value) {
          loading.value = false;
     }
}, { immediate: true });

</script>

<style scoped>
.spinner-border-sm { width: 1rem; height: 1rem; border-width: .15em; }
.badge { font-size: 0.75em; align-self: center; }
</style>
