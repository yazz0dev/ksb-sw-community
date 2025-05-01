<template>
  <Teleport to="body">
    <!-- Bootstrap Modal -->
    <div class="modal fade show d-block" tabindex="-1" role="dialog" aria-labelledby="ratingModalLabel" aria-hidden="false">
      <div class="modal-dialog modal-dialog-centered modal-lg" role="document">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="ratingModalLabel">Rate Teams & Select Best Performer</h5>
            <button type="button" class="btn-close" aria-label="Close" @click="$emit('close')"></button>
          </div>

          <div class="modal-body py-4">
            <!-- Loading State -->
            <div v-if="loading" class="d-flex flex-column align-items-center py-5">
              <div class="spinner-border text-primary mb-3" role="status" style="width: 3rem; height: 3rem;">
                <span class="visually-hidden">Loading...</span>
              </div>
              <p class="text-secondary">Loading event data...</p>
            </div>

            <!-- Error State -->
            <div v-else-if="error" class="alert alert-danger" role="alert">
              {{ error }}
            </div>

            <!-- Form Content -->
            <form v-else @submit.prevent="submitTeamRatings">
              <div class="d-flex flex-column" style="gap: 1.5rem;">
                <!-- Team Selection Section -->
                <div>
                  <h3 class="h5 mb-3">Best Team per Criterion</h3>
                  <p v-if="!eventCriteria?.length" class="small fst-italic text-secondary">
                    No rating criteria defined for this event.
                  </p>
                  <div v-else class="d-flex flex-column" style="gap: 1rem;">
                    <div v-for="criterion in eventCriteria" :key="criterion.constraintIndex" class="mb-3">
                      <label :for="`team-select-${criterion.constraintIndex}`" class="form-label small fw-bold">{{ criterion.constraintLabel }} ({{ criterion.points }} XP)</label>
                      <select
                        :id="`team-select-${criterion.constraintIndex}`"
                        class="form-select"
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

                <!-- Best Performer Section -->
                <div class="pt-4 border-top">
                  <h3 class="h5 mb-3">Overall Best Performer</h3>
                  <p v-if="!allTeamMembers?.length" class="small fst-italic text-secondary">
                    No participants found in teams.
                  </p>
                  <div v-else class="mb-3">
                    <label for="best-performer-select" class="form-label small fw-bold">Select the standout individual participant</label>
                    <select
                      id="best-performer-select"
                      class="form-select"
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

                <!-- Submission Error -->
                <div v-if="submissionError" class="alert alert-danger alert-sm mt-3" role="alert">
                  {{ submissionError }}
                </div>
              </div>
              <!-- Form submission is handled by footer button -->
            </form>
          </div>

          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="$emit('close')">
              Cancel
            </button>
            <button
              type="button"
              class="btn btn-primary"
              :disabled="!isFormValid || isSubmitting"
              @click="submitTeamRatings"
            >
              <span v-if="isSubmitting" class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
              {{ isSubmitting ? 'Submitting...' : 'Submit Ratings' }}
            </button>
          </div>
        </div>
      </div>
    </div>
    <!-- Backdrop -->
    <div class="modal-backdrop fade show"></div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useStore } from 'vuex';

interface EventCriterion {
  constraintIndex: number;
  constraintLabel: string;
  points: number;
}

interface Team {
  teamName: string;
  members: string[];
}

interface TeamMember {
  uid: string;
  name: string;
}

interface TeamSelections {
  [key: number]: string;
}

interface RatingPayload {
  eventId: string;
  ratingType: string;
  ratedBy: string;
  ratedAt: Date;
  selections: {
    criteria: TeamSelections;
    bestPerformer: string;
  };
}

const props = defineProps<{
  eventId: string;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'submitted', data: { message: string; type: string }): void;
}>();

const store = useStore();
const loading = ref(true);
const error = ref<string>('');
const submissionError = ref<string>('');
const isSubmitting = ref(false);

const eventDetails = ref<any>(null);
const eventCriteria = ref<EventCriterion[]>([]);
const eventTeams = ref<Team[]>([]);
const allTeamMembers = ref<TeamMember[]>([]);
const teamMemberMap = ref<Record<string, string>>({});

const teamSelections = ref<TeamSelections>({});
const bestPerformerSelection = ref<string>('');

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
    if (!eventDetails.value.details?.format || eventDetails.value.details.format !== 'Team') {
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
    const memberIds = new Set<string>();
    const tempMemberMap: Record<string, string> = {};
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
    error.value = (err as Error).message || 'Failed to load necessary data.';
  } finally {
    loading.value = false;
  }
});

const getTeamNameForMember = (memberId: string): string => {
    return teamMemberMap.value[memberId] || 'Unknown Team';
};

const isFormValid = computed(() => {
  if (!eventCriteria.value || eventCriteria.value.length === 0) {
      // If no criteria, only need best performer
      return bestPerformerSelection.value !== '';
  }
  // Check if all criteria have a team selected
  const allCriteriaSelected = eventCriteria.value.every(
    c => typeof c.constraintIndex === 'number' && teamSelections.value[c.constraintIndex] && teamSelections.value[c.constraintIndex] !== ''
  );
  // Check if best performer is selected
  const bestPerformerSelected = bestPerformerSelection.value !== '';

  return allCriteriaSelected && bestPerformerSelected;
});

const submitTeamRatings = async (): Promise<void> => {
  if (!isFormValid.value || isSubmitting.value) return;

  isSubmitting.value = true;
  submissionError.value = '';

  try {
    const criteriaSelections: TeamSelections = {};
    eventCriteria.value.forEach(c => {
        if (typeof c.constraintIndex === 'number') { 
            criteriaSelections[c.constraintIndex] = teamSelections.value[c.constraintIndex];
        }
    });

    // Use submitTeamCriteriaVote, which updates only criteriaSelections and bestPerformerSelections
    await store.dispatch('events/submitTeamCriteriaVote', {
      eventId: props.eventId,
      selections: {
        criteria: criteriaSelections,
        bestPerformer: bestPerformerSelection.value
      }
    });

    emit('submitted', { message: 'Team ratings submitted successfully!', type: 'success' });
    emit('close');

  } catch (err) {
    console.error('Error submitting team ratings:', err);
    submissionError.value = (err as Error).message || 'Failed to submit ratings.';
  } finally {
    isSubmitting.value = false;
  }
};
</script>

<style scoped>
/* Force modal display if parent controls via v-if */
.modal.show {
  display: block;
}
/* Reduce padding on small alerts */
.alert-sm {
    padding: 0.5rem 0.75rem;
    font-size: 0.875em;
}
</style>
