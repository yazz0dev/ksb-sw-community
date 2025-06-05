// src/components/forms/EventScheduleForm.vue
<template>
  <div>
    <div class="row g-3">
      <div class="col-md-6">
        <label for="eventStartDate" class="form-label">Start Date <span class="text-danger">*</span></label>
        <input
          type="date"
          id="eventStartDate"
          class="form-control form-control-sm"
          v-model="localDates.start"
          :disabled="isSubmitting"
          :min="minDateForStartDatePicker"
          @change="onDateChange"
          required
        />
        <small class="form-text text-muted" v-if="!props.eventId">
          Events can start today or any future date.
        </small>
      </div>
      <div class="col-md-6">
        <label for="eventEndDate" class="form-label">End Date <span class="text-danger">*</span></label>
        <input
          type="date"
          id="eventEndDate"
          class="form-control form-control-sm"
          v-model="localDates.end"
          :disabled="isSubmitting"
          :min="minDateForEndDatePicker"
          @change="onDateChange"
          required
        />
      </div>
    </div>
    <div v-if="dateConflictError" class="alert alert-danger mt-3 small py-2">
      {{ dateConflictError }} <span v-if="nextAvailableDateISO">Next available: {{ formatDateISO(nextAvailableDateISO) }}</span>
    </div>
    <div v-else-if="nextAvailableDateISO && !dateConflictError" class="alert alert-info mt-3 small py-2">
      Next available date: {{ formatDateISO(nextAvailableDateISO) }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue';
import { useEventStore } from '@/stores/eventStore';
import { DateTime } from 'luxon';

interface FormDateRange {
  start: string | null; // Dates will be ISO strings (YYYY-MM-DD)
  end: string | null;   // Dates will be ISO strings (YYYY-MM-DD)
}
const props = defineProps<{
  dates: FormDateRange;
  isSubmitting: boolean;
  eventId?: string;
}>();

const emit = defineEmits<{
  (e: 'update:dates', value: FormDateRange): void;
  (e: 'error', message: string): void;
  (e: 'availability-change', isAvailable: boolean): void;
}>();

// localDates will store ISO strings directly
const localDates = ref<FormDateRange>({
    start: props.dates.start,
    end: props.dates.end
});

const dateConflictError = ref<string | null>(null);
const nextAvailableDateISO = ref<string | null>(null);

const minDateForStartDatePicker = computed<string>(() => {
  const today = DateTime.now().setZone('Asia/Kolkata').startOf('day');
  if (props.eventId && props.dates.start) {
    const originalStartDate = DateTime.fromISO(props.dates.start).startOf('day');
    if (originalStartDate.isValid && originalStartDate < today) {
      // originalStartDate is valid, so toISODate() will return string
      return originalStartDate.toISODate() as string; 
    }
  }
  // Allow events starting today instead of requiring 2 days
  return today.toISODate() as string;
});

const minDateForEndDatePicker = computed<string>(() => {
  if (localDates.value.start) {
    const startDate = DateTime.fromISO(localDates.value.start).startOf('day');
    if (startDate.isValid) {
      // startDate is valid, so toISODate() will return string
      return startDate.toISODate() as string;
    }
  }
  return minDateForStartDatePicker.value; // This is already typed as string
});

const formatDateISO = (isoDateString: string | null): string => {
  if (!isoDateString) return 'N/A';
  return DateTime.fromISO(isoDateString).toFormat('dd MMM, yyyy'); // More readable format for display
};

const checkAvailability = async () => {
  dateConflictError.value = null;
  nextAvailableDateISO.value = null;

  if (!localDates.value.start || !localDates.value.end) {
    emit('availability-change', true);
    return;
  }
  
  const eventStore = useEventStore() as any;
  
  try {
    // Convert ISO strings to DateTime objects for validation
    const startDateTime = DateTime.fromISO(localDates.value.start);
    const endDateTime = DateTime.fromISO(localDates.value.end);
    
    if (!startDateTime.isValid || !endDateTime.isValid) {
      throw new Error('Invalid date format selected.');
    }

    const result = await eventStore.checkDateConflict({
      startDate: localDates.value.start, // Pass ISO strings directly
      endDate: localDates.value.end,     // Pass ISO strings directly
      excludeEventId: props.eventId
    });

    if (result.hasConflict) {
      dateConflictError.value = `Selected dates conflict with: ${result.conflictingEventName || 'an existing event'}.`;
      nextAvailableDateISO.value = result.nextAvailableDate;
      emit('availability-change', false);
    } else {
      dateConflictError.value = null;
      nextAvailableDateISO.value = null;
      emit('availability-change', true);
    }
  } catch (error: any) {
    dateConflictError.value = error.message || 'Failed to check date availability due to a system error.';
    nextAvailableDateISO.value = null;
    emit('availability-change', false);
  }
};

const onDateChange = async () => {
  const datesToEmit: FormDateRange = {
      start: localDates.value.start, // Already ISO string
      end: localDates.value.end     // Already ISO string
  };
  
  if (datesToEmit.start && datesToEmit.end) {
    const startDateTime = DateTime.fromISO(datesToEmit.start);
    const endDateTime = DateTime.fromISO(datesToEmit.end);
    
    if (!startDateTime.isValid || !endDateTime.isValid) {
      emit('error', 'Invalid date format selected.');
      emit('availability-change', false);
      return;
    }
    
    // Allow same-day events: end date can be equal to start date
    if (endDateTime < startDateTime) {
      emit('error', `End date cannot be before start date.`);
      emit('availability-change', false);
      // Set end date to start date if end is before start
      localDates.value.end = localDates.value.start;
      // Re-emit the corrected dates
      emit('update:dates', { start: localDates.value.start, end: localDates.value.start });
      await checkAvailability(); // Re-check with corrected date
      return;
    }
  }
  
  emit('update:dates', datesToEmit);
  await checkAvailability();
};

watch(() => props.dates, (newDates) => {
    if (newDates.start !== localDates.value.start) {
        localDates.value.start = newDates.start;
    }
    if (newDates.end !== localDates.value.end) {
        localDates.value.end = newDates.end;
    }
    // No need to parse, as they are already ISO strings
    if (localDates.value.start && localDates.value.end) {
        checkAvailability();
    }
}, { deep: true, immediate: true });

onMounted(() => {
  if (localDates.value.start && localDates.value.end) {
    emit('update:dates', { ...localDates.value });
    checkAvailability();
  } else {
    // If dates are not fully set, ensure parent knows it's "available" until they are
    emit('availability-change', true); 
  }
});

</script>

<style>
/* Remove vue-datepicker specific styles */
/* Standard Bootstrap form-control styles will apply */
.form-control[type="date"] {
  /* Add any specific overrides for date inputs if needed */
  padding: 0.375rem 0.75rem; /* Bootstrap's default sm padding */
  font-size: 0.875rem;
}
</style>