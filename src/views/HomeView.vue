<template>
  <section class="py-5 home-section">
    <div class="container-lg">
      <!-- Loading State -->
      <div v-if="loading" class="text-center py-5">
        <div class="spinner-border text-primary" role="status" style="width: 3rem; height: 3rem;">
          <span class="visually-hidden">Loading...</span>
        </div>
        <p class="text-secondary mt-2">Loading...</p>
      </div>

      <!-- Content -->
      <template v-else>
        <div class="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-5 pb-4 header-border">
          <!-- Left side -->
          <div>
            <h2 class="h2 text-primary mb-0">Events Dashboard</h2>
          </div>
          <!-- Right side -->
          <div class="mt-3 mt-md-0 ms-md-auto">
            <div class="d-flex flex-wrap justify-content-end gap-2">
              <router-link
                v-if="canRequestEvent && !isAdmin"
                to="/request-event"
                class="btn btn-primary d-inline-flex align-items-center"
              >
                <i class="fas fa-calendar-plus me-2"></i>
                <span>{{ isAdmin ? 'Create Event' : 'Request Event' }}</span>
              </router-link>
              <router-link
                v-if="isAdmin"
                to="/manage-requests"
                class="btn btn-outline-secondary d-inline-flex align-items-center"
              >
                <i class="fas fa-tasks me-2"></i>
                <span>Manage Requests</span>
              </router-link>
            </div>
          </div>
        </div>

        <!-- Event Sections -->
        <div class="mb-5">
          <!-- Updated Header for Active Events -->
          <div class="d-flex justify-content-between align-items-center mb-4">
            <h4 class="h4 text-dark mb-0">Active Events</h4>
            <router-link 
              v-if="totalActiveCount > maxEventsPerSection" 
              to="/events?filter=active" 
              class="btn btn-link btn-sm text-decoration-none"
            >
              View All
            </router-link>
          </div>
          <div v-if="activeEvents.length > 0" class="row g-3">
            <div v-for="event in activeEvents" :key="event.id" class="col-md-6 col-lg-4">
              <EventCard :event="event" />
            </div>
          </div>
          <p v-else class="text-secondary">No active events at the moment.</p>
        </div>

        <div class="mb-5">
          <!-- Updated Header for Upcoming Events -->
          <div class="d-flex justify-content-between align-items-center mb-4">
            <h4 class="h4 text-dark mb-0">Upcoming Events</h4>
             <router-link 
              v-if="totalUpcomingCount > maxEventsPerSection" 
              to="/events?filter=upcoming" 
              class="btn btn-link btn-sm text-decoration-none"
            >
              View All
            </router-link>
          </div>
          <div v-if="upcomingEvents.length > 0" class="row g-3">
            <div v-for="event in upcomingEvents" :key="event.id" class="col-md-6 col-lg-4">
              <EventCard :event="event" />
            </div>
          </div>
          <p v-else class="text-secondary">No upcoming events scheduled.</p>
        </div>

        <div class="mb-5">
          <div class="d-flex justify-content-between align-items-center mb-4">
            <h4 class="h4 text-dark mb-0">Completed Events</h4>
            <router-link 
              v-if="totalCompletedCount > maxEventsPerSection"
              to="/events?filter=completed" 
              class="btn btn-link btn-sm text-decoration-none"
            >
              View All
            </router-link>
          </div>
          <div v-if="completedEvents.length > 0" class="row g-3">
            <div v-for="event in completedEvents" :key="event.id" class="col-md-6 col-lg-4">
              <EventCard :event="event" />
            </div>
          </div>
          <p v-else class="text-secondary">No completed events yet.</p>
        </div>

        <!-- Cancelled Events Section (Toggleable) -->
        <div v-if="cancelledEvents.length > 0" class="mb-5">
          <button class="btn btn-link btn-sm text-decoration-none text-secondary mb-4" @click="showCancelled = !showCancelled">
            {{ showCancelled ? 'Hide' : 'Show' }} Cancelled Events
            <i :class="['fas', showCancelled ? 'fa-chevron-up' : 'fa-chevron-down', 'ms-1']"></i>
          </button>
          <transition name="fade-fast">
            <div v-if="showCancelled">
              <div class="row g-3">
                <div v-for="event in cancelledEvents" :key="event.id" class="col-md-6 col-lg-4">
                  <EventCard :event="event" />
                </div>
              </div>
            </div>
          </transition>
        </div>
      </template>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useStore } from 'vuex';
import { useRouter } from 'vue-router';
import { EventStatus, Event } from '@/types/event';
import EventCard from '../components/events/EventCard.vue';
import EventCardSkeleton from '../components/skeletons/EventCardSkeleton.vue'; 

const store = useStore();
const router = useRouter();
const allEvents = computed<Event[]>(() => store.getters['events/allEvents']);
const loading = ref<boolean>(true);
const userRole = computed<string>(() => store.getters['user/getUserRole']);
const isAuthenticated = computed<boolean>(() => store.getters['user/isAuthenticated']);
const isAdmin = computed<boolean>(() => userRole.value === 'Admin');
const canRequestEvent = computed<boolean>(() => isAuthenticated.value);

// Limit display on dashboard, use reasonable defaults
const maxEventsPerSection = 6; 

// Calculate total counts before slicing
const totalUpcomingCount = computed<number>(() => 
    allEvents.value.filter(e => e.status === EventStatus.Approved).length
);
const totalActiveCount = computed<number>(() => 
    allEvents.value.filter(e => e.status === EventStatus.InProgress).length
);
const totalCompletedCount = computed<number>(() => 
    allEvents.value.filter(e => e.status === EventStatus.Completed).length
); 

const upcomingEvents = computed<Event[]>(() =>
  allEvents.value
    .filter(e => e.status === EventStatus.Approved)
    .sort((a, b) => {
      const aStart = a.details.date.start?.toMillis() ?? 0;
      const bStart = b.details.date.start?.toMillis() ?? 0;
      return aStart - bStart;
    })
    .slice(0, maxEventsPerSection)
);

const activeEvents = computed<Event[]>(() =>
  allEvents.value
    .filter(e => e.status === EventStatus.InProgress)
    .sort((a, b) => {
      const aStart = a.details.date.start?.toMillis() ?? 0;
      const bStart = b.details.date.start?.toMillis() ?? 0;
      return aStart - bStart;
    })
    .slice(0, maxEventsPerSection)
);

const completedEvents = computed<Event[]>(() =>
  allEvents.value
    .filter(e => e.status === EventStatus.Completed)
    .sort((a, b) => {
      const aEnd = a.details.date.end?.toMillis() ?? 0;
      const bEnd = b.details.date.end?.toMillis() ?? 0;
      return bEnd - aEnd;
    })
    .slice(0, maxEventsPerSection)
);

const showCancelled = ref<boolean>(false);

const cancelledEvents = computed<Event[]>(() =>
  allEvents.value
    .filter(e => e.status === EventStatus.Cancelled)
    .sort((a, b) => {
      const aStart = a.details.date.start?.toMillis() ?? 0;
      const bStart = b.details.date.start?.toMillis() ?? 0;
      return bStart - aStart;
    })
);

onMounted(async () => {
  loading.value = true;
  try {
    await store.dispatch('events/fetchEvents');
  } catch (error) {
    console.error("Failed to load events:", error);
    // Handle error display if needed
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
/* .home-section styles removed - handled by inline/global styles */
/* .fade-fast-* transitions removed - defined globally */
/* .header-border removed - handled by inline style */
</style>
