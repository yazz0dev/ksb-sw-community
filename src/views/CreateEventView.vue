<template>
    <div class="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
        <div v-if="isAdmin" class="rounded-md bg-error-light p-4 text-sm text-error-dark border border-error-light shadow-sm mb-6">
            <i class="fas fa-exclamation-circle mr-2"></i> Administrators cannot create events directly. Please manage and approve event requests instead.
        </div>
        <div v-else-if="!isAuthenticated" class="rounded-md bg-error-light p-4 text-sm text-error-dark border border-error-light shadow-sm mb-6">
            <i class="fas fa-exclamation-circle mr-2"></i> Please log in to create or request events.
        </div>
        <div v-else-if="loading" class="text-center py-16">
            <i class="fas fa-spinner fa-spin text-3xl text-primary mb-2"></i>
            <p class="text-text-secondary">Loading...</p>
        </div>
        <div v-else-if="hasActiveRequest && !isAdmin" class="rounded-md bg-warning-light p-4 text-sm text-warning-dark border border-warning-light shadow-sm mb-6">
            <div class="flex">
                <div class="flex-shrink-0">
                    <i class="fas fa-exclamation-triangle text-warning"></i>
                </div>
                <div class="ml-3">
                    <h3 class="text-sm font-medium text-warning-dark">Pending Request Active</h3>
                    <div class="mt-2 text-sm text-warning-dark">
                        <p>You already have a pending event request. Please wait for it to be reviewed before submitting a new one.</p>
                    </div>
                </div>
            </div>
        </div>
        <div v-else>
            <div class="flex items-center justify-between mb-6 pb-4 border-b border-border">
                <div>
                    <h2 class="text-2xl font-bold text-text-primary">
                        {{ pageTitle }}
                    </h2>
                    <p class="mt-1 text-sm text-text-secondary">
                        {{ pageSubtitle }}
                    </p>
                </div>
                <button @click="$router.back()" class="inline-flex items-center px-3 py-1.5 border border-border shadow-sm text-sm font-medium rounded-md text-text-secondary bg-surface hover:bg-secondary-light focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors">
                    <i class="fas fa-arrow-left mr-1.5 h-4 w-4"></i> Back
                </button>
            </div>
            <div v-if="errorMessage" class="mb-6 rounded-md bg-error-light p-4 text-sm text-error-dark border border-error-light shadow-sm">
                <i class="fas fa-exclamation-circle mr-2"></i> {{ errorMessage }}
            </div>
            <EventForm
                :event-id="eventId"
                :initial-data="initialEventData"
                @submit="handleSubmit"
                @error="handleFormError"
            />
        </div>
    </div>
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