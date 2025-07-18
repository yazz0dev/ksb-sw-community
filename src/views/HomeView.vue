<template>
  <div class="home-section section-spacing">
    <div class="container-lg px-3 px-md-4">
      <!-- Replace loading state with SkeletonProvider -->
      <SkeletonProvider 
        :loading="loading" 
        :skeleton-component="HomeSkeleton"
      >
        <!-- Error State -->
        <div v-if="error" class="alert alert-danger mb-4" role="alert">
          <i class="fas fa-exclamation-triangle me-2"></i>
          {{ error }}
        </div>

        <!-- Content Area -->
        <div v-else>
          <div class="row g-3 g-md-4 mb-4">
            <div class="col-12">
              <!-- Header -->
              <div class="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3 mb-4 px-lg-3">
                <h2 class="h3 text-gradient-primary mb-0"><i class="fas fa-calendar-alt me-2"></i>Events</h2>
                <!-- Show "Request Event" button only if user is authenticated -->
                <div v-if="canRequestEvent">
                  <!-- Add d-none d-md-inline-block to hide on mobile -->
                  <router-link
                    :to="{ name: 'RequestEvent' }"
                    class="btn btn-primary d-none d-md-inline-block btn-icon"
                  >
                    <i class="fas fa-plus me-2"></i>
                    <span>Request Event</span>
                  </router-link>
                </div>
              </div>

              <!-- Active Events Section -->
              <div class="section-card shadow-sm rounded-4 p-4 mb-4 animate-fade-in">
                <div class="d-flex justify-content-between align-items-center mb-4">
                  <h4 class="h5 text-gradient-primary mb-0"><i class="fas fa-bolt me-2"></i>Active Events</h4>
                  <router-link
                    v-if="totalActiveCount > maxEventsPerSection"
                    :to="{ name: 'EventsList', query: { filter: 'active' } }"
                    class="btn btn-link btn-sm text-decoration-none"
                  >
                    View All ({{ totalActiveCount }})
                  </router-link>
                </div>
                <div v-if="activeEvents.length > 0" class="horizontal-scroll-container">
                  <div class="horizontal-scroll-content">
                    <div v-for="(event, index) in activeEvents" :key="`active-${index}-${event.details?.eventName || ''}`" class="event-card-wrapper">
                      <EventCard :event="event" :name-cache="nameCache" display-mode="compact" />
                    </div>
                  </div>
                </div>
                <div v-else class="empty-state">
                  <i class="fas fa-calendar-times text-muted mb-2"></i>
                  <p class="text-secondary fst-italic mb-0">No active events at the moment.</p>
                </div>
              </div>

              <!-- Upcoming Events Section -->
              <div class="section-card shadow-sm rounded-4 p-4 mb-4 animate-fade-in">
                <div class="d-flex justify-content-between align-items-center mb-4">
                  <h4 class="h5 text-gradient-primary mb-0"><i class="fas fa-hourglass-half me-2"></i>Upcoming Events</h4>
                  <router-link
                    v-if="totalUpcomingCount > maxEventsPerSection"
                    :to="{ name: 'EventsList', query: { filter: 'upcoming' } }"
                    class="btn btn-link btn-sm text-decoration-none"
                  >
                    View All ({{ totalUpcomingCount }})
                  </router-link>
                </div>
                <div v-if="upcomingEvents.length > 0" class="horizontal-scroll-container">
                  <div class="horizontal-scroll-content">
                    <div v-for="(event, index) in upcomingEvents" :key="`upcoming-${index}-${event.details?.eventName || ''}`" class="event-card-wrapper">
                      <EventCard :event="event" :name-cache="nameCache" display-mode="compact" />
                    </div>
                  </div>
                </div>
                <div v-else class="empty-state">
                  <i class="fas fa-clock text-muted mb-2"></i>
                  <p class="text-secondary fst-italic mb-0">No upcoming events scheduled.</p>
                </div>
              </div>

              <!-- Completed Events Section -->
              <div class="section-card shadow-sm rounded-4 p-4 mb-4 animate-fade-in">
                <div class="d-flex justify-content-between align-items-center mb-4">
                  <h4 class="h5 text-gradient-primary mb-0"><i class="fas fa-check-circle me-2"></i>Completed Events</h4>
                  <router-link
                    v-if="totalCompletedCount > maxEventsPerSection"
                    :to="{ name: 'EventsList', query: { filter: 'completed' } }"
                    class="btn btn-link btn-sm text-decoration-none"
                  >
                    View All ({{ totalCompletedCount }})
                  </router-link>
                </div>
                <div v-if="completedEvents.length > 0" class="horizontal-scroll-container">
                  <div class="horizontal-scroll-content">
                    <div v-for="(event, index) in completedEvents" :key="`completed-${index}-${event.details?.eventName || ''}`" class="event-card-wrapper">
                      <EventCard :event="event" :name-cache="nameCache" display-mode="compact" />
                    </div>
                  </div>
                </div>
                <div v-else class="empty-state">
                  <i class="fas fa-archive text-muted mb-2"></i>
                  <p class="text-secondary fst-italic mb-0">No completed events yet.</p>
                </div>
              </div>

              <!-- Cancelled Events (Collapsible) -->
              <div v-if="cancelledEvents.length > 0" class="mb-4">
                <div class="section-card shadow-sm rounded-4 p-4 animate-fade-in">
                  <button class="btn btn-link btn-sm text-decoration-none text-secondary mb-4 px-0" @click="showCancelled = !showCancelled">
                    <i class="fas fa-ban me-2"></i>
                    {{ showCancelled ? 'Hide' : 'Show' }} Cancelled Events ({{ cancelledEvents.length }})
                    <i :class="['fas', showCancelled ? 'fa-chevron-up' : 'fa-chevron-down', 'ms-1']"></i>
                  </button>
                  <transition name="fade-fast">
                    <div v-if="showCancelled" class="horizontal-scroll-container">
                      <div class="horizontal-scroll-content">
                        <div v-for="(event, index) in cancelledEvents" :key="`cancelled-${index}-${event.details?.eventName || ''}`" class="event-card-wrapper">
                          <EventCard :event="event" :name-cache="nameCache" display-mode="compact" />
                        </div>
                      </div>
                    </div>
                  </transition>
                </div>
              </div>
            </div>
          </div>
        </div>
      </SkeletonProvider>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useProfileStore } from '@/stores/profileStore';
import { useEventStore } from '@/stores/eventStore'; 
import { EventStatus, type Event } from '@/types/event';
import EventCard from '../components/events/EventCard.vue';
import { DateTime } from 'luxon';
import { convertToISTDateTime } from '@/utils/dateTime';
import SkeletonProvider from '@/skeletons/SkeletonProvider.vue';
import HomeSkeleton from '@/skeletons/HomeSkeleton.vue';

const studentStore = useProfileStore();
const eventStore = useEventStore(); // Changed from useEvents to useEventStore

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
      return dateA.toMillis() - dateB.toMillis();
    })
    .slice(0, maxEventsPerSection);
});

const completedEvents = computed<Event[]>(() => {
  if (!allEvents.value || allEvents.value.length === 0) return [];
  
  return allEvents.value
    .filter(e => {
      if (!e) return false;
      
      return e.status === EventStatus.Closed;
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
  return [];
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
}

.section-card {
  background: var(--bs-card-bg);
  border-radius: var(--bs-border-radius-lg);
  border: 1px solid var(--bs-border-color);
  box-shadow: var(--bs-box-shadow-sm);
  margin-bottom: 1.5rem; /* Reduced from 2rem */
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

.horizontal-scroll-container {
  overflow-x: auto;
  overflow-y: hidden;
  margin: -0.5rem;
  padding: 0.5rem;
  scrollbar-width: thin;
  scrollbar-color: var(--bs-border-color) transparent;
  scroll-behavior: smooth;
  -webkit-overflow-scrolling: touch;
}

.horizontal-scroll-container::-webkit-scrollbar {
  height: 6px;
}

.horizontal-scroll-container::-webkit-scrollbar-track {
  background: var(--bs-gray-100);
  border-radius: 3px;
}

.horizontal-scroll-container::-webkit-scrollbar-thumb {
  background: var(--bs-border-color);
  border-radius: 3px;
}

.horizontal-scroll-container::-webkit-scrollbar-thumb:hover {
  background: var(--bs-gray-400);
}

.horizontal-scroll-content {
  display: flex;
  gap: 1rem;
  min-width: min-content;
}

.event-card-wrapper {
  flex: 0 0 300px;
  max-width: 300px;
  width: 300px;
  min-height: 180px; /* Match EventCard's compact min-height */
  height: auto; /* Allow height to be determined by content */
}

.empty-state {
  text-align: center;
  padding: 3rem 1rem;
  color: var(--bs-gray-600);
}

.empty-state i {
  font-size: 2.5rem;
  display: block;
}

/* Responsive breakpoints */
@media (max-width: 1200px) {
  .event-card-wrapper {
    flex: 0 0 280px;
    max-width: 280px;
    width: 280px;
  }
}

@media (max-width: 992px) {
  .event-card-wrapper {
    flex: 0 0 270px;
    max-width: 270px;
    width: 270px;
    min-height: 190px; /* Match responsive EventCard compact min-height */
  }
  
  .horizontal-scroll-content {
    gap: 0.875rem;
  }
}

@media (max-width: 768px) {
  .event-card-wrapper {
    flex: 0 0 260px;
    max-width: 260px;
    width: 260px;
    min-height: 190px; /* Match responsive EventCard compact min-height */
  }
  
  .horizontal-scroll-content {
    gap: 0.75rem;
  }
  
  .section-card {
    padding: 1rem !important;
  }
  
  .home-section {
    padding-top: 0.5rem;
  }
}

@media (max-width: 576px) {
  .event-card-wrapper {
    flex: 0 0 300px;
    max-width: 300px;
    width: 300px;
    min-height: 230px; /* Match responsive EventCard compact min-height */
  }
  
  .horizontal-scroll-content {
    gap: 0.75rem;
    padding-left: 0.5rem; /* Added padding for scrollbar visibility */
    padding-right: 0.5rem; /* Added padding for scrollbar visibility */
  }
  
  .horizontal-scroll-container {
    margin-left: -0.5rem; /* Counteract padding for full bleed illusion */
    margin-right: -0.5rem; /* Counteract padding for full bleed illusion */
    padding-left: 0rem; /* Remove container padding if content has it */
    padding-right: 0rem; /* Remove container padding if content has it */
  }
  
  .empty-state {
    padding: 2rem 0.5rem;
  }
  
  .empty-state i {
    font-size: 2rem;
  }
}

@media (max-width: 480px) {
  .event-card-wrapper {
    flex: 0 0 280px;
    max-width: 280px;
    width: 280px;
    min-height: 230px; /* Match responsive EventCard compact min-height */
  }
  
  .horizontal-scroll-content {
    gap: 0.6rem; /* Slightly reduced gap */
  }
}

@media (max-width: 400px) {
  .event-card-wrapper {
    flex: 0 0 270px;
    max-width: 270px;
    width: 270px;
    min-height: 220px; /* Match responsive EventCard compact min-height */
  }
  .horizontal-scroll-content {
    gap: 0.5rem;
  }
}
</style>