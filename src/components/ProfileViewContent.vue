<template>
  <div>
    <!-- Loading State -->
    <div v-if="loading" class="d-flex flex-column align-items-center justify-content-center py-5 text-secondary">
      <div class="spinner-border text-primary mb-3" role="status" style="width: 4rem; height: 4rem;">
        <span class="visually-hidden">Loading...</span>
      </div>
      <p>Loading profile data...</p>
    </div>

    <!-- Error/Not Found States -->
    <div v-else-if="errorMessage || !user" class="alert alert-warning d-flex align-items-center" role="alert">
        <i class="fas fa-exclamation-triangle me-3"></i>
        <div>{{ errorMessage || 'User profile data not available or could not be loaded.' }}</div>
    </div>

    <!-- Main Content -->
    <div v-else class="row g-4 g-lg-5">
      <!-- Left Column -->
      <div class="col-lg-4">
        <div class="card shadow-sm">
          <div class="card-body text-center p-4">
            <div class="mb-4">
              <img 
                :src="user.photoURL || defaultAvatarUrl" 
                :alt="user.name || 'Profile Photo'" 
                class="img-fluid rounded-circle border border-3 border-primary shadow-sm" 
                style="width: 128px; height: 128px; object-fit: cover;" 
                @error="handleImageError" 
              />
            </div>
            <h1 class="h4 mb-4">{{ user.name || 'User Profile' }}</h1>
            <!-- Stats Section -->
            <div class="d-flex justify-content-around mb-5">
              <div class="text-center">
                <div class="bg-primary-subtle text-primary-emphasis p-2 rounded mb-1">
                  <h4 class="h4 mb-0">{{ stats.participatedCount }}</h4>
                </div>
                <small class="text-muted text-uppercase">Participated</small>
              </div>
              <div class="text-center">
                 <div class="bg-primary-subtle text-primary-emphasis p-2 rounded mb-1">
                  <h4 class="h4 mb-0">{{ stats.organizedCount }}</h4>
                 </div>
                <small class="text-muted text-uppercase">Organized</small>
              </div>
              <div class="text-center">
                 <div class="bg-warning-subtle text-warning-emphasis p-2 rounded mb-1">
                  <h4 class="h4 mb-0">{{ stats.wonCount }}</h4>
                 </div>
                <small class="text-muted text-uppercase">Won</small>
              </div>
            </div>
            <!-- Total XP Section -->
            <div class="mb-4">
              <p class="small fw-semibold text-secondary mb-1">
                <i class="fas fa-star text-warning me-1"></i> Total XP Earned
              </p>
              <p class="display-5 text-primary fw-bold">{{ totalXp }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Right Column -->
      <div class="col-lg-8">
        <div class="d-flex flex-column gap-4">
          <!-- XP Breakdown -->
          <div v-if="hasXpData" class="card shadow-sm">
             <div class="card-header">
               <h5 class="card-title mb-0">XP Breakdown by Role</h5>
             </div>
             <div class="card-body">
               <div class="row g-4">
                  <div v-for="(xp, role) in filteredXpByRole" :key="role" class="col-md-6">
                    <div class="d-flex justify-content-between align-items-center mb-2">
                      <span class="small fw-medium">{{ formatRoleName(role) }}</span>
                      <span class="badge bg-primary-subtle text-primary-emphasis rounded-pill">{{ xp }} XP</span>
                    </div>
                    <div class="progress" role="progressbar" :aria-valuenow="xpPercentage(xp)" aria-valuemin="0" aria-valuemax="100" style="height: 8px;">
                      <div class="progress-bar bg-primary" :style="{ width: xpPercentage(xp) + '%' }"></div>
                    </div>
                  </div>
                </div>
             </div>
           </div>

           <!-- Additional Content Slot -->
           <slot name="additional-content"></slot>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
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

const filteredXpByRole = computed(() => {
  if (!user.value?.xpByRole) return {};
  return Object.entries(user.value.xpByRole)
    .filter(([role, xp]) => xp > 0)
    .reduce((acc, [role, xp]) => {
      acc[role] = xp;
      return acc;
    }, {});
});

const handleImageError = (e) => {
  e.target.src = defaultAvatarUrl;
};

const formatRoleName = (roleKey) => {
  return formatRoleNameUtil(roleKey);
};

const xpPercentage = (xp) => {
  const total = totalXp.value;
  return total > 0 ? Math.min(100, Math.round((xp / total) * 100)) : 0;
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
    user.value = { uid: userDocSnap.id, ...userDocSnap.data() };

    await fetchEventHistory(userId.value);

  } catch (error) {
    console.error("Error fetching profile data:", error);
    errorMessage.value = error.message || 'Failed to load profile.';
    user.value = null;
  } finally {
    loading.value = false;
    loadingEventsOrProjects.value = false;
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
      let isPartOfEvent = false;

      if (event.requester === targetUserId || (Array.isArray(event.organizers) && event.organizers.includes(targetUserId))) {
        isOrganizerFlag = true;
        isPartOfEvent = true;
      }

      if (event.isTeamEvent && Array.isArray(event.teams)) {
        const userTeam = event.teams.find(team => Array.isArray(team.members) && team.members.includes(targetUserId));
        if (userTeam) {
          isParticipant = true;
          isPartOfEvent = true;
          if (Array.isArray(event.winners) && event.winners.includes(userTeam.teamName)) isWinnerFlag = true;
        }
      } else if (Array.isArray(event.participants) && event.participants.includes(targetUserId)) {
          isParticipant = true;
          isPartOfEvent = true;
          if (Array.isArray(event.winners) && event.winners.includes(targetUserId)) isWinnerFlag = true;
      }

      if (isPartOfEvent) {
          eventsHistory.push(event);
          if (isParticipant) participated++;
          if (isOrganizerFlag) organized++;
          if (isWinnerFlag) won++;
      }
    });

    participatedEvents.value = eventsHistory;
    stats.value = { participatedCount: participated, organizedCount: organized, wonCount: won };

  } catch (error) {
    console.error("Error fetching event history:", error);
    participatedEvents.value = [];
    stats.value = { participatedCount: 0, organizedCount: 0, wonCount: 0 };
  }
};

// Watch for userId changes to refetch data
watch(userId, (newUserId) => {
  if (newUserId) {
    fetchProfileData();
  }
}, { immediate: true });

</script>

<style scoped>
/* Add any component-specific styles here */
</style>
