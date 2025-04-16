<template>
  <div class="event-details-header bg-light border rounded shadow-sm overflow-hidden">
    <div class="p-4 p-md-5">
      <!-- Header Content -->
      <div class="row g-4 align-items-start">
        <!-- Left Column: Details -->
        <div class="col-md">
          <div class="d-flex gap-2 mb-2 flex-wrap">
            <span :class="['badge rounded-pill fs-6', statusTagClass]">{{ event.status }}</span>
            <span v-if="event.closed" class="badge rounded-pill bg-light text-dark fs-6">Archived</span>
          </div>

          <h1 class="display-5 text-primary mb-2">
            {{ event.title }}
          </h1>

          <div class="d-flex flex-wrap mb-4 gap-4">
            <div class="d-flex align-items-center">
              <span class="text-secondary me-2"><i class="fas fa-calendar"></i></span>
              <small class="text-secondary">
                {{ formatDate(event.startDate) }} - {{ formatDate(event.endDate) }}
              </small>
            </div>
            <div class="d-flex align-items-center">
              <span class="text-secondary me-2"><i class="fas fa-users"></i></span>
              <small class="text-secondary">
                {{ event.teamSize }} members per team
              </small>
            </div>
          </div>

          <!-- Rendered Description -->
          <div class="rendered-description small" v-html="renderedDescription"></div>

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
              v-if="canEdit"
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
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { marked } from 'marked'; 
import DOMPurify from 'dompurify';
import { DateTime } from 'luxon';

interface Event {
  id: string;
  status: string;
  title: string;
  startDate: { toDate(): Date } | string | Date;
  endDate: { toDate(): Date } | string | Date;
  teamSize: number;
  description: string;
  closed?: boolean;
}

const props = defineProps<{
  event: Event;
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

const formatDate = (dateInput: { toDate(): Date } | string | Date | null): string => {
  if (!dateInput) return 'TBA';
  const dt = typeof dateInput === 'object' && 'toDate' in dateInput 
    ? DateTime.fromJSDate(dateInput.toDate()) 
    : typeof dateInput === 'string'
    ? DateTime.fromISO(dateInput)
    : DateTime.fromJSDate(dateInput as Date);
  return dt.toLocaleString(DateTime.DATE_MED);
};

const renderedDescription = computed(() => {
  if (!props.event.description) return '';
  marked.setOptions({
    breaks: true,
    gfm: true,
  });
  const rawHtml: string = marked.parse(props.event.description); // Explicitly type as string
  return DOMPurify.sanitize(rawHtml);
});

const statusTagClass = computed((): string => {
  switch (props.event.status) {
    case 'Pending': return 'bg-warning-subtle text-warning-emphasis';
    case 'Approved': return 'bg-info-subtle text-info-emphasis'; 
    case 'InProgress': return 'bg-primary-subtle text-primary-emphasis'; 
    case 'Completed': return 'bg-success-subtle text-success-emphasis';
    case 'Cancelled': return 'bg-danger-subtle text-danger-emphasis';
    default: return 'bg-secondary-subtle text-secondary-emphasis';
  }
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
