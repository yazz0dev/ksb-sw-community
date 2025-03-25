// /src/views/HomeView.vue (Bootstrap styling, responsive layout)
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
    <button v-if="userRole === 'Teacher'" @click="goToCreateEvent" class="btn btn-success mt-3">Create Event</button>
     <router-link v-if="userRole === 'Student'" to="/request-event" class="btn btn-info mt-3">Request Event</router-link>
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
    const events = computed(() => store.getters.allEvents);
    const loading = ref(true);
    const router = useRouter();
    const userRole = computed(() => store.getters.getUserRole);

    onMounted(async () => {
      await store.dispatch('fetchEvents');
      loading.value = false;
    });
    const goToCreateEvent = () => {
      router.push('/create-event');
    };

    return {
      events,
      loading,
      goToCreateEvent,
      userRole,
    };
  },
};
</script>