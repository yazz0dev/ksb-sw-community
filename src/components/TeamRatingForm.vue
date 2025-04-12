<template>
  <div class="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-60 flex items-center justify-center p-4 transition-opacity duration-300">
    <div class="bg-surface rounded-lg shadow-xl max-w-2xl w-full p-6 relative animate-fade-in">
      <button @click="$emit('close')" class="absolute top-3 right-3 text-text-secondary hover:text-text-primary transition-colors">
        <i class="fas fa-times text-xl"></i>
        <span class="sr-only">Close modal</span>
      </button>

      <h3 class="text-xl font-semibold text-text-primary mb-6 border-b border-border pb-3">Rate Teams & Select Best Performer</h3>

      <div v-if="loading" class="text-center py-8">
        <i class="fas fa-spinner fa-spin text-2xl text-primary"></i>
        <p class="mt-2 text-text-secondary">Loading event data...</p>
      </div>

      <div v-else-if="error" class="bg-error-light text-error-dark p-3 rounded-md border border-error-light text-sm">
        <i class="fas fa-exclamation-circle mr-1"></i> {{ error }}
      </div>

      <form v-else @submit.prevent="submitTeamRatings" class="space-y-6">
        <!-- Team Selection per Criterion -->
        <div>
          <h4 class="text-lg font-medium text-text-primary mb-3">Best Team per Criterion</h4>
          <div v-if="!eventCriteria || eventCriteria.length === 0" class="text-sm text-text-secondary italic">
            No rating criteria defined for this event.
          </div>
          <div v-else class="space-y-4">
            <div v-for="criterion in eventCriteria" :key="criterion.constraintIndex">
              <label :for="`criterion-${criterion.constraintIndex}`" class="block text-sm font-medium text-text-secondary mb-1">
                {{ criterion.constraintLabel }} ({{ criterion.points }} XP)
              </label>
              <select
                :id="`criterion-${criterion.constraintIndex}`"
                v-model="teamSelections[criterion.constraintIndex]"
                required
                class="mt-1 block w-full rounded-md border-border shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50 sm:text-sm"
                :disabled="isSubmitting"
              >
                <option disabled value="">Select Team...</option>
                <option v-for="team in eventTeams" :key="team.teamName" :value="team.teamName">
                  {{ team.teamName }}
                </option>
              </select>
            </div>
          </div>
        </div>

        <!-- Best Performer Selection -->
        <div class="border-t border-border pt-6">
          <h4 class="text-lg font-medium text-text-primary mb-3">Overall Best Performer</h4>
           <div v-if="!allTeamMembers || allTeamMembers.length === 0" class="text-sm text-text-secondary italic">
             No participants found in teams.
           </div>
          <div v-else>
            <label for="bestPerformer" class="block text-sm font-medium text-text-secondary mb-1">Select the standout individual participant</label>
            <select
              id="bestPerformer"
              v-model="bestPerformerSelection"
              required
              class="mt-1 block w-full rounded-md border-border shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50 sm:text-sm"
              :disabled="isSubmitting"
            >
              <option disabled value="">Select Participant...</option>
              <option v-for="member in allTeamMembers" :key="member.uid" :value="member.uid">
                {{ member.name }} ({{ getTeamNameForMember(member.uid) }})
              </option>
            </select>
          </div>
        </div>

        <!-- Submission Error -->
        <p v-if="submissionError" class="text-sm text-error"><i class="fas fa-exclamation-circle mr-1"></i> {{ submissionError }}</p>

        <!-- Actions -->
        <div class="pt-6 flex justify-end space-x-3">
          <button type="button" @click="$emit('close')" class="inline-flex justify-center rounded-md border border-border bg-surface px-4 py-2 text-sm font-medium text-text-secondary shadow-sm hover:bg-neutral-light focus:outline-none focus:ring-2 focus:ring-primary-light focus:ring-offset-2 transition-colors">
            Cancel
          </button>
          <button type="submit" :disabled="isSubmitting || !isFormValid"
                  class="inline-flex items-center justify-center rounded-md border border-transparent bg-primary px-4 py-2 text-sm font-medium text-primary-text shadow-sm hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
            <i v-if="isSubmitting" class="fas fa-spinner fa-spin mr-2"></i>
            {{ isSubmitting ? 'Submitting...' : 'Submit Ratings' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useStore } from 'vuex';

const props = defineProps({
  eventId: {
    type: String,
    required: true,
  },
});

const emit = defineEmits(['close', 'submitted']);

const store = useStore();
const loading = ref(true);
const error = ref('');
const submissionError = ref('');
const isSubmitting = ref(false);

const eventDetails = ref(null);
const eventCriteria = ref([]);
const eventTeams = ref([]);
const allTeamMembers = ref([]); // Array of { uid: string, name: string }
const teamMemberMap = ref({}); // Map<userId, teamName>

const teamSelections = ref({}); // { constraintIndex: teamName }
const bestPerformerSelection = ref('');

const currentUserId = computed(() => store.getters['user/userId']);

// Fetch necessary data on mount
onMounted(async () => {
  loading.value = true;
  error.value = '';
  try {
    // Fetch event details if not already loaded or stale
    // For simplicity, assume EventDetails view keeps it fresh for now
    const currentEvent = store.state.events.currentEventDetails;
    if (!currentEvent || currentEvent.id !== props.eventId) {
      await store.dispatch('events/fetchEventDetails', props.eventId);
      eventDetails.value = store.state.events.currentEventDetails;
    } else {
      eventDetails.value = currentEvent;
    }

    if (!eventDetails.value) {
      throw new Error('Event details could not be loaded.');
    }
    if (!eventDetails.value.isTeamEvent) {
        throw new Error('This rating form is only for team events.');
    }

    eventCriteria.value = eventDetails.value.xpAllocation || [];
    eventTeams.value = eventDetails.value.teams || [];

    // Initialize selections
    eventCriteria.value.forEach(c => {
      teamSelections.value[c.constraintIndex] = '';
    });

    // Prepare list of all members for best performer dropdown
    const memberIds = new Set();
    const tempMemberMap = {}; // Map<userId, teamName>
    eventTeams.value.forEach(team => {
      (team.members || []).forEach(memberId => {
        memberIds.add(memberId);
        tempMemberMap[memberId] = team.teamName;
      });
    });
    teamMemberMap.value = tempMemberMap;

    if (memberIds.size > 0) {
      const userNames = await store.dispatch('user/fetchUserNamesBatch', Array.from(memberIds));
      allTeamMembers.value = Array.from(memberIds)
        .map(uid => ({ uid, name: userNames[uid] || uid }))
        .sort((a, b) => a.name.localeCompare(b.name)); // Sort alphabetically
    }

  } catch (err) {
    console.error('Error loading data for team rating form:', err);
    error.value = err.message || 'Failed to load necessary data.';
  } finally {
    loading.value = false;
  }
});

const getTeamNameForMember = (memberId) => {
    return teamMemberMap.value[memberId] || 'Unknown Team';
};

const isFormValid = computed(() => {
  // Check if all criteria have a team selected
  const allCriteriaSelected = eventCriteria.value.every(
    c => teamSelections.value[c.constraintIndex] && teamSelections.value[c.constraintIndex] !== ''
  );
  // Check if best performer is selected
  const bestPerformerSelected = bestPerformerSelection.value !== '';

  return allCriteriaSelected && bestPerformerSelected;
});

const submitTeamRatings = async () => {
  if (!isFormValid.value || isSubmitting.value) return;

  isSubmitting.value = true;
  submissionError.value = '';

  try {
    const ratingPayload = {
      eventId: props.eventId,
      ratingType: 'team_criteria', // New type to distinguish
      ratedBy: currentUserId.value,
      ratedAt: new Date(), // Use JS Date, Firestore action will convert
      selections: {
        criteria: { ...teamSelections.value }, // Map of { constraintIndex: teamName }
        bestPerformer: bestPerformerSelection.value, // UID of the best performer
      },
    };

    // Dispatch the new Vuex action
    await store.dispatch('events/submitTeamCriteriaRating', ratingPayload); 

    // Remove simulation
    // await new Promise(resolve => setTimeout(resolve, 1000)); 
    
    emit('submitted', { message: 'Team ratings submitted successfully!', type: 'success' });
    emit('close');

  } catch (err) {
    console.error('Error submitting team ratings:', err);
    submissionError.value = err.message || 'Failed to submit ratings.';
  } finally {
    isSubmitting.value = false;
  }
};

</script>

<style scoped>
/* Add any specific styles if needed */
</style>
