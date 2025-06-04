<template>
  <div class="event-manage-controls p-4 border bg-light rounded shadow-sm mb-4">
    <!-- Status Management Section -->
    <div v-if="showStatusManagementSection" class="mb-5">
      <h3 class="h4 text-primary mb-3">Event Management</h3>
      <div class="d-flex align-items-center mb-4">
        <span class="small fw-medium text-secondary me-3">Current Status:</span>
        <span class="badge rounded-pill fs-6" :class="statusBadgeClass">{{ event.status }}</span>
      </div>
      <div class="d-flex flex-wrap gap-2">
        <!-- Start Event Button -->
        <button
          v-if="showStartButton"
          type="button"
          class="btn btn-sm btn-primary d-inline-flex align-items-center"
          :disabled="isActionLoading(EventStatus.InProgress)"
          @click="updateStatus(EventStatus.InProgress)"
        >
          <span v-if="isActionLoading(EventStatus.InProgress)" class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
          <i v-else class="fas fa-play me-1"></i>
          <span>Start Event</span>
        </button>
        <!-- Mark Complete Button -->
        <button
          v-if="showMarkCompleteButton"
          type="button"
          class="btn btn-sm btn-success d-inline-flex align-items-center"
          :disabled="isActionLoading(EventStatus.Completed)"
          @click="updateStatus(EventStatus.Completed)"
        >
          <span v-if="isActionLoading(EventStatus.Completed)" class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
          <i v-else class="fas fa-check me-1"></i>
          <span>Mark Complete</span>
        </button>
        <!-- Cancel Event Button -->
        <button
          v-if="showCancelButton"
          type="button"
          class="btn btn-sm btn-outline-danger d-inline-flex align-items-center"
          :disabled="isActionLoading(EventStatus.Cancelled)"
          @click="confirmCancel"
        >
          <span v-if="isActionLoading(EventStatus.Cancelled)" class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
          <i v-else class="fas fa-times me-1"></i>
          <span>Cancel Event</span>
        </button>
        <!-- Edit Event Button -->
        <button
          v-if="showEditButton"
          type="button"
          class="btn btn-sm btn-outline-primary d-inline-flex align-items-center"
          @click="goToEditEvent"
        >
          <i class="fas fa-edit me-1"></i>
          <span>Edit Event</span>
        </button>
      </div>
      <!-- Info Text for Start Button -->
      <p v-if="showStartButton && !isWithinEventDates" class="small text-danger mt-2">
        Event can only be started between {{ formattedStartDate }} and {{ formattedEndDate }}.
      </p>
      <p v-if="showStartButton && isWithinEventDates" class="small text-success mt-2">
        Ready to start the event.
      </p>
    </div>

    <!-- Voting & Closing Section -->
    <div v-if="showVotingClosingSection" :class="{ 'pt-5 border-top': showStatusManagementSection }">
      <div class="d-flex justify-content-between align-items-center mb-4">
        <h3 class="h4 text-primary mb-0">Voting & Closing</h3>
        <span v-if="event.status === EventStatus.Completed" class="badge rounded-pill fs-6" :class="event.votingOpen ? 'bg-success-subtle text-success-emphasis' : 'bg-secondary-subtle text-secondary-emphasis'">
          Voting: {{ event.votingOpen ? 'Open' : 'Closed' }}
        </span>
      </div>
      <div class="d-flex flex-wrap gap-2">
        <!-- Open Voting Button -->
        <button
          v-if="showOpenVotingButton"
          type="button"
          class="btn btn-sm btn-success d-inline-flex align-items-center"
          :disabled="isActionLoading('openVoting')"
          @click="toggleVoting(true)"
        >
          <span v-if="isActionLoading('openVoting')" class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
          <i v-else class="fas fa-lock-open me-1"></i>
          <span>Open Voting</span>
        </button>
         <!-- Close Voting Button -->
        <button
          v-if="showCloseVotingButton"
          type="button"
          class="btn btn-sm btn-warning d-inline-flex align-items-center"
          :disabled="isActionLoading('closeVoting')"
          @click="toggleVoting(false)"
        >
          <span v-if="isActionLoading('closeVoting')" class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
          <i v-else class="fas fa-lock me-1"></i>
          <span>Close Voting</span>
        </button>
        <!-- Find Winner Button -->
        <button
          v-if="showFindWinnerButton"
          type="button"
          class="btn btn-sm btn-primary d-inline-flex align-items-center"
          :disabled="submissionCount < 10 || isActionLoading('findWinner')"
          @click="findWinnerAction"
        >
          <span v-if="isActionLoading('findWinner')" class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
          <i v-else class="fas fa-trophy me-1"></i>
          <span>Find Winner</span>
        </button>
        <span v-if="showFindWinnerButton && submissionCount < 10" class="small text-danger ms-2">
          At least 10 votes are required to find winners (currently {{ submissionCount }}).
        </span>
        <!-- Manually Select Winners Button -->
        <button
          v-if="showManualSelectWinnerButton"
          type="button"
          class="btn btn-sm btn-info d-inline-flex align-items-center"
          :disabled="isActionLoading('manualSelectWinner')"
          @click="goToManualSelectWinner"
          title="Manually set or override winners"
        >
          <span v-if="isActionLoading('manualSelectWinner')" class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
          <i v-else class="fas fa-edit me-1"></i>
          <span>Manually Select Winners</span>
        </button>
        <!-- Close Event Button -->
        <button
          v-if="showCloseEventButton"
          type="button"
          class="btn btn-sm btn-outline-danger d-inline-flex align-items-center"
          :disabled="isClosingEvent || isActionLoading('closeEvent')"
          @click="confirmCloseEvent"
          title="Permanently close event and award XP"
        >
          <span v-if="isClosingEvent || isActionLoading('closeEvent')" class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
          <i v-else class="fas fa-archive me-1"></i>
          <span>{{ isClosingEvent ? 'Closing...' : 'Close Event Permanently' }}</span>
        </button>
      </div>
       <!-- Info Texts -->
      <p v-if="showOpenVotingButton" class="small text-secondary mt-2">
        Open Voting to allow participants to vote for projects/teams and select winners.
      </p>
      <p v-if="showCloseVotingButton" class="small text-secondary mt-2">
        Close Voting once all selections/feedback are submitted. Required before permanently closing event.
      </p>
      <p v-if="showFindWinnerButton" class="small text-secondary mt-2">
        Requires Voting to be closed and at least 10 submissions (currently {{ submissionCount }}) to find winners.
      </p>
      <p v-if="showManualSelectWinnerButton" class="small text-secondary mt-2">
        Manually set or override the winners for each criterion. This is useful if vote-based calculation is not desired or needs adjustment.
      </p>
      <p v-if="showCloseEventButton" class="small text-secondary mt-2">
        Voting must be closed and winners selected before you can permanently close the event and award XP.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useProfileStore } from '@/stores/profileStore';
import { useEventStore } from '@/stores/eventStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { DateTime } from 'luxon';
import { formatISTDate } from '@/utils/dateTime';
import { EventStatus, type Event, EventFormat, EventCriteria } from '@/types/event';
import { getEventStatusBadgeClass } from '@/utils/eventUtils';
import {
  isEventOrganizer,
  // isEventParticipant, // Not directly used for control visibility here, but good to be aware of
  isEventEditable,
  // canManageEvents, // General permission, isEventOrganizer is more specific here
} from '@/utils/permissionHelpers';

// Define a custom interface to extend EventCriteria with the properties used in the component
interface ExtendedEventCriteria extends EventCriteria {
  id: string; // Or some unique identifier if constraintIndex is not suitable
  votes?: Record<string, any>; // Changed from criteriaSelections
  calculatedWinner?: string | string[];
  winnerName?: string;
}

// Define props and emits
const props = defineProps<{
  event: Event;
}>();

const emit = defineEmits(['update']);

// Setup state
const router = useRouter();
const studentStore = useProfileStore();
const eventStore = useEventStore();
const notificationStore = useNotificationStore();
const loadingAction = ref<EventStatus | 'openVoting' | 'closeVoting' | 'findWinner' | 'closeEvent' | 'manualSelectWinner' | null>(null);
const isClosingEvent = ref(false);

// --- User Role & Permissions ---
const currentUserId = computed<string | null>(() => studentStore.currentStudent?.uid ?? null);
const currentUser = computed(() => studentStore.currentStudent); // For passing UserData

// Add more explicit debug information for permission checks
const localIsOrganizer = computed(() => {
  return isEventOrganizer(props.event, currentUserId.value);
});

// --- Event State Checks ---
const isWithinEventDates = computed(() => {
  if (!props.event?.details?.date?.start || !props.event?.details?.date?.end) return false;
  try {
    const toIST = (date: any): DateTime | null => {
       if (!date) return null;
       let dt: DateTime;
       if (date.toDate && typeof date.toDate === 'function') dt = DateTime.fromJSDate(date.toDate());
       else if (date instanceof Date) dt = DateTime.fromJSDate(date);
       else dt = DateTime.fromISO(date);
       return dt.isValid ? dt.setZone('Asia/Kolkata') : null;
    };

    const nowIST = DateTime.now().setZone('Asia/Kolkata').startOf('day');
    const startIST = toIST(props.event.details.date.start)?.startOf('day');
    const endIST = toIST(props.event.details.date.end)?.startOf('day');

    if (!nowIST.isValid || !startIST?.isValid || !endIST?.isValid) {
      return false;
    }
    return nowIST >= startIST && nowIST <= endIST;
  } catch (e) {
    return false;
  }
});

const formattedStartDate = computed(() => formatISTDate(props.event?.details?.date?.start));
const formattedEndDate = computed(() => formatISTDate(props.event?.details?.date?.end));
const statusBadgeClass = computed(() => getEventStatusBadgeClass(props.event?.status));
const votingIsClosed = computed(() => !props.event?.votingOpen);

// --- Submission/Winner State ---
const localCriteria = computed(() => {
  return (props.event?.criteria || []).map(criterion => ({
    ...criterion,
    votes: criterion.votes || {}
  })) as ExtendedEventCriteria[];
});

const submissionCount = computed(() => {
  const sIds = new Set<string>();
  // Ensure localCriteria is defined and is an array before trying to access its value
  if (localCriteria.value && Array.isArray(localCriteria.value)) {
    (localCriteria.value as ExtendedEventCriteria[]).forEach(extendedCriterion => {
      // @ts-ignore - Assuming votes structure is Record<string, any> and you've handled potential undefined
      if (extendedCriterion.votes) {
        // @ts-ignore
        Object.keys(extendedCriterion.votes).forEach(uid => {
          // @ts-ignore
          if (extendedCriterion.votes![uid]) { // Check if a vote/selection exists for this user
            sIds.add(uid);
          }
        });
      }
    });
  }
  return sIds.size;
});

const hasWinners = computed(() => !!props.event?.winners && Object.keys(props.event.winners).length > 0);

// --- Button Visibility Logic ---
const showStartButton = computed(() =>
  localIsOrganizer.value &&
  props.event?.status === EventStatus.Approved &&
  isWithinEventDates.value &&
  !props.event?.lifecycleTimestamps?.closedAt
);

const showMarkCompleteButton = computed(() =>
  localIsOrganizer.value &&
  props.event?.status === EventStatus.InProgress &&
  !props.event?.lifecycleTimestamps?.closedAt
);

const showOpenVotingButton = computed(() =>
  localIsOrganizer.value &&
  props.event?.status === EventStatus.Completed &&
  votingIsClosed.value &&
  !props.event?.lifecycleTimestamps?.closedAt
);

const showCloseVotingButton = computed(() =>
    localIsOrganizer.value &&
    props.event?.status === EventStatus.Completed &&
    props.event?.votingOpen === true &&
    !props.event?.lifecycleTimestamps?.closedAt
);

const canFindWinner = computed(() =>
  localIsOrganizer.value &&
  props.event?.status === EventStatus.Completed &&
  votingIsClosed.value &&
  !props.event?.lifecycleTimestamps?.closedAt
);

const showFindWinnerButton = canFindWinner;

const showManualSelectWinnerButton = computed(() =>
  localIsOrganizer.value &&
  props.event?.status === EventStatus.Completed &&
  votingIsClosed.value &&
  !props.event?.lifecycleTimestamps?.closedAt
);

const showCloseEventButton = computed(() =>
  localIsOrganizer.value &&
  props.event?.status === EventStatus.Completed &&
  votingIsClosed.value &&
  hasWinners.value &&
  !props.event?.lifecycleTimestamps?.closedAt
);

const showCancelButton = computed(() =>
  localIsOrganizer.value &&
  [EventStatus.Approved, EventStatus.InProgress].includes(props.event?.status as EventStatus) &&
  !props.event?.lifecycleTimestamps?.closedAt
);

const showEditButton = computed(() =>
  localIsOrganizer.value &&
  isEventEditable(props.event?.status) &&
  !props.event?.lifecycleTimestamps?.closedAt
);

// --- Section Visibility ---
const showStatusManagementSection = computed(() =>
    showStartButton.value || showMarkCompleteButton.value || showCancelButton.value || showEditButton.value
);

const showVotingClosingSection = computed(() =>
    showOpenVotingButton.value || showCloseVotingButton.value || showFindWinnerButton.value || showCloseEventButton.value || showManualSelectWinnerButton.value
);

// --- Actions ---
const isActionLoading = (action: EventStatus | 'openVoting' | 'closeVoting' | 'findWinner' | 'closeEvent' | 'manualSelectWinner'): boolean => 
  loadingAction.value === action;

const updateStatus = async (newStatus: EventStatus): Promise<void> => {
  if (loadingAction.value) return;
  loadingAction.value = newStatus;
  try {
    // Use Pinia action
    await eventStore.updateEventStatus({
      eventId: props.event.id,
      newStatus: newStatus
    });
    notificationStore.showNotification({
      message: `Event status updated to ${newStatus}.`,
      type: 'success'
    });
    emit('update');
  } catch (error: any) {
    notificationStore.showNotification({
      message: error?.message || `Failed to update status to ${newStatus}.`,
      type: 'error'
    });
  } finally {
    loadingAction.value = null;
  }
};

const toggleVoting = async (openState: boolean): Promise<void> => {
    if (loadingAction.value) return;
    loadingAction.value = openState ? 'openVoting' : 'closeVoting';
    try {
        // Double-check permissions before even trying
        if (!isEventOrganizer(props.event, currentUser.value?.uid)) {
            throw new Error('Only event organizers can modify voting status.');
        }
        
        // Add detailed debugging for troubleshooting
        
        // Check if event status meets requirements from Firestore rules
        const validStatus = [EventStatus.Completed, EventStatus.InProgress].includes(props.event?.status as EventStatus);
        if (!validStatus) {
            throw new Error('Voting can only be modified for events with status Completed or InProgress.');
        }
        
        // Also check that the voting state is actually changing
        if (props.event.votingOpen === openState) {
            throw new Error(`Voting is already ${openState ? 'open' : 'closed'}.`);
        }
        
        await eventStore.toggleVotingOpen({
            eventId: props.event.id,
            open: openState
        });
        emit('update');
    } catch (error: any) {
         notificationStore.showNotification({
             message: error?.message || 'Failed to toggle voting status.',
             type: 'error'
         });
    } finally {
        loadingAction.value = null;
    }
};

const confirmCancel = async (): Promise<void> => {
  if (window.confirm('Are you sure you want to cancel this event? This action cannot be undone.')) {
    await updateStatus(EventStatus.Cancelled);
  }
};

const confirmCloseEvent = (): void => {
  if (window.confirm('Are you sure you want to permanently close this event and award XP? This action cannot be reopened.')) {
    closeEventAction();
  }
};

const closeEventAction = async (): Promise<void> => {
    if (loadingAction.value || isClosingEvent.value) return;
    loadingAction.value = 'closeEvent';
    isClosingEvent.value = true;
    try {
        await eventStore.closeEventPermanently({
            eventId: props.event.id
        });
        emit('update');
    } catch (error: any) {
        // Error notification handled within Pinia action
    } finally {
        loadingAction.value = null;
        isClosingEvent.value = false;
    }
};

const findWinnerAction = async (): Promise<void> => {
    if (loadingAction.value) return;
    loadingAction.value = 'findWinner';
    try {
        await eventStore.findWinner(props.event.id);
        emit('update');
    } catch (error: any) {
        // Error notification handled within Pinia action
    } finally {
        loadingAction.value = null;
    }
};

const goToEditEvent = (): void => {
  // Check if event is in an editable state before navigating
  if (!props.event || !isEventEditable(props.event.status as EventStatus)) {
    notificationStore.showNotification({ 
      message: `Cannot edit event with status: ${props.event?.status || 'Unknown'}`, 
      type: 'warning',
      duration: 5000 
    });
    return;
  }
  
  router.push({ name: 'EditEvent', params: { eventId: props.event.id } });
};

const goToManualSelectWinner = (): void => {
  router.push({ name: 'SelectionForm', params: { eventId: props.event.id }, query: { manualMode: 'true' } });
};
</script>

<style scoped>
.event-manage-controls {
  max-width: 900px; /* Slightly wider if needed */
  margin: 0 auto; /* Center it */
}
/* Ensure badges have enough contrast and padding */
.badge {
    padding: 0.4em 0.8em;
    font-size: 0.85rem;
}
</style>