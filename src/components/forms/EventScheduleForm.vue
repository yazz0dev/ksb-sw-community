<template>
  <div>
    <div class="row g-3">
      <div class="col-md-6">
        <label class="form-label">Start Date <span class="text-danger">*</span></label>
        <DatePicker
          v-model="localDates.start"
          :disabled="isSubmitting"
          :min-date="minDate"
          @update:model-value="onDateChange"  
          :enable-time-picker="false"
          format="yyyy-MM-dd"
          auto-apply
          :clearable="false"
        />
      </div>
      <div class="col-md-6">
        <label class="form-label">End Date <span class="text-danger">*</span></label>
        <DatePicker
          v-model="localDates.end"
          :disabled="isSubmitting"
          :min-date="localDates.start || minDate"
          @update:model-value="onDateChange" 
          :enable-time-picker="false"
          format="yyyy-MM-dd"
          auto-apply
          :clearable="false"
        />
      </div>
    </div>
    <div v-if="!isDateAvailable" class="alert alert-danger mt-3">
      The selected dates conflict with another event. <span v-if="nextAvailableDate">Next available: {{ formatDate(nextAvailableDate) }}</span>
    </div>
    <div v-else-if="nextAvailableDate && (formatDate(localDates.start) !== formatDate(nextAvailableDate))" class="alert alert-info mt-3">
      Next available date: {{ formatDate(nextAvailableDate) }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'; // Remove 'computed'
import DatePicker from '@vuepic/vue-datepicker';
import '@vuepic/vue-datepicker/dist/main.css';
import { useEventStore } from '@/store/events';
import { DateTime } from 'luxon'; // Import DateTime

// --- Props & Emits ---
interface DateRange {
  start: string | null;
  end: string | null;
}
const props = defineProps<{
  dates: DateRange;
  isSubmitting: boolean;
  eventId?: string; // Optional: used to exclude current event during availability check
}>();

const emit = defineEmits<{
  (e: 'update:dates', value: DateRange): void;
  (e: 'error', message: string): void;
  (e: 'availability-change', isAvailable: boolean): void;
}>();

// --- State ---
// Convert incoming ISO strings to Date objects for the DatePicker
const parseDateString = (dateString: string | null): Date | null => {
    return dateString ? DateTime.fromISO(dateString).toJSDate() : null;
};

const localDates = ref<{ start: Date | null; end: Date | null }>({
    start: parseDateString(props.dates.start),
    end: parseDateString(props.dates.end)
});
const isDateAvailable = ref(true);
// Store next available date as DateTime or null
const nextAvailableDate = ref<DateTime | null>(null); // Changed type
const minDate = ref(new Date()); // Minimum date is today

// --- Methods ---
// formatDate now accepts DateTime | null
const formatDate = (date: DateTime | Date | null): string => {
  if (!date) return 'N/A';
  if (date instanceof Date) {
      return DateTime.fromJSDate(date).toFormat('yyyy-MM-dd');
  }
  // Assume DateTime if not Date
  return date.isValid ? date.toFormat('yyyy-MM-dd') : 'Invalid Date';
};

const checkAvailability = async () => {
  if (!localDates.value.start || !localDates.value.end) {
    isDateAvailable.value = true; // Cannot check if dates are incomplete
    nextAvailableDate.value = null; // Reset next available date
    emit('availability-change', isDateAvailable.value);
    return;
  }
  try {
    const eventStore = useEventStore();
    // Uncomment the call to the Pinia action
    const result = await eventStore.checkEventDateAvailability(
      localDates.value.start, // Pass Date objects directly
      localDates.value.end,
      props.eventId // Pass eventId if editing
    );

    isDateAvailable.value = result.isAvailable;
    // Store the DateTime object returned by the action
    nextAvailableDate.value = result.nextAvailableDate;
    emit('availability-change', isDateAvailable.value);

    if (!isDateAvailable.value && nextAvailableDate.value) {
        // Use the formatted date in the error message
        emit('error', `Selected dates conflict. Next available: ${formatDate(nextAvailableDate.value)}`);
    } else if (!isDateAvailable.value) {
         emit('error', `Selected dates conflict with an existing event.`);
    }

  } catch (error: any) { // Catch errors propagated from the store action
    console.error("Error checking date availability (component):", error);
    // Use the error message from the store if available
    emit('error', error.message || 'Failed to check date availability.');
    isDateAvailable.value = false; // Assume unavailable on error
    nextAvailableDate.value = null; // Reset on error
    emit('availability-change', isDateAvailable.value);
  }
};

const onDateChange = async () => {
  // Ensure end date is not before start date
  if (localDates.value.start && localDates.value.end && localDates.value.end < localDates.value.start) {
    localDates.value.end = localDates.value.start; // Set end date to start date if invalid
  }

  // Convert Date objects back to ISO strings before emitting
  const datesToEmit: DateRange = {
      start: localDates.value.start ? DateTime.fromJSDate(localDates.value.start).toISODate() : null,
      end: localDates.value.end ? DateTime.fromJSDate(localDates.value.end).toISODate() : null
  };
  console.log('[EventScheduleForm] Emitting update:dates', datesToEmit); // Log emitted value
  emit('update:dates', datesToEmit);

  // Re-check availability after dates change
  await checkAvailability();
};

// --- Watchers ---
watch(() => props.dates, (newDates) => {
    // Update localDates if the prop changes externally
    localDates.value.start = parseDateString(newDates.start);
    localDates.value.end = parseDateString(newDates.end);
}, { deep: true });

// --- Lifecycle Hooks ---
onMounted(() => {
  // Initial check on mount if dates are pre-filled (e.g., during edit)
  if (localDates.value.start && localDates.value.end) {
    checkAvailability();
  } else {
      // Ensure availability is true initially if no dates are set
      isDateAvailable.value = true;
      emit('availability-change', isDateAvailable.value);
  }
});

</script>

<style>
/* Optional: Style the date picker */
.dp__input {
  display: block;
  width: 100%;
  /* Adjusted padding: top, right, bottom, left. Increased right padding for icon. */
  padding: 0.25rem 2.25rem 0.25rem 0.5rem; 
  font-size: 0.875rem; /* Match form-control-sm */
  font-weight: 400; /* Bootstrap default $input-font-weight */
  line-height: 1.5; /* Bootstrap default $input-line-height */
  color: var(--bs-body-color); /* Uses body color for input text */
  background-color: var(--bs-input-bg);
  background-clip: padding-box;
  border: 1px solid var(--bs-input-border-color);
  appearance: none; /* Modern reset */
  border-radius: var(--bs-border-radius-sm); /* Use Bootstrap's small border radius */
  transition: border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
}

.dp__input::placeholder {
  color: var(--bs-secondary-color); /* Placeholder text color */
  opacity: 1; /* Override Firefox's lower opacity */
}

.dp__input:focus {
  color: var(--bs-body-color);
  background-color: var(--bs-input-bg);
  border-color: var(--bs-input-focus-border-color); /* Bootstrap's focus border color */
  outline: 0;
  box-shadow: var(--bs-input-focus-box-shadow); /* Bootstrap's focus shadow */
}


.dp__input_icon {
  right: 0.5rem; 
  left: auto;
}

.dp__clear_icon {
  right: 0.5rem;  
  left: auto;
}

</style>
