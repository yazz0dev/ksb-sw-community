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
                        <label :for="`team-select-best-performer`" class="form-label small">Best Performer</label>
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
import { useRouter } from 'vue-router';
import { useUserStore } from '@/store/user';
import { useEventStore } from '@/store/events';
import { useNotificationStore } from '@/store/notification';
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
const userStore = useUserStore();
const eventStore = useEventStore();
const notificationStore = useNotificationStore();
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
const currentUser = computed(() => userStore.currentUser);

const sortedXpAllocation = computed<EventCriteria[]>(() => {
  let criteria = event.value?.criteria;
  if (!criteria) return [];
  // Convert object to array if needed
  if (!Array.isArray(criteria)) {
    criteria = Object.values(criteria);
  }
  return criteria.slice().sort((a, b) => a.constraintIndex - b.constraintIndex);
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
  // Only organizers can find winner
  return isOrganizer.value;
});

// Filter out self/team for selection
const selectableBestPerformers = computed(() => {
  if (!allTeamMembers.value || !currentUser.value?.uid) return [];
  // Find current user's team
  const currentUserTeam = event.value?.teams?.find(team => 
    team.members?.includes(currentUser.value.uid)
  );
  // Filter out members of current user's team and the current user
  return allTeamMembers.value.filter(member => {
    const memberTeam = event.value?.teams?.find(team => 
      team.members?.includes(member.uid)
    );
    return member.uid !== currentUser.value.uid && 
           memberTeam?.teamName !== currentUserTeam?.teamName;
  });
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
    const names: Record<string, string> = await userStore.fetchUserNamesBatch(participants);
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
        const names: Record<string, string> = await userStore.fetchUserNamesBatch(memberIds);
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
const fetchEventDetails = async (): Promise<void> => {
  loading.value = true;
  errorMessage.value = '';
  try {
    await eventStore.fetchEventDetails(props.eventId);
    const eventData = eventStore.currentEventDetails;
    if (!eventData || eventData.status !== EventStatus.Completed || eventData.ratingsOpen !== true) {
      throw new Error('Event not found or ratings are not open.');
    }
    event.value = eventData;
    if (isTeamEvent.value) {
      await initializeTeamEventForm(eventData, true);
    } else {
      await initializeIndividualEventForm(eventData, true);
    }
  } catch (error: any) {
    console.error('Error fetching event details for selection form:', error);
    errorMessage.value = error.message || 'Failed to load event details.';
    event.value = null;
  } finally {
    loading.value = false;
  }
};

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

  teamMemberMap.value = tempMemberMap;

  // Fetch names for all members
  if (memberIds.size > 0) {
    const userIdsArray = Array.from(memberIds);
    try {
      const names: Record<string, string> = await userStore.fetchUserNamesBatch(userIdsArray);
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

  // --- Restore previous selections if present ---
  didLoadExistingRating.value = false;
  const currentUserId = currentUser.value?.uid;

  // Restore all criteria selections for this user
  if (eventDetails.criteria && Array.isArray(eventDetails.criteria)) {
    let loaded = false;
    eventDetails.criteria.forEach(alloc => {
      if (!alloc.criteriaSelections) return;
      const teamName = alloc.criteriaSelections[currentUserId || ''];
      if (typeof alloc.constraintIndex === 'number') {
        const key = `constraint${alloc.constraintIndex}`;
        if (teamName !== undefined && teamRatings[key] !== undefined) {
          teamRatings[key] = teamName;
          loaded = true;
        }
      }
    });
    didLoadExistingRating.value = loaded;
  }

  // Restore best performer selection
  if (eventDetails.bestPerformerSelections?.[currentUserId ?? '']) {
    const bestPerformerId = eventDetails.bestPerformerSelections[currentUserId ?? ''];
    // Validate best performer is from different team
    const currentUserTeam = eventDetails.teams?.find(team => 
      team.members?.includes(currentUserId)
    );
    const bestPerformerTeam = eventDetails.teams?.find(team => 
      team.members?.includes(bestPerformerId)
    );
    if (bestPerformerTeam?.teamName !== currentUserTeam?.teamName) {
      teamRatings['bestPerformer'] = bestPerformerId;
      didLoadExistingRating.value = true;
    }
  }
};

const initializeIndividualEventForm = async (eventDetails: Event, loadExisting: boolean = false): Promise<void> => {
  const participantIds = eventDetails.participants || [];

  // Fetch participant names immediately
  if (participantIds.length > 0) {
   try {
     const names: Record<string, string> = await userStore.fetchUserNamesBatch(participantIds);
     Object.entries(names).forEach(([uid, name]) => {
       userNameMap.value[uid] = name || 'Anonymous User';
     });
   } catch (error) {
     console.error('Error initializing participant names:', error);
   }
  }

  // --- Restore previous selections if present ---
  didLoadExistingRating.value = false;
  const currentUserId = currentUser.value?.uid;

    // For each criterion, check if this user has a previous selection
    if (eventDetails.criteria && Array.isArray(eventDetails.criteria)) {
      let loaded = false;
      eventDetails.criteria.forEach(alloc => {
        if (!alloc.criteriaSelections) return;
        const winnerId = alloc.criteriaSelections[currentUserId || ''];
        if (typeof alloc.constraintIndex === 'number') {
          const key = `constraint${alloc.constraintIndex}`;
          if (winnerId !== undefined && individualRatings[key] !== undefined) {
            individualRatings[key] = winnerId;
            loaded = true;
          }
        }
      });
      didLoadExistingRating.value = loaded;
    }
};


const initializeForm = async (): Promise<void> => {
  loading.value = true;
  errorMessage.value = '';
  try {
    await eventStore.fetchEventDetails(props.eventId);
    const eventData = eventStore.currentEventDetails;
    if (!eventData || eventData.status !== EventStatus.Completed || eventData.ratingsOpen !== true) {
      throw new Error('Event not found or ratings are not open.');
    }
    event.value = eventData;

    // Determine if we should load existing ratings
    let shouldLoadExisting = false;
    const currentUserId = currentUser.value?.uid;
    if (currentUserId && eventData.individualWinnerVotes && Array.isArray(eventData.individualWinnerVotes)) {
        shouldLoadExisting = eventData.individualWinnerVotes.some(vote => vote.ratedBy === currentUserId);
    }

    // --- Initialize Specific Form Type ---
    if (isTeamEvent.value) {
        await initializeTeamEventForm(eventData, shouldLoadExisting);
    } else {
        await initializeIndividualEventForm(eventData, shouldLoadExisting);
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
        criteriaSelections[String(allocation.constraintIndex)] = teamRatings[key] || '';
      });

      // Update payload to use new structure
      payload = {
        eventId: props.eventId,
        ratingType: 'team_criteria_vote',
        ratedBy: currentUser.value.uid,
        selections: {
          criteria: criteriaSelections,
          // Now updates bestPerformerSelections instead of handling in criteria
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
        criteriaSelections[String(allocation.constraintIndex)] = individualRatings[key] || '';
      });

      // Find the winnerId from the selections (should be the selected userId for the first/only criterion)
      const winnerId = Object.values(criteriaSelections).find(v => !!v) || '';
      payload = {
        eventId: props.eventId,
        winnerId,
        vote: true
      };
      actionName = 'events/submitIndividualWinnerVote';
    }

    await eventStore[actionName](payload);

    // Immediately reload event data to reflect update
    await initializeForm();

    notificationStore.showNotification({
        message: 'Selections submitted successfully!',
        type: 'success'
    });
    // Optionally redirect or show success message
    router.push({ name: 'EventDetails', params: { id: props.eventId } });
  } catch (error: any) {
    console.error('Error submitting selection:', error);
    errorMessage.value = error.message || 'Failed to submit selection.';
    notificationStore.showNotification({
        message: 'Failed to submit selection.',
        type: 'error'
    });
  } finally {
    isSubmitting.value = false;
  }
};

const findWinner = async (): Promise<void> => {
  if (!isOrganizer.value) {
    errorMessage.value = 'You are not authorized to find the winner.';
    return;
  }
  if (!event.value?.uid) {
      errorMessage.value = 'Event not loaded.';
      return;
  }

  isFindingWinner.value = true;
  errorMessage.value = '';
  try {
    await eventStore.findWinner(props.eventId);
    notificationStore.showNotification({
        message: 'Winner calculation initiated. Check event details for results.',
        type: 'success'
    });
    // Optionally redirect or show success message
    router.push({ name: 'EventDetails', params: { id: props.eventId } });
  } catch (error: any) {
    console.error('Error finding winner:', error);
    errorMessage.value = error.message || 'Failed to find winner.';
    notificationStore.showNotification({
        message: 'Failed to find winner.',
        type: 'error'
    });
  } finally {
    isFindingWinner.value = false;
  }
};

const goBack = () => {
  router.back();
};

// --- Live Stats Computed Property ---
const criteriaStats = computed(() => {
  if (!event.value?.criteria || !Array.isArray(event.value.criteria)) return [];

  const stats: { constraintIndex: number; constraintLabel: string; points: number; selections: [string, number][] }[] = [];

  event.value.criteria.forEach(criterion => {
    if (typeof criterion.constraintIndex !== 'number' || !criterion.constraintLabel || typeof criterion.points !== 'number') {
        return; // Skip invalid criteria
    }

    const selectionCounts: Record<string, number> = {};
    const totalVotes = event.value?.individualWinnerVotes?.length || 0; // Assuming individualWinnerVotes holds all votes

    if (isTeamEvent.value) {
        // For team events, count votes for each team per criterion
        event.value?.teamCriteriaVotes?.forEach((vote: any) => {
            const teamName = vote.selections?.criteria?.[String(criterion.constraintIndex)];
            if (teamName) {
                selectionCounts[teamName] = (selectionCounts[teamName] || 0) + 1;
            }
        });
    } else {
        // For individual events, count votes for each participant per criterion
         event.value?.individualWinnerVotes?.forEach((vote: any) => {
            // Assuming individualWinnerVotes structure is { ratedBy: string, winnerId: string }
            // And for criterion-specific votes, it might be structured differently or need adaptation
            // For now, let's assume individualWinnerVotes directly represents votes for the *overall* winner
            // If criterion-specific individual votes are needed, the data structure in the store/backend needs to support it.
            // As a fallback, we'll just show total votes if criterion-specific data isn't available.
            // TODO: Adapt this if individual events have criterion-specific voting data
            const winnerId = vote.winnerId; // Assuming winnerId is the selected participant
             if (winnerId) {
                 selectionCounts[getUserName(winnerId)] = (selectionCounts[getUserName(winnerId)] || 0) + 1;
             }
        });
    }


    const sortedSelections = Object.entries(selectionCounts).sort(([, countA], [, countB]) => countB - countA);

    stats.push({
      constraintIndex: criterion.constraintIndex,
      constraintLabel: criterion.constraintLabel,
      points: criterion.points,
      selections: sortedSelections as [string, number][] // Cast to match type
    });
  });

  // Add Best Performer stats for Team events
  if (isTeamEvent.value && event.value?.bestPerformerSelections) {
      const bestPerformerCounts: Record<string, number> = {};
      event.value.teamCriteriaVotes?.forEach((vote: any) => {
          const performerId = vote.selections?.bestPerformer;
          if (performerId) {
              bestPerformerCounts[getUserName(performerId)] = (bestPerformerCounts[getUserName(performerId)] || 0) + 1;
          }
      });
       const sortedBestPerformers = Object.entries(bestPerformerCounts).sort(([, countA], [, countB]) => countB - countA);
       stats.push({
           constraintIndex: -1, // Use a distinct index for Best Performer
           constraintLabel: 'Best Performer',
           points: 10, // Assuming Best Performer is always 10 XP
           selections: sortedBestPerformers as [string, number][]
       });
  }


  return stats;
});

const showCriteriaStats = computed(() => {
    // Show stats if event is loaded, has criteria, and either team votes or individual votes exist
    return !!event.value &&
           Array.isArray(event.value.criteria) &&
           event.value.criteria.length > 0 &&
           ( (isTeamEvent.value && Array.isArray(event.value.teamCriteriaVotes) && event.value.teamCriteriaVotes.length > 0) ||
             (!isTeamEvent.value && Array.isArray(event.value.individualWinnerVotes) && event.value.individualWinnerVotes.length > 0) );
});


// --- Lifecycle Hooks ---
onMounted(initializeForm);

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
</style>