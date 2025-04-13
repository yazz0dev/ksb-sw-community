<template>
  <section class="section" style="background-color: var(--color-background); min-height: calc(100vh - 8rem);">
    <div class="container is-max-desktop">
      <!-- Loading State -->
      <div v-if="loading" class="has-text-centered py-6">
        <div class="loader is-loading is-large mx-auto mb-2" style="border-color: var(--color-primary); border-left-color: transparent;"></div>
        <p class="has-text-grey">Loading...</p>
      </div>

      <!-- Content -->
      <template v-else>
        <div class="level is-mobile mb-6 pb-4" style="border-bottom: 1px solid var(--color-border);">
          <!-- Left side -->
          <div class="level-left">
            <div class="level-item">
              <h2 class="title is-3 has-text-primary">Events Dashboard</h2>
            </div>
          </div>
          <!-- Right side -->
          <div class="level-right">
            <div class="level-item">
              <div class="buttons is-flex-wrap-wrap is-justify-content-flex-end">
                <router-link
                  v-if="canRequestEvent && !isAdmin"
                  to="/create-event"
                  class="button is-primary"
                >
                  <span class="icon"><i class="fas fa-calendar-plus"></i></span>
                  <span>{{ isAdmin ? 'Create Event' : 'Request Event' }}</span>
                </router-link>
                <router-link
                  v-if="isAdmin"
                  to="/manage-requests"
                  class="button is-outlined"
                >
                  <span class="icon"><i class="fas fa-tasks"></i></span>
                  <span>Manage Requests</span>
                </router-link>
              </div>
            </div>
          </div>
        </div>

        <!-- Event Sections -->
        <div class="mb-6">
          <h3 class="title is-5 mb-4 has-text-dark">Active Events</h3>
          <div v-if="activeEvents.length > 0" class="columns is-multiline is-variable is-3">
            <div v-for="event in activeEvents" :key="event.id" class="column is-half-tablet is-one-third-desktop">
              <EventCard :event="event" />
            </div>
          </div>
          <p v-else class="has-text-grey">No active events at the moment.</p>
        </div>

        <div class="mb-6">
          <h3 class="title is-5 mb-4 has-text-dark">Upcoming Events</h3>
          <div v-if="upcomingEvents.length > 0" class="columns is-multiline is-variable is-3">
            <div v-for="event in upcomingEvents" :key="event.id" class="column is-half-tablet is-one-third-desktop">
              <EventCard :event="event" />
            </div>
          </div>
          <p v-else class="has-text-grey">No upcoming events scheduled.</p>
        </div>

        <div class="mb-6">
          <div class="is-flex is-justify-content-space-between is-align-items-center mb-4">
            <h3 class="title is-5 has-text-dark mb-0">Completed Events</h3>
            <router-link to="/completed-events" class="button is-small is-link is-light">
              View All
            </router-link>
          </div>
          <div v-if="completedEvents.length > 0" class="columns is-multiline is-variable is-3">
            <div v-for="event in completedEvents" :key="event.id" class="column is-half-tablet is-one-third-desktop">
              <EventCard :event="event" />
            </div>
          </div>
          <p v-else class="has-text-grey">No completed events yet.</p>
        </div>

        <!-- Cancelled Events Section (Toggleable) -->
        <div class="mb-6">
          <button class="button is-text is-small mb-4" @click="showCancelled = !showCancelled">
            {{ showCancelled ? 'Hide' : 'Show' }} Cancelled Events
            <span class="icon"><i :class="['fas', showCancelled ? 'fa-chevron-up' : 'fa-chevron-down']"></i></span>
          </button>
          <transition name="fade-fast">
            <div v-if="showCancelled">
              <div v-if="cancelledEvents.length > 0" class="columns is-multiline is-variable is-3">
                <div v-for="event in cancelledEvents" :key="event.id" class="column is-half-tablet is-one-third-desktop">
                  <EventCard :event="event" />
                </div>
              </div>
              <p v-else class="has-text-grey">No cancelled events.</p>
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
/* Simple Bulma loader */
.loader {
  border-radius: 50%;
  border-width: 2px;
  border-style: solid;
  width: 3em;
  height: 3em;
  animation: spinAround 1s infinite linear;
}

@keyframes spinAround {
  from { transform: rotate(0deg); }
  to { transform: rotate(359deg); }
}

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
