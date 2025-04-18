<template>
  <section class="py-5 create-event-section">
    <div class="container-lg">
      <!-- Admin Warning -->
      <div v-if="isAdmin" class="alert alert-danger d-flex align-items-center mb-5" role="alert">
        <i class="fas fa-exclamation-circle me-2"></i>
        <div>
          Administrators cannot create events directly. Please manage and approve event requests instead.
        </div>
      </div>

      <!-- Auth Warning -->
      <div v-else-if="!isAuthenticated" class="alert alert-danger d-flex align-items-center mb-5" role="alert">
         <i class="fas fa-exclamation-circle me-2"></i>
         <div>
           Please log in to create or request events.
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
      <div v-else-if="hasActiveRequest && !isAdmin" class="alert alert-warning d-flex align-items-start mb-5" role="alert">
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
            <h3 class="text-primary mb-0">{{ pageTitle }}</h3>
            <p class="small text-muted mt-1">{{ pageSubtitle }}</p>
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
import type { FormData as EventFormData } from '../components/events/EventForm.vue';

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
const isAdmin = computed(() => store.getters['user/getUserRole'] === 'Admin');
const isEditing = computed(() => !!eventId.value);

const pageTitle = computed(() => (isEditing.value && isAdmin.value) ? 'Edit Event' : 'Request New Event');
const pageSubtitle = computed(() => (isEditing.value && isAdmin.value) ? 'Modify the details of the event' : 'Submit a request for a new event');

// Methods
const handleFormError = (message: string) => {
  errorMessage.value = message;
};

const handleSubmit = async (eventData: EventFormData) => {
  if (isAdmin.value && !isEditing.value) {
    errorMessage.value = 'Administrators cannot create events directly. Approve requests instead.';
    return;
  }
  errorMessage.value = ''; 
  try {
    if (isAdmin.value) {
      if (isEditing.value) {
        await store.dispatch('events/updateEventDetails', { eventId: eventId.value, updates: eventData });
        store.dispatch('notification/showNotification', { message: 'Event updated successfully!', type: 'success' });
        router.push({ name: 'EventDetails', params: { id: eventId.value } });
      } else {
          // This case should be prevented by the check above, but added for robustness
          errorMessage.value = 'Admin create action is not permitted here.'; 
          return;
      }
    } else {
        if (isEditing.value) {
            errorMessage.value = 'Users cannot edit events directly.'; // Users shouldn't reach here
            return;
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
  if (!eventId.value || !isAdmin.value) { // Only admins can load for editing
      loading.value = false;
      if (eventId.value) errorMessage.value = "Unauthorized to edit event.";
      return; 
  }
  loading.value = true;
  try {
    const eventData = await store.dispatch('events/fetchEventDetails', eventId.value);
    if (!eventData) {
      throw new Error('Event not found.');
    }
    initialEventData.value = mapEventToFormData(eventData);
  } catch (error: any) {
    errorMessage.value = error.message || 'Failed to load event data';
    initialEventData.value = null;
  } finally {
    loading.value = false;
  }
};

// Helper to map Firestore event data to form data
const mapEventToFormData = (eventData: any): EventFormData => {
  // Create a default form structure matching EventFormData
  const defaultForm: EventFormData = {
    eventName: '',
    eventType: '',
    description: '',
    eventFormat: 'Individual',
    startDate: null,
    endDate: null,
    StartDate: null,
    EndDate: null,
    teams: [],
    xpAllocation: [],
    organizers: [],
    status: 'Pending' // Default status or based on context
  };

  // Merge fetched data into the default structure
  const formData: EventFormData = { ...defaultForm, ...eventData };

  // Convert dates
  const dateFieldsToConvert: (keyof EventFormData)[] = ['startDate', 'endDate', 'StartDate', 'EndDate'];
  dateFieldsToConvert.forEach(field => {
    const timestamp = formData[field] as any; // Cast to any for conversion
    if (timestamp && typeof timestamp.toDate === 'function') {
      try {
        (formData[field] as any) = timestamp.toDate().toISOString().split('T')[0];
      } catch (e) {
        console.warn(`Could not convert timestamp for field ${field}:`, e);
        (formData[field] as any) = null;
      }
    } else if (typeof timestamp === 'string') {
      try {
        const parsedDate = new Date(timestamp);
        if (!isNaN(parsedDate.getTime())) {
            (formData[field] as any) = parsedDate.toISOString().split('T')[0];
        } else { 
            (formData[field] as any) = null; 
        } 
      } catch (e) {
          (formData[field] as any) = null;
      }
    } else {
      (formData[field] as any) = null; // Default to null if not a valid type
    }
  });

  // Ensure arrays are present
  formData.xpAllocation = Array.isArray(formData.xpAllocation) ? formData.xpAllocation : [];
  formData.organizers = Array.isArray(formData.organizers) ? formData.organizers : [];
  formData.teams = Array.isArray(formData.teams) ? formData.teams : [];

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
    if (!isAdmin.value) {
      // Check for active request only for non-admins
      hasActiveRequest.value = await store.dispatch('events/checkExistingRequests');
      if (hasActiveRequest.value) {
        loading.value = false; // Stop loading, show warning
        return;
      }
    }
    // Admins can edit, others can only create (request)
    if (isEditing.value && isAdmin.value) {
      await loadEventData();
    } else if (!isEditing.value) {
      // Reset initial data for creation/request form
      initialEventData.value = null;
      loading.value = false; // Stop loading for create/request form
    } else {
        // If isEditing is true but user is not admin, set error and stop loading
        errorMessage.value = "You do not have permission to edit this event.";
        loading.value = false;
    }
  } catch (error: any) {
    console.error("Error during component mount:", error);
    errorMessage.value = error.message || 'Failed to initialize event form';
    loading.value = false; // Stop loading on error
  }
});

</script>

<style scoped>
.create-event-section {
  background-color: var(--color-background);
}

/* Removed custom loader styles */
</style>