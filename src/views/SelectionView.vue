<template>
  <div class="selection-view">
    <div class="container-lg">
      <button
        class="btn btn-outline-secondary btn-sm btn-icon mb-4"
        @click="goBack"
      >
        <i class="fas fa-arrow-left me-1"></i>
        <span>Back</span>
      </button>

      <div v-if="!loading && event?.details?.eventName" class="text-center mb-5">
        <h1 class="h2 text-gradient-primary">
           {{ pageTitle }}
        </h1>
        <p class="text-subtitle">
           Event: {{ event?.details?.eventName }}
        </p>
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

      <div v-else-if="!isManualModeActive && !hasValidVotingCriteria" class="alert alert-warning" role="alert">
         This event has no valid voting criteria defined. Please contact an event organizer.
      </div>
      
      <div v-else-if="isManualModeActive && !localIsOrganizer" class="alert alert-danger" role="alert">
        You are not authorized to manually select winners for this event.
      </div>

      <div v-else>
        <!-- Live Stats Section (Visible in both modes for organizers) -->
        <div v-if="showCriteriaStats && criteriaStats.length > 0 && (localIsOrganizer || !isManualModeActive)" class="mb-4">
          <div class="card border-info">
            <div class="card-header bg-info-subtle text-info fw-bold">
              <i class="fas fa-chart-line me-2"></i> {{ isManualModeActive ? 'Current Vote Summary (For Reference)' : 'Current votes (Live Stats)' }}
            </div>
            <div class="card-body">
              <div v-for="stat in criteriaStats" :key="stat.constraintIndex" class="mb-3 pb-2 border-bottom last-of-type:border-bottom-0 last-of-type:pb-0 last-of-type:mb-0">
                <div class="fw-semibold mb-1">
                  {{ stat.title }} <!-- Ensure label is displayed -->
                </div>
                <div v-if="stat.votes.length > 0">
                  <!-- Display votes for the stat -->
                  <ul class="list-unstyled mb-0 ps-2 small">
                    <li v-for="[name, count] in stat.votes" :key="name" class="d-flex justify-content-between">
                      <span class="text-truncate me-2" :title="name">{{ name }}</span>
                      <span class="fw-medium text-primary">{{ count }} vote{{ count > 1 ? 's' : '' }}</span>
                    </li>
                  </ul>
                </div>
                <div v-else class="text-secondary small fst-italic">No votes yet.</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Main Form -->
        <div v-if="canShowForm" class="card shadow-sm">
          <div class="card-body p-4 p-lg-5">
            <form @submit.prevent="isManualModeActive ? submitManualSelection() : submitSelection()">
              <div class="d-flex flex-column gap-4">
                <!-- Team Event Form -->
                <TeamForm 
                  v-if="isTeamEvent"
                  :criteria="sortedXpAllocation"
                  :teams="eventTeams"
                  :team-members="allTeamMembers"
                  :team-member-map="teamMemberMap"
                  :current-user-id="currentUser?.uid || ''"
                  :is-manual-mode="isManualModeActive"
                  :is-submitting="isSubmitting"
                  :existing-votes="teamVoting"
                  :existing-best-performer="teamVoting['bestPerformer'] || ''"
                  :existing-manual-selections="manualSelections"
                  :existing-manual-best-performer="manualBestPerformerSelection"
                  :get-user-name-fn="getUserName"
                  @update:team-voting="updateTeamVoting"
                  @update:manual-selections="updateManualSelections"
                  @update:best-performer="updateBestPerformer"
                />
                
                <!-- Individual Event Form -->
                <IndividualForm
                  v-else
                  :criteria="sortedXpAllocation"
                  :participants="event?.participants || []"
                  :current-user-id="currentUser?.uid || ''"
                  :is-manual-mode="isManualModeActive"
                  :is-submitting="isSubmitting"
                  :existing-votes="individualVoting"
                  :existing-manual-selections="manualSelections"
                  :get-user-name-fn="getUserName"
                  @update:individual-voting="updateIndividualVoting"
                  @update:manual-selections="updateManualSelections"
                />
                
                <div class="mt-4">
                  <button
                    type="submit"
                    class="btn btn-primary w-100"
                    :class="{ 'btn-loading': isSubmitting }"
                    :disabled="isSubmitting || (isManualModeActive ? !isManualSelectionValid : !isValid)"
                  >
                    <span class="btn-text">{{ submitButtonText }}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
        
        <!-- "Find Winner" button for organizers (Not in manual mode) -->
        <div v-else-if="!isManualModeActive && canFindWinner && event.status === EventStatus.Completed" class="text-center mt-4">
          <button class="btn btn-success" :class="{ 'btn-loading': isFindingWinner }" @click="findWinner" :disabled="isFindingWinner">
            <span class="btn-text">Find Winner</span>
          </button>
          <p class="small text-secondary mt-2">Calculate and save winners based on submitted votes.</p>
        </div>
        
        <!-- Message for non-participants/organizers or when not allowed -->
        <div v-else class="alert alert-info text-center" role="alert">
          <i class="fas fa-info-circle me-2"></i>
          {{ getStatusMessage() }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, reactive } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useProfileStore } from '@/stores/profileStore';
import { useEventStore } from '@/stores/eventStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { type Event, EventFormat, EventStatus, type Team, type EventCriteria } from '@/types/event';
import { BEST_PERFORMER_LABEL, BEST_PERFORMER_POINTS } from '@/utils/constants';

// Import the utility functions
import { createManualWinnerPayload, getValidCriteria } from '@/utils/eventDataUtils';
import { 
  isEventOrganizer, 
  isEventParticipant, 
  canCalculateWinners
} from '@/utils/permissionHelpers';

// Import new form components
import TeamForm from '@/components/voting/TeamForm.vue';
import IndividualForm from '@/components/voting/IndividualForm.vue';

// --- Types for Voting ---
interface TeamVoting {
  [constraintKey: string]: string;
}
interface IndividualVoting {
  [constraintKey: string]: string;
}
// For manual selection by organizer
interface ManualSelections {
  [constraintKey: string]: string; // Stores selected team name or participant UID
}

// --- Reactive state for Voting ---
const teamVoting = reactive<TeamVoting>({});
const individualVoting = reactive<IndividualVoting>({});
const manualSelections = reactive<ManualSelections>({}); // For manual mode
const manualBestPerformerSelection = ref<string>(''); // For manual mode (team events)
const isFindingWinner = ref(false);

interface TeamMember {
  uid: string;
  name: string;
}

// --- Props ---
const props = defineProps({
  eventId: {
    type: String,
    required: true
  },
  teamId: { // Add teamId as an optional prop
    type: String,
    required: false,
    default: undefined
  }
});

// --- Composables ---
const studentStore = useProfileStore(); // We'll use the profile store methods for user data
const eventStore = useEventStore();
const notificationStore = useNotificationStore();
const router = useRouter();
const route = useRoute(); // Added useRoute

// --- Refs and Reactive State ---
const loading = ref<boolean>(true);
const errorMessage = ref<string>('');
const isSubmitting = ref<boolean>(false);
const event = ref<Event | null>(null);
const isTeamEvent = computed(() => event.value?.details?.format === EventFormat.Team);
const eventTeams = ref<Team[]>([]);
const allTeamMembers = ref<TeamMember[]>([]);
const teamMemberMap = ref<Record<string, string>>({});
const didLoadExistingRating = ref<boolean>(false);
const didLoadExistingWinnersForManualMode = ref<boolean>(false);

const userNameMap = ref<Record<string, string>>({});

const isManualModeActive = computed(() => route.query.manualMode === 'true' && localIsOrganizer.value);

const pageTitle = computed(() => {
  if (isManualModeActive.value) {
    return 'Manually Select Winners';
  }
  return isTeamEvent.value ? 'Select Best Teams and Performer' : 'Select Winners';
});

const canShowForm = computed(() => {
  if (isManualModeActive.value) {
    return localIsOrganizer.value && event.value?.status === EventStatus.Completed;
  }
  return canSubmitSelection.value;
});


const getUserName = (userId: string): string => {
  if (!userId) return 'Unknown User';
  // Use only the userNameMap since the store methods don't exist
  return userNameMap.value[userId] || `User (${userId.substring(0, 5)}...)`;
};

// --- Computed Properties ---
const currentUser = computed(() => studentStore.currentStudent);

const sortedXpAllocation = computed<EventCriteria[]>(() => {
  let criteria = event.value?.criteria;
  if (!criteria || !Array.isArray(criteria)) return [];
  return [...criteria]
    .filter(c => typeof c?.constraintIndex === 'number')
    .sort((a, b) => (a.constraintIndex ?? Infinity) - (b.constraintIndex ?? Infinity));
});

const hasValidVotingCriteria = computed<boolean>(() => {
  console.log('[SelectionForm] Checking hasValidRatingCriteria...');
  if (!event.value) {
    console.log('[SelectionForm] Event data is not loaded.');
    return false;
  }
  
  console.log('[SelectionForm] Is Manual Mode Active:', isManualModeActive.value);

  // For manual mode, the organizer should be able to see the form if any criteria exist,
  // even if points are 0 or labels are being finalized.
  if (isManualModeActive.value) {
    const manualModeResult = !!(event.value.criteria && event.value.criteria.length > 0);
    console.log('[SelectionForm] Manual Mode: Criteria length > 0:', manualModeResult);
    return manualModeResult;
  }

  // Voting Mode Checks:
  console.log('[SelectionForm] Voting Mode: Event Status:', event.value.status, 'Voting Open:', event.value.votingOpen);
  if (event.value.status !== EventStatus.Completed || event.value.votingOpen !== true) {
    console.log('[SelectionForm] Voting Mode: Event not completed or Voting not open.');
    return false;
  }

  const votableCriteria = getValidCriteria(event.value);
  console.log('[SelectionForm] Voting Mode: Votable Criteria:', JSON.parse(JSON.stringify(votableCriteria)));
  
  if (isTeamEvent.value) {
    console.log('[SelectionForm] Voting Mode: Is Team Event. BEST_PERFORMER_LABEL:', BEST_PERFORMER_LABEL);
    // For team events, we need at least one criterion other than Best Performer
    const teamSpecificVotableCriteria = getValidCriteria(event.value, true); // exclude Best Performer
    const teamResult = teamSpecificVotableCriteria.length > 0;
    console.log('[SelectionForm] Voting Mode: Team Event Result (teamSpecificVotableCriteria.length > 0):', teamResult);
    return teamResult;
  } else {
    // For individual/competition events, any valid criterion is enough
    const individualResult = votableCriteria.length > 0;
    console.log('[SelectionForm] Voting Mode: Individual/Competition Event Result (votableCriteria.length > 0):', individualResult);
    return individualResult;
  }
});

// Improved isValid computed property to prevent self-voting
const isValid = computed<boolean>(() => {
  if (isManualModeActive.value) return true; // Validation for manual mode is separate
  if (!hasValidVotingCriteria.value) return false;

  const relevantCriteria = sortedXpAllocation.value.filter(allocation =>
    isTeamEvent.value ? allocation.title !== BEST_PERFORMER_LABEL : true
  );

  // For individual events, ensure no self-voting
  if (!isTeamEvent.value && currentUser.value?.uid) {
    const selfVote = Object.values(individualVoting).some(
      selection => selection === currentUser.value?.uid
    );
    if (selfVote) return false;
  }

  const allCriteriaSelected = relevantCriteria.every(allocation => {
    const ratingKey = `constraint${allocation.constraintIndex}`;
    return isTeamEvent.value
      ? !!teamVoting[ratingKey] && teamVoting[ratingKey] !== ''
      : !!individualVoting[ratingKey] && individualVoting[ratingKey] !== '';
  });

  const bestPerformerSelected = isTeamEvent.value ? (!!teamVoting['bestPerformer'] && teamVoting['bestPerformer'] !== '') : true;

  return allCriteriaSelected && bestPerformerSelected;
});

const isManualSelectionValid = computed<boolean>(() => {
  if (!isManualModeActive.value) return false;
  if (!sortedXpAllocation.value) return false;

  const relevantCriteria = sortedXpAllocation.value.filter(allocation =>
    isTeamEvent.value ? allocation.title !== BEST_PERFORMER_LABEL : true
  );

  const allCriteriaSelectedManually = relevantCriteria.every(allocation => {
    const ratingKey = `constraint${allocation.constraintIndex}`;
    return !!manualSelections[ratingKey] && manualSelections[ratingKey] !== '';
  });

  const bestPerformerSelectedManually = isTeamEvent.value ? (!!manualBestPerformerSelection.value && manualBestPerformerSelection.value !== '') : true;

  return allCriteriaSelectedManually && bestPerformerSelectedManually;
});


const availableParticipants = computed<string[]>(() => {
  if (isTeamEvent.value || !event.value?.participants || !Array.isArray(event.value.participants)) {
      return [];
  }
  const currentUserId = currentUser.value?.uid;
  return event.value.participants.filter(pId => pId && (!currentUserId || pId !== currentUserId));
});

const submitButtonText = computed<string>(() => {
  if (isManualModeActive.value) {
    return isSubmitting.value ? 'Saving Winners...' : (didLoadExistingWinnersForManualMode.value ? 'Update Winners' : 'Save Winners');
  }
  const action = didLoadExistingRating.value ? 'Update' : 'Submit';
  const target = isTeamEvent.value ? 'Team votes' : 'Winners';
  return isSubmitting.value ? 'Submitting...' : `${action} ${target}`;
});

const localIsParticipant = computed(() => { // Renamed to avoid conflict if isParticipant is used elsewhere
  return event.value && currentUser.value ? isEventParticipant(event.value, currentUser.value.uid) : false;
});

const localIsOrganizer = computed(() => { // Renamed to avoid conflict
  return event.value && currentUser.value ? isEventOrganizer(event.value, currentUser.value.uid) : false;
});

const canSubmitSelection = computed(() => {
  if (isManualModeActive.value) return false; // This is for voting mode
  return localIsParticipant.value && // Use the refactored computed
         event.value?.status === EventStatus.Completed &&
         event.value?.votingOpen === true;
});

const canFindWinner = computed(() => {
  if (isManualModeActive.value) return false; // Not shown in manual mode
  return event.value && currentUser.value ? 
    canCalculateWinners(event.value, currentUser.value.uid) : false;
});



// Event handlers for form components
const updateTeamVoting = (newVoting: TeamVoting) => {
  Object.assign(teamVoting, newVoting);
};

const updateIndividualVoting = (newVoting: IndividualVoting) => {
  Object.assign(individualVoting, newVoting);
};

const updateManualSelections = (newSelections: ManualSelections) => {
  Object.assign(manualSelections, newSelections);
};

const updateBestPerformer = (performerId: string) => {
  manualBestPerformerSelection.value = performerId;
};

// --- Watchers ---
watch([sortedXpAllocation, isTeamEvent, isManualModeActive], ([allocations, teamEventStatus, manualMode]) => {
  Object.keys(teamVoting).forEach(key => delete teamVoting[key]);
  Object.keys(individualVoting).forEach(key => delete individualVoting[key]);
  Object.keys(manualSelections).forEach(key => delete manualSelections[key]);
  manualBestPerformerSelection.value = '';

  if (teamEventStatus) {
    if (!manualMode) teamVoting['bestPerformer'] = '';
    else manualBestPerformerSelection.value = '';
  }

  if (Array.isArray(allocations)) {
    allocations.forEach(allocation => {
      if (typeof allocation.constraintIndex === 'number') {
          const allocationKey = `constraint${allocation.constraintIndex}`;
          if (manualMode) {
            manualSelections[allocationKey] = '';
          } else {
            if (teamEventStatus && allocation.title !== BEST_PERFORMER_LABEL) {
                teamVoting[allocationKey] = '';
            } else if (!teamEventStatus) {
                individualVoting[allocationKey] = '';
            }
          }
      }
    });
  }
});

watch([availableParticipants, event], async ([participants]) => {
  if (!isTeamEvent.value && Array.isArray(participants) && participants.length > 0) {
    const idsToFetch = participants.filter(id => id && !userNameMap.value[id]);
    if (idsToFetch.length > 0) {
        try {
            const names: Record<string, string> = await studentStore.fetchUserNamesBatch(idsToFetch);
            Object.entries(names).forEach(([uid, name]) => {
              // Use fallback here directly
              userNameMap.value[uid] = name || `User (${uid.substring(0, 5)}...)`;
            });
        } catch (error) {
            console.error('Error fetching participant names:', error);
        }
    }
  }
}, { immediate: true, deep: true });


watch([allTeamMembers, event], async ([members]) => {
  if (isTeamEvent.value && members.length > 0) {
    const memberIds = members.map(m => m.uid).filter(Boolean);
    const idsToFetch = memberIds.filter(id => id && !userNameMap.value[id]);
    if (idsToFetch.length > 0) {
      try {
        const names: Record<string, string> = await studentStore.fetchUserNamesBatch(idsToFetch);
        Object.entries(names).forEach(([uid, name]) => {
          // Use fallback here directly
          userNameMap.value[uid] = name || `User (${uid.substring(0, 5)}...)`;
        });
      } catch (error) {
        console.error('Error fetching team member names:', error);
      }
    }
  }
}, { immediate: true, deep: true });


// --- Core Logic Functions ---
const fetchEventDetails = async (): Promise<void> => {
  loading.value = true;
  errorMessage.value = '';
  try {
    await eventStore.fetchEventDetails(props.eventId);
    const eventData = eventStore.currentEventDetails;
    if (!eventData) {
       throw new Error('Event not found.');
    }
    event.value = eventData;

    const currentUid = currentUser.value?.uid ?? null;

    if (isManualModeActive.value) {
      if (!localIsOrganizer.value) {
        throw new Error('You are not authorized to manually select winners.');
      }
      if (eventData.status !== EventStatus.Completed) {
         throw new Error('Manual winner selection is only available for completed events.');
      }
      await initializeFormForManualMode(eventData);
    } else {
      // Allow loading even if Voting aren't open, control form display later
      // if (eventData.status !== EventStatus.Completed || eventData.votingOpen !== true) {
      //    throw new Error('Event Voting are not currently open.');
      // }
      if (isTeamEvent.value) {
        await initializeTeamEventForm(eventData, currentUid);
      } else {
        await initializeIndividualEventForm(eventData, currentUid);
      }
    }
    
    // Fetch user names for dropdowns if event data is available
    if (event.value) {
        const userIdsToFetch = new Set<string>();
        (event.value.participants || []).forEach(id => userIdsToFetch.add(id));
        (event.value.teams || []).forEach(team => (team.members || []).forEach(id => userIdsToFetch.add(id)));
        
        const idsArray = Array.from(userIdsToFetch).filter(Boolean);
        if (idsArray.length > 0) {
            const names = await studentStore.fetchUserNamesBatch(idsArray);
            Object.entries(names).forEach(([uid, name]) => {
                userNameMap.value[uid] = name || `User (${uid.substring(0,5)}...)`;
            });
        }
    }


  } catch (error: any) {
    console.error('Error fetching event details for selection form:', error);
    errorMessage.value = error.message || 'Failed to load event details.';
    event.value = null;
  } finally {
    loading.value = false;
  }
};

const initializeTeamEventForm = async (eventDetails: Event, currentUserId: string | null): Promise<void> => {
  eventTeams.value = eventDetails.teams || [];
  const memberIds = new Set<string>();
  const tempMemberMap: Record<string, string> = {};

  eventTeams.value.forEach(team => {
    (team.members || []).forEach(memberId => {
      if (memberId) {
         memberIds.add(memberId);
         tempMemberMap[memberId] = team.teamName;
      }
    });
  });

  teamMemberMap.value = tempMemberMap;

  // Names are fetched by watcher
  allTeamMembers.value = Array.from(memberIds)
     .map(uid => ({ uid, name: getUserName(uid) }))
     .sort((a, b) => a.name.localeCompare(b.name));


  // --- Restore previous votes if present ---
  didLoadExistingRating.value = false;
  if (!currentUserId) return;

  if (eventDetails.criteria && Array.isArray(eventDetails.criteria)) {
    let loadedFromCriteria = false;
    eventDetails.criteria.forEach(alloc => {
      // Use either votes(if exists) or votes property
      const userSelection = alloc.votes?.[currentUserId];
      if (typeof alloc.constraintIndex === 'number') {
        const key = `constraint${alloc.constraintIndex}`;
        // Check if the key exists in our reactive object before assigning
        if (userSelection !== undefined && teamVoting.hasOwnProperty(key)) {
          teamVoting[key] = userSelection; // Restore vote
          loadedFromCriteria = true;
        }
      }
    });
    if (loadedFromCriteria) didLoadExistingRating.value = true;
  }

  // Restore best performer selection
  const bestPerformerSelection = eventDetails.bestPerformerSelections?.[currentUserId];
  // Ensure 'bestPerformer' key exists before assigning
  if (teamVoting.hasOwnProperty('bestPerformer')) {
      if (bestPerformerSelection) {
          // Allow selecting a performer from the same team if the user is an organizer in manual mode,
          // but for voting mode, it should be different.
          // However, this form initialization is for voting mode or pre-filling for manual.
          // The core logic for preventing self-team best performer vote is in `selectableBestPerformers` in TeamForm.
          // Here, we just load what was saved. If it was an invalid vote, it might get corrected upon next save by the form's logic.
          // For now, simply load it. The form component should handle display/validation.
          teamVoting['bestPerformer'] = bestPerformerSelection;
          didLoadExistingRating.value = true;
      } else {
          teamVoting['bestPerformer'] = ''; // Ensure it's reset if not found
      }
  }
};

const initializeIndividualEventForm = async (eventDetails: Event, currentUserId: string | null): Promise<void> => {
  // Names are fetched by watcher

  // --- Restore previous votes if present ---
  didLoadExistingRating.value = false;
  if (!currentUserId) return;

  if (eventDetails.criteria && Array.isArray(eventDetails.criteria)) {
    let loaded = false;
    eventDetails.criteria.forEach(alloc => {
      // Use either votes(if exists) or votes property
      const winnerId = alloc.votes?.[currentUserId];
      if (typeof alloc.constraintIndex === 'number') {
        const key = `constraint${alloc.constraintIndex}`;
        // Check if the key exists in our reactive object before assigning
        if (winnerId !== undefined && individualVoting.hasOwnProperty(key)) {
          individualVoting[key] = winnerId;
          loaded = true;
        }
      }
    });
    if (loaded) didLoadExistingRating.value = true;
  }
};

const initializeFormForManualMode = async (eventDetails: Event): Promise<void> => {
  eventTeams.value = eventDetails.teams || [];
  const memberIds = new Set<string>();
  const tempMemberMap: Record<string, string> = {};

  eventTeams.value.forEach(team => {
    (team.members || []).forEach(memberId => {
      if (memberId) {
         memberIds.add(memberId);
         tempMemberMap[memberId] = team.teamName;
      }
    });
  });
  teamMemberMap.value = tempMemberMap;
  allTeamMembers.value = Array.from(memberIds)
     .map(uid => ({ uid, name: getUserName(uid) })) // Ensure names are attempted to be resolved
     .sort((a, b) => a.name.localeCompare(b.name));

  loadExistingWinnersForManualMode();
};

const loadExistingWinnersForManualMode = (): void => {
  didLoadExistingWinnersForManualMode.value = false;
  if (!event.value || !event.value.winners) return;

  const winners = event.value.winners;
  let loaded = false;
  sortedXpAllocation.value.forEach(alloc => {
    if (typeof alloc.constraintIndex === 'number') {
      const key = `constraint${alloc.constraintIndex}`;
      const winnerForCriterion = winners[String(alloc.constraintIndex)];
      if (winnerForCriterion && winnerForCriterion.length > 0 && winnerForCriterion[0]) {
        manualSelections[key] = winnerForCriterion[0];
        loaded = true;
      } else {
        manualSelections[key] = ''; // Ensure reset if no winner
      }
    }
  });

  if (isTeamEvent.value) {
    const bestPerformerWinner = winners['bestPerformer'];
    if (bestPerformerWinner && bestPerformerWinner.length > 0 && bestPerformerWinner[0]) {
      manualBestPerformerSelection.value = bestPerformerWinner[0];
      loaded = true;
    } else {
      manualBestPerformerSelection.value = ''; // Ensure reset
    }
  }
  if (loaded) didLoadExistingWinnersForManualMode.value = true;
};


const submitSelection = async (): Promise<void> => {
  if (!isValid.value) {
    errorMessage.value = 'Please complete all votes before submitting.';
    return;
  }
  if (!currentUser.value?.uid) {
    errorMessage.value = 'Cannot submit: User not identified.';
    return;
  }

  isSubmitting.value = true;
  errorMessage.value = '';

  try {
    if (isTeamEvent.value) {
      const bestPerformerVote = teamVoting['bestPerformer'] || undefined;
      const criteriaVotes: Record<string, string> = {};
      for (const key in teamVoting) {
        if (key !== 'bestPerformer' && Object.prototype.hasOwnProperty.call(teamVoting, key)) {
          const vote = teamVoting[key];
          if (vote) { // Ensure vote is not undefined or empty
            criteriaVotes[key] = vote;
          }
        }
      }

      const votePayload: { criteria: Record<string, string>, bestPerformer?: string } = {
        criteria: criteriaVotes
      };

      if (bestPerformerVote) {
        votePayload.bestPerformer = bestPerformerVote;
      }
      
      await eventStore.submitTeamCriteriaVote({ eventId: props.eventId, votes: votePayload });
    } else {
      const individualVotePayload = {
        eventId: props.eventId,
        votes: {
          criteria: individualVoting,
        },
      };
      await eventStore.submitTeamCriteriaVote(individualVotePayload as any);
    }

    notificationStore.showNotification({
      message: 'Votes submitted successfully!',
      type: 'success'
    });
    await fetchEventDetails(); // Reload data after submission
    router.push({ name: 'EventDetails', params: { id: props.eventId } });
  } catch (error: any) {
    console.error('Error submitting selection:', error);
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
  if (!isManualSelectionValid.value) {
    errorMessage.value = 'Please complete all selections before saving.';
    return;
  }
  if (!currentUser.value?.uid || !localIsOrganizer.value) {
    errorMessage.value = 'Cannot submit: User not authorized or not identified.';
    return;
  }

  isSubmitting.value = true;
  errorMessage.value = '';

  try {
    // Use the utility function to create a consistent payload
    const payload = createManualWinnerPayload(
      props.eventId,
      manualSelections,
      isTeamEvent.value ? manualBestPerformerSelection.value : undefined
    );
    
    // Type assertion to match expected interface
    await eventStore.submitManualWinnerSelection(payload as any); // Type assertion as a temporary fix

    notificationStore.showNotification({
      message: 'Winners saved successfully!',
      type: 'success',
    });
    await fetchEventDetails(); // Reload to reflect changes
    router.push({ name: 'EventDetails', params: { id: props.eventId } });

  } catch (error: any) {
    console.error('Error submitting manual winner selection:', error);
    errorMessage.value = error.message || 'Failed to save winners.';
    notificationStore.showNotification({
      message: `Failed to save winners: ${error.message || 'Unknown error'}`,
      type: 'error',
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
  
  if (!canCalculateWinners(event.value, currentUser.value.uid)) {
    errorMessage.value = 'You are not authorized to find the winner.';
    return;
  }

  isFindingWinner.value = true;
  errorMessage.value = '';
  try {
    // The 'findWinner' action is likely a backend process.
    // We can use 'submitManualWinnerSelection' with an empty payload to trigger recalculation,
    // or a dedicated cloud function could be triggered by a status change.
    // For now, let's assume manual selection with current votes is the intended action.
    // This part may need adjustment based on actual backend implementation.
    await eventStore.submitManualWinnerSelection({ eventId: event.value.id, winnerSelections: {} });
    notificationStore.showNotification({
        message: 'Winner calculation initiated. Check event details for results.',
        type: 'success'
    });
    router.push({ name: 'EventDetails', params: { id: event.value.id } });
  } catch (error: any) {
    console.error('Error finding winner:', error);
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

// --- Live Stats Computed Property ---
const criteriaStats = computed(() => {
  if (!event.value?.criteria || !Array.isArray(event.value.criteria)) return [];

  const stats: { constraintIndex: number; title: string; points: number; votes: [string, number][] }[] = [];

  event.value.criteria.forEach(criterion => {
    if (typeof criterion.constraintIndex !== 'number' || criterion.title === BEST_PERFORMER_LABEL) {
        return;
    }

    const selectionCounts: Record<string, number> = {};
    // Use criterion.votes property
    const votes = criterion.votes;
    if (votes && typeof votes === 'object') {
        // Type assertion to fix type error in forEach
        Object.values(votes).forEach((selectedId) => {
            if (selectedId) {
                const displayName = isTeamEvent.value ? selectedId : (getUserName(selectedId) || selectedId);
                selectionCounts[displayName] = (selectionCounts[displayName] || 0) + 1;
            }
        });
    }

    const sortedvotes = Object.entries(selectionCounts).sort(([, countA], [, countB]) => countB - countA);

    stats.push({
      constraintIndex: criterion.constraintIndex,
      title: criterion.title || `Criterion ${criterion.constraintIndex}`,
      points: criterion.points || 0,
      votes: sortedvotes as [string, number][]
    });
  });

  if (isTeamEvent.value && event.value?.bestPerformerSelections) {
      const bestPerformerCounts: Record<string, number> = {};
      Object.values(event.value.bestPerformerSelections).forEach((selectedUserId: string) => {
          if (selectedUserId) {
               const displayName = getUserName(selectedUserId) || selectedUserId;
              bestPerformerCounts[displayName] = (bestPerformerCounts[displayName] || 0) + 1;
          }
      });
       const sortedBestPerformers = Object.entries(bestPerformerCounts).sort(([, countA], [, countB]) => countB - countA);
       if (sortedBestPerformers.length > 0) {
            stats.push({
                constraintIndex: -1, // Special index for Best Performer
                title: "Best Performer", // Explicitly set label for display
                points: BEST_PERFORMER_POINTS, // Use constant for points value
                votes: sortedBestPerformers as [string, number][]
            });
       }
  }

  return stats;
});

const showCriteriaStats = computed(() => {
    if (!event.value || !Array.isArray(event.value.criteria) || event.value.criteria.length === 0) {
        return false;
    }
    // Check if *any* vote exists across all criteria or best performer
    const hasCriteriaVotes = event.value.criteria.some(c => {
        // Use c.votes property
        const votes = c.votes;
        return votes && Object.keys(votes).length > 0;
    });
    const hasBestPerfselection = isTeamEvent.value && event.value.bestPerformerSelections && 
                            Object.keys(event.value.bestPerformerSelections).length > 0;

    return hasCriteriaVotes || hasBestPerfselection;
});

const getStatusMessage = (): string => {
    if (isManualModeActive.value) {
        if (!localIsOrganizer.value) return "You are not authorized to manually select winners.";
        if (event.value?.status !== EventStatus.Completed) return "Manual winner selection is only available for completed events.";
        return "Ready to manually set winners.";
    }
    if (!localIsParticipant.value) {
        return "Only event participants can submit votes.";
    }
    if (event.value?.status !== EventStatus.Completed) {
        return "votes can only be submitted after the event is marked as 'Completed'.";
    }
    if (event.value?.votingOpen !== true) {
        return "The selection period for this event is currently closed.";
    }
    return "You are not currently eligible to submit votes for this event.";
};

// --- Lifecycle Hooks ---
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

.card-header {
  background-color: var(--bs-light);
  border-bottom: 1px solid var(--bs-border-color);
  padding: 1rem 1.5rem;
}

.card-body {
  padding: 1.5rem;
}

/* Style for list items in stats */
.list-unstyled li:not(:last-child) {
    margin-bottom: 0.3rem;
}

.last-of-type\:border-bottom-0:last-of-type {
    border-bottom: 0 !important;
}

.last-of-type\:pb-0:last-of-type {
    padding-bottom: 0 !important;
}

.last-of-type\:mb-0:last-of-type {
    margin-bottom: 0 !important;
}
</style>