<template>
    <div>
      <h2>Create Event</h2>
      <form @submit.prevent="createEvent">
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
          <label for="startDate">Start Date:</label>
          <input type="date" id="startDate" v-model="startDate" required />
        </div>
        <div>
          <label for="endDate">End Date:</label>
          <input type="date" id="endDate" v-model="endDate" required />
        </div>
        <button type="submit">Create Event</button>
        <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
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
          await store.dispatch('createEvent', eventData);
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
<style scoped>
.error{
    color:red;
}
</style>