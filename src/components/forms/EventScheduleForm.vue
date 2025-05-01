<template>
  <div>
    <div class="row g-3">
      <div class="col-md-6">
        <label class="form-label">Start Date <span class="text-danger">*</span></label>
        <DatePicker
          v-model="localDates.start"
          :disabled="isSubmitting"
          :min-date="minDate"
          @change="onDateChange"
        />
      </div>
      <div class="col-md-6">
        <label class="form-label">End Date <span class="text-danger">*</span></label>
        <DatePicker
          v-model="localDates.end"
          :disabled="isSubmitting"
          :min-date="localDates.start || minDate"
          @change="onDateChange"
        />
      </div>
    </div>
    <div v-if="!isDateAvailable" class="alert alert-danger mt-3">
      The selected dates conflict with another event. <span v-if="nextAvailableDate">Next available: {{ formatDate(nextAvailableDate) }}</span>
    </div>
    <div v-else-if="nextAvailableDate && (localDates.start !== formatDate(nextAvailableDate))" class="alert alert-info mt-3">
      Next available date: {{ formatDate(nextAvailableDate) }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, toRefs } from 'vue';
import { useStore } from 'vuex';
import '@vuepic/vue-datepicker/dist/main.css';
import DatePicker from '@vuepic/vue-datepicker';

interface Dates {
  start: string | null;
  end: string | null;
}

interface Props {
  dates: Dates;
  isSubmitting: boolean;
  eventId?: string;
}

const emit = defineEmits(['update:dates', 'error', 'availability-change']);
const props = defineProps<Props>();
const { dates, isSubmitting, eventId } = toRefs(props);

const store = useStore();
const minDate = new Date().toISOString().split('T')[0];
const localDates = ref({ ...dates.value });
const isDateAvailable = ref(true);
const nextAvailableDate = ref<string | null>(null);

watch(dates, (newVal) => {
  localDates.value = { ...newVal };
});

async function checkDateConflict() {
  try {
    const available = await store.dispatch('events/checkDateConflict', {
      start: localDates.value.start,
      end: localDates.value.end,
      excludeEventId: eventId?.value
    });
    isDateAvailable.value = available;
    emit('availability-change', available);
    if (!available) {
      emit('error', 'Date conflict detected.');
      await checkNextAvailableDate();
    }
  } catch (e) {
    emit('error', 'Error checking date availability.');
  }
}

async function checkNextAvailableDate() {
  // Simulate logic or call store for next available date
  // You may want to implement this more robustly
  const next = await store.dispatch('events/getNextAvailableDate', {
    start: localDates.value.start,
    end: localDates.value.end
  });
  nextAvailableDate.value = next;
}

function formatDate(date: string | Date | null): string {
  if (!date) return '';
  if (typeof date === 'string') return date;
  return date.toISOString().split('T')[0];
}

function onDateChange() {
  emit('update:dates', { ...localDates.value });
  checkDateConflict();
}

// Initial check
watch(localDates, () => {
  checkDateConflict();
});
</script>

<style scoped>
</style>
