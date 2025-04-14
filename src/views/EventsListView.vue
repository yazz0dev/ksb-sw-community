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
                <EventCard :event="event" />
              </div>
            </div>
            <p v-else class="text-muted">No upcoming events.</p>
          </div>

          <!-- Active Events Section -->
          <div v-if="activeFilter === 'active'">
             <hr v-if="activeFilter === 'active'" class="my-5"> <!-- Separator if not first -->
            <h2 class="h4 mb-4">Active Events</h2>
            <div v-if="activeEvents.length > 0" class="row g-4">
              <div v-for="event in activeEvents" :key="event.id" class="col-md-6 col-lg-4">
                  <EventCard :event="event" />
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
                  <EventCard :event="event" />
              </div>
            </div>
             <p v-else class="text-muted">No completed events.</p>
          </div>
        </div>

        <!-- Logged-out User View (Only shows Completed) -->
        <div v-else>
          <h2 class="h4 mb-4">Completed Events</h2>
          <div v-if="completedEvents.length > 0" class="row g-4">
            <div v-for="event in completedEvents" :key="event.id" class="col-md-6 col-lg-4">
                <EventCard :event="event" />
            </div>
          </div>
           <p v-else class="text-muted">No completed events found.</p>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useStore } from 'vuex';
import { useRoute, useRouter } from 'vue-router';
import EventCard from '@/components/EventCard.vue';
import { DateTime } from 'luxon';

// Assuming Event structure - define or import if available
interface Event { 
  id: string;
  status: string;
  startDate?: string | null; 
  endDate?: string | null;
  // Add other relevant fields if needed
}

const store = useStore();
const route = useRoute();
const router = useRouter();
const loading = ref(true);
const error = ref<string | null>(null);

const filters = [
  { label: 'Upcoming', value: 'upcoming' },
  { label: 'Active', value: 'active' },
  { label: 'Completed', value: 'completed' }
];

const getDefaultFilter = () => {
  if (route.name === 'CompletedEvents') return 'completed';
  const validFilters = filters.map(f => f.value);
  return validFilters.includes(route.query.filter) ? route.query.filter : 'upcoming';
};
const activeFilter = ref(getDefaultFilter());

const isAuthenticated = computed<boolean>(() => store.getters['user/isAuthenticated']);

const viewTitle = computed(() => {
  if (!isAuthenticated.value && route.name === 'CompletedEvents') return 'Completed Events';
  const filter = filters.find(f => f.value === activeFilter.value);
  return filter ? `${filter.label} Events` : 'Events';
});

const setActiveFilter = (filterValue) => {
  activeFilter.value = filterValue;
  // Update URL query param without reloading page
  if (route.name !== 'CompletedEvents') { // Don't add query param to dedicated completed route
      router.push({ query: { filter: filterValue } }).catch(() => {}); // Catch navigation duplicates
  }
};

// Watch route changes to update filter if necessary (e.g., browser back/forward)
watch(() => route.query.filter, (newFilter) => {
  const validFilters = filters.map(f => f.value);
  if (newFilter && validFilters.includes(newFilter) && newFilter !== activeFilter.value) {
    activeFilter.value = newFilter;
  } else if (!newFilter && route.name !== 'CompletedEvents' && activeFilter.value !== 'upcoming') {
    // Reset to default if query is removed and not on completed page
    activeFilter.value = 'upcoming';
  }
});

const now = DateTime.now();

const upcomingEvents = computed<Event[]>(() => {
    if (!isAuthenticated.value) return [];
    // Filter from all events directly
    return store.getters['events/allEvents'].filter((event: Event) => 
        event.status === 'Approved' && 
        event.startDate && 
        DateTime.fromISO(event.startDate).isValid && // Check validity
        DateTime.fromISO(event.startDate) > now
    ).sort((a: Event, b: Event) => {
        const dateA = a.startDate ? DateTime.fromISO(a.startDate) : null;
        const dateB = b.startDate ? DateTime.fromISO(b.startDate) : null;
        if (!dateA?.isValid || !dateB?.isValid) return 0;
        return dateA.toMillis() - dateB.toMillis();
    });
});

const activeEvents = computed<Event[]>(() => {
     if (!isAuthenticated.value) return [];
    // Filter from all events directly
    return store.getters['events/allEvents'].filter((event: Event) => {
        const start = event.startDate ? DateTime.fromISO(event.startDate) : null;
        const end = event.endDate ? DateTime.fromISO(event.endDate) : null;
        return event.status === 'InProgress' || 
               (event.status === 'Approved' && 
                start?.isValid && start <= now && 
                end?.isValid && end >= now);
    }).sort((a: Event, b: Event) => { 
        const dateA = a.startDate ? DateTime.fromISO(a.startDate) : null;
        const dateB = b.startDate ? DateTime.fromISO(b.startDate) : null;
        if (!dateA?.isValid || !dateB?.isValid) return 0;
        return dateA.toMillis() - dateB.toMillis();
    });
});

const completedEvents = computed<Event[]>(() => {
    // Filter from all events directly
    return store.getters['events/allEvents'].filter((event: Event) => {
        const end = event.endDate ? DateTime.fromISO(event.endDate) : null;
        return event.status === 'Completed' || 
               (event.status === 'Approved' && end?.isValid && end < now);
    }).sort((a: Event, b: Event) => { 
        const dateA = a.endDate || a.startDate;
        const dateB = b.endDate || b.startDate;
        const dtA = dateA ? DateTime.fromISO(dateA) : null;
        const dtB = dateB ? DateTime.fromISO(dateB) : null;
        if (!dtA?.isValid || !dtB?.isValid) return 0; 
        return dtB.toMillis() - dtA.toMillis(); // Sort descending 
    });
});

onMounted(async () => {
  loading.value = true;
  error.value = null;
  try {
    await store.dispatch('events/fetchEvents');
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
