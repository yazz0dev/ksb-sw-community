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
           {{ isTeamEvent ? 'Select Best Teams and Performer' : 'Select Winners' }}
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

      <!-- Note: Added null check for event -->
      <div v-else-if="!event" class="alert alert-warning" role="alert">
         Event not found or ratings are not open.
      </div>

      <div v-else-if="!hasValidRatingCriteria" class="alert alert-warning" role="alert">
         This event has no valid rating criteria defined. Please contact an event organizer.
      </div>

      <div v-else>
        <div v-if="showCriteriaStats" class="mb-4">
          <div class="card border-info">
            <div class="card-header bg-info-subtle text-info fw-bold">
              Current Selections (Live Stats)
            </div>
            <div class="card-body">
              <div v-for="stat in criteriaStats" :key="stat.constraintIndex" class="mb-3">
                <div class="fw-semibold mb-1">{{ stat.constraintLabel }} ({{ stat.points }} XP)</div>
                <div v-if="stat.selections.length">
                  <ul class="mb-0 ps-3">
                    <li v-for="[name, count] in stat.selections" :key="name">
                      <span class="fw-bold">{{ name }}</span>: {{ count }} vote{{ Number(count) > 1 ? 's' : '' }}
                    </li>
                  </ul>
                </div>
                <div v-else class="text-secondary small fst-italic">No selections yet.</div>
              </div>
            </div>
          </div>
        </div>
        <div v-if="canSubmitSelection" class="card shadow-sm" style="background-color: var(--bs-card-bg); border: 1px solid var(--bs-border-color);">
          <div class="card-body">
            <form @submit.prevent="submitSelection">
              <div class="d-flex flex-column gap-4">
                <template v-if="isTeamEvent">
                  <!-- Team Event Selection Section -->
                  <div>
                    <h5 class="h5 mb-4">Select Best Team per Criterion:</h5>
                    <div class="d-flex flex-column mb-4 gap-3">
                      <div
                        v-for="allocation in sortedXpAllocation"
                        :key="`team-crit-${allocation.constraintIndex}`"
                        class="mb-2"
                      >
                        <label :for="`team-select-${allocation.constraintIndex}`" class="form-label small">{{ allocation.constraintLabel }} ({{ allocation.points }} XP)</label>
                        <select
                          :id="`team-select-${allocation.constraintIndex}`"
                          class="form-select form-select-sm"
                          v-model="teamRatings[`constraint${allocation.constraintIndex}`]"
                          required
                          :disabled="isSubmitting"
                        >
                          <option disabled value="">Select Team...</option>
                          <option
                            v-for="team in (event && event.teams ? event.teams : [])"
                            :key="team.teamName"
                            :value="team.teamName"
                            :disabled="isUserInTeam(team)"
                          >
                            {{ team.teamName }}
                          </option>
                        </select>
                      </div>
                      <!-- Move Best Performer selection into criteria selection -->
                      <div class="mb-2">
                        <label :for="`team-select-best-performer`" class="form-label small">Overall Best Performer</label>
                        <select
                          id="team-select-best-performer"
                          class="form-select form-select-sm"
                          v-model="teamRatings['bestPerformer']"
                          required
                          :disabled="isSubmitting"
                        >
                          <option disabled value="">Select Participant...</option>
                          <option
                            v-for="member in selectableBestPerformers"
                            :key="member.uid"
                            :value="member.uid"
                          >
                            {{ getUserName(member.uid) }} ({{ getTeamNameForMember(member.uid) }})
                          </option>
                        </select>
                      </div>
                    </div>
                  </div>
                </template>
                <template v-else>
                  <!-- Individual Event Selection Section -->
                  <div>
                    <h5 class="h5 mb-4">Select Winners for Each Criterion:</h5>
                    <div class="d-flex flex-column gap-3">
                      <div
                        v-for="allocation in sortedXpAllocation"
                        :key="`ind-crit-${allocation.constraintIndex}`"
                        class="p-3 border rounded bg-light"
                      >
                        <h6 class="h6 mb-3">{{ allocation.constraintLabel }}</h6>
                        <div class="mb-2">
                          <label :for="`winner-select-${allocation.constraintIndex}`" class="form-label small mb-1">Select Winner</label>
                          <select
                            :id="`winner-select-${allocation.constraintIndex}`"
                            class="form-select form-select-sm"
                            v-model="individualRatings[`constraint${allocation.constraintIndex}`]"
                            required
                            :disabled="isSubmitting"
                          >
                            <option value="">Choose winner...</option>
                            <option
                              v-for="participantId in selectableParticipants"
                              :key="`ind-part-${participantId}`"
                              :value="participantId"
                              :disabled="participantId === currentUser.value?.uid"
                            >
                              {{ getUserName(participantId) }}
                            </option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                </template>
                <div class="mt-4 d-grid">
                  <button
                    type="submit"
                    class="btn btn-primary"
                    :disabled="!isValid || isSubmitting"
                  >
                    <span v-if="isSubmitting" class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                    {{ submitButtonText }}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
        <div v-else-if="canFindWinner" class="text-center mt-4">
          <button class="btn btn-success" @click="findWinner" :disabled="isFindingWinner">
            <span v-if="isFindingWinner" class="spinner-border spinner-border-sm me-1"></span>
            Find Winner
          </button>
        </div>
        <div v-else class="alert alert-warning" role="alert">
          You are not authorized to submit selections for this event.
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, reactive } from 'vue';
import { useStore } from 'vuex';
import { useRouter } from 'vue-router';
import { Event, EventFormat, EventStatus, Team, EventCriteria } from '@/types/event';

// --- Types for ratings ---
interface TeamRatings {
  [constraintKey: string]: string; // constraint0: teamName, constraint1: teamName, ...
}
interface IndividualRatings {
  [constraintKey: string]: string; // constraint0: winnerId, constraint1: winnerId, ...
}
  // --- Reactive state for ratings ---
const teamRatings = reactive<TeamRatings>({});
const individualRatings = reactive<IndividualRatings>({});
const isFindingWinner = ref(false);

// Replace existing interfaces with these more specific ones
interface TeamMember {
  uid: string;
  name: string;
}

// Add missing field to Event type locally
interface ExtendedEvent extends Event {
  eventName?: string;
  individualWinnerVotes?: any[]; // Add this line to fix type error
}

// --- Props ---
const props = defineProps({
  eventId: {
    type: String,
    required: true
  },
});

// --- Composables ---
const store = useStore();
const router = useRouter();

// --- Refs and Reactive State ---
const loading = ref<boolean>(true);
const errorMessage = ref<string>('');
const isSubmitting = ref<boolean>(false);
const event = ref<ExtendedEvent | null>(null);
const isTeamEvent = computed(() => event.value?.details?.format === EventFormat.Team); // Updated to use derived field
const eventTeams = ref<Team[]>([]);
const allTeamMembers = ref<TeamMember[]>([]); // Store as { uid, name } objects
const teamMemberMap = ref<Record<string, string>>({}); // Map member UID to team name
const didLoadExistingRating = ref<boolean>(false);

// Using reactive for nested objects that will be modified

// --- Local user name map for fast lookup ---
const userNameMap = ref<Record<string, string>>({});

// --- Use local userNameMap for display ---
const getUserName = (userId: string): string => {
  if (!userId) return 'Unknown User';
  if (userNameMap.value[userId]) return userNameMap.value[userId];
  return 'Anonymous User';
};

// --- Computed Properties ---
const currentUser = computed(() => store.getters['user/getUser']);

const sortedXpAllocation = computed<EventCriteria[]>(() => {
  return event.value?.criteria?.slice().sort((a, b) => a.constraintIndex - b.constraintIndex) || [];
});

const hasValidRatingCriteria = computed<boolean>(() => {
  return sortedXpAllocation.value.length > 0;
});

const isValid = computed<boolean>(() => {
  if (!hasValidRatingCriteria.value) return false;
  const allCriteriaSelected = sortedXpAllocation.value.every(allocation => {
    const ratingKey = `constraint${allocation.constraintIndex}`;
    return isTeamEvent.value
      ? !!teamRatings[ratingKey]
      : !!individualRatings[ratingKey];
  });
  const bestPerformerSelected = isTeamEvent.value ? !!teamRatings['bestPerformer'] : true;
  return allCriteriaSelected && bestPerformerSelected;
});

const availableParticipants = computed<string[]>(() => {
  // Ensure it's not a team event and participants array exists
  if (isTeamEvent.value || !event.value?.participants || !Array.isArray(event.value.participants)) {
      return [];
  }
  // Filter out the current user if they exist
  const currentUserId = currentUser.value?.uid;
  return event.value.participants.filter(pId => pId !== currentUserId);
});

const submitButtonText = computed<string>(() => {
  const action = didLoadExistingRating.value ? 'Update' : 'Submit';
  const target = isTeamEvent.value ? 'Team Selections' : 'Winners';
  return isSubmitting.value ? 'Submitting...' : `${action} ${target}`;
});

const isCurrentUserOrganizer = computed(() => {
  if (!event.value || !currentUser.value?.uid) return false;
  const organizers = event.value.details?.organizers || [];
  const requester = event.value.requestedBy;
  return organizers.includes(currentUser.value.uid) || requester === currentUser.value.uid;
});


const isParticipant = computed(() => {
  if (!event.value || !currentUser.value?.uid) return false;
  if (isTeamEvent.value) {
    return event.value.teams?.some(team => team.members?.includes(currentUser.value.uid));
  } else {
    return event.value.participants?.includes(currentUser.value.uid);
  }
});

const isOrganizer = computed(() => {
  if (!event.value || !currentUser.value?.uid) return false;
  const organizers = event.value.details?.organizers || [];
  const requester = event.value.requestedBy;
  return organizers.includes(currentUser.value.uid) || requester === currentUser.value.uid;
});

const canSubmitSelection = computed(() => {
  // Only participants (including organizers if they are participants) can select
  return isParticipant.value;
});

const canFindWinner = computed(() => {
  // Only organizers or admins can find winner
  return isOrganizer.value ;
});

// Filter out self/team for selection
const selectableBestPerformers = computed(() => {
  if (!allTeamMembers.value || !currentUser.value?.uid) return [];
  return allTeamMembers.value.filter(member => member.uid !== currentUser.value.uid);
});
const selectableParticipants = computed(() => {
  if (!event.value?.participants || !currentUser.value?.uid) return [];
  return event.value.participants.filter(pId => pId !== currentUser.value.uid);
});
const isUserInTeam = (team: Team) => team.members?.includes(currentUser.value?.uid);

// --- Helper Functions ---
const getTeamNameForMember = (memberId: string): string => {
  return teamMemberMap.value[memberId] || 'Unknown Team';
};

// --- Watchers ---
watch([sortedXpAllocation, isTeamEvent], ([allocations, teamEventStatus]) => {
  // Clear previous rating data
  Object.keys(teamRatings).forEach(key => delete teamRatings[key]);
  Object.keys(individualRatings).forEach(key => delete individualRatings[key]);
  teamRatings['bestPerformer'] = '';

  if (Array.isArray(allocations)) {
    allocations.forEach(allocation => {
      const allocationKey = `constraint${allocation.constraintIndex}`;
      if (teamEventStatus) {
        teamRatings[allocationKey] = '';
      } else {
        individualRatings[allocationKey] = '';
      }
    });
  }
}, { immediate: true, deep: true });

// Watch available participants to fetch their names for individual events
watch([availableParticipants, event], async ([participants]) => {
  if (!isTeamEvent.value && Array.isArray(participants) && participants.length > 0) {
    try {
      const names: Record<string, string> = await store.dispatch('user/fetchUserNamesBatch', participants);
      Object.entries(names).forEach(([uid, name]) => {
        userNameMap.value[uid] = name || 'Anonymous User';
      });
    } catch (error) {
      console.error('Error fetching participant names:', error);
    }
  }
}, { immediate: true });

// Watch all team members to fetch their names for team events
watch([allTeamMembers, event], async ([members]) => {
  if (isTeamEvent.value && members.length > 0) {
    const memberIds = members.map(m => m.uid).filter(Boolean);
    if (memberIds.length > 0) {
      try {
        const names: Record<string, string> = await store.dispatch('user/fetchUserNamesBatch', memberIds);
        Object.entries(names).forEach(([uid, name]) => {
          userNameMap.value[uid] = name || 'Anonymous User';
        });
      } catch (error) {
        console.error('Error fetching team member names:', error);
      }
    }
  }
}, { immediate: true }); // Fetch names as soon as members are populated


// --- Core Logic Functions ---
const initializeTeamEventForm = async (eventDetails: Event, loadExisting: boolean = false): Promise<void> => {
  eventTeams.value = eventDetails.teams || [];
  const memberIds = new Set<string>();
  const tempMemberMap: Record<string, string> = {};

  // Build member set and UID -> team name map
  eventTeams.value.forEach(team => {
    (team.members || []).forEach(memberId => {
      if (memberId) {
         memberIds.add(memberId);
         tempMemberMap[memberId] = team.teamName;
      }
    });
  });

  teamMemberMap.value = tempMemberMap; // Assign the map

  // Fetch names for all members
  if (memberIds.size > 0) {
    const userIdsArray = Array.from(memberIds);
    try {
      const names: Record<string, string> = await store.dispatch('user/fetchUserNamesBatch', userIdsArray);
      Object.entries(names).forEach(([uid, name]) => {
        userNameMap.value[uid] = name || 'Anonymous User';
      });
      allTeamMembers.value = userIdsArray
        .map(uid => ({
          uid,
          name: getUserName(uid)
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) {
      console.error('Error fetching team member names:', error);
    }
  }

  // Initialize ratings structure (handled by watcher)

  // Load existing data if applicable
  if (loadExisting) {
      const currentUserId = currentUser.value?.uid;
      const existingRating = eventDetails.teamCriteriaRatings?.find(
        r => r.ratedBy === currentUserId
      );
      if (existingRating?.selections) {
        // Load criteria selections
        Object.entries(existingRating.selections.criteria || {}).forEach(([index, teamName]) => {
           const key = `constraint${index}`;
           if (teamRatings[key] !== undefined) { // Check if the key exists (initialized by watcher)
             teamRatings[key] = teamName || ''; // Ensure empty string if null/undefined
           } else {
             // Handle case where allocation might have changed since rating
             console.warn(`Rating found for non-existent constraint index: ${index}`);
           }
        });
        // Load best performer
        teamRatings['bestPerformer'] = existingRating.selections.bestPerformer || '';
        didLoadExistingRating.value = true; // Mark that existing data was loaded
      } else {
         didLoadExistingRating.value = false; // No existing rating found for user
      }
  } else {
       didLoadExistingRating.value = false; // Explicitly set when not loading existing
  }

  // --- Load previous vote if present ---
  const previousVote = Array.isArray(eventDetails.teamCriteriaRatings)
    ? eventDetails.teamCriteriaRatings.find((v: any) => v.ratedBy === currentUser.value?.uid)
    : null;
  if (previousVote && previousVote.selections) {
    Object.entries(previousVote.selections.criteria || {}).forEach(([index, teamName]) => {
      const key = `constraint${index}`;
      if (teamRatings[key] !== undefined) {
        teamRatings[key] = teamName || '';
      }
    });
    teamRatings['bestPerformer'] = previousVote.selections.bestPerformer || '';
    didLoadExistingRating.value = true;
  } else if (loadExisting) {
    // fallback to legacy/existingRating logic if needed
    // ...existing code for loading from teamCriteriaRatings...
  } else {
    didLoadExistingRating.value = false;
  }
};

const initializeIndividualEventForm = async (eventDetails: Event, loadExisting: boolean = false): Promise<void> => {
  const participantIds = eventDetails.participants || [];

  // Fetch participant names immediately
  if (participantIds.length > 0) {
    try {
      const names: Record<string, string> = await store.dispatch('user/fetchUserNamesBatch', participantIds);
      Object.entries(names).forEach(([uid, name]) => {
        userNameMap.value[uid] = name || 'Anonymous User';
      });
    } catch (error) {
      console.error('Error initializing participant names:', error);
    }
  }

  // Initialize ratings structure (handled by watcher)

  // Load existing data if applicable
  if (loadExisting) {
     // Use criteriaSelections to load previous votes for current user
     let loadedSomething = false;
     const currentUserId = currentUser.value?.uid;
     if (eventDetails.criteria && Array.isArray(eventDetails.criteria)) {
       eventDetails.criteria.forEach(alloc => {
         if (!alloc.criteriaSelections) return;
         const winnerId = alloc.criteriaSelections[currentUserId || ''];
         if (typeof alloc.constraintIndex === 'number') {
           const key = `constraint${alloc.constraintIndex}`;
           if (winnerId && individualRatings[key] !== undefined) {
             individualRatings[key] = winnerId;
             loadedSomething = true;
           }
         }
       });
     }
     didLoadExistingRating.value = loadedSomething;
  } else {
      didLoadExistingRating.value = false;
  }
};

const initializeForm = async (): Promise<void> => {
  const currentUserId = currentUser.value?.uid;

  // --- Initial Checks ---
  if (!currentUserId) {
      errorMessage.value = 'User not logged in.';
      loading.value = false;
      return; // Stop execution if no user
  }

  // Permission checks for rating
  if (isTeamEvent.value) {
    if (!isCurrentUserOrganizer.value) {
      errorMessage.value = 'Only event organizers can submit team ratings and select best performer.';
      loading.value = false;
      return;
    }
  }

  loading.value = true;
  errorMessage.value = '';
  didLoadExistingRating.value = false; // Reset flag

  try {
    // --- Fetch Event Details ---
    // Type casting the result for better intellisense
    const eventDetails = await store.dispatch('events/fetchEventDetails', props.eventId) as Event | null;

    if (!eventDetails) {
      throw new Error('Event not found or not accessible.');
    }
    event.value = eventDetails; // Store fetched details

    // --- Validation Checks ---
    if (eventDetails.status !== EventStatus.Completed) {
      throw new Error('Ratings/Winner selection is only available for completed events.');
    }
    // Use ratingsOpen flag specifically if it exists and is relevant
    if (eventDetails.ratingsOpen === false) { // Check explicitly for false
       throw new Error('Ratings/Winner selection is currently closed for this event.');
    }
    if (!hasValidRatingCriteria.value) { // Check after event loaded and sortedXpAllocation computed
        throw new Error('This event has no valid rating criteria defined.');
    }

    // --- Determine if Loading Existing Data ---
    let shouldLoadExisting = false;
    if (isTeamEvent.value) {
        // Check if *this user* has already submitted criteria ratings
        shouldLoadExisting = eventDetails.teamCriteriaRatings?.some(r => r.ratedBy === currentUserId) ?? false;
         // If you want to block updates uncomment the below:
         // if (shouldLoadExisting) throw new Error('You have already submitted team selections.');

    } else {
        // Check if *any* winners have been selected (implies submission by someone)
        shouldLoadExisting = Object.keys(eventDetails.winnersPerRole || {}).length > 0;
        // If you want to block updates uncomment the below:
        // if (shouldLoadExisting) throw new Error('Winners have already been selected for this event.');
    }

    // --- Initialize Specific Form Type ---
    if (isTeamEvent.value) {
        await initializeTeamEventForm(eventDetails, shouldLoadExisting);
    } else {
        await initializeIndividualEventForm(eventDetails, shouldLoadExisting);
    }

  } catch (error: any) {
    console.error('Error initializing form:', error);
    errorMessage.value = error.message || 'Failed to load rating details.';
    event.value = null; // Clear event data on error
  } finally {
    loading.value = false;
  }
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
    let payload: any;
    let actionName: string;

    if (isTeamEvent.value) {
      // Prepare payload for team event rating (vote)
      const criteriaSelections: Record<string, string> = {};
      sortedXpAllocation.value.forEach(allocation => {
        const key = `constraint${allocation.constraintIndex}`;
        // For team events, value is the team name the user voted for
        criteriaSelections[allocation.constraintIndex.toString()] = teamRatings[key] || '';
      });

      payload = {
        eventId: props.eventId,
        ratingType: 'team_criteria_vote',
        ratedBy: currentUser.value.uid,
        selections: {
          criteria: criteriaSelections,
          bestPerformer: teamRatings['bestPerformer'] || ''
        }
      };
      actionName = 'events/submitTeamCriteriaVote';

    } else {
      // Prepare payload for individual event winner selection (vote)
      // Store in criteriaSelections: { [userId]: winnerId }
      const criteriaSelections: Record<string, string> = {};
      sortedXpAllocation.value.forEach(allocation => {
        const key = `constraint${allocation.constraintIndex}`;
        // For individual events, value is the user ID the user voted for
        criteriaSelections[allocation.constraintIndex.toString()] = individualRatings[key] || '';
      });

      payload = {
        eventId: props.eventId,
        ratingType: 'individual_winner_vote',
        ratedBy: currentUser.value.uid,
        selections: criteriaSelections // This will be stored in criteriaSelections
      };
      actionName = 'events/submitIndividualWinnerVote';
    }

    await store.dispatch(actionName, payload);

    store.dispatch('notification/showNotification', {
        message: `${didLoadExistingRating.value ? 'Update' : 'Submission'} successful!`,
        type: 'success'
    });
    router.push({ name: 'EventDetails', params: { id: props.eventId } });

  } catch (error: any) {
    console.error("selection submission error:", error);
    errorMessage.value = `Submission failed: ${error.message || 'An unknown error occurred'}`;
  } finally {
    isSubmitting.value = false;
  }
};

const findWinner = async () => {
  isFindingWinner.value = true;
  try {
    await store.dispatch('events/findWinner', { eventId: props.eventId });
    // Show notification, refresh event, etc.
  } finally {
    isFindingWinner.value = false;
  }
};

const goBack = (): void => {
  router.back();
};

// --- Computed: Organizer Stats for Criteria Selections ---
const criteriaStats = computed(() => {
  if (!event.value?.criteria) return [];
  return event.value.criteria.map(criterion => {
    // Count votes for each selection (team or participant)
    const counts: Record<string, number> = {};
    if (criterion.criteriaSelections) {
      Object.values(criterion.criteriaSelections).forEach(sel => {
        if (sel) counts[sel] = (counts[sel] || 0) + 1;
      });
    }
    // For display: sort by count desc, then name
    const sorted = Object.entries(counts)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 3) // Only top 3
      .map(([id, count]) => {
        // For team events, show team name; for individual, show user name
        let displayName = id;
        if (isTeamEvent.value) {
          // Try to find the team by name
          const team = event.value?.teams?.find(t => t.teamName === id);
          displayName = team ? team.teamName : id;
        } else {
          displayName = getUserName(id);
        }
        return [displayName, count];
      });
    return {
      constraintLabel: criterion.constraintLabel,
      constraintIndex: criterion.constraintIndex,
      points: criterion.points,
      selections: sorted
    };
  });
});

// --- Show stats only for organizers ---
const showCriteriaStats = computed(() => isCurrentUserOrganizer.value && event.value?.criteria?.length);

// --- Lifecycle Hooks ---
onMounted(async () => {
  await initializeForm();
});

</script>

<style scoped>
/* Styles remain scoped to the template */
.bg-light { /* Ensure bg-light uses theme variables if needed */
    background-color: var(--bs-light) !important;
}
</style>