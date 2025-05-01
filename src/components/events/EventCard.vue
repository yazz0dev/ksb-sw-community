<template>
  <div
    v-if="event?.id"
    class="card event-card h-100 shadow-sm border"
    :class="{ 'bg-light opacity-75': isCancelledOrRejected }"
    style="border-radius: var(--bs-border-radius-lg); overflow: hidden; transition: box-shadow 0.2s ease-in-out, transform 0.2s ease-in-out;"
  >
    <div class="card-body d-flex flex-column p-3 p-md-4"> <!-- Adjusted padding -->
      <!-- Header: Name & Status -->
      <div class="d-flex justify-content-between align-items-start mb-2 flex-wrap gap-1">
        <h5
          class="card-title h6 fw-bold mb-0 me-2 text-break" 
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
          style="font-size: 0.7rem;" 
        >
          {{ event.status }}
        </span>
      </div>

      <!-- Meta Info: Type, Format, Date, Prize -->
      <div class="d-flex small text-secondary mb-3 flex-wrap" style="gap: 0.5rem 1rem;"> <!-- Adjusted gap -->
        <!-- Type -->
        <div class="d-flex align-items-center" title="Event Type">
            <i class="fas fa-tag fa-fw me-1 text-muted"></i>{{ event.details?.type || 'N/A' }}
        </div>
        <!-- Format -->
        <div class="d-flex align-items-center" title="Event Format">
            <i class="fas fa-users fa-fw me-1 text-muted"></i>{{ event.details?.format || 'N/A' }}
        </div>
         <!-- Prize (if Competition) -->
        <div v-if="event.details?.format === 'Competition' && event.details?.prize" class="d-flex align-items-center" title="Prize">
            <i class="fas fa-trophy fa-fw me-1 text-warning"></i>
            <span class="text-truncate" style="max-width: 150px;">{{ event.details.prize }}</span>
        </div>
         <!-- Date -->
        <div class="d-flex align-items-center" title="Date Range">
            <i class="fas fa-calendar-alt fa-fw me-1 text-muted"></i>{{ formatDateRange(event.details?.date?.start, event.details?.date?.end) }}
        </div>
      </div>

      <!-- Organizers -->
      <div v-if="event.details?.organizers?.length" class="d-flex small text-secondary mb-3" style="gap: 0.5rem;" title="Organizers">
        <i class="fas fa-user-shield fa-fw text-muted"></i>
        <div class="text-truncate">
          {{ formatOrganizers }}
        </div>
      </div>

      <!-- Description -->
      <div class="card-text small text-secondary mb-4 flex-grow-1 rendered-markdown" v-html="truncatedDescription"></div>

      <!-- Footer: Action & Participants -->
      <div class="d-flex justify-content-between align-items-center mt-auto pt-3 border-top">
        <router-link
          :to="{ name: 'EventDetails', params: { id: event.id } }"
          class="btn btn-primary btn-sm shadow-sm"
        >
          View Details
        </router-link>
        <div class="d-flex align-items-center small text-secondary" title="Participant Count">
          <i class="fas fa-users fa-fw me-1 text-muted"></i> {{ participantCount }}
        </div>
      </div>
    </div>
  </div>
  <div v-else class="card h-100 border-light">
      <div class="card-body d-flex align-items-center justify-content-center text-muted">
           Event data unavailable.
      </div>
  </div>
</template>

<script setup lang="ts">
import { computed, PropType } from 'vue';
import { formatISTDate } from '@/utils/dateTime';
import { EventStatus, type Event, EventFormat } from '@/types/event';
import { getEventStatusBadgeClass } from '@/utils/eventUtils';
import { marked } from 'marked';

// Configure marked
marked.setOptions({
  breaks: true, // Convert single line breaks to <br>
  gfm: true,    // Enable GitHub Flavored Markdown
});

// Define props using defineProps
const props = defineProps({
  event: {
    type: Object as PropType<Event>,
    required: true
  },
  nameCache: {
    type: Object as PropType<Record<string, string>>, // Use Record<string, string> for nameCache
    default: () => ({}) // Default to an empty object
  }
});

const isCancelledOrRejected = computed(() =>
  props.event.status === EventStatus.Cancelled ||
  props.event.status === EventStatus.Rejected
);

// Helper to format date range
const formatDateRange = (start: any, end: any): string => {
  try {
    const startDate = formatISTDate(start, 'dd MMM yy'); // Shortened year
    const endDate = formatISTDate(end, 'dd MMM yy');
    if (!startDate) return 'Date TBD';
    return endDate && startDate !== endDate ? `${startDate} - ${endDate}` : startDate;
  } catch (e) {
    console.error("Error formatting date:", e);
    return 'Date N/A';
  }
};

// Format organizers names
const formatOrganizers = computed(() => {
  const organizers = props.event?.details?.organizers;
  if (!organizers?.length) {
    return 'N/A';
  }

  const getName = (uid: string): string => {
    if (!uid) return 'Unknown';
    // Use the Record type for nameCache
    return props.nameCache[uid] || 'Member';
  };

  // Show only the first organizer if there are many
  const names = organizers.map(getName);
  if (names.length > 1) {
    return `${names[0]}, +${names.length - 1} more`;
  }
  return names[0];
});

// Truncate description
const truncatedDescription = computed(() => {
  const maxLen = 80; // Slightly shorter max length
  let desc = props.event?.details?.description || '';
  if (desc.length > maxLen) {
    desc = desc.substring(0, maxLen).trim() + '…';
  }
  desc = desc || 'No description provided.';

  try {
     return marked.parse(desc); // Assuming internal/safe content for now
  } catch (e) {
     console.error("Markdown parsing error:", e);
     return `<p class="text-danger">Error rendering description.</p>`; // Fallback
  }
});

// Participant count
const participantCount = computed(() => {
  if (!props.event) return 0;
  // Handle Team format
  if (props.event.details.format === EventFormat.Team) {
    return props.event.teams?.reduce((total, team) =>
      total + (Array.isArray(team.members) ? team.members.length : 0), 0) || 0;
  }
  // Handle Individual and Competition formats (using participants array)
  return Array.isArray(props.event.participants) ? props.event.participants.length : 0;
});

</script>

<style scoped>
.event-card {
  transition: transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
  border-width: 1px;
  border-color: var(--bs-border-color-translucent); /* Softer border */
}
.event-card:hover {
  transform: translateY(-4px) scale(1.02); /* Slightly more lift */
  box-shadow: var(--bs-box-shadow-lg) !important; /* Use Bootstrap variable for consistency */
}
.fs-7 {
    font-size: 0.8rem !important; /* Adjusted size */
}
/* Style for rendered markdown - prevent excessive margins */
.rendered-markdown :deep(p:last-child) {
    margin-bottom: 0;
}
.rendered-markdown :deep(ul),
.rendered-markdown :deep(ol) {
    margin-bottom: 0;
    padding-left: 1.2rem; /* Adjust list indent */
}
.text-break {
   overflow-wrap: break-word;
   word-wrap: break-word; /* Older browsers */
   word-break: break-word; /* Ensure long words break */
}
</style>