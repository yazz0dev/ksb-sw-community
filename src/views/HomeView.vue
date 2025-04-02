<template>
  <div class="container mt-4">
    <div class="d-flex justify-content-between align-items-center mb-4 flex-wrap">
       <h2 class="mb-0 me-3">Events Dashboard</h2>
       <div class="mt-2 mt-md-0"> 
           <router-link v-if="canRequestEvent && !isAdmin" to="/request-event" class="btn btn-info btn-sm ms-2">
               <i class="fas fa-plus me-1"></i> Request Event
           </router-link>
           <router-link v-if="isAdmin" to="/request-event" class="btn btn-success btn-sm ms-2">
               <i class="fas fa-calendar-plus me-1"></i> Create Event
           </router-link>
           <router-link v-if="isAdmin" to="/manage-requests" class="btn btn-warning btn-sm ms-2">
               <i class="fas fa-tasks me-1"></i> Manage Requests
           </router-link>
       </div>
    </div>

    <div v-if="loading" class="text-center my-5">
        <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">Loading events...</span>
        </div>
    </div>
    <div v-else>
      <section class="mb-5">
        <h3 class="mb-3">Upcoming Events</h3>
        <div v-if="upcomingEvents.length === 0" class="alert alert-light">No upcoming events.</div>
        <div v-else class="row g-3">
          <div class="col-lg-4 col-md-6" v-for="event in upcomingEvents" :key="`upcoming-${event.id}`"> 
            <EventCard :event="event" />
          </div>
        </div>
      </section>

      
      <section class="mb-5">
        <h3 class="mb-3">Active Events</h3>
        <div v-if="activeEvents.length === 0" class="alert alert-light">No events currently in progress.</div>
        <div v-else class="row g-3"> 
          <div class="col-lg-4 col-md-6" v-for="event in activeEvents" :key="`active-${event.id}`"> 
            <EventCard :event="event" />
          </div>
        </div>
      </section>

      
      <section>
        <h3 class="mb-3">Completed Events</h3>
        <div v-if="completedEvents.length === 0" class="alert alert-light">No completed events yet.</div>
        <div v-else class="row g-3"> 
          <div class="col-lg-4 col-md-6" v-for="event in completedEvents" :key="`completed-${event.id}`"> 
            <EventCard :event="event" />
          </div>
        </div>
      </section>

      <!-- Add new Cancelled Events Section -->
      <section v-if="cancelledEvents.length > 0" class="mt-5">
        <div class="d-flex align-items-center mb-3">
          <button class="btn btn-link text-muted p-0 text-decoration-none" 
                  type="button" 
                  @click="showCancelled = !showCancelled">
            <i :class="['fas', showCancelled ? 'fa-chevron-down' : 'fa-chevron-right', 'me-2']"></i>
            Cancelled Events ({{ cancelledEvents.length }})
          </button>
        </div>
        <div v-show="showCancelled" class="row g-3"> 
          <div class="col-lg-4 col-md-6" v-for="event in cancelledEvents" :key="`cancelled-${event.id}`"> 
            <EventCard :event="event" />
          </div>
        </div>
      </section>

    </div>
  </div>
</template>

<script setup> // Using setup script
import { computed, onMounted, ref } from 'vue';
import { useStore } from 'vuex';
import EventCard from '../components/EventCard.vue';

const store = useStore();
const allEvents = computed(() => store.getters['events/allEvents']); // Directly use getter
const loading = ref(true);
const userRole = computed(() => store.getters['user/getUserRole']);
const isAuthenticated = computed(() => store.getters['user/isAuthenticated']);


const isAdmin = computed(() => userRole.value === 'Admin' );
// Anyone authenticated can request (logic handled in RequestEvent view/action)
const canRequestEvent = computed(() => isAuthenticated.value);

const upcomingEvents = computed(() =>
  allEvents.value.filter(e => e.status === 'Upcoming' || e.status === 'Approved') // Approved requests shown as Upcoming
       .sort((a, b) => (a.startDate?.seconds ?? 0) - (b.startDate?.seconds ?? 0)) // Sort upcoming soonest first
);
const activeEvents = computed(() =>
  allEvents.value.filter(e => e.status === 'In Progress' || e.status === 'InProgress')
       .sort((a, b) => (a.startDate?.seconds ?? 0) - (b.startDate?.seconds ?? 0))
);
const completedEvents = computed(() =>
  allEvents.value.filter(e => e.status === 'Completed')
       // Sort completed most recent first (already sorted by fetch)
);

// Add new ref for cancelled events visibility
const showCancelled = ref(false);

// Add new computed for cancelled events
const cancelledEvents = computed(() =>
  allEvents.value.filter(e => e.status === 'Cancelled')
       .sort((a, b) => (b.startDate?.seconds ?? 0) - (a.startDate?.seconds ?? 0))
);

onMounted(async () => {
  loading.value = true;
  try {
    await store.dispatch('events/fetchEvents');
    // Data is now reactive via the computed 'allEvents'
  } catch (error) {
    console.error("Failed to load events:", error);
    // Handle error display if needed
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
/* Scoped styles removed to rely on global styles and standard Bootstrap */
</style>
