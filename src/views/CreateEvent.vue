// /src/views/CreateEvent.vue (Bootstrap styling, error handling)
<template>
    <div class="container">
      <h2>Create Event</h2>
       <div v-if="errorMessage" class="alert alert-danger" role="alert">
         {{ errorMessage }}
       </div>
      <form @submit.prevent="createEvent">
        <div class="mb-3">
          <label for="eventName" class="form-label">Event Name:</label>
          <input type="text" id="eventName" v-model="eventName" required class="form-control"/>
        </div>
        <div  class="mb-3">
          <label for="eventType" class="form-label">Event Type:</label>
          <input type="text" id="eventType" v-model="eventType" required  class="form-control"/>
        </div>
        <div  class="mb-3">
          <label for="description" class="form-label">Description:</label>
          <textarea id="description" v-model="description" required  class="form-control"></textarea>
        </div>
        <div  class="mb-3">
          <label for="startDate" class="form-label">Start Date:</label>
          <input type="date" id="startDate" v-model="startDate" required  class="form-control"/>
        </div>
        <div  class="mb-3">
          <label for="endDate" class="form-label">End Date:</label>
          <input type="date" id="endDate" v-model="endDate" required  class="form-control"/>
        </div>
        <button type="submit" class="btn btn-primary">Create Event</button>

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
      const startDate = ref('');
      const endDate = ref('');
      const errorMessage = ref('');

      const store = useStore();
      const router = useRouter();

      const createEvent = async () => {
          errorMessage.value = ''; //clear error
        try {
            const eventData = {
            eventName: eventName.value,
            eventType: eventType.value,
            description: description.value,
            startDate: startDate.value,
            endDate: endDate.value,
          };
          await store.dispatch('events/createEvent', eventData); //namespaced
            router.push('/');  //redirect to home
        } catch (error) {
            errorMessage.value = error.message || 'Failed to create event';
        }
      };

      return {
        eventName,
        eventType,
        description,
        startDate,
        endDate,
        createEvent,
        errorMessage
      };
    },
  };
  </script>