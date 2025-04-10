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
import { useRoute, useRouter } from 'vue-router';
import EventCard from '@/components/EventCard.vue';

const store = useStore();
const route = useRoute();
const loading = ref(true);
const activeFilter = ref(route.query.filter || 'all');

const isAuthenticated = computed(() => store.getters['user/isAuthenticated']);

const filters = [
  { label: 'All', value: 'all' },
  { label: 'Upcoming', value: 'upcoming' },
  { label: 'Active', value: 'active' },
  { label: 'Completed', value: 'completed' }
];

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

  switch (activeFilter.value) {
    case 'upcoming':
      return allEvents.filter(e => ['Upcoming', 'Approved'].includes(e.status));
    case 'active':
      return allEvents.filter(e => e.status === 'InProgress');
    case 'completed':
      return allEvents.filter(e => e.status === 'Completed');
    default:
      return allEvents;
  }
});

// Group events by month and year
const groupedEvents = computed(() => {
  const groups = {};
  
  filteredEvents.value.forEach(event => {
    const date = event.completedAt?.toDate() || 
                 event.endDate?.toDate() || 
                 event.startDate?.toDate() || 
                 new Date();
    const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    
    if (!groups[yearMonth]) {
      groups[yearMonth] = [];
    }
    groups[yearMonth].push(event);
  });

  return Object.entries(groups)
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([yearMonth, events]) => {
      const [year, month] = yearMonth.split('-');
      const monthName = new Date(year, month - 1).toLocaleString('default', { month: 'long' });
      return {
        title: `${monthName} ${year}`,
        events: events.sort((a, b) => {
          const dateA = a.startDate?.seconds || 0;
          const dateB = b.startDate?.seconds || 0;
          return dateB - dateA;
        })
      };
    });
});

// Watch filter changes to update URL
watch(activeFilter, (newFilter) => {
  router.replace({ query: { ...route.query, filter: newFilter } });
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
