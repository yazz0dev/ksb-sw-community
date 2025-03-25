<template>
    <div>
      <h2>Request New Event</h2>
      <div v-if="errorMessage" class="error">{{ errorMessage }}</div>
      <form @submit.prevent="submitRequest">
        <div>
          <label for="eventName">Event Name:</label>
          <input type="text" id="eventName" v-model="eventName" required />
        </div>
        <div>
          <label for="eventType">Event Type:</label>
          <input type="text" id="eventType" v-model="eventType" required />
        </div>
        <div>
          <label for="description">Description:</label>
          <textarea id="description" v-model="description" required></textarea>
        </div>
        <div>
          <label for="desiredStartDate">Desired Start Date:</label>
          <input type="date" id="desiredStartDate" v-model="desiredStartDate" required />
        </div>
        <div>
          <label for="desiredEndDate">Desired End Date:</label>
          <input type="date" id="desiredEndDate" v-model="desiredEndDate" required />
        </div>
        <button type="submit">Submit Request</button>
      </form>
    </div>
  </template>
  
  <script>
  import { ref } from 'vue';
  import { useStore } from 'vuex';
  import { useRouter } from 'vue-router';
  
  export default {
    setup() {
      const eventName = ref('');
      const eventType = ref('');
      const description = ref('');
      const desiredStartDate = ref('');
      const desiredEndDate = ref('');
      const errorMessage = ref('');
  
      const store = useStore();
      const router = useRouter();
  
      const submitRequest = async () => {
        errorMessage.value = '';
        try {
          const requestData = {
            eventName: eventName.value,
            eventType: eventType.value,
            description: description.value,
            desiredStartDate: desiredStartDate.value,
            desiredEndDate: desiredEndDate.value,
            requester: store.getters.getUser.registerNumber, // Requester's ID
            status: 'Pending', // Initial status
          };
  
          await store.dispatch('events/submitEventRequest', requestData); // Use namespaced action
          router.push('/'); // Redirect to home or a confirmation page
        } catch (error) {
            errorMessage.value = error.message || 'Failed to submit request';
        }
      };
  
      return {
        eventName,
        eventType,
        description,
        desiredStartDate,
        desiredEndDate,
        submitRequest,
        errorMessage
      };
    },
  };
  </script>
  <style scoped>
  .error {
      color: red;
  }
  </style>