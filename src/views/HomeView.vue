<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 bg-background min-h-[calc(100vh-8rem)]">
    <template v-if="loading">
      <div class="text-center py-16">
        <i class="fas fa-spinner fa-spin text-3xl text-primary mb-2"></i>
        <p class="text-text-secondary">Loading...</p>
      </div>
    </template>
    <template v-else>
      <!-- Rest of your template -->
      <div class="flex flex-wrap justify-between items-center gap-4 mb-8 pb-4 border-b border-border">
        <h2 class="text-3xl font-bold text-text-primary whitespace-nowrap">Events Dashboard</h2>
        <div class="flex space-x-3 flex-wrap justify-end">
            <!-- Unified Event Creation Button -->
            <router-link
              v-if="canRequestEvent && !isAdmin"
              to="/create-event"
              class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-primary-text bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors">
                <i :class="['fas', isAdmin ? 'fa-plus' : 'fa-calendar-plus', 'mr-1.5']"></i>
                {{ isAdmin ? 'Create Event' : 'Request Event' }}
            </router-link>
            <!-- Manage Requests Button: Use secondary style -->
            <router-link
              v-if="isAdmin"
              to="/manage-requests"
              class="inline-flex items-center px-4 py-2 border border-border text-sm font-medium rounded-md shadow-sm text-text-secondary bg-surface hover:bg-neutral-extraLight focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-light transition-colors">
                <i class="fas fa-tasks mr-1.5"></i> Manage Requests
            </router-link>
        </div>
      </div>

      <!-- Event Sections: Increased spacing -->
      <div class="space-y-8">
        <!-- Upcoming Events -->
        <div v-if="upcomingEvents.length > 0" class="space-y-4">
          <div class="flex justify-between items-center">
            <h3 class="text-xl font-semibold text-text-primary">Upcoming Events</h3>
            <router-link to="/events" class="text-sm text-primary hover:text-primary-dark transition-colors">
              See All <i class="fas fa-arrow-right ml-1"></i>
            </router-link>
          </div>
          <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <EventCard
              v-for="event in upcomingEvents.slice(0, 3)"
              :key="event.id"
              :event="event"
              class="animate-fade-in"
            />
          </div>
        </div>

        <!-- Active Events -->
        <div v-if="activeEvents.length > 0" class="space-y-4">
          <div class="flex justify-between items-center">
            <h3 class="text-xl font-semibold text-text-primary">Active Events</h3>
            <router-link to="/events?filter=active" class="text-sm text-primary hover:text-primary-dark transition-colors">
              See All <i class="fas fa-arrow-right ml-1"></i>
            </router-link>
          </div>
          <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <EventCard
              v-for="event in activeEvents.slice(0, 3)"
              :key="event.id"
              :event="event"
              class="animate-fade-in"
            />
          </div>
        </div>

        <!-- Completed Events -->
        <div v-if="completedEvents.length > 0" class="space-y-4">
          <div class="flex justify-between items-center">
            <h3 class="text-xl font-semibold text-text-primary">Completed Events</h3>
            <router-link to="/completed-events" class="text-sm text-primary hover:text-primary-dark transition-colors">
              See All <i class="fas fa-arrow-right ml-1"></i>
            </router-link>
          </div>
          <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <EventCard
              v-for="event in completedEvents.slice(0, 3)"
              :key="event.id"
              :event="event"
              class="animate-fade-in"
            />
          </div>
        </div>
      </div>

      <!-- Cancelled Events (Collapsible): Improved styling -->
      <!-- No skeleton for cancelled as it's initially hidden and less critical -->
      <section v-if="!loading && cancelledEvents.length > 0">
        <div class="border-t border-border pt-8 mt-8">
          <button
            class="flex items-center text-sm font-medium text-text-secondary hover:text-primary w-full text-left mb-4 transition-colors group"
            type="button"
            @click="showCancelled = !showCancelled">
            <i :class="['fas transition-transform duration-200', showCancelled ? 'fa-chevron-down' : 'fa-chevron-right', 'mr-2 text-text-disabled group-hover:text-primary h-3 w-3']"></i>
            Cancelled Events ({{ cancelledEvents.length }})
          </button>
          <transition name="fade-fast">
              <div v-show="showCancelled" class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  <EventCard
                    v-for="event in cancelledEvents"
                    :key="`cancelled-${event.id}`"
                    :event="event"
                    class="animate-fade-in cursor-pointer"
                    @click="router.push(`/event/${event.id}`)" />
              </div>
          </transition>
        </div>
      </section>
    </template>
  </div>
</template>

<script setup> // Using setup script
import { computed, onMounted, ref } from 'vue';
import { useStore } from 'vuex';
import { useRouter } from 'vue-router';
import EventCard from '../components/EventCard.vue';
import EventCardSkeleton from '../components/EventCardSkeleton.vue'; // Import skeleton

const store = useStore();
const router = useRouter();
const allEvents = computed(() => store.getters['events/allEvents']); // Directly use getter
const loading = ref(true);
const userRole = computed(() => store.getters['user/getUserRole']);
const isAuthenticated = computed(() => store.getters['user/isAuthenticated']);


const isAdmin = computed(() => store.getters['user/getUserRole'] === 'Admin');
// Anyone authenticated can request (logic handled in RequestEvent view/action)
const canRequestEvent = computed(() => isAuthenticated.value);

// Update the computed properties to limit based on screen size
const maxEventsPerSection = computed(() => {
  // You can use window.innerWidth but it's not reactive
  // Consider using a reactive width value or CSS Grid instead
  if (window.innerWidth < 640) return 2; // mobile
  if (window.innerWidth < 1024) return 4; // tablet
  return 6; // desktop
});

const upcomingEvents = computed(() =>
  allEvents.value
    .filter(e => e.status === 'Upcoming' || e.status === 'Approved')
    .sort((a, b) => (a.startDate?.seconds ?? 0) - (b.startDate?.seconds ?? 0))
    .slice(0, maxEventsPerSection.value)
);

const activeEvents = computed(() =>
  allEvents.value
    .filter(e => e.status === 'In Progress' || e.status === 'InProgress')
    .sort((a, b) => (a.startDate?.seconds ?? 0) - (b.startDate?.seconds ?? 0))
    .slice(0, maxEventsPerSection.value)
);

const completedEvents = computed(() =>
  allEvents.value
    .filter(e => e.status === 'Completed')
    .sort((a, b) => (b.completedAt?.seconds ?? b.endDate?.seconds ?? 0) - (a.completedAt?.seconds ?? a.endDate?.seconds ?? 0))
    .slice(0, maxEventsPerSection.value)
);

// Add new ref for cancelled events visibility
const showCancelled = ref(false);

// Add new computed for cancelled events
const cancelledEvents = computed(() =>
  allEvents.value.filter(e => e.status === 'Cancelled')
       .sort((a, b) => (b.startDate?.seconds ?? 0) - (a.startDate?.seconds ?? 0)) // Sort cancelled newest first
);

onMounted(async () => {
  loading.value = true;
  try {
    await store.dispatch('events/fetchEvents');
    // Data is now reactive via the computed 'allEvents'
  } catch (error) {
    console.error("Failed to load events:", error);
    // Handle error display if needed
  } finally {
    loading.value = false;
  }
});
</script>

<!-- Keep fade-fast transition -->
<style scoped>
.fade-fast-enter-active,
.fade-fast-leave-active {
  transition: opacity 0.2s ease-in-out, max-height 0.3s ease-in-out;
  overflow: hidden;
  max-height: 1000px; /* Adjust if needed, large enough for grid */
}

.fade-fast-enter-from,
.fade-fast-leave-to {
  opacity: 0;
  max-height: 0;
}
</style>
