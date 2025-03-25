<template>
  <div class="container">
    <h2>Upcoming Events</h2>
    <div v-if="loading">Loading events...</div>
    <div v-else-if="events.length === 0">No upcoming events.</div>
    <div v-else>
      <div class="row">
        <div class="col-md-4" v-for="event in events" :key="event.id">
          <EventCard :event="event" />
        </div>
      </div>
    </div>
    <!-- Use isTeacher getter -->
    <!-- Removed create event button -->
    <router-link v-if="!isTeacher" to="/request-event" class="btn btn-info mt-3">Request Event</router-link>
     <router-link v-if="isAdmin" to="/manage-requests" class="btn btn-info mt-3">Manage Requests</router-link>
  </div>
</template>

<script>
import { computed, onMounted, ref } from 'vue';
import { useStore } from 'vuex';
import EventCard from '../components/EventCard.vue';
import { useRouter } from 'vue-router';

export default {
  components: {
    EventCard,
  },
  setup() {
    const store = useStore();
    const events = computed(() => store.getters['events/allEvents']); //namespaced
    const loading = ref(true);
    const router = useRouter();
     // Use isTeacher getter from the user module
    const isTeacher = computed(() => store.getters['user/isTeacher']); //namespaced
    const isAdmin = computed(() => store.getters['user/getUser'].role === 'Admin'); //check admin

    onMounted(async () => {
      await store.dispatch('events/fetchEvents'); //namespaced
      loading.value = false;
    });


    return {
      events,
      loading,
      isTeacher, // Expose isTeacher
      isAdmin
    };
  },
};
</script>