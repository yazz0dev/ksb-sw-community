<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6"> <!-- Main container -->
    <!-- Header and Actions -->
    <div class="flex flex-wrap justify-between items-center gap-4 mb-8"> <!-- Use gap for spacing -->
       <h2 class="text-2xl font-bold text-gray-900 whitespace-nowrap">Events Dashboard</h2>
       <div class="flex space-x-2 flex-wrap justify-end"> <!-- Button container -->
           <router-link 
              v-if="canRequestEvent && !isAdmin" 
              to="/request-event" 
              class="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 transition-colors">
               <i class="fas fa-plus mr-1"></i> Request Event
           </router-link>
           <router-link 
              v-if="isAdmin" 
              to="/request-event" 
              class="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors">
               <i class="fas fa-calendar-plus mr-1"></i> Create Event
           </router-link>
           <router-link 
              v-if="isAdmin" 
              to="/manage-requests" 
              class="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-yellow-500 hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-400 transition-colors">
               <i class="fas fa-tasks mr-1"></i> Manage Requests
           </router-link>
       </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center py-10">
        <svg class="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
    </div>
    
    <!-- Event Sections -->
    <div v-else class="space-y-10"> <!-- Vertical spacing between sections -->
      <!-- Upcoming Events -->
      <section>
        <h3 class="text-xl font-semibold text-gray-800 mb-4 border-b border-gray-200 pb-2">Upcoming Events</h3>
        <div v-if="upcomingEvents.length === 0" class="bg-gray-50 text-gray-600 p-4 rounded-md text-sm">No upcoming events.</div>
        <div v-else class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"> <!-- Tailwind Grid -->
            <EventCard v-for="event in upcomingEvents" :key="`upcoming-${event.id}`" :event="event" />
        </div>
      </section>

      <!-- Active Events -->
      <section>
        <h3 class="text-xl font-semibold text-gray-800 mb-4 border-b border-gray-200 pb-2">Active Events</h3>
        <div v-if="activeEvents.length === 0" class="bg-gray-50 text-gray-600 p-4 rounded-md text-sm">No events currently in progress.</div>
        <div v-else class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"> <!-- Tailwind Grid -->
             <EventCard v-for="event in activeEvents" :key="`active-${event.id}`" :event="event" />
        </div>
      </section>

      <!-- Completed Events -->
      <section>
        <h3 class="text-xl font-semibold text-gray-800 mb-4 border-b border-gray-200 pb-2">Completed Events</h3>
        <div v-if="completedEvents.length === 0" class="bg-gray-50 text-gray-600 p-4 rounded-md text-sm">No completed events yet.</div>
        <div v-else class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"> <!-- Tailwind Grid -->
            <EventCard v-for="event in completedEvents" :key="`completed-${event.id}`" :event="event" />
        </div>
      </section>

      <!-- Cancelled Events (Collapsible) -->
      <section v-if="cancelledEvents.length > 0">
         <div class="border-t border-gray-200 pt-6">
            <button 
              class="flex items-center text-sm font-medium text-gray-600 hover:text-gray-900 w-full text-left mb-4" 
              type="button" 
              @click="showCancelled = !showCancelled">
              <i :class="['fas', showCancelled ? 'fa-chevron-down' : 'fa-chevron-right', 'mr-2 text-gray-400 h-3 w-3']"></i>
              Cancelled Events ({{ cancelledEvents.length }})
            </button>
            <transition name="fade-fast">
                <div v-show="showCancelled" class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"> <!-- Tailwind Grid -->
                     <EventCard v-for="event in cancelledEvents" :key="`cancelled-${event.id}`" :event="event" />
                </div>
            </transition>
          </div>
      </section>

    </div>
  </div>
</template>

<script setup> // Using setup script
import { computed, onMounted, ref } from 'vue';
import { useStore } from 'vuex';
import EventCard from '../components/EventCard.vue';

const store = useStore();
const allEvents = computed(() => store.getters['events/allEvents']); // Directly use getter
const loading = ref(true);
const userRole = computed(() => store.getters['user/getUserRole']);
const isAuthenticated = computed(() => store.getters['user/isAuthenticated']);


const isAdmin = computed(() => userRole.value === 'Admin' );
// Anyone authenticated can request (logic handled in RequestEvent view/action)
const canRequestEvent = computed(() => isAuthenticated.value);

const upcomingEvents = computed(() =>
  allEvents.value.filter(e => e.status === 'Upcoming' || e.status === 'Approved') // Approved requests shown as Upcoming
       .sort((a, b) => (a.startDate?.seconds ?? 0) - (b.startDate?.seconds ?? 0)) // Sort upcoming soonest first
);
const activeEvents = computed(() =>
  allEvents.value.filter(e => e.status === 'In Progress' || e.status === 'InProgress')
       .sort((a, b) => (a.startDate?.seconds ?? 0) - (b.startDate?.seconds ?? 0))
);
const completedEvents = computed(() =>
  allEvents.value.filter(e => e.status === 'Completed')
       // Sort completed most recent first (already sorted by fetch)
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

<!-- Added transition styles -->
<style scoped>
.fade-fast-enter-active,
.fade-fast-leave-active {
  transition: opacity 0.2s ease-in-out;
}

.fade-fast-enter-from,
.fade-fast-leave-to {
  opacity: 0;
}
</style>
