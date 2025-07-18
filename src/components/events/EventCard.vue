// src/components/events/EventCard.vue
<template>
  <div
    v-if="event?.id"
    class="card event-card h-100 shadow-sm border-0"
    :class="[
      { 'bg-light opacity-75': isCancelledOrRejected },
      { 'event-card--compact': displayMode === 'compact' },
      { 'event-card--full': displayMode === 'full' }
    ]"
  >
    <div class="card-body p-3 d-flex flex-column">
      <!-- Header Row: Title and Status Badge -->
      <div class="d-flex justify-content-between align-items-start mb-2">
        <div class="flex-grow-1 me-2">
          <h6
            class="card-title fw-bold mb-1 text-break lh-sm"
            :class="{
              'text-secondary text-decoration-line-through': isCancelledOrRejected,
              'text-dark': !isCancelledOrRejected
            }"
          >
            {{ event.details?.eventName || 'Untitled Event' }}
          </h6>
        </div>
        <!-- Status Badge moved to header row -->
        <div class="event-status">
          <span class="badge rounded-pill text-xs" :class="getEventStatusBadgeClass(event.status)">
            {{ event.status }}
          </span>
        </div>
      </div>

      <!-- Event Type & Format Row -->
      <div class="d-flex align-items-center flex-wrap gap-2 small text-muted mb-2">
        <span class="d-flex align-items-center">
          <i class="fas fa-tag fa-xs me-1"></i>{{ event.details?.type || 'N/A' }}
        </span>
        <span class="text-muted">•</span>
        <span class="d-flex align-items-center">
          <i class="fas fa-users fa-xs me-1"></i>{{ event.details?.format || 'N/A' }}
        </span>
        <span v-if="(event.details?.format === EventFormat.MultiEvent && event.details?.isCompetition && event.details?.prize) || (event.details?.format !== EventFormat.MultiEvent && event.details?.prize)" class="text-muted">•</span>
        <span v-if="(event.details?.format === EventFormat.MultiEvent && event.details?.isCompetition && event.details?.prize) || (event.details?.format !== EventFormat.MultiEvent && event.details?.prize)" class="d-flex align-items-center text-warning">
          <i class="fas fa-trophy fa-xs me-1"></i>Prize
        </span>
      </div>

      <!-- Date and Organizer Row -->
      <div class="d-flex justify-content-between align-items-center mb-2 small">
        <div class="d-flex align-items-center text-muted">
          <i class="fas fa-calendar-alt fa-xs me-1"></i>
          <span>{{ formatDateRange(event.details?.date?.start, event.details?.date?.end) }}</span>
        </div>
        <div v-if="event.details?.organizers?.length" class="d-flex align-items-center text-muted">
          <i class="fas fa-user-shield fa-xs me-1"></i>
          <span class="text-truncate organizer-truncate">{{ formatOrganizers }}</span>
        </div>
      </div>

      <!-- Description -->
      <div class="card-text small text-secondary mb-3 flex-grow-1">
        <div class="rendered-markdown" v-html="renderedDescriptionHtml"></div>
      </div>

      <!-- Footer: Action Button -->
      <div class="mt-auto">
        <router-link
          :to="{ name: 'EventDetails', params: { id: event.id } }"
          class="btn btn-outline-primary btn-sm w-100"
        >
          <i class="fas fa-eye fa-xs me-1"></i>View Details
        </router-link>
      </div>
    </div>
  </div>
  <div v-else class="card h-100 border-light">
    <div class="card-body d-flex align-items-center justify-content-center text-muted">
      <i class="fas fa-exclamation-triangle me-2"></i>
      Event data unavailable.
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, type PropType, ref, watch } from 'vue';
import { useProfileStore } from '@/stores/profileStore';
import { formatISTDate } from '@/utils/dateTime';
import { EventStatus, type Event, EventFormat } from '@/types/event';
import { getEventStatusBadgeClass } from '@/utils/eventUtils';
import { useMarkdownRenderer } from '@/composables/useMarkdownRenderer';

const props = defineProps({
  event: {
    type: Object as PropType<Event>,
    required: true
  },
  nameCache: {
    type: Object as PropType<Record<string, string>>,
    default: () => ({})
  },
  displayMode: {
    type: String as PropType<'compact' | 'full'>,
    default: 'compact'
  }
});

const studentStore = useProfileStore();
const { renderMarkdown } = useMarkdownRenderer();

const isCancelledOrRejected = computed(() =>
  props.event.status === EventStatus.Rejected
);

const renderedDescriptionHtml = ref('');

async function processDescription(description: string | undefined) {
    // Set different character limits based on display mode
    const maxLen = props.displayMode === 'full' ? 160 : 120; // Increased from 120/80
    let desc = description || '';
    if (desc.length > maxLen) {
        desc = desc.substring(0, maxLen).trim() + '…';
    }
    desc = desc || 'No description provided.';
    renderedDescriptionHtml.value = await renderMarkdown(desc);
}

watch(
  [() => props.event?.details?.description, () => props.displayMode], 
  ([newDesc]) => {
    processDescription(newDesc);
  }, 
  { immediate: true }
);

const formatDateRange = (start: any, end: any): string => {
  try {
    const startDate = formatISTDate(start, 'dd MMM yy');
    const endDate = formatISTDate(end, 'dd MMM yy');
    if (!startDate) return 'Date TBD';
    return endDate && startDate !== endDate ? `${startDate} - ${endDate}` : startDate;
  } catch (e) {
    console.error("Error formatting date:", e);
    return 'Date N/A';
  }
};

const formatOrganizers = computed(() => {
  const organizers = props.event?.details?.organizers;
  if (!organizers?.length) {
    return 'N/A';
  }
  const getName = (uid: string): string => {
    if (!uid) return 'Unknown';
    const cachedName = studentStore.getCachedStudentName(uid);
    return cachedName || 'Member';
  };
  const names = organizers.map(getName);
  if (names.length > 1) {
    return `${names[0]}, +${names.length - 1} more`;
  }
  return names[0];
});

</script>

<style scoped>
/* Base card styles */
.event-card {
  border-radius: $border-radius-lg; /* Using SASS variable */
  background: var(--bs-white);
  border: 1px solid var(--bs-border-color-translucent) !important;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  width: 100%;
  overflow: hidden;
}

/* Compact mode (for horizontal scrolling in HomeView) */
.event-card--compact {
  min-height: 11.25rem; /* 180px */
  max-height: 16.25rem; /* 260px */
}

/* Full mode (for grid display in EventsListView) */
.event-card--full {
  min-height: 14.375rem; /* 230px */
  max-height: 17.5rem; /* 280px */
}

.event-card:hover {
  transform: translateY(-0.125rem); /* -2px */
  box-shadow: 0 0.5rem 1.5625rem $card-hover-shadow-color !important; /* 8px 25px */
  border-color: var(--bs-primary-border-subtle) !important;
}

.organizer-truncate {
  max-width: 7.5rem; /* 120px */
}

/* Card title styles */
.card-title {
  line-height: 1.35;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: break-word;
  hyphens: auto;
}

.event-card--compact .card-title {
  font-size: 1.1rem; /* Increased from 1rem */
}

.event-card--full .card-title {
  font-size: 1.15rem; /* Increased from 1.05rem */
}

/* Event status badge */
.event-status {
  display: flex;
  align-items: flex-start;
  margin-left: 0.5rem;
}

.badge {
  font-weight: 500;
  white-space: nowrap;
}

.event-card--compact .badge {
  font-size: $font-size-xs; /* 0.75rem */
  padding: 0.3rem 0.5rem; /* Custom padding */
}

.event-card--full .badge {
  font-size: 0.8rem;
  padding: 0.35rem 0.6rem; /* Custom padding */
}

/* Icon sizes */
.fa-xs {
  font-size: $font-size-xs; /* 0.75rem */
}

.event-card--full .fa-xs {
  font-size: 0.8rem;
}

.text-xs {
  font-size: 0.8rem;
}

.event-card--full .text-xs {
  font-size: 0.85rem;
}

/* Description area */
.rendered-markdown {
  line-height: 1.45;
  overflow: hidden;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  word-break: break-word;
}

.event-card--compact .rendered-markdown {
  font-size: 1.05rem; /* Increased from 1rem */
  max-height: 5.4em; /* Adjusted from 5.6em */
  -webkit-line-clamp: 3;
  line-clamp: 3;
}

.event-card--full .rendered-markdown {
  font-size: 0.975rem;
  max-height: 5.6em;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  line-height: 1.5;
}

.rendered-markdown :deep(p) {
  margin-bottom: 0.25rem;
}

.rendered-markdown :deep(p:last-child) {
  margin-bottom: 0;
}

.rendered-markdown :deep(ul),
.rendered-markdown :deep(ol) {
  margin-bottom: 0;
  padding-left: 1rem;
  font-size: inherit;
}

/* Button styles */
.btn-outline-primary {
  border-width: 1px;
  white-space: nowrap;
}

.event-card--compact .btn-outline-primary {
  font-size: 0.85rem; /* Increased from 0.8rem */
  padding: 0.4rem 0.75rem;
}

.event-card--full .btn-outline-primary {
  font-size: 0.9rem; /* Increased from 0.85rem */
  padding: 0.45rem 0.8rem;
}

.btn-outline-primary:hover {
  transform: none;
}

/* Responsive breakpoints - compact mode */
@media (max-width: 992px) {
  .event-card--compact {
    min-height: 11.875rem; /* 190px */
    max-height: 16.875rem; /* 270px */
  }
  
  .event-card--compact .card-title {
    font-size: 1.05rem;
  }
  
  .event-card--compact .rendered-markdown {
    font-size: 0.9rem;
    max-height: 5em; 
  }
}

@media (max-width: 768px) {
  .event-card--compact {
    min-height: 11.875rem; /* 190px */
    max-height: 16.875rem; /* 270px */
  }
  
  .event-card--compact .card-title {
    font-size: 1rem;
  }
  
  .event-card--compact .rendered-markdown {
    font-size: 0.9rem;
    max-height: 5.2em;
  }
  
  .event-card--compact .btn-outline-primary {
    font-size: 0.8rem;
    padding: 0.35rem 0.6rem;
  }
  
  .event-card--compact .text-xs {
    font-size: $font-size-xs; /* 0.75rem */
  }
  
  .event-card--compact .fa-xs {
    font-size: 0.7rem;
  }
}

@media (max-width: 576px) {
  .event-card--compact {
    min-height: 14.375rem; /* 230px */
    max-height: 19.375rem; /* 310px */
  }
  
  .event-card--full {
    min-height: 14.375rem; /* 230px */
    max-height: 20rem; /* 320px */
  }
  
  .event-card--compact .card-title,
  .event-card--full .card-title {
    font-size: 1rem;
  }
  
  .event-card--compact .rendered-markdown {
    font-size: 0.95rem;
    max-height: 7.2em;
    -webkit-line-clamp: 4;
    line-clamp: 4;
    line-height: 1.5;
  }
  
  .event-card--full .rendered-markdown {
    font-size: 0.9rem;
    max-height: 5.8em;
    -webkit-line-clamp: 3;
    line-clamp: 3;
    line-height: 1.6;
  }
  
  .event-card--compact .btn-outline-primary {
    font-size: 0.8rem;
    padding: 0.35rem 0.7rem;
  }
  
  .event-card--compact .badge {
    font-size: 0.7rem;
    padding: 0.25rem 0.45rem;
  }
  
  .event-card--compact .text-xs {
    font-size: 0.7rem;
  }
  
  .event-card--compact .fa-xs {
    font-size: 0.65rem;
  }
}

@media (max-width: 480px) {
  .event-card--compact {
    min-height: 14.375rem; /* 230px */
    max-height: 19.375rem; /* 310px */
  }
  
  .event-card--compact .card-title {
    font-size: 0.9rem;
    line-height: 1.3;
  }
  
  .event-card--compact .rendered-markdown {
    font-size: 0.85rem;
    max-height: 6.8em;
  }
  
  .event-card--compact .btn-outline-primary {
    font-size: $font-size-xs; /* 0.75rem */
    padding: 0.3rem 0.6rem;
  }
}

@media (max-width: 400px) {
  .event-card--compact {
    min-height: 13.75rem; /* 220px */
    max-height: 18.75rem; /* 300px */
  }
  
  .event-card--compact .card-title {
    font-size: 0.85rem;
  }
  
  .event-card--compact .rendered-markdown {
    font-size: $font-size-xs; /* 0.75rem */
    max-height: 6.0em;
  }
  
  .event-card--compact .btn-outline-primary {
    font-size: 0.65rem;
    padding: 0.25rem 0.5rem;
  }
  
  .card-body {
    padding: 0.75rem !important;
  }
}

/* Touch improvements for mobile */
@media (hover: none) and (pointer: coarse) {
  .event-card:hover {
    transform: none;
    box-shadow: 0 0.25rem 0.9375rem $card-hover-shadow-color !important; /* 4px 15px */
  }
  
  .btn-outline-primary {
    min-height: 2.75rem; /* 44px */
    display: flex;
    align-items: center;
    justify-content: center;
  }
}

/* High DPI displays */
@media (-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi) {
  .event-card {
    border-width: 0.5px; /* Kept as 0.5px for fine lines */
  }
}

/* Reduce motion for accessibility */
@media (prefers-reduced-motion: reduce) {
  .event-card {
    transition: none;
  }
  
  .event-card:hover {
    transform: none;
  }
}
</style>