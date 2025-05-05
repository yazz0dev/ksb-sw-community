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
                style="width: 110px; height: 110px; object-fit: cover;"
                @error="handleImageError"
              />
            </div>
            <h1 class="h4 mb-2">{{ user.name || 'User Profile' }}</h1>

            <!-- REMOVED: Edit Profile Button from here. Parent view should handle this. -->

            <!-- Social Link -->
            <div v-if="user.socialLink" class="mb-3">
              <a :href="user.socialLink" target="_blank" rel="noopener noreferrer" class="btn btn-sm btn-outline-info">
                <i class="fas fa-link me-1"></i> Social Profile
              </a>
            </div>

            <!-- Bio -->
            <p v-if="user.bio" class="text-muted small mb-4">{{ user.bio }}</p>
            <p v-else class="text-muted small fst-italic mb-4">No bio provided.</p>

            <!-- Stats Section -->
            <div class="d-flex justify-content-around mb-5">
              <div class="text-center">
                <div class="bg-primary-subtle text-primary-emphasis p-2 rounded mb-1">
                  <h5 class="h5 mb-0">{{ stats.participatedCount }}</h5> <!-- h4 to h5 -->
                </div>
                <small class="text-muted text-uppercase">Participated</small>
              </div>
              <div class="text-center">
                 <div class="bg-primary-subtle text-primary-emphasis p-2 rounded mb-1">
                  <h5 class="h5 mb-0">{{ stats.organizedCount }}</h5> <!-- h4 to h5 -->
                 </div>
                <small class="text-muted text-uppercase">Organized</small>
              </div>
              <div class="text-center">
                 <div class="bg-warning-subtle text-warning-emphasis p-2 rounded mb-1">
                  <h5 class="h5 mb-0">{{ stats.wonCount }}</h5> <!-- h4 to h5 -->
                 </div>
                <small class="text-muted text-uppercase">Won</small>
              </div>
            </div>
            <!-- Total XP Section -->
            <div class="mb-4">
              <p class="small fw-semibold text-secondary mb-1">
                <i class="fas fa-star text-warning me-1"></i> Total XP Earned
              </p>
              <p class="fs-2 text-primary fw-bold">{{ totalXp }}</p> <!-- display-5 to fs-2 -->
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

           <!-- Event History -->
           <!-- NOTE: Consider fetching events from store state/getters instead of direct Firestore query here for efficiency -->
           <div v-if="sortedEventsHistory.length > 0" class="card shadow-sm">
             <div class="card-header">
               <h5 class="card-title mb-0">Event History</h5>
             </div>
             <ul class="list-group list-group-flush">
               <li
                 v-for="event in sortedEventsHistory"
                 :key="event.id"
                 class="list-group-item px-3 py-3"
               >
                 <!-- Row 1: Event Name & Format with Organizer Badge -->
                 <div class="d-flex justify-content-between align-items-center gap-2 mb-2">
                   <div class="d-flex align-items-center">
                     <i class="fas fa-calendar-alt text-primary me-2"></i>
                     <router-link
                       :to="{ name: 'EventDetails', params: { id: event.id } }"
                       class="fw-semibold text-primary text-decoration-none me-2"
                     >
                       {{ event.details?.eventName || 'Unnamed Event' }}
                     </router-link>
                     <span v-if="event.details?.format" class="badge bg-secondary-subtle text-secondary-emphasis small ms-2">
                       <i class="fas fa-users me-1"></i>{{ formatEventFormat(event.details.format) }}
                     </span>
                   </div>
                   <span
                     v-if="isOrganizer(event)"
                     class="badge bg-success-subtle text-success-emphasis rounded-pill"
                   >
                     <i class="fas fa-crown me-1"></i> Organizer
                   </span>
                 </div>

                 <!-- Row 2: Type, Status and Date -->
                 <div class="d-flex justify-content-between align-items-center">
                   <span v-if="event.details?.type" class="badge bg-info-subtle text-info-emphasis small">
                     <i class="fas fa-tag me-1"></i>{{ event.details.type }}
                   </span>
                   <div class="d-flex align-items-center gap-2">
                     <span
                       class="badge rounded-pill"
                       :class="getEventStatusBadgeClass(event.status)"
                     >
                       {{ event.status }}
                     </span>
                     <span class="badge bg-light text-secondary border border-1 fw-normal">
                       {{ formatISTDate(event.details?.date?.start) }}
                     </span>
                   </div>
                 </div>
               </li>
             </ul>
             <div v-if="loadingEventsOrProjects" class="card-footer text-center text-muted small">
                Loading event details...
             </div>
           </div>
           <div v-else-if="!loadingEventsOrProjects" class="card shadow-sm">
              <div class="card-body text-center text-muted">
                No event participation history found.
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
import { ref, computed, watch, toRefs, nextTick, onMounted, onUnmounted, reactive } from 'vue';
import { useUserStore } from '@/store/user';
import { useEventStore } from '@/store/events';
import { formatISTDate } from '@/utils/dateTime';
import { formatRoleName as formatRoleNameUtil } from '@/utils/formatters'; // Renamed import
import { Event, EventStatus, EventFormat } from '@/types/event';
import { User } from '@/types/user'; // Import User type
import { getEventStatusBadgeClass } from '@/utils/eventUtils';
import { useRouter } from 'vue-router';
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  DocumentData,
  doc,
  getDoc
} from 'firebase/firestore';
import { db } from '@/firebase'; // Ensure db is imported if used directly


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
const { userId } = toRefs(props);

const userStore = useUserStore();
const eventStore = useEventStore();
const router = useRouter();

// --- State Refs ---
const user = ref<User | null>(null); // Use User type
const loading = ref<boolean>(true);
const errorMessage = ref<string>('');
const userProjects = ref<DocumentData[]>([]); // Or a more specific Project type
const participatedEvents = ref<Event[]>([]);
const loadingEventsOrProjects = ref<boolean>(true);
const stats = ref<Stats>({ participatedCount: 0, organizedCount: 0, wonCount: 0 });
const participatedEventIds = ref<string[]>([]);
const organizedEventIds = ref<string[]>([]);
const defaultAvatarUrl: string = new URL('../assets/default-avatar.png', import.meta.url).href;


// --- Computed Properties ---
const totalXp = computed((): number => {
  if (!user.value?.xpByRole) return 0;
  return Object.values(user.value.xpByRole).reduce((sum: number, val: unknown) => sum + (Number(val) || 0), 0);
});

const hasXpData = computed((): boolean => {
    const xp = totalXp.value;
    return xp > 0 && user.value?.xpByRole && Object.values(user.value.xpByRole).some((xpVal: unknown) => Number(xpVal) > 0);
});

const filteredXpByRole = computed(() => {
  if (!user.value?.xpByRole) return {};
  return Object.entries(user.value.xpByRole)
    .filter(([role, xp]: [string, unknown]) => Number(xp) > 0)
    .reduce((acc: Record<string, number>, [role, xp]: [string, unknown]) => {
      acc[role] = Number(xp);
      return acc;
    }, {});
});

const sortedEventsHistory = computed(() => {
  return [...participatedEvents.value].sort((a, b) => {
    const timeA = a.details?.date?.start?.toMillis() ?? 0; // Use Optional Chaining and Nullish Coalescing
    const timeB = b.details?.date?.start?.toMillis() ?? 0;
    return timeB - timeA; // Sort descending
  });
});

// --- Methods ---
const handleImageError = (e: Event) => { // Use standard Event type
  const target = e.target as HTMLImageElement;
  if (target) {
    target.src = defaultAvatarUrl;
  }
};

const formatRoleName = (roleKey: string) => {
  return formatRoleNameUtil(roleKey); // Use imported util
};

const xpPercentage = (xp: number): number => {
  const total = totalXp.value;
  return total > 0 ? Math.min(100, Math.round((xp / total) * 100)) : 0;
};

const isOrganizer = (event: Event): boolean => {
    if (!userId.value || !Array.isArray(event.details?.organizers)) { // Check userId prop directly
        return false;
    }
    return event.details.organizers.includes(userId.value);
};

const formatEventFormat = (format: string | undefined): string => {
  if (!format) return '';
  if (format === 'Team') return 'Team Event';
  if (format === 'Individual') return 'Individual Event';
  return format;
};

// --- Data Fetching ---
// NOTE: Consider moving event/project fetching logic to the parent view (ProfileView.vue)
//       or refactoring to use Pinia store getters for better separation of concerns and efficiency.
const fetchProfileData = async () => {
    loading.value = true;
    loadingEventsOrProjects.value = true;
    errorMessage.value = '';
    user.value = null;
    userProjects.value = [];
    participatedEvents.value = [];
    stats.value = { participatedCount: 0, organizedCount: 0, wonCount: 0 };

    try {
        // 1. Fetch User Profile from Store (or directly if store logic is complex)
        const userDocRef = doc(db, 'users', userId.value); // Use prop value
        const userDocSnap = await getDoc(userDocRef);

        if (!userDocSnap.exists()) {
            throw new Error('User data not found.');
        }
        const data = userDocSnap.data();
        // Map to User type
        user.value = {
            uid: userDocSnap.id,
            name: data.name || 'Unknown User',
            photoURL: data.photoURL,
            bio: data.bio,
            socialLink: data.socialLink,
            xpByRole: data.xpByRole || {},
            skills: data.skills || [],
            preferredRoles: data.preferredRoles || [],
            participatedEvent: data.participatedEvent || [],
            organizedEvent: data.organizedEvent || [],
            // Ensure isAuthenticated is handled correctly if needed here
        } as User;

        participatedEventIds.value = user.value.participatedEvent || [];
        organizedEventIds.value = user.value.organizedEvent || [];

        // 2. Fetch Events and Projects (consider using store getters if possible)
        await fetchUserEventsFromStore(); // This now uses the IDs from the fetched user data
        await fetchUserProjects(userId.value); // Use prop value

    } catch (error: any) {
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
    // NOTE: If projects are needed elsewhere, consider moving this to the store
    const submissionsQuery = query(
      collection(db, 'submissions'),
      where('userId', '==', targetUserId),
      orderBy('submittedAt', 'desc')
    );
    const snapshot = await getDocs(submissionsQuery);
    userProjects.value = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error fetching user projects:", error);
    userProjects.value = [];
  } finally {
    loadingEventsOrProjects.value = false;
  }
};

const fetchUserEventsFromStore = async () => {
  // NOTE: Ideally, fetch all events once globally (e.g., in App.vue or a route guard)
  //       and then use store getters here for filtering.
  //       This avoids redundant fetches if the store already has the data.

  const allIds = Array.from(new Set([
    ...participatedEventIds.value,
    ...organizedEventIds.value
  ]));

  if (allIds.length === 0) {
      participatedEvents.value = [];
      stats.value = { participatedCount: 0, organizedCount: 0, wonCount: 0 };
      return;
  }

  // Ensure store events are loaded (this might be redundant if loaded globally)
  // await eventStore.fetchEvents();

  const getEventsByIds = eventStore.getEventsByIds; // Use getter
  let allUserEvents = getEventsByIds(allIds);

  // Filter based on profile view context
  allUserEvents = allUserEvents.filter((event: Event) => {
    const excludedStatuses: EventStatus[] = [EventStatus.Pending, EventStatus.Cancelled, EventStatus.Rejected];
    if (props.isCurrentUser) {
      // Show most statuses for own profile
      return !excludedStatuses.includes(event.status as EventStatus);
    } else {
      // Show only completed/relevant statuses for public view
      return [EventStatus.Completed, EventStatus.Closed, EventStatus.InProgress, EventStatus.Approved].includes(event.status as EventStatus);
    }
  });

  participatedEvents.value = allUserEvents; // Store filtered events

  // Calculate stats based on filtered events
  let participated = 0, organized = 0, won = 0;
  allUserEvents.forEach((event: Event) => {
      const isOrg = Array.isArray(event.details?.organizers) && event.details.organizers.includes(userId.value);
      const isPart = Array.isArray(event.participants) && event.participants.includes(userId.value);
      let isTeamMember = false;
      if (event.details?.format === EventFormat.Team && Array.isArray(event.teams)) {
          isTeamMember = event.teams.some(team => Array.isArray(team.members) && team.members.includes(userId.value));
      }

      let isWinnerFlag = false;
       // Check if user ID is directly listed as a winner
       if (event.winners && Object.values(event.winners).some(winnerList => winnerList.includes(userId.value))) {
           isWinnerFlag = true;
       }
       // If it's a team event and the user is a member of a winning team
       else if (event.details?.format === EventFormat.Team && isTeamMember && event.winners) {
           const userTeam = event.teams?.find(team => team.members?.includes(userId.value));
           if (userTeam && Object.values(event.winners).some(winnerList => winnerList.includes(userTeam.teamName))) {
               isWinnerFlag = true;
           }
       }


      if (isPart || isTeamMember) participated++; // Count if direct participant or team member
      if (isOrg) organized++;
      if (isWinnerFlag) won++;
  });
  stats.value = { participatedCount: participated, organizedCount: organized, wonCount: won };
};


// --- Watcher ---
watch(userId, (newUserId) => {
  if (newUserId && typeof newUserId === 'string') { // Ensure it's a string
    fetchProfileData();
  } else {
      // Handle case where userId becomes invalid or null
      loading.value = false;
      errorMessage.value = "Invalid User ID.";
      user.value = null;
  }
}, { immediate: true });

// REMOVED: defineExpose for openEditProfile. Navigation should be handled by parent.

</script>

<style scoped>
/* Style adjustments can go here */
</style>