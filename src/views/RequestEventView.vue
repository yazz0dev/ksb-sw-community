<template>
  <section class="py-5 create-event-section">
    <div class="container-lg">

      <!-- Auth Warning -->
      <div v-if="!isAuthenticated" class="alert alert-danger d-flex align-items-center mb-5" role="alert">
         <i class="fas fa-exclamation-circle me-2"></i>
         <div>
           Please log in to request events.
         </div>
      </div>

      <!-- Loading State -->
      <div v-else-if="loading" class="text-center py-5">
        <div class="spinner-border text-primary" role="status" style="width: 3rem; height: 3rem;">
          <span class="visually-hidden">Loading...</span>
        </div>
        <p class="text-muted mt-2">Loading...</p>
      </div>

      <!-- Active Request Warning -->
      <div v-else-if="hasActiveRequest " class="alert alert-warning d-flex align-items-start mb-5" role="alert">
         <i class="fas fa-exclamation-triangle me-3 fs-5"></i>
          <div>
             <h6 class="alert-heading mb-1">Pending Request Active</h6>
             <small>You already have a pending event request. Please wait for it to be reviewed before submitting a new one.</small>
          </div>
      </div>

      <div v-else>
        <!-- Header -->
        <div class="d-flex justify-content-between align-items-center mb-5 pb-4" style="border-bottom: 1px solid var(--bs-border-color);">
          <div>
            <h3 class="text-primary mb-0">Request New Event</h3>
            <p class="small text-muted mt-1">Submit a request for a new event</p>
          </div>
          <div>
            <button
              class="btn btn-outline-secondary btn-sm"
              @click="$router.back()"
            >
              <i class="fas fa-arrow-left me-1"></i>
              <span>Back</span>
            </button>
          </div>
        </div>

        <!-- Error Message -->
        <div v-if="errorMessage" class="alert alert-danger alert-dismissible fade show d-flex align-items-center mb-5" role="alert">
          <i class="fas fa-exclamation-circle me-2"></i>
          <div>{{ errorMessage }}</div>
          <button type="button" class="btn-close" @click="errorMessage = ''" aria-label="Close"></button>
        </div>

        <!-- Event Form -->
        <EventForm
          :event-id="eventId"
          :initial-data="initialEventData"
          @submit="handleSubmit"
          @error="handleFormError"
        />
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useStore } from 'vuex';
import { useRouter, useRoute } from 'vue-router';
import EventForm from '../components/events/EventForm.vue';
import type { EventFormData } from '@/types/event';
import { EventStatus } from '@/types/event';

const store = useStore();
const router = useRouter();
const route = useRoute();

// Props
const eventId = computed(() => route.params.eventId as string | undefined);

// State
const loading = ref(true);
const errorMessage = ref('');
const hasActiveRequest = ref(false);
const initialEventData = ref<EventFormData | null>(null);

// Computed
const isAuthenticated = computed(() => store.getters['user/isAuthenticated']);
const isEditing = computed(() => !!eventId.value);

const pageTitle = computed(() => 'Request New Event');
const pageSubtitle = computed(() => 'Submit a request for a new event');

// Add this computed property to access the global name cache from the store
const nameCache = computed(() => {
  // store.state.user.nameCache is a Map<string, { name: string, timestamp: number }>
  const cache = store.state.user.nameCache;
  if (cache instanceof Map) {
    // Convert to a simple uid->name object for easy lookup
    const obj: Record<string, string> = {};
    cache.forEach((entry, uid) => {
      obj[uid] = entry.name;
    });
    return obj;
  }
  return {};
});

// Helper to get name from cache (object)
function getNameFromCache(uid: string): string {
  if (!uid) return 'Unknown';
  return nameCache.value[uid] || 'Unknown';
}

// Methods
const handleFormError = (message: string) => {
  errorMessage.value = message;
};

const handleSubmit = async (eventData: EventFormData) => {
  // Remove top-level eventName if present, ensure only in details
  if ('eventName' in eventData) {
    delete (eventData as any).eventName;
  }
  if (eventData.details && eventData.details.eventName) {
    // OK, keep as is
  }
  errorMessage.value = '';
  try {
    if (isEditing.value && eventId.value) {
      // Update event details (do not change status)
      await store.dispatch('events/updateEventDetails', {
        eventId: eventId.value,
        updates: eventData
      });
      store.dispatch('notification/showNotification', { message: 'Event updated successfully!', type: 'success' });
      router.push({ name: 'EventDetails', params: { id: eventId.value } });
    } else {
      // Only allow event requests (creation)
      if (typeof eventData.details.allowProjectSubmission !== 'boolean') {
        eventData.details.allowProjectSubmission = true;
      }
      await store.dispatch('events/requestEvent', eventData);
      store.dispatch('notification/showNotification', { message: 'Event request submitted successfully!', type: 'success' });
      router.push({ name: 'Home' });
    }
  } catch (error: any) {
    console.error("Error handling event submission:", error);
    errorMessage.value = error.message || 'Failed to process event';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
};

const loadEventData = async () => {
  if (!eventId.value) return;
  loading.value = true;
  errorMessage.value = '';
  try {
    // Fetch event details for editing
    await store.dispatch('events/fetchEventDetails', eventId.value);
    const storeEvent = store.state.events.currentEventDetails;
    if (!storeEvent) throw new Error('Event not found or inaccessible.');
    initialEventData.value = mapEventToFormData(storeEvent);
    loading.value = false;
  } catch (error: any) {
    errorMessage.value = error.message || 'Failed to load event for editing.';
    loading.value = false;
  }
};

// Helper to map Firestore event data to form data
const mapEventToFormData = (eventData: any): EventFormData => {
  // Create a default form structure matching EventFormData
  const defaultForm: EventFormData = {
    eventFormat: 'Individual',
    details: {
      eventName: '', // Always present in details
      format: 'Individual',
      type: '',
      description: '',
      date: {
        start: null,
        end: null,
      },
      organizers: [],
      xpAllocation: [],
    },
    status: EventStatus.Pending,
    teams: [],
    criteria: [],
  };

  // Merge fetched data into the default structure
  const formData: EventFormData = { ...defaultForm, ...eventData };

  // Remove top-level eventName if present
  if ('eventName' in eventData) {
    delete eventData.eventName;
  }

  // Always ensure eventName is only in details
  if (eventData.details && eventData.details.eventName) {
    // OK
  }

  // Always ensure criteria 
  if (!('criteria' in formData) || !Array.isArray(formData.criteria)) {
    formData.criteria = [];
  }

  // Ensure details is always defined and has required fields
  formData.details = {
    ...formData.details,
    format: formData.details?.format || formData.eventFormat || 'Individual',
    type: formData.details?.type || formData.eventType || '',
    description: formData.details?.description || '',
    date: formData.details?.date || { start: null, end: null },
    organizers: Array.isArray(formData.details?.organizers) ? formData.details.organizers : [],
    xpAllocation: Array.isArray(formData.details?.xpAllocation) ? formData.details.xpAllocation : [],
  };

  // Convert nested date fields
  if (formData.details?.date) {
    (['start', 'end'] as Array<'start' | 'end'>).forEach((key) => {
      const timestamp = formData.details.date[key];
      if (timestamp && typeof (timestamp as any).toDate === 'function') {
        try {
          formData.details.date[key] = (timestamp as any).toDate().toISOString().split('T')[0];
        } catch (e) {
          console.warn(`Could not convert timestamp for field details.date.${key}:`, e);
          formData.details.date[key] = null;
        }
      } else if (typeof timestamp === 'string') {
        try {
          const parsedDate = new Date(timestamp);
          if (!isNaN(parsedDate.getTime())) {
            formData.details.date[key] = parsedDate.toISOString().split('T')[0];
          } else {
            formData.details.date[key] = null;
          }
        } catch (e) {
          formData.details.date[key] = null;
        }
      } else {
        formData.details.date[key] = null;
      }
    });
  }

  // Ensure details is always defined
  formData.details = formData.details || { date: { start: null, end: null }, organizers: [], xpAllocation: [] };

  // Ensure arrays are present
  formData.details.organizers = Array.isArray(formData.details.organizers) ? formData.details.organizers : [];
  formData.teams = Array.isArray(formData.teams) ? formData.teams : [];
  formData.details.xpAllocation = Array.isArray(formData.details.xpAllocation) ? formData.details.xpAllocation : [];

  return formData;
};

// Lifecycle
onMounted(async () => {
  loading.value = true;
  errorMessage.value = '';
  if (!isAuthenticated.value) {
    loading.value = false;
    return;
  }

  try {
    if (isEditing.value && eventId.value) {
      await loadEventData();
      hasActiveRequest.value = false; // Editing, so skip active request check
    } else {
      hasActiveRequest.value = await store.dispatch('events/checkExistingRequests');
      if (hasActiveRequest.value) {
        loading.value = false;
        return;
      }
      initialEventData.value = null;
      loading.value = false;
    }
  } catch (error: any) {
    console.error("Error during component mount:", error);
    errorMessage.value = error.message || 'Failed to initialize event form';
    loading.value = false;
  }
});

</script>

<style scoped>
.create-event-section {
  background-color: var(--color-background);
}

/* Removed custom loader styles */
</style>