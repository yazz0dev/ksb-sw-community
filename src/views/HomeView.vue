<template>
  <div class="home-section">
    <div class="container-lg">
      <!-- Loading State -->
      <div v-if="loading" class="text-center py-5">
        <div class="spinner-border text-primary mb-3" role="status" style="width: 3rem; height: 3rem;">
          <span class="visually-hidden">Loading events...</span>
        </div>
        <p class="text-muted">Loading events...</p>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="alert alert-danger mt-4" role="alert">
        <i class="fas fa-exclamation-triangle me-2"></i>
        {{ error }}
      </div>

      <!-- Content Area (Show only if not loading and no error) -->
      <div v-else>
        <div class="row g-4 mb-4 mt-2">
          <div class="col-12">
            <!-- Header -->
            <div class="d-flex justify-content-between align-items-center mb-4 px-lg-3">
              <h2 class="h3 text-dark mb-0"><i class="fas fa-calendar-alt text-primary me-2"></i>Events</h2>
              <!-- Show "Request Event" button only if user is authenticated -->
              <div v-if="canRequestEvent">
                <router-link
                  :to="{ name: 'RequestEvent' }"
                  class="btn btn-primary d-inline-flex align-items-center"
                >
                  <i class="fas fa-calendar-plus me-2"></i>
                  <span>Request Event</span>
                </router-link>
              </div>
            </div>

            <!-- Active Events Section -->
            <div class="section-card shadow-sm rounded-4 p-4 mb-4 animate-fade-in">
              <div class="d-flex justify-content-between align-items-center mb-4">
                <h4 class="h4 text-dark mb-0"><i class="fas fa-bolt text-primary me-2"></i>Active Events</h4>
                <!-- Show "View All" link only if there are more events than displayed -->
                <router-link
                  v-if="totalActiveCount > maxEventsPerSection"
                  :to="{ name: 'EventsList', query: { filter: 'active' } }"
                  class="btn btn-link btn-sm text-decoration-none"
                >
                  View All
                </router-link>
              </div>
              <div v-if="activeEvents.length > 0" class="row g-3">
                <div v-for="event in activeEvents" :key="event.id" class="col-md-6 col-lg-4">
                  <EventCard :event="event" :name-cache="nameCache" />
                </div>
              </div>
              <p v-else class="text-secondary fst-italic small">No active events at the moment.</p>
            </div>

            <!-- Upcoming Events Section -->
            <div class="section-card shadow-sm rounded-4 p-4 mb-4 animate-fade-in">
              <div class="d-flex justify-content-between align-items-center mb-4">
                <h4 class="h4 text-dark mb-0"><i class="fas fa-hourglass-half text-info me-2"></i>Upcoming Events</h4>
                <router-link
                  v-if="totalUpcomingCount > maxEventsPerSection"
                  :to="{ name: 'EventsList', query: { filter: 'upcoming' } }"
                  class="btn btn-link btn-sm text-decoration-none"
                >
                  View All
                </router-link>
              </div>
              <div v-if="upcomingEvents.length > 0" class="row g-3">
                <div v-for="event in upcomingEvents" :key="event.id" class="col-md-6 col-lg-4">
                  <EventCard :event="event" :name-cache="nameCache" />
                </div>
              </div>
              <p v-else class="text-secondary fst-italic small">No upcoming events scheduled.</p>
            </div>

            <!-- Completed Events Section -->
            <div class="section-card shadow-sm rounded-4 p-4 mb-4 animate-fade-in">
              <div class="d-flex justify-content-between align-items-center mb-4">
                <h4 class="h4 text-dark mb-0"><i class="fas fa-check-circle text-success me-2"></i>Completed Events</h4>
                <router-link
                  v-if="totalCompletedCount > maxEventsPerSection"
                  :to="{ name: 'EventsList', query: { filter: 'completed' } }"
                  class="btn btn-link btn-sm text-decoration-none"
                >
                  View All
                </router-link>
              </div>
              <div v-if="completedEvents.length > 0" class="row g-3">
                <div v-for="event in completedEvents" :key="event.id" class="col-md-6 col-lg-4">
                  <EventCard :event="event" :name-cache="nameCache" />
                </div>
              </div>
              <p v-else class="text-secondary fst-italic small">No completed events yet.</p>
            </div>

            <!-- Cancelled Events (Collapsible) -->
            <div v-if="cancelledEvents.length > 0" class="mb-4">
              <div class="section-card shadow-sm rounded-4 p-4 animate-fade-in">
                <button class="btn btn-link btn-sm text-decoration-none text-secondary mb-4 px-0" @click="showCancelled = !showCancelled">
                  <i class="fas fa-ban me-2"></i>
                  {{ showCancelled ? 'Hide' : 'Show' }} Cancelled Events
                  <i :class="['fas', showCancelled ? 'fa-chevron-up' : 'fa-chevron-down', 'ms-1']"></i>
                </button>
                <transition name="fade-fast">
                  <div v-if="showCancelled">
                    <div class="row g-3">
                      <div v-for="event in cancelledEvents" :key="event.id" class="col-md-6 col-lg-4">
                        <EventCard :event="event" :name-cache="nameCache" />
                      </div>
                    </div>
                  </div>
                </transition>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '@/store/studentProfileStore';
import { useEventStore } from '@/store/studentEventStore';
import { EventStatus, Event } from '@/types/event';
import EventCard from '../components/events/EventCard.vue';

const userStore = useUserStore();
const eventStore = useEventStore();
const router = useRouter(); // Although not used directly, good practice to have if needed later

// --- State ---
const loading = ref<boolean>(true);
const error = ref<string | null>(null); // Added error state
const showCancelled = ref<boolean>(false);

// --- Constants ---
const maxEventsPerSection = 6; // Max events to show per category on dashboard

// --- Computed Properties ---
const allEvents = computed<Event[]>(() => eventStore.events || []);
const isAuthenticated = computed<boolean>(() => userStore.isAuthenticated);
const canRequestEvent = computed<boolean>(() => isAuthenticated.value); // Simple check for now

// Filter and sort events for display
const upcomingEvents = computed<Event[]>(() =>
  allEvents.value
    .filter(e => e.status === EventStatus.Approved)
    .sort((a, b) => (a.details?.date?.start?.toMillis() ?? 0) - (b.details?.date?.start?.toMillis() ?? 0)) // Sort ascending by start date
    .slice(0, maxEventsPerSection)
);

const activeEvents = computed<Event[]>(() =>
  allEvents.value
    .filter(e => e.status === EventStatus.InProgress)
    .sort((a, b) => (a.details?.date?.start?.toMillis() ?? 0) - (b.details?.date?.start?.toMillis() ?? 0)) // Sort ascending by start date
    .slice(0, maxEventsPerSection)
);

const completedEvents = computed<Event[]>(() =>
  allEvents.value
    .filter(e => e.status === EventStatus.Completed)
    .sort((a, b) => (b.details?.date?.end?.toMillis() ?? 0) - (a.details?.date?.end?.toMillis() ?? 0)) // Sort descending by end date
    .slice(0, maxEventsPerSection)
);

const cancelledEvents = computed<Event[]>(() =>
  allEvents.value
    .filter(e => e.status === EventStatus.Cancelled)
    .sort((a, b) => (b.details?.date?.start?.toMillis() ?? 0) - (a.details?.date?.start?.toMillis() ?? 0)) // Sort descending by start date
);

// Calculate total counts *before* slicing for "View All" links
const totalUpcomingCount = computed<number>(() =>
    allEvents.value.filter(e => e.status === EventStatus.Approved).length
);
const totalActiveCount = computed<number>(() =>
    allEvents.value.filter(e => e.status === EventStatus.InProgress).length
);
const totalCompletedCount = computed<number>(() =>
    allEvents.value.filter(e => e.status === EventStatus.Completed).length
);

// nameCache Map to a plain object for props
const nameCache = computed(() => {
  const cache = userStore.nameCache;
  const obj: Record<string, string> = {};
  if (cache instanceof Map) {
    cache.forEach((entry, uid) => {
      // Assuming cache entry structure is { name: string, timestamp: number }
      obj[uid] = entry.name;
    });
  }
  return obj;
});

// --- Lifecycle Hook ---
onMounted(async () => {
  loading.value = true;
  error.value = null; // Reset error on mount
  try {
    // Fetch all events first
    await eventStore.fetchEvents();

    // Gather all unique organizer UIDs from the fetched events
    const allOrganizerUids = Array.from(
      new Set(
        allEvents.value.flatMap(e => e.details?.organizers || []) // Use optional chaining and provide default empty array
      )
    ).filter(Boolean); // Filter out any potential undefined/null/empty string UIDs

    // Fetch names only if there are organizers to fetch for
    if (allOrganizerUids.length > 0) {
      await userStore.fetchUserNamesBatch(allOrganizerUids);
    }
  } catch (err) {
    console.error("Failed to load events or user names:", err);
    error.value = "Failed to load event data. Please try refreshing the page."; // Set user-friendly error message
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.home-section {
  background: linear-gradient(135deg, var(--bs-light) 0%, var(--bs-primary-bg-subtle) 100%); /* Use Bootstrap vars */
  min-height: 100vh;
  padding-top: 1rem;
  padding-bottom: 4rem;
}
.section-card {
  background: var(--bs-card-bg); /* Use BS var */
  border-radius: 1rem;
  border: 1px solid var(--bs-border-color-translucent); /* Subtle border */
  box-shadow: var(--bs-box-shadow-sm); /* Use BS var */
  margin-bottom: 2rem;
  /* Ensure content doesn't overlap during animation */
  overflow: hidden;
}
.animate-fade-in {
  animation: fadeInSection 0.6s ease-out forwards;
}
@keyframes fadeInSection {
  from { opacity: 0; transform: translateY(15px); }
  to { opacity: 1; transform: translateY(0); }
}
.btn-link.text-decoration-none {
  text-decoration: none !important;
}
.btn-link:hover {
  text-decoration: underline !important;
}

/* Ensure transitions work */
.fade-fast-enter-active,
.fade-fast-leave-active {
  transition: opacity 0.2s ease;
}
.fade-fast-enter-from,
.fade-fast-leave-to {
  opacity: 0;
}
</style>