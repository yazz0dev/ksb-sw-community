<template>
  <div class="card shadow-sm mb-4 border-0" style="border-radius: var(--bs-border-radius);">
    <div class="card-body">
      <div class="row g-3 align-items-start">
        <!-- Left side: Request Info -->
        <div class="col-md">
          <h5 class="h5 text-primary mb-2">{{ request.title }}</h5>
          <div class="small">
            <p class="d-flex align-items-center text-secondary mb-1">
              <i class="fas fa-calendar fa-fw me-2"></i>
              <span>Requested Date: {{ formatDate(request.requestDate) }}</span>
            </p>
            <p class="d-flex align-items-center text-secondary mb-0">
              <i class="fas fa-user fa-fw me-2"></i>
              <span>Requested By: {{ request.requesterName }}</span>
            </p>
          </div>
        </div>

        <!-- Right side: Buttons -->
        <div class="col-md-auto">
          <div class="d-flex flex-column flex-sm-row flex-md-column gap-2 mt-2 mt-md-0">
            <button
              type="button"
              class="btn btn-success btn-sm d-inline-flex align-items-center justify-content-center"
              @click="approve"
              :disabled="processing"
            >
               <span v-if="processing" class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
               <i v-else class="fas fa-check me-1"></i>
              <span>Approve</span>
            </button>
            <button
              type="button"
              class="btn btn-outline-danger btn-sm d-inline-flex align-items-center justify-content-center"
              @click="reject"
              :disabled="processing"
            >
              <span v-if="processing" class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
              <i v-else class="fas fa-times me-1"></i>
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
.btn {
    min-width: 90px; /* Ensure buttons have a minimum width */
}
</style>