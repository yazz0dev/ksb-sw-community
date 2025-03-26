<template>
  <div class="container">
    <div class="d-flex justify-content-between align-items-center mb-4">
       <h2 class="mb-0">Events Dashboard</h2>
       <div>
           <!-- Buttons based on role -->
           <router-link v-if="!isAdmin" to="/request-event" class="btn btn-info ms-2">Request Event</router-link>
           <router-link v-if="isAdmin" to="/request-event" class="btn btn-success ms-2">Create Event</router-link> 
           <router-link v-if="isAdmin" to="/manage-requests" class="btn btn-warning ms-2">Manage Requests</router-link>
       </div>
    </div>

    <div v-if="loading" class="text-center">Loading events...</div>
    <div v-else>
      <!-- Upcoming Events Section -->
      <section class="mb-5">
        <h3>Upcoming Events</h3>
        <div v-if="upcomingEvents.length === 0">No upcoming events.</div>
        <div v-else class="row">
          <div class="col-md-4 mb-3" v-for="event in upcomingEvents" :key="event.id">
            <EventCard :event="event" />
          </div>
        </div>
      </section>

      <!-- Active Events Section -->
      <section class="mb-5">
        <h3>Active Events</h3>
        <div v-if="activeEvents.length === 0">No events currently in progress.</div>
        <div v-else class="row">
          <div class="col-md-4 mb-3" v-for="event in activeEvents" :key="event.id">
            <EventCard :event="event" />
          </div>
        </div>
      </section>

      <!-- Completed Events Section -->
      <section>
        <h3>Completed Events</h3>
        <div v-if="completedEvents.length === 0">No completed events yet.</div>
        <div v-else class="row">
          <div class="col-md-4 mb-3" v-for="event in completedEvents" :key="event.id">
            <EventCard :event="event" />
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script>
import { computed, onMounted, ref } from 'vue';
import { useStore } from 'vuex';
import EventCard from '../components/EventCard.vue';
// No useRouter needed here based on current template

export default {
  components: { EventCard },
  setup() {

    

    const store = useStore();
    const allEvents = ref([]); // Store all fetched events
    const loading = ref(true);
    const isAdmin = computed(() => store.getters['user/isAdmin']);

    const upcomingEvents = computed(() =>
      allEvents.value.filter(e => e.status === 'Upcoming' || e.status === 'Approved')
    );
    const activeEvents = computed(() =>
      allEvents.value.filter(e => e.status === 'In Progress')
    );
    const completedEvents = computed(() =>
      allEvents.value.filter(e => e.status === 'Completed')
    );

    onMounted(async () => {
      loading.value = true;
      try {
        // FetchEvents likely just gets all and sorts by date, which is fine
        await store.dispatch('events/fetchEvents');
        // Get the fetched events from the store
        allEvents.value = store.getters['events/allEvents'];
      } catch (error) {
        console.error("Failed to load events:", error);
        // Handle error display if needed
      } finally {
        loading.value = false;
      }
    });

    return {
      loading,
      isAdmin,
      upcomingEvents,
      activeEvents,
      completedEvents,
    };
  },
};
</script>