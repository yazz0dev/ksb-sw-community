<template>
  <CBox>
    <!-- Loading State -->
    <CFlex v-if="loading" direction="column" align="center" justify="center" py={16} color="gray.500">
      <CSpinner size="xl" color="primary.DEFAULT" mb={3} />
      <CText>Loading profile data...</CText>
    </CFlex>

    <!-- Error/Not Found States -->
    <CAlert v-else-if="errorMessage || !user" status="warning" variant="left-accent">
      <CFlex>
        <CIcon name="warning" />
        <CText ml={3}>{{ errorMessage || 'User profile data not available or could not be loaded.' }}</CText>
      </CFlex>
    </CAlert>

    <!-- Main Content -->
    <CGrid v-else templateColumns={{ base: '1fr', lg: '1fr 2fr' }} gap={6}>
      <!-- Left Column -->
      <CBox>
        <CCard variant="outline" p={5}>
          <!-- Profile content converted to Chakra components -->
          <CFlex direction="column" align="center">
            <CBox mb={4}>
              <img :src="user.photoURL || defaultAvatarUrl" :alt="user.name || 'Profile Photo'" class="w-28 h-28 sm:w-36 sm:h-36 mx-auto rounded-full object-cover shadow-md border-4 border-white ring-2 ring-primary" @error="handleImageError" />
            </CBox>
            <CHeading size="lg" mb={5}>{{ user.name || 'User Profile' }}</CHeading>
            <CGrid templateColumns="repeat(3, 1fr)" gap={3} mb={6}>
              <CBox textAlign="center" bg="primary.extraLight" border="1px" borderColor="primary.light" rounded="lg" p={3} shadow="sm">
                <CText fontSize="2xl" fontWeight="bold" color="primary.DEFAULT">{{ stats.participatedCount }}</CText>
                <CText fontSize="xs" color="text.secondary" textTransform="uppercase">Participated</CText>
              </CBox>
              <CBox textAlign="center" bg="primary.extraLight" border="1px" borderColor="primary.light" rounded="lg" p={3} shadow="sm">
                <CText fontSize="2xl" fontWeight="bold" color="primary.DEFAULT">{{ stats.organizedCount }}</CText>
                <CText fontSize="xs" color="text.secondary" textTransform="uppercase">Organized</CText>
              </CBox>
              <CBox textAlign="center" bg="primary.extraLight" border="1px" borderColor="primary.light" rounded="lg" p={3} shadow="sm">
                <CText fontSize="2xl" fontWeight="bold" color="warning.DEFAULT">{{ stats.wonCount }}</CText>
                <CText fontSize="xs" color="text.secondary" textTransform="uppercase">Won</CText>
              </CBox>
            </CGrid>
            <CBox mb={6}>
              <CText fontSize="sm" fontWeight="semibold" color="text.secondary" mb={1}>
                <CIcon name="star" color="warning.DEFAULT" mr={1.5} /> Total XP Earned
              </CText>
              <CText fontSize="4xl" fontWeight="bold" color="text.primary">{{ totalXp }}</CText>
            </CBox>
          </CFlex>
        </CCard>
      </CBox>

      <!-- Right Column -->
      <CStack spacing={6}>
        <!-- XP Breakdown -->
        <CCard v-if="hasXpData" variant="outline">
          <CBox p={4}>
            <CHeading size="md" mb={4}>XP Breakdown by Role</CHeading>
            <CGrid templateColumns="repeat(2, 1fr)" gap={4}>
              <CBox v-for="(xp, role) in user.xpByRole" :key="role" v-if="xp > 0">
                <CFlex justify="space-between" align="center" mb={2}>
                  <CText fontSize="sm" fontWeight="medium">{{ formatRoleName(role) }}</CText>
                  <CBadge colorScheme="primary">{{ xp }} XP</CBadge>
                </CFlex>
                <CProgress value="xpPercentage(xp)" size="sm" colorScheme="primary" />
              </CBox>
            </CGrid>
          </CBox>
        </CCard>
      </CStack>
    </CGrid>
  </CBox>
</template>

<script setup>
import {
  CBox, CText, CFlex, CSpinner, CAlert, CGrid, CCard, 
  CStack, CIcon, CHeading, CBadge, CProgress
} from '@chakra-ui/vue-next';
import { ref, computed, watch, onMounted, toRefs } from 'vue';
import { useStore } from 'vuex';
import { db } from '../firebase';
import { doc, getDoc, collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { DateTime } from 'luxon';
import { formatRoleName as formatRoleNameUtil } from '../utils/formatters';

const props = defineProps({
  userId: {
    type: String,
    required: true
  },
  isCurrentUser: {
    type: Boolean,
    default: false
  }
});

const { userId, isCurrentUser } = toRefs(props);

const defaultAvatarUrl = new URL('../assets/default-avatar.png', import.meta.url).href;

const store = useStore();

const user = ref(null);
const loading = ref(true);
const errorMessage = ref('');
const userProjects = ref([]);
const participatedEvents = ref([]);
const loadingEventsOrProjects = ref(true);

const stats = ref({
  participatedCount: 0,
  organizedCount: 0,
  wonCount: 0
});

const totalXp = computed(() => {
  if (!user.value?.xpByRole) return 0;
  return Object.values(user.value.xpByRole).reduce((sum, val) => sum + (Number(val) || 0), 0);
});

const hasXpData = computed(() => totalXp.value > 0 && user.value?.xpByRole && Object.values(user.value.xpByRole).some(xp => xp > 0));

const handleImageError = (e) => {
  e.target.src = defaultAvatarUrl;
};

const formatRoleName = (roleKey) => {
  return formatRoleNameUtil(roleKey);
};

const xpPercentage = (xp) => {
  const total = totalXp.value;
  return total > 0 ? Math.min(100, (xp / total * 100)) : 0;
};

const fetchProfileData = async () => {
  loading.value = true;
  loadingEventsOrProjects.value = true;
  errorMessage.value = '';
  user.value = null;
  userProjects.value = [];
  participatedEvents.value = [];
  stats.value = { participatedCount: 0, organizedCount: 0, wonCount: 0 };

  try {
    const userDocRef = doc(db, 'users', userId.value);
    const userDocSnap = await getDoc(userDocRef);

    if (!userDocSnap.exists()) {
      throw new Error('User profile not found.');
    }
    user.value = userDocSnap.data();

    if (isCurrentUser.value) {
      await fetchUserProjects(userId.value);
    } else {
      await fetchEventHistory(userId.value);
    }

    if (isCurrentUser.value) {
      await fetchUserStats(userId.value);
    }
  } catch (error) {
    console.error("Error fetching profile data:", error);
    errorMessage.value = error.message || 'Failed to load profile.';
    user.value = null;
  } finally {
    loading.value = false;
  }
};

const fetchUserProjects = async (targetUserId) => {
  loadingEventsOrProjects.value = true;
  try {
    const submissionsQuery = query(
      collection(db, 'submissions'),
      where('userId', '==', targetUserId),
      orderBy('submittedAt', 'desc')
    );
    const snapshot = await getDocs(submissionsQuery);

    userProjects.value = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        eventName: data.eventName || `Event (${data.eventId.substring(0, 5)}...)`,
        eventType: data.eventType || 'Unknown'
      };
    });
  } catch (error) {
    console.error("Error fetching user projects:", error);
    userProjects.value = [];
  } finally {
    loadingEventsOrProjects.value = false;
  }
};

const fetchEventHistory = async (targetUserId) => {
  loadingEventsOrProjects.value = true;
  try {
    const eventsRef = collection(db, 'events');
    const q = query(eventsRef, orderBy('endDate', 'desc'));
    const querySnapshot = await getDocs(q);

    let participated = 0;
    let organized = 0;
    let won = 0;
    const eventsHistory = [];

    querySnapshot.forEach(docSnap => {
      const event = { id: docSnap.id, ...docSnap.data() };
      let isParticipant = false;
      let isOrganizerFlag = false;
      let isWinnerFlag = false;
      let projectSubmission = null;

      if (event.requester === targetUserId || event.organizers?.includes(targetUserId)) {
        isOrganizerFlag = true;
      }

      if (event.isTeamEvent && Array.isArray(event.teams)) {
        const userTeam = event.teams.find(team => team.members?.includes(targetUserId));
        if (userTeam) {
          isParticipant = true;
          if (Array.isArray(event.winners) && event.winners.includes(userTeam.teamName)) isWinnerFlag = true;
          const teamSubmission = event.submissions?.find(sub => sub.teamId === userTeam.teamName);
          if (teamSubmission) projectSubmission = teamSubmission;
        }
      } else if (Array.isArray(event.participants) && event.participants.includes(targetUserId)) {
        isParticipant = true;
        if (Array.isArray(event.winners) && event.winners.includes(targetUserId)) isWinnerFlag = true;
        const userSubmission = event.submissions?.find(sub => sub.userId === targetUserId);
        if (userSubmission) projectSubmission = userSubmission;
      }

      if (isParticipant || isOrganizerFlag) {
        if (isParticipant) participated++;
        if (isOrganizerFlag) organized++;
        if (isWinnerFlag) won++;

        eventsHistory.push({
          id: event.id,
          eventName: event.eventName,
          eventType: event.eventType,
          endDate: event.endDate,
          isWinner: isWinnerFlag,
          isOrganizer: isOrganizerFlag,
          project: projectSubmission
        });
      }
    });

    participatedEvents.value = eventsHistory;
    stats.value = { participatedCount: participated, organizedCount: organized, wonCount: won };
  } catch (error) {
    console.error("Error fetching event history:", error);
    participatedEvents.value = [];
    stats.value = { participatedCount: 0, organizedCount: 0, wonCount: 0 };
  } finally {
    loadingEventsOrProjects.value = false;
  }
};

const fetchUserStats = async (targetUserId) => {
  await fetchEventHistory(targetUserId);
};

onMounted(() => {
  fetchProfileData();
});

watch(userId, (newVal, oldVal) => {
  if (newVal && newVal !== oldVal) {
    fetchProfileData();
  }
});
watch(isCurrentUser, () => {
  fetchProfileData();
});
</script>

<style scoped>
/* Add component-specific styles here if needed */
</style>
