<template>
  <div
    v-if="event && event.id"
    class="bg-white rounded-lg overflow-hidden shadow-md border border-secondary flex flex-col h-full transition duration-200 ease-in-out hover:shadow-xl hover:-translate-y-1"
    :class="{ 'opacity-75 bg-secondary': event.status === 'Cancelled' || event.status === 'Rejected' }"
  >
    <div class="p-5 flex flex-col flex-grow">
      <div class="flex justify-between items-start mb-2">
        <h5
          class="text-lg font-semibold text-primary-dark mb-0 mr-2 flex-1"
          :class="{ 'line-through text-gray-500': event.status === 'Cancelled' || event.status === 'Rejected' }"
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
      <div class="text-xs text-gray-500 mb-3 flex items-center flex-wrap gap-x-3">
        <span class="inline-flex items-center">
            <i class="fas fa-tag mr-1 text-gray-400"></i>{{ event.eventType }}
        </span>
        <span class="inline-flex items-center">
            <i class="fas fa-calendar-alt mr-1 text-gray-400"></i>{{ formatDateRange(event.startDate, event.endDate) }}
        </span>
      </div>
      <p class="text-sm text-gray-600 mb-4 flex-grow">{{ truncatedDescription }}</p>
      <div class="flex justify-between items-center mt-auto pt-3 border-t border-secondary">
        <router-link
          :to="{ name: 'EventDetails', params: { id: event.id } }"
          class="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary transition-colors"
        >
          View Details
        </router-link>
        <span class="text-sm text-gray-500 inline-flex items-center">
          <i class="fas fa-users mr-1.5 text-gray-400"></i> {{ participantCount }}
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
    const participants = props.event?.participants;
    if (Array.isArray(participants)) {
        return participants.length;
    }
    if (typeof participants === 'object' && participants !== null) {
        let count = 0;
        if (props.event.isTeamEvent && Array.isArray(props.event.teams)) {
            props.event.teams.forEach(team => {
                count += team.members?.length || 0;
            });
        } else {
            count = Object.keys(participants).length;
        }
         return count;
    }
    return 0;
});

// Updated status badge classes for better contrast and theme alignment
const statusBadgeClass = computed(() => {
  switch (props.event?.status) {
    case 'Approved':
    case 'Upcoming':
      return 'bg-green-100 text-green-700 border border-green-200';
    case 'Pending':
      return 'bg-yellow-100 text-yellow-700 border border-yellow-200';
    case 'In Progress':
    case 'Ongoing':
      return 'bg-blue-100 text-blue-700 border border-blue-200';
    case 'Rejected':
      return 'bg-red-100 text-red-700 border border-red-200';
    case 'Completed':
      return 'bg-gray-100 text-gray-600 border border-gray-200';
    case 'Cancelled':
      return 'bg-secondary text-gray-500 border border-secondary-dark';
    default:
      return 'bg-gray-100 text-gray-500 border border-gray-200';
  }
});

</script>

<style scoped>
/* Styles moved to Tailwind utilities */
</style>