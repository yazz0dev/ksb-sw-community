// /src/views/RequestEvent.vue (Bootstrap styling, error handling)
<template>
    <div class="container">
      <h2>Request New Event</h2>
      <div v-if="errorMessage" class="alert alert-danger" role="alert">{{ errorMessage }}</div>
      <form @submit.prevent="submitRequest">
        <div class="mb-3">
          <label for="eventName" class="form-label">Event Name:</label>
          <input type="text" id="eventName" v-model="eventName" required class="form-control" />
        </div>
        <div class="mb-3">
          <label for="eventType" class="form-label">Event Type:</label>
          <input type="text" id="eventType" v-model="eventType" required class="form-control" />
        </div>
        <div class="mb-3">
          <label for="description" class="form-label">Description:</label>
          <textarea id="description" v-model="description" required class="form-control"></textarea>
        </div>
        <div class="mb-3">
          <label for="desiredStartDate" class="form-label">Desired Start Date:</label>
          <input type="date" id="desiredStartDate" v-model="desiredStartDate" required class="form-control" />
        </div>
        <div class="mb-3">
          <label for="desiredEndDate" class="form-label">Desired End Date:</label>
          <input type="date" id="desiredEndDate" v-model="desiredEndDate" required class="form-control" />
        </div>
        <button type="submit" class="btn btn-primary">Submit Request</button>
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