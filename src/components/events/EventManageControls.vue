<template>
  <div class="event-manage-controls">
    <!-- Voting & Closing Section -->
    <div v-if="showVotingClosingSection" class="section-card shadow-sm rounded-4 p-3 p-md-4 mb-4 animate-fade-in">
      <div class="section-header mb-4">
        <div class="d-flex justify-content-between align-items-start align-items-md-center flex-column flex-md-row gap-2">
          <h3 class="h5 h4-md text-dark mb-0">
            <i class="fas fa-vote-yea text-primary me-2"></i>
            Event Management
          </h3>
          <span class="badge rounded-pill small" :class="statusBadgeClass">{{ event.status }}</span>
        </div>
      </div>
      
      <div class="action-buttons-grid">
        <!-- Award Points Button -->
        <button
          v-if="showAwardPointsButton"
          type="button"
          class="btn btn-primary action-btn"
          @click="goToAwardPoints"
        >
          <i class="fas fa-award me-2"></i>
          <span>Award Points</span>
        </button>

        <!-- Edit Event Button -->
        <button
          v-if="showEditButton"
          type="button"
          class="btn btn-outline-primary action-btn"
          @click="goToEditEvent"
        >
          <i class="fas fa-edit me-2"></i>
          <span>Edit Event</span>
        </button>
      </div>
    </div>

    <!-- Voting & Closing Section -->
    <div v-if="showVotingClosingSection" class="section-card shadow-sm rounded-4 p-3 p-md-4 mb-4 animate-fade-in">
      <div class="section-header mb-4">
        <div class="d-flex justify-content-between align-items-start align-items-md-center flex-column flex-md-row gap-2">
          <h3 class="h5 h4-md text-dark mb-0">
            <i class="fas fa-vote-yea text-primary me-2"></i>
          Voting, XP & Closing
          </h3>
        <div class="d-flex flex-column flex-md-row align-items-md-center gap-1 gap-md-2">
            <span v-if="event.status === EventStatus.Completed" class="badge rounded-pill small"
                  :class="event.votingOpen ? 'bg-success-subtle text-success-emphasis' : 'bg-secondary-subtle text-secondary-emphasis'">
              <i :class="event.votingOpen ? 'fas fa-lock-open' : 'fas fa-lock'" class="me-1"></i>
              Voting: {{ event.votingOpen ? 'Open' : 'Closed' }}
            </span>
            <span v-if="event.status === EventStatus.Completed && event.xpAwardingStatus" class="badge rounded-pill small" :class="xpStatusBadgeClass">
                <i :class="xpStatusIconClass" class="me-1"></i>
                XP: {{ event.xpAwardingStatus }}
            </span>
        </div>

        </div>
      </div>
      
      <div class="action-buttons-grid">
        <!-- Open Voting Button -->
        <button
          v-if="showOpenVotingButton"
          type="button"
          class="btn btn-success action-btn"
          :disabled="isActionLoading('openVoting')"
          @click="toggleVoting(true)"
        >
          <span v-if="isActionLoading('openVoting')" class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
          <i v-else class="fas fa-lock-open me-2"></i>
          <span>Open Voting</span>
        </button>
        
        <!-- Close Voting Button -->
        <button
          v-if="showCloseVotingButton"
          type="button"
          class="btn btn-warning action-btn"
          :disabled="isActionLoading('closeVoting')"
          @click="toggleVoting(false)"
        >
          <span v-if="isActionLoading('closeVoting')" class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
          <i v-else class="fas fa-lock me-2"></i>
          <span>Close Voting</span>
        </button>
        
        <!-- Find Winner Button -->
        <button
          v-if="showFindWinnerButton"
          type="button"
          class="btn btn-primary action-btn"
          :disabled="submissionCount < 10 || isActionLoading('findWinner')"
          @click="findWinnerAction"
        >
          <span v-if="isActionLoading('findWinner')" class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
          <i v-else class="fas fa-trophy me-2"></i>
          <span>Find Winner</span>
        </button>
        
        <!-- Manually Select Winners Button -->
        <button
          v-if="showManualSelectWinnerButton"
          type="button"
          class="btn btn-info action-btn"
          :disabled="isActionLoading('manualSelectWinner')"
          @click="goToManualSelectWinner"
          :title="manualSelectButtonTitle"
        >
          <span v-if="isActionLoading('manualSelectWinner')" class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
          <i v-else class="fas fa-edit me-2"></i>
          <span>{{ manualSelectButtonText }}</span>
        </button>
        
        <!-- Close Event Button -->
        <button
          v-if="showCloseEventButton"
          type="button"
          class="btn btn-outline-danger action-btn"
          :disabled="isClosingEvent || isActionLoading('closeEvent')"
          @click="showCloseEventModal"
          title="Permanently close event and award XP"
        >
          <span v-if="isClosingEvent || isActionLoading('closeEvent')" class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
          <i v-else class="fas fa-archive me-2"></i>
          <span>{{ isClosingEvent ? 'Closing...' : 'Close Permanently' }}</span>
        </button>

        <!-- Award XP Button -->
        <button
          v-if="showAwardXpButton"
          type="button"
          class="btn btn-info action-btn"
          :disabled="isActionLoading('awardXP')"
          @click="awardXpAction"
          title="Calculate and award XP to participants"
        >
          <span v-if="isActionLoading('awardXP')" class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
          <i v-else class="fas fa-star-half-alt me-2"></i>
          <span>Award XP</span>
        </button>
      </div>
      
      <!-- Info Messages -->
      <div class="info-section mt-4">
        <div v-if="showFindWinnerButton && submissionCount < 10" class="alert alert-warning d-flex align-items-center">
          <i class="fas fa-exclamation-triangle me-2"></i>
          <div>
            <strong>Insufficient submissions:</strong>
            At least 10 votes are required to find winners (currently {{ submissionCount }}).
          </div>
        </div>
        
        <div v-if="showOpenVotingButton" class="info-card">
          <i class="fas fa-info-circle text-info me-2"></i>
          <span class="text-secondary">Open voting to allow participants to vote for projects/teams and select winners.</span>
        </div>
        
        <div v-if="showCloseVotingButton" class="info-card">
          <i class="fas fa-info-circle text-info me-2"></i>
          <span class="text-secondary">Close voting once all selections/feedback are submitted. Required before permanently closing event.</span>
        </div>
        
        <div v-if="showManualSelectWinnerButton" class="info-card">
          <i class="fas fa-info-circle text-info me-2"></i>
          <span class="text-secondary">Manually set or override the winners for each criteria. Useful if vote-based calculation needs adjustment.</span>
        </div>
        
        <div v-if="showCloseEventButton" class="info-card">
          <i class="fas fa-info-circle text-info me-2"></i>
          <span class="text-secondary">Voting must be closed and winners selected before permanently closing the event and awarding XP.</span>
        </div>
      </div>
    </div>

    <!-- Cancel Event Confirmation Modal -->
    <ConfirmationModal
      ref="cancelModalRef"
      modal-id="cancelEventModal"
      title="Cancel Event"
      message="Are you sure you want to cancel this event? This action cannot be undone and all participants will be notified."
      confirm-text="Cancel Event"
      cancel-text="Keep Event"
      variant="danger"
      @confirm="confirmCancel"
    />

    <!-- Close Event Confirmation Modal -->
    <ConfirmationModal
      ref="closeEventModalRef"
      modal-id="closeEventModal"
      title="Close Event Permanently"
      message="Are you sure you want to permanently close this event and award XP? This action cannot be reopened."
      confirm-text="Close & Award XP"
      cancel-text="Keep Open"
      variant="warning"
      @confirm="confirmCloseEvent"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useProfileStore } from '@/stores/profileStore';
import { EventStatus, EventFormat, type Event } from '@/types/event';
import { getEventStatusBadgeClass } from '@/utils/eventUtils';
import {
  isEventOrganizer,
  isEventEditable,
} from '@/utils/permissionHelpers';

const props = defineProps<{
  event: Event;
}>();

const router = useRouter();
const studentStore = useProfileStore();
const eventStore = useEventStore();
const notificationStore = useNotificationStore();
const loadingAction = ref<EventStatus | 'openVoting' | 'closeVoting' | 'findWinner' | 'closeEvent' | 'manualSelectWinner' | 'awardXP' | null>(null); // Added 'awardXP'
const isClosingEvent = ref(false); // This might be redundant if loadingAction covers 'closeEvent'

const currentUserId = computed<string | null>(() => studentStore.currentStudent?.uid ?? null);

const localIsOrganizer = computed(() => {
  return isEventOrganizer(props.event, currentUserId.value);
});

const statusBadgeClass = computed(() => getEventStatusBadgeClass(props.event?.status));

const showAwardPointsButton = computed(() =>
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

const showOpenVotingButton = computed(() => {
  if (props.event?.details.format === 'Individual' && !props.event.details.isCompetition) {
    return false;
  }
  return localIsOrganizer.value &&
    props.event?.status === EventStatus.Completed &&
    votingIsClosed.value &&
    !props.event?.lifecycleTimestamps?.closedAt
});

const showCloseVotingButton = computed(() => {
    if (props.event?.details.format === 'Individual' && !props.event.details.isCompetition) {
      return false;
    }
    return localIsOrganizer.value &&
      props.event?.status === EventStatus.Completed &&
      props.event?.votingOpen === true &&
      !props.event?.lifecycleTimestamps?.closedAt
});

const canFindWinner = computed(() => {
  if (props.event?.details.format === 'Individual' && !props.event.details.isCompetition) {
    return false;
  }
  return localIsOrganizer.value &&
    props.event?.status === EventStatus.Completed &&
    votingIsClosed.value &&
    !props.event?.lifecycleTimestamps?.closedAt
});

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
  props.event.xpAwardingStatus === 'completed' && // Added XP awarded check
  !props.event?.lifecycleTimestamps?.closedAt
);

const showAwardXpButton = computed(() =>
  localIsOrganizer.value &&
  props.event?.status === EventStatus.Completed &&
  votingIsClosed.value &&
  hasWinners.value &&
  (props.event.xpAwardingStatus !== 'completed' && props.event.xpAwardingStatus !== 'in_progress') &&
  !props.event?.lifecycleTimestamps?.closedAt
);

const showCancelButton = computed(() =>
  localIsOrganizer.value &&
  [EventStatus.Approved, EventStatus.InProgress].includes(props.event?.status as EventStatus) &&
  !props.event?.lifecycleTimestamps?.closedAt
);

const showEditButton = computed(() =>
  localIsOrganizer.value &&
  isEventEditable(props.event?.status)
);

const showVotingClosingSection = computed(() =>
    showAwardPointsButton.value || showEditButton.value
);

const manualSelectButtonText = computed(() => {
    if (props.event?.details.format === 'Individual' && !props.event?.details.isCompetition) {
        return 'Award Points';
    }
    return 'Manual Selection';
});

const manualSelectButtonTitle = computed(() => {
    if (props.event?.details.format === 'Individual' && !props.event?.details.isCompetition) {
        return 'Award points to participants for each criteria';
    }
    return 'Manually set or override winners';
});

const xpStatusBadgeClass = computed(() => {
  switch (props.event?.xpAwardingStatus) {
    case 'completed': return 'bg-success-subtle text-success-emphasis';
    case 'in_progress': return 'bg-info-subtle text-info-emphasis';
    case 'failed': return 'bg-danger-subtle text-danger-emphasis';
    case 'pending':
    default: return 'bg-secondary-subtle text-secondary-emphasis';
  }
});

const xpStatusIconClass = computed(() => {
  switch (props.event?.xpAwardingStatus) {
    case 'completed': return 'fas fa-check-circle';
    case 'in_progress': return 'fas fa-spinner fa-spin';
    case 'failed': return 'fas fa-exclamation-triangle';
    case 'pending':
    default: return 'fas fa-hourglass-start';
  }
});

// --- Actions ---
const isActionLoading = (action: EventStatus | 'openVoting' | 'closeVoting' | 'findWinner' | 'closeEvent' | 'manualSelectWinner' | 'awardXP'): boolean =>
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

const cancelModalRef = ref<InstanceType<typeof ConfirmationModal> | null>(null);
const closeEventModalRef = ref<InstanceType<typeof ConfirmationModal> | null>(null);

const showCancelModal = (): void => {
  cancelModalRef.value?.show();
};

const confirmCancel = async (): Promise<void> => {
  await updateStatus(EventStatus.Cancelled);
};

const showCloseEventModal = (): void => {
  closeEventModalRef.value?.show();
};

const confirmCloseEvent = (): void => {
  closeEventAction();
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
        // Instead of calling non-existent findWinner, use finalizeWinners via manual selection
        await eventStore.submitManualWinnerSelection({ 
          eventId: props.event.id, 
          winnerSelections: {} // Empty object triggers server-side calculation
        });
        emit('update');
    } catch (error: any) {
        // Error notification handled within Pinia action
    } finally {
        loadingAction.value = null;
    }
};

const goToEditEvent = (): void => {
  if (props.event.details.format === EventFormat.MultiEvent) {
    router.push({ name: 'EditMultiEvent', params: { eventId: props.event.id } });
  } else {
    router.push({ name: 'EditEvent', params: { eventId: props.event.id } });
  }
};

const goToAwardPoints = (): void => {
  router.push({ name: 'AwardPoints', params: { id: props.event.id } });
};

const awardXpAction = async (): Promise<void> => {
  if (loadingAction.value) return;
  loadingAction.value = 'awardXP';
  try {
    // This action will be created in eventStore.ts in a later step
    await eventStore.triggerXpAwarding(props.event.id);
    // Notification will be handled within the store action based on outcome
    emit('update'); // To refresh event data which will include xpAwardingStatus
  } catch (error: any) {
    // Errors should ideally be caught and notified within the store action.
    // If not, a generic notification here might be needed.
    notificationStore.showNotification({
      message: error?.message || 'Failed to start XP awarding process.',
      type: 'error'
    });
  } finally {
    loadingAction.value = null;
  }
};
</script>

<style scoped>
.event-manage-controls {
  max-width: 1000px;
  margin: 0 auto;
}

/* Section Styling */
.section-card {
  background: var(--bs-card-bg);
  border: 1px solid var(--bs-border-color);
}

.section-header {
  border-bottom: 1px solid var(--bs-border-color-translucent);
  padding-bottom: 1rem;
  margin-bottom: 1.5rem !important;
}

/* Action Buttons Grid */
.action-buttons-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 0.75rem;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.75rem 1rem;
  font-weight: 500;
  font-size: 0.9rem;
  border-radius: var(--bs-border-radius);
  transition: all 0.2s ease;
  min-height: 2.75rem;
  white-space: nowrap;
}

.action-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: var(--bs-box-shadow);
}

.action-btn:disabled {
  opacity: 0.65;
  transform: none;
}

/* Badge Styling */
.badge {
  padding: 0.4em 0.8em;
  font-size: 0.85rem;
  font-weight: 500;
}

/* Animation */
.animate-fade-in {
  animation: fadeIn 0.5s ease-out forwards;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Responsive Design */
@media (max-width: 768px) {
  .action-buttons-grid {
    grid-template-columns: 1fr;
    gap: 0.5rem;
  }
  
  .action-btn {
    padding: 0.625rem 0.875rem;
    font-size: 0.85rem;
    min-height: 2.5rem;
  }
  
  .section-header {
    padding-bottom: 0.75rem;
    margin-bottom: 1rem !important;
  }
}

@media (max-width: 480px) {
  .section-header .d-flex {
    flex-direction: column !important;
    align-items: flex-start !important;
    gap: 0.75rem;
  }
  
  .action-btn {
    font-size: 0.8rem;
    padding: 0.5rem 0.75rem;
    min-height: 2.25rem;
  }
}
</style>