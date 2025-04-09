<template>  
    <div class="bg-surface shadow-md rounded-lg border border-border p-4 space-y-4">
        <!-- Status Management Section -->
        <div>
            <h3 class="text-lg font-medium text-text-primary mb-3">Event Management</h3>
            <div class="flex items-center gap-3">
                <span class="text-sm font-medium text-text-secondary">Current Status:</span>
                <span :class="statusClass" class="px-2 py-0.5 rounded-full text-sm font-medium">
                    {{ event.status }}
                </span>
            </div>

            <!-- Status Update Controls -->
            <div class="mt-4 flex flex-wrap gap-2">
                <button v-if="canStartEvent" 
                        @click="updateStatus('InProgress')"
                        :disabled="!isWithinEventDates"
                        class="inline-flex items-center justify-center rounded-md border border-transparent bg-primary px-4 py-2 text-sm font-medium text-primary-text shadow-sm hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                    <i class="fas fa-play mr-1.5"></i> Start Event
                </button>
                
                <button v-if="canComplete" 
                        @click="updateStatus('Completed')"
                        class="inline-flex items-center justify-center rounded-md border border-transparent bg-success px-4 py-2 text-sm font-medium text-success-text shadow-sm hover:bg-success-dark focus:outline-none focus:ring-2 focus:ring-success focus:ring-offset-2 transition-colors">
                    <i class="fas fa-check mr-1.5"></i> Mark Complete
                </button>

                <button v-if="canCancel" 
                        @click="confirmCancel"
                        class="inline-flex items-center justify-center rounded-md border border-transparent bg-error px-4 py-2 text-sm font-medium text-error-text shadow-sm hover:bg-error-dark focus:outline-none focus:ring-2 focus:ring-error focus:ring-offset-2 transition-colors">
                    <i class="fas fa-times mr-1.5"></i> Cancel Event
                </button>
            </div>
        </div>

        <!-- Rating Controls -->
        <div v-if="event.status === 'Completed' && !event.closed" class="border-t border-border pt-4">
            <div class="flex items-center justify-between mb-4">
                <h3 class="text-lg font-medium text-text-primary">Ratings</h3>
                <span class="text-sm" :class="event.ratingsOpen ? 'text-success' : 'text-warning'">
                    {{ event.ratingsOpen ? 'Open' : 'Closed' }}
                </span>
            </div>

            <div class="flex gap-2">
                <button 
                    v-if="event.ratingsOpen && canToggleRatings"
                    @click="toggleRatings"
                    :disabled="isLoadingRatings"
                    class="inline-flex items-center justify-center rounded-md border border-transparent bg-warning text-warning-text px-4 py-2 text-sm font-medium shadow-sm hover:bg-warning-dark focus:outline-none focus:ring-2 focus:ring-warning focus:ring-offset-2 transition-colors">
                    <i class="fas fa-lock mr-1.5"></i>
                    Close Ratings
                </button>

                <button 
                    v-else-if="!event.ratingsOpen && canToggleRatings"
                    @click="toggleRatings"
                    :disabled="isLoadingRatings"
                    class="inline-flex items-center justify-center rounded-md border border-transparent bg-success text-success-text px-4 py-2 text-sm font-medium shadow-sm hover:bg-success-dark focus:outline-none focus:ring-2 focus:ring-success focus:ring-offset-2 transition-colors">
                    <i class="fas fa-lock-open mr-1.5"></i>
                    Open Ratings
                </button>

                <button 
                    v-if="canCloseEvent"
                    @click="closeEvent"
                    class="inline-flex items-center justify-center rounded-md border border-transparent bg-error px-4 py-2 text-sm font-medium text-error-text shadow-sm hover:bg-error-dark focus:outline-none focus:ring-2 focus:ring-error focus:ring-offset-2 transition-colors">
                    <i class="fas fa-archive mr-1.5"></i>
                    Close Event
                </button>
            </div>
        </div>
    </div>
</template>

<script setup>
import { computed, ref } from 'vue';
import { useStore } from 'vuex';

const props = defineProps({
    event: {
        type: Object,
        required: true
    }
});

const store = useStore();
const isLoadingRatings = ref(false);

const statusClass = computed(() => {
    const baseClasses = 'inline-flex items-center';
    switch (props.event.status) {
        case 'Approved': return `${baseClasses} bg-info-light text-info-dark`;
        case 'InProgress': return `${baseClasses} bg-primary-light text-primary-dark`;
        case 'Completed': return `${baseClasses} bg-success-light text-success-dark`;
        case 'Cancelled': return `${baseClasses} bg-error-light text-error-dark`;
        default: return `${baseClasses} bg-neutral-light text-neutral-dark`;
    }
});

const isWithinEventDates = computed(() => {
    if (!props.event.startDate || !props.event.endDate) return false;
    const now = new Date();
    const start = props.event.startDate.toDate();
    const end = props.event.endDate.toDate();
    return now >= start && now <= end;
});

const canManageRatings = computed(() => {
    const isClosedByAdmin = props.event.ratingsClosed;
    return !isClosedByAdmin && props.event.ratingsOpenCount < 2;
});

const canToggleRatings = computed(() => 
    !props.event.closed && 
    canManageRatings.value &&
    props.event.status === 'Completed'
);

const canCloseEvent = computed(() => 
    props.event.status === 'Completed' && 
    props.event.ratingsOpenCount > 0 && 
    !props.event.ratingsOpen && 
    !props.event.closed
);

// Status transition permissions
const canStartEvent = computed(() => 
    props.event.status === 'Approved' && 
    !!props.event.startDate && 
    !!props.event.endDate
);

const canComplete = computed(() => 
    props.event.status === 'InProgress'
);

const canCancel = computed(() => 
    ['Approved', 'InProgress'].includes(props.event.status)
);

const isAdmin = computed(() => store.getters['user/getUserRole'] === 'Admin');

const updateStatus = async (newStatus) => {
    try {
        await store.dispatch('events/updateEventStatus', {
            eventId: props.event.id,
            newStatus
        });
    } catch (error) {
        store.dispatch('notification/showNotification', {
            message: error.message,
            type: 'error'
        });
    }
};

const toggleRatings = async () => {
    if (isLoadingRatings.value || !canManageRatings.value) return;
    
    // If admin is closing ratings, mark them as permanently closed
    const adminClosing = isAdmin.value && props.event.ratingsOpen;
    
    isLoadingRatings.value = true;
    try {
        await store.dispatch('events/toggleRatingsOpen', {
            eventId: props.event.id,
            isOpen: !props.event.ratingsOpen,
            permanentClose: adminClosing
        });
    } catch (error) {
        store.dispatch('notification/showNotification', {
            message: error.message,
            type: 'error'
        });
    } finally {
        isLoadingRatings.value = false;
    }
};

const confirmCancel = async () => {
    if (confirm('Are you sure you want to cancel this event? This action cannot be undone.')) {
        await updateStatus('Cancelled');
    }
};

const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate?.() || new Date(timestamp);
    return new Intl.DateTimeFormat('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short'
    }).format(date);
};
</script>

<style scoped>
</style>
