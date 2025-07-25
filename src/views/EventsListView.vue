<template>
  <section class="events-list-section section-spacing">
    <div class="container-lg">
      <!-- Header with filtering -->
      <div class="mb-5">
        <div class="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
          <!-- Left side -->
          <div>
            <h2 class="h2 text-gradient-primary mb-0">Events</h2>
          </div>
          <!-- Right side -->
          <div class="ms-md-auto">
            <div v-if="isAuthenticated" class="btn-group btn-group-sm" role="group" aria-label="Event Filter">
              <button
                v-for="filter in filters"
                :key="filter.value"
                type="button"
                class="btn"
                :class="activeFilter === filter.value ? 'btn-primary' : 'btn-outline-primary'"
                @click="setActiveFilter(filter.value)"
              >
                {{ filter.label }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading">
        <EventsListSkeleton />
      </div>

      <!-- Events Groups -->
      <div v-else-if="error" class="alert alert-danger">{{ error }}</div>

      <div v-else>
        <!-- Logged-in User View -->
        <div v-if="isAuthenticated">
          <!-- Upcoming Events Section -->
          <div v-if="activeFilter === 'upcoming'">
            <h2 class="h4 text-gradient-primary mb-4">Upcoming Events</h2>
            <div v-if="upcomingEvents.length > 0" class="row g-4">
              <div v-for="event in upcomingEvents" :key="event.id" class="col-md-6 col-lg-4">
                <EventCard :event="event" :name-cache="nameCache" display-mode="full" />
              </div>
            </div>
            <p v-else class="text-muted">No upcoming events.</p>
          </div>

          <!-- Active Events Section (for authenticated users) -->
          <div v-if="activeFilter === 'active'">
            <hr v-if="upcomingEvents.length > 0 && activeFilter === 'active'" class="my-5">
            <h2 class="h4 text-gradient-primary mb-4">Active Events</h2>
            <div v-if="activeEvents.length > 0" class="row g-4">
              <div v-for="event in activeEvents" :key="event.id" class="col-md-6 col-lg-4">
                <EventCard :event="event" :name-cache="nameCache" display-mode="full" />
              </div>
            </div>
            <p v-else class="text-muted">No active events.</p>
          </div>

          <!-- Completed Events Section (for authenticated users) -->
          <div v-if="activeFilter === 'completed'">
            <hr v-if="(upcomingEvents.length > 0 || activeEvents.length > 0) && activeFilter === 'completed'" class="my-5">
            <h2 class="h4 text-gradient-primary mb-4">Completed Events</h2>
            <div v-if="completedEvents.length > 0" class="row g-4">
              <div v-for="event in completedEvents" :key="event.id" class="col-md-6 col-lg-4">
                <EventCard :event="event" :name-cache="nameCache" display-mode="full" />
              </div>
            </div>
            <p v-else class="text-muted">No completed events.</p>
          </div>
        </div>

        <!-- Logged-out User View: Show Upcoming, Ongoing (Approved only), and Completed Events -->
        <div v-else>
          <!-- Upcoming Events Section -->
          <h2 class="h4 text-gradient-primary mb-4">Upcoming Events</h2>
          <div v-if="upcomingEvents.length > 0" class="row g-4">
            <div v-for="event in upcomingEvents" :key="event.id" class="col-md-6 col-lg-4">
              <EventCard :event="event" :name-cache="nameCache" display-mode="full" />
            </div>
          </div>
          <p v-else class="text-muted">No upcoming events.</p>

          <!-- Ongoing (Approved) Events Section -->
          <hr class="my-5">
          <h2 class="h4 text-gradient-primary mb-4">Ongoing Events</h2>
          <div v-if="activeEvents.length > 0" class="row g-4"> {/* activeEvents for unauth will only contain 'Approved' current events */}
            <div v-for="event in activeEvents" :key="event.id" class="col-md-6 col-lg-4">
              <EventCard :event="event" :name-cache="nameCache" display-mode="full" />
            </div>
          </div>
          <p v-else class="text-muted">No ongoing events currently.</p>
          
          <!-- Completed Events Section -->
          <hr class="my-5">
          <h2 class="h4 text-gradient-primary mb-4">Completed Events</h2>
          <div v-if="completedEvents.length > 0" class="row g-4">
            <div v-for="event in completedEvents" :key="event.id" class="col-md-6 col-lg-4">
              <EventCard :event="event" :name-cache="nameCache" display-mode="full" />
            </div>
          </div>
          <p v-else class="text-muted">No completed events to display.</p>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useProfileStore } from '@/stores/profileStore';
import { useEventStore } from '@/stores/eventStore'; 
import EventCard from '@/components/events/EventCard.vue';
import EventsListSkeleton from '@/skeletons/EventsListSkeleton.vue';
import { DateTime } from 'luxon';
import { type Event, EventStatus } from '@/types/event';
import { convertToISTDateTime } from '@/utils/dateTime';

const studentStore = useProfileStore();
const eventStore = useEventStore() as any; // Add type assertion to the event store to resolve the TypeScript errors
const route = useRoute();
const router = useRouter();
const loading = ref(true);
const error = ref<string | null>(null);

const filters = [
  { label: 'Upcoming', value: 'upcoming' },
  { label: 'Active', value: 'active' },
  { label: 'Completed', value: 'completed' }
] as const;

type FilterValue = typeof filters[number]['value'];

const getDefaultFilter = () => {
  if (route.name === 'CompletedEvents') return 'completed' as FilterValue;
  const validFilters = filters.map(f => f.value);
  const queryFilter = route.query.filter;
  const filterValue = Array.isArray(queryFilter) ? queryFilter[0] : queryFilter;
  return validFilters.includes(filterValue as FilterValue) ? filterValue as FilterValue : 'upcoming';
};

const activeFilter = ref<FilterValue>(getDefaultFilter());

const isAuthenticated = computed<boolean>(() => studentStore.isAuthenticated);


const setActiveFilter = (filterValue: FilterValue) => {
  activeFilter.value = filterValue;
  // Update URL query param without reloading page
  if (route.name !== 'CompletedEvents') {
    router.push({ query: { filter: filterValue } }).catch(() => {});
  }
};

// Watch route changes to update filter if necessary (e.g., browser back/forward)
watch(() => route.query.filter, (newFilter) => {
  const validFilters = filters.map(f => f.value);
  const filterValue = Array.isArray(newFilter) ? newFilter[0] : newFilter;
  if (filterValue && validFilters.includes(filterValue as FilterValue) && filterValue !== activeFilter.value) {
    activeFilter.value = filterValue as FilterValue;
  } else if (!filterValue && route.name !== 'CompletedEvents' && activeFilter.value !== 'upcoming') {
    activeFilter.value = 'upcoming';
  }
});

const upcomingEvents = computed<Event[]>(() => {
    if (!isAuthenticated.value || !eventStore.events) return []; // Changed from events.value to eventStore.events
    const currentTime = DateTime.now();
    
    return eventStore.events.filter((event: Event) => { // Changed from events.value to eventStore.events
        if (!event || event.status !== EventStatus.Approved) return false;
        const start = convertToISTDateTime(event.details?.date?.start);
        return start && start > currentTime;
    }).sort((a: Event, b: Event) => {
        const dateA = convertToISTDateTime(a.details?.date?.start);
        const dateB = convertToISTDateTime(b.details?.date?.start);
        if (!dateA || !dateB) return 0;
        return dateA.toMillis() - dateB.toMillis();
    });
});

const activeEvents = computed<Event[]>(() => {
    if (!eventStore.events) return [];
    const currentTime = DateTime.now();
    
    return eventStore.events.filter((event: Event) => {
        if (!event) return false;
        
        // Event is approved and within date range
        if (event.status === EventStatus.Approved) {
            const start = convertToISTDateTime(event.details?.date?.start);
            const end = convertToISTDateTime(event.details?.date?.end);
            return start && end && start <= currentTime && end >= currentTime;
        }
        
        return false;
    }).sort((a: Event, b: Event) => { 
        const dateA = convertToISTDateTime(a.details?.date?.start);
        const dateB = convertToISTDateTime(b.details?.date?.start);
        if (!dateA || !dateB) return 0;
        return dateA.toMillis() - dateB.toMillis();
    });
});

const completedEvents = computed<Event[]>(() => {
    if (!eventStore.events) return [];
    
    return eventStore.events.filter((event: Event) => {
        if (!event) return false;
        
        return event.status === EventStatus.Closed;
    }).sort((a: Event, b: Event) => {
        const dateA = convertToISTDateTime(a.details?.date?.end || a.details?.date?.start);
        const dateB = convertToISTDateTime(b.details?.date?.end || b.details?.date?.start);
        if (!dateA || !dateB) return 0; 
        return dateB.toMillis() - dateA.toMillis();
    });
});

const nameCache = computed(() => {
  const cache = studentStore.nameCache; // Assuming nameCache is a state property
  if (cache instanceof Map) {
    const obj: Record<string, string> = {};
    cache.forEach((entry, uid) => {
      obj[uid] = entry.name;
    });
    return obj;
  }
  return {};
});

onMounted(async () => {
  loading.value = true;
  error.value = null;
  try {
    await eventStore.fetchEvents(); // Changed to use eventStore.fetchEvents()
    
    // Check if we actually got events
    if (!eventStore.events || eventStore.events.length === 0) {
    } else {
    }
    
    // Only try to fetch names if authenticated
    if (isAuthenticated.value && eventStore.events && eventStore.events.length > 0) {
      const allOrganizerUids = Array.from(
        new Set(
          eventStore.events.flatMap((e: Event) => Array.isArray(e.details?.organizers) ? e.details.organizers : [])
        )
      ).filter(Boolean);
      
      if (allOrganizerUids.length > 0) {
        try {
          // Fix type error by ensuring the array is cast to string[]
          await studentStore.fetchUserNamesBatch(allOrganizerUids.map(uid => String(uid)));
        } catch (nameError) {
        }
      }
    }
  } catch (err: any) {
    error.value = err.message || 'Failed to load events.';
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.events-list-section {
  background: linear-gradient(135deg, var(--bs-light) 0%, var(--bs-primary-bg-subtle) 100%);
  min-height: calc(100vh - var(--navbar-height-mobile));
  padding: 2rem 0 4rem 0;
}

@media (min-width: 992px) {
  .events-list-section {
    min-height: calc(100vh - var(--navbar-height-desktop));
  }
}

/* Removed ::deep styles for EventCard. EventCard now handles its own 'full' display mode styling. */
</style>
