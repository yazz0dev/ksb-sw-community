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
                  <!-- Use .value for reactive refs in template -->
                  <p v-if="!eventCriteria?.length" class="small fst-italic text-secondary">
                    No rating criteria defined for this event.
                  </p>
                  <!-- Use .value for reactive refs in template -->
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
                  <!-- Use .value for reactive refs in template -->
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
                       <!-- Use .value for reactive refs in template -->
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
import { useEventStore } from '@/store/events';
import { useUserStore } from '@/store/user';
import { EventCriteria, Team as EventTeam, Event } from '@/types/event'; // Use aliases if needed
import { BEST_PERFORMER_LABEL } from '@/utils/constants'; // Ensure this is imported

interface TeamMember {
  uid: string;
  name: string;
}

interface TeamSelections {
  [key: number]: string; // constraintIndex -> teamName
}

// Use specific types from event.ts
interface Props {
  eventId: string;
}
const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'submitted', data: { message: string; type: string }): void;
}>();

const eventStore = useEventStore();
const userStore = useUserStore();
const loading = ref(true);
const error = ref<string>('');
const submissionError = ref<string>('');
const isSubmitting = ref(false);

const eventDetails = ref<Event | null>(null); // Use specific Event type or null
const eventCriteria = ref<EventCriteria[]>([]); // Use EventCriteria type
const eventTeams = ref<EventTeam[]>([]); // Use EventTeam type
const allTeamMembers = ref<TeamMember[]>([]);
const teamMemberMap = ref<Record<string, string>>({}); // uid -> teamName

const teamSelections = ref<TeamSelections>({});
const bestPerformerSelection = ref<string>('');

const currentUserId = computed(() => userStore.uid);

// Fetch necessary data on mount
onMounted(async () => {
  loading.value = true;
  error.value = '';
  try {
    // Fetch event details from store or directly
    const currentEvent = eventStore.currentEventDetails;
    if (!currentEvent || currentEvent.id !== props.eventId) {
      await eventStore.fetchEventDetails(props.eventId);
      eventDetails.value = eventStore.currentEventDetails;
    } else {
      eventDetails.value = currentEvent;
    }

    if (!eventDetails.value) {
      throw new Error('Event details could not be loaded.');
    }
    // Type assertion might be needed if format is optional in Event type
    if (!(eventDetails.value.details as any)?.format || (eventDetails.value.details as any).format !== 'Team') {
        throw new Error('This rating form is only for team events.');
    }

    // FIX: Use eventDetails.value.criteria and filter out BEST_PERFORMER_LABEL
    if (eventDetails.value && Array.isArray(eventDetails.value.criteria)) {
      eventCriteria.value = eventDetails.value.criteria.filter(
        c => c.constraintLabel !== BEST_PERFORMER_LABEL && c.constraintLabel && (typeof c.points === 'number' && c.points > 0)
      );
    } else {
      eventCriteria.value = [];
    }
    eventTeams.value = eventDetails.value.teams || [];

    // Initialize selections based on filtered criteria
    teamSelections.value = {}; // Reset selections
    eventCriteria.value.forEach(c => {
      // Ensure constraintIndex is valid before using it as a key
      if (typeof c.constraintIndex === 'number') {
          teamSelections.value[c.constraintIndex] = '';
      }
    });
    bestPerformerSelection.value = ''; // Reset best performer

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

    allTeamMembers.value = []; // Reset member list
    if (memberIds.size > 0) {
      const userNames = await userStore.fetchUserNamesBatch(Array.from(memberIds));
      allTeamMembers.value = Array.from(memberIds)
        .map(uid => ({ uid, name: userNames[uid] || uid }))
        .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
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
  // Access eventCriteria directly as it's unwrapped in the template/computed context
  if (!eventCriteria.value || eventCriteria.value.length === 0) { 
    // ... (rest of the logic for when no votable criteria)
  }

  const criteriaFilled = eventCriteria.value.every(c =>
    typeof c.constraintIndex === 'number' &&
    teamSelections.value[c.constraintIndex] &&
    teamSelections.value[c.constraintIndex] !== ''
  );
  const bestPerformerFilled = bestPerformerSelection.value !== '';

  // If there are no votable criteria, only bestPerformer matters for validity.
  if (eventCriteria.value.length === 0) {
    return bestPerformerFilled;
  }

  return criteriaFilled && bestPerformerFilled;
});


const submitTeamRatings = async (): Promise<void> => {
  if (!isFormValid.value || isSubmitting.value) return;

  isSubmitting.value = true;
  submissionError.value = '';

  try {
    const criteriaPayload: Record<string, string> = {};
    eventCriteria.value.forEach(c => {
      if (typeof c.constraintIndex === 'number') {
          // Use the actual constraintIndex from the criteria object as the key
          criteriaPayload[String(c.constraintIndex)] = teamSelections.value[c.constraintIndex];
      }
    });

    // Use submitTeamCriteriaVote action from Pinia store
    await eventStore.submitTeamCriteriaVote({
      eventId: props.eventId,
      selections: {
        criteria: criteriaPayload, // Pass the correctly structured criteria object
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