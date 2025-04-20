<template>
  <div class="event-details-header bg-light border rounded shadow-sm overflow-hidden">
    <div class="p-4 p-md-5">
      <!-- Header Content -->
      <div class="row g-4 align-items-start">
        <!-- Left Column: Details -->
        <div class="col-md">
          <div class="d-flex gap-2 mb-2 flex-wrap">
            <span :class="['badge rounded-pill fs-6', statusTagClass]">{{ event?.status }}</span>
            <span v-if="event?.closed" class="badge rounded-pill bg-light text-dark fs-6">Archived</span>
          </div>

          <h1 class="display-5 text-primary mb-2">
            {{ event?.title }}
          </h1>

          <div class="d-flex flex-wrap mb-4 gap-4">
            <div class="d-flex align-items-center">
              <span class="text-secondary me-2"><i class="fas fa-calendar"></i></span>
              <small class="text-secondary">
                {{ formatDate(event?.details?.date.start) }} - {{ formatDate(event?.details?.date.end) }}
              </small>
            </div>
            <div class="d-flex align-items-center">
              <span class="text-secondary me-2"><i class="fas fa-users"></i></span>
              <small class="text-secondary">
                {{ totalParticipants }} participant{{ totalParticipants === 1 ? '' : 's' }}
              </small>
            </div>
          </div>

          <!-- Rendered Description -->
          <div class="rendered-description small" v-html="renderedDescriptionHtml"></div>

        </div>

        <!-- Right Column: Action Buttons -->
        <div class="col-md-auto">
          <div class="d-flex flex-column gap-2" style="min-width: 180px;">
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

            <button
              v-if="canEdit && event?.id"
              class="btn btn-outline-secondary w-100 d-flex align-items-center justify-content-center"
              @click="$router.push(`/event/${event.id}/edit`)"
            >
               <i class="fas fa-edit me-2"></i>
              <span>Edit Event</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watchEffect } from 'vue';
import { useRouter } from 'vue-router';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { DateTime } from 'luxon';
import { Timestamp } from 'firebase/firestore';

interface Event {
  id: string;
  status: string;
  title: string;
  details: {
    date: {
        start: Timestamp | null;
        end: Timestamp | null;
    };
    format: string;
    description: string; 
  };
  closed?: boolean;
  teams?: { members: string[] }[];
  participants?: string[];
}

const props = defineProps<{
  event: Event | null;
  canJoin: boolean;
  canLeave: boolean;
  canEdit: boolean;
  isJoining: boolean;
  isLeaving: boolean;
}>();

const emit = defineEmits<{
  (e: 'join'): void;
  (e: 'leave'): void;
}>();

const router = useRouter();

const renderedDescriptionHtml = ref('');

const formatDate = (dateInput: Timestamp | string | Date | null | undefined): string => {
  if (!dateInput) return 'TBA';
  let dt: DateTime | null = null;
  if (dateInput instanceof Timestamp) {
      dt = DateTime.fromJSDate(dateInput.toDate());
  } else if (dateInput instanceof Date) {
      dt = DateTime.fromJSDate(dateInput);
  } else if (typeof dateInput === 'string') {
      dt = DateTime.fromISO(dateInput);
  }

  return dt && dt.isValid ? dt.toLocaleString(DateTime.DATE_MED) : 'Invalid Date';
};

const renderDescription = async (description: string | undefined) => {
    if (!description) {
        renderedDescriptionHtml.value = '';
        return;
    }
    marked.setOptions({
        breaks: true,
        gfm: true,
    });
    try {
        const rawHtml: string = await marked.parse(description);
        renderedDescriptionHtml.value = DOMPurify.sanitize(rawHtml);
    } catch (error) {
        console.error('Error rendering markdown description:', error);
        renderedDescriptionHtml.value = '<p class="text-danger">Error rendering description.</p>';
    }
};

watchEffect(() => {
    renderDescription(props.event?.details?.description);
});

const statusTagClass = computed((): string => {
  switch (props.event?.status) {
    case 'Pending': return 'bg-warning-subtle text-warning-emphasis';
    case 'Approved': return 'bg-info-subtle text-info-emphasis';
    case 'InProgress': return 'bg-primary-subtle text-primary-emphasis';
    case 'Completed': return 'bg-success-subtle text-success-emphasis';
    case 'Cancelled': return 'bg-danger-subtle text-danger-emphasis';
    default: return 'bg-secondary-subtle text-secondary-emphasis';
  }
});

const totalParticipants = computed(() => {
  if (!props.event) return 0;
  if (props.event.details?.format === 'Team' && Array.isArray(props.event.teams)) {
    const memberSet = new Set<string>();
    props.event.teams.forEach(team => {
      (team.members || []).forEach(m => m && memberSet.add(m));
    });
    return memberSet.size;
  } else if (Array.isArray(props.event.participants)) {
    return props.event.participants.length;
  }
  return 0;
});
</script>

<style scoped>
/* Minor style adjustments if needed for rendered HTML */
.rendered-description :deep(p:last-child) {
  margin-bottom: 0; /* Remove extra margin from last paragraph */
}
.rendered-description :deep(ul) {
  padding-left: 1.5rem; /* Adjust list padding if needed */
  margin-top: 0.5rem;
}

/* Ensure buttons maintain consistent height with spinner */
.btn {
  min-height: 38px; /* Adjust based on Bootstrap's default btn height */
}
</style>
