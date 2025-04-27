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
            
            <!-- Remove Edit Profile Button from here -->

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
import { useStore } from 'vuex';
import { db } from '../firebase';
import { doc, getDoc, updateDoc, collection, query, where, getDocs, orderBy, DocumentData } from 'firebase/firestore';
import { formatISTDate } from '@/utils/dateTime';
import { formatRoleName as formatRoleNameUtil } from '../utils/formatters';
import { Event, EventStatus } from '@/types/event';
import { User } from '@/types/user';
import { getEventStatusBadgeClass } from '@/utils/eventUtils';
import { useRouter } from 'vue-router';


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

console.log('[ProfileViewContent] userId prop:', userId.value);

const defaultAvatarUrl: string = new URL('../assets/default-avatar.png', import.meta.url).href;

const store = useStore();

const user = ref<DocumentData | null>(null);
const loading = ref<boolean>(true);
const errorMessage = ref<string>('');
const userProjects = ref<DocumentData[]>([]);
const participatedEvents = ref<Event[]>([]); // All events relevant to the user (participated or organized)
const loadingEventsOrProjects = ref<boolean>(true);

const organizedEvents = ref<Event[]>([]); // For possible future use or filtering
const participatedEventIds = ref<string[]>([]);
const organizedEventIds = ref<string[]>([]);

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

// Computed property to sort events by date (most recent first)
const sortedEventsHistory = computed(() => {
  return [...participatedEvents.value].sort((a, b) => {
    // Access the Timestamp object and convert to milliseconds
    const timeA = a.details?.date?.start ? a.details.date.start.toMillis() : 0;
    const timeB = b.details?.date?.start ? b.details.date.start.toMillis() : 0;
    // Sort descending (newest first)
    return timeB - timeA;
  });
});

const handleImageError = (e: any) => {
  // Accept any event, fallback to any for Vue template compatibility
  if (e && e.target && 'src' in e.target) {
    (e.target as HTMLImageElement).src = defaultAvatarUrl;
  }
};

const formatRoleName = (roleKey: string) => {
  return formatRoleNameUtil(roleKey);
};

const xpPercentage = (xp: number): number => { // Add return type
  const total = totalXp.value; // total is already a number
  return total > 0 ? Math.min(100, Math.round((xp / total) * 100)) : 0;
};

// Helper to check if the current user organized an event
const isOrganizer = (event: Event): boolean => {
    // Ensure user.value and userId.value are available and event.details.organizers is an array
    if (!user.value || !userId.value || !Array.isArray(event.details?.organizers)) {
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

const fetchProfileData = async () => {
  loading.value = true;
  loadingEventsOrProjects.value = true;
  errorMessage.value = '';
  user.value = null;
  userProjects.value = [];
  participatedEvents.value = [];
  organizedEvents.value = [];
  stats.value = { participatedCount: 0, organizedCount: 0, wonCount: 0 };

  try {
    const userDocRef = doc(db, 'users', userId.value);
    const userDocSnap = await getDoc(userDocRef);

    if (!userDocSnap.exists()) {
      throw new Error('User profile not found.');
    }
    const data = userDocSnap.data();
    if (!data) {
        throw new Error('User data is empty.');
    }
    // Safer assignment ensuring core fields exist for the User type
    user.value = {
        id: userDocSnap.id, // Keep Firestore ID if needed elsewhere, though User type uses uid
        uid: userDocSnap.id, // Assign Firestore ID to uid
        name: data.name || 'Unknown User', // Provide default if name is missing
        ...data // Spread the rest of the data
    } as User; // Cast after ensuring core fields

    // Extract participated/organized event IDs directly from user doc fields
    participatedEventIds.value = Array.isArray(data.participatedEvent) ? data.participatedEvent : [];
    organizedEventIds.value = Array.isArray(data.organizedEvent) ? data.organizedEvent : [];

    // Fetch event objects from the store using the new getter (events themselves are loaded from store, ids from user doc)
    await fetchUserEventsFromStore();
    await fetchUserProjects(userId.value);

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

// Fetch user's events (participated and organized) from the store
const fetchUserEventsFromStore = async () => {
  await store.dispatch('events/fetchEvents');
  const getEventsByIds = store.getters['events/getEventsByIds'] as (ids: string[]) => Event[];
  const allIds = Array.from(new Set([
    ...participatedEventIds.value,
    ...organizedEventIds.value
  ]));

  let allEvents = getEventsByIds(allIds);

  // Filter events based on whether it's the user's own profile or public view
  allEvents = allEvents.filter((event: Event) => {
    const excludedStatuses = [EventStatus.Pending, EventStatus.Cancelled];
    if (props.isCurrentUser) {
      // For own profile: show all except pending and cancelled
      return !excludedStatuses.includes(event.status as EventStatus);
    } else {
      // For public profile: only show completed and closed
      return event.status === EventStatus.Completed || event.status === EventStatus.Closed;
    }
  });

  // Sort by most recent
  allEvents.sort((a, b) => {
    const timeA = a.details?.date?.start ? a.details.date.start.toMillis() : 0;
    const timeB = b.details?.date?.start ? b.details.date.start.toMillis() : 0;
    return timeB - timeA;
  });
  participatedEvents.value = allEvents;

  // Stats
  let participated = 0, organized = 0, won = 0;
  allEvents.forEach((event: Event) => {
    const isOrganizer = Array.isArray(event.details?.organizers) && event.details.organizers.includes(userId.value);
    const isParticipant = Array.isArray(event.participants) && event.participants.includes(userId.value);
    // Team events
    let isWinnerFlag = false;
    if (event.details?.format === 'Team' && Array.isArray(event.teams)) {
      const userTeam = event.teams.find(team => Array.isArray(team.members) && team.members.includes(userId.value));
      if (userTeam) {
        if (event.winners && Object.values(event.winners).flat().includes(userTeam.teamName)) {
          isWinnerFlag = true;
        }
      }
    } else if (event.winners && Object.values(event.winners).flat().includes(userId.value)) {
      isWinnerFlag = true;
    }
    if (isParticipant) participated++;
    if (isOrganizer) organized++;
    if (isWinnerFlag) won++;
  });
  stats.value = { participatedCount: participated, organizedCount: organized, wonCount: won };
};

// Watch for userId changes to refetch data
watch(userId, (newUserId) => {
  if (newUserId) {
    fetchProfileData();
  }
}, { immediate: true });

// Add router
const router = useRouter();

// Replace openEditModal with navigation
const openEditProfile = () => {
  router.push({ name: 'EditProfile', params: { id: userId.value } });
};

// Update expose
defineExpose({
  openEditProfile
});
</script>