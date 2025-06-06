<template>
  <div class="home-section">
    <div class="container-lg px-3 px-md-4">
      <!-- Loading State -->
      <div v-if="loading" class="text-center py-4 py-md-5">
        <div class="spinner-border text-primary mb-3" role="status" style="width: 3rem; height: 3rem;">
          <span class="visually-hidden">Loading events...</span>
        </div>
        <p class="text-muted">Loading events...</p>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="alert alert-danger mt-3 mt-md-4" role="alert">
        <i class="fas fa-exclamation-triangle me-2"></i>
        {{ error }}
      </div>

      <!-- Content Area (Show only if not loading and no error) -->
      <div v-else>
        <div class="row g-3 g-md-4 mb-3 mb-md-4 mt-1 mt-md-2">
          <div class="col-12">
            <!-- Header -->
            <div class="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3 mb-3 mb-md-4 px-lg-3">
              <h2 class="h4 h3-md text-dark mb-0"><i class="fas fa-calendar-alt text-primary me-2"></i>Events</h2>
              <!-- Show "Request Event" button only if user is authenticated -->
              <div v-if="canRequestEvent">
                <!-- Add d-none d-md-inline-block to hide on mobile -->
                <router-link
                  :to="{ name: 'RequestEvent' }"
                  class="btn btn-primary d-none d-md-inline-block"
                >
                  <i class="fas fa-plus me-2"></i>
                  <span>Request Event</span>
                </router-link>
              </div>
            </div>

            <!-- Active Events Section -->
            <div class="section-card shadow-sm rounded-4 p-4 mb-4 animate-fade-in">
              <div class="d-flex justify-content-between align-items-center mb-4">
                <h4 class="h5 h4-md text-dark mb-0"><i class="fas fa-bolt text-primary me-2"></i>Active Events</h4>
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
                <h4 class="h5 h4-md text-dark mb-0"><i class="fas fa-hourglass-half text-info me-2"></i>Upcoming Events</h4>
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
                <h4 class="h5 h4-md text-dark mb-0"><i class="fas fa-check-circle text-success me-2"></i>Completed Events</h4>
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
import { useProfileStore } from '@/stores/profileStore';
import { useEventStore } from '@/stores/eventStore'; 
import { EventStatus, Event } from '@/types/event';
import EventCard from '../components/events/EventCard.vue';
import { DateTime } from 'luxon';
import { convertToISTDateTime } from '@/utils/dateTime';

const studentStore = useProfileStore();
const eventStore = useEventStore(); // Changed from useEvents to useEventStore
const router = useRouter();

// --- State ---
const loading = ref<boolean>(true);
const error = ref<string | null>(null);
const showCancelled = ref<boolean>(false);

// --- Constants ---
const maxEventsPerSection = 6;

// --- Computed Properties ---
const allEvents = computed<Event[]>(() => eventStore.events || []); // Changed from events.value to eventStore.events
const isAuthenticated = computed<boolean>(() => studentStore.isAuthenticated);
const canRequestEvent = computed<boolean>(() => isAuthenticated.value);

// Filter and sort events for display
const upcomingEvents = computed<Event[]>(() => {
  if (!allEvents.value || allEvents.value.length === 0) return [];
  const currentTime = DateTime.now();
  
  return allEvents.value
    .filter(e => {
      if (!e || e.status !== EventStatus.Approved) return false;
      const start = convertToISTDateTime(e.details?.date?.start);
      return start && start > currentTime;
    })
    .sort((a, b) => {
      const dateA = convertToISTDateTime(a.details?.date?.start);
      const dateB = convertToISTDateTime(b.details?.date?.start);
      if (!dateA || !dateB) return 0;
      return dateA.toMillis() - dateB.toMillis();
    })
    .slice(0, maxEventsPerSection);
});

const activeEvents = computed<Event[]>(() => {
  if (!allEvents.value || allEvents.value.length === 0) return [];
  const currentTime = DateTime.now();
  
  return allEvents.value
    .filter(e => {
      if (!e) return false;
      
      // Event is explicitly marked as InProgress
      if (e.status === EventStatus.InProgress) return true;
      
      // Event is approved and within date range
      if (e.status === EventStatus.Approved) {
        const start = convertToISTDateTime(e.details?.date?.start);
        const end = convertToISTDateTime(e.details?.date?.end);
        return start && end && start <= currentTime && end >= currentTime;
      }
      
      return false;
    })
    .sort((a, b) => {
      const dateA = convertToISTDateTime(a.details?.date?.start);
      const dateB = convertToISTDateTime(b.details?.date?.start);
      if (!dateA || !dateB) return 0;
      return dateA.toMillis() - dateB.toMillis(); // Fixed: was dateA.toMillis() - dateA.toMillis()
    })
    .slice(0, maxEventsPerSection);
});

const completedEvents = computed<Event[]>(() => {
  if (!allEvents.value || allEvents.value.length === 0) return [];
  const currentTime = DateTime.now();
  
  return allEvents.value
    .filter(e => {
      if (!e) return false;
      
      // Event is explicitly marked as Completed
      if (e.status === EventStatus.Completed) return true;
      
      // Event is approved but past its end date
      if (e.status === EventStatus.Approved) {
        const end = convertToISTDateTime(e.details?.date?.end);
        return end && end < currentTime;
      }
      
      return false;
    })
    .sort((a, b) => {
      const dateA = convertToISTDateTime(a.details?.date?.end || a.details?.date?.start);
      const dateB = convertToISTDateTime(b.details?.date?.end || b.details?.date?.start);
      if (!dateA || !dateB) return 0;
      return dateB.toMillis() - dateA.toMillis();
    })
    .slice(0, maxEventsPerSection);
});

const cancelledEvents = computed<Event[]>(() => {
  if (!allEvents.value || allEvents.value.length === 0) return [];
  
  return allEvents.value
    .filter(e => e && e.status === EventStatus.Cancelled)
    .sort((a, b) => {
      const dateA = convertToISTDateTime(a.details?.date?.start);
      const dateB = convertToISTDateTime(b.details?.date?.start);
      if (!dateA || !dateB) return 0;
      return dateB.toMillis() - dateA.toMillis();
    });
});

// Calculate total counts *before* slicing for "View All" links
const totalUpcomingCount = computed<number>(() => {
    if (!allEvents.value) return 0;
    const currentTime = DateTime.now();
    return allEvents.value.filter(e => {
      if (!e || e.status !== EventStatus.Approved) return false;
      const start = convertToISTDateTime(e.details?.date?.start);
      return start && start > currentTime;
    }).length;
});

const totalActiveCount = computed<number>(() => {
    if (!allEvents.value) return 0;
    const currentTime = DateTime.now();
    return allEvents.value.filter(e => {
      if (!e) return false;
      if (e.status === EventStatus.InProgress) return true;
      if (e.status === EventStatus.Approved) {
        const start = convertToISTDateTime(e.details?.date?.start);
        const end = convertToISTDateTime(e.details?.date?.end);
        return start && end && start <= currentTime && end >= currentTime;
      }
      return false;
    }).length;
});

const totalCompletedCount = computed<number>(() => {
    if (!allEvents.value) return 0;
    const currentTime = DateTime.now();
    return allEvents.value.filter(e => {
      if (!e) return false;
      if (e.status === EventStatus.Completed) return true;
      if (e.status === EventStatus.Approved) {
        const end = convertToISTDateTime(e.details?.date?.end);
        return end && end < currentTime;
      }
      return false;
    }).length;
});

// nameCache Map to a plain object for props
const nameCache = computed(() => {
  const cache = studentStore.nameCache;
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
  error.value = null;
  try {
    // Fetch all events using event store
    await eventStore.fetchEvents(); // Changed to use eventStore.fetchEvents()
    
    // Check if we actually got events
    if (!eventStore.events || eventStore.events.length === 0) {
    } else {
    }

    // Only try to fetch names if authenticated and there are events
    if (isAuthenticated.value && allEvents.value && allEvents.value.length > 0) {
      const allOrganizerUids = Array.from(
        new Set(
          allEvents.value.flatMap(e => e.details?.organizers || [])
        )
      ).filter(Boolean);

      // Fetch names only if there are organizers to fetch for
      if (allOrganizerUids.length > 0) {
        try {
          await studentStore.fetchUserNamesBatch(allOrganizerUids);
        } catch (nameError) {
        }
      }
    }
  } catch (err) {
    error.value = "Failed to load event data. Please try refreshing the page.";
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.home-section {
  background: linear-gradient(135deg, var(--bs-light) 0%, var(--bs-primary-bg-subtle) 100%);
  min-height: 100vh;
  padding-top: 1rem;
  padding-bottom: 4rem;
}

.section-card {
  background: var(--bs-card-bg);
  border-radius: var(--bs-border-radius-lg);
  border: 1px solid var(--bs-border-color);
  box-shadow: var(--bs-box-shadow-sm);
  margin-bottom: 2rem;
  overflow: hidden;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.section-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--bs-box-shadow);
}

.animate-fade-in {
  animation: fadeInSection 0.6s ease-out forwards;
}

@keyframes fadeInSection {
  from { 
    opacity: 0; 
    transform: translateY(15px); 
  }
  to { 
    opacity: 1; 
    transform: translateY(0); 
  }
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