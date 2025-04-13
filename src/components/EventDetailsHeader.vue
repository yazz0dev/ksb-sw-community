<template>
  <div class="box" style="background-color: var(--color-surface); border: 1px solid var(--color-border); border-radius: 6px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); overflow: hidden;">
    <div class="p-4 sm:p-6 lg:p-8">
      <!-- Header Content -->
      <div class="columns is-variable is-4 is-align-items-start">
        <!-- Left Column: Details -->
        <div class="column is-flex-grow-1">
          <div class="tags mb-2">
            <span :class="['tag', statusTagClass, 'is-light']">{{ event.status }}</span>
            <span v-if="event.closed" class="tag is-light">Archived</span>
          </div>

          <h1 class="title is-2 has-text-primary mb-2">
            {{ event.title }}
          </h1>

          <div class="is-flex is-flex-wrap-wrap mb-4" style="gap: 1.5rem;">
            <div class="is-flex is-align-items-center">
              <span class="icon has-text-grey mr-2"><i class="fas fa-calendar"></i></span>
              <p class="is-size-7 has-text-grey">
                {{ formatDate(event.startDate) }} - {{ formatDate(event.endDate) }}
              </p>
            </div>
            <div class="is-flex is-align-items-center">
              <span class="icon has-text-grey mr-2"><i class="fas fa-users"></i></span>
              <p class="is-size-7 has-text-grey">
                {{ event.teamSize }} members per team
              </p>
            </div>
          </div>

          <!-- Rendered Description -->
          <div class="content is-small" v-html="renderedDescription"></div>

        </div>

        <!-- Right Column: Action Buttons -->
        <div class="column is-narrow">
          <div class="buttons is-flex is-flex-direction-column" style="min-width: 180px;">
            <button
              v-if="canJoin"
              class="button is-primary is-fullwidth"
              :class="{ 'is-loading': isJoining }"
              :disabled="isJoining"
              @click="$emit('join')"
            >
              <span class="icon"><i class="fas fa-plus"></i></span>
              <span>Join Event</span>
            </button>

            <button
              v-if="canLeave"
              class="button is-danger is-outlined is-fullwidth"
              :class="{ 'is-loading': isLeaving }"
              :disabled="isLeaving"
              @click="$emit('leave')"
            >
              <span class="icon"><i class="fas fa-times"></i></span>
              <span>Leave Event</span>
            </button>

            <button
              v-if="canEdit"
              class="button is-outlined is-fullwidth"
              @click="$router.push(`/event/${event.id}/edit`)"
            >
               <span class="icon"><i class="fas fa-edit"></i></span>
              <span>Edit Event</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { marked } from 'marked'; 
import DOMPurify from 'dompurify';
import { DateTime } from 'luxon';
// Removed Chakra UI imports

const props = defineProps({
  event: { type: Object, required: true },
  canJoin: { type: Boolean, default: false },
  canLeave: { type: Boolean, default: false },
  canEdit: { type: Boolean, default: false },
  isJoining: { type: Boolean, default: false },
  isLeaving: { type: Boolean, default: false },
});

defineEmits(['join', 'leave']);

const router = useRouter();

const formatDate = (dateInput) => {
  if (!dateInput) return 'TBA';
  const dt = dateInput.toDate ? DateTime.fromJSDate(dateInput.toDate()) : DateTime.fromISO(dateInput);
  return dt.toLocaleString(DateTime.DATE_MED);
};

// Render description safely
const renderedDescription = computed(() => {
  if (!props.event.description) return '';
  // Configure marked to add breaks
  marked.setOptions({
    breaks: true, // Convert single line breaks to <br>
    gfm: true, // Use GitHub Flavored Markdown
  });
  const rawHtml = marked.parse(props.event.description);
  return DOMPurify.sanitize(rawHtml);
});

// Map status to Bulma tag classes
const statusTagClass = computed(() => {
  switch (props.event.status) {
    case 'Pending': return 'is-warning';
    case 'Approved': return 'is-info'; // Using info for approved
    case 'InProgress': return 'is-primary'; // Using primary for in progress
    case 'Completed': return 'is-success';
    case 'Cancelled': return 'is-danger';
    default: return 'is-light'; // Default greyish tag
  }
});
</script>

<style scoped>
.p-4 { padding: 1rem; }
.sm\:p-6 { padding: 1.5rem; }
.lg\:p-8 { padding: 2rem; }
.mb-2 { margin-bottom: 0.5rem; }
.mb-4 { margin-bottom: 1rem; }
.mr-2 { margin-right: 0.5rem; }

/* Ensure content class styles apply */
:deep(.content p) {
  margin-bottom: 0.5em;
}
:deep(.content ul) {
  margin-left: 1.5em;
  margin-top: 0.5em;
}

/* Ensure buttons in column stack nicely */
.buttons.is-flex-direction-column > .button:not(:last-child) {
    margin-bottom: 0.75rem; 
    margin-right: 0; /* Override Bulma default */
}
</style>
