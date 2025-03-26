// /src/views/ManageEventRequests.vue (Minor comment update)
<template>
    <div class="container">
      <h2>Manage Pending Event Requests</h2> <!-- Title updated slightly -->
      <div v-if="loading">Loading...</div>
      <div v-else-if="eventRequests.length === 0">No pending event requests.</div>
      <div v-else>
        <!-- Requests are now sorted by desiredStartDate -->
        <ul class="list-group">
          <li v-for="request in eventRequests" :key="request.id" class="list-group-item mb-3">
            <div>
              <h5>{{ request.eventName }} ({{ request.eventType }})</h5>
              <p class="mb-1"><small>Requested by: {{ request.requester }}</small></p> <!-- TODO: Fetch name -->
              <p class="mb-1"><small>Desired Dates: {{ formatDate(request.desiredStartDate) }} - {{ formatDate(request.desiredEndDate) }}</small></p>
              <p class="mb-2">Description: {{ request.description }}</p>
              <!-- Buttons only show for Pending status, which is all this view fetches -->
              <button @click="approveRequest(request.id)" class="btn btn-success btn-sm me-2">Approve</button>
              <button @click="rejectRequest(request.id)" class="btn btn-danger btn-sm">Reject</button>
            </div>
          </li>
        </ul>
      </div>
    </div>
  </template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { useStore } from 'vuex';

const store = useStore();
const loading = ref(true);
// This getter now fetches pending requests sorted by desiredStartDate
const eventRequests = computed(() => store.getters['events/allEventRequests']);

const formatDate = (dateOrTimestamp) => {
    // Handle both Firestore Timestamp and date strings
    let date;
    if (dateOrTimestamp && typeof dateOrTimestamp.seconds === 'number') {
        date = new Date(dateOrTimestamp.seconds * 1000);
    } else if (dateOrTimestamp) {
         try {
            date = new Date(dateOrTimestamp);
         } catch(e) { return 'Invalid Date';}
    } else {
        return 'N/A';
    }
     if (isNaN(date.getTime())) return 'Invalid Date'; // Check if date is valid
    return date.toLocaleDateString();
};


onMounted(async () => {
  loading.value = true;
  try {
      await store.dispatch('events/fetchEventRequests');
  } catch(error) {
       console.error("Failed to load requests:", error);
       // Optionally show an error message to the user
  } finally {
       loading.value = false;
  }
});

const approveRequest = async (requestId) => {
  try {
      // Show loading indicator?
      await store.dispatch('events/approveEventRequest', requestId);
       // Request should disappear from the list automatically due to state update
       alert('Request approved successfully!');
  } catch (error) {
    console.error('Error approving request:', error);
    alert(`Error approving request: ${error.message}`); // Show specific error
  }
};

const rejectRequest = async (requestId) => {
    try {
         // Show loading indicator?
        await store.dispatch('events/rejectEventRequest', requestId);
         // Request should disappear from the list automatically
         alert('Request rejected.');
    } catch (error) {
        console.error("Error rejecting request:", error);
         alert(`Error rejecting request: ${error.message}`);
    }
}

</script>

<style scoped>
 .list-group-item {
     border: 1px solid var(--color-border); /* Add border for clarity */
 }
</style>