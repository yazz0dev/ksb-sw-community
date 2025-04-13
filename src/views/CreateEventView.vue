<template>
  <section class="section create-event-section">
    <div class="container is-max-desktop">
      <!-- Admin Warning -->
      <div v-if="isAdmin" class="notification is-danger is-light mb-6">
        <span class="icon mr-2"><i class="fas fa-exclamation-circle"></i></span>
        Administrators cannot create events directly. Please manage and approve event requests instead.
      </div>

      <!-- Auth Warning -->
      <div v-else-if="!isAuthenticated" class="notification is-danger is-light mb-6">
        <span class="icon mr-2"><i class="fas fa-exclamation-circle"></i></span>
        Please log in to create or request events.
      </div>

      <!-- Loading State -->
      <div v-else-if="loading" class="has-text-centered py-6">
        <div class="loader is-loading is-large mx-auto mb-2" style="border-color: var(--color-primary); border-left-color: transparent;"></div>
        <p class="has-text-grey">Loading...</p>
      </div>

      <!-- Active Request Warning -->
      <div v-else-if="hasActiveRequest && !isAdmin" class="notification is-warning is-light mb-6">
        <div class="media">
          <div class="media-left">
            <span class="icon is-medium"><i class="fas fa-exclamation-triangle"></i></span>
          </div>
          <div class="media-content">
             <p class="title is-6 mb-1">Pending Request Active</p>
             <p class="is-size-7">You already have a pending event request. Please wait for it to be reviewed before submitting a new one.</p>
          </div>
        </div>
      </div>

      <div v-else>
        <!-- Header -->
        <div class="level is-mobile mb-6 pb-4" style="border-bottom: 1px solid var(--color-border);">
          <div class="level-left">
            <div class="level-item">
              <div>
                <h1 class="title is-3 has-text-primary mb-0">{{ pageTitle }}</h1>
                <p class="is-size-7 has-text-grey mt-1">{{ pageSubtitle }}</p>
              </div>
            </div>
          </div>
          <div class="level-right">
            <div class="level-item">
              <button
                class="button is-outlined is-small"
                @click="$router.back()"
              >
                <span class="icon"><i class="fas fa-arrow-left"></i></span>
                <span>Back</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Error Message -->
        <div v-if="errorMessage" class="notification is-danger is-light mb-6">
          <button class="delete" @click="errorMessage = ''"></button>
          <span class="icon mr-1"><i class="fas fa-exclamation-circle"></i></span>
          {{ errorMessage }}
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
import EventForm from '../components/EventForm.vue';

const store = useStore();
const router = useRouter();
const route = useRoute();

// Props
const eventId = computed(() => route.params.eventId as string | undefined);

// State
const loading = ref(true);
const errorMessage = ref('');
const hasActiveRequest = ref(false);
const initialEventData = ref<Record<string, any>>({});

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

const handleSubmit = async (eventData: any) => {
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
    initialEventData.value = {}; 
  } finally {
    loading.value = false;
  }
};

// Helper to map Firestore event data to form data
const mapEventToFormData = (eventData: any): Record<string, any> => {
  const formData = { ...eventData };
  const dateFieldsToConvert = ['startDate', 'endDate', 'desiredStartDate', 'desiredEndDate'];
  dateFieldsToConvert.forEach(field => {
    const timestamp = formData[field];
    if (timestamp && typeof timestamp.toDate === 'function') {
      try {
        formData[field] = timestamp.toDate().toISOString().split('T')[0];
      } catch (e) {
        console.warn(`Could not convert timestamp for field ${field}:`, e);
        formData[field] = '';
      }
    } else if (typeof timestamp === 'string') {
      try {
        // Attempt to parse and format existing string dates
        const parsedDate = new Date(timestamp);
        if (!isNaN(parsedDate.getTime())) {
             formData[field] = parsedDate.toISOString().split('T')[0];
        } else { formData[field] = ''; } // Clear if invalid string date
      } catch (e) {
          formData[field] = '';
      }
    } else {
      formData[field] = ''; // Default to empty if not a valid type
    }
  });
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
      initialEventData.value = {};
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

/* Reuse loader style */
.loader {
  border-radius: 50%;
  border-width: 2px;
  border-style: solid;
  width: 3em;
  height: 3em;
  animation: spinAround 1s infinite linear;
}
@keyframes spinAround {
  from { transform: rotate(0deg); }
  to { transform: rotate(359deg); }
}
</style>