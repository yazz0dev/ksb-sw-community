<template>
  <div v-if="shouldShowControls" class="event-manage-controls p-4 border bg-light rounded shadow-sm mb-4"> <!-- Added mb-4 -->

    <!-- Status Management Section (For Organizers Only) -->
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
        <!-- Edit Event Button (Organizers only, before Completed/Cancelled/Closed) -->
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

    <!-- Ratings & Closing Section (For Organizers AND Participants) -->
    <div v-if="showRatingsClosingSection" :class="{ 'pt-5 border-top': showStatusManagementSection }"> <!-- Add border-top only if status section was shown -->
      <div class="d-flex justify-content-between align-items-center mb-4">
        <h3 class="h4 text-primary mb-0">Ratings & Closing</h3>
        <span v-if="event.status === EventStatus.Completed" class="badge rounded-pill fs-6" :class="event.ratingsOpen ? 'bg-success-subtle text-success-emphasis' : 'bg-secondary-subtle text-secondary-emphasis'">
          Ratings: {{ event.ratingsOpen ? 'Open' : 'Closed' }}
        </span>
      </div>
      <div class="d-flex flex-wrap gap-2">
        <!-- Open Ratings Button (Organizer) -->
        <button
          v-if="showOpenRatingsButton"
          type="button"
          class="btn btn-sm btn-success d-inline-flex align-items-center"
          :disabled="isActionLoading('openRatings')"
          @click="toggleRatings(true)"
        >
          <span v-if="isActionLoading('openRatings')" class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
          <i v-else class="fas fa-lock-open me-1"></i>
          <span>Open Ratings</span>
        </button>
         <!-- Close Ratings Button (Organizer) -->
        <button
          v-if="showCloseRatingsButton"
          type="button"
          class="btn btn-sm btn-warning d-inline-flex align-items-center"
          :disabled="isActionLoading('closeRatings')"
          @click="toggleRatings(false)"
        >
          <span v-if="isActionLoading('closeRatings')" class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
          <i v-else class="fas fa-lock me-1"></i>
          <span>Close Ratings</span>
        </button>
        <!-- Find Winner Button (Organizer) -->
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
          At least 10 ratings/submissions are required to find winners (currently {{ submissionCount }}).
        </span>
        <!-- Close Event Button (Organizer) -->
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
      <p v-if="showOpenRatingsButton" class="small text-secondary mt-2">
        Open ratings to allow participants to rate projects/teams and select winners.
      </p>
      <p v-if="showCloseRatingsButton" class="small text-secondary mt-2">
        Close ratings once all selections/feedback are submitted. Required before permanently closing event.
      </p>
      <p v-if="showFindWinnerButton" class="small text-secondary mt-2">
        Requires ratings to be closed and at least 10 submissions (currently {{ submissionCount }}) to find winners.
      </p>
      <p v-if="showCloseEventButton" class="small text-secondary mt-2">
        Ratings must be closed and winners selected before you can permanently close the event and award XP.
      </p>
       <p v-if="showParticipantWinnerSelection" class="small text-secondary mt-2">
         Ratings are open! Participants can now submit their selections.
       </p>
       <p v-if="showParticipantOrganizerRating" class="small text-secondary mt-2">
         The event is complete. Please rate the organizers.
       </p>
    </div>
  </div>
   <div v-else class="text-center text-muted small py-3">
       <!-- Optional: Message when no controls are shown -->
        No management actions available at this time.  
   </div>
</template>

<script lang="ts">
/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-explicit-any */
// src/components/events/EventManageControls.vue

import { computed, ref, PropType } from 'vue';
import { useStore } from 'vuex';
import { useRouter } from 'vue-router';
import { DateTime } from 'luxon'; // Import DateTime
import { formatISTDate } from '../../utils/dateTime'; // Corrected path, removed .ts
import { EventStatus, type Event, EventFormat } from '../../types/event'; // Corrected path, removed .ts
import { getEventStatusBadgeClass } from '../../utils/eventUtils'; // Corrected path, removed .ts


export default {
  name: 'EventManageControls',
  props: {
    event: {
      type: Object as PropType<Event>,
      required: true
    }
  },
  setup(props, { emit }) { // <-- add emit to setup signature
    const store = useStore();
    const router = useRouter();
    const loadingAction = ref<EventStatus | 'openRatings' | 'closeRatings' | 'findWinner' | 'closeEvent' | null>(null);
    const isClosingEvent = ref(false); // Specific loading for close action

    // --- User Role & Permissions ---
    const currentUserId = computed<string | null>(() => store.getters['user/getUser']?.uid ?? null);
    const currentUserRole = computed<string | null>(() => store.getters['user/userRole']); // Assuming this getter exists elsewhere or needs checking too
    const isOrganizer = computed(() => {
      const uid = currentUserId.value;
      const eventData = props.event;
      const organizers = eventData?.details?.organizers;
      const requestedBy = eventData?.requestedBy;

      if (!uid || !eventData) {
        return false;
      }

      const isListedOrganizer = Array.isArray(organizers) && organizers.includes(uid);
      const isRequestingUser = requestedBy === uid;
      const result = isListedOrganizer || isRequestingUser;

      return result;
    });

    const isParticipant = computed(() => {
      if (!currentUserId.value || !props.event) return false;
      if (props.event.details.format === EventFormat.Team) {
        return props.event.teams?.some(team => team.members?.includes(currentUserId.value!));
      }
      return props.event.participants?.includes(currentUserId.value);
    });
    const canManageEvent = computed(() => isOrganizer.value);

    // --- Event State Checks ---
    const isWithinEventDates = computed(() => {
      if (!props.event?.details?.date?.start || !props.event?.details?.date?.end) return false;
      try {
        // Assume dates are Timestamps; convert to Luxon DateTime in IST
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
          console.warn("Invalid dates for isWithinEventDates check:", nowIST, startIST, endIST);
          return false;
        }
        // console.log(`Date Check: Now=${nowIST.toISO()}, Start=${startIST.toISO()}, End=${endIST.toISO()}`);
        return nowIST >= startIST && nowIST <= endIST;
      } catch (e) {
        console.error("Error in isWithinEventDates:", e);
        return false;
      }
    });
    const formattedStartDate = computed(() => formatISTDate(props.event?.details?.date?.start));
    const formattedEndDate = computed(() => formatISTDate(props.event?.details?.date?.end));
    const statusBadgeClass = computed(() => getEventStatusBadgeClass(props.event?.status));
    const ratingsAreClosed = computed(() => !props.event?.ratingsOpen);

    // --- Submission/Winner State ---
    // submissionCount now counts rating submissions/selections, not project submissions
    const submissionCount = computed(() => {
      if (!props.event) return 0;
      // Team event: count unique users who submitted team criteria votes or bestPerformerSelections
      if (props.event.details.format === EventFormat.Team) {
        // Count unique users who have submitted at least one criteriaSelections or bestPerformerSelections
        const userIds = new Set<string>();
        if (Array.isArray(props.event.criteria)) {
          props.event.criteria.forEach(criterion => {
            if (criterion.criteriaSelections) {
              Object.keys(criterion.criteriaSelections).forEach(uid => {
                if (criterion.criteriaSelections[uid]) userIds.add(uid);
              });
            }
          });
        }
        if (props.event.bestPerformerSelections && typeof props.event.bestPerformerSelections === 'object') {
          Object.keys(props.event.bestPerformerSelections).forEach(uid => userIds.add(uid));
        }
        return userIds.size;
      }
      // Individual event: count unique users who have submitted at least one criteria selection
      if (Array.isArray(props.event.criteria)) {
        const userIds = new Set<string>();
        props.event.criteria.forEach(criterion => {
          if (criterion.criteriaSelections) {
            Object.keys(criterion.criteriaSelections).forEach(uid => {
              if (criterion.criteriaSelections[uid]) userIds.add(uid);
            });
          }
        });
        return userIds.size;
      }
      return 0;
    });
    const hasWinners = computed(() => !!props.event?.winners && Object.keys(props.event.winners).length > 0);

    // --- Button Visibility Logic ---
    // 1. Show "Start Event": Only for organizers, when event is `Approved`, current date is within start/end.
    const showStartButton = computed(() =>
      canManageEvent.value &&
      props.event?.status === EventStatus.Approved &&
      isWithinEventDates.value &&
      !props.event?.closedAt
    );

    // 2. Show "Mark Complete": Only for organizers, when event is `InProgress`.
    const showMarkCompleteButton = computed(() =>
      canManageEvent.value &&
      props.event?.status === EventStatus.InProgress &&
      !props.event?.closedAt
    );

    // 3. Show "Open Ratings": Only for organizers, when event is `Completed`, ratings are closed.
    const showOpenRatingsButton = computed(() =>
      canManageEvent.value &&
      props.event?.status === EventStatus.Completed &&
      ratingsAreClosed.value &&
      !props.event?.closedAt
    );

    // Show "Close Ratings": Only for organizers, when event is `Completed`, ratings are open.
    const showCloseRatingsButton = computed(() =>
        canManageEvent.value &&
        props.event?.status === EventStatus.Completed &&
        props.event?.ratingsOpen === true && // Explicitly check if open
        !props.event?.closedAt
    );

    // 4. Show "Find Winner": Only for organizers, when event is `Completed`, after ratings are closed.
    //    Button is always visible if eligible, but disabled if <10 submissions.
    const canFindWinner = computed(() =>
      canManageEvent.value &&
      props.event?.status === EventStatus.Completed &&
      ratingsAreClosed.value && // Explicitly check if closed
      !props.event?.closedAt
    );
    const showFindWinnerButton = canFindWinner; // Show button if eligible

    // 5. Show "Organizer Rating": Only for participants (not organizers), when event is `Completed`.
    const showParticipantOrganizerRating = computed(() =>
      !canManageEvent.value && // Participants are not managers
      isParticipant.value &&  // Must be a participant
      props.event?.status === EventStatus.Completed &&
      !props.event?.closedAt
      // Note: Original template showed this when ratings were open. Rule 5 doesn't specify. Assuming it's available once completed.
    );

    // 6. Show "Winner Selection": For any participant (including organizers), when event is `Completed`, not closed, and ratings are open.
    const showParticipantWinnerSelection = computed(() =>
      isParticipant.value &&  // Must be a participant (organizer or not)
      props.event?.status === EventStatus.Completed &&
      !props.event?.closedAt &&
      props.event?.ratingsOpen === true // Explicitly check if open
    );

    // 7. Show "Close Event": Only for organizers, when event is `Completed`, ratings are closed, and winners are selected.
    const showCloseEventButton = computed(() =>
      canManageEvent.value &&
      props.event?.status === EventStatus.Completed &&
      ratingsAreClosed.value && // Explicitly check if closed
      hasWinners.value && // Winners must be selected
      !props.event?.closedAt
    );

    // Show Cancel Button (Not explicitly in rules, but common)
    const showCancelButton = computed(() =>
      canManageEvent.value &&
      [EventStatus.Approved, EventStatus.InProgress].includes(props.event?.status as EventStatus) &&
      !props.event?.closedAt
    );

    // Show Edit Button: Only for organizers, before event is completed/cancelled/closed
    const showEditButton = computed(() =>
      canManageEvent.value &&
      ![EventStatus.Completed, EventStatus.Cancelled, EventStatus.Closed].includes(props.event?.status as EventStatus) &&
      !props.event?.closedAt
    );

    const goToEditEvent = () => {
      // Use EditEvent route instead of RequestEvent
      router.push({ name: 'EditEvent', params: { eventId: props.event.id } });
    };

    // --- Overall Visibility ---
    const shouldShowControls = computed(() =>
        canManageEvent.value ||
        showParticipantOrganizerRating.value ||
        showParticipantWinnerSelection.value
    );

    // --- Section Visibility ---
     const showStatusManagementSection = computed(() =>
        canManageEvent.value &&
        (showStartButton.value || showMarkCompleteButton.value || showCancelButton.value || showEditButton.value)
     );

     const showRatingsClosingSection = computed(() =>
        (canManageEvent.value && (showOpenRatingsButton.value || showCloseRatingsButton.value || showFindWinnerButton.value || showCloseEventButton.value)) ||
        showParticipantWinnerSelection.value ||
        showParticipantOrganizerRating.value
     );

    // --- Actions ---
    const isActionLoading = (action: EventStatus | 'openRatings' | 'closeRatings' | 'findWinner' | 'closeEvent') => loadingAction.value === action;

    const updateStatus = async (newStatus: EventStatus) => {
      if (loadingAction.value) return;
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
        // Emit update event for parent to refresh
        emit('update');
      } catch (error: any) {
        store.dispatch('notification/showNotification', {
          message: error?.message || `Failed to update status to ${newStatus}.`,
          type: 'error'
        }, { root: true });
      } finally {
        loadingAction.value = null;
      }
    };

    const toggleRatings = async (openState: boolean) => {
        if (loadingAction.value) return;
        loadingAction.value = openState ? 'openRatings' : 'closeRatings';
        try {
            const result = await store.dispatch('events/toggleRatingsOpen', {
                eventId: props.event.id,
                open: openState
            });
            if (result?.status === 'success') {
                store.dispatch('notification/showNotification', {
                    message: `Ratings are now ${openState ? 'Open' : 'Closed'}.`,
                    type: 'success'
                }, { root: true });
                emit('update');
            } else {
                 throw new Error(result?.message || 'Failed to toggle ratings.');
            }
        } catch (error: any) {
            store.dispatch('notification/showNotification', {
                message: error?.message || 'Failed to toggle ratings status.',
                type: 'error'
            }, { root: true });
        } finally {
            loadingAction.value = null;
        }
    };

    const confirmCancel = async () => {
      if (window.confirm('Are you sure you want to cancel this event? This action cannot be undone.')) {
        await updateStatus(EventStatus.Cancelled);
      }
    };

    const confirmCloseEvent = () => {
      if (window.confirm('Are you sure you want to permanently close this event and award XP? This action cannot be reopened.')) {
        closeEventAction();
      }
    };

    const calculateTotalXP = (xpMap: Record<string, Record<string, number>> | null | undefined): number => {
      if (!xpMap) return 0;
      return Object.values(xpMap).reduce((userSum, roles) =>
        userSum + Object.values(roles).reduce((roleSum, xp) => roleSum + (Number(xp) || 0), 0)
      , 0);
    };

    const closeEventAction = async () => {
        if (loadingAction.value || isClosingEvent.value) return;
        loadingAction.value = 'closeEvent';
        isClosingEvent.value = true;
        try {
            const result = await store.dispatch('events/closeEventPermanently', {
                eventId: props.event.id
            });
            let message = result?.message || 'Event closed permanently.';
            if (result?.success && result?.xpAwarded) {
                const totalUsers = Object.keys(result.xpAwarded).length;
                const totalXP = calculateTotalXP(result.xpAwarded);
                message += ` XP awarded to ${totalUsers} users (Total: ${totalXP} XP).`;
            }
            store.dispatch('notification/showNotification', {
                message,
                type: result?.success ? 'success' : 'warning',
                duration: 6000
            }, { root: true });
            emit('update');
        } catch (error: any) {
            store.dispatch('notification/showNotification', {
                message: error?.message || 'Failed to close the event.',
                type: 'error',
                duration: 5000
            }, { root: true });
        } finally {
            loadingAction.value = null;
            isClosingEvent.value = false;
        }
    };

    const findWinnerAction = async () => {
        if (loadingAction.value) return;
        loadingAction.value = 'findWinner';
        try {
            await store.dispatch('events/findWinner', { eventId: props.event.id });
            store.dispatch('notification/showNotification', {
                message: 'Winner(s) selected successfully.',
                type: 'success'
            }, { root: true });
            emit('update');
        } catch (error: any) {
            store.dispatch('notification/showNotification', {
                message: error?.message || 'Failed to select winner(s).',
                type: 'error'
            }, { root: true });
        } finally {
            loadingAction.value = null;
        }
    };

    return {
      // Computed Visibility Flags
      shouldShowControls,
      showStatusManagementSection,
      showRatingsClosingSection,
      showStartButton,
      showMarkCompleteButton,
      showCancelButton,
      showOpenRatingsButton,
      showCloseRatingsButton,
      showFindWinnerButton,
      canFindWinner,
      showCloseEventButton,
      showParticipantWinnerSelection,
      showParticipantOrganizerRating,
      showEditButton,

      // State & Data
      loadingAction,
      isClosingEvent,
      isWithinEventDates,
      formattedStartDate,
      formattedEndDate,
      statusBadgeClass,
      canManageEvent,
      submissionCount, // Expose for display if needed

      // Methods
      isActionLoading,
      updateStatus,
      toggleRatings,
      confirmCancel,
      confirmCloseEvent,
      findWinnerAction, // Renamed to avoid conflict with computed prop name
      goToEditEvent,
      EventStatus // <-- Add this line to expose EventStatus to the template
    };
  },
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