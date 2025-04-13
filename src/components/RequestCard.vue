<template>
  <div class="card mb-4" style="border-radius: 6px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
    <div class="card-content">
      <div class="columns is-variable is-4 is-align-items-start is-mobile is-multiline">
        <!-- Left side: Request Info -->
        <div class="column is-12-mobile is-flex-grow-1">
          <p class="title is-5 has-text-primary mb-2">{{ request.title }}</p>
          <div class="content is-small">
            <p class="is-flex is-align-items-center has-text-grey mb-1">
              <span class="icon mr-2"><i class="fas fa-calendar"></i></span>
              <span>Requested Date: {{ formatDate(request.requestDate) }}</span>
            </p>
            <p class="is-flex is-align-items-center has-text-grey">
              <span class="icon mr-2"><i class="fas fa-user"></i></span>
              <span>Requested By: {{ request.requesterName }}</span>
            </p>
          </div>
        </div>

        <!-- Right side: Buttons -->
        <div class="column is-narrow-tablet is-full-mobile">
          <div class="buttons is-flex-tablet is-flex-direction-column-tablet is-flex-direction-row-mobile is-justify-content-flex-start-mobile">
            <button
              class="button is-success is-small mb-2-tablet mr-0-tablet is-flex-grow-1-mobile"
              @click="approve"
              :class="{ 'is-loading': processing }"
              :disabled="processing"
            >
              <span class="icon is-small"><i class="fas fa-check"></i></span>
              <span>Approve</span>
            </button>
            <button
              class="button is-danger is-outlined is-small is-flex-grow-1-mobile"
              @click="reject"
              :class="{ 'is-loading': processing }"
              :disabled="processing"
            >
              <span class="icon is-small"><i class="fas fa-times"></i></span>
              <span>Reject</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { DateTime } from 'luxon';
// Removed Chakra UI imports

const props = defineProps({
  request: {
    type: Object,
    required: true
  },
  processing: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['approve', 'reject']);

const approve = () => {
  emit('approve', props.request.id);
};

const reject = () => {
  emit('reject', props.request.id);
};

const formatDate = (date) => {
  if (!date) return 'N/A';
  // Assuming date is a Firebase Timestamp or similar object
  const dt = date.toDate ? DateTime.fromJSDate(date.toDate()) : DateTime.fromISO(date);
  return dt.toLocaleString(DateTime.DATE_MED);
};
</script>

<style scoped>
.card {
  overflow: hidden; /* Prevent content overflow if needed */
}

/* Ensure buttons stack nicely on tablet and are side-by-side on mobile */
@media screen and (max-width: 768px) {
  .buttons.is-flex-direction-row-mobile {
    flex-direction: row !important;
    justify-content: space-between !important; /* Or is-justify-content-flex-start */
  }
  .buttons.is-flex-direction-row-mobile .button {
    margin-bottom: 0 !important; 
    margin-right: 0.5rem !important; /* Add space between buttons */
  }
   .buttons.is-flex-direction-row-mobile .button:last-child {
    margin-right: 0 !important; 
  }
}
</style>