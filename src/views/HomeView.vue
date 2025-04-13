<template>
  <section class="py-5" style="background-color: var(--bs-body-bg); min-height: calc(100vh - 8rem);">
    <div class="container-lg">
      <!-- Loading State -->
      <div v-if="loading" class="text-center py-5">
        <div class="spinner-border text-primary" role="status" style="width: 3rem; height: 3rem;">
          <span class="visually-hidden">Loading...</span>
        </div>
        <p class="text-secondary mt-2">Loading...</p>
      </div>

      <!-- Content -->
      <template v-else>
        <div class="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-5 pb-4" style="border-bottom: 1px solid var(--bs-border-color);">
          <!-- Left side -->
          <div>
            <h2 class="h2 text-primary mb-0">Events Dashboard</h2>
          </div>
          <!-- Right side -->
          <div class="mt-3 mt-md-0 ms-md-auto">
            <div class="d-flex flex-wrap justify-content-end gap-2">
              <router-link
                v-if="canRequestEvent && !isAdmin"
                to="/create-event"
                class="btn btn-primary d-inline-flex align-items-center"
              >
                <i class="fas fa-calendar-plus me-2"></i>
                <span>{{ isAdmin ? 'Create Event' : 'Request Event' }}</span>
              </router-link>
              <router-link
                v-if="isAdmin"
                to="/manage-requests"
                class="btn btn-outline-secondary d-inline-flex align-items-center"
              >
                <i class="fas fa-tasks me-2"></i>
                <span>Manage Requests</span>
              </router-link>
            </div>
          </div>
        </div>

        <!-- Event Sections -->
        <div class="mb-5">
          <h4 class="h4 text-dark mb-4">Active Events</h4>
          <div v-if="activeEvents.length > 0" class="row g-3">
            <div v-for="event in activeEvents" :key="event.id" class="col-md-6 col-lg-4">
              <EventCard :event="event" />
            </div>
          </div>
          <p v-else class="text-secondary">No active events at the moment.</p>
        </div>

        <div class="mb-5">
          <h4 class="h4 text-dark mb-4">Upcoming Events</h4>
          <div v-if="upcomingEvents.length > 0" class="row g-3">
            <div v-for="event in upcomingEvents" :key="event.id" class="col-md-6 col-lg-4">
              <EventCard :event="event" />
            </div>
          </div>
          <p v-else class="text-secondary">No upcoming events scheduled.</p>
        </div>

        <div class="mb-5">
          <div class="d-flex justify-content-between align-items-center mb-4">
            <h4 class="h4 text-dark mb-0">Completed Events</h4>
            <router-link to="/completed-events" class="btn btn-link btn-sm text-decoration-none">
              View All
            </router-link>
          </div>
          <div v-if="completedEvents.length > 0" class="row g-3">
            <div v-for="event in completedEvents" :key="event.id" class="col-md-6 col-lg-4">
              <EventCard :event="event" />
            </div>
          </div>
          <p v-else class="text-secondary">No completed events yet.</p>
        </div>

        <!-- Cancelled Events Section (Toggleable) -->
        <div class="mb-5">
          <button class="btn btn-link btn-sm text-decoration-none text-secondary mb-4" @click="showCancelled = !showCancelled">
            {{ showCancelled ? 'Hide' : 'Show' }} Cancelled Events
            <i :class="['fas', showCancelled ? 'fa-chevron-up' : 'fa-chevron-down', 'ms-1']"></i>
          </button>
          <transition name="fade-fast">
            <div v-if="showCancelled">
              <div v-if="cancelledEvents.length > 0" class="row g-3">
                <div v-for="event in cancelledEvents" :key="event.id" class="col-md-6 col-lg-4">
                  <EventCard :event="event" />
                </div>
              </div>
              <p v-else class="text-secondary">No cancelled events.</p>
            </div>
          </transition>
        </div>
      </template>
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { useStore } from 'vuex';
import { useRouter } from 'vue-router';
import EventCard from '../components/EventCard.vue';
import EventCardSkeleton from '../components/EventCardSkeleton.vue'; // Keep skeleton
// Removed Chakra UI imports

const store = useStore();
const router = useRouter();
const allEvents = computed(() => store.getters['events/allEvents']);
const loading = ref(true);
const userRole = computed(() => store.getters['user/getUserRole']);
const isAuthenticated = computed(() => store.getters['user/isAuthenticated']);
const isAdmin = computed(() => userRole.value === 'Admin');
const canRequestEvent = computed(() => isAuthenticated.value);

// Limit display on dashboard, use reasonable defaults
const maxEventsPerSection = 6; 

const upcomingEvents = computed(() =>
  allEvents.value
    .filter(e => e.status === 'Upcoming' || e.status === 'Approved')
    .sort((a, b) => (a.startDate?.seconds ?? 0) - (b.startDate?.seconds ?? 0))
    .slice(0, maxEventsPerSection)
);

const activeEvents = computed(() =>
  allEvents.value
    .filter(e => e.status === 'In Progress' || e.status === 'InProgress')
    .sort((a, b) => (a.startDate?.seconds ?? 0) - (b.startDate?.seconds ?? 0))
    .slice(0, maxEventsPerSection)
);

const completedEvents = computed(() =>
  allEvents.value
    .filter(e => e.status === 'Completed')
    .sort((a, b) => (b.completedAt?.seconds ?? b.endDate?.seconds ?? 0) - (a.completedAt?.seconds ?? a.endDate?.seconds ?? 0))
    .slice(0, maxEventsPerSection)
);

const showCancelled = ref(false);

const cancelledEvents = computed(() =>
  allEvents.value
    .filter(e => e.status === 'Cancelled')
    .sort((a, b) => (b.startDate?.seconds ?? 0) - (a.startDate?.seconds ?? 0))
);

onMounted(async () => {
  loading.value = true;
  try {
    await store.dispatch('events/fetchEvents');
  } catch (error) {
    console.error("Failed to load events:", error);
    // Handle error display if needed
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
/* Removed custom loader styles */

/* Transitions */
.fade-fast-enter-active,
.fade-fast-leave-active {
  transition: opacity 0.2s ease-in-out, max-height 0.3s ease-in-out;
  overflow: hidden;
  max-height: 1000px; /* Adjust if needed */
}

.fade-fast-enter-from,
.fade-fast-leave-to {
  opacity: 0;
  max-height: 0;
}
</style>
