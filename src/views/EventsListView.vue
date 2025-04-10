<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 bg-background min-h-[calc(100vh-8rem)]">
    <!-- Header with filtering -->
    <div class="mb-8">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-2xl font-bold text-text-primary">{{ viewTitle }}</h2>
        <div v-if="isAuthenticated" class="flex gap-2">
          <button 
            v-for="filter in filters" 
            :key="filter.value"
            @click="activeFilter = filter.value"
            :class="[
              'px-3 py-1.5 text-sm rounded-md transition-colors',
              activeFilter === filter.value 
                ? 'bg-primary text-primary-text' 
                : 'bg-surface text-text-secondary hover:bg-neutral-light'
            ]"
          >
            {{ filter.label }}
          </button>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center py-16">
      <div class="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
    </div>

    <!-- Events Groups -->
    <div v-else>
      <!-- Add message for no events -->
      <div v-if="groupedEvents.length === 0" class="text-center text-text-secondary py-10">
        No events found for the selected filter.
      </div>
      <!-- Existing v-for -->
      <div v-for="(group, index) in groupedEvents" :key="index" class="mb-12">
        <h3 class="text-xl font-bold text-text-primary mb-6 pb-2 border-b border-border">
          {{ group.title }}
        </h3>
        <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <EventCard
            v-for="event in group.events"
            :key="event.id"
            :event="event"
            class="animate-fade-in"
            @click="$router.push(`/event/${event.id}`)"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useStore } from 'vuex';
import { useRoute, useRouter } from 'vue-router'; // Import useRouter
import EventCard from '@/components/EventCard.vue';

const store = useStore();
const route = useRoute();
const router = useRouter(); // Define router instance
const loading = ref(true);

// Define filters without 'All'
const filters = [
  { label: 'Upcoming', value: 'upcoming' },
  { label: 'Active', value: 'active' },
  { label: 'Completed', value: 'completed' }
];

// Set initial filter: 'completed' for CompletedEvents route, query filter if present, otherwise default to 'upcoming'
const getDefaultFilter = () => {
  if (route.name === 'CompletedEvents') return 'completed';
  return route.query.filter || 'upcoming'; // Default to 'upcoming' for /events
};
const activeFilter = ref(getDefaultFilter());


const isAuthenticated = computed(() => store.getters['user/isAuthenticated']);

const viewTitle = computed(() => {
  if (!isAuthenticated.value) return 'Completed Events';
  const filter = filters.find(f => f.value === activeFilter.value);
  return filter ? `${filter.label} Events` : 'Events';
});

// Filter events based on authentication state and active filter
const filteredEvents = computed(() => {
  // Access getter inside computed to ensure reactivity dependency
  const allEvents = store.getters['events/allEvents']; 
  
  if (!isAuthenticated.value) {
    // Ensure allEvents is accessed even for non-authenticated users if needed elsewhere,
    // but filter only completed ones.
    return allEvents.filter(e => e.status === 'Completed');
  }

  // Use if/else if for clarity
  const currentFilter = activeFilter.value;

  let result;
  if (currentFilter === 'upcoming') {
    result = allEvents.filter(e => ['Upcoming', 'Approved'].includes(e.status));
  } else if (currentFilter === 'active') {
    // Make sure to check both 'InProgress' and 'In Progress' if status strings vary
    result = allEvents.filter(e => e.status === 'InProgress' || e.status === 'In Progress');
  } else if (currentFilter === 'completed') {
    result = allEvents.filter(e => e.status === 'Completed');
  } else {
    // Default case (should ideally not be hit if watchers are correct, but defaults to upcoming)
    // console.warn(`[EventsListView] Unexpected filter value: ${currentFilter}, defaulting to upcoming.`); // Keep commented or remove
    result = allEvents.filter(e => ['Upcoming', 'Approved'].includes(e.status));
  }
  return result;
});

// Helper function to safely get a Date object
const getDateFromTimestamp = (timestamp) => {
  if (!timestamp) return null;

  // 1. Firestore Timestamp
  if (typeof timestamp.toDate === 'function') {
    try {
      return timestamp.toDate();
    } catch (e) {
      console.error("Error converting Firestore Timestamp:", e, timestamp);
      return null;
    }
  }
  // 2. JavaScript Date Object
  if (timestamp instanceof Date) {
    return !isNaN(timestamp.getTime()) ? timestamp : null; // Check if valid date
  }
  // 3. ISO String or other parsable string
  if (typeof timestamp === 'string') {
    try {
      const date = new Date(timestamp);
      return !isNaN(date.getTime()) ? date : null; // Check if parsing was successful
    } catch (e) {
      console.error("Error parsing date string:", e, timestamp);
      return null;
    }
  }
  // 4. Firestore Seconds/Nanoseconds object (less common for direct use here, but possible)
  if (typeof timestamp === 'object' && typeof timestamp.seconds === 'number') {
     try {
       return new Date(timestamp.seconds * 1000);
     } catch (e) {
       console.error("Error converting Firestore seconds object:", e, timestamp);
       return null;
     }
  }

  console.warn("Unrecognized timestamp format in getDateFromTimestamp:", timestamp);
  return null;
};

// Group filtered events by month and year, handling unscheduled ones
const groupedEvents = computed(() => {

  // Sort the already filtered events first
  const sortedEvents = [...filteredEvents.value].sort((a, b) => {
      let dateA, dateB;
      const filterValue = activeFilter.value; // Use consistent value
      if (filterValue === 'completed') {
        // Sort Completed descending (newest first)
        dateA = getDateFromTimestamp(a.completedAt) || getDateFromTimestamp(a.endDate) || getDateFromTimestamp(a.startDate);
        dateB = getDateFromTimestamp(b.completedAt) || getDateFromTimestamp(b.endDate) || getDateFromTimestamp(b.startDate);
        return (dateB?.getTime() || 0) - (dateA?.getTime() || 0); // Fallback to 0
      } else {
        // Sort Upcoming & Active ascending (earliest first)
        // Treat events without startDate as "later" than events with startDate
        dateA = getDateFromTimestamp(a.startDate);
        dateB = getDateFromTimestamp(b.startDate);
        if (!dateA && !dateB) return 0; // Keep relative order if both lack date
        if (!dateA) return 1;          // Push a (no date) after b (has date)
        if (!dateB) return -1;         // Push b (no date) after a (has date)
        return dateA.getTime() - dateB.getTime();
      }
  });
  console.log('[EventsListView] Sorted Events Count:', sortedEvents.length);

  // Now group the sorted events by month/year or into "Date TBD"
  const groups = {};
  const unscheduledEvents = []; // Initialize array for unscheduled events

  sortedEvents.forEach(event => {
    // Determine the primary date for grouping
    let groupDate;
    let dateSourceForLog = ''; // For logging which date field was used

    if (activeFilter.value === 'completed') {
        groupDate = getDateFromTimestamp(event.completedAt);
        dateSourceForLog = 'completedAt';
        if (!groupDate) {
            groupDate = getDateFromTimestamp(event.endDate);
            dateSourceForLog = 'endDate';
        }
        if (!groupDate) {
            groupDate = getDateFromTimestamp(event.startDate);
            dateSourceForLog = 'startDate (fallback)';
        }
    } else { // Upcoming or Active
        groupDate = getDateFromTimestamp(event.startDate);
        dateSourceForLog = 'startDate';
    }


    // If no valid date for grouping, add to unscheduled list (unless completed) and skip grouping
    if (!groupDate) {
        if (activeFilter.value !== 'completed') { // Only add upcoming/active events without dates
            unscheduledEvents.push(event);
        }
        return; // Skip the rest of the loop iteration for this event
    }

    const yearMonth = `${groupDate.getFullYear()}-${String(groupDate.getMonth() + 1).padStart(2, '0')}`;

    if (!groups[yearMonth]) {
      groups[yearMonth] = [];
    }
    groups[yearMonth].push(event);
  });

  // Create the final array of groups, sorted chronologically by month/year
  // Sort groups descending for completed, ascending otherwise
  const groupSortOrder = activeFilter.value === 'completed' ? -1 : 1;
  
  // Map the dated groups first
  const finalGroupedList = Object.entries(groups)
    .sort((a, b) => groupSortOrder * a[0].localeCompare(b[0])) // Sort groups by YYYY-MM string
    .map(([yearMonth, eventsInGroup]) => {
      const [year, month] = yearMonth.split('-');
      const monthName = new Date(year, month - 1).toLocaleString('default', { month: 'long' });
      return {
        title: `${monthName} ${year}`, // Month Year title
        events: eventsInGroup // Events are already sorted within the group
      };
    });

  // Add the "Date TBD" group at the end if it has events and the sort order is ascending (upcoming/active)
  if (unscheduledEvents.length > 0 && groupSortOrder === 1) {
    finalGroupedList.push({
      title: 'Date TBD',
      events: unscheduledEvents // Already sorted correctly relative to each other
    });
  }
  // Potentially add an 'else if (unscheduledEvents.length > 0 && groupSortOrder === -1)' 
  // here if TBD needs different placement for 'completed' filter in the future (e.g., finalGroupedList.unshift(...)).

  console.log('[EventsListView] Final Grouped List:', finalGroupedList);
  return finalGroupedList; // Return the potentially modified list
});

// Watch filter changes to update URL (only if authenticated, as completed-events has its own route)
watch(activeFilter, (newFilter) => {
  if (isAuthenticated.value && route.name !== 'CompletedEvents') {
    router.replace({ query: { ...route.query, filter: newFilter } });
  } else if (isAuthenticated.value && route.name === 'CompletedEvents' && newFilter !== 'completed') {
    // If user changes filter away from 'completed' on the dedicated route, navigate to the general events route
    router.replace({ name: 'EventsList', query: { filter: newFilter } }); // Assuming 'EventsList' is the name for the general /events route
  }
});

// Watch route changes to update filter if query param changes externally
watch(() => route.query.filter, (newQueryFilter) => {
  // Only update if the route is not CompletedEvents and the new filter is valid
  if (route.name !== 'CompletedEvents' && filters.some(f => f.value === newQueryFilter)) {
    activeFilter.value = newQueryFilter;
  } else if (route.name !== 'CompletedEvents' && !newQueryFilter) {
     // If query filter is removed, default to upcoming
     activeFilter.value = 'upcoming';
  }
});

// Watch route name changes to reset filter
watch(() => route.name, (newRouteName) => {
  if (newRouteName === 'CompletedEvents') {
    activeFilter.value = 'completed';
  } else if (newRouteName === 'EventsList' && !route.query.filter) {
     // Reset to 'upcoming' if navigating to EventsList without a filter query
     activeFilter.value = 'upcoming';
  } else if (newRouteName === 'EventsList' && route.query.filter && filters.some(f => f.value === route.query.filter)) {
      // Set filter based on query if navigating to EventsList with a valid filter
      activeFilter.value = route.query.filter;
  }
});


onMounted(async () => {
  loading.value = true;
  try {
    await store.dispatch('events/fetchEvents');
  } catch (error) {
    console.error('Failed to fetch events:', error);
  } finally {
    loading.value = false;
  }
});
</script>
