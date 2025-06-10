<template>
  <div v-if="events.length > 0 || loading" class="section-card shadow-sm rounded-4 animate-fade-in">
    <!-- Header -->
    <div class="section-header bg-primary-subtle text-primary-emphasis rounded-top-4 p-4 border-bottom">
      <div class="d-flex align-items-center justify-content-between">
        <div class="header-content">
          <div class="header-icon bg-primary-subtle">
            <i class="fas fa-history fa-lg"></i>
          </div>
          <div>
            <h5 class="section-title mb-1 text-primary-emphasis">Event History</h5>
            <p v-if="!loading" class="d-none d-sm-block section-subtitle small mb-0">{{ events.length }} event{{ events.length === 1 ? '' : 's' }} participated</p>
            <p v-else class="d-none d-sm-block section-subtitle small mb-0">Loading events...</p>
          </div>
        </div>
        <div class="header-badge">
          <span v-if="!loading" class="badge bg-primary text-white rounded-pill px-3 py-2">
            {{ events.length }}
          </span>
          <div v-else class="spinner-border spinner-border-sm text-primary" role="status">
            <span class="visually-hidden">Loading...</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading && events.length === 0" class="loading-section p-4">
      <div class="d-flex align-items-center justify-content-center">
        <div class="spinner-border spinner-border-sm text-primary me-2" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
        <span class="text-secondary">Loading event details...</span>
      </div>
    </div>

    <!-- Events List -->
    <div v-else-if="events.length > 0" class="item-list">
      <div
        v-for="(eventItem, index) in sortedEvents"
        :key="eventItem.eventId || `event-${index}`" 
        class="list-item p-3"
        :class="{ 'border-bottom': index < sortedEvents.length - 1 }"
      >
        <!-- Event Header -->
        <div class="event-header mb-3">
          <!-- First Row: Event Name and Organizer Badge -->
          <div class="d-flex align-items-center justify-content-between mb-2">
            <div class="d-flex align-items-center">
              <div class="item-icon bg-primary-subtle me-3">
                <i class="fas fa-calendar-alt text-primary"></i>
              </div>
              <div class="event-title-container">
                <router-link
                  v-if="eventItem.eventId"
                  :to="`/event/${eventItem.eventId}`" 
                  class="event-title text-decoration-none fw-semibold text-dark hover-primary"
                >
                  {{ eventItem.eventName || 'Unnamed Event' }}
                </router-link>
                <span 
                  v-else 
                  class="event-title fw-semibold text-dark"
                >
                  {{ eventItem.eventName || 'Unnamed Event' }}
                </span>
              </div>
            </div>
            
            <!-- Organizer Badge -->
            <span
              v-if="isOrganizer(eventItem)"
              class="organizer-badge badge bg-success-subtle text-success-emphasis rounded-pill"
            >
              <i class="fas fa-crown me-1"></i>Organizer
            </span>
          </div>
          
          <!-- Second Row: Event Format and Date -->
          <div class="d-flex align-items-center justify-content-between ms-5">
            <!-- Event Format -->
            <span 
              v-if="eventItem.eventFormat" 
              class="meta-badge badge bg-secondary-subtle text-secondary-emphasis rounded-pill"
            >
              <i class="fas fa-users me-1"></i>{{ formatEventFormat(eventItem.eventFormat) }}
            </span>
            <span v-else></span>
            
            <!-- Event Date -->
            <span class="date-badge badge bg-light text-dark border rounded-pill">
              <i class="fas fa-clock me-1"></i>{{ formatISTDate(eventItem.date?.start) }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Empty State -->
  <div v-else-if="!loading" class="section-card shadow-sm rounded-4 animate-fade-in">
    <div class="empty-state p-4">
      <div class="empty-icon text-center mb-3">
        <i class="fas fa-calendar-times fa-3x text-muted opacity-50"></i>
      </div>
      <h6 class="empty-title text-center mb-2">No Event History</h6>
      <p class="empty-description text-center text-muted mb-0">This user hasn't participated in any events yet.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue';
import { formatISTDate } from '@/utils/dateTime';
import { EventFormat, EventStatus } from '@/types/event';
import { type StudentEventHistoryItem } from '@/types/student';

interface Props {
  events: StudentEventHistoryItem[];
  loading: boolean;
}

const props = defineProps<Props>();

const sortedEvents = computed(() => {
  // Events are already sorted by Firebase queries, just filter out pending events
  return props.events.filter(event => event.eventStatus !== EventStatus.Pending);
});

const isOrganizer = (eventItem: StudentEventHistoryItem): boolean => {
  return eventItem.roleInEvent === 'organizer';
};

const formatEventFormat = (format: EventFormat | undefined): string => {
  if (!format) return '';
  if (format === EventFormat.Team) return 'Team Event';
  if (format === EventFormat.Individual) return 'Individual Event';
  if (format === EventFormat.MultiEvent) return 'Competition';
  return format;
};
</script>

<style scoped>
/* Section Header */
.section-header {
  border-bottom: 1px solid var(--bs-border-color-translucent);
}

.header-icon {
  width: 3rem;
  height: 3rem;
  border-radius: 50%;
  background: rgba(var(--bs-primary-rgb), 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
}

.section-title {
  font-size: 1.25rem;
  color: var(--bs-primary-emphasis);
}

.section-subtitle {
  color: var(--bs-secondary);
}

.header-badge .badge {
  font-size: 0.875rem;
  font-weight: 600;
}

/* Loading Section */
.loading-section {
  background: var(--bs-light);
  border-radius: 0 0 var(--bs-border-radius-lg) var(--bs-border-radius-lg);
}

/* Empty State */
.empty-state {
  min-height: 200px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.empty-title {
  color: var(--bs-secondary);
  font-weight: 600;
}

.empty-description {
  font-size: 0.9rem;
}

/* Events List */
.events-list {
  padding: 0;
}

.event-item {
  padding: 1.5rem;
  transition: background-color 0.3s ease;
  position: relative;
}

.event-item:hover {
  background-color: var(--bs-light);
}

.event-item:last-child {
  border-radius: 0 0 var(--bs-border-radius-lg) var(--bs-border-radius-lg);
}

/* Event Header */
.event-icon {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 50%;
  background: var(--bs-primary-subtle);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

/* Event Meta */
.event-meta {
  margin-left: 3.5rem;
}

/* Event-specific badges */
.meta-badge,
.organizer-badge,
.date-badge {
  font-size: 0.75rem;
  padding: 0.35rem 0.65rem;
  font-weight: 500;
}

.organizer-badge {
  font-weight: 600;
  border: 1px solid var(--bs-success);
}

.date-badge {
  border: 1px solid var(--bs-border-color) !important;
}

/* Component-specific styles */
.event-title {
  font-size: 1.1rem;
  line-height: 1.4;
  transition: color 0.3s ease;
}

.event-title.hover-primary:hover {
  color: var(--bs-primary) !important;
}

/* Responsive adjustments */
@media (max-width: 480px) {
  .event-meta {
    margin-left: 0;
    width: 100%;
  }
  
  .event-meta .badge {
    flex: 1;
    text-align: center;
    min-width: auto;
  }
}

.item-icon {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.list-item {
  transition: background-color 0.2s ease;
}

.list-item:hover {
  background-color: var(--bs-light);
}
</style>
