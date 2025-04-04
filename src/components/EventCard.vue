<template>
  <div
    v-if="event && event.id"
    class="bg-white rounded-lg overflow-hidden shadow-sm border border-gray-200 flex flex-col h-full transition duration-200 ease-in-out hover:-translate-y-1 hover:shadow-lg"
    :class="{ 'opacity-70 bg-gray-50': event.status === 'Cancelled' }"
  >
    <div class="p-4 flex flex-col flex-grow"> <!-- Use p-4 for padding, flex-grow to push button down -->
      <div class="flex justify-between items-start mb-2">
        <h5
          class="text-lg font-semibold text-gray-800 mb-0 mr-2 flex-1"
          :class="{ 'line-through': event.status === 'Cancelled' }"
        >
          {{ event.eventName }}
        </h5>
        <span
          class="inline-block px-2 py-0.5 text-xs font-semibold rounded-full whitespace-nowrap"
          :class="statusBadgeClass"
        >
          {{ event.status }}
        </span>
      </div>
      <p class="text-sm text-gray-500 mb-2">
        <i class="fas fa-tag mr-1"></i>{{ event.eventType }}
        <span class="mx-2">|</span>
        <i class="fas fa-calendar-alt mr-1"></i>{{ formatDateRange(event.startDate, event.endDate) }}
      </p>
      <p class="text-sm text-gray-700 mb-3 flex-grow">{{ truncatedDescription }}</p> <!-- flex-grow for description area -->
      <div class="flex justify-between items-center mt-auto pt-2 border-t border-gray-100"> <!-- mt-auto pushes this section down -->
        <router-link
          :to="{ name: 'EventDetail', params: { eventId: event.id } }"
          class="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
        >
          View Details
        </router-link>
        <span class="text-sm text-gray-500">
          <i class="fas fa-users mr-1"></i> {{ participantCount }}
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
  const startDate = DateTime.fromISO(start).toLocaleString(DateTime.DATE_MED);
  const endDate = end ? DateTime.fromISO(end).toLocaleString(DateTime.DATE_MED) : null;
  return endDate && startDate !== endDate ? `${startDate} - ${endDate}` : startDate;
};

// Truncate description
const truncatedDescription = computed(() => {
  const maxLen = 100;
  if (props.event?.description?.length > maxLen) {
    return props.event.description.substring(0, maxLen) + '...';
  }
  return props.event.description || 'No description provided.';
});

// Participant count (assuming participants is an array or has a length)
const participantCount = computed(() => {
    if (Array.isArray(props.event?.participants)) {
        return props.event.participants.length;
    }
    // Add handling for potential map/object structure if needed
    if (typeof props.event?.participants === 'object' && props.event?.participants !== null) {
        return Object.keys(props.event.participants).length;
    }
    return 0;
});


// Computed property for status badge class
const statusBadgeClass = computed(() => {
  switch (props.event?.status) {
    case 'Approved':
      return 'bg-green-100 text-green-800';
    case 'Pending':
      return 'bg-yellow-100 text-yellow-800';
    case 'Rejected':
      return 'bg-red-100 text-red-800';
    case 'Completed':
      return 'bg-blue-100 text-blue-800';
    case 'Cancelled':
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
});

</script>

<!-- <style scoped>
.event-card {
  transition: transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
  border: none; /* Rely on shadow */
}

.event-card:hover {
  transform: translateY(-3px);
  box-shadow: var(--shadow-md) !important; /* Use larger shadow from variables */
}

.card-title {
  font-size: 1.05rem; /* Slightly smaller title */
}

.card-text {
  font-size: 0.875rem; /* Ensure text isn't too large */
  color: var(--color-text-secondary);
}

/* Adjust padding for medium screens and up if needed */
@media (min-width: 768px) {
  .card-body {
    /* padding: var(--space-4); */ /* Optional: Increase padding on larger screens */
  }
  .card-title {
    font-size: 1.1rem; /* Slightly larger title on desktop */
  }
}

/* Status-specific styles */
.card-cancelled {
  opacity: 0.7;
  background-color: #f8f9fa; /* Lighter background for cancelled */
}
.card-cancelled .card-title {
  text-decoration: line-through;
}
</style> -->