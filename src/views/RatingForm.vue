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

      <div v-if="!loading && eventName" class="text-center mb-5">
        <h1 class="h3">
           {{ isTeamEvent ? 'Rate Teams & Select Best Performer' : 'Select Winners' }}
        </h1>
        <p class="fs-6 text-secondary">
           Event: {{ eventName }}
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
                               v-model="ratings[`constraint${allocation.constraintIndex}`].teamName"
                               required
                               :disabled="isSubmitting"
                             >
                               <option disabled value="">Select Team...</option>
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
                               v-model="ratings.bestPerformer"
                               required
                               :disabled="isSubmitting"
                             >
                               <option disabled value="">Select Participant...</option>
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
                                 v-model="ratings[`constraint${allocation.constraintIndex}`].winnerId"
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

<script setup>
import { ref, onMounted, computed, watch, reactive } from 'vue';
import { useStore } from 'vuex';
import { useRoute, useRouter } from 'vue-router';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

const props = defineProps({ eventId: { type: String, required: true }, teamId: { type: String, required: false } });
const store = useStore();
const route = useRoute();
const router = useRouter();
const loading = ref(true);
const errorMessage = ref('');
const isSubmitting = ref(false);
const eventName = ref('');
const event = ref(null);
const isTeamEvent = ref(null);
const teamIdToRate = ref(null);
const teamMembersToDisplay = ref([]);
const eventTeams = ref([]);
const allTeamMembers = ref([]);
const teamMemberMap = ref({});
const didLoadExistingRating = ref(false);
const nameCache = reactive({});

const ratings = reactive({});

const currentUser = computed(() => store.getters['user/getUser']);

const sortedXpAllocation = computed(() => {
  if (!event.value?.xpAllocation || !Array.isArray(event.value.xpAllocation)) return [];
  const validAllocations = event.value.xpAllocation.filter(
    alloc => typeof alloc.constraintIndex === 'number' && 
             alloc.constraintLabel?.trim() &&
             typeof alloc.points === 'number' && alloc.points >= 0 &&
             typeof alloc.role === 'string'
  );
  return [...validAllocations].sort((a, b) => a.constraintIndex - b.constraintIndex);
});

const isValid = computed(() => {
  if (!sortedXpAllocation.value || sortedXpAllocation.value.length === 0) return false;

  const allCriteriaSelected = sortedXpAllocation.value.every(allocation => {
    const ratingKey = `constraint${allocation.constraintIndex}`;
    const ratingEntry = ratings[ratingKey];
    if (!ratingEntry) return false;
    return isTeamEvent.value
      ? (ratingEntry.teamName && ratingEntry.teamName !== '') 
      : (ratingEntry.winnerId && ratingEntry.winnerId !== ''); 
  });

  const bestPerformerSelected = isTeamEvent.value
    ? (ratings.bestPerformer && ratings.bestPerformer !== '')
    : true;

  return allCriteriaSelected && bestPerformerSelected;
});

const availableParticipants = computed(() => {
  if (isTeamEvent.value || !event.value?.participants || !Array.isArray(event.value.participants)) return [];
  // Filter out the current user from the list of participants
  return event.value.participants.filter(pId => pId !== currentUser.value?.uid);
});

const hasValidRatingCriteria = computed(() => {
  return sortedXpAllocation.value.length > 0;
});

const submitButtonText = computed(() => {
  const action = didLoadExistingRating.value ? 'Update' : 'Submit';
  const target = isTeamEvent.value ? 'Team Selections' : 'Winners';
  return isSubmitting.value ? 'Submitting...' : `${action} ${target}`;
});

const formatRoleName = (roleKey) => {
  if (!roleKey) return '';
  // Improved formatting for camelCase and snake_case
  return roleKey
    .replace(/([A-Z])/g, ' $1') // Add space before uppercase letters
    .replace(/_/g, ' ') // Replace underscores with spaces
    .replace(/^./, str => str.toUpperCase()) // Capitalize first letter
    .trim();
};

watch([sortedXpAllocation, isTeamEvent], ([allocations, teamEventStatus]) => {
  // Clear previous rating data when allocations or event type changes
  Object.keys(ratings).forEach(key => {
      delete ratings[key];
  });

  if (Array.isArray(allocations)) {
    allocations.forEach(allocation => {
      const allocationKey = `constraint${allocation.constraintIndex}`;
      // Initialize structure based on event type
      ratings[allocationKey] = teamEventStatus ? { teamName: '' } : { winnerId: '' };
    });
    // Initialize bestPerformer only for team events
    if (teamEventStatus) {
      ratings.bestPerformer = '';
    }
  }
}, { immediate: true, deep: true });

async function fetchAndCacheUserName(userId) {
  if (!userId || nameCache[userId]) return;
  nameCache[userId] = 'Loading...'; // Placeholder while loading
  try {
    const userDocRef = doc(db, 'users', userId);
    const docSnap = await getDoc(userDocRef);
    nameCache[userId] = docSnap.exists() ? (docSnap.data().name || userId) : `User (${userId.substring(0,5)}...)`; // Use ID if no name
  } catch (error) {
    console.error(`Error fetching name for ${userId}:`, error);
    nameCache[userId] = `Error (${userId.substring(0,5)}...)`; // Indicate error
  }
}

const getTeamNameForMember = (memberId) => {
  return teamMemberMap.value[memberId] || 'Unknown Team';
};

watch(availableParticipants, (participants) => {
  if (!isTeamEvent.value && Array.isArray(participants)) {
    participants.forEach(fetchAndCacheUserName);
  }
}, { immediate: true });

watch(allTeamMembers, (members) => {
  if (isTeamEvent.value && Array.isArray(members)) {
    members.forEach(member => fetchAndCacheUserName(member.uid));
  }
}, { immediate: true });

onMounted(async () => {
  await initializeForm();
});

const submitRating = async () => {
  if (!isValid.value) {
    errorMessage.value = 'Please complete all selections before submitting.';
    return;
  }
  isSubmitting.value = true;
  errorMessage.value = '';

  try {
    let payload;
    if (isTeamEvent.value) {
      // Prepare payload for team event rating
      const criteriaSelections = {};
      sortedXpAllocation.value.forEach(allocation => {
        criteriaSelections[allocation.constraintIndex] = ratings[`constraint${allocation.constraintIndex}`].teamName;
      });
      payload = {
        eventId: props.eventId,
        ratingType: 'team_criteria',
        ratedBy: currentUser.value.uid,
        selections: {
          criteria: criteriaSelections,
          bestPerformer: ratings.bestPerformer
        }
      };
      console.log("Submitting Team Criteria Payload:", payload);
      await store.dispatch('events/submitTeamCriteriaRating', payload);
    } else {
      // Prepare payload for individual event winner selection
      const winnerSelections = {};
       sortedXpAllocation.value.forEach(allocation => {
          const role = allocation.role || 'general'; // Default to general if role missing
          winnerSelections[role] = winnerSelections[role] || []; // Ensure array exists
          winnerSelections[role].push(ratings[`constraint${allocation.constraintIndex}`].winnerId);
       });
      payload = {
        eventId: props.eventId,
        ratingType: 'individual_winners', // More specific type
        ratedBy: currentUser.value.uid,
        selections: winnerSelections // Map of role -> [winnerId]
      };
      console.log("Submitting Individual Winner Payload:", payload);
      await store.dispatch('events/submitIndividualWinners', payload); // Use a potentially different action
    }

    // Common success handling
    router.push({ name: 'EventDetails', params: { id: props.eventId } });
    store.dispatch('notification/showNotification', { message: 'Selections submitted successfully!', type: 'success' });

  } catch (error) {
    console.error("Rating/Selection submission error:", error);
    errorMessage.value = `Submission failed: ${error.message || 'Unknown error'}`;
  } finally {
    isSubmitting.value = false;
  }
};

const goBack = () => {
  router.back();
};

const initializeForm = async () => {
  const currentUserId = store.getters['user/userId']; // Get current user ID
  const currentUserRole = store.getters['user/userRole']; // Get current user role

  if (currentUserRole === 'Admin') {
    errorMessage.value = 'Administrators cannot submit ratings or select winners.';
    // Redirect admin away from this form
     setTimeout(() => router.push({ name: 'Home' }), 100); // Delay slightly to allow message display
    return;
  }

  loading.value = true;
  errorMessage.value = '';
  
  try {
    const eventDetails = await store.dispatch('events/fetchEventDetails', props.eventId);
    if (!eventDetails) {
      throw new Error('Event not found or not accessible.');
    }

    event.value = eventDetails;
    eventName.value = eventDetails.eventName;
    isTeamEvent.value = !!eventDetails.isTeamEvent;

    // Check if ratings are open OR if it's winner selection phase (different condition?)
    // For now, assume ratingsOpen governs both for simplicity
    if (!eventDetails.ratingsOpen) {
      throw new Error('Ratings/Winner selection is currently closed for this event.');
    }

    if (eventDetails.status !== 'Completed') {
      throw new Error('Ratings/Winner selection can only be done for completed events.');
    }

    // Prevent user from rating/selecting winners for events they participated in?
    // This check might be complex depending on team/individual events
    // Example check (adapt as needed):
    let isParticipant = false;
    if (isTeamEvent.value && eventDetails.teams) {
        isParticipant = eventDetails.teams.some(team => team.members?.includes(currentUserId));
    } else if (eventDetails.participants) {
        isParticipant = eventDetails.participants.includes(currentUserId);
    }
    if (isParticipant && !currentUserRole === 'Admin') { // Allow admins maybe?
         throw new Error('Participants cannot rate or select winners for events they were part of.');
    }

    // Check if user has already submitted
    if (isTeamEvent.value) {
        const alreadyRated = eventDetails.teamCriteriaRatings?.some(r => r.ratedBy === currentUserId);
        if (alreadyRated) {
             // Decide: Allow update or block? For now, block.
             // throw new Error('You have already submitted ratings for this team event.');
             // Or load existing ratings for update:
             await initializeTeamEventForm(eventDetails, true);
             didLoadExistingRating.value = true; 
        } else {
            await initializeTeamEventForm(eventDetails, false);
        }
    } else {
         // Check if individual winners have been selected (might be a different flag/structure)
         const winnersExist = Object.keys(eventDetails.winnersPerRole || {}).length > 0;
         if (winnersExist) {
            // throw new Error('Winners have already been selected for this event.');
            // Or load existing winners for update:
             await initializeIndividualEventForm(eventDetails, true);
             didLoadExistingRating.value = true;
         } else {
            await initializeIndividualEventForm(eventDetails, false);
         }
    }

  } catch (error) {
    console.error('Error initializing form:', error);
    errorMessage.value = error.message || 'Failed to load rating details.';
    event.value = null;
  } finally {
    loading.value = false;
  }
};

const initializeTeamEventForm = async (eventDetails, loadExisting = false) => {
  eventTeams.value = eventDetails.teams || [];
  const memberIds = new Set();
  const tempMemberMap = {};

  eventTeams.value.forEach(team => {
    (team.members || []).forEach(memberId => {
      if (memberId) memberIds.add(memberId);
      if (memberId) tempMemberMap[memberId] = team.teamName;
    });
  });

  teamMemberMap.value = tempMemberMap;

  if (memberIds.size > 0) {
    const userNames = await store.dispatch('user/fetchUserNamesBatch', Array.from(memberIds));
    allTeamMembers.value = Array.from(memberIds)
      .map(uid => ({ uid, name: userNames[uid] || uid }))
      .sort((a, b) => (userNames[a.uid] || a.uid).localeCompare(userNames[b.uid] || b.uid));
  }

  // Initialize ratings structure first (based on watcher)
  // Then load existing data if applicable
  if (loadExisting) {
      const existingRating = eventDetails.teamCriteriaRatings?.find(
        r => r.ratedBy === store.getters['user/userId']
      );
      if (existingRating) {
        Object.entries(existingRating.selections?.criteria || {}).forEach(([index, teamName]) => {
           const key = `constraint${index}`;
           if (ratings[key]) {
             ratings[key].teamName = teamName || ''; // Ensure empty string if null/undefined
           }
        });
        ratings.bestPerformer = existingRating.selections?.bestPerformer || '';
      }
  }
};

const initializeIndividualEventForm = async (eventDetails, loadExisting = false) => {
  const participantIds = eventDetails.participants || [];
  if (participantIds.length > 0) {
    const participantNames = await store.dispatch('user/fetchUserNamesBatch', participantIds);
    Object.entries(participantNames).forEach(([uid, name]) => {
      nameCache[uid] = name || uid;
    });
  }

  // Initialize ratings structure first (based on watcher)
  // Then load existing data if applicable
  if (loadExisting) {
     const winnersData = eventDetails.winnersPerRole || {};
     sortedXpAllocation.value.forEach(alloc => {
       const role = alloc.role || 'general';
       const winnerId = winnersData[role]?.[0]; // Assuming single winner per role for now
       const key = `constraint${alloc.constraintIndex}`;
       if (winnerId && ratings[key]) {
         ratings[key].winnerId = winnerId;
       }
     });
  }
};
</script>

<style scoped>
/* Removed .box shadow style */
</style>
