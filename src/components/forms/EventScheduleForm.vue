// src/components/forms/EventScheduleForm.vue
<template>
  <div class="event-schedule-form">
    <div class="row g-3 g-md-4">
      <div class="col-md-6">
        <label for="eventStartDate" class="form-label fw-medium">
          <i class="fas fa-calendar-plus text-primary me-1"></i>
          Start Date 
          <span class="text-danger">*</span>
        </label>
        <input
          type="date"
          id="eventStartDate"
          class="form-control"
          :class="{ 'is-invalid': !localDates.start && touched.start }"
          v-model="localDates.start"
          :disabled="isSubmitting"
          :min="minDateForStartDatePicker"
          @change="onDateChange"
          @blur="touched.start = true"
        />
        <div v-if="!props.eventId" class="form-text">
          <i class="fas fa-info-circle text-info me-1"></i>
          Events can start today or any future date.
        </div>
      </div>
      <div class="col-md-6">
        <label for="eventEndDate" class="form-label fw-medium">
          <i class="fas fa-calendar-check text-primary me-1"></i>
          End Date 
          <span class="text-danger">*</span>
        </label>
        <input
          type="date"
          id="eventEndDate"
          class="form-control"
          :class="{ 'is-invalid': !localDates.end && touched.end }"
          v-model="localDates.end"
          :disabled="isSubmitting"
          :min="minDateForEndDatePicker"
          @change="onDateChange"
          @blur="touched.end = true"
        />
      </div>
    </div>
    
    <!-- Date Conflict Alert -->
    <div v-if="dateConflictError" class="alert alert-danger d-flex align-items-start mt-3" role="alert">
      <i class="fas fa-exclamation-triangle text-danger me-2 mt-1 flex-shrink-0"></i>
      <div class="flex-grow-1">
        <div class="fw-medium">Date Conflict</div>
        <div class="small">{{ dateConflictError }}</div>
        <div v-if="nextAvailableDateISO" class="small mt-1">
          <strong>Next available:</strong> {{ formatDateISO(nextAvailableDateISO) }}
        </div>
      </div>
    </div>
    
    <!-- Next Available Date Info -->
    <div v-else-if="nextAvailableDateISO && !dateConflictError" class="alert alert-info d-flex align-items-start mt-3" role="alert">
      <i class="fas fa-calendar-alt text-info me-2 mt-1 flex-shrink-0"></i>
      <div class="flex-grow-1">
        <div class="fw-medium">Availability Info</div>
        <div class="small">Next available date: {{ formatDateISO(nextAvailableDateISO) }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue';
import { checkDateConflictForRequest } from '@/services/eventService/eventValidation';
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
  (e: 'validity-change', isValid: boolean): void;
}>();

// localDates will store ISO strings directly
const localDates = ref<FormDateRange>({
    start: props.dates.start,
    end: props.dates.end
});

const touched = ref({
    start: false,
    end: false
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
  
  try {
    // Convert ISO strings to DateTime objects for validation
    const startDateTime = DateTime.fromISO(localDates.value.start);
    const endDateTime = DateTime.fromISO(localDates.value.end);
    
    if (!startDateTime.isValid || !endDateTime.isValid) {
      throw new Error('Invalid date format selected.');
    }

    const result = await checkDateConflictForRequest(
      localDates.value.start,
      localDates.value.end,
      props.eventId
    );

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
      start: localDates.value.start,
      end: localDates.value.end
  };
  
  if (datesToEmit.start && datesToEmit.end) {
    const startDateTime = DateTime.fromISO(datesToEmit.start);
    const endDateTime = DateTime.fromISO(datesToEmit.end);
    
    if (!startDateTime.isValid || !endDateTime.isValid) {
      emit('error', 'Invalid date format selected.');
      emit('availability-change', false);
      emit('validity-change', false);
      return;
    }
    
    // Allow same-day events: end date can be equal to start date
    if (endDateTime < startDateTime) {
      emit('error', `End date cannot be before start date.`);
      emit('availability-change', false);
      emit('validity-change', false);
      // Auto-correct end date to match start date
      localDates.value.end = localDates.value.start;
      emit('update:dates', { start: localDates.value.start, end: localDates.value.start });
      await checkAvailability();
      return;
    }
  }
  
  emit('update:dates', datesToEmit);
  await checkAvailability();
};

// Add validation computed property
const isScheduleValid = computed(() => {
  const hasStartDate = !!(localDates.value.start?.trim());
  const hasEndDate = !!(localDates.value.end?.trim());
  const hasNoDuplicates = localDates.value.start !== localDates.value.end || 
    (localDates.value.start === localDates.value.end && localDates.value.start !== null);
  return hasStartDate && hasEndDate && !dateConflictError.value && hasNoDuplicates;
});

// Watch schedule validity and emit changes
watch(isScheduleValid, (newValid) => {
  emit('validity-change', newValid);
}, { immediate: true });

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

<style scoped>
.event-schedule-form {
  background: var(--bs-card-bg);
}

.form-control[type="date"] {
  font-size: 0.95rem;
  padding: 0.75rem;
  border: 1px solid var(--bs-input-border-color);
  border-radius: var(--bs-border-radius);
  transition: border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
}

.form-control[type="date"]:focus {
  border-color: var(--bs-primary);
  box-shadow: 0 0 0 0.25rem rgba(var(--bs-primary-rgb), 0.25);
}

.form-control[type="date"]:disabled {
  background-color: var(--bs-secondary-bg);
  opacity: 0.65;
}

.form-label {
  font-weight: 500;
  color: var(--bs-body-color);
  margin-bottom: 0.5rem;
}

.form-text {
  font-size: 0.875rem;
  color: var(--bs-secondary);
  margin-top: 0.25rem;
}

.is-invalid {
  border-color: var(--bs-danger);
}

.invalid-feedback {
    display: none;
}
.is-invalid ~ .invalid-feedback {
    display: block;
    color: var(--bs-danger);
    margin-top: 0.25rem;
    font-size: 0.875em;
}

.alert {
  font-size: 0.9rem;
  padding: 0.75rem 1.25rem;
}

.alert .fw-medium {
  font-weight: 500;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .form-control[type="date"] {
    font-size: 0.875rem;
    padding: 0.625rem;
  }
  
  .form-text {
    font-size: 0.8rem;
  }
  
  .alert {
    font-size: 0.85rem;
  }
}
</style>