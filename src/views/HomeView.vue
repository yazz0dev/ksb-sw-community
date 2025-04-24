<template>
  <div class="home-section">
    <div class="container-lg">
      <!-- Removed mt-n4, added mt-2 for a little top space -->
      <div class="row g-4 mb-4 mt-2">
        <div class="col-12">
          <div class="d-flex justify-content-between align-items-center mb-4 px-lg-3">
            <h2 class="h3 text-dark mb-0"><i class="fas fa-calendar-alt text-primary me-2"></i>Events</h2>
            <div>
              <router-link
                to="/request-event"
                class="btn btn-primary d-inline-flex align-items-center"
              >
                <i class="fas fa-calendar-plus me-2"></i>
                <span>Request Event</span>
              </router-link>
            </div>
          </div>

          <div class="section-card shadow-sm rounded-4 p-4 mb-4 animate-fade-in">
            <div class="d-flex justify-content-between align-items-center mb-4">
              <h4 class="h4 text-dark mb-0"><i class="fas fa-bolt text-primary me-2"></i>Active Events</h4>
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

          <div class="section-card shadow-sm rounded-4 p-4 mb-4 animate-fade-in">
            <div class="d-flex justify-content-between align-items-center mb-4">
              <h4 class="h4 text-dark mb-0"><i class="fas fa-hourglass-half text-info me-2"></i>Upcoming Events</h4>
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

          <div class="section-card shadow-sm rounded-4 p-4 mb-4 animate-fade-in">
            <div class="d-flex justify-content-between align-items-center mb-4">
              <h4 class="h4 text-dark mb-0"><i class="fas fa-check-circle text-success me-2"></i>Completed Events</h4>
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

          <div v-if="cancelledEvents.length > 0" class="mb-4">
            <div class="section-card shadow-sm rounded-4 p-4 animate-fade-in">
              <button class="btn btn-link btn-sm text-decoration-none text-secondary mb-4 px-0" @click="showCancelled = !showCancelled">
                <i class="fas fa-ban me-2"></i>
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
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useStore } from 'vuex';
import { useRouter } from 'vue-router';
import { EventStatus, Event } from '@/types/event';
import EventCard from '../components/events/EventCard.vue';
import EventCardSkeleton from '../components/skeletons/EventCardSkeleton.vue'; 
import { getEventStatusBadgeClass } from '@/utils/eventUtils';

const store = useStore();
const router = useRouter();
const allEvents = computed<Event[]>(() => store.getters['events/allEvents']);
const loading = ref<boolean>(true);
const userRole = computed<string>(() => store.getters['user/getUserRole']);
const isAuthenticated = computed<boolean>(() => store.getters['user/isAuthenticated']);
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
.home-section {
  background: linear-gradient(135deg, #f8fafc 0%, #e0e7ff 100%);
  min-height: 100vh;
}
.section-card {
  background: #fff;
  border-radius: 1.5rem;
  box-shadow: 0 4px 24px 0 rgba(37,99,235,0.07);
  margin-bottom: 2rem;
  animation: fadeInSection 0.7s;
}
.animate-fade-in {
  animation: fadeInSection 0.7s;
}
@keyframes fadeInSection {
  from { opacity: 0; transform: translateY(24px);}
  to { opacity: 1; transform: none;}
}
.header-border {
  border-bottom: 1px solid #e5e7eb;
}
.btn-link.text-secondary {
  color: #64748b !important;
}
</style>
