<template>
  <CBox maxW="7xl" mx="auto" p={{ base: '4', sm: '6', lg: '8' }} bg="background" minH="calc(100vh - 8rem)">
    <!-- Header with filtering -->
    <CBox mb="8">
      <CFlex justify="space-between" align="center" mb="4">
        <CHeading size="xl" color="text-primary">{{ viewTitle }}</CHeading>
        <CButtonGroup v-if="isAuthenticated" spacing="2">
          <CButton
            v-for="filter in filters"
            :key="filter.value"
            size="sm"
            :variant="activeFilter === filter.value ? 'solid' : 'ghost'"
            :colorScheme="activeFilter === filter.value ? 'primary' : 'gray'"
            onClick={() => activeFilter = filter.value}
          >
            {{ filter.label }}
          </CButton>
        </CButtonGroup>
      </CFlex>
    </CBox>

    <!-- Loading State -->
    <CFlex v-if="loading" justify="center" py="16">
      <CSpinner size="xl" color="primary" thickness="4px" />
    </CFlex>

    <!-- Events Groups -->
    <CBox v-else>
      <!-- No events message -->
      <CText v-if="groupedEvents.length === 0" textAlign="center" color="text-secondary" py="10">
        No events found for the selected filter.
      </CText>

      <!-- Event groups -->
      <CStack v-else spacing="12">
        <CBox v-for="(group, index) in groupedEvents" :key="index">
          <CHeading 
            size="lg" 
            color="text-primary" 
            mb="6" 
            pb="2" 
            borderBottomWidth="1px" 
            borderColor="border"
          >
            {{ group.title }}
          </CHeading>
          <CSimpleGrid 
            columns={{ base: 1, sm: 2, lg: 3, xl: 4 }} 
            spacing="6"
          >
            <EventCard
              v-for="event in group.events"
              :key="event.id"
              :event="event"
              class="animate-fade-in"
              @click="$router.push(`/event/${event.id}`)"
            />
          </CSimpleGrid>
        </CBox>
      </CStack>
    </CBox>
  </CBox>
</template>

<script setup>
import {
  Box as CBox,
  Flex as CFlex,
  Heading as CHeading,
  Text as CText,
  Button as CButton,
  ButtonGroup as CButtonGroup,
  Stack as CStack,
  SimpleGrid as CSimpleGrid,
  Spinner as CSpinner
} from '@chakra-ui/vue-next';
import { ref, computed, onMounted, watch } from 'vue';
import { useStore } from 'vuex';
import { useRoute, useRouter } from 'vue-router';
import EventCard from '@/components/EventCard.vue';

const store = useStore();
const route = useRoute();
const router = useRouter();
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
  return route.query.filter || 'upcoming';
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
  const allEvents = store.getters['events/allEvents']; 
  
  if (!isAuthenticated.value) {
    return allEvents.filter(e => e.status === 'Completed');
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
    result = allEvents.filter(e => ['Upcoming', 'Approved'].includes(e.status));
  }
  return result;
});

// Helper function to safely get a Date object
const getDateFromTimestamp = (timestamp) => {
  if (!timestamp) return null;

  if (typeof timestamp.toDate === 'function') {
    try {
      return timestamp.toDate();
    } catch (e) {
      console.error("Error converting Firestore Timestamp:", e, timestamp);
      return null;
    }
  }
  if (timestamp instanceof Date) {
    return !isNaN(timestamp.getTime()) ? timestamp : null;
  }
  if (typeof timestamp === 'string') {
    try {
      const date = new Date(timestamp);
      return !isNaN(date.getTime()) ? date : null;
    } catch (e) {
      console.error("Error parsing date string:", e, timestamp);
      return null;
    }
  }
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
  const sortedEvents = [...filteredEvents.value].sort((a, b) => {
      let dateA, dateB;
      const filterValue = activeFilter.value;
      if (filterValue === 'completed') {
        dateA = getDateFromTimestamp(a.completedAt) || getDateFromTimestamp(a.endDate) || getDateFromTimestamp(a.startDate);
        dateB = getDateFromTimestamp(b.completedAt) || getDateFromTimestamp(b.endDate) || getDateFromTimestamp(b.startDate);
        return (dateB?.getTime() || 0) - (dateA?.getTime() || 0);
      } else {
        dateA = getDateFromTimestamp(a.startDate);
        dateB = getDateFromTimestamp(b.startDate);
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
    let dateSourceForLog = '';

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
    } else {
        groupDate = getDateFromTimestamp(event.startDate);
        dateSourceForLog = 'startDate';
    }

    if (!groupDate) {
        if (activeFilter.value !== 'completed') {
            unscheduledEvents.push(event);
        }
        return;
    }

    const yearMonth = `${groupDate.getFullYear()}-${String(groupDate.getMonth() + 1).padStart(2, '0')}`;

    if (!groups[yearMonth]) {
      groups[yearMonth] = [];
    }
    groups[yearMonth].push(event);
  });

  const groupSortOrder = activeFilter.value === 'completed' ? -1 : 1;
  
  const finalGroupedList = Object.entries(groups)
    .sort((a, b) => groupSortOrder * a[0].localeCompare(b[0]))
    .map(([yearMonth, eventsInGroup]) => {
      const [year, month] = yearMonth.split('-');
      const monthName = new Date(year, month - 1).toLocaleString('default', { month: 'long' });
      return {
        title: `${monthName} ${year}`,
        events: eventsInGroup
      };
    });

  if (unscheduledEvents.length > 0 && groupSortOrder === 1) {
    finalGroupedList.push({
      title: 'Date TBD',
      events: unscheduledEvents
    });
  }

  return finalGroupedList;
});

watch(activeFilter, (newFilter) => {
  if (isAuthenticated.value && route.name !== 'CompletedEvents') {
    router.replace({ query: { ...route.query, filter: newFilter } });
  } else if (isAuthenticated.value && route.name === 'CompletedEvents' && newFilter !== 'completed') {
    router.replace({ name: 'EventsList', query: { filter: newFilter } });
  }
});

watch(() => route.query.filter, (newQueryFilter) => {
  if (route.name !== 'CompletedEvents' && filters.some(f => f.value === newQueryFilter)) {
    activeFilter.value = newQueryFilter;
  } else if (route.name !== 'CompletedEvents' && !newQueryFilter) {
     activeFilter.value = 'upcoming';
  }
});

watch(() => route.name, (newRouteName) => {
  if (newRouteName === 'CompletedEvents') {
    activeFilter.value = 'completed';
  } else if (newRouteName === 'EventsList' && !route.query.filter) {
     activeFilter.value = 'upcoming';
  } else if (newRouteName === 'EventsList' && route.query.filter && filters.some(f => f.value === route.query.filter)) {
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
