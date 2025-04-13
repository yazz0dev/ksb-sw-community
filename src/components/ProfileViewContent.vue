<template>
  <div>
    <!-- Loading State -->
    <div v-if="loading" class="is-flex is-flex-direction-column is-align-items-center is-justify-content-center py-6 has-text-grey">
      <div class="loader is-loading mb-3" style="height: 4rem; width: 4rem; border: 5px solid var(--bulma-primary); border-right-color: transparent; border-top-color: transparent;"></div>
      <p>Loading profile data...</p>
    </div>

    <!-- Error/Not Found States -->
    <div v-else-if="errorMessage || !user" class="message is-warning">
      <div class="message-body">
        <div class="is-flex is-align-items-center">
          <span class="icon has-text-warning"><i class="fas fa-exclamation-triangle"></i></span>
          <span class="ml-3">{{ errorMessage || 'User profile data not available or could not be loaded.' }}</span>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div v-else class="columns is-variable is-6-desktop">
      <!-- Left Column -->
      <div class="column is-one-third-desktop">
        <div class="card">
          <div class="card-content has-text-centered">
            <div class="mb-4">
              <figure class="image is-128x128 is-inline-block">
                 <img 
                    :src="user.photoURL || defaultAvatarUrl" 
                    :alt="user.name || 'Profile Photo'" 
                    class="is-rounded" 
                    style="object-fit: cover; border: 3px solid var(--bulma-primary); box-shadow: 0 2px 4px rgba(0,0,0,0.1);"
                    @error="handleImageError" 
                  />
              </figure>
            </div>
            <h1 class="title is-4 mb-5">{{ user.name || 'User Profile' }}</h1>
            <div class="level is-mobile mb-6">
              <div class="level-item has-text-centered">
                <div class="box" style="background-color: var(--color-primary-light); border: 1px solid var(--color-primary-border); border-radius: 6px; padding: 0.75rem;">
                  <p class="title is-4 has-text-primary">{{ stats.participatedCount }}</p>
                  <p class="heading is-size-7">Participated</p>
                </div>
              </div>
              <div class="level-item has-text-centered">
                <div class="box" style="background-color: var(--color-primary-light); border: 1px solid var(--color-primary-border); border-radius: 6px; padding: 0.75rem;">
                  <p class="title is-4 has-text-primary">{{ stats.organizedCount }}</p>
                  <p class="heading is-size-7">Organized</p>
                </div>
              </div>
              <div class="level-item has-text-centered">
                <div class="box" style="background-color: var(--color-primary-light); border: 1px solid var(--color-primary-border); border-radius: 6px; padding: 0.75rem;">
                  <p class="title is-4 has-text-warning">{{ stats.wonCount }}</p>
                  <p class="heading is-size-7">Won</p>
                </div>
              </div>
            </div>
            <div class="mb-6">
              <p class="is-size-7 has-text-weight-semibold has-text-grey mb-1">
                <span class="icon has-text-warning mr-1"><i class="fas fa-star"></i></span> Total XP Earned
              </p>
              <p class="title is-2 has-text-primary">{{ totalXp }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Right Column -->
      <div class="column">
        <div class="is-flex is-flex-direction-column" style="gap: 1.5rem;">
          <!-- XP Breakdown -->
          <div v-if="hasXpData" class="card">
             <header class="card-header">
               <p class="card-header-title">XP Breakdown by Role</p>
             </header>
             <div class="card-content">
               <div class="columns is-multiline is-variable is-4">
                  <div v-for="(xp, role) in filteredXpByRole" :key="role" class="column is-half">
                    <div class="is-flex is-justify-content-space-between is-align-items-center mb-2">
                      <span class="is-size-7 has-text-weight-medium">{{ formatRoleName(role) }}</span>
                      <span class="tag is-primary is-light is-rounded">{{ xp }} XP</span>
                    </div>
                    <progress class="progress is-primary is-small" :value="xpPercentage(xp)" max="100"></progress>
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
          project: event.submissions?.find(sub => sub.userId === targetUserId)
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

onMounted(() => {
  fetchProfileData();
});

watch(userId, (newVal, oldVal) => {
  if (newVal && newVal !== oldVal) {
    fetchProfileData();
  }
});
</script>

<style scoped>
.box .heading {
    text-transform: uppercase;
    letter-spacing: 1px;
}

.progress::-webkit-progress-value {
    transition: width 0.5s ease;
}
.progress::-moz-progress-bar {
    transition: width 0.5s ease;
}
.progress::-ms-fill {
    transition: width 0.5s ease;
}

/* Ensure image within figure respects boundaries */
.image img {
  display: block;
  height: auto;
  width: 100%;
}

/* Adjustments for Bulma's box padding if needed */
.box {
  padding: 1rem; /* Example adjustment */
}
</style>
