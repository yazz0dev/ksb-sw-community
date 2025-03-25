// src/components/UserRequests.vue
<template>
  <div>
    <h3>My Event Requests</h3>
    <div v-if="loading">Loading...</div>
    <div v-else-if="requests.length === 0">No event requests found.</div>
    <div v-else>
      <ul class="list-group">
        <li v-for="request in requests" :key="request.id" class="list-group-item">
          <strong>{{ request.eventName }}</strong> ({{ request.eventType }}) -
          Status: {{ request.status }} -
          Requested on: {{ formatDate(request.createdAt) }} <!-- Assuming you have a createdAt field -->
           <p>Description: {{ request.description }}</p>
          <p>Desired Dates: {{ formatDate(request.desiredStartDate) }} - {{ formatDate(request.desiredEndDate) }}</p>
        </li>
      </ul>
    </div>
  </div>
</template>

<script>
import { computed, onMounted, ref } from 'vue';
import { useStore } from 'vuex';
import { collection, getDocs, query, where, orderBy, Timestamp } from 'firebase/firestore'; // Import Firestore functions
import { db } from '../firebase';


export default {
  setup() {
    const store = useStore();
    const loading = ref(true);
    const requests = ref([]);

     const formatDate = (dateString) => {
          return new Date(dateString).toLocaleDateString();
        };

    onMounted(async () => {
      try {
        const user = store.getters['user/getUser']; // Get current user data
        if (!user || !user.uid) {
          // Handle case where user is not logged in (shouldn't happen if route is protected)
          console.warn('User not logged in.');
          loading.value = false;
          return;
        }

        // Fetch event requests where the requester is the current user's UID
        const q = query(
          collection(db, 'eventRequests'),
          where('requester', '==', user.uid),
          orderBy('desiredStartDate', 'desc') // Order by creation date, newest first
        );

        const querySnapshot = await getDocs(q);
        requests.value = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
      } catch (error) {
        console.error('Error fetching user requests:', error);
        // Handle error (e.g., show an error message)
      } finally {
        loading.value = false;
      }
    });

    return {
      loading,
      requests,
      formatDate
    };
  },
};
</script>