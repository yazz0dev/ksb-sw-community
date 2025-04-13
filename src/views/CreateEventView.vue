<template>
  <CBox maxW="4xl" mx="auto" p={{ base: '4', sm: '6', lg: '8' }}>
    <!-- Admin Warning -->
    <CAlert v-if="isAdmin" status="error" variant="subtle" mb="6">
      <CAlertIcon name="exclamation-circle" />
      <CAlertDescription>
        Administrators cannot create events directly. Please manage and approve event requests instead.
      </CAlertDescription>
    </CAlert>

    <!-- Auth Warning -->
    <CAlert v-else-if="!isAuthenticated" status="error" variant="subtle" mb="6">
      <CAlertIcon name="exclamation-circle" />
      <CAlertDescription>
        Please log in to create or request events.
      </CAlertDescription>
    </CAlert>

    <!-- Loading State -->
    <CFlex v-else-if="loading" direction="column" align="center" justify="center" py="16">
      <CSpinner size="xl" color="primary" mb="2" />
      <CText color="text-secondary">Loading...</CText>
    </CFlex>

    <!-- Active Request Warning -->
    <CAlert v-else-if="hasActiveRequest && !isAdmin" status="warning" variant="subtle" mb="6">
      <CAlertIcon name="exclamation-triangle" />
      <CBox ml="3">
        <CHeading size="sm" mb="2">Pending Request Active</CHeading>
        <CText>You already have a pending event request. Please wait for it to be reviewed before submitting a new one.</CText>
      </CBox>
    </CAlert>

    <CBox v-else>
      <!-- Header -->
      <CFlex align="center" justify="space-between" mb="6" pb="4" borderBottomWidth="1px" borderColor="border">
        <CBox>
          <CHeading size="xl" color="text-primary">{{ pageTitle }}</CHeading>
          <CText mt="1" fontSize="sm" color="text-secondary">{{ pageSubtitle }}</CText>
        </CBox>
        <CButton
          leftIcon={<CIcon name="fa-arrow-left" />}
          variant="outline"
          size="sm"
          onClick={() => $router.back()}
        >
          Back
        </CButton>
      </CFlex>

      <!-- Error Message -->
      <CAlert v-if="errorMessage" status="error" variant="subtle" mb="6">
        <CAlertIcon name="exclamation-circle" />
        <CAlertDescription>{{ errorMessage }}</CAlertDescription>
      </CAlert>

      <!-- Event Form -->
      <EventForm
        :event-id="eventId"
        :initial-data="initialEventData"
        @submit="handleSubmit"
        @error="handleFormError"
      />
    </CBox>
  </CBox>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import {
  Box as CBox,
  Flex as CFlex,
  Heading as CHeading,
  Text as CText,
  Button as CButton,
  Alert as CAlert,
  AlertIcon as CAlertIcon,
  AlertDescription as CAlertDescription,
  Icon as CIcon,
  Spinner as CSpinner
} from '@chakra-ui/vue-next';
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
const initialEventData = ref({});

// Computed
const isAuthenticated = computed(() => store.getters['user/isAuthenticated']);
const isAdmin = computed(() => store.getters['user/getUserRole'] === 'Admin');
const isEditing = computed(() => !!eventId.value);

const pageTitle = computed(() => 'Request New Event');
const pageSubtitle = computed(() => 'Submit a request for a new event');

// Methods
const handleFormError = (message: string) => {
  errorMessage.value = message;
};

const handleSubmit = async (eventData) => {
  if (isAdmin.value) {
    errorMessage.value = 'Administrators cannot create events directly.';
    return;
  }
  errorMessage.value = ''; // Clear previous errors
  try {
    if (isAdmin.value) {
      if (isEditing.value) {
        // Use updateEventDetails for editing
        await store.dispatch('events/updateEventDetails', { eventId: eventId.value, updates: eventData });
        store.dispatch('notification/showNotification', { message: 'Event updated successfully!', type: 'success' });
        router.push({ name: 'EventDetails', params: { id: eventId.value } });
      } else {
        const newEventId = await store.dispatch('events/createEvent', eventData);
        store.dispatch('notification/showNotification', { message: 'Event created successfully!', type: 'success' });
        router.push({ name: 'EventDetails', params: { id: newEventId } });
      }
    } else {
      await store.dispatch('events/requestEvent', eventData);
      store.dispatch('notification/showNotification', { message: 'Event request submitted successfully!', type: 'success' });
      router.push({ name: 'Home' }); // Redirect to home after request
    }
  } catch (error: any) {
    console.error("Error handling event submission:", error);
    errorMessage.value = error.message || 'Failed to process event';
    // Scroll to top to show error
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
};

const loadEventData = async () => {
  if (!eventId.value) return;
  loading.value = true; // Ensure loading state is set
  try {
    // Use fetchEventDetails which populates the store's currentEventDetails
    const eventData = await store.dispatch('events/fetchEventDetails', eventId.value);
    if (!eventData) {
      throw new Error('Event not found or you do not have permission to edit it.');
    }
    // Map store data (which might have Timestamps) to form data (which expects strings/primitives)
    initialEventData.value = mapEventToFormData(eventData);
  } catch (error: any) {
    errorMessage.value = error.message || 'Failed to load event data';
    initialEventData.value = {}; // Clear initial data on error
  } finally {
    loading.value = false;
  }
};

// Helper to map Firestore event data (with Timestamps) to form data (with strings)
const mapEventToFormData = (eventData) => {
  const formData = { ...eventData }; // Shallow copy

  // Convert Timestamps to YYYY-MM-DD strings
  const dateFieldsToConvert = ['startDate', 'endDate', 'desiredStartDate', 'desiredEndDate'];
  dateFieldsToConvert.forEach(field => {
    if (formData[field] && typeof formData[field].toDate === 'function') {
      try {
        formData[field] = formData[field].toDate().toISOString().split('T')[0];
      } catch (e) {
        console.warn(`Could not convert timestamp for field ${field}:`, e);
        formData[field] = ''; // Set to empty string if conversion fails
      }
    } else if (typeof formData[field] === 'string') {
      // If it's already a string, ensure it's in YYYY-MM-DD format if possible
      try {
        formData[field] = new Date(formData[field]).toISOString().split('T')[0];
      } catch (e) {
        // Keep original string if parsing fails
      }
    } else {
      formData[field] = ''; // Ensure field exists but is empty if no valid date
    }
  });

  // Ensure arrays exist
  formData.xpAllocation = Array.isArray(formData.xpAllocation) ? formData.xpAllocation : [];
  formData.organizers = Array.isArray(formData.organizers) ? formData.organizers : [];
  formData.teams = Array.isArray(formData.teams) ? formData.teams : [];

  return formData;
};

// Lifecycle
onMounted(async () => {
  loading.value = true; // Start in loading state
  errorMessage.value = ''; // Clear errors on mount
  if (!isAuthenticated.value) {
    loading.value = false;
    return;
  }

  try {
    if (!isAdmin.value) {
      hasActiveRequest.value = await store.dispatch('events/checkExistingRequests');
      if (hasActiveRequest.value) {
        loading.value = false; // Stop loading if user has active request
        return;
      }
    }

    if (isEditing.value) {
      await loadEventData();
    } else {
      // Reset initial data for creation form
      initialEventData.value = {};
    }
  } catch (error: any) {
    console.error("Error during component mount:", error);
    errorMessage.value = error.message || 'Failed to initialize event form';
  } finally {
    // Only stop loading if not editing or if editing load finished
    if (!isEditing.value || (isEditing.value && !loading.value)) {
      loading.value = false;
    }
  }
});
</script>