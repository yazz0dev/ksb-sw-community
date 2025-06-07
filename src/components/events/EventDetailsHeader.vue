// src/components/events/EventDetailsHeader.vue
<template>
  <div class="event-details-header bg-light border rounded-3 shadow-sm overflow-hidden mb-4"> <!-- Added rounded-3 -->
    <div class="p-4 p-md-5">
      <!-- Header Content -->
      <div class="row g-4 align-items-start">
        <!-- Left Column: Details -->
        <div class="col-md">
          <!-- Status Badges -->
          <div class="d-flex gap-2 mb-3 flex-wrap"> <!-- Increased bottom margin -->
                    <span :class="['badge rounded-pill small lh-1', statusTagClass]">{{ event?.status }}</span> <!-- Added lh-1 -->
        <span v-if="event?.closed" class="badge rounded-pill bg-secondary-subtle text-secondary-emphasis small lh-1">Archived</span> <!-- Used subtle bg -->
        <span class="badge rounded-pill bg-info-subtle text-info-emphasis small lh-1">{{ event?.details?.format || 'N/A' }}</span> <!-- Format badge -->
          </div>

          <!-- Event Name -->
                      <h1 class="text-hero fw-bold text-primary mb-3"> <!-- Adjusted heading size -->
            {{ event?.details?.eventName || 'Untitled Event' }}
          </h1>

           <!-- Prize Display (for Competition) -->
           <div v-if="event?.details?.format === EventFormat.Competition && event?.details?.prize" class="mb-3 d-flex align-items-center text-warning-emphasis bg-warning-subtle p-2 rounded-pill border border-warning-subtle" style="max-width: fit-content;">
               <i class="fas fa-trophy me-2"></i>
               <span class="fw-medium small">Prize: {{ event.details.prize }}</span>
           </div>

          <!-- Organizers Section -->
          <div v-if="event?.details?.organizers?.length" class="d-flex align-items-center mb-4"> <!-- Increased bottom margin -->
            <span class="text-secondary me-2"><i class="fas fa-user-shield fa-fw"></i></span>
            <div class="text-secondary small"> <!-- Adjusted font size -->
              Organized by:
              <template v-for="(orgId, idx) in event.details.organizers" :key="orgId">
                <router-link
                  :to="{ name: 'PublicProfile', params: { userId: orgId }}"
                  class="text-decoration-none text-primary fw-medium"
                >
                  {{ formatOrganizerName(orgId) }}
                </router-link>
                <span v-if="idx < event.details.organizers.length - 1">, </span>
              </template>
            </div>
          </div>

          <!-- Event Meta: Date, Participants -->
          <div class="d-flex flex-wrap mb-4 gap-3"> <!-- Use gap-3 for spacing -->
            <!-- Date -->
            <div class="d-flex align-items-center text-secondary">
              <i class="fas fa-calendar-alt fa-fw me-2"></i>
              <small>
                {{ formatDateRange(event?.details?.date?.start, event?.details?.date?.end) }}
              </small>
            </div>
            <!-- Participants -->
            <div class="d-flex align-items-center text-secondary">
              <i class="fas fa-users fa-fw me-2"></i>
              <small>
                {{ totalParticipants }} participant{{ totalParticipants === 1 ? '' : 's' }}
              </small>
            </div>
          </div>

          <!-- Rendered Description -->
          <div class="rendered-description small border-top pt-4 mt-4" v-html="renderedDescriptionHtml"></div> <!-- Added border-top -->
          
          <!-- Rendered Rules -->
          <div v-if="renderedRulesHtml" class="rendered-rules small mt-4 pt-4 border-top">
            <h5 class="h6 text-secondary mb-3"><i class="fas fa-gavel me-2"></i>Event Rules & Guidelines</h5>
            <div v-html="renderedRulesHtml"></div>
          </div>

          <div class="alert alert-warning d-flex align-items-center rounded-pill alert-voting-open">
            <i class="fas fa-clock me-2"></i>
            <span class="small">
              <strong>Voting Open:</strong> Submit your ratings for participants and teams
            </span>
          </div>
        </div>

        <!-- Right Column: Action Buttons -->
        <div class="col-md-auto mt-4 mt-md-0">
          <div class="d-flex flex-column gap-2 align-items-stretch action-buttons-container">
            <!-- Join Event -->
            <button
              v-if="canJoin"
              class="btn btn-primary w-100 d-flex align-items-center justify-content-center"
              :disabled="isJoining"
              @click="$emit('join')"
            >
              <span v-if="isJoining" class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
              <i v-else class="fas fa-plus me-2"></i>
              <span>Join Event</span>
            </button>

            <!-- Leave Event -->
            <button
              v-if="canLeave"
              class="btn btn-outline-danger w-100 d-flex align-items-center justify-content-center"
              :disabled="isLeaving"
              @click="$emit('leave')"
            >
              <span v-if="isLeaving" class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
              <i v-else class="fas fa-times me-2"></i>
              <span>Leave Event</span>
            </button>
           </div>
         </div>
       </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, type PropType } from 'vue';
import { Timestamp } from 'firebase/firestore';
import { getEventStatusBadgeClass } from '@/utils/eventUtils';
import { formatISTDate } from '@/utils/dateTime';
import { EventFormat, type Team } from '@/types/event'; // Import Team for EventHeaderProps
import { useMarkdownRenderer } from '@/composables/useMarkdownRenderer';

// Define a more specific Event type for the header props
export interface EventHeaderProps {
  id: string;
  status: string;
  title: string;
  details: {
    format: EventFormat;
    date: {
      start: Timestamp | null;
      end: Timestamp | null;
    };
    description: string;
    eventName: string | undefined;
    type: string | undefined;
    organizers: string[] | undefined;
    prize: string | undefined;
    rules: string | undefined;
  };
  closed: boolean;
  teams: Team[] | undefined;
  participants: string[] | undefined;
}

const props = defineProps({
  event: {
    type: Object as PropType<EventHeaderProps>, // Use the specific type
    required: true,
  },
  canJoin: Boolean,
  canLeave: Boolean,
  isJoining: Boolean,
  isLeaving: Boolean,
  nameCache: {
    type: Object as PropType<Record<string, string>>, // Use Record
    default: () => ({}),
  },
});

const emit = defineEmits<{
  (e: 'join'): void;
  (e: 'leave'): void;
}>();


const renderedDescriptionHtml = ref('');
const renderedRulesHtml = ref(''); // Added ref for rules HTML

const { renderMarkdown } = useMarkdownRenderer();

async function renderDescription(description: string | undefined) {
  if (!description) {
    renderedDescriptionHtml.value = '<p class="text-muted fst-italic">No description provided.</p>';
    return;
  }
  try {
    const rawHtml: string = await renderMarkdown(description);
    renderedDescriptionHtml.value = rawHtml;
  } catch (error) {
    console.error('Error rendering markdown description:', error);
    renderedDescriptionHtml.value = '<p class="text-danger">Error rendering description.</p>';
  }
}

// New function to render rules as markdown
async function renderRules(rulesContent: string | undefined) {
  if (!rulesContent) {
    renderedRulesHtml.value = ''; // Clear if no rules
    return;
  }
  try {
    const rawHtml: string = await renderMarkdown(rulesContent);
    renderedRulesHtml.value = rawHtml;
  } catch (error) {
    console.error('Error rendering markdown rules:', error);
    renderedRulesHtml.value = '<p class="text-danger">Error rendering rules.</p>';
  }
}

watch(() => props.event?.details?.description, (newDesc) => {
     renderDescription(newDesc);
}, { immediate: true });

// Watch for changes to rules and render them
watch(() => props.event?.details?.rules, (newRules) => {
     renderRules(newRules);
}, { immediate: true });

const statusTagClass = computed((): string => getEventStatusBadgeClass(props.event?.status));

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

const totalParticipants = computed(() => {
  if (!props.event) return 0;
  // Team Format
  if (props.event.details?.format === EventFormat.Team && Array.isArray(props.event.teams)) {
    const memberSet = new Set<string>();
    props.event.teams.forEach(team => {
      (team.members || []).forEach(m => m && memberSet.add(m));
    });
    return memberSet.size;
  // Competition Format (use participants array)
  } else if (Array.isArray(props.event.participants)) {
    return props.event.participants.length;
  }
  return 0;
});

// Utility function to format organizer names
const formatOrganizerName = (uid: string): string => {
  return props.nameCache?.[uid] || 'Unknown Organizer';
};
</script>

<style scoped>
.rendered-description :deep(p:last-child) {
  margin-bottom: 0;
}

.rendered-description :deep(ul),
.rendered-description :deep(ol) {
  padding-left: 1.5rem;
  margin-top: 0.75rem; /* Added margin */
  margin-bottom: 0;
}

.rendered-description :deep(h1),
.rendered-description :deep(h2),
.rendered-description :deep(h3),
.rendered-description :deep(h4),
.rendered-description :deep(h5),
.rendered-description :deep(h6) {
    margin-top: 1rem;
    margin-bottom: 0.5rem;
    font-weight: 600; /* Make headings slightly bolder */
}

.rendered-description :deep(code) {
    background-color: var(--bs-secondary-bg);
    padding: 0.2em 0.4em;
    border-radius: 0.25rem;
    font-size: 0.9em;
}

.rendered-description :deep(pre) {
    background-color: var(--bs-dark);
    color: var(--bs-light);
    padding: 1rem;
    border-radius: 0.5rem;
    overflow-x: auto;
}

.rendered-description :deep(pre code) {
    background-color: transparent;
    padding: 0;
    color: inherit;
}

/* Add styles for the rendered rules, similar to rendered description */
.rendered-rules :deep(p:last-child) {
  margin-bottom: 0;
}

.rendered-rules :deep(ul),
.rendered-rules :deep(ol) {
  padding-left: 1.5rem;
  margin-top: 0.75rem;
  margin-bottom: 0;
}

.rendered-rules :deep(h1),
.rendered-rules :deep(h2),
.rendered-rules :deep(h3),
.rendered-rules :deep(h4),
.rendered-rules :deep(h5),
.rendered-rules :deep(h6) {
    margin-top: 1rem;
    margin-bottom: 0.5rem;
    font-weight: 600;
}

.rendered-rules :deep(code) {
    background-color: var(--bs-secondary-bg);
    padding: 0.2em 0.4em;
    border-radius: 0.25rem;
    font-size: 0.9em;
}

.rendered-rules :deep(pre) {
    background-color: var(--bs-dark);
    color: var(--bs-light);
    padding: 1rem;
    border-radius: 0.5rem;
    overflow-x: auto;
}

.rendered-rules :deep(pre code) {
    background-color: transparent;
    padding: 0;
    color: inherit;
}

/* Button styles are handled by base button styles from _button.scss */

.badge.lh-1 {
    padding-top: 0.4em; /* Adjust padding for line-height 1 */
    padding-bottom: 0.4em;
}

.alert-voting-open {
  max-width: fit-content;
}

.action-buttons-container {
  min-width: 170px;
}

.event-header {
  background-color: var(--bs-body-bg);
}

.card {
  background-color: var(--bs-card-bg);
  border: 1px solid var(--bs-border-color);
}

.btn:focus {
  box-shadow: 0 0 0 0.2rem rgba(var(--bs-primary-rgb), 0.25);
}
</style>