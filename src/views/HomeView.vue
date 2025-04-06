<template>
  <!-- Use theme background -->
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 bg-background min-h-[calc(100vh-8rem)]">
    <!-- Header and Actions: Improved spacing and button styling -->
    <div class="flex flex-wrap justify-between items-center gap-4 mb-8 pb-4 border-b border-border">
       <h2 class="text-3xl font-bold text-text-primary whitespace-nowrap">Events Dashboard</h2>
       <div class="flex space-x-3 flex-wrap justify-end">
           <!-- Unified Event Creation Button -->
           <router-link
              v-if="canRequestEvent"
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

    <!-- Loading State: Use theme color -->
    <div v-if="loading" class="flex flex-col items-center justify-center py-16 text-text-secondary">
        <svg class="animate-spin h-10 w-10 text-primary mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p>Loading events...</p>
    </div>

    <!-- Event Sections: Increased spacing -->
    <div v-else class="space-y-12">
      <!-- Upcoming Events -->
      <section>
        <!-- Section Title: Enhanced styling -->
        <h3 class="text-2xl font-semibold text-text-primary mb-5 border-b-2 border-border pb-2">Upcoming Events</h3>
        <!-- No Events Message: Enhanced styling -->
        <div v-if="upcomingEvents.length === 0" class="bg-info-light border border-info-light text-info-dark p-6 rounded-lg text-center text-sm italic shadow-sm">
            <i class="fas fa-calendar-times block text-2xl mb-2 text-info-dark"></i> No upcoming events scheduled.
        </div>
        <div v-else class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"> <!-- Added xl:grid-cols-4 -->
            <EventCard 
              v-for="event in upcomingEvents" 
              :key="`upcoming-${event.id}`" 
              :event="event" 
              class="animate-fade-in cursor-pointer"
              @click="router.push(`/event/${event.id}`)" />
        </div>
      </section>

      <!-- Active Events -->
      <section>
        <h3 class="text-2xl font-semibold text-text-primary mb-5 border-b-2 border-border pb-2">Active Events</h3>
        <div v-if="activeEvents.length === 0" class="bg-info-light border border-info-light text-info-dark p-6 rounded-lg text-center text-sm italic shadow-sm">
            <i class="fas fa-running block text-2xl mb-2 text-info-dark"></i> No events currently in progress.
        </div>
        <div v-else class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <EventCard 
              v-for="event in activeEvents" 
              :key="`active-${event.id}`" 
              :event="event" 
              class="animate-fade-in cursor-pointer"
              @click="router.push(`/event/${event.id}`)" />
        </div>
      </section>

      <!-- Completed Events -->
      <section>
        <h3 class="text-2xl font-semibold text-text-primary mb-5 border-b-2 border-border pb-2">Completed Events</h3>
        <div v-if="completedEvents.length === 0" class="bg-info-light border border-info-light text-info-dark p-6 rounded-lg text-center text-sm italic shadow-sm">
            <i class="fas fa-check-circle block text-2xl mb-2 text-info-dark"></i> No completed events yet.
        </div>
        <div v-else class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <EventCard 
              v-for="event in completedEvents" 
              :key="`completed-${event.id}`" 
              :event="event" 
              class="animate-fade-in cursor-pointer"
              @click="router.push(`/event/${event.id}`)" />
        </div>
      </section>

      <!-- Cancelled Events (Collapsible): Improved styling -->
      <section v-if="cancelledEvents.length > 0">
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

    </div>
  </div>
</template>

<script setup> // Using setup script
import { computed, onMounted, ref } from 'vue';
import { useStore } from 'vuex';
import { useRouter } from 'vue-router';
import EventCard from '../components/EventCard.vue';

const store = useStore();
const router = useRouter();
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
