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
           {{ isTeamEvent ? 'Rate Teams & Select Best Performer' : 'Select Winners' }}
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
        <div class="card shadow-sm" style="background-color: var(--bs-card-bg); border: 1px solid var(--bs-border-color);">
           <div class="card-body">
              <form @submit.prevent="submitRating">
                 <div class="d-flex flex-column gap-4">
                    <template v-if="isTeamEvent">
                      <!-- Team Event Rating Section -->
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
                               <!-- Added null check for eventTeams -->
                               <option v-for="team in eventTeams" :key="team.teamName" :value="team.teamName">
                                 {{ team.teamName }}
                               </option>
                             </select>
                          </div>
                        </div>

                        <h5 class="h5 mb-3 pt-4 border-top">
                          Select Overall Best Performer:
                        </h5>
                        <p v-if="!allTeamMembers || allTeamMembers.length === 0" class="small text-secondary fst-italic">
                          No participants found in teams.
                        </p>
                        <div v-else>
                          <div class="mb-3">
                             <label for="best-performer-select" class="form-label small mb-1">Select the standout individual participant</label>
                             <select
                               id="best-performer-select"
                               class="form-select form-select-sm"
                               v-model="bestPerformer"
                               required
                               :disabled="isSubmitting"
                             >
                               <option disabled value="">Select Participant...</option>
                               <!-- Note: Assuming member object has uid -->
                               <option v-for="member in allTeamMembers" :key="member.uid" :value="member.uid">
                                 {{ nameCache[member.uid] || member.uid }} ({{ getTeamNameForMember(member.uid) }})
                               </option>
                             </select>
                             <div class="form-text small text-secondary mt-2 d-flex align-items-center">
                                <i class="fas fa-award text-info me-1"></i> Best Performer gets a bonus 10 XP (General)
                             </div>
                          </div>
                        </div>
                      </div>
                    </template>

                    <template v-else>
                      <!-- Individual Event Winner Selection Section -->
                      <div>
                        <h5 class="h5 mb-4">Select Winners for Each Criterion:</h5>
                        <div class="d-flex flex-column gap-3">
                          <div
                            v-for="allocation in sortedXpAllocation"
                            :key="`ind-crit-${allocation.constraintIndex}`"
                            class="p-3 border rounded bg-light"
                          >
                             <h6 class="h6 mb-3">
                               {{ allocation.constraintLabel }}
                             </h6>
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
                                   v-for="participantId in availableParticipants"
                                   :key="`ind-part-${participantId}`"
                                   :value="participantId"
                                 >
                                   {{ nameCache[participantId] || participantId }}
                                 </option>
                               </select>
                               <div v-if="allocation.points" class="form-text small text-secondary mt-2 d-flex align-items-center">
                                 <i class="fas fa-trophy text-warning me-1"></i> Winner gets {{ allocation.points }} XP
                                 <span class="ms-1 text-body-tertiary">({{ formatRoleName(allocation.role) }})</span>
                               </div>
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
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, reactive } from 'vue';
import { useStore } from 'vuex';
import { useRouter } from 'vue-router';
import { Event, EventFormat, EventStatus, Team, EventCriteria } from '@/types/event';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/firebase';

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
const bestPerformer = ref<string>('');

// Replace existing interfaces with these more specific ones
interface TeamMember {
  uid: string;
  name: string;
}

// Add missing field to Event type locally
interface ExtendedEvent extends Event {
  eventName?: string;
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
const nameCache = reactive<Record<string, string>>({}); // Cache for user names { uid: name }

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
  const bestPerformerSelected = isTeamEvent.value ? !!bestPerformer.value : true;
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

// --- Helper Functions ---
const formatRoleName = (roleKey: string | undefined | null): string => {
  if (!roleKey) return '';
  // Improved formatting for camelCase and snake_case
  return roleKey
    .replace(/([A-Z])/g, ' $1') // Add space before uppercase letters
    .replace(/_/g, ' ') // Replace underscores with spaces
    .replace(/^./, str => str.toUpperCase()) // Capitalize first letter
    .trim();
};

const fetchAndCacheUserName = async (userId: string): Promise<void> => {
  if (!userId || nameCache[userId]) return; // Skip if no ID or already cached/loading

  nameCache[userId] = 'Loading...'; // Placeholder
  try {
    const userDocRef = doc(db, 'users', userId);
    const docSnap = await getDoc(userDocRef);
    if (docSnap.exists()) {
      nameCache[userId] = docSnap.data()?.name || userId; // Use name or fallback to UID
    } else {
      console.warn(`User document not found for ID: ${userId}`);
      nameCache[userId] = `User (${userId.substring(0, 5)}...)`; // Indicate not found
    }
  } catch (error) {
    console.error(`Error fetching name for ${userId}:`, error);
    nameCache[userId] = `Error (${userId.substring(0, 5)}...)`; // Indicate error
  }
};

const getTeamNameForMember = (memberId: string): string => {
  return teamMemberMap.value[memberId] || 'Unknown Team';
};

// --- Watchers ---
watch([sortedXpAllocation, isTeamEvent], ([allocations, teamEventStatus]) => {
  // Clear previous rating data
  Object.keys(teamRatings).forEach(key => delete teamRatings[key]);
  Object.keys(individualRatings).forEach(key => delete individualRatings[key]);
  bestPerformer.value = '';

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
watch(availableParticipants, (newParticipants) => {
  if (!isTeamEvent.value && Array.isArray(newParticipants)) {
    newParticipants.forEach(pId => {
      if (pId) fetchAndCacheUserName(pId); // Ensure pId is valid before fetching
    });
  }
}, { immediate: true });

// Watch all team members to fetch their names for team events
watch(allTeamMembers, (newMembers) => {
  if (isTeamEvent.value && Array.isArray(newMembers)) {
    newMembers.forEach(member => {
      if (member?.uid) fetchAndCacheUserName(member.uid); // Ensure member and uid exist
    });
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

  // Fetch names and populate allTeamMembers
  if (memberIds.size > 0) {
    const userIdsArray = Array.from(memberIds);
    // Fetch names in batch (assuming fetchUserNamesBatch exists and returns Record<string, string>)
    const userNames = await store.dispatch('user/fetchUserNamesBatch', userIdsArray);
    // Populate name cache directly from batch result
    userIdsArray.forEach(uid => {
        nameCache[uid] = userNames[uid] || uid; // Cache name or UID
    });
    // Populate allTeamMembers with { uid, name }
    allTeamMembers.value = userIdsArray
      .map(uid => ({ uid, name: userNames[uid] || uid }))
      .sort((a, b) => (a.name || '').localeCompare(b.name || '')); // Sort by name
  } else {
    allTeamMembers.value = []; // Clear if no members
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
        bestPerformer.value = existingRating.selections.bestPerformer || '';
        didLoadExistingRating.value = true; // Mark that existing data was loaded
      } else {
         didLoadExistingRating.value = false; // No existing rating found for user
      }
  } else {
       didLoadExistingRating.value = false; // Explicitly set when not loading existing
  }
};

const initializeIndividualEventForm = async (eventDetails: Event, loadExisting: boolean = false): Promise<void> => {
  const participantIds = eventDetails.participants || [];

  // Fetch participant names (if not already fetched by watcher)
  if (participantIds.length > 0) {
      const idsToFetch = participantIds.filter(id => id && !nameCache[id]);
      if (idsToFetch.length > 0) {
        await Promise.all(idsToFetch.map(fetchAndCacheUserName));
      }
  }

  // Initialize ratings structure (handled by watcher)

  // Load existing data if applicable
  if (loadExisting) {
     const winnersData = eventDetails.winnersPerRole || {};
     let loadedSomething = false;
     sortedXpAllocation.value.forEach(alloc => {
       const role = alloc.role || 'general'; // Default to general if role missing? Check requirements.
       // Assuming single winner per role/criteria for now based on original logic
       const winnerId = winnersData[role]?.[0];
       const key = `constraint${alloc.constraintIndex}`;

       if (winnerId && individualRatings[key] !== undefined) { // Check if winner exists and key is initialized
         individualRatings[key] = winnerId;
         loadedSomething = true;
       } else if (winnerId && individualRatings[key] === undefined) {
          // Handle case where allocation might have changed
          console.warn(`Winner data found for non-existent constraint index: ${alloc.constraintIndex}`);
       }
     });
     didLoadExistingRating.value = loadedSomething; // Mark if any existing data was loaded
  } else {
      didLoadExistingRating.value = false; // Explicitly set when not loading existing
  }
};


const initializeForm = async (): Promise<void> => {
  const currentUserId = currentUser.value?.uid;
  const currentUserRole = currentUser.value?.role; // Assuming role is available in user object

  // --- Initial Checks ---
  if (!currentUserId) {
      errorMessage.value = 'User not logged in.';
      loading.value = false;
      return; // Stop execution if no user
  }

  if (currentUserRole === 'Admin') {
    errorMessage.value = 'Administrators cannot submit ratings or select winners.';
    loading.value = false;
     // Optional: Redirect admin away
     // setTimeout(() => router.push({ name: 'Home' }), 100);
    return;
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

    // --- Participant Check ---
    let isParticipant = false;
    if (isTeamEvent.value && eventDetails.teams) {
        isParticipant = eventDetails.teams.some(team => team.members?.includes(currentUserId));
    } else if (!isTeamEvent.value && eventDetails.participants) {
        isParticipant = eventDetails.participants.includes(currentUserId);
    }

    // Re-evaluate if participants *can* rate/select. The original code prevents it.
    // Keeping the original logic here:
    if (isParticipant) {
         throw new Error('Participants cannot rate or select winners for events they were part of.');
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


const submitRating = async (): Promise<void> => {
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
      // Prepare payload for team event rating
      const criteriaSelections: Record<string, string> = {};
      sortedXpAllocation.value.forEach(allocation => {
        const key = `constraint${allocation.constraintIndex}`;
        criteriaSelections[allocation.constraintIndex.toString()] = teamRatings[key] || '';
      });

      payload = {
        eventId: props.eventId,
        ratingType: 'team_criteria',
        ratedBy: currentUser.value.uid,
        selections: {
          criteria: criteriaSelections,
          bestPerformer: bestPerformer.value || ''
        }
      };
      actionName = 'events/submitTeamCriteriaRating';
      console.log("Submitting Team Criteria Payload:", payload);

    } else {
      // Prepare payload for individual event winner selection
      const winnerSelections: Record<string, string[]> = {};
      sortedXpAllocation.value.forEach(allocation => {
        const role = allocation.role || 'general';
        const key = `constraint${allocation.constraintIndex}`;
        const winnerId = individualRatings[key];
        if (winnerId) {
          winnerSelections[role] = winnerSelections[role] || [];
          winnerSelections[role].push(winnerId);
        }
      });

      payload = {
        eventId: props.eventId,
        ratingType: 'individual_winners',
        ratedBy: currentUser.value.uid,
        selections: winnerSelections
      };
      actionName = 'events/submitIndividualWinners';
      console.log("Submitting Individual Winner Payload:", payload);
    }

    await store.dispatch(actionName, payload);

    store.dispatch('notification/showNotification', {
        message: `${didLoadExistingRating.value ? 'Update' : 'Submission'} successful!`,
        type: 'success'
    });
    router.push({ name: 'EventDetails', params: { id: props.eventId } });

  } catch (error: any) {
    console.error("Rating/Selection submission error:", error);
    errorMessage.value = `Submission failed: ${error.message || 'An unknown error occurred'}`;
  } finally {
    isSubmitting.value = false;
  }
};

const goBack = (): void => {
  router.back();
};

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