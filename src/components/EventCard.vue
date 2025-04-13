<template>
  <div
    v-if="event && event.id"
    class="card event-card is-flex is-flex-direction-column is-fullheight"
    :style="cardStyle"
  >
    <div class="card-content is-flex is-flex-direction-column is-flex-grow-1 p-5">
      <div class="level is-mobile mb-2">
        <div class="level-left">
          <h5
            class="title is-5 has-text-primary level-item mb-0 mr-2"
            :class="{ 
              'has-text-grey-light has-text-decoration-line-through': isCancelledOrRejected,
              'has-text-primary': !isCancelledOrRejected
            }"
            style="flex-grow: 1; flex-shrink: 1; white-space: normal; overflow-wrap: break-word;"
          >
            {{ event.eventName }}
          </h5>
        </div>
        <div class="level-right">
          <span 
            class="tag is-rounded is-light level-item is-size-7"
            :class="statusBadgeClass"
            style="white-space: nowrap;"
          >
            {{ event.status }}
          </span>
        </div>
      </div>
      <div class="is-flex is-size-7 has-text-grey mb-3 is-flex-wrap-wrap" style="gap: 0.75rem;">
        <div class="is-flex is-align-items-center">
            <span class="icon is-small mr-1 has-text-grey-light"><i class="fas fa-tag"></i></span>{{ event.eventType }}
        </div>
        <div class="is-flex is-align-items-center">
            <span class="icon is-small mr-1 has-text-grey-light"><i class="fas fa-calendar-alt"></i></span>{{ formatDateRange(event.startDate, event.endDate) }}
        </div>
      </div>
      <p class="is-size-7 has-text-grey mb-4" style="flex-grow: 1;">{{ truncatedDescription }}</p>
      <div class="is-flex is-justify-content-space-between is-align-items-center mt-auto pt-3" style="border-top: 1px solid var(--color-border);">
        <router-link
          :to="{ name: 'EventDetails', params: { id: event.id } }"
          class="button is-primary is-small has-shadow"
          style="color: var(--color-primary-text); background-color: var(--color-primary);"
        >
          View Details
        </router-link>
        <div class="is-flex is-align-items-center is-size-7 has-text-grey">
          <span class="icon is-small mr-1 has-text-grey-light"><i class="fas fa-users"></i></span> {{ participantCount }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { DateTime } from 'luxon';
// Removed Chakra UI imports

const props = defineProps({
  event: {
    type: Object,
    required: true
  }
});

const isCancelledOrRejected = computed(() => 
  props.event.status === 'Cancelled' || props.event.status === 'Rejected'
);

const cardStyle = computed(() => ({
  backgroundColor: isCancelledOrRejected.value ? 'var(--color-neutral)' : 'var(--color-surface)',
  borderRadius: '6px',
  overflow: 'hidden',
  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)', // shadow-md
  border: '1px solid var(--color-border)',
  opacity: isCancelledOrRejected.value ? 0.75 : 1,
  transition: 'box-shadow 0.2s ease-in-out, transform 0.2s ease-in-out',
}));

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

// Participant count
const participantCount = computed(() => {
    if (props.event.isTeamEvent && Array.isArray(props.event.teams)) {
        let count = 0;
        props.event.teams.forEach(team => {
            count += team.members?.length || 0;
        });
        return count;
    }
    const participants = props.event?.participants;
    if (Array.isArray(participants)) {
        return participants.length;
    }
    if (typeof participants === 'object' && participants !== null) {
        return Object.keys(participants).length;
    }
    return 0;
});

// Map status to Bulma tag classes
const statusBadgeClass = computed(() => {
  switch (props.event?.status) {
    case 'Approved':
    case 'Upcoming':
      return 'is-success';
    case 'Pending':
      return 'is-warning';
    case 'In Progress':
    case 'Ongoing':
      return 'is-info';
    case 'Rejected':
      return 'is-danger';
    case 'Completed':
      return 'is-dark'; // Use is-dark for completed
    case 'Cancelled':
      return 'is-light'; // Keep is-light for cancelled
    default:
      return 'is-light';
  }
});

</script>

<style scoped>
.event-card:hover {
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05) !important; /* shadow-lg */
  transform: translateY(-4px);
}

.button.has-shadow {
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}
.button.is-primary:hover {
   background-color: var(--color-primary-dark) !important; 
}
</style>
