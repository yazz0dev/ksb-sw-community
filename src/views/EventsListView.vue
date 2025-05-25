<template>
  <section class="py-5" style="background-color: var(--bs-body-bg); min-height: calc(100vh - 8rem);">
    <div class="container-lg">
      <!-- Header with filtering -->
      <div class="mb-5">
        <div class="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
          <!-- Left side -->
          <div>
            <h2 class="h2 text-primary mb-0">{{ viewTitle }}</h2>
          </div>
          <!-- Right side -->
          <div class="ms-md-auto">
            <div v-if="isAuthenticated" class="btn-group btn-group-sm" role="group" aria-label="Event Filter">
              <button
                v-for="filter in filters"
                :key="filter.value"
                type="button"
                class="btn"
                :class="{ 
                  'btn-primary active': activeFilter === filter.value, 
                  'btn-outline-secondary': activeFilter !== filter.value 
                }"
                @click="setActiveFilter(filter.value)"
              >
                {{ filter.label }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="text-center py-5">
        <div class="spinner-border text-primary" role="status" style="width: 3rem; height: 3rem;">
          <span class="visually-hidden">Loading...</span>
        </div>
      </div>

      <!-- Events Groups -->
      <div v-else-if="error" class="alert alert-danger">{{ error }}</div>

      <div v-else>
        <!-- Logged-in User View -->
        <div v-if="isAuthenticated">
          <!-- Upcoming Events Section -->
          <div v-if="activeFilter === 'upcoming'">
            <h2 class="h4 mb-4">Upcoming Events</h2>
            <div v-if="upcomingEvents.length > 0" class="row g-4">
              <div v-for="event in upcomingEvents" :key="event.id" class="col-md-6 col-lg-4">
                <EventCard :event="event" :name-cache="nameCache" />
              </div>
            </div>
            <p v-else class="text-muted">No upcoming events.</p>
          </div>
        </div>
        <!-- Logged-out User: Only show Completed Events -->
        <div v-else>
          <div v-if="completedEvents.length > 0" class="row g-4">
            <div v-for="event in completedEvents" :key="event.id" class="col-md-6 col-lg-4">
              <EventCard :event="event" :name-cache="nameCache" />
            </div>
          </div>
          <p v-else class="text-muted">No completed events.</p>
        </div>

          <!-- Active Events Section -->
          <div v-if="activeFilter === 'active'">
             <hr v-if="activeFilter === 'active'" class="my-5"> <!-- Separator if not first -->
            <h2 class="h4 mb-4">Active Events</h2>
            <div v-if="activeEvents.length > 0" class="row g-4">
              <div v-for="event in activeEvents" :key="event.id" class="col-md-6 col-lg-4">
                  <EventCard :event="event" :name-cache="nameCache" />
              </div>
            </div>
            <p v-else class="text-muted">No active events.</p
            >
          </div>

          <!-- Completed Events Section -->
          <div v-if="activeFilter === 'completed'">
            <hr v-if="activeFilter === 'completed'" class="my-5"> <!-- Separator if not first -->
            <h2 class="h4 mb-4">Completed Events</h2>
            <div v-if="completedEvents.length > 0" class="row g-4">
              <div v-for="event in completedEvents" :key="event.id" class="col-md-6 col-lg-4">
                  <EventCard :event="event" :name-cache="nameCache" />
              </div>
            </div>
             <p v-else class="text-muted">No completed events.</p>
          </div>
        </div>
      </div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useStudentProfileStore } from '@/stores/studentProfileStore';
import { useStudentEventStore } from '@/stores/studentEventStore';
import EventCard from '@/components/events/EventCard.vue';
import { DateTime } from 'luxon';
import { Event, EventStatus } from '@/types/event';

const userStore = useStudentProfileStore();
const eventStore = useStudentEventStore();
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

const isAuthenticated = computed<boolean>(() => userStore.isAuthenticated);

const viewTitle = computed(() => {
  if (!isAuthenticated.value) return 'Completed Events';
  const filter = filters.find(f => f.value === activeFilter.value);
  return filter ? `${filter.label} Events` : 'Events';
});

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
    if (!isAuthenticated.value) return [];
    const currentTime = DateTime.now(); // Define current time inside computed
    return eventStore.events.filter((event: Event) => {
        const start = event.details.date.start ? DateTime.fromJSDate(event.details.date.start.toDate()) : null;
        // const end = event.details.date.end ? DateTime.fromJSDate(event.details.date.end.toDate()) : null; // end not used in this specific filter logic
        return event.status === EventStatus.Approved && 
               start?.isValid && start > currentTime;
    }).sort((a: Event, b: Event) => {
        const dateA = a.details.date.start ? DateTime.fromJSDate(a.details.date.start.toDate()) : null;
        const dateB = b.details.date.start ? DateTime.fromJSDate(b.details.date.start.toDate()) : null;
        if (!dateA?.isValid || !dateB?.isValid) return 0;
        return dateA.toMillis() - dateB.toMillis();
    });
});

const activeEvents = computed<Event[]>(() => {
    if (!isAuthenticated.value) return [];
    const currentTime = DateTime.now(); // Define current time inside computed
    return eventStore.events.filter((event: Event) => {
        const start = event.details.date.start ? DateTime.fromJSDate(event.details.date.start.toDate()) : null;
        const end = event.details.date.end ? DateTime.fromJSDate(event.details.date.end.toDate()) : null;
        return event.status === EventStatus.InProgress || 
               (event.status === EventStatus.Approved && 
                start?.isValid && start <= currentTime && 
                end?.isValid && end >= currentTime);
    }).sort((a: Event, b: Event) => { 
        const dateA = a.details.date.start ? DateTime.fromJSDate(a.details.date.start.toDate()) : null;
        const dateB = b.details.date.start ? DateTime.fromJSDate(b.details.date.start.toDate()) : null;
        if (!dateA?.isValid || !dateB?.isValid) return 0;
        return dateA.toMillis() - dateB.toMillis();
    });
});

const completedEvents = computed<Event[]>(() => {
    const currentTime = DateTime.now(); // Define current time inside computed
    return eventStore.events.filter((event: Event) => {
        const end = event.details.date.end ? DateTime.fromJSDate(event.details.date.end.toDate()) : null;
        return event.status === EventStatus.Completed ||
               (event.status === EventStatus.Approved && end?.isValid && end < currentTime);
    }).sort((a: Event, b: Event) => {
        const dateA = a.details.date.end || a.details.date.start;
        const dateB = b.details.date.end || b.details.date.start;
        const dtA = dateA ? DateTime.fromJSDate(dateA.toDate()) : null;
        const dtB = dateB ? DateTime.fromJSDate(dateB.toDate()) : null;
        if (!dtA?.isValid || !dtB?.isValid) return 0; 
        return dtB.toMillis() - dtA.toMillis(); // Sort descending 
    });
});

const nameCache = computed(() => {
  const cache = userStore.nameCache; // Assuming nameCache is a state property
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
    await eventStore.fetchEvents();
    const allEventsArr = eventStore.events;
    const allOrganizerUids = Array.from(
      new Set(
        allEventsArr.flatMap((e: any) => Array.isArray(e.details.organizers) ? e.details.organizers : [])
      )
    ).filter(Boolean);
    if (allOrganizerUids.length > 0) {
      await userStore.fetchUserNamesBatch(allOrganizerUids);
    }
  } catch (err: any) {
    error.value = err.message || 'Failed to load events.';
  } finally {
    loading.value = false;
  }
});

</script>

<style scoped>
/* Removed loader style */

/* Removed column height style */

/* Animation */
.animate-fade-in {
  animation: fadeIn 0.5s ease-in-out;
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
