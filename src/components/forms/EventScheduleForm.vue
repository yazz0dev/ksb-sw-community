// src/components/forms/EventScheduleForm.vue
<template>
  <div>
    <div class="row g-3">
      <div class="col-md-6">
        <label class="form-label">Start Date <span class="text-danger">*</span></label>
        <DatePicker
          v-model="localDates.start"
          :disabled="isSubmitting"
          :min-date="minDateForStartDatePicker"
          :view-date="initialViewDate" 
          @update:model-value="onDateChange"
          :enable-time-picker="false"
          format="yyyy-MM-dd"
          auto-apply
          :clearable="false"
          placeholder="Select start date"
        />
        <small class="form-text text-muted" v-if="!props.eventId">
          Must be at least 2 days from today
        </small>
      </div>
      <div class="col-md-6">
        <label class="form-label">End Date <span class="text-danger">*</span></label>
        <DatePicker
          v-model="localDates.end"
          :disabled="isSubmitting"
          :min-date="minDateForEndDatePicker"
          :view-date="localDates.start || initialViewDate"
          @update:model-value="onDateChange"
          :enable-time-picker="false"
          format="yyyy-MM-dd"
          auto-apply
          :clearable="false"
          placeholder="Select end date"
        />
      </div>
    </div>
    <div v-if="dateConflictError" class="alert alert-danger mt-3">
      {{ dateConflictError }} <span v-if="nextAvailableDateISO">Next available: {{ formatDateISO(nextAvailableDateISO) }}</span>
    </div>
    <div v-else-if="nextAvailableDateISO && !dateConflictError" class="alert alert-info mt-3">
      Next available date: {{ formatDateISO(nextAvailableDateISO) }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue';
import DatePicker from '@vuepic/vue-datepicker';
import '@vuepic/vue-datepicker/dist/main.css';
import { useEventStore } from '@/stores/eventStore';
import { DateTime } from 'luxon';

interface FormDateRange {
  start: string | null;
  end: string | null;
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

const parseDateStringForPicker = (dateString: string | null): Date | null => {
    if (!dateString) return null;
    const dt = DateTime.fromISO(dateString);
    return dt.isValid ? dt.toJSDate() : null;
};

const localDates = ref<{ start: Date | null; end: Date | null }>({
    start: parseDateStringForPicker(props.dates.start),
    end: parseDateStringForPicker(props.dates.end)
});

const dateConflictError = ref<string | null>(null);
const nextAvailableDateISO = ref<string | null>(null);

// Make minDate a computed property
const minDateForStartDatePicker = computed(() => {
  // For new events, minimum is today + 2 days
  // For editing, allow the original date if it's in the past
  const today = DateTime.now().setZone('Asia/Kolkata').startOf('day');
  
  if (props.eventId && props.dates.start) {
    // Editing mode: if original date is in the past, allow it
    const originalStartDate = DateTime.fromISO(props.dates.start).startOf('day');
    if (originalStartDate.isValid && originalStartDate < today) {
      return originalStartDate.toJSDate();
    }
  }
  
  // Default for new events: today + 2 days
  return today.plus({ days: 2 }).toJSDate();
});

const minDateForEndDatePicker = computed(() => {
  if (localDates.value.start) {
    // If start date is selected, end date must be on or after start date
    return DateTime.fromJSDate(localDates.value.start).startOf('day').toJSDate();
  }
  // If start date is not selected, end date's min is same as start date's min
  return minDateForStartDatePicker.value;
});

const formatDateISO = (isoDateString: string | null): string => {
  if (!isoDateString) return 'N/A';
  return DateTime.fromISO(isoDateString).toFormat('yyyy-MM-dd');
};

const checkAvailability = async () => {
  dateConflictError.value = null;
  nextAvailableDateISO.value = null;

  if (!localDates.value.start || !localDates.value.end) {
    emit('availability-change', true); // Assuming availability if dates are not set
    return;
  }
  
  // Add explicit type to eventStore
  const eventStore = useEventStore() as any;
  
  try {
    const result = await eventStore.checkDateConflict({
      startDate: localDates.value.start,
      endDate: localDates.value.end,
      excludeEventId: props.eventId
    });

    if (result.hasConflict) {
      dateConflictError.value = `Selected dates conflict with: ${result.conflictingEventName || 'an existing event'}.`;
      nextAvailableDateISO.value = result.nextAvailableDate;
      emit('availability-change', false);
    } else {
      dateConflictError.value = null; // Clear previous error
      nextAvailableDateISO.value = null; // Clear previous suggestion if now valid
      emit('availability-change', true);
    }
  } catch (error: any) {
    // This error is from the store action itself (e.g., Firestore unavailable)
    dateConflictError.value = error.message || 'Failed to check date availability due to a system error.';
    nextAvailableDateISO.value = null; // Clear any previous suggestion
    emit('availability-change', false);
  }
};

const initialViewDate = computed(() => {
  // If editing and we have a valid start date, use that as the initial view
  if (props.eventId && props.dates.start) {
    const editDate = DateTime.fromISO(props.dates.start);
    if (editDate.isValid) {
      return editDate.toJSDate();
    }
  }
  
  // For new events, use the minimum allowed date (today + 2 days)
  // This ensures the calendar opens to a month with valid dates
  return minDateForStartDatePicker.value;
});

const onDateChange = async () => {
  const datesToEmit: FormDateRange = {
      start: localDates.value.start ? DateTime.fromJSDate(localDates.value.start).toISODate() : null,
      end: localDates.value.end ? DateTime.fromJSDate(localDates.value.end).toISODate() : null
  };
  
  // Add validation before emitting
  if (datesToEmit.start && datesToEmit.end) {
    const startDateTime = DateTime.fromISO(datesToEmit.start);
    const endDateTime = DateTime.fromISO(datesToEmit.end);
    
    if (!startDateTime.isValid || !endDateTime.isValid) {
      emit('error', 'Invalid date format selected.');
      emit('availability-change', false);
      return;
    }
    
    if (endDateTime < startDateTime) { // Allow same day
      emit('error', `End date cannot be before start date. Current: ${startDateTime.toISODate()} to ${endDateTime.toISODate()}`);
      emit('availability-change', false);
      return;
    }
  }
  
  emit('update:dates', datesToEmit);
  await checkAvailability();
};

// Watch for external changes to dates prop
watch(() => props.dates, (newDates) => {
    // Update localDates with new values, but only if they're different
    const newStart = parseDateStringForPicker(newDates.start);
    const newEnd = parseDateStringForPicker(newDates.end);
    
    if (newStart !== localDates.value.start) {
        localDates.value.start = newStart;
    }
    
    if (newEnd !== localDates.value.end) {
        localDates.value.end = newEnd;
    }
    
    // If dates changed externally, check availability
    if (localDates.value.start && localDates.value.end) {
        checkAvailability();
    }
}, { deep: true, immediate: true });

onMounted(() => {
  // Force immediate validation on mount
  if (localDates.value.start && localDates.value.end) {
    // If both dates are available on mount, emit them to ensure parent has the proper values
    const datesToEmit: FormDateRange = {
        start: DateTime.fromJSDate(localDates.value.start).toISODate(),
        end: DateTime.fromJSDate(localDates.value.end).toISODate()
    };
    emit('update:dates', datesToEmit);
    checkAvailability();
  } else {
    emit('availability-change', true);
  }
});

</script>

<style>
.dp__input {
  display: block;
  width: 100%;
  padding: 0.25rem 2.25rem 0.25rem 0.5rem;
  font-size: 0.875rem;
  font-weight: 400;
  line-height: 1.5;
  color: var(--bs-body-color);
  background-color: var(--bs-input-bg);
  background-clip: padding-box;
  border: 1px solid var(--bs-input-border-color);
  appearance: none;
  border-radius: var(--bs-border-radius-sm);
  transition: border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
}
.dp__input::placeholder { color: var(--bs-secondary-color); opacity: 1; }
.dp__input:focus {
  color: var(--bs-body-color);
  background-color: var(--bs-input-bg);
  border-color: var(--bs-input-focus-border-color);
  outline: 0;
  box-shadow: var(--bs-input-focus-box-shadow);
}
.dp__input_icon { right: 0.5rem; left: auto; }
.dp__clear_icon { right: 0.5rem;  left: auto; }
</style>