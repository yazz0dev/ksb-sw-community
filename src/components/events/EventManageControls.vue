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
          :disabled="!isWithinEventDates || isActionLoading(EventStatus.InProgress)"
          @click="updateStatus(EventStatus.InProgress)"
        >
          <span v-if="isActionLoading(EventStatus.InProgress)" class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
          <i v-else class="fas fa-play me-1"></i>
          <span>Start Event</span>
        </button>

        <button
          v-if="canComplete"
          type="button"
          class="btn btn-sm btn-success d-inline-flex align-items-center"
          :disabled="isActionLoading(EventStatus.Completed)"
          @click="updateStatus(EventStatus.Completed)"
        >
          <span v-if="isActionLoading(EventStatus.Completed)" class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
          <i v-else class="fas fa-check me-1"></i>
          <span>Mark Complete</span>
        </button>

        <button
          v-if="canCancel"
          type="button"
          class="btn btn-sm btn-danger d-inline-flex align-items-center"
          :disabled="isActionLoading(EventStatus.Cancelled)"
          @click="confirmCancel"
        >
          <span v-if="isActionLoading(EventStatus.Cancelled)" class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
          <i v-else class="fas fa-times me-1"></i>
          <span>Cancel Event</span>
        </button>
      </div>
      <p v-if="!isWithinEventDates && canStartEvent" class="small text-danger mt-2">
        The event can only be started between its start and end dates.
      </p>
    </div>

    <!-- Rating Controls -->
    <div v-if="event.status === EventStatus.Completed && !event.closedAt" class="pt-5 border-top">
      <div class="d-flex justify-content-between align-items-center mb-4">
        <h3 class="h4 text-primary mb-0">Ratings</h3>
        <span class="badge rounded-pill fs-6" :class="event.ratings ? 'bg-success-subtle text-success-emphasis' : 'bg-warning-subtle text-warning-emphasis'">
          {{ event.ratings ? 'Open' : 'Closed' }}
        </span>
      </div>

      <div class="d-flex flex-wrap gap-2">
        <button
          v-if="event.ratings && canToggleRatings"
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
          v-else-if="!event.ratings && canToggleRatings"
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
      <p v-if="!canManageRatings && event.status === EventStatus.Completed && !event.closedAt" class="small text-secondary mt-2">
        Ratings management is restricted.
      </p>
       <p v-if="!canCloseEvent && event.status === EventStatus.Completed && event.ratings" class="small text-secondary mt-2">
         Event must have ratings closed before it can be permanently closed.
       </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, PropType, Ref } from 'vue';
import { useStore } from 'vuex';
import { canStartEvent as canEventBeStarted } from '@/utils/dateTime';
import { EventStatus, type Event } from '@/types/event';

const props = defineProps({
  event: {
    type: Object as PropType<Event>,
    required: true
  }
});

const store = useStore();
const isLoadingRatings = ref(false);
const loadingAction = ref<EventStatus | 'openRatings' | 'closeRatings' | null>(null);
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
  if (!props.event.details.date.final?.start || !props.event.details.date.final?.end) return false;
  return canEventBeStarted({
	startDate: props.event.details.date.final.start,
	endDate: props.event.details.date.final.end
  });
});

const canManageRatings = computed(() => {
    return true;
});

const canToggleRatings = computed(() => 
    !props.event.closedAt &&
    canManageRatings.value &&
    props.event.status === EventStatus.Completed
);

const canCloseEvent = computed(() => 
    props.event.status === EventStatus.Completed &&
    !props.event.ratings &&
    !props.event.closedAt
);

const canStartEvent = computed(() => 
    props.event.status === EventStatus.Approved && 
    !!props.event.details.date.final?.start && 
    !!props.event.details.date.final?.end
);

const canComplete = computed(() => 
    props.event.status === EventStatus.InProgress
);

const canCancel = computed(() => 
    [EventStatus.Approved, EventStatus.InProgress].includes(props.event.status as EventStatus) && !props.event.closedAt
);

const isAdmin = computed(() => store.getters['user/isAdmin']);

const isActionLoading = (action: EventStatus | 'openRatings' | 'closeRatings') => {
    return loadingAction.value === action;
};

const updateStatus = async (newStatus: EventStatus) => {
    if (loadingAction.value) return;
    loadingAction.value = newStatus;
    try {
        await store.dispatch('events/updateEventStatus', {
            eventId: props.event.id,
            newStatus: newStatus as EventStatus
        });
    } catch (error: any) {
        store.dispatch('notification/showNotification', {
            message: error?.message || `Failed to update status to ${newStatus}.`,
            type: 'error'
        });
    } finally {
        loadingAction.value = null;
    }
};

const toggleRatings = async () => {
    if (loadingAction.value) return;
    const targetState = !props.event.ratings;
    loadingAction.value = targetState ? 'openRatings' : 'closeRatings';
    try {
        await store.dispatch('events/toggleRatingsOpen', {
            eventId: props.event.id,
            isOpen: targetState
        });
    } catch (error: any) {
        store.dispatch('notification/showNotification', {
            message: error?.message || 'Failed to toggle ratings status.',
            type: 'error'
        });
    } finally {
        loadingAction.value = null;
    }
};

const confirmCancel = async () => {
    if (window.confirm('Are you sure you want to cancel this event? This cannot be undone.')) {
        await updateStatus(EventStatus.Cancelled as EventStatus);
    }
};

const confirmCloseEvent = async () => {
    if (window.confirm('Are you sure you want to permanently close this event? Ratings cannot be reopened, and no further changes can be made.')) {
        await closeEventAction();
    }
};

// Helper function to calculate total XP from an XP map
const calculateTotalXP = (xpMap: Record<string, Record<string, number>> | null | undefined): number => {
    if (!xpMap) return 0;
    // Sum all values within the nested xpMap object
    return Object.values(xpMap).reduce((userSum, roles) =>
        userSum + Object.values(roles).reduce((roleSum, xp) => roleSum + (Number(xp) || 0), 0)
    , 0);
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
            const totalXP = calculateTotalXP(result.xpAwarded);
            message += `XP awarded to ${totalUsers} users (Total: ${totalXP} XP).`;
        }
        
        store.dispatch('notification/showNotification', {
            message,
            type: 'success',
            duration: 5000
        });
    } catch (error: any) {
        store.dispatch('notification/showNotification', {
            message: error?.message || 'Failed to close the event',
            type: 'error',
            duration: 5000
        });
    } finally {
        isClosingEvent.value = false;
    }
};
</script>

