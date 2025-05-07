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
              <!-- FIX: Use global Event type for @error -->
              <img
                :src="user.photoURL || defaultAvatarUrl"
                :alt="user.name || 'Profile Photo'"
                class="img-fluid rounded-circle border border-3 border-primary shadow-sm"
                style="width: 110px; height: 110px; object-fit: cover;"
                @error="handleImageError"
              />
            </div>
            <h1 class="h4 mb-2">{{ user.name || 'User Profile' }}</h1>

            <!-- Edit Profile Button Added Here -->
            <button
              v-if="isCurrentUserProp"
              @click="openEditProfile"
              class="btn btn-sm btn-outline-primary mb-3"
            >
              <i class="fas fa-edit me-1"></i> Edit Profile
            </button>

            <!-- Social Link -->
            <div v-if="user.socialLink" class="mb-3">
              <a :href="user.socialLink" target="_blank" rel="noopener noreferrer" class="btn btn-sm btn-outline-info d-inline-flex align-items-center">
                <i :class="['fab', socialLinkDetails.icon, 'me-2']" v-if="socialLinkDetails.isFontAwesomeBrand"></i>
                <i :class="['fas', socialLinkDetails.icon, 'me-2']" v-else></i>
                {{ socialLinkDetails.name }}
              </a>
            </div>

            <!-- Bio -->
            <p v-if="user.bio" class="text-muted small mb-4">{{ user.bio }}</p>
            <p v-else class="text-muted small fst-italic mb-4">No bio provided.</p>

            <!-- Skills Section -->
            <div v-if="user.skills && user.skills.length > 0" class="mb-4">
              <h6 class="text-secondary small fw-semibold mb-2"><i class="fas fa-code me-1"></i> Skills</h6>
              <div>
                <span v-for="skill in user.skills" :key="skill" class="badge bg-light text-dark border me-1 mb-1">{{ skill }}</span>
              </div>
            </div>

            <!-- Preferred Roles Section -->
            <div v-if="user.preferredRoles && user.preferredRoles.length > 0" class="mb-4">
              <h6 class="text-secondary small fw-semibold mb-2"><i class="fas fa-user-tag me-1"></i> Preferred Roles</h6>
              <div>
                <span v-for="role in user.preferredRoles" :key="role" class="badge bg-light text-dark border me-1 mb-1">{{ formatRoleName(role) }}</span>
              </div>
            </div>

            <!-- Has Laptop Section -->
            <div class="mb-4">
              <h6 class="text-secondary small fw-semibold mb-2"><i class="fas fa-laptop me-1"></i> Equipment</h6>
              <div>
                <span class="badge border me-1 mb-1" :class="user.hasLaptop ? 'bg-success-subtle text-success-emphasis' : 'bg-danger-subtle text-danger-emphasis'">
                  <i :class="['fas', user.hasLaptop ? 'fa-check-circle' : 'fa-times-circle', 'me-1']"></i>
                  {{ user.hasLaptop ? 'Has Laptop' : 'No Laptop' }}
                </span>
              </div>
            </div>

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
                 v-for="eventItem in sortedEventsHistory"
                 :key="eventItem.id"
                 class="list-group-item px-3 py-3"
               >
                 <!-- Row 1: Event Name & Format with Organizer Badge -->
                 <div class="d-flex justify-content-between align-items-center gap-2 mb-2">
                   <div class="d-flex align-items-center">
                     <i class="fas fa-calendar-alt text-primary me-2"></i>
                     <router-link
                       :to="{ name: 'EventDetails', params: { id: eventItem.id } }"
                       class="fw-semibold text-primary text-decoration-none me-2"
                     >
                       {{ eventItem.details?.eventName || 'Unnamed Event' }}
                     </router-link>
                     <span v-if="eventItem.details?.format" class="badge bg-secondary-subtle text-secondary-emphasis small ms-2">
                       <i class="fas fa-users me-1"></i>{{ formatEventFormat(eventItem.details.format) }}
                     </span>
                   </div>
                   <span
                     v-if="isOrganizer(eventItem)"
                     class="badge bg-success-subtle text-success-emphasis rounded-pill"
                   >
                     <i class="fas fa-crown me-1"></i> Organizer
                   </span>
                 </div>

                 <!-- Row 2: Type, Status and Date -->
                 <div class="d-flex justify-content-between align-items-center">
                   <span v-if="eventItem.details?.type" class="badge bg-info-subtle text-info-emphasis small">
                     <i class="fas fa-tag me-1"></i>{{ eventItem.details.type }}
                   </span>
                   <div class="d-flex align-items-center gap-2">
                     <span
                       class="badge rounded-pill"
                       :class="getEventStatusBadgeClass(eventItem.status)"
                     >
                       {{ eventItem.status }}
                     </span>
                     <span class="badge bg-light text-secondary border border-1 fw-normal">
                       {{ formatISTDate(eventItem.details?.date?.start) }}
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

           <!-- User Projects Section -->
            <div v-if="userProjects.length > 0" class="card shadow-sm mt-4">
              <div class="card-header">
                <h5 class="card-title mb-0"><i class="fas fa-folder-open text-primary me-2"></i>My Projects</h5>
              </div>
              <ul class="list-group list-group-flush">
                <li v-for="project in userProjects" :key="project.id" class="list-group-item px-3 py-3">
                  <div class="d-flex justify-content-between align-items-start">
                    <div>
                      <h6 class="mb-1">{{ project.projectName || 'Unnamed Project' }}</h6>
                      <small v-if="project.eventName" class="text-muted d-block mb-1">
                        <i class="fas fa-calendar-alt me-1"></i> Event: {{ project.eventName }}
                      </small>
                      <small v-else-if="project.eventId" class="text-muted d-block mb-1">
                        <i class="fas fa-calendar-alt me-1"></i> Event ID: {{ project.eventId }}
                      </small>
                    </div>
                    <a :href="project.link" target="_blank" rel="noopener noreferrer" class="btn btn-sm btn-outline-primary mt-1" v-if="project.link">
                      <i class="fas fa-external-link-alt me-1"></i> View Project
                    </a>
                  </div>
                  <p v-if="project.description" class="small text-muted mt-2 mb-0">{{ project.description }}</p>
                </li>
              </ul>
              <div v-if="loadingEventsOrProjects" class="card-footer text-center text-muted small">
                 Loading project details...
              </div>
            </div>
            <div v-else-if="!loadingEventsOrProjects && initialDataLoaded" class="card shadow-sm mt-4"> <!-- Added initialDataLoaded check -->
              <div class="card-body text-center text-muted">
                No projects submitted yet.
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
import { ref, computed, watch, onMounted } from 'vue';
import { useUserStore } from '@/store/user';
import { useEventStore } from '@/store/events';
import { formatISTDate } from '@/utils/dateTime';
import { formatRoleName as formatRoleNameUtil } from '@/utils/formatters'; // Renamed import
// FIX: Rename imported Event type to avoid clash
import { Event as AppEvent, EventStatus, EventFormat } from '@/types/event';
import { User, UserData } from '@/types/user'; // Import UserData
import { getEventStatusBadgeClass } from '@/utils/eventUtils';
import { useRouter } from 'vue-router'; // Keep useRouter if needed for navigation later
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
    isCurrentUserProp: boolean; // Renamed prop to avoid conflict with local ref
}

interface Stats {
    participatedCount: number;
    organizedCount: number;
    wonCount: number;
}

interface UserProjectDisplay {
  id: string;
  projectName: string;
  link: string;
  description?: string;
  eventId?: string;
  eventName?: string;
  submittedAt?: any; // Firestore Timestamp or string
}

const props = defineProps<Props>();
// FIX: Initialize local ref from prop
const isCurrentUser = ref<boolean>(props.isCurrentUserProp);

const userStore = useUserStore();
const eventStore = useEventStore();
const router = useRouter();

// --- State Refs ---
const user = ref<UserData | null>(null); // Use UserData type for more fields
const loading = ref<boolean>(true);
const errorMessage = ref<string>('');
const userProjects = ref<UserProjectDisplay[]>([]); // Use UserProjectDisplay type
// FIX: Use aliased AppEvent type
const participatedEvents = ref<AppEvent[]>([]);
const loadingEventsOrProjects = ref<boolean>(true);
const stats = ref<Stats>({ participatedCount: 0, organizedCount: 0, wonCount: 0 });
const participatedEventIds = ref<string[]>([]);
const organizedEventIds = ref<string[]>([]);
const defaultAvatarUrl: string = new URL('../assets/default-avatar.png', import.meta.url).href;
const initialDataLoaded = ref<boolean>(false); // New ref to track initial load completion


// --- Computed Properties ---
const totalXp = computed((): number => {
  if (!user.value?.xpByRole) return 0;
  return Object.values(user.value.xpByRole).reduce((sum: number, val: unknown) => sum + (Number(val) || 0), 0);
});

const hasXpData = computed((): boolean => {
    const xp = totalXp.value;
    return !!(xp > 0 && user.value?.xpByRole && Object.values(user.value.xpByRole).some((xpVal: unknown) => Number(xpVal) > 0));
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

const socialLinkDetails = computed(() => {
  if (!user.value?.socialLink) {
    return { name: 'Social Profile', icon: 'fa-link', isFontAwesomeBrand: false };
  }
  const link = user.value.socialLink.toLowerCase();
  if (link.includes('github.com')) {
    return { name: 'GitHub Profile', icon: 'fa-github', isFontAwesomeBrand: true };
  } else if (link.includes('linkedin.com')) {
    return { name: 'LinkedIn Profile', icon: 'fa-linkedin', isFontAwesomeBrand: true };
  } else if (link.includes('twitter.com') || link.includes('x.com')) {
    return { name: 'Twitter Profile', icon: 'fa-twitter', isFontAwesomeBrand: true };
  } else if (link.includes('facebook.com')) {
    return { name: 'Facebook Profile', icon: 'fa-facebook', isFontAwesomeBrand: true };
  } else if (link.includes('instagram.com')) {
    return { name: 'Instagram Profile', icon: 'fa-instagram', isFontAwesomeBrand: true };
  } else if (link.includes('behance.net')) {
    return { name: 'Behance Profile', icon: 'fa-behance', isFontAwesomeBrand: true };
  } else if (link.includes('dribbble.com')) {
    return { name: 'Dribbble Profile', icon: 'fa-dribbble', isFontAwesomeBrand: true };
  }
  // Default for other links
  return { name: 'Website', icon: 'fa-link', isFontAwesomeBrand: false };
});

// FIX: Use aliased AppEvent type
const sortedEventsHistory = computed(() => {
  return [...participatedEvents.value].sort((a: AppEvent, b: AppEvent) => {
    const timeA = a.details?.date?.start?.toMillis() ?? 0; // Use Optional Chaining and Nullish Coalescing
    const timeB = b.details?.date?.start?.toMillis() ?? 0;
    return timeB - timeA; // Sort descending
  });
});

// --- Methods ---
// FIX: Change parameter type from imported Event to global Event or any
const handleImageError = (e: Event) => { // Use standard DOM Event type
  // FIX: Check if target exists before accessing src
  const target = e.target as HTMLImageElement | null;
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

// FIX: Use aliased AppEvent type
const isOrganizer = (eventItem: AppEvent): boolean => {
    if (!props.userId || !Array.isArray(eventItem.details?.organizers)) { // Use props.userId
        return false;
    }
    return eventItem.details.organizers.includes(props.userId);
};

const formatEventFormat = (format: string | undefined): string => {
  if (!format) return '';
  if (format === 'Team') return 'Team Event';
  if (format === 'Individual') return 'Individual Event';
  return format;
};

// --- Data Fetching ---
const fetchProfileData = async () => {
    loading.value = true;
    loadingEventsOrProjects.value = true;
    errorMessage.value = '';
    user.value = null;
    userProjects.value = [];
    participatedEvents.value = [];
    stats.value = { participatedCount: 0, organizedCount: 0, wonCount: 0 };
    initialDataLoaded.value = false; // Reset on new fetch

    try {
        // Ensure userId is a string
        const userIdToFetch = props.userId;
        if (typeof userIdToFetch !== 'string' || !userIdToFetch) {
             throw new Error('Invalid User ID provided.');
        }

        // 1. Fetch User Profile from Store (or directly if store logic is complex)
        const userDocRef = doc(db, 'users', userIdToFetch); // Use string userId
        const userDocSnap = await getDoc(userDocRef);

        if (!userDocSnap.exists()) {
            throw new Error('User data not found.');
        }
        const data = userDocSnap.data();
        // Map to UserData type
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
            role: data.role, // Ensure role is mapped if needed by formatRoleName
            hasLaptop: data.hasLaptop === undefined ? false : data.hasLaptop,
        } as UserData;

        participatedEventIds.value = user.value.participatedEvent || [];
        organizedEventIds.value = user.value.organizedEvent || [];

        // 2. Fetch Events and Projects (consider using store getters if possible)
        await fetchUserEventsFromStore(); // This now uses the IDs from the fetched user data
        await fetchUserProjects(userIdToFetch); // Use string userId

    } catch (error: any) {
        console.error('Error fetching profile data:', error);
        errorMessage.value = error?.message || 'Failed to load profile.';
    } finally {
        loading.value = false;
        loadingEventsOrProjects.value = false;
        initialDataLoaded.value = true; // Mark initial load complete
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
    userProjects.value = snapshot.docs.map(docSnap => {
      const data = docSnap.data();
      const eventId = data.eventId;
      let eventName;
      if (eventId) {
        const eventDetails = eventStore.getEventById(eventId);
        eventName = eventDetails?.details?.eventName;
      }
      return {
        id: docSnap.id,
        projectName: data.projectName,
        link: data.link,
        description: data.description,
        eventId: eventId,
        eventName: eventName,
        submittedAt: data.submittedAt,
      } as UserProjectDisplay;
    });
  } catch (error) {
    console.error("Error fetching user projects:", error);
    userProjects.value = [];
  } finally {
    loadingEventsOrProjects.value = false;
  }
};

const fetchUserEventsFromStore = async () => {
  const allIds = Array.from(new Set([
    ...participatedEventIds.value,
    ...organizedEventIds.value
  ]));

  if (allIds.length === 0) {
      participatedEvents.value = [];
      stats.value = { participatedCount: 0, organizedCount: 0, wonCount: 0 };
      return;
  }

  // Fetch events using store getter
  const getEventsByIds = eventStore.getEventsByIds;
  // FIX: Use aliased AppEvent type
  let allUserEvents: AppEvent[] = getEventsByIds(allIds);

  // Filter based on profile view context
  allUserEvents = allUserEvents.filter((eventItem: AppEvent) => {
    const excludedStatuses: EventStatus[] = [EventStatus.Pending, EventStatus.Cancelled, EventStatus.Rejected];
    // FIX: Use local isCurrentUser ref
    if (isCurrentUser.value) {
      // Show most statuses for own profile
      return !excludedStatuses.includes(eventItem.status as EventStatus);
    } else {
      // Show only completed/relevant statuses for public view
      return [EventStatus.Completed, EventStatus.Closed, EventStatus.InProgress, EventStatus.Approved].includes(eventItem.status as EventStatus);
    }
  });

  participatedEvents.value = allUserEvents; // Store filtered events

  // Calculate stats based on filtered events
  let participated = 0, organized = 0, won = 0;
  allUserEvents.forEach((eventItem: AppEvent) => {
      // FIX: Use props.userId for comparison
      const isOrg = Array.isArray(eventItem.details?.organizers) && eventItem.details.organizers.includes(props.userId);
      const isPart = Array.isArray(eventItem.participants) && eventItem.participants.includes(props.userId);
      let isTeamMember = false;
      if (eventItem.details?.format === EventFormat.Team && Array.isArray(eventItem.teams)) {
          isTeamMember = eventItem.teams.some(team => Array.isArray(team.members) && team.members.includes(props.userId));
      }

      let isWinnerFlag = false;
       // Check if user ID is directly listed as a winner
       if (eventItem.winners && Object.values(eventItem.winners).some(winnerList => winnerList.includes(props.userId))) {
           isWinnerFlag = true;
       }
       // If it's a team event and the user is a member of a winning team
       else if (eventItem.details?.format === EventFormat.Team && isTeamMember && eventItem.winners) {
           const userTeam = eventItem.teams?.find(team => team.members?.includes(props.userId));
           if (userTeam && Object.values(eventItem.winners).some(winnerList => winnerList.includes(userTeam.teamName))) {
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
watch(() => props.userId, (newUserId) => {
  if (newUserId && typeof newUserId === 'string') { // Ensure it's a string
    fetchProfileData();
    // FIX: Update local isCurrentUser ref when userId prop changes
    isCurrentUser.value = newUserId === userStore.uid;
  } else {
      loading.value = false;
      errorMessage.value = "Invalid User ID.";
      user.value = null;
  }
}, { immediate: true });

// Watch the prop and update the local ref
watch(() => props.isCurrentUserProp, (newVal) => {
    isCurrentUser.value = newVal;
});

// Define openEditProfile function (to be called by parent)
const openEditProfile = () => {
  if (props.userId) {
    router.push({ name: 'EditProfile', params: { id: props.userId } });
  } else {
    console.error("Cannot open edit profile: User ID is missing.");
    // Optionally show a notification
  }
};

// Expose openEditProfile
defineExpose({ openEditProfile });

</script>

<style scoped>
/* Style adjustments can go here */
.badge.bg-light {
  border: 1px solid var(--bs-border-color-translucent);
}
</style>