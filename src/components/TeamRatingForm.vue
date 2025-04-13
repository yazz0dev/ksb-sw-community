<template>
  <div class="modal" :class="{ 'is-active': true }"> <!-- Assume visibility controlled by parent via v-if or other means -->
    <div class="modal-background" @click="$emit('close')"></div>
    <div class="modal-card" style="max-width: 640px;">
      <header class="modal-card-head">
        <p class="modal-card-title">Rate Teams & Select Best Performer</p>
        <button class="delete" aria-label="close" @click="$emit('close')"></button>
      </header>

      <section class="modal-card-body py-5">
        <div v-if="loading" class="is-flex is-flex-direction-column is-align-items-center py-6">
          <div class="loader is-loading mb-3" style="height: 3rem; width: 3rem;"></div>
          <p class="has-text-grey">Loading event data...</p>
        </div>

        <div v-else-if="error" class="message is-danger">
          <div class="message-body">{{ error }}</div>
        </div>

        <form v-else @submit.prevent="submitTeamRatings">
          <div class="is-flex is-flex-direction-column" style="gap: 1.5rem;">
            <!-- Team Selection Section -->
            <div>
              <h3 class="title is-5 mb-3">Best Team per Criterion</h3>
              <p v-if="!eventCriteria?.length" class="is-size-7 is-italic has-text-grey">
                No rating criteria defined for this event.
              </p>
              <div v-else class="is-flex is-flex-direction-column" style="gap: 1rem;">
                <div v-for="criterion in eventCriteria" :key="criterion.constraintIndex" class="field">
                  <label class="label is-small">{{ criterion.constraintLabel }} ({{ criterion.points }} XP)</label>
                  <div class="control">
                    <div class="select is-fullwidth">
                      <select
                        v-model="teamSelections[criterion.constraintIndex]"
                        required
                        :disabled="isSubmitting"
                      >
                        <option value="" disabled>Select Team...</option>
                        <option v-for="team in eventTeams" :key="team.teamName" :value="team.teamName">
                          {{ team.teamName }}
                        </option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Best Performer Section -->
            <div class="pt-5" style="border-top: 1px solid var(--color-border);">
              <h3 class="title is-5 mb-3">Overall Best Performer</h3>
              <p v-if="!allTeamMembers?.length" class="is-size-7 is-italic has-text-grey">
                No participants found in teams.
              </p>
              <div v-else class="field">
                <label class="label is-small">Select the standout individual participant</label>
                <div class="control">
                  <div class="select is-fullwidth">
                    <select
                      v-model="bestPerformerSelection"
                      required
                      :disabled="isSubmitting"
                    >
                       <option value="" disabled>Select Participant...</option>
                       <option v-for="member in allTeamMembers" :key="member.uid" :value="member.uid">
                         {{ member.name }} ({{ getTeamNameForMember(member.uid) }})
                       </option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div v-if="submissionError" class="message is-danger is-small">
              <div class="message-body">{{ submissionError }}</div>
            </div>
          </div>
        </form>
      </section>

      <footer class="modal-card-foot is-justify-content-flex-end">
        <button class="button" @click="$emit('close')">
          Cancel
        </button>
        <button
          class="button is-primary"
          :class="{ 'is-loading': isSubmitting }"
          :disabled="!isFormValid || isSubmitting"
          @click="submitTeamRatings"
        >
          Submit Ratings
        </button>
      </footer>
    </div>
  </div>
</template>

<script setup>
// Removed all Chakra UI imports
import { ref, computed, onMounted } from 'vue';
import { useStore } from 'vuex';

const props = defineProps({
  eventId: {
    type: String,
    required: true,
  },
  // Add a prop to control visibility if needed by the parent
  // visible: { 
  //   type: Boolean,
  //   default: false
  // }
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
      // Ensure constraintIndex is valid before using it as a key
      if (typeof c.constraintIndex === 'number') { 
          teamSelections.value[c.constraintIndex] = '';
      }
    });

    // Prepare list of all members for best performer dropdown
    const memberIds = new Set();
    const tempMemberMap = {}; // Map<userId, teamName>
    eventTeams.value.forEach(team => {
      (team.members || []).forEach(memberId => {
        if (memberId) { // Ensure memberId is not null/undefined
            memberIds.add(memberId);
            tempMemberMap[memberId] = team.teamName;
        }
      });
    });
    teamMemberMap.value = tempMemberMap;

    if (memberIds.size > 0) {
      const userNames = await store.dispatch('user/fetchUserNamesBatch', Array.from(memberIds));
      allTeamMembers.value = Array.from(memberIds)
        .map(uid => ({ uid, name: userNames[uid] || uid }))
        .sort((a, b) => (a.name || '').localeCompare(b.name || '')); // Sort alphabetically, handle potential undefined names
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
  if (!eventCriteria.value || eventCriteria.value.length === 0) return false;
  // Check if all criteria have a team selected
  const allCriteriaSelected = eventCriteria.value.every(
    c => typeof c.constraintIndex === 'number' && teamSelections.value[c.constraintIndex] && teamSelections.value[c.constraintIndex] !== ''
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
    const criteriaSelections = {};
    eventCriteria.value.forEach(c => {
        if (typeof c.constraintIndex === 'number') { 
            criteriaSelections[c.constraintIndex] = teamSelections.value[c.constraintIndex];
        }
    });

    const ratingPayload = {
      eventId: props.eventId,
      ratingType: 'team_criteria', // New type to distinguish
      ratedBy: currentUserId.value,
      ratedAt: new Date(), // Use JS Date, Firestore action will convert
      selections: {
        criteria: criteriaSelections, // Use the constructed map
        bestPerformer: bestPerformerSelection.value, // UID of the best performer
      },
    };

    // Dispatch the new Vuex action
    await store.dispatch('events/submitTeamCriteriaRating', ratingPayload); 
    
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
.modal-card-foot.is-justify-content-flex-end {
    justify-content: flex-end;
}
/* Add any specific styles if needed */
.py-5 { padding-top: 1.25rem; padding-bottom: 1.25rem; }
.pt-5 { padding-top: 1.25rem; }
.py-6 { padding-top: 1.5rem; padding-bottom: 1.5rem; }
</style>
