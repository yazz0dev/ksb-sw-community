<template>
  <div
    v-if="event && event.id"
    class="card event-card h-100 shadow-sm border"
    :class="{ 'bg-light opacity-75': isCancelledOrRejected }"
    style="border-radius: var(--bs-border-radius); overflow: hidden; transition: box-shadow 0.2s ease-in-out, transform 0.2s ease-in-out;"
  >
    <div class="card-body d-flex flex-column p-4">
      <div class="d-flex justify-content-between align-items-start mb-2 flex-wrap">
        <h5
          class="card-title h5 mb-0 me-2 text-break"
          :class="{ 
            'text-secondary text-decoration-line-through': isCancelledOrRejected,
            'text-primary': !isCancelledOrRejected
          }"
        >
          {{ event.details?.eventName || 'Untitled Event' }}
        </h5>
        <span 
          class="badge rounded-pill fs-7 flex-shrink-0"
          :class="getEventStatusBadgeClass(event.status)"
        >
          {{ event.status }}
        </span>
      </div>
      <div class="d-flex small text-secondary mb-3 flex-wrap" style="gap: 0.75rem;">
        <div class="d-flex align-items-center">
            <i class="fas fa-tag fa-fw me-1 text-muted"></i>{{ event.details?.type || 'Type N/A' }}
        </div>
        <div class="d-flex align-items-center">
            <i class="fas fa-calendar-alt fa-fw me-1 text-muted"></i>{{ formatDateRange(event.details?.date?.start, event.details?.date?.end) }}
        </div>
      </div>
      <p class="card-text small text-secondary mb-4 flex-grow-1">{{ truncatedDescription }}</p>
      <div class="d-flex justify-content-between align-items-center mt-auto pt-3 border-top">
        <router-link
          :to="{ name: 'EventDetails', params: { id: event.id } }"
          class="btn btn-primary btn-sm shadow-sm"
        >
          View Details
        </router-link>
        <div class="d-flex align-items-center small text-secondary">
          <i class="fas fa-users fa-fw me-1 text-muted"></i> {{ participantCount }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, PropType } from 'vue';
import { formatISTDate } from '@/utils/dateTime';
import { EventStatus, type Event, EventFormat } from '@/types/event';
import { Timestamp } from 'firebase/firestore'; // <-- Add this import
import { getEventStatusBadgeClass } from '@/utils/eventUtils';

// Define props using defineProps
const props = defineProps({
  event: {
    type: Object as PropType<Event>,
    required: true
  }
});

const isCancelledOrRejected = computed(() =>
  props.event.status === EventStatus.Cancelled ||
  props.event.status === EventStatus.Rejected
);

// Helper to format date range
const formatDateRange = (start: any, end: any): string => {
  try {
    const startDate = formatISTDate(start, 'dd MMM yyyy');
    const endDate = formatISTDate(end, 'dd MMM yyyy');
    return endDate && startDate !== endDate ? `${startDate} - ${endDate}` : startDate;
  } catch (e) {
    console.error("Error formatting date:", e);
    return 'Date N/A';
  }
};

// Truncate description
const truncatedDescription = computed(() => {
  const maxLen = 90;
  const desc = props.event?.details?.description || '';
  if (desc.length > maxLen) {
    return desc.substring(0, maxLen).trim() + '…';
  }
  return desc || 'No description provided.';
});

// Participant count
const participantCount = computed(() => {
  if (!props.event) return 0;
  if (props.event.details.format === EventFormat.Team) {
    return props.event.teams?.reduce((total, team) => 
      total + (Array.isArray(team.members) ? team.members.length : 0), 0) || 0;
  }
  return Array.isArray(props.event.participants) ? props.event.participants.length : 0;
});
</script>

<style scoped>
.event-card:hover {
  box-shadow: var(--bs-box-shadow-lg) !important; /* Use Bootstrap variable for consistency */
  transform: translateY(-4px);
}

.fs-7 {
    font-size: 0.75rem !important; /* Define fs-7 if not global */
}
</style>
