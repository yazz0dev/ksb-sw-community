// src/components/forms/EventScheduleForm.vue
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
    <div v-if="dateConflictError" class="alert alert-danger mt-3">
      {{ dateConflictError }} <span v-if="nextAvailableDateISO">Next available: {{ formatDateISO(nextAvailableDateISO) }}</span>
    </div>
    <div v-else-if="nextAvailableDateISO && !dateConflictError" class="alert alert-info mt-3">
      Next available date: {{ formatDateISO(nextAvailableDateISO) }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import DatePicker from '@vuepic/vue-datepicker';
import '@vuepic/vue-datepicker/dist/main.css';
import { useStudentEventStore } from '@/stores/studentEventStore'; // Corrected import
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
    return dateString ? DateTime.fromISO(dateString).toJSDate() : null;
};

const localDates = ref<{ start: Date | null; end: Date | null }>({
    start: parseDateStringForPicker(props.dates.start),
    end: parseDateStringForPicker(props.dates.end)
});

const dateConflictError = ref<string | null>(null);
const nextAvailableDateISO = ref<string | null>(null);
const minDate = ref(new Date());

const formatDateISO = (isoDateString: string | null): string => {
  if (!isoDateString) return 'N/A';
  return DateTime.fromISO(isoDateString).toFormat('yyyy-MM-dd');
};

const checkAvailability = async () => {
  dateConflictError.value = null;
  nextAvailableDateISO.value = null;

  if (!localDates.value.start || !localDates.value.end) {
    emit('availability-change', true);
    return;
  }
  try {
    const eventStore = useStudentEventStore(); // Corrected usage
    const result = await eventStore.checkDateConflict({
      startDate: localDates.value.start,
      endDate: localDates.value.end,
      excludeEventId: props.eventId
    });

    emit('availability-change', !result.hasConflict);

    if (result.hasConflict) {
        dateConflictError.value = `Selected dates conflict with ${result.conflictingEvent?.details.eventName || 'an existing event'}.`;
        nextAvailableDateISO.value = result.nextAvailableDate;
    } else if (result.nextAvailableDate) {
        nextAvailableDateISO.value = result.nextAvailableDate;
    }

  } catch (error: any) {
    console.error("Error checking date availability (component):", error);
    dateConflictError.value = error.message || 'Failed to check date availability.';
    emit('availability-change', false);
  }
};

const onDateChange = async () => {
  if (localDates.value.start && localDates.value.end && localDates.value.end < localDates.value.start) {
    localDates.value.end = localDates.value.start;
  }

  const datesToEmit: FormDateRange = {
      start: localDates.value.start ? DateTime.fromJSDate(localDates.value.start).toISODate() : null,
      end: localDates.value.end ? DateTime.fromJSDate(localDates.value.end).toISODate() : null
  };
  emit('update:dates', datesToEmit);
  await checkAvailability();
};

watch(() => props.dates, (newDates) => {
    localDates.value.start = parseDateStringForPicker(newDates.start);
    localDates.value.end = parseDateStringForPicker(newDates.end);
}, { deep: true });

onMounted(() => {
  if (localDates.value.start && localDates.value.end) {
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