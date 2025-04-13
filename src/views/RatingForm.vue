<template>
  <CBox maxW="2xl" mx="auto" px={[4, 6, 8]} py={6}>
    <CButton
      leftIcon="arrow-left"
      variant="outline"
      size="sm"
      mb={4}
      @click="goBack"
    >
      Back
    </CButton>

    <CHeading v-if="!loading && eventName" size="lg" textAlign="center" mb={2}>
      {{ isTeamEvent ? 'Rate Teams & Select Best Performer' : 'Select Winners' }}
    </CHeading>
    
    <CText v-if="!loading && eventName" textAlign="center" color="text.disabled" mb={6} fontSize="sm">
      Event: {{ eventName }}
    </CText>

    <CFlex v-if="loading" justify="center" align="center" my={10}>
      <CSpinner color="primary" size="lg" />
    </CFlex>

    <CAlert v-else-if="errorMessage" status="error" variant="left-accent">
      <CAlertDescription>{{ errorMessage }}</CAlertDescription>
    </CAlert>

    <CAlert v-else-if="!event" status="warning" variant="left-accent">
      Event not found or ratings are not open.
    </CAlert>

    <CAlert v-else-if="!hasValidRatingCriteria" status="warning" variant="left-accent">
      This event has no valid rating criteria defined. Please contact an event organizer.
    </CAlert>

    <CBox v-else>
      <CCard variant="outline">
        <CCardBody>
          <form @submit.prevent="submitRating">
            <CStack spacing={6}>
              <template v-if="isTeamEvent">
                <!-- Team Event Rating Section -->
                <CBox>
                  <CHeading size="md" mb={4}>Select Best Team per Criterion:</CHeading>
                  <CStack spacing={4} mb={6}>
                    <CFormControl
                      v-for="allocation in sortedXpAllocation"
                      :key="`team-crit-${allocation.constraintIndex}`"
                    >
                      <CFormLabel>{{ allocation.constraintLabel }} ({{ allocation.points }} XP)</CFormLabel>
                      <CSelect
                        v-model="ratings[`constraint${allocation.constraintIndex}`].teamName"
                        required
                        :isDisabled="isSubmitting"
                      >
                        <option disabled value="">Select Team...</option>
                        <option v-for="team in eventTeams" :key="team.teamName" :value="team.teamName">
                          {{ team.teamName }}
                        </option>
                      </CSelect>
                    </CFormControl>
                  </CStack>

                  <CHeading size="md" mb={3} borderTop="1px" borderColor="border" pt={4}>
                    Select Overall Best Performer:
                  </CHeading>
                  <CText v-if="!allTeamMembers || allTeamMembers.length === 0" fontSize="sm" color="text.secondary" fontStyle="italic">
                    No participants found in teams.
                  </CText>
                  <CBox v-else>
                    <CFormControl>
                      <CFormLabel fontSize="xs" color="text.secondary" mb={1}>
                        Select the standout individual participant
                      </CFormLabel>
                      <CSelect
                        v-model="ratings.bestPerformer"
                        required
                        :isDisabled="isSubmitting"
                      >
                        <option disabled value="">Select Participant...</option>
                        <option v-for="member in allTeamMembers" :key="member.uid" :value="member.uid">
                          {{ nameCache[member.uid] || member.uid }} ({{ getTeamNameForMember(member.uid) }})
                        </option>
                      </CSelect>
                      <CText fontSize="xs" color="text.disabled" mt={2} display="flex" alignItems="center">
                        <CIcon name="award" mr={1} color="accent" /> Best Performer gets a bonus 10 XP (General)
                      </CText>
                    </CFormControl>
                  </CBox>
                </CBox>
              </template>

              <template v-else>
                <!-- Individual Event Winner Selection Section -->
                <CBox>
                  <CHeading size="md" mb={4}>Select Winners for Each Criterion:</CHeading>
                  <CStack spacing={4}>
                    <CBox
                      v-for="allocation in sortedXpAllocation"
                      :key="`ind-crit-${allocation.constraintIndex}`"
                      p={4}
                      border="1px"
                      borderColor="border"
                      borderRadius="md"
                      bg="surface-variant"
                    >
                      <CHeading size="sm" mb={3}>
                        {{ allocation.constraintLabel }}
                      </CHeading>
                      <CFormControl>
                        <CFormLabel fontSize="xs" color="text.secondary" mb={1}>
                          Select Winner for {{ allocation.constraintLabel }}
                        </CFormLabel>
                        <CSelect
                          v-model="ratings[`constraint${allocation.constraintIndex}`].winnerId"
                          required
                          :isDisabled="isSubmitting"
                        >
                          <option value="">Choose winner...</option>
                          <option
                            v-for="participantId in availableParticipants"
                            :key="`ind-part-${participantId}`"
                            :value="participantId"
                          >
                            {{ nameCache[participantId] || participantId }}
                          </option>
                        </CSelect>
                        <CText v-if="allocation.points" fontSize="xs" color="text.disabled" mt={2} display="flex" alignItems="center">
                          <CIcon name="trophy" mr={1} color="warning" /> Winner gets {{ allocation.points }} XP
                          <CText as="span" ml={1} color="text.disabled">({{ formatRoleName(allocation.role) }})</CText>
                        </CText>
                      </CFormControl>
                    </CBox>
                  </CStack>
                </CBox>
              </template>

              <CButton
                type="submit"
                variant="primary"
                :isLoading="isSubmitting"
                :isDisabled="!isValid"
                w="full"
              >
                {{ submitButtonText }}
              </CButton>
            </CStack>
          </form>
        </CCardBody>
      </CCard>
    </CBox>
  </CBox>
</template>

<script setup>
import {
  CBox,
  CButton,
  CHeading,
  CText,
  CFlex,
  CSpinner,
  CAlert,
  CAlertDescription,
  CCard,
  CCardBody,
  CStack,
  CFormControl,
  CFormLabel,
  CSelect,
  CIcon,
} from '@chakra-ui/vue-next';
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
  if (isTeamEvent.value || !event.value?.participants) return [];
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
  return roleKey
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase());
};

watch([sortedXpAllocation, isTeamEvent], ([allocations, teamEventStatus]) => {
  Object.keys(ratings).forEach(key => {
    if (key !== 'bestPerformer' || !teamEventStatus) {
      delete ratings[key];
    }
  });

  if (Array.isArray(allocations)) {
    allocations.forEach(allocation => {
      const allocationKey = `constraint${allocation.constraintIndex}`;
      if (!ratings[allocationKey]) {
        ratings[allocationKey] = {};
      }
      if (teamEventStatus) {
        if (ratings[allocationKey].teamName === undefined) ratings[allocationKey].teamName = '';
      } else {
        if (ratings[allocationKey].winnerId === undefined) ratings[allocationKey].winnerId = '';
      }
    });
    if (teamEventStatus && ratings.bestPerformer === undefined) {
      ratings.bestPerformer = '';
    }
    if (!teamEventStatus && ratings.bestPerformer !== undefined) {
      delete ratings.bestPerformer;
    }
  }
}, { immediate: true, deep: true });

async function fetchAndCacheUserName(userId) {
  if (!userId || nameCache[userId]) return;
  nameCache[userId] = 'Loading...';
  try {
    const userDocRef = doc(db, 'users', userId);
    const docSnap = await getDoc(userDocRef);
    nameCache[userId] = docSnap.exists() ? (docSnap.data().name || userId) : `(${userId} not found)`;
  } catch (error) {
    console.error(`Error fetching name for ${userId}:`, error);
    nameCache[userId] = `(Error: ${userId})`;
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
    if (isTeamEvent.value) {
      const teamRatingPayload = {
        eventId: props.eventId,
        selections: {
          criteria: {},
          bestPerformer: ratings.bestPerformer
        }
      };
      Object.keys(ratings).forEach(key => {
        if (key.startsWith('constraint')) {
          const index = key.replace('constraint', '');
          teamRatingPayload.selections.criteria[index] = ratings[key].teamName;
        }
      });
      console.log("Submitting Team Criteria Payload:", teamRatingPayload);
      await store.dispatch('events/submitTeamCriteriaRating', teamRatingPayload);

    } else {
      const individualRatingPayload = {
        eventId: props.eventId,
        ratingType: 'individual',
        selections: {}
      };
      Object.keys(ratings).forEach(key => {
        if (key.startsWith('constraint')) {
          individualRatingPayload.selections[key] = { winnerId: ratings[key].winnerId };
        }
      });
      console.log("Submitting Individual Winner Payload:", individualRatingPayload);
      await store.dispatch('events/submitRating', individualRatingPayload);
    }

    router.push({ name: 'EventDetails', params: { id: props.eventId } });
    store.dispatch('notification/showNotification', { message: 'Ratings submitted successfully!', type: 'success' });

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
  const currentUser = store.getters['user/getUser'];
  if (currentUser?.role === 'Admin') {
    errorMessage.value = 'Administrators cannot submit ratings.';
    router.push({ name: 'Home' });
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

    if (!eventDetails.ratingsOpen) {
      throw new Error('Ratings are currently closed for this event.');
    }

    if (eventDetails.status !== 'Completed') {
      throw new Error('Ratings can only be submitted for completed events.');
    }

    if (isTeamEvent.value) {
      await initializeTeamEventForm(eventDetails);
    } else {
      await initializeIndividualEventForm(eventDetails);
    }

  } catch (error) {
    console.error('Error initializing form:', error);
    errorMessage.value = error.message || 'Failed to load rating details.';
    event.value = null;
  } finally {
    loading.value = false;
  }
};

const initializeTeamEventForm = async (eventDetails) => {
  eventTeams.value = eventDetails.teams || [];
  const memberIds = new Set();
  const tempMemberMap = {};

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
      .sort((a, b) => (userNames[a.uid] || a.uid).localeCompare(userNames[b.uid] || b.uid));
  }

  const existingRating = eventDetails.teamCriteriaRatings?.find(
    r => r.ratedBy === store.getters['user/userId']
  );

  if (existingRating) {
    didLoadExistingRating.value = true;
    Object.entries(existingRating.criteriaSelections || {}).forEach(([index, teamName]) => {
      if (ratings[`constraint${index}`]) {
        ratings[`constraint${index}`].teamName = teamName;
      }
    });
    if (existingRating.bestPerformer) {
      ratings.bestPerformer = existingRating.bestPerformer;
    }
  }
};

const initializeIndividualEventForm = async (eventDetails) => {
  if (eventDetails.participants) {
    const participantNames = await store.dispatch('user/fetchUserNamesBatch', eventDetails.participants);
    Object.entries(participantNames).forEach(([uid, name]) => {
      nameCache[uid] = name;
    });
  }

  const existingRating = eventDetails.ratings?.find(
    r => r.ratedBy === store.getters['user/userId'] && r.type === 'winner_selection'
  );
  const winnersData = eventDetails.winnersPerRole || {};

  if (existingRating || Object.keys(winnersData).length > 0) {
    didLoadExistingRating.value = true;
    sortedXpAllocation.value.forEach(alloc => {
      const role = alloc.role || 'general';
      const winnerId = winnersData[role]?.[0];
      const key = `constraint${alloc.constraintIndex}`;
      if (winnerId && ratings[key]) {
        ratings[key].winnerId = winnerId;
      }
    });
  }
};
</script>
