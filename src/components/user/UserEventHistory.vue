<template>
  <div v-if="events.length > 0" class="card shadow-sm">
    <div class="card-header">
      <h5 class="card-title mb-0 d-flex align-items-center">
        <i class="fas fa-history text-primary me-2"></i>Event History
      </h5>
    </div>
    <ul class="list-group list-group-flush event-history-section">
      <li
        v-for="(eventItem, index) in sortedEvents"
        :key="eventItem.eventId || index" 
        class="list-group-item px-3 py-3"
      >
        <div class="d-flex justify-content-between align-items-center gap-2 mb-2">
          <div class="d-flex align-items-center">
            <i class="fas fa-calendar-alt text-primary me-2"></i>
            <router-link
              v-if="eventItem.eventId"
              :to="{ name: 'EventDetails', params: { id: eventItem.eventId } }" 
              class="fw-semibold text-primary text-decoration-none me-2"
            >
              {{ eventItem.eventName || 'Unnamed Event' }}
            </router-link>
            <span v-else class="fw-semibold text-muted me-2" :title="`Event ID missing for: ${eventItem.eventName}`">
              {{ eventItem.eventName || 'Unnamed Event (Link unavailable)' }}
            </span>
            <span v-if="eventItem.eventFormat" class="badge bg-secondary-subtle text-secondary-emphasis small ms-2">
              <i class="fas fa-users me-1"></i>{{ formatEventFormat(eventItem.eventFormat) }}
            </span>
          </div>
          <div class="d-flex align-items-center gap-2">
            <span
              class="badge rounded-pill"
              :class="getEventStatusBadgeClass(eventItem.eventStatus)" 
            >
              {{ eventItem.eventStatus }}
            </span>
            <span
              v-if="isOrganizer(eventItem)"
              class="badge bg-success-subtle text-success-emphasis rounded-pill"
            >
              <i class="fas fa-crown me-1"></i> Organizer
            </span>
          </div>
        </div>
        <div class="d-flex justify-content-between align-items-center">
          <span v-if="false" class="badge bg-info-subtle text-info-emphasis small">
            <!-- Optional placeholder for additional info -->
          </span>
          <div class="d-flex align-items-center gap-2">
            <span class="badge bg-light text-secondary border border-1 fw-normal">
              {{ formatISTDate(eventItem.date?.start) }}
            </span>
          </div>
        </div>
      </li>
    </ul>
    <div v-if="loading" class="card-footer text-center text-muted small">
      Loading event details...
    </div>
  </div>
  <div v-else-if="!loading" class="card shadow-sm">
    <div class="card-body text-center text-muted">
      No event participation history found.
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { formatISTDate } from '@/utils/dateTime';
import { getEventStatusBadgeClass } from '@/utils/eventUtils';
import { EventFormat } from '@/types/event';
import { type StudentEventHistoryItem } from '@/types/student';

interface Props {
  events: StudentEventHistoryItem[];
  loading: boolean;
}

const props = defineProps<Props>();

const sortedEvents = computed(() => {
  return [...props.events].sort((a, b) => {
    const timeA = a.date?.start?.toMillis() ?? 0;
    const timeB = b.date?.start?.toMillis() ?? 0;
    return timeB - timeA; // Most recent first
  });
});

const isOrganizer = (eventItem: StudentEventHistoryItem): boolean => {
  return eventItem.roleInEvent === 'organizer';
};

const formatEventFormat = (format: EventFormat | undefined): string => {
  if (!format) return '';
  if (format === EventFormat.Team) return 'Team Event';
  if (format === EventFormat.Individual) return 'Individual Event';
  if (format === EventFormat.Competition) return 'Competition';
  return format;
};
</script>

<style scoped>
.event-history-section { 
  font-size: 0.875rem; 
}
.event-history-section .router-link-active,
.event-history-section .router-link { 
  font-size: 0.9rem; 
}
.event-history-section .badge { 
  font-size: 0.75rem; 
}
.event-history-section i { 
  font-size: 0.825rem; 
}
</style>
