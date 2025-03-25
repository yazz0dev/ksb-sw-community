<template>
    <div>
      <h2>Manage Event Requests</h2>
      <div v-if="loading">Loading...</div>
      <div v-else-if="eventRequests.length === 0">No event requests.</div>
      <div v-else>
        <ul>
          <li v-for="request in eventRequests" :key="request.id">
            <div>
              <strong>{{ request.eventName }}</strong> ({{ request.eventType }}) -
              Requested by: {{ request.requester }} - Status: {{ request.status }}
              <p>Description: {{ request.description }}</p>
              <p>Desired Dates: {{ formatDate(request.desiredStartDate) }} - {{ formatDate(request.desiredEndDate) }}</p>
              <button v-if="request.status === 'Pending'" @click="approveRequest(request.id)">Approve</button>
               <button v-if="request.status === 'Pending'" @click="rejectRequest(request.id)">Reject</button>
            </div>
          </li>
        </ul>
      </div>
    </div>
  </template>
  
  <script>
  import { computed, onMounted, ref } from 'vue';
  import { useStore } from 'vuex';
  
  export default {
    setup() {
      const store = useStore();
      const loading = ref(true);
      const eventRequests = computed(() => store.getters['events/allEventRequests']); // Use namespaced getter
  
         const formatDate = (dateString) => {
          return new Date(dateString).toLocaleDateString();
        };
  
      onMounted(async () => {
        await store.dispatch('events/fetchEventRequests'); // Use namespaced action
        loading.value = false;
      });
  
      const approveRequest = async (requestId) => {
        try {
          await store.dispatch('events/approveEventRequest', requestId); // Use namespaced action
        } catch (error) {
          console.error('Error approving request:', error);
          // Handle the error (e.g., show a message to the user)
        }
      };
        const rejectRequest = async (requestId) => {
            try{
                await store.dispatch('events/rejectEventRequest', requestId);
            }catch(error){
              console.error("Error:", error);
            }
        }
  
      return {
        eventRequests,
        loading,
        approveRequest,
        formatDate,
        rejectRequest
      };
    },
  };
  </script>