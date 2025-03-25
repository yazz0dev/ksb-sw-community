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
            <select id="eventType" v-model="eventType" required class="form-select">
              <option value="Hackathon">Hackathon</option>
              <option value="Debate">Debate</option>
              <option value="Presentation">Presentation</option>
              <option value="Workshop">Workshop</option>
              <option value="Seminar">Seminar</option> <!-- Add more as needed -->
            </select>
          </div>
        <div class="mb-3">
          <label for="description" class="form-label">Description:</label>
          <textarea id="description" v-model="description" required class="form-control"></textarea>
        </div>
        <div class="mb-3">
          <label for="desiredStartDate" class="form-label">Desired Start Date:</label>
          <input type="date" id="desiredStartDate" v-model="desiredStartDate" required class="form-control" :min="minDate"/>
        </div>
        <div class="mb-3">
          <label for="desiredEndDate" class="form-label">Desired End Date:</label>
          <input type="date" id="desiredEndDate" v-model="desiredEndDate" required class="form-control" :min="minDate"/>
        </div>
        <!-- Add isTeamEvent Checkbox -->
        <div class="mb-3 form-check">
          <input type="checkbox" id="isTeamEvent" v-model="isTeamEvent" class="form-check-input" />
          <label for="isTeamEvent" class="form-check-label">Is this a team event?</label>
        </div>
        <button type="submit" class="btn btn-primary">Submit Request</button>
      </form>
    </div>
  </template>

  <script>
  import { ref, computed } from 'vue';
  import { useStore } from 'vuex';
  import { useRouter } from 'vue-router';

  export default {
    setup() {
      const eventName = ref('');
      const eventType = ref('Hackathon'); // Default value
      const description = ref('');
      const desiredStartDate = ref('');
      const desiredEndDate = ref('');
      const errorMessage = ref('');
       const isTeamEvent = ref(false); // Add isTeamEvent field

        // Computed property for minimum date (today)
      const minDate = computed(() => {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
        const day = String(today.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      });

      const store = useStore();
      const router = useRouter();

      const submitRequest = async () => {
        errorMessage.value = '';
        try {
            //date validation
            if(new Date(desiredStartDate.value) > new Date(desiredEndDate.value))
            {
                errorMessage.value = 'Start date should be less than end date';
                return;
            }
          const requestData = {
            eventName: eventName.value,
            eventType: eventType.value, // Use selected event type
            description: description.value,
            desiredStartDate: desiredStartDate.value,
            desiredEndDate: desiredEndDate.value,
            isTeamEvent: isTeamEvent.value, // Include isTeamEvent
          };

          await store.dispatch('events/requestEvent', requestData); // Use namespaced action
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
        errorMessage,
        isTeamEvent, // Return isTeamEvent
        minDate,
      };
    },
  };
  </script>