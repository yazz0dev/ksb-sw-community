<template>
  <div
    v-if="event && event.id"
    class="bg-surface rounded-lg overflow-hidden shadow-md border border-border flex flex-col h-full transition duration-200 ease-in-out hover:shadow-lg hover:-translate-y-1"
    :class="{ 'opacity-75 bg-neutral': event.status === 'Cancelled' || event.status === 'Rejected' }"
  >
    <!-- Replace HTML comments with curly brace comments -->
    <div class="p-5 flex flex-col flex-grow">
      <div class="flex justify-between items-start mb-2">
        <h5
          class="text-lg font-semibold text-text-primary mb-0 mr-2 flex-1"
          :class="{ 'line-through text-text-disabled': event.status === 'Cancelled' || event.status === 'Rejected' }"
        >
          {{ event.eventName }}
        </h5>
        <span
          class="inline-block px-2.5 py-0.5 text-xs font-semibold rounded-full whitespace-nowrap"
          :class="statusBadgeClass"
        >
          {{ event.status }}
        </span>
      </div>
      <div class="text-xs text-text-secondary mb-3 flex items-center flex-wrap gap-x-3">
        <span class="inline-flex items-center">
            <i class="fas fa-tag mr-1 text-text-disabled"></i>{{ event.eventType }}
        </span>
        <span class="inline-flex items-center">
            <i class="fas fa-calendar-alt mr-1 text-text-disabled"></i>{{ formatDateRange(event.startDate, event.endDate) }}
        </span>
      </div>
      <p class="text-sm text-text-secondary mb-4 flex-grow">{{ truncatedDescription }}</p>
      <div class="flex justify-between items-center mt-auto pt-3 border-t border-border">
        <router-link
          :to="{ name: 'EventDetails', params: { id: event.id } }"
          class="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-primary-text bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary transition-colors shadow-md"
        >
          View Details
        </router-link>
        <span class="text-sm text-text-secondary inline-flex items-center">
          <i class="fas fa-users mr-1.5 text-text-disabled"></i> {{ participantCount }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { DateTime } from 'luxon';

const props = defineProps({
  event: {
    type: Object,
    required: true
  }
});

// Helper to format date range
const formatDateRange = (start, end) => {
  try {
    const startDateObj = start?.toDate ? DateTime.fromJSDate(start.toDate()) : DateTime.fromISO(start);
    const endDateObj = end?.toDate ? DateTime.fromJSDate(end.toDate()) : (end ? DateTime.fromISO(end) : null);

    if (!startDateObj.isValid) return 'Invalid date';

    const startDate = startDateObj.toLocaleString(DateTime.DATE_MED);
    const endDate = endDateObj?.isValid ? endDateObj.toLocaleString(DateTime.DATE_MED) : null;

    return endDate && startDate !== endDate ? `${startDate} - ${endDate}` : startDate;
  } catch (e) {
    console.error("Error formatting date:", e);
    return 'Date N/A';
  }
};

// Truncate description
const truncatedDescription = computed(() => {
  const maxLen = 90;
  const desc = props.event?.description || '';
  if (desc.length > maxLen) {
    return desc.substring(0, maxLen).trim() + '…';
  }
  return desc || 'No description provided.';
});

// Participant count (Handles arrays and potentially objects/maps)
const participantCount = computed(() => {
    // For team events, count all team members
    if (props.event.isTeamEvent && Array.isArray(props.event.teams)) {
        let count = 0;
        props.event.teams.forEach(team => {
            count += team.members?.length || 0;
        });
        return count;
    }
    
    // For non-team events, count participants
    const participants = props.event?.participants;
    if (Array.isArray(participants)) {
        return participants.length;
    }
    if (typeof participants === 'object' && participants !== null) {
        return Object.keys(participants).length;
    }
    return 0;
});

// Updated status badge classes for better contrast and theme alignment
const statusBadgeClass = computed(() => {
  switch (props.event?.status) {
    case 'Approved':
    case 'Upcoming':
      return 'bg-success-light text-success-dark border-success-light';
    case 'Pending':
      return 'bg-warning-light text-warning-dark border-warning-light';
    case 'In Progress':
    case 'Ongoing':
      return 'bg-info-light text-info-dark border-info-light';
    case 'Rejected':
      return 'bg-error-light text-error-dark border-error-light';
    case 'Completed':
      return 'bg-neutral-light text-neutral-dark border-neutral-light';
    case 'Cancelled':
      return 'bg-neutral-light text-neutral-dark border-neutral-light line-through';
    default:
      return 'bg-neutral-light text-neutral-dark border-neutral-light';
  }
});

</script>

<style scoped>
/* Styles moved to Tailwind utilities */
</style>
