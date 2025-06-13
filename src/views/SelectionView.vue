<template>
  <div class="selection-view section-spacing">
    <div class="container-lg">
      <button class="btn btn-outline-secondary btn-sm btn-icon mb-4" @click="goBack">
        <i class="fas fa-arrow-left me-1"></i>
        <span>Back</span>
      </button>

      <div v-if="!loading && event?.details?.eventName" class="text-center mb-5">
        <h1 class="h2 text-gradient-primary">{{ pageTitle }}</h1>
        <p class="text-subtitle">Event: {{ event?.details?.eventName }}</p>
      </div>

      <div v-if="loading" class="d-flex justify-content-center my-5 py-5">
        <div class="spinner-border text-primary" role="status" style="width: 3rem; height: 3rem;">
          <span class="visually-hidden">Loading...</span>
        </div>
      </div>

      <div v-else-if="errorMessage" class="alert alert-danger" role="alert">
        {{ errorMessage }}
      </div>

      <div v-else-if="!event" class="alert alert-warning" role="alert">
        Event not found or voting is not open.
      </div>

      <div v-else-if="!isManualModeActive && hasValidVotingCriteria" class="alert alert-warning" role="alert">
        This event has no valid voting criteria defined. Please contact an event organizer.
      </div>
      
      <div v-else-if="isIndividualEventNonCompetition && !isManualModeActive" class="alert alert-info text-center" role="alert">
        <i class="fas fa-info-circle me-2"></i>
        For non-competition events, points are awarded directly by the organizer. Participant voting is not applicable.
      </div>
      
      <div v-else-if="isManualModeActive && !localIsOrganizer" class="alert alert-danger" role="alert">
        You are not authorized to manually select winners for this event.
      </div>

      <div v-else-if="isIndividualEventCompetition && !isManualModeActive" class="alert alert-info text-center" role="alert">
        <i class="fas fa-info-circle me-2"></i>
        For Individual Competitions, winners are selected manually by organizers. Participant voting is not applicable for awards.
      </div>
      
      <div v-else>
        <!-- Main Form -->
        <div v-if="canShowForm" class="card shadow-sm">
          <div class="card-body p-4 p-lg-5">
            <form @submit.prevent="handleSubmit">
              <div class="d-flex flex-column gap-4">
                <!-- Team Event Form -->
                <TeamForm 
                  v-if="isTeamEvent"
                  :criteria="sortedCriteria"
                  :teams="eventTeams"
                  :team-members="allTeamMembers"
                  :team-member-map="teamMemberMap"
                  :current-user-id="currentUser?.uid || ''"
                  :is-manual-mode="isManualModeActive"
                  :is-submitting="isSubmitting"
                  :existing-votes="teamVoting"
                  :existing-best-performer="teamVoting['bestPerformer'] || ''"
                  :existing-manual-selections="manualWinnerSelectionsAsStrings"
                  :existing-manual-best-performer="manualBestPerformerSelection"
                  :get-user-name-fn="getUserDisplayName"
                  @update:team-voting="updateTeamVoting"
                  @update:manual-selections="updateManualSelections"
                  @update:best-performer="updateBestPerformer"
                />
                
                <!-- Individual Event Form -->
                <IndividualForm
                  v-else
                  :criteria="sortedCriteria"
                  :participants="event?.details?.coreParticipants || []" 
                  :core-participants="event?.details?.coreParticipants || []"
                  :event-format="event?.details?.format || EventFormat.Individual"
                  :is-individual-competition="isIndividualEventCompetition"
                  :current-user-id="currentUser?.uid || ''"
                  :is-manual-mode="isManualModeActive"
                  :is-submitting="isSubmitting"
                  :existing-votes="individualVoting"
                  :existing-manual-selections="manualWinnerSelectionsAsStrings"
                  :get-user-name-fn="getUserDisplayName"
                  @update:individual-voting="updateIndividualVoting"
                  @update:manual-selections="updateManualSelections"
                />
                
                <div class="mt-4">
                  <button
                    type="submit"
                    class="btn btn-primary w-100"
                    :class="{ 'btn-loading': isSubmitting }"
                    :disabled="isSubmitting || !isFormValid"
                  >
                    <span class="btn-text">{{ submitButtonText }}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
        
        <!-- Find Winner Button -->
        <div v-else-if="!isManualModeActive && canFindWinner && event.status === EventStatus.Completed" class="text-center mt-4">
          <button class="btn btn-success" :class="{ 'btn-loading': isFindingWinner }" @click="findWinner" :disabled="isFindingWinner">
            <span class="btn-text">Find Winner</span>
          </button>
          <p class="small text-secondary mt-2">Calculate and save winners based on submitted votes.</p>
        </div>
        
        <!-- Status Message -->
        <div v-else class="alert alert-info text-center" role="alert">
          <i class="fas fa-info-circle me-2"></i>
          {{ getStatusMessage() }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useProfileStore } from '@/stores/profileStore';
import { useEventStore } from '@/stores/eventStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { type Event, EventFormat, EventStatus, type Team, type EventCriteria } from '@/types/event';
import { BEST_PERFORMER_LABEL } from '@/utils/constants';
import { getValidCriteria } from '@/utils/eventDataUtils';
import { isEventOrganizer, canCalculateWinners } from '@/utils/permissionHelpers';

// Import form components
import TeamForm from '@/components/voting/TeamForm.vue';
import IndividualForm from '@/components/voting/IndividualForm.vue';

interface EventWithId extends Event {
  id: string;
}

interface TeamMember {
  uid: string;
  name: string;
}

// Update the type for manualWinnerSelections prop
interface ManualSelections {
  [key: string]: string | string[];
}

const props = defineProps({
  eventId: {
    type: String,
    required: true
  },
  teamId: {
    type: String,
    required: false,
    default: ''
  }
});

// Composables
const studentStore = useProfileStore();
const eventStore = useEventStore();
const notificationStore = useNotificationStore();
const router = useRouter();
const route = useRoute();

// Reactive state
const loading = ref<boolean>(true);
const errorMessage = ref<string>('');
const isSubmitting = ref<boolean>(false);
const isFindingWinner = ref<boolean>(false);
const event = ref<EventWithId | null>(null);

// Team-related state
const eventTeams = ref<Team[]>([]);
const allTeamMembers = ref<TeamMember[]>([]);
const teamMemberMap = ref<Record<string, string>>({});

// Voting state
const teamVoting = ref<Record<string, string>>({});
const individualVoting = ref<Record<string, string>>({});
const manualWinnerSelections = ref<ManualSelections>({});
const manualBestPerformerSelection = ref<string>('');

// User name cache
const userNameCache = ref<Record<string, string>>({});

// Computed property to convert manualWinnerSelections to Record<string, string>
const manualWinnerSelectionsAsStrings = computed<Record<string, string>>(() => {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(manualWinnerSelections.value)) {
    if (Array.isArray(value) && value.length > 0 && value[0]) {
      result[key] = value[0];
    } else if (typeof value === 'string') {
      result[key] = value;
    }
  }
  return result;
});

// Computed properties
const currentUser = computed(() => studentStore.currentStudent);
const isTeamEvent = computed(() => event.value?.details?.format === EventFormat.Team);
const isIndividualEventCompetition = computed(() => 
  event.value?.details?.format === EventFormat.Individual && event.value?.details?.isCompetition === true
);
const isIndividualEventNonCompetition = computed(() => 
  event.value?.details?.format === EventFormat.Individual && event.value?.details?.isCompetition === false
);
const localIsOrganizer = computed(() => {
  return event.value && currentUser.value ? 
    isEventOrganizer(event.value as EventWithId, currentUser.value.uid) : false;
});

const isManualModeActive = computed(() => 
  route.query.manualMode === 'true' && localIsOrganizer.value
);

const pageTitle = computed(() => {
  if (isManualModeActive.value) {
    return isIndividualEventCompetition.value ? 'Manually Select Award Winners' : 'Manually Select Winners';
  }
  return isTeamEvent.value ? 'Select Best Teams and Performer' : 'Select Winners';
});

const sortedCriteria = computed<EventCriteria[]>(() => {
  const criteria = event.value?.criteria;
  if (!criteria || !Array.isArray(criteria)) return [];
  return [...criteria]
    .filter(c => typeof c?.constraintIndex === 'number')
    .sort((a, b) => (a.constraintIndex ?? Infinity) - (b.constraintIndex ?? Infinity));
});

const hasValidVotingCriteria = computed<boolean>(() => {
  if (!event.value) return false;
  
  if (isManualModeActive.value) {
    // For manual mode, check if there are any criteria processed by sortedCriteria.
    return sortedCriteria.value.length > 0;
  }

  // For non-manual mode (voting)
  if (event.value.status !== EventStatus.Completed || event.value.votingOpen !== true) {
    return false;
  }

  const votableCriteria = getValidCriteria(event.value as EventWithId);
  
  if (isTeamEvent.value) {
    const teamSpecificCriteria = getValidCriteria(event.value as EventWithId, true);
    return teamSpecificCriteria.length > 0;
  } else {
    return votableCriteria.length > 0;
  }
});

const localIsParticipant = computed(() => {
  if (!event.value || !currentUser.value) return false;
  
  const currentUserId = currentUser.value.uid;
  
  if (event.value.details.format === EventFormat.MultiEvent && event.value.details.phases) {
    return event.value.details.phases.some(phase => {
      if (phase.format === EventFormat.Team && phase.teams) {
        return phase.teams.some(team => team.members && team.members.includes(currentUserId));
      } else if (phase.format === EventFormat.Individual && phase.coreParticipants) {
        return phase.coreParticipants.includes(currentUserId);
      }
      return false;
    });
  }
  
  if (event.value.details.format === EventFormat.Team && event.value.teams) {
    return event.value.teams.some(team => team.members && team.members.includes(currentUserId));
  }
  
  return (event.value.details.coreParticipants || []).includes(currentUserId);
});

const canShowForm = computed(() => {
  if (isManualModeActive.value) {
    return localIsOrganizer.value && 
           event.value?.status === EventStatus.Completed &&
           hasValidVotingCriteria.value; 
  }

  // if it's an individual non-competition event, participants cannot vote.
  if (isIndividualEventNonCompetition.value) {
    return false;
  }

  return localIsParticipant.value && 
         event.value?.status === EventStatus.Completed &&
         event.value?.votingOpen === true &&
         hasValidVotingCriteria.value;
});

const canFindWinner = computed(() => {
  if (isManualModeActive.value) return false;
  return event.value && currentUser.value ? 
    canCalculateWinners(event.value as EventWithId, currentUser.value.uid) : false;
});

const isFormValid = computed(() => {
  if (!sortedCriteria.value.length) return false;
  
  const relevantCriteria = sortedCriteria.value.filter(allocation =>
    isTeamEvent.value ? allocation.title !== BEST_PERFORMER_LABEL : true
  );

  if (isManualModeActive.value) {
    const allCriteriaSelected = relevantCriteria.every(allocation => {
      const key = `constraint${allocation.constraintIndex}`;
      return !!manualWinnerSelections.value[key];
    });
    const bestPerformerSelected = isTeamEvent.value ? !!manualBestPerformerSelection.value : true;
    return allCriteriaSelected && bestPerformerSelected;
  } else {
    const votingData = isTeamEvent.value ? teamVoting.value : individualVoting.value;
    const allCriteriaSelected = relevantCriteria.every(allocation => {
      const key = `constraint${allocation.constraintIndex}`;
      return !!votingData[key];
    });
    const bestPerformerSelected = isTeamEvent.value ? !!teamVoting.value['bestPerformer'] : true;
    
    // Check for self-voting in individual events
    if (!isTeamEvent.value && currentUser.value?.uid) {
      const hasSelfVote = Object.values(individualVoting.value).some(
        selection => selection === currentUser.value?.uid
      );
      if (hasSelfVote) return false;
    }
    
    return allCriteriaSelected && bestPerformerSelected;
  }
});

const submitButtonText = computed<string>(() => {
  if (isSubmitting.value) return 'Submitting...';
  if (isManualModeActive.value) return 'Save Winners';
  return isTeamEvent.value ? 'Submit Team Votes' : 'Submit Votes';
});

// Helper functions
const getUserDisplayName = (userId: string): string => {
  if (!userId) return 'Unknown User';
  return userNameCache.value[userId] || `User (${userId.substring(0, 5)}...)`;
};

const getStatusMessage = (): string => {
  if (isManualModeActive.value) {
    if (!localIsOrganizer.value) return "You are not authorized to manually select winners.";
    if (event.value?.status !== EventStatus.Completed) return "Manual winner selection is only available for completed events.";
    if (!hasValidVotingCriteria.value) {
      const criteriaType = isIndividualEventCompetition.value ? "awards" : "criteria";
      return `Manual winner selection requires valid ${criteriaType} to be defined for the event. Please contact an administrator.`;
    }
    if (isIndividualEventCompetition.value) return "Ready to manually select award winners for this Individual Competition.";
    return "Ready to manually set winners.";
  }
  
  // Non-manual mode messages
  if (isIndividualEventCompetition.value) { // This case should be caught by a v-else-if in template now
    return "For Individual Competitions, winners are selected manually by organizers.";
  }
  if (!localIsParticipant.value) {
    return "Only event participants can submit votes.";
  }
  if (event.value?.status !== EventStatus.Completed) {
    return "Votes can only be submitted after the event is marked as 'Completed'.";
  }
  if (event.value?.votingOpen !== true) {
    return "The selection period for this event is currently closed.";
  }
  // This specific message for non-manual mode with no criteria is already handled by a v-else-if in the template.
  // if (!hasValidVotingCriteria.value) {
  //   return "This event has no valid voting criteria defined. Please contact an event organizer.";
  // }
  return "You are not currently eligible to submit votes for this event."; // General fallback for voting mode
};

// Event handlers
const updateTeamVoting = (newVoting: Record<string, string>) => {
  teamVoting.value = { ...newVoting };
};

const updateIndividualVoting = (newVoting: Record<string, string>) => {
  individualVoting.value = { ...newVoting };
};

const updateManualSelections = (newSelections: ManualSelections) => {
  manualWinnerSelections.value = { ...newSelections };
};

const updateBestPerformer = (performerId: string) => {
  manualBestPerformerSelection.value = performerId;
};

const handleSubmit = async () => {
  if (isManualModeActive.value) {
    await submitManualSelection();
  } else {
    await submitSelection();
  }
};

// Core functions
const fetchEventDetails = async (): Promise<void> => {
  loading.value = true;
  errorMessage.value = '';
  
  try {
    await eventStore.fetchEventDetails(props.eventId);
    const eventData = eventStore.currentEventDetails;
    if (!eventData) {
      throw new Error('Event not found.');
    }
    
    event.value = { ...eventData, id: props.eventId } as EventWithId;

    // Initialize team data for team events
    if (isTeamEvent.value && eventData.teams) {
      eventTeams.value = eventData.teams;
      const memberIds = new Set<string>();
      const tempMemberMap: Record<string, string> = {};

      eventData.teams.forEach(team => {
        (team.members || []).forEach(memberId => {
          if (memberId) {
            memberIds.add(memberId);
            tempMemberMap[memberId] = team.teamName;
          }
        });
      });

      teamMemberMap.value = tempMemberMap;
      allTeamMembers.value = Array.from(memberIds).map(uid => ({ uid, name: getUserDisplayName(uid) }));
    }

    // Fetch user names
    const userIdsToFetch = new Set<string>();
    (eventData.details.coreParticipants || []).forEach(id => userIdsToFetch.add(id));
    (eventData.teams || []).forEach(team => (team.members || []).forEach(id => userIdsToFetch.add(id)));
    
    const idsArray = Array.from(userIdsToFetch).filter(Boolean);
    if (idsArray.length > 0) {
      try {
        const names = await studentStore.fetchUserNamesBatch(idsArray);
        userNameCache.value = { ...userNameCache.value, ...names };
      } catch (error) {
        // console.error('Error fetching user names:', error);
      }
    }

    // Load existing votes if present
    const currentUserId = currentUser.value?.uid;
    if (currentUserId) {
      // Load criteria votes
      if (eventData.criteriaVotes && eventData.criteriaVotes[currentUserId]) {
        const userVotes = eventData.criteriaVotes[currentUserId];
        if (isTeamEvent.value) {
          teamVoting.value = { ...userVotes };
        } else {
          individualVoting.value = { ...userVotes };
        }
      }

      // Load best performer selection for team events
      if (isTeamEvent.value && eventData.bestPerformerSelections?.[currentUserId]) {
        teamVoting.value['bestPerformer'] = eventData.bestPerformerSelections[currentUserId];
      }

      // Load existing manual selections if in manual mode
      if (isManualModeActive.value && eventData.winners) {
        const winners = eventData.winners;
        const selections: Record<string, string> = {};
        
        sortedCriteria.value.forEach(criterion => {
          if (typeof criterion.constraintIndex === 'number') {
            const key = `constraint${criterion.constraintIndex}`;
            const winnerArray = winners[String(criterion.constraintIndex)];
            if (winnerArray && winnerArray.length > 0 && winnerArray[0]) {
              selections[key] = winnerArray[0];
            }
          }
        });
        
        manualWinnerSelections.value = selections;
        
        if (isTeamEvent.value && winners['bestPerformer']) {
          manualBestPerformerSelection.value = winners['bestPerformer'][0] || '';
        }
      }
    }

  } catch (error: any) {
    // console.error('Error fetching event details:', error);
    errorMessage.value = error.message || 'Failed to load event details.';
    event.value = null;
  } finally {
    loading.value = false;
  }
};

const submitSelection = async (): Promise<void> => {
  if (!currentUser.value?.uid) {
    errorMessage.value = 'Cannot submit: User not identified.';
    return;
  }

  isSubmitting.value = true;
  errorMessage.value = '';

  try {
    if (isTeamEvent.value) {
      const bestPerformerVote = teamVoting.value['bestPerformer'] || undefined;
      const criteriaVotes: Record<string, string> = {};
      
      for (const [key, value] of Object.entries(teamVoting.value)) {
        if (key !== 'bestPerformer' && value) {
          criteriaVotes[key] = value;
        }
      }

      const votePayload = {
        criteria: criteriaVotes,
        ...(bestPerformerVote && { bestPerformer: bestPerformerVote })
      };
      
      await eventStore.submitTeamCriteriaVote({ eventId: props.eventId, votes: votePayload });
    } else {
      await eventStore.submitIndividualWinnerVote({
        eventId: props.eventId,
        votes: { criteria: individualVoting.value }
      });
    }

    notificationStore.showNotification({
      message: 'Votes submitted successfully!',
      type: 'success'
    });
    
    router.push({ name: 'EventDetails', params: { id: props.eventId } });
  } catch (error: any) {
    // console.error('Error submitting selection:', error);
    errorMessage.value = error.message || 'Failed to submit selection.';
    notificationStore.showNotification({
      message: `Failed to submit votes: ${error.message || 'Unknown error'}`,
      type: 'error'
    });
  } finally {
    isSubmitting.value = false;
  }
};

const submitManualSelection = async (): Promise<void> => {
  if (!currentUser.value?.uid || !localIsOrganizer.value) {
    errorMessage.value = 'Cannot submit: User not authorized or not identified.';
    return;
  }

  isSubmitting.value = true;
  errorMessage.value = '';

  try {
    const payload: { eventId: string; winnerSelections: Record<string, string[]> } = {
      eventId: props.eventId,
      winnerSelections: {}
    };

    for (const key in manualWinnerSelections.value) {
      const value = manualWinnerSelections.value[key];
      if (Array.isArray(value)) {
        payload.winnerSelections[key] = value;
      } else if (typeof value === 'string' && value) {
        payload.winnerSelections[key] = [value];
      }
    }

    if (isTeamEvent.value && manualBestPerformerSelection.value) {
      payload.winnerSelections['bestPerformer'] = [manualBestPerformerSelection.value];
    }
    
    await eventStore.submitManualWinnerSelection(payload);

    notificationStore.showNotification({
      message: 'Winners saved successfully!',
      type: 'success'
    });
    
    router.push({ name: 'EventDetails', params: { id: props.eventId } });
  } catch (error: any) {
    // console.error('Error submitting manual winner selection:', error);
    errorMessage.value = error.message || 'Failed to save winners.';
    notificationStore.showNotification({
      message: `Failed to save winners: ${error.message || 'Unknown error'}`,
      type: 'error'
    });
  } finally {
    isSubmitting.value = false;
  }
};

const findWinner = async (): Promise<void> => {
  if (!event.value || !currentUser.value?.uid) {
    errorMessage.value = 'Event not loaded or user not authenticated.';
    return;
  }
  
  if (!canCalculateWinners(event.value as EventWithId, currentUser.value.uid)) {
    errorMessage.value = 'You are not authorized to find the winner.';
    return;
  }

  isFindingWinner.value = true;
  errorMessage.value = '';
  
  try {
    await eventStore.submitManualWinnerSelection({ 
      eventId: event.value.id, 
      winnerSelections: {} as Record<string, string> 
    });
    
    notificationStore.showNotification({
      message: 'Winner calculation initiated. Check event details for results.',
      type: 'success'
    });
    
    router.push({ name: 'EventDetails', params: { id: event.value.id } });
  } catch (error: any) {
    // console.error('Error finding winner:', error);
    errorMessage.value = error.message || 'Failed to find winner.';
    notificationStore.showNotification({
      message: `Failed to find winner: ${error.message || 'Unknown error'}`,
      type: 'error'
    });
  } finally {
    isFindingWinner.value = false;
  }
};

const goBack = () => {
  if (isManualModeActive.value) {
    router.push({ name: 'EventDetails', params: { id: props.eventId } });
  } else {
    router.back();
  }
};

// Initialize on mount
onMounted(fetchEventDetails);
</script>

<style scoped>
.selection-view {
  background-color: var(--bs-body-bg);
  min-height: calc(100vh - var(--navbar-height-mobile));
  padding: 2rem 0 4rem 0;
}

@media (min-width: 992px) {
  .selection-view {
    min-height: calc(100vh - var(--navbar-height-desktop));
  }
}

.card {
  border-radius: var(--bs-border-radius-lg);
  background-color: var(--bs-card-bg);
  border: 1px solid var(--bs-border-color);
}

.card-body {
  padding: 1.5rem;
}
</style>