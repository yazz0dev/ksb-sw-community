<template>
  <CModal isOpen @close="$emit('close')" size="2xl">
    <CModalOverlay />
    <CModalContent>
      <CModalCloseButton />
      <CModalHeader borderBottomWidth="1px">
        Rate Teams & Select Best Performer
      </CModalHeader>

      <CModalBody py="6">
        <CFlex v-if="loading" direction="column" align="center" py="8">
          <CSpinner size="xl" color="primary" thickness="4px" />
          <CText mt="2" color="text-secondary">Loading event data...</CText>
        </CFlex>

        <CAlert v-else-if="error" status="error" variant="left-accent">
          <CAlertIcon />
          <CAlertDescription>{{ error }}</CAlertDescription>
        </CAlert>

        <CForm v-else @submit.prevent="submitTeamRatings">
          <CStack spacing="6">
            <!-- Team Selection Section -->
            <CBox>
              <CHeading size="md" mb="3">Best Team per Criterion</CHeading>
              <CText v-if="!eventCriteria?.length" fontSize="sm" fontStyle="italic" color="text-secondary">
                No rating criteria defined for this event.
              </CText>
              <CStack v-else spacing="4">
                <CFormControl v-for="criterion in eventCriteria" :key="criterion.constraintIndex" isRequired>
                  <CFormLabel>{{ criterion.constraintLabel }} ({{ criterion.points }} XP)</CFormLabel>
                  <CSelect
                    v-model="teamSelections[criterion.constraintIndex]"
                    placeholder="Select Team..."
                    :isDisabled="isSubmitting"
                  >
                    <option v-for="team in eventTeams" :key="team.teamName" :value="team.teamName">
                      {{ team.teamName }}
                    </option>
                  </CSelect>
                </CFormControl>
              </CStack>
            </CBox>

            <!-- Best Performer Section -->
            <CBox borderTopWidth="1px" pt="6">
              <CHeading size="md" mb="3">Overall Best Performer</CHeading>
              <CText v-if="!allTeamMembers?.length" fontSize="sm" fontStyle="italic" color="text-secondary">
                No participants found in teams.
              </CText>
              <CFormControl v-else isRequired>
                <CFormLabel>Select the standout individual participant</CFormLabel>
                <CSelect
                  v-model="bestPerformerSelection"
                  placeholder="Select Participant..."
                  :isDisabled="isSubmitting"
                >
                  <option v-for="member in allTeamMembers" :key="member.uid" :value="member.uid">
                    {{ member.name }} ({{ getTeamNameForMember(member.uid) }})
                  </option>
                </CSelect>
              </CFormControl>
            </CBox>

            <CAlert v-if="submissionError" status="error">
              <CAlertIcon />
              <CAlertDescription>{{ submissionError }}</CAlertDescription>
            </CAlert>
          </CStack>
        </CForm>
      </CModalBody>

      <CModalFooter borderTopWidth="1px">
        <CButton variant="ghost" mr="3" onClick="$emit('close')">
          Cancel
        </CButton>
        <CButton
          colorScheme="primary"
          :isLoading="isSubmitting"
          :isDisabled="!isFormValid"
          loadingText="Submitting..."
          onClick="submitTeamRatings"
        >
          Submit Ratings
        </CButton>
      </CModalFooter>
    </CModalContent>
  </CModal>
</template>

<script setup>
import {
  Modal as CModal,
  ModalOverlay as CModalOverlay,
  ModalContent as CModalContent,
  ModalHeader as CModalHeader,
  ModalFooter as CModalFooter,
  ModalBody as CModalBody,
  ModalCloseButton as CModalCloseButton,
  Button as CButton,
  FormControl as CFormControl,
  FormLabel as CFormLabel,
  Select as CSelect,
  Stack as CStack,
  Box as CBox,
  Text as CText,
  Heading as CHeading,
  Alert as CAlert,
  AlertIcon as CAlertIcon,
  AlertDescription as CAlertDescription,
  Spinner as CSpinner,
  Flex as CFlex,
  Form as CForm
} from '@chakra-ui/vue-next'

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
