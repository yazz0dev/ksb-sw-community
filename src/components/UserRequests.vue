// src/components/UserRequests.vue
<template>
  <div>
    <div v-if="loading" class="text-center">
        <div class="spinner-border spinner-border-sm" role="status">
            <span class="visually-hidden">Loading...</span>
        </div>
    </div>
    <div v-else-if="requests.length === 0" class="alert alert-light">No event requests found.</div>
    <div v-else>
      <ul class="list-group list-group-flush"> 
        <li v-for="request in requests" :key="request.id" class="list-group-item px-0 py-3"> 
          <div class="d-flex justify-content-between align-items-start">
              <div>
                <h6 class="mb-1">{{ request.eventName }} <span class="text-muted fw-normal">({{ request.eventType }})</span></h6>
                 <p class="mb-1 small">Description: {{ request.description }}</p>
                 <p class="mb-0 small text-muted">
                     Desired: {{ formatDate(request.desiredStartDate) }} - {{ formatDate(request.desiredEndDate) }} |
                     Requested: {{ formatDate(request.createdAt) }}
                </p>
              </div>
               <span :class="['badge', statusBadgeClass(request.status)]">{{ request.status }}</span>
          </div>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup> // Using setup script
import { computed, onMounted, ref } from 'vue';
import { useStore } from 'vuex';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore'; // Removed Timestamp (not needed for reading)
import { db } from '../firebase';

const store = useStore();
const loading = ref(true);
const requests = ref([]);

// Robust Date Formatting
const formatDate = (dateInput) => {
  if (!dateInput) return 'N/A';
  let date;
  try {
    if (dateInput.seconds) { // Check if it's a Firestore Timestamp
      date = dateInput.toDate();
    } else if (typeof dateInput === 'string' || dateInput instanceof Date || typeof dateInput === 'number') {
      date = new Date(dateInput); // Try creating date from string/number/Date object
    } else {
       return 'Invalid Input'; // If input type is unexpected
    }

    // Check if the resulting date is valid
    if (isNaN(date.getTime())) {
      return 'Invalid Date';
    }

    return date.toLocaleDateString(); // Format valid date
  } catch (error) {
     console.error("Error formatting date:", dateInput, error);
     return 'Format Error';
  }
};

// Status Badge Class
const statusBadgeClass = (status) => {
     switch (status) {
        case 'Pending': return 'bg-warning text-dark';
        case 'Approved': return 'bg-success';
        case 'Rejected': return 'bg-danger';
        default: return 'bg-secondary';
    }
};


onMounted(async () => {
  loading.value = true;
  requests.value = []; // Clear previous requests
  try {
    const user = store.getters['user/getUser'];
    if (!user || !user.uid) {
      console.warn('UserRequests: User not logged in.');
      return;
    }

    const q = query(
      collection(db, 'eventRequests'),
      where('requester', '==', user.uid),
      orderBy('createdAt', 'desc') // Order by creation date, newest first
    );

    const querySnapshot = await getDocs(q);
    requests.value = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error('Error fetching user requests:', error);
    // TODO: Show error message to user?
  } finally {
    loading.value = false;
  }
});

// No need to return in <script setup>
</script>

<style scoped>
.spinner-border-sm {
     width: 1rem;
     height: 1rem;
     border-width: .15em;
 }
.badge {
    font-size: 0.75em; /* Smaller badge */
    align-self: center; /* Align badge vertically */
}
/* Add other styles if needed */
</style>