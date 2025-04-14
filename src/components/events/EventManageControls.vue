<template>
  <div class="event-manage-controls p-4 border bg-light rounded shadow-sm">
    <!-- Status Management Section -->
    <div class="mb-5">
      <h3 class="h4 text-primary mb-3">Event Management</h3>
      <div class="d-flex align-items-center mb-4">
        <span class="small fw-medium text-secondary me-3">Current Status:</span>
        <span class="badge rounded-pill fs-6" :class="statusBadgeClass">{{ event.status }}</span>
      </div>

      <!-- Status Update Controls -->
      <div class="d-flex flex-wrap gap-2">
        <button
          v-if="canStartEvent"
          type="button"
          class="btn btn-sm btn-primary d-inline-flex align-items-center"
          :disabled="!isWithinEventDates || isActionLoading('InProgress')"
          @click="updateStatus('InProgress')"
        >
          <span v-if="isActionLoading('InProgress')" class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
          <i v-else class="fas fa-play me-1"></i>
          <span>Start Event</span>
        </button>

        <button
          v-if="canComplete"
          type="button"
          class="btn btn-sm btn-success d-inline-flex align-items-center"
          :disabled="isActionLoading('Completed')"
          @click="updateStatus('Completed')"
        >
          <span v-if="isActionLoading('Completed')" class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
          <i v-else class="fas fa-check me-1"></i>
          <span>Mark Complete</span>
        </button>

        <button
          v-if="canCancel"
          type="button"
          class="btn btn-sm btn-danger d-inline-flex align-items-center"
          :disabled="isActionLoading('Cancelled')"
          @click="confirmCancel"
        >
          <span v-if="isActionLoading('Cancelled')" class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
          <i v-else class="fas fa-times me-1"></i>
          <span>Cancel Event</span>
        </button>
      </div>
      <p v-if="!isWithinEventDates && canStartEvent" class="small text-danger mt-2">
        The event can only be started between its start and end dates.
      </p>
    </div>

    <!-- Rating Controls -->
    <div v-if="event.status === 'Completed' && !event.closed" class="pt-5 border-top">
      <div class="d-flex justify-content-between align-items-center mb-4">
        <h3 class="h4 text-primary mb-0">Ratings</h3>
        <span class="badge rounded-pill fs-6" :class="event.ratingsOpen ? 'bg-success-subtle text-success-emphasis' : 'bg-warning-subtle text-warning-emphasis'">
          {{ event.ratingsOpen ? 'Open' : 'Closed' }}
        </span>
      </div>

      <div class="d-flex flex-wrap gap-2">
        <button
          v-if="event.ratingsOpen && canToggleRatings"
          type="button"
          class="btn btn-sm btn-warning d-inline-flex align-items-center"
          :disabled="isLoadingRatings"
          @click="toggleRatings"
        >
          <span v-if="isLoadingRatings" class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
          <i v-else class="fas fa-lock me-1"></i>
          <span>Close Ratings</span>
        </button>

        <button
          v-else-if="!event.ratingsOpen && canToggleRatings"
          type="button"
          class="btn btn-sm btn-success d-inline-flex align-items-center"
          :disabled="isLoadingRatings"
          @click="toggleRatings"
        >
          <span v-if="isLoadingRatings" class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
          <i v-else class="fas fa-lock-open me-1"></i>
          <span>Open Ratings</span>
        </button>

        <button
          v-if="canCloseEvent"
          type="button"
          class="btn btn-sm btn-outline-danger d-inline-flex align-items-center"
          :disabled="isClosingEvent || isLoadingRatings"
          @click="confirmCloseEvent"
        >
          <span v-if="isClosingEvent" class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
          <i v-else class="fas fa-archive me-1"></i>
          <span>{{ isClosingEvent ? 'Closing & Awarding XP...' : 'Close Event Permanently' }}</span>
        </button>
      </div>
      <p v-if="!canManageRatings && event.status === 'Completed' && !event.closed" class="small text-secondary mt-2">
        <span v-if="event.ratingsClosed">Ratings have been manually closed by an admin.</span>
        <span v-else>Ratings have been opened and closed twice and cannot be toggled again.</span>
      </p>
       <p v-if="!canCloseEvent && event.status === 'Completed' && event.ratingsOpen" class="small text-secondary mt-2">
         Event must have ratings closed before it can be permanently closed.
       </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, PropType } from 'vue';
import { useStore } from 'vuex';
import { canStartEvent as canEventBeStarted } from '@/utils/dateTime';
import { EventStatus, EventFormat, type Event } from '@/types/event';

const props = defineProps({
  event: {
    type: Object as PropType<Event>,
    required: true
  }
});

const store = useStore();
const isLoadingRatings = ref(false);
const loadingAction = ref(null);
const isClosingEvent = ref(false);

const statusBadgeClass = computed(() => {
  switch (props.event.status) {
    case EventStatus.Approved: return 'bg-info-subtle text-info-emphasis';
    case EventStatus.InProgress: return 'bg-primary-subtle text-primary-emphasis';
    case EventStatus.Completed: return 'bg-success-subtle text-success-emphasis';
    case EventStatus.Cancelled: return 'bg-secondary-subtle text-secondary-emphasis';
    case EventStatus.Pending: return 'bg-warning-subtle text-warning-emphasis';
    case EventStatus.Rejected: return 'bg-danger-subtle text-danger-emphasis';
    default: return 'bg-light text-dark';
  }
});

// Use renamed utility function
const isWithinEventDates = computed(() => {
  if (!props.event.startDate || !props.event.endDate) return false;
  return canEventBeStarted(props.event);
});

const canManageRatings = computed(() => {
    const isManuallyClosed = props.event.ratingsClosed === true;
    const openLimitReached = props.event.ratingsOpenCount >= 2;

    return !isManuallyClosed && !openLimitReached;
});

const canToggleRatings = computed(() => 
    !props.event.closed &&
    canManageRatings.value &&
    props.event.status === 'Completed'
);

const canCloseEvent = computed(() => 
    props.event.status === 'Completed' &&
    !props.event.ratingsOpen &&
    !props.event.closed
);

const canStartEvent = computed(() => 
    props.event.status === EventStatus.Approved && 
    !!props.event.startDate && 
    !!props.event.endDate
);

const canComplete = computed(() => 
    props.event.status === 'InProgress'
);

const canCancel = computed(() => 
    ['Approved', 'InProgress'].includes(props.event.status) && !props.event.closed
);

const isAdmin = computed(() => store.getters['user/isAdmin']);

const isActionLoading = (action) => {
    return loadingAction.value === action;
};

const updateStatus = async (newStatus) => {
    if (loadingAction.value) return;
    loadingAction.value = newStatus;
    try {
        await store.dispatch('events/updateEventStatus', {
            eventId: props.event.id,
            newStatus
        });
    } catch (error) {
        store.dispatch('notification/showNotification', {
            message: error.message || `Failed to update status to ${newStatus}.`,
            type: 'error'
        });
    } finally {
        loadingAction.value = null;
    }
};

const toggleRatings = async () => {
    if (isLoadingRatings.value || !canManageRatings.value) return;
    
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
            message: error.message || 'Failed to toggle ratings status.',
            type: 'error'
        });
    } finally {
        isLoadingRatings.value = false;
    }
};

const confirmCancel = async () => {
    if (window.confirm('Are you sure you want to cancel this event? This cannot be undone.')) {
        await updateStatus('Cancelled');
    }
};

const confirmCloseEvent = async () => {
    if (window.confirm('Are you sure you want to permanently close this event? Ratings cannot be reopened, and no further changes can be made.')) {
        await closeEventAction();
    }
};

const closeEventAction = async () => {
    if (isLoadingRatings.value || isClosingEvent.value) return;
    isClosingEvent.value = true;
    try {
        const result = await store.dispatch('events/closeEventPermanently', { 
            eventId: props.event.id 
        });
        
        // Show success notification with XP summary
        let message = 'Event closed permanently. ';
        if (result?.xpAwarded) {
            const totalUsers = Object.keys(result.xpAwarded).length;
            const totalXP = Object.values(result.xpAwarded)
                .reduce((sum, roles) => 
                    sum + Object.values(roles).reduce((a, b) => a + b, 0), 0);
            message += `XP awarded to ${totalUsers} users (Total: ${totalXP} XP).`;
        }
        
        store.dispatch('notification/showNotification', {
            message,
            type: 'success',
            duration: 5000
        });
    } catch (error) {
        store.dispatch('notification/showNotification', {
            message: error.message || 'Failed to close the event',
            type: 'error',
            duration: 5000
        });
    } finally {
        isClosingEvent.value = false;
    }
};
</script>

