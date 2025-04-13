<template>
  <section class="section" style="background-color: var(--color-background); min-height: calc(100vh - 8rem);">
    <div class="container is-max-desktop">
      <!-- Header with filtering -->
      <div class="mb-6">
        <div class="level is-mobile is-align-items-center">
          <!-- Left side -->
          <div class="level-left">
            <div class="level-item">
              <h1 class="title is-3 has-text-primary">{{ viewTitle }}</h1>
            </div>
          </div>
          <!-- Right side -->
          <div class="level-right">
            <div class="level-item">
              <div v-if="isAuthenticated" class="buttons are-small has-addons">
                <button
                  v-for="filter in filters"
                  :key="filter.value"
                  class="button"
                  :class="{ 
                    'is-primary is-selected': activeFilter === filter.value, 
                    'is-light': activeFilter !== filter.value 
                  }"
                  @click="setActiveFilter(filter.value)"
                >
                  {{ filter.label }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="has-text-centered py-6">
        <div class="loader is-loading is-large mx-auto mb-2" style="border-color: var(--color-primary); border-left-color: transparent;"></div>
      </div>

      <!-- Events Groups -->
      <div v-else>
        <!-- No events message -->
        <p v-if="groupedEvents.length === 0" class="has-text-centered has-text-grey py-5">
          No events found for the selected filter.
        </p>

        <!-- Event groups -->
        <div v-else class="mb-6">
          <div v-for="(group, index) in groupedEvents" :key="index" class="mb-6">
            <h2 
              class="title is-5 has-text-dark mb-5 pb-2"
              style="border-bottom: 1px solid var(--color-border);"
            >
              {{ group.title }}
            </h2>
            <div class="columns is-multiline is-variable is-4">
              <div
                v-for="event in group.events"
                :key="event.id"
                class="column is-half-tablet is-one-third-desktop animate-fade-in"
              >
                <EventCard
                  :event="event"
                  @click="$router.push(`/event/${event.id}`)"
                  style="cursor: pointer;"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useStore } from 'vuex';
import { useRoute, useRouter } from 'vue-router';
// Removed Chakra UI imports
import EventCard from '@/components/EventCard.vue';

const store = useStore();
const route = useRoute();
const router = useRouter();
const loading = ref(true);

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

const isAuthenticated = computed(() => store.getters['user/isAuthenticated']);

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

// Filter events based on authentication state and active filter
const filteredEvents = computed(() => {
  const allEvents = store.getters['events/allEvents']; 
  
  // If not authenticated and on the completed events page, show only completed
  if (!isAuthenticated.value && route.name === 'CompletedEvents') {
    return allEvents.filter(e => e.status === 'Completed');
  }
  
  // If not authenticated but somehow not on completed page, show nothing relevant to filters
  if (!isAuthenticated.value) {
      return [];
  }

  const currentFilter = activeFilter.value;
  let result;
  if (currentFilter === 'upcoming') {
    result = allEvents.filter(e => ['Upcoming', 'Approved'].includes(e.status));
  } else if (currentFilter === 'active') {
    result = allEvents.filter(e => e.status === 'InProgress' || e.status === 'In Progress');
  } else if (currentFilter === 'completed') {
    result = allEvents.filter(e => e.status === 'Completed');
  } else {
    // Default case if filter is somehow invalid, show upcoming
    result = allEvents.filter(e => ['Upcoming', 'Approved'].includes(e.status));
  }
  return result;
});

// Helper function to safely get a Date object
const getDateFromTimestamp = (timestamp) => {
  if (!timestamp) return null;
  if (typeof timestamp.toDate === 'function') {
    try { return timestamp.toDate(); } catch (e) { console.error("toDate error", e); return null; }
  }
  if (timestamp instanceof Date) { return !isNaN(timestamp.getTime()) ? timestamp : null; }
  if (typeof timestamp === 'string') {
    try { const date = new Date(timestamp); return !isNaN(date.getTime()) ? date : null; } catch (e) { console.error("string parse error", e); return null; }
  }
  if (typeof timestamp === 'object' && typeof timestamp.seconds === 'number') {
     try { return new Date(timestamp.seconds * 1000); } catch (e) { console.error("seconds obj error", e); return null; }
  }
  return null;
};

// Group filtered events by month and year
const groupedEvents = computed(() => {
  const sortedEvents = [...filteredEvents.value].sort((a, b) => {
      let dateA, dateB;
      const filterValue = activeFilter.value;
      // Sort completed descending, others ascending
      if (filterValue === 'completed') {
        dateA = getDateFromTimestamp(a.completedAt) || getDateFromTimestamp(a.endDate) || getDateFromTimestamp(a.startDate);
        dateB = getDateFromTimestamp(b.completedAt) || getDateFromTimestamp(b.endDate) || getDateFromTimestamp(b.startDate);
        // Handle null dates - put them at the end when descending
        if (!dateA && !dateB) return 0;
        if (!dateA) return 1; 
        if (!dateB) return -1;
        return dateB.getTime() - dateA.getTime();
      } else {
        dateA = getDateFromTimestamp(a.startDate);
        dateB = getDateFromTimestamp(b.startDate);
        // Handle null dates - put them at the end when ascending
        if (!dateA && !dateB) return 0;
        if (!dateA) return 1;
        if (!dateB) return -1;
        return dateA.getTime() - dateB.getTime();
      }
  });

  const groups = {};
  const unscheduledEvents = [];

  sortedEvents.forEach(event => {
    let groupDate;
    if (activeFilter.value === 'completed') {
        groupDate = getDateFromTimestamp(event.completedAt) || getDateFromTimestamp(event.endDate) || getDateFromTimestamp(event.startDate);
    } else {
        groupDate = getDateFromTimestamp(event.startDate);
    }

    if (!groupDate) {
        // Only group unscheduled for upcoming/active
        if (activeFilter.value !== 'completed') {
            unscheduledEvents.push(event);
        }
        return; // Don't group completed events without a date
    }

    const year = groupDate.getFullYear();
    const month = groupDate.getMonth(); // 0-indexed
    const yearMonthKey = `${year}-${month}`;

    if (!groups[yearMonthKey]) {
      groups[yearMonthKey] = {
          year: year,
          month: month,
          events: []
      };
    }
    groups[yearMonthKey].events.push(event);
  });

  // Sort groups by year and month
  const groupSortOrder = activeFilter.value === 'completed' ? -1 : 1; 
  const finalGroupedList = Object.values(groups)
    .sort((a, b) => {
        if (a.year !== b.year) return groupSortOrder * (a.year - b.year);
        return groupSortOrder * (a.month - b.month);
    })
    .map(group => {
      const monthName = new Date(group.year, group.month).toLocaleString('default', { month: 'long' });
      return {
        title: `${monthName} ${group.year}`,
        events: group.events
      };
    });

  // Add unscheduled group at the end if ascending sort
  if (unscheduledEvents.length > 0 && groupSortOrder === 1) {
    finalGroupedList.push({
      title: 'Date TBD',
      events: unscheduledEvents
    });
  }

  return finalGroupedList;
});

onMounted(async () => {
  loading.value = true;
  try {
    await store.dispatch('events/fetchEvents');
  } catch (error) {
    console.error("Failed to load events:", error);
  } finally {
    loading.value = false;
  }
});

</script>

<style scoped>
/* Reuse loader style from HomeView */
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

/* Ensure columns have consistent height potential */
.column > * {
  height: 100%;
}

/* Animation */
.animate-fade-in {
  animation: fadeIn 0.5s ease-in-out;
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
