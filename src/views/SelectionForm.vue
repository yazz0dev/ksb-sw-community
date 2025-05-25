<template>
  <div class="py-5">
    <div class="container-lg">
      <button
        class="btn btn-sm btn-outline-secondary mb-4 d-inline-flex align-items-center"
        @click="goBack"
      >
        <i class="fas fa-arrow-left me-1"></i>
        <span>Back</span>
      </button>

      <div v-if="!loading && event?.details?.eventName" class="text-center mb-5">
        <h1 class="h3">
           {{ pageTitle }}
        </h1>
        <p class="fs-6 text-secondary">
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
              <i class="fas fa-chart-line me-2"></i> {{ isManualModeActive ? 'Current Vote Summary (For Reference)' : 'Current Selections (Live Stats)' }}
            </div>
            <div class="card-body">
              <div v-for="stat in criteriaStats" :key="stat.constraintIndex" class="mb-3 pb-2 border-bottom last-of-type:border-bottom-0 last-of-type:pb-0 last-of-type:mb-0">
                <div class="fw-semibold mb-1">
                  {{ stat.constraintLabel }} <!-- Ensure label is displayed -->
                </div>
                <div v-if="stat.selections.length > 0">
                  <!-- Display selections for the stat -->
                  <ul class="list-unstyled mb-0 ps-2 small">
                    <li v-for="[name, count] in stat.selections" :key="name" class="d-flex justify-content-between">
                      <span class="text-truncate me-2" :title="name">{{ name }}</span>
                      <span class="fw-medium text-primary">{{ count }} vote{{ count > 1 ? 's' : '' }}</span>
                    </li>
                  </ul>
                </div>
                <div v-else class="text-secondary small fst-italic">No selections yet.</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Main Form -->
        <div v-if="canShowForm" class="card shadow-sm" style="background-color: var(--bs-card-bg); border: 1px solid var(--bs-border-color);">
          <div class="card-body p-4 p-lg-5">
            <form @submit.prevent="isManualModeActive ? submitManualSelection() : submitSelection()">
              <div class="d-flex flex-column gap-4">
                <template v-if="isTeamEvent">
                  <!-- Team Event Selection Section -->
                  <div>
                    <h5 class="h5 mb-4">{{ isManualModeActive ? 'Manually Set Best Team & Performer' : 'Select Best Team per Criterion:' }}</h5>
                    <div class="d-flex flex-column mb-4 gap-3">
                      <!-- Iterate over actual criteria -->
                      <div
                        v-for="allocation in sortedXpAllocation.filter(c => c.constraintLabel !== BEST_PERFORMER_LABEL)"
                        :key="`team-crit-${allocation.constraintIndex}`"
                        class="mb-2"
                      >
                        <label :for="`team-select-${allocation.constraintIndex}`" class="form-label small">
                          {{ allocation.constraintLabel }} ({{ allocation.points }} XP<span v-if="allocation.role"> - {{ formatRoleName(allocation.role) }}</span>)
                        </label>
                        <!-- Manual Mode Select -->
                        <select
                          v-if="isManualModeActive"
                          :id="`team-select-manual-${allocation.constraintIndex}`"
                          class="form-select form-select-sm"
                          v-model="manualSelections[`constraint${allocation.constraintIndex}`]"
                          required
                          :disabled="isSubmitting"
                        >
                          <option disabled value="">Select Team...</option>
                          <option
                            v-for="team in eventTeams"
                            :key="`manual-team-${team.teamName}`"
                            :value="team.teamName"
                          >
                            {{ team.teamName }}
                          </option>
                        </select>
                        <!-- Voting Mode Select -->
                        <select
                          v-else
                          :id="`team-select-vote-${allocation.constraintIndex}`"
                          class="form-select form-select-sm"
                          v-model="teamVoting[`constraint${allocation.constraintIndex}`]"
                          required
                          :disabled="isSubmitting"
                        >
                          <option disabled value="">Select Team...</option>
                          <option
                            v-for="team in eventTeams.filter(t => !isUserInTeam(t))"
                            :key="`vote-team-${team.teamName}`"
                            :value="team.teamName"
                          >
                            {{ team.teamName }}
                          </option>
                        </select>
                        <small class="text-muted d-block mt-1" v-if="allocation.role">
                          This criterion targets the {{ formatRoleName(allocation.role) }} role
                        </small>
                      </div>
                      
                      <!-- Best Performer Selection (Only for Team Events) -->
                      <div class="mb-2">
                        <label :for="`team-select-best-performer`" class="form-label small">
                          Best Performer ({{ BEST_PERFORMER_POINTS }} XP)
                        </label>
                        <!-- Manual Mode Best Performer Select -->
                        <select
                          v-if="isManualModeActive"
                          id="team-select-best-performer-manual"
                          class="form-select form-select-sm"
                          v-model="manualBestPerformerSelection"
                          required
                          :disabled="isSubmitting"
                        >
                          <option disabled value="">Select Participant...</option>
                          <option
                            v-for="member in allTeamMembersForManualSelection"
                            :key="`manual-bp-${member.uid}`"
                            :value="member.uid"
                          >
                             {{ getUserName(member.uid) || member.uid }} ({{ getTeamNameForMember(member.uid) }})
                          </option>
                        </select>
                        <!-- Voting Mode Best Performer Select -->
                        <select
                          v-else
                          id="team-select-best-performer-vote"
                          class="form-select form-select-sm"
                          v-model="teamVoting['bestPerformer']"
                          required
                          :disabled="isSubmitting"
                        >
                          <option disabled value="">Select Participant...</option>
                          <option
                            v-for="member in selectableBestPerformers"
                            :key="`vote-bp-${member.uid}`"
                            :value="member.uid"
                          >
                             {{ getUserName(member.uid) || member.uid }} ({{ getTeamNameForMember(member.uid) }})
                          </option>
                        </select>
                        <small class="text-muted d-block mt-1">
                          {{ isManualModeActive ? 'Select the best individual performer.' : 'Select the best individual performer (cannot be from your own team).' }}
                        </small>
                      </div>
                    </div>
                  </div>
                </template>
                <template v-else> <!-- Individual Event -->
                  <div>
                    <h5 class="h5 mb-4">{{ isManualModeActive ? 'Manually Set Winners' : 'Select Winners for Each Criterion:' }}</h5>
                    <div class="d-flex flex-column gap-3">
                      <div
                        v-for="allocation in sortedXpAllocation"
                        :key="`ind-crit-${allocation.constraintIndex}`"
                        class="p-3 border rounded bg-light"
                      >
                        <h6 class="h6 mb-2">
                          {{ allocation.constraintLabel }}
                          <span class="badge bg-primary-subtle text-primary-emphasis ms-2">{{ allocation.points }} XP</span>
                        </h6>
                        <small class="text-muted d-block mb-3" v-if="allocation.role">
                          Role: {{ formatRoleName(allocation.role) }}
                        </small>
                        <div class="mb-2">
                          <label :for="`winner-select-${allocation.constraintIndex}`" class="form-label small mb-1">Select Winner</label>
                          <!-- Manual Mode Select -->
                          <select
                            v-if="isManualModeActive"
                            :id="`winner-select-manual-${allocation.constraintIndex}`"
                            class="form-select form-select-sm"
                            v-model="manualSelections[`constraint${allocation.constraintIndex}`]"
                            required
                            :disabled="isSubmitting"
                          >
                            <option value="" disabled>Choose winner...</option>
                            <option
                              v-for="participantId in allParticipantsForManualSelection"
                              :key="`manual-ind-part-${participantId}`"
                              :value="participantId"
                            >
                              {{ getUserName(participantId) }}
                            </option>
                          </select>
                          <!-- Voting Mode Select -->
                          <select
                            v-else
                            :id="`winner-select-vote-${allocation.constraintIndex}`"
                            class="form-select form-select-sm"
                            v-model="individualVoting[`constraint${allocation.constraintIndex}`]"
                            required
                            :disabled="isSubmitting"
                          >
                            <option value="" disabled>Choose winner...</option>
                            <option
                              v-for="participantId in selectableParticipants"
                              :key="`vote-ind-part-${participantId}`"
                              :value="participantId"
                            >
                              {{ getUserName(participantId) }}
                              <span v-if="participantId === currentUser?.uid">(You - Cannot Select)</span>
                            </option>
                          </select>
                          <small class="text-danger" v-if="!isManualModeActive && individualVoting[`constraint${allocation.constraintIndex}`] === currentUser?.uid">
                            You cannot vote for yourself
                          </small>
                        </div>
                      </div>
                    </div>
                  </div>
                </template>
                <div class="mt-4 d-grid">
                  <button
                    type="submit"
                    class="btn btn-primary"
                    :disabled="isSubmitting || (isManualModeActive ? !isManualSelectionValid : !isValid)"
                  >
                    <span v-if="isSubmitting" class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                    {{ submitButtonText }}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
        
        <!-- "Find Winner" button for organizers (Not in manual mode) -->
        <div v-else-if="!isManualModeActive && canFindWinner && event.status === EventStatus.Completed" class="text-center mt-4">
          <button class="btn btn-success" @click="findWinner" :disabled="isFindingWinner">
            <span v-if="isFindingWinner" class="spinner-border spinner-border-sm me-1"></span>
            Find Winner
          </button>
          <p class="small text-secondary mt-2">Calculate and save winners based on submitted selections.</p>
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
import { useUserStore } from '@/stores/studentProfileStore';
import { useEventStore } from '@/stores/studentEventStore';
import { useNotificationStore } from '@/stores/studentNotificationStore';
import { Event, EventFormat, EventStatus, Team, EventCriteria } from '@/types/event';
import { BEST_PERFORMER_LABEL, BEST_PERFORMER_POINTS } from '@/utils/constants';
import { formatRoleName } from '@/utils/formatters';

// Import the utility functions
import { createTeamVotePayload, createIndividualVotePayload, createManualWinnerPayload, getValidCriteria } from '@/utils/eventDataUtils';
import { 
  isEventOrganizer, 
  isEventParticipant, 
  canUserVoteInEvent,
  canManuallySelectWinners,
  canCalculateWinners
} from '@/utils/permissionHelpers'; // Import additional helpers

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
const userStore = useUserStore();
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

const allParticipantsForManualSelection = computed<string[]>(() => {
  return event.value?.participants || [];
});

const allTeamMembersForManualSelection = computed(() => {
  if (!allTeamMembers.value) return [];
  return allTeamMembers.value; // Already contains {uid, name}
});


const getUserName = (userId: string): string => {
  if (!userId) return 'Unknown User';
  const cachedName = userStore.getCachedUserName(userId);
  if (cachedName) return cachedName;
  return userNameMap.value[userId] || `User (${userId.substring(0, 5)}...)`;
};

// --- Computed Properties ---
const currentUser = computed(() => userStore.currentUser);

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
    isTeamEvent.value ? allocation.constraintLabel !== BEST_PERFORMER_LABEL : true
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
    isTeamEvent.value ? allocation.constraintLabel !== BEST_PERFORMER_LABEL : true
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
  const target = isTeamEvent.value ? 'Team Selections' : 'Winners';
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

const selectableBestPerformers = computed(() => {
  if (!allTeamMembers.value || !currentUser.value?.uid) return [];
  const currentUserTeamName = teamMemberMap.value[currentUser.value.uid];

  return allTeamMembers.value.filter(member => {
    if (member.uid === currentUser.value!.uid) return false;
    const memberTeamName = teamMemberMap.value[member.uid];
    return memberTeamName !== currentUserTeamName;
  });
});

const selectableParticipants = computed(() => {
  if (!event.value?.participants || !currentUser.value?.uid) return [];
  return event.value.participants.filter(pId => pId && pId !== currentUser.value!.uid);
});

const isUserInTeam = (team: Team) => team.members?.includes(currentUser.value?.uid ?? '');

// --- Helper Functions ---
const getTeamNameForMember = (memberId: string): string => {
  return teamMemberMap.value[memberId] || 'Unknown Team';
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
            if (teamEventStatus && allocation.constraintLabel !== BEST_PERFORMER_LABEL) {
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
            const names: Record<string, string> = await userStore.fetchUserNamesBatch(idsToFetch);
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
        const names: Record<string, string> = await userStore.fetchUserNamesBatch(idsToFetch);
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
            const names = await userStore.fetchUserNamesBatch(idsArray);
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


  // --- Restore previous selections if present ---
  didLoadExistingRating.value = false;
  if (!currentUserId) return;

  if (eventDetails.criteria && Array.isArray(eventDetails.criteria)) {
    let loadedFromCriteria = false;
    eventDetails.criteria.forEach(alloc => {
      const userSelection = alloc.criteriaSelections?.[currentUserId];
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
          const currentUserTeamName = teamMemberMap.value[currentUserId];
          const bestPerformerTeamName = teamMemberMap.value[bestPerformerSelection];
          if (bestPerformerTeamName !== currentUserTeamName) {
              teamVoting['bestPerformer'] = bestPerformerSelection;
              didLoadExistingRating.value = true;
          } else {
              console.warn("Stored best performer selection is invalid (same team). Resetting.");
              teamVoting['bestPerformer'] = ''; // Reset if invalid
          }
      } else {
          teamVoting['bestPerformer'] = ''; // Ensure it's reset if not found
      }
  }
};

const initializeIndividualEventForm = async (eventDetails: Event, currentUserId: string | null): Promise<void> => {
  // Names are fetched by watcher

  // --- Restore previous selections if present ---
  didLoadExistingRating.value = false;
  if (!currentUserId) return;

    if (eventDetails.criteria && Array.isArray(eventDetails.criteria)) {
      let loaded = false;
      eventDetails.criteria.forEach(alloc => {
        const winnerId = alloc.criteriaSelections?.[currentUserId];
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
      if (winnerForCriterion && winnerForCriterion.length > 0) {
        manualSelections[key] = winnerForCriterion[0]; // Assuming single winner per criterion for manual override
        loaded = true;
      } else {
        manualSelections[key] = ''; // Ensure reset if no winner
      }
    }
  });

  if (isTeamEvent.value) {
    const bestPerformerWinner = winners['bestPerformer'];
    if (bestPerformerWinner && bestPerformerWinner.length > 0) {
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
    errorMessage.value = 'Please complete all selections before submitting.';
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
        // Use the utility function to create a consistent payload
        const payload = createTeamVotePayload(
          props.eventId, 
          teamVoting, 
          teamVoting['bestPerformer']
        );
        
        await eventStore.submitTeamCriteriaVote(payload);
    } else {
        // Use the utility function to create a consistent payload
        const payload = createIndividualVotePayload(
          props.eventId,
          individualVoting
        );

        await eventStore.submitIndividualWinnerVote(payload);
    }

    notificationStore.showNotification({
        message: 'Selections submitted successfully!',
        type: 'success'
    });
    await fetchEventDetails(); // Reload data after submission
    router.push({ name: 'EventDetails', params: { id: props.eventId } });
  } catch (error: any) {
    console.error('Error submitting selection:', error);
    errorMessage.value = error.message || 'Failed to submit selection.';
    notificationStore.showNotification({
        message: `Failed to submit selection: ${error.message || 'Unknown error'}`,
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
    
    await eventStore.submitManualWinnerSelection(payload);

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
    await eventStore.findWinner(event.value.id);
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

  const stats: { constraintIndex: number; constraintLabel: string; points: number; selections: [string, number][] }[] = [];

  event.value.criteria.forEach(criterion => {
    if (typeof criterion.constraintIndex !== 'number' || criterion.constraintLabel === BEST_PERFORMER_LABEL) {
        return;
    }

    const selectionCounts: Record<string, number> = {};
    if (criterion.criteriaSelections && typeof criterion.criteriaSelections === 'object') {
        Object.values(criterion.criteriaSelections).forEach((selectedId: string) => {
            if (selectedId) {
                const displayName = isTeamEvent.value ? selectedId : (getUserName(selectedId) || selectedId);
                selectionCounts[displayName] = (selectionCounts[displayName] || 0) + 1;
            }
        });
    }

    const sortedSelections = Object.entries(selectionCounts).sort(([, countA], [, countB]) => countB - countA);

    stats.push({
      constraintIndex: criterion.constraintIndex,
      constraintLabel: criterion.constraintLabel || `Criterion ${criterion.constraintIndex}`,
      points: criterion.points || 0,
      selections: sortedSelections as [string, number][]
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
                constraintLabel: "Best Performer", // Explicitly set label for display
                points: BEST_PERFORMER_POINTS, // Use constant for points value
                selections: sortedBestPerformers as [string, number][]
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
    const hasCriteriaVotes = event.value.criteria.some(c => c.criteriaSelections && Object.keys(c.criteriaSelections).length > 0);
    const hasBestPerfVotes = isTeamEvent.value && event.value.bestPerformerSelections && Object.keys(event.value.bestPerformerSelections).length > 0;

    return hasCriteriaVotes || hasBestPerfVotes;
});

const getStatusMessage = (): string => {
    if (isManualModeActive.value) {
        if (!localIsOrganizer.value) return "You are not authorized to manually select winners.";
        if (event.value?.status !== EventStatus.Completed) return "Manual winner selection is only available for completed events.";
        return "Ready to manually set winners.";
    }
    if (!localIsParticipant.value) {
        return "Only event participants can submit selections.";
    }
    if (event.value?.status !== EventStatus.Completed) {
        return "Selections can only be submitted after the event is marked as 'Completed'.";
    }
    if (event.value?.votingOpen !== true) {
        return "The selection period for this event is currently closed.";
    }
    return "You are not currently eligible to submit selections for this event.";
};

// --- Lifecycle Hooks ---
onMounted(fetchEventDetails);

</script>

<style scoped>
.card {
  border-radius: 0.75rem;
}
.card-header {
  background-color: var(--bs-light);
  border-bottom: 1px solid var(--bs-border-color-translucent);
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