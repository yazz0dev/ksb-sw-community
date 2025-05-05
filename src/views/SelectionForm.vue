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
        <!-- Live Stats Section (Conditional Rendering Improved) -->
        <div v-if="showCriteriaStats && criteriaStats.length > 0" class="mb-4">
          <div class="card border-info">
            <div class="card-header bg-info-subtle text-info fw-bold">
              <i class="fas fa-chart-line me-2"></i> Current Selections (Live Stats)
            </div>
            <div class="card-body">
              <div v-for="stat in criteriaStats" :key="stat.constraintIndex" class="mb-3 pb-2 border-bottom last-of-type:border-bottom-0 last-of-type:pb-0 last-of-type:mb-0">
                <div class="fw-semibold mb-1">
                  {{ stat.constraintLabel || `Criterion ${stat.constraintIndex}` }}
                  <span v-if="stat.points">({{ stat.points }} XP)</span>
                </div>
                <div v-if="stat.selections.length > 0">
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

        <!-- Main Form or Find Winner Button -->
        <div v-if="canSubmitSelection" class="card shadow-sm" style="background-color: var(--bs-card-bg); border: 1px solid var(--bs-border-color);">
          <div class="card-body p-4 p-lg-5">
            <form @submit.prevent="submitSelection">
              <div class="d-flex flex-column gap-4">
                <template v-if="isTeamEvent">
                  <!-- Team Event Selection Section -->
                  <div>
                    <h5 class="h5 mb-4">Select Best Team per Criterion:</h5>
                    <div class="d-flex flex-column mb-4 gap-3">
                      <!-- Iterate over actual criteria -->
                      <div
                        v-for="allocation in sortedXpAllocation.filter(c => c.constraintLabel !== 'Best Performer')"
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
                            v-for="team in eventTeams"
                            :key="team.teamName"
                            :value="team.teamName"
                            :disabled="isUserInTeam(team)"
                          >
                            {{ team.teamName }}
                          </option>
                        </select>
                      </div>
                      <!-- Best Performer Selection (Only for Team Events) -->
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
                             {{ getUserName(member.uid) || member.uid }} ({{ getTeamNameForMember(member.uid) }})
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
                            <option value="" disabled>Choose winner...</option> <!-- Ensure value is "" -->
                            <option
                              v-for="participantId in selectableParticipants"
                              :key="`ind-part-${participantId}`"
                              :value="participantId"
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
        <!-- "Find Winner" button for organizers -->
        <div v-else-if="canFindWinner && event.status === EventStatus.Completed" class="text-center mt-4">
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
import { useRouter } from 'vue-router';
import { useUserStore } from '@/store/user';
import { useEventStore } from '@/store/events';
import { useNotificationStore } from '@/store/notification';
import { Event, EventFormat, EventStatus, Team, EventCriteria } from '@/types/event';
import { BEST_PERFORMER_LABEL } from '@/utils/constants';

// --- Types for ratings ---
interface TeamRatings {
  [constraintKey: string]: string;
}
interface IndividualRatings {
  [constraintKey: string]: string;
}

// --- Reactive state for ratings ---
const teamRatings = reactive<TeamRatings>({});
const individualRatings = reactive<IndividualRatings>({});
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
const event = ref<Event | null>(null);
const isTeamEvent = computed(() => event.value?.details?.format === EventFormat.Team);
const eventTeams = ref<Team[]>([]);
const allTeamMembers = ref<TeamMember[]>([]);
const teamMemberMap = ref<Record<string, string>>({});
const didLoadExistingRating = ref<boolean>(false);

const userNameMap = ref<Record<string, string>>({});

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

const hasValidRatingCriteria = computed<boolean>(() => {
  return sortedXpAllocation.value.length > 0 &&
         event.value?.status === EventStatus.Completed &&
         event.value?.ratingsOpen === true;
});

const isValid = computed<boolean>(() => {
  if (!hasValidRatingCriteria.value) return false;

  const relevantCriteria = sortedXpAllocation.value.filter(allocation =>
    isTeamEvent.value ? allocation.constraintLabel !== BEST_PERFORMER_LABEL : true
  );

  const allCriteriaSelected = relevantCriteria.every(allocation => {
    const ratingKey = `constraint${allocation.constraintIndex}`;
    return isTeamEvent.value
      ? !!teamRatings[ratingKey] && teamRatings[ratingKey] !== ''
      : !!individualRatings[ratingKey] && individualRatings[ratingKey] !== '';
  });

  const bestPerformerSelected = isTeamEvent.value ? (!!teamRatings['bestPerformer'] && teamRatings['bestPerformer'] !== '') : true;

  return allCriteriaSelected && bestPerformerSelected;
});


const availableParticipants = computed<string[]>(() => {
  if (isTeamEvent.value || !event.value?.participants || !Array.isArray(event.value.participants)) {
      return [];
  }
  const currentUserId = currentUser.value?.uid;
  return event.value.participants.filter(pId => pId && (!currentUserId || pId !== currentUserId));
});

const submitButtonText = computed<string>(() => {
  const action = didLoadExistingRating.value ? 'Update' : 'Submit';
  const target = isTeamEvent.value ? 'Team Selections' : 'Winners';
  return isSubmitting.value ? 'Submitting...' : `${action} ${target}`;
});

const isParticipant = computed(() => {
  if (!event.value || !currentUser.value?.uid) return false;
  if (isTeamEvent.value) {
    return event.value.teams?.some(team => team.members?.includes(currentUser.value!.uid));
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
  return isParticipant.value &&
         event.value?.status === EventStatus.Completed &&
         event.value?.ratingsOpen === true;
});

const canFindWinner = computed(() => {
  return isOrganizer.value &&
         event.value?.status === EventStatus.Completed &&
         event.value?.ratingsOpen === false;
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
watch([sortedXpAllocation, isTeamEvent], ([allocations, teamEventStatus]) => {
  Object.keys(teamRatings).forEach(key => delete teamRatings[key]);
  Object.keys(individualRatings).forEach(key => delete individualRatings[key]);
  if (teamEventStatus) {
    teamRatings['bestPerformer'] = '';
  }

  if (Array.isArray(allocations)) {
    allocations.forEach(allocation => {
      if (typeof allocation.constraintIndex === 'number') {
          const allocationKey = `constraint${allocation.constraintIndex}`;
          if (teamEventStatus && allocation.constraintLabel !== BEST_PERFORMER_LABEL) {
              teamRatings[allocationKey] = '';
          } else if (!teamEventStatus) {
              individualRatings[allocationKey] = '';
          }
      }
    });
  }
}, { immediate: true, deep: true });

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
    // Allow loading even if ratings aren't open, control form display later
    // if (eventData.status !== EventStatus.Completed || eventData.ratingsOpen !== true) {
    //    throw new Error('Event ratings are not currently open.');
    // }
    event.value = eventData;

    const currentUid = currentUser.value?.uid ?? null; // Get UID safely
    if (isTeamEvent.value) {
      await initializeTeamEventForm(eventData, currentUid);
    } else {
      await initializeIndividualEventForm(eventData, currentUid);
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
        if (userSelection !== undefined && teamRatings.hasOwnProperty(key)) {
          teamRatings[key] = userSelection; // Restore vote
          loadedFromCriteria = true;
        }
      }
    });
     if (loadedFromCriteria) didLoadExistingRating.value = true;
  }

  // Restore best performer selection
  const bestPerformerSelection = eventDetails.bestPerformerSelections?.[currentUserId];
  // Ensure 'bestPerformer' key exists before assigning
  if (teamRatings.hasOwnProperty('bestPerformer')) {
      if (bestPerformerSelection) {
          const currentUserTeamName = teamMemberMap.value[currentUserId];
          const bestPerformerTeamName = teamMemberMap.value[bestPerformerSelection];
          if (bestPerformerTeamName !== currentUserTeamName) {
              teamRatings['bestPerformer'] = bestPerformerSelection;
              didLoadExistingRating.value = true;
          } else {
              console.warn("Stored best performer selection is invalid (same team). Resetting.");
              teamRatings['bestPerformer'] = ''; // Reset if invalid
          }
      } else {
          teamRatings['bestPerformer'] = ''; // Ensure it's reset if not found
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
          if (winnerId !== undefined && individualRatings.hasOwnProperty(key)) {
            individualRatings[key] = winnerId;
            loaded = true;
          }
        }
      });
      if (loaded) didLoadExistingRating.value = true;
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
    if (isTeamEvent.value) {
        const criteriaPayload: Record<string, string> = {};
        sortedXpAllocation.value
          .filter(alloc => alloc.constraintLabel !== BEST_PERFORMER_LABEL && typeof alloc.constraintIndex === 'number')
          .forEach(allocation => {
            const key = `constraint${allocation.constraintIndex}`;
            // FIX: Use || '' to ensure string type for payload
            criteriaPayload[String(allocation.constraintIndex)] = teamRatings[key] || '';
          });

        const payload = {
            eventId: props.eventId,
            selections: {
                criteria: criteriaPayload,
                // FIX: Use fallback || undefined for bestPerformer to match expected type string | undefined
                bestPerformer: teamRatings['bestPerformer'] || undefined
            }
        };
        await eventStore.submitTeamCriteriaVote(payload);
    } else {
         const winnerSelections: Record<string, string> = {};
         sortedXpAllocation.value
             .filter(alloc => typeof alloc.constraintIndex === 'number')
             .forEach(allocation => {
                const key = `constraint${allocation.constraintIndex}`;
                // FIX: Use || '' to ensure string type for payload
                winnerSelections[String(allocation.constraintIndex)] = individualRatings[key] || '';
             });

        const payload = {
            eventId: props.eventId,
            winnerSelections: winnerSelections
        };
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

const findWinner = async (): Promise<void> => {
  if (!isOrganizer.value) {
    errorMessage.value = 'You are not authorized to find the winner.';
    return;
  }
  if (!event.value?.id) {
      errorMessage.value = 'Event not loaded.';
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
  router.back();
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
                constraintIndex: -1,
                constraintLabel: BEST_PERFORMER_LABEL,
                points: 10, // Assume fixed points
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
    if (!isParticipant.value) {
        return "Only event participants can submit selections.";
    }
    if (event.value?.status !== EventStatus.Completed) {
        return "Selections can only be submitted after the event is marked as 'Completed'.";
    }
    if (event.value?.ratingsOpen !== true) {
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