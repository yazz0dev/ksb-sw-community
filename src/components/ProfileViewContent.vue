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

<script setup lang="ts">
import { ref, computed, watch, toRefs } from 'vue';
import { useStore } from 'vuex';
import { db } from '../firebase';
import { doc, getDoc, collection, query, where, getDocs, orderBy, DocumentData } from 'firebase/firestore';
import { DateTime } from 'luxon';
import { formatRoleName as formatRoleNameUtil } from '../utils/formatters';
import { Event } from '@/types/event'; // Import Event type

interface Props {
    userId: string;
    isCurrentUser: boolean;
}

interface Stats {
    participatedCount: number;
    organizedCount: number;
    wonCount: number;
}

const props = defineProps<Props>();
const { userId, isCurrentUser } = toRefs(props);

const defaultAvatarUrl: string = new URL('../assets/default-avatar.png', import.meta.url).href;

const store = useStore();

const user = ref<DocumentData | null>(null);
const loading = ref<boolean>(true);
const errorMessage = ref<string>('');
const userProjects = ref<DocumentData[]>([]);
const participatedEvents = ref<DocumentData[]>([]);
const loadingEventsOrProjects = ref<boolean>(true);

const stats = ref<Stats>({
    participatedCount: 0,
    organizedCount: 0,
    wonCount: 0
});

const totalXp = computed((): number => { // Add return type
  if (!user.value?.xpByRole) return 0;
  // Ensure values are numbers before reducing
  return Object.values(user.value.xpByRole).reduce((sum: number, val: unknown) => sum + (Number(val) || 0), 0);
});

const hasXpData = computed((): boolean => { // Add return type
    const xp = totalXp.value; // Use the computed value which is already a number
    return xp > 0 && user.value?.xpByRole && Object.values(user.value.xpByRole).some((xpVal: unknown) => Number(xpVal) > 0);
});

const filteredXpByRole = computed(() => {
  if (!user.value?.xpByRole) return {};
  return Object.entries(user.value.xpByRole)
    .filter(([role, xp]: [string, unknown]) => Number(xp) > 0) // Type entry and check Number(xp)
    .reduce((acc: Record<string, number>, [role, xp]: [string, unknown]) => { // Type accumulator and entry
      acc[role] = Number(xp); // Assign Number(xp)
      return acc;
    }, {});
});

const handleImageError = (e: Event) => {
  (e.target as HTMLImageElement).src = defaultAvatarUrl;
};

const formatRoleName = (roleKey: string) => {
  return formatRoleNameUtil(roleKey);
};

const xpPercentage = (xp: number): number => { // Add return type
  const total = totalXp.value; // total is already a number
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
    user.value = { id: userDocSnap.id, ...userDocSnap.data() };

    // Fetch participated events and projects in parallel
    await Promise.all([
        fetchParticipatedEvents(),
        fetchUserProjects(userId.value)
    ]);

  } catch (error: any) { // Type error
    console.error('Error fetching profile data:', error);
    errorMessage.value = error?.message || 'Failed to load profile.';
  } finally {
    loading.value = false;
    loadingEventsOrProjects.value = false;
  }
};

const fetchUserProjects = async (targetUserId: string) => {
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

const fetchParticipatedEvents = async () => {
  if (!userId.value) return;
  const targetUserId = userId.value;
  try {
    // Fetch all events (consider filtering by status or date range if needed)
    const allEvents: Event[] = await store.dispatch('events/fetchEvents'); // Assuming fetchEvents returns Event[]

    const eventsHistory: Event[] = [];
    let participated = 0;
    let organized = 0;
    let won = 0;

    allEvents.forEach((event: Event) => { // Ensure event is typed as Event
      let isParticipant = false;
      let isOrganizerFlag = false;
      let isPartOfEvent = false;
      let isWinnerFlag = false;

      // Check if organizer
      if (Array.isArray(event.organizers) && event.organizers.includes(targetUserId)) {
        isOrganizerFlag = true;
        isPartOfEvent = true;
      }

      // Check participation and winning status based on event type
      if (event.isTeamEvent && Array.isArray(event.teams)) {
        const userTeam = event.teams.find(team => Array.isArray(team.members) && team.members.includes(targetUserId));
        if (userTeam) {
          isParticipant = true;
          isPartOfEvent = true;
          // Check winnersPerRole for team events (assuming teamName is the key or value)
          if (event.winnersPerRole && Object.values(event.winnersPerRole).flat().includes(userTeam.teamName)) {
              isWinnerFlag = true;
          }
        }
      } else if (Array.isArray(event.participants) && event.participants.includes(targetUserId)) {
          isParticipant = true;
          isPartOfEvent = true;
          // Check winnersPerRole for individual events
          if (event.winnersPerRole && Object.values(event.winnersPerRole).flat().includes(targetUserId)) {
              isWinnerFlag = true;
          }
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


