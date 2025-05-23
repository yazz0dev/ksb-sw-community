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
        <div v-if="event.details?.format === EventFormat.Competition && event.details?.prize" class="d-flex align-items-center" title="Prize">
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
      <!-- FIX: Ensure renderedDescriptionHtml uses the centrally rendered markdown -->
      <div class="card-text small text-secondary mb-4 flex-grow-1 rendered-markdown" v-html="renderedDescriptionHtml"></div>

      <!-- Footer: Action & Participants -->
      <div class="d-flex justify-content-between align-items-center mt-auto pt-3 border-top">
        <router-link
          :to="{ name: 'EventDetails', params: { id: event.id } }"
          class="btn btn-primary btn-sm shadow-sm"
        >
          View Details
        </router-link>
        <!-- Removed participant count display -->
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
import { computed, PropType, ref, watch } from 'vue';
import { useUserStore } from '@/store/studentProfileStore';
import { formatISTDate } from '@/utils/dateTime';
import { EventStatus, type Event, EventFormat } from '@/types/event';
import { getEventStatusBadgeClass } from '@/utils/eventUtils';
// Import the composable instead of direct utility
import { useMarkdownRenderer } from '@/composables/useMarkdownRenderer';

// Define props using defineProps
const props = defineProps({
  event: {
    type: Object as PropType<Event>,
    required: true
  },
  nameCache: {
    type: Object as PropType<Record<string, string>>,
    default: () => ({})
  }
});

const userStore = useUserStore();
// Use the composable
const { renderMarkdown } = useMarkdownRenderer();

const isCancelledOrRejected = computed(() =>
  props.event.status === EventStatus.Cancelled ||
  props.event.status === EventStatus.Rejected
);

const renderedDescriptionHtml = ref('');

// Helper to render markdown description
async function processDescription(description: string | undefined) {
    let desc = description || '';
    const maxLen = 80; // Max length for truncated description
    if (desc.length > maxLen) {
        desc = desc.substring(0, maxLen).trim() + '…';
    }
    desc = desc || 'No description provided.'; // Fallback text

    // Use the centralized markdown renderer (async version)
    // FIX: Call the composable's function
    renderedDescriptionHtml.value = await renderMarkdown(desc);
}

// Watch the event description and re-render markdown when it changes
watch(() => props.event?.details?.description, (newDesc) => {
     processDescription(newDesc);
}, { immediate: true }); // Run immediately on component mount

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

// Format organizers names using the store getter
const formatOrganizers = computed(() => {
  const organizers = props.event?.details?.organizers;
  if (!organizers?.length) {
    return 'N/A';
  }

  // Use the store getter to get cached names
  const getName = (uid: string): string => {
    if (!uid) return 'Unknown';
    // Access the getter via the store instance
    const cachedName = userStore.getCachedUserName(uid);
    return cachedName || 'Member'; // Fallback name if not in cache
  };

  // Show only the first organizer if there are many
  const names = organizers.map(getName);
  if (names.length > 1) {
    return `${names[0]}, +${names.length - 1} more`;
  }
  return names[0];
});

// Removed participantCount computed property

</script>

<style scoped>
.event-card {
  /* Remove duplicated transitions and border properties that are in global styles */
  border-color: var(--bs-border-color-translucent);
}
/* Keep specific hover behavior if it differs from global card hover */
.event-card:hover {
  transform: translateY(-4px) scale(1.02); /* Different from global hover effect */
  box-shadow: var(--bs-box-shadow-lg);
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