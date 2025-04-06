<template>
    <div class="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
        <!-- Access Error -->
        <div v-if="!isAuthenticated" class="rounded-md bg-error-light p-4 text-sm text-error-dark border border-error-light shadow-sm">
            <i class="fas fa-exclamation-circle mr-2"></i> Please log in to create or request events.
        </div>
        <!-- Loading State -->
        <div v-else-if="loading" class="text-center py-16">
            <i class="fas fa-spinner fa-spin text-3xl text-primary mb-2"></i>
            <p class="text-gray-600">Loading...</p>
        </div>
        <!-- Active Request Check -->
        <div v-else-if="hasActiveRequest && !isAdmin" class="rounded-md bg-warning-light p-4 text-sm text-warning-dark border border-warning-light shadow-sm">
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
        <!-- Main Content -->
        <div v-else>
            <div class="sm:flex sm:items-center sm:justify-between mb-6">
                <div>
                    <h2 class="text-2xl font-bold text-gray-900">
                        {{ pageTitle }}
                    </h2>
                    <p class="mt-1 text-sm text-gray-500">
                        {{ pageSubtitle }}
                    </p>
                </div>
                <button @click="$router.back()" class="mt-4 sm:mt-0 text-sm text-primary hover:text-primary-dark transition-colors flex items-center">
                    <i class="fas fa-arrow-left mr-1"></i> Back
                </button>
            </div>
            
            <!-- Error Messages -->
            <div v-if="errorMessage" class="mb-6 rounded-md bg-error-light p-4 text-sm text-error-dark border border-error-light shadow-sm">
                <i class="fas fa-exclamation-circle mr-2"></i> {{ errorMessage }}
            </div>
            
            <!-- Form Component -->
            <EventForm
                :event-id="eventId"
                :initial-data="initialEventData"
                @submit="handleSubmit"
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

const pageTitle = computed(() => {
    if (isAdmin.value) {
        return isEditing.value ? 'Edit Event' : 'Create New Event';
    }
    return 'Request New Event';
});

const pageSubtitle = computed(() => {
    if (isAdmin.value) {
        return isEditing.value ? 'Modify an existing event' : 'Create a new event directly';
    }
    return 'Submit a request for a new event';
});

// Methods
const handleSubmit = async (eventData) => {
    try {
        if (isAdmin.value) {
            if (isEditing.value) {
                await store.dispatch('events/updateEvent', { eventId: eventId.value, eventData });
                router.push({ name: 'EventDetails', params: { id: eventId.value } });
            } else {
                const newEventId = await store.dispatch('events/createEvent', eventData);
                router.push({ name: 'EventDetails', params: { id: newEventId } });
            }
        } else {
            await store.dispatch('events/requestEvent', eventData);
            router.push({ name: 'Home' });
        }
    } catch (error) {
        errorMessage.value = error.message || 'Failed to process event';
    }
};

const loadEventData = async () => {
    if (!eventId.value) return;
    
    try {
        const eventData = await store.dispatch('events/fetchEventById', eventId.value);
        if (!eventData) {
            throw new Error('Event not found');
        }
        initialEventData.value = eventData;
    } catch (error) {
        errorMessage.value = error.message || 'Failed to load event data';
    }
};

// Lifecycle
onMounted(async () => {
    if (!isAuthenticated.value) {
        loading.value = false;
        return;
    }

    try {
        if (!isAdmin.value) {
            // Only check for active requests if user is not admin
            hasActiveRequest.value = await store.dispatch('events/checkExistingRequests');
        }
        
        if (isEditing.value) {
            await loadEventData();
        }
    } catch (error) {
        errorMessage.value = error.message || 'Failed to check user request status';
    } finally {
        loading.value = false;
    }
});
</script>