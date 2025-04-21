<template>
  <!-- Only render the controls if the user has permission and the event is in a manageable state -->
  <template v-if="canShowManageControls">
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
          <!-- Start Event Button: Visible in Approved state -->
          <button
            v-if="event.status === EventStatus.Approved"
            type="button"
            class="btn btn-sm btn-primary d-inline-flex align-items-center"
            :disabled="!isWithinEventDates || isActionLoading(EventStatus.InProgress)"
            @click="updateStatus(EventStatus.InProgress)"
            :title="!isWithinEventDates ? 'Cannot start event outside of its scheduled dates' : 'Start the event'"
          >
            <span v-if="isActionLoading(EventStatus.InProgress)" class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
            <i v-else class="fas fa-play me-1"></i>
            <span>Start Event</span>
          </button>

          <!-- Mark Complete Button: Visible in InProgress state -->
          <button
            v-if="event.status === EventStatus.InProgress"
            type="button"
            class="btn btn-sm btn-success d-inline-flex align-items-center"
            :disabled="isActionLoading(EventStatus.Completed)"
            @click="updateStatus(EventStatus.Completed)"
          >
            <span v-if="isActionLoading(EventStatus.Completed)" class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
            <i v-else class="fas fa-check me-1"></i>
            <span>Mark Complete</span>
          </button>

          <!-- Cancel Event Button: Visible in Approved or InProgress state -->
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

        <!-- Informational Text for Status Section -->
        <p v-if="event.status === EventStatus.Approved && !isWithinEventDates" class="small text-danger mt-2">
          The event can only be started between its start ({{ formattedStartDate }}) and end ({{ formattedEndDate }}) dates.
        </p>
        <p v-else-if="event.status === EventStatus.Approved && isWithinEventDates" class="small text-success mt-2">
          You can start the event now.
        </p>
        <p v-if="event.status === EventStatus.InProgress" class="small text-secondary mt-2">
          Mark the event as completed when all activities are finished.
        </p>
      </div>

      <!-- Rating & Closing Controls (Only visible when Completed and not permanently closed) -->
      <div v-if="event.status === EventStatus.Completed && !event.closedAt" class="pt-5 border-top">
        <div class="d-flex justify-content-between align-items-center mb-4">
          <h3 class="h4 text-primary mb-0">Ratings & Closing</h3>
          <!-- Using event.ratingsOpen which should be a boolean -->
          <span class="badge rounded-pill fs-6" :class="event.ratingsOpen ? 'bg-success-subtle text-success-emphasis' : 'bg-warning-subtle text-warning-emphasis'">
            Ratings: {{ event.ratingsOpen ? 'Open' : 'Closed' }}
          </span>
        </div>

        <div class="d-flex flex-wrap gap-2">
          <!-- Open Ratings Button: Visible if ratings are closed -->
          <button
            v-if="!event.ratingsOpen"
            type="button"
            class="btn btn-sm btn-success d-inline-flex align-items-center"
            :disabled="isLoadingRatings"
            @click="toggleRatings(true)"
          >
            <span v-if="loadingAction === 'openRatings'" class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
            <i v-else class="fas fa-lock-open me-1"></i>
            <span>Open Ratings</span>
          </button>

          <!-- Close Ratings Button: Visible if ratings are open -->
          <button
            v-if="event.ratingsOpen"
            type="button"
            class="btn btn-sm btn-warning d-inline-flex align-items-center"
            :disabled="isLoadingRatings"
            @click="toggleRatings(false)"
          >
            <span v-if="loadingAction === 'closeRatings'" class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
            <i v-else class="fas fa-lock me-1"></i>
            <span>Close Ratings</span>
          </button>

          <!-- Close Event Button: Visible if ratings are CLOSED -->
          <button
            v-if="!event.ratingsOpen"
            type="button"
            class="btn btn-sm btn-outline-danger d-inline-flex align-items-center"
            :disabled="isClosingEvent || isLoadingRatings"
            @click="confirmCloseEvent"
            title="Permanently close event and award XP"
          >
            <span v-if="isClosingEvent" class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
            <i v-else class="fas fa-archive me-1"></i>
            <span>{{ isClosingEvent ? 'Closing & Awarding XP...' : 'Close Event Permanently' }}</span>
          </button>
        </div>

        <!-- Informational Text for Ratings/Closing Section -->
        <p v-if="!event.ratingsOpen" class="small text-secondary mt-2">
          Open ratings to allow participants to rate projects/teams and select winners.
        </p>
         <p v-if="event.ratingsOpen" class="small text-secondary mt-2">
           Close ratings once all selections/feedback are submitted. This is required before permanently closing the event.
         </p>
        <p v-if="!event.ratingsOpen" class="small text-secondary mt-2">
           After ratings are closed, you can permanently close the event to finalize it and award XP.
        </p>
      </div>

    </div>
  </template>
  <!-- Optional: Add an else template if needed when controls are hidden -->
  <!-- <template v-else>
    <div class="p-3 text-muted small">Event management controls are not available for this event state or your role.</div>
  </template> -->
</template>

<script setup lang="ts">
import { computed, ref, PropType } from 'vue';
import { useStore } from 'vuex';
import { canStartEvent as canEventBeStarted, formatISTDate } from '@/utils/dateTime'; // Assuming formatISTDate exists
import { EventStatus, type Event } from '@/types/event';
import { getEventStatusBadgeClass } from '@/utils/eventUtils';

const props = defineProps({
  event: {
    type: Object as PropType<Event>,
    required: true
  }
});

const store = useStore();
const isLoadingRatings = ref(false); // Specific state for toggle ratings action
const loadingAction = ref<EventStatus | 'openRatings' | 'closeRatings' | null>(null); // Tracks specific loading actions
const isClosingEvent = ref(false); // Specific state for the close event action

// --- Computed Properties for Visibility & State ---

// Determine if the current user can see the management controls at all
const canShowManageControls = computed(() => {
  if (!props.event) return false;
  // Hide controls if event is cancelled or permanently closed
  if (props.event.status === EventStatus.Cancelled || props.event.status === EventStatus.Rejected || props.event.closedAt) return false;

  // Allow Admins or Organizers to see controls
  const currentUserId = store.getters['user/userId'];
  const isAdmin = store.getters['user/isAdmin'];
  const isOrganizer = Array.isArray(props.event.details?.organizers) && props.event.details.organizers.includes(currentUserId);

  // Allow Requester to see controls ONLY if the event is Pending
  // const isRequester = props.event.requestedBy === currentUserId;
  // if (isRequester && props.event.status === EventStatus.Pending) return true;

  return isAdmin || isOrganizer;
});

// CSS class for the status badge
const statusBadgeClass = computed(() => getEventStatusBadgeClass(props.event.status));

// Check if the current time is within the event's start and end dates
const isWithinEventDates = computed(() => {
  if (!props.event.details?.date?.start || !props.event.details?.date?.end) return false;
  try {
    // Use IST for comparison, but only compare the date (ignore time)
    const { toIST } = require('@/utils/dateTime');
    const todayIST = toIST(new Date())?.startOf('day');
    const startIST = toIST(props.event.details.date.start)?.startOf('day');
    const endIST = toIST(props.event.details.date.end)?.startOf('day');
    // Debug log for date checking
    // eslint-disable-next-line no-console
    console.log('[EventManageControls.vue] Date check:', {
      today: new Date(),
      todayIST: todayIST?.toISODate?.(),
      start: props.event.details.date.start,
      startIST: startIST?.toISODate?.(),
      end: props.event.details.date.end,
      endIST: endIST?.toISODate?.(),
      result: !!(todayIST && startIST && endIST && todayIST >= startIST && todayIST <= endIST)
    });
    if (!todayIST || !startIST || !endIST) return false;
    return todayIST >= startIST && todayIST <= endIST;
  } catch (e) {
    console.error("Error checking event dates (IST, date only):", e);
    return false;
  }
});

// Format dates for display
const formattedStartDate = computed(() => formatISTDate(props.event.details?.date?.start, 'MMM d, HH:mm'));
const formattedEndDate = computed(() => formatISTDate(props.event.details?.date?.end, 'MMM d, HH:mm'));

// Check if the event can be cancelled (Approved or InProgress, not closed)
const canCancel = computed(() =>
    [EventStatus.Approved, EventStatus.InProgress].includes(props.event.status as EventStatus) && !props.event.closedAt
);

// Check if a specific action is currently loading
const isActionLoading = (action: EventStatus | 'openRatings' | 'closeRatings') => {
    return loadingAction.value === action;
};


// --- Methods ---

// Dispatch action to update the event status
const updateStatus = async (newStatus: EventStatus) => {
    if (loadingAction.value) return; // Prevent multiple simultaneous actions
    loadingAction.value = newStatus;
    try {
        await store.dispatch('events/updateEventStatus', {
            eventId: props.event.id,
            newStatus: newStatus
        });
         store.dispatch('notification/showNotification', {
            message: `Event status updated to ${newStatus}.`,
            type: 'success'
        }, { root: true });
    } catch (error: any) {
        store.dispatch('notification/showNotification', {
            message: error?.message || `Failed to update status to ${newStatus}.`,
            type: 'error'
        }, { root: true });
    } finally {
        loadingAction.value = null;
    }
};

// Dispatch action to toggle the ratingsOpen state
const toggleRatings = async (openState: boolean) => {
    if (loadingAction.value || isLoadingRatings.value) return; // Prevent multiple simultaneous actions
    loadingAction.value = openState ? 'openRatings' : 'closeRatings';
    isLoadingRatings.value = true; // Use specific flag
    try {
        // Ensure the action name matches the one defined in Vuex (part3)
        await store.dispatch('events/toggleRatingsOpen', {
            eventId: props.event.id,
            isOpen: openState
        });
         store.dispatch('notification/showNotification', {
            message: `Ratings are now ${openState ? 'Open' : 'Closed'}.`,
            type: 'success'
        }, { root: true });
    } catch (error: any) {
        store.dispatch('notification/showNotification', {
            message: error?.message || 'Failed to toggle ratings status.',
            type: 'error'
        }, { root: true });
    } finally {
        loadingAction.value = null;
        isLoadingRatings.value = false;
    }
};

// Show confirmation before cancelling
const confirmCancel = async () => {
    if (window.confirm('Are you sure you want to cancel this event? This action cannot be undone.')) {
        await updateStatus(EventStatus.Cancelled); // Update status directly
    }
};

// Show confirmation before permanently closing
const confirmCloseEvent = () => { // Renamed to avoid conflict with action name
    if (window.confirm('Are you sure you want to permanently close this event and award XP? This action cannot be reopened.')) {
        closeEventAction();
    }
};

// Helper function to calculate total XP from an XP map (if needed)
const calculateTotalXP = (xpMap: Record<string, Record<string, number>> | null | undefined): number => {
    if (!xpMap) return 0;
    return Object.values(xpMap).reduce((userSum, roles) =>
        userSum + Object.values(roles).reduce((roleSum, xp) => roleSum + (Number(xp) || 0), 0)
    , 0);
};

// Dispatch action to permanently close the event and award XP
const closeEventAction = async () => {
    if (isClosingEvent.value) return; // Prevent multiple clicks
    isClosingEvent.value = true;
    try {
        // Ensure the action name matches the one defined in Vuex (part3)
        const result = await store.dispatch('events/closeEventPermanently', {
            eventId: props.event.id
        });

        // Show success notification with XP summary (result structure depends on action return)
        let message = 'Event closed permanently. ';
        if (result?.xpAwarded) {
            const totalUsers = Object.keys(result.xpAwarded).length;
            const totalXP = calculateTotalXP(result.xpAwarded); // Use helper if result structure matches
            message += `XP awarded to ${totalUsers} users (Total: ${totalXP} XP).`;
        } else if (result?.message) {
            message = result.message; // Use message from action if provided
        }

        store.dispatch('notification/showNotification', {
            message,
            type: 'success',
            duration: 6000 // Longer duration for important info
        }, { root: true });
    } catch (error: any) {
        store.dispatch('notification/showNotification', {
            message: error?.message || 'Failed to close the event.',
            type: 'error',
            duration: 5000
        }, { root: true });
    } finally {
        isClosingEvent.value = false;
    }
};
</script>

<style scoped>
/* Add any specific scoped styles if needed */
.event-manage-controls {
  max-width: 800px; /* Optional: Limit width */
  margin: 0 auto 1.5rem auto; /* Center and add bottom margin */
}
</style>