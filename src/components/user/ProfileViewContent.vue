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
                ref="profileImageRef"
              />
            </div>
            <h1 class="h4 mb-2">{{ user.name || 'User Profile' }}</h1>

            <button
              v-if="isCurrentUserProp"
              @click="openEditProfile"
              class="btn btn-sm btn-outline-primary mb-3"
            >
              <i class="fas fa-edit me-1"></i> Edit Profile
            </button>

            <div v-if="user.socialLink" class="mb-3">
              <a :href="user.socialLink" target="_blank" rel="noopener noreferrer" class="btn btn-sm btn-outline-info d-inline-flex align-items-center">
                <i :class="['fab', socialLinkDetails.icon, 'me-2']" v-if="socialLinkDetails.isFontAwesomeBrand"></i>
                <i :class="['fas', socialLinkDetails.icon, 'me-2']" v-else></i>
                {{ socialLinkDetails.name }}
              </a>
            </div>

            <p v-if="user.bio" class="text-muted small mb-3">{{ user.bio }}</p>
            <p v-else class="text-muted small fst-italic mb-3">No bio provided.</p>

            <div v-if="user.skills && user.skills.length > 0" class="mb-3">
              <h6 class="text-secondary small fw-semibold mb-2"><i class="fas fa-code me-1"></i> Skills</h6>
              <div>
                <span v-for="skill in user.skills" :key="skill" class="badge bg-light text-dark border me-1 mb-1">{{ skill }}</span>
              </div>
            </div>

            <div v-if="user.preferredRoles && user.preferredRoles.length > 0" class="mb-3">
              <h6 class="text-secondary small fw-semibold mb-2"><i class="fas fa-user-tag me-1"></i> Preferred Roles</h6>
              <div>
                <span v-for="role in user.preferredRoles" :key="role" class="badge bg-light text-dark border me-1 mb-1">{{ formatRoleNameForDisplay(role) }}</span>
              </div>
            </div>

            <div class="mb-3">
              <h6 class="text-secondary small fw-semibold mb-2"><i class="fas fa-laptop me-1"></i> Equipment</h6>
              <div>
                <span class="badge border me-1 mb-1" :class="user.hasLaptop ? 'bg-success-subtle text-success-emphasis' : 'bg-danger-subtle text-danger-emphasis'">
                  <i :class="['fas', user.hasLaptop ? 'fa-check-circle' : 'fa-times-circle', 'me-1']"></i>
                  {{ user.hasLaptop ? 'Has Laptop' : 'No Laptop' }}
                </span>
              </div>
            </div>

            <div class="d-flex justify-content-around mb-4">
              <div class="text-center">
                <div class="bg-primary-subtle text-primary-emphasis p-2 rounded mb-1">
                  <h5 class="h5 mb-0">{{ stats.participatedCount }}</h5>
                </div>
                <small class="text-muted text-uppercase">Participated</small>
              </div>
              <div class="text-center">
                 <div class="bg-primary-subtle text-primary-emphasis p-2 rounded mb-1">
                  <h5 class="h5 mb-0">{{ stats.organizedCount }}</h5>
                 </div>
                <small class="text-muted text-uppercase">Organized</small>
              </div>
              <div class="text-center">
                 <div class="bg-warning-subtle text-warning-emphasis p-2 rounded mb-1">
                  <h5 class="h5 mb-0">{{ user.xpData?.count_wins ?? stats.wonCount }}</h5>
                 </div>
                <small class="text-muted text-uppercase">Won</small>
              </div>
            </div>
            <div class="mb-3">
              <p class="small fw-semibold text-secondary mb-1">
                <i class="fas fa-star text-warning me-1"></i> Total XP Earned
              </p>
              <p class="fs-2 text-primary fw-bold">{{ user.xpData?.totalCalculatedXp ?? 0 }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Right Column -->
      <div class="col-lg-8">
        <div class="d-flex flex-column gap-3">
           <div v-if="hasXpData" class="card shadow-sm">
             <div class="card-header">
               <h5 class="card-title mb-0 d-flex align-items-center">
                 <i class="fas fa-medal text-primary me-2"></i>XP Breakdown by Role
               </h5>
             </div>
             <div class="card-body">
               <div class="row g-4">
                  <div v-for="(xp, roleKey) in filteredXpByRole" :key="roleKey" class="col-md-6">
                    <div class="d-flex justify-content-between align-items-center mb-2">
                      <span class="small fw-medium">{{ formatRoleNameForDisplay(roleKey) }}</span>
                      <span class="badge bg-primary-subtle text-primary-emphasis rounded-pill">{{ xp }} XP</span>
                    </div>
                    <div class="progress" role="progressbar" :aria-valuenow="xpPercentage(xp)" aria-valuemin="0" aria-valuemax="100" style="height: 8px;">
                      <div class="progress-bar bg-primary" :style="{ width: xpPercentage(xp) + '%' }"></div>
                    </div>
                  </div>
                </div>
             </div>
           </div>

           <div v-if="sortedEventsHistory.length > 0" class="card shadow-sm">
             <div class="card-header">
               <h5 class="card-title mb-0 d-flex align-items-center">
                 <i class="fas fa-history text-primary me-2"></i>Event History
               </h5>
             </div>
             <ul class="list-group list-group-flush event-history-section">
               <li
                 v-for="eventItem in sortedEventsHistory"
                 :key="eventItem.id"
                 class="list-group-item px-3 py-3"
               >
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
                   <div class="d-flex align-items-center gap-2">
                     <span
                       class="badge rounded-pill"
                       :class="getEventStatusBadgeClass(eventItem.status)"
                     >
                       {{ eventItem.status }}
                     </span>
                     <span
                       v-if="isOrganizer(eventItem)"
                       class="badge bg-success-subtle text-success-emphasis rounded-pill"
                     >
                       <i class="fas fa-crown me-1"></i> Organizer
                     </span>
                   </div>
                 </div>
                 <div class="d-flex justify-content-between align-items-center">
                   <span v-if="eventItem.details?.type" class="badge bg-info-subtle text-info-emphasis small">
                     <i class="fas fa-tag me-1"></i>{{ eventItem.details.type }}
                   </span>
                   <div class="d-flex align-items-center gap-2">
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
            <div v-else-if="!loadingEventsOrProjects && initialDataLoaded" class="card shadow-sm mt-4">
              <div class="card-body text-center text-muted">
                No projects submitted yet.
              </div>
            </div>
           <slot name="additional-content"></slot>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useUserStore } from '@/store/studentProfileStore';
// EventStore not directly used here for fetching, userStore handles enriched data
import { formatISTDate } from '@/utils/dateTime';
// Use the formatRoleName from user types as it handles 'xp_' prefix now
import { formatRoleName as formatRoleNameForDisplay, EnrichedUserData } from '@/types/student';
import { Event as AppEvent, EventStatus, EventFormat } from '@/types/event';
import { getEventStatusBadgeClass } from '@/utils/eventUtils';
import { useRouter } from 'vue-router';
import { isEventOrganizer } from '@/utils/permissionHelpers';

interface Props {
    userId: string;
    isCurrentUserProp: boolean;
}

interface Stats {
    participatedCount: number;
    organizedCount: number;
    wonCount: number; // This might now come directly from user.xpData.count_wins
}

interface UserProjectDisplay {
  id: string;
  projectName: string;
  link: string;
  description?: string;
  eventId?: string;
  eventName?: string;
  submittedAt?: any;
}

const props = defineProps<Props>();
const isCurrentUser = ref<boolean>(props.isCurrentUserProp);

const userStore = useUserStore();
const router = useRouter();

const user = ref<EnrichedUserData | null>(null); // Now uses EnrichedUserData
const loading = ref<boolean>(true);
const errorMessage = ref<string>('');
const userProjects = ref<UserProjectDisplay[]>([]);
const participatedEvents = ref<AppEvent[]>([]);
const loadingEventsOrProjects = ref<boolean>(true);
const stats = ref<Stats>({ participatedCount: 0, organizedCount: 0, wonCount: 0 });
const defaultAvatarUrl: string = '/default-avatar.png';
const initialDataLoaded = ref<boolean>(false);
const profileImageRef = ref<HTMLImageElement | null>(null);

const totalXpFromStore = computed((): number => {
  // Access totalCalculatedXp from the nested xpData object
  return user.value?.xpData?.totalCalculatedXp ?? 0;
});

const hasXpData = computed((): boolean => {
    return !!(user.value?.xpData && totalXpFromStore.value > 0 &&
              Object.values(user.value.xpData).some(val => typeof val === 'number' && val > 0));
});

const filteredXpByRole = computed(() => {
    if (!user.value?.xpData) return {};
    const xpData = user.value.xpData;
    const relevantXp: Record<string, number> = {};
    // Iterate over keys of xpData that represent XP roles (e.g., start with 'xp_')
    for (const key in xpData) {
        if (key.startsWith('xp_') && (xpData as any)[key] > 0) {
            relevantXp[key] = (xpData as any)[key];
        }
    }
    return relevantXp;
});


const socialLinkDetails = computed(() => {
  if (!user.value?.socialLink) {
    return { name: 'Social Profile', icon: 'fa-link', isFontAwesomeBrand: false };
  }
  const link = user.value.socialLink.toLowerCase();
  if (link.includes('github.com')) return { name: 'GitHub', icon: 'fa-github', isFontAwesomeBrand: true };
  if (link.includes('linkedin.com')) return { name: 'LinkedIn', icon: 'fa-linkedin', isFontAwesomeBrand: true };
  if (link.includes('twitter.com') || link.includes('x.com')) return { name: 'Twitter/X', icon: 'fa-twitter', isFontAwesomeBrand: true };
  // Add more social links as needed
  return { name: 'Website', icon: 'fa-link', isFontAwesomeBrand: false };
});

const sortedEventsHistory = computed(() => {
  return [...participatedEvents.value].sort((a: AppEvent, b: AppEvent) => {
    const timeA = a.details?.date?.start?.toMillis() ?? 0;
    const timeB = b.details?.date?.start?.toMillis() ?? 0;
    return timeB - timeA;
  });
});

const handleImageError = (e: Event) => {
  const target = e.target as HTMLImageElement | null;
  if (target) {
    target.src = defaultAvatarUrl;
    target.onerror = null; // Prevent infinite loop
  }
};

const xpPercentage = (xp: number): number => {
  const total = totalXpFromStore.value; // Use the new computed total
  return total > 0 ? Math.min(100, Math.round((xp / total) * 100)) : 0;
};

const isOrganizer = (eventItem: AppEvent): boolean => {
    if (!props.userId || !Array.isArray(eventItem.details?.organizers)) {
        return false;
    }
    return isEventOrganizer(eventItem, props.userId);
};

const formatEventFormat = (format: string | undefined): string => {
  if (!format) return '';
  if (format === EventFormat.Team) return 'Team Event';
  if (format === EventFormat.Individual) return 'Individual Event';
  if (format === EventFormat.Competition) return 'Competition';
  return format;
};

const fetchProfileData = async () => {
    loading.value = true;
    loadingEventsOrProjects.value = true;
    errorMessage.value = '';
    user.value = null; // Reset user
    userProjects.value = [];
    participatedEvents.value = [];
    stats.value = { participatedCount: 0, organizedCount: 0, wonCount: 0 };
    initialDataLoaded.value = false;

    try {
        const userIdToFetch = props.userId;
        if (!userIdToFetch) throw new Error('Invalid User ID provided.');

        // fetchFullUserProfileForView in userStore now fetches both user and XP data
        // and stores it in `viewedUserProfile` (which is EnrichedUserData)
        await userStore.fetchFullUserProfileForView(userIdToFetch);
        const profileData = userStore.getViewedUserProfile; // This is EnrichedUserData

        if (!profileData) throw new Error('User data not found.');

        user.value = profileData; // Assign EnrichedUserData to local user ref
        // User events and projects are also fetched by fetchFullUserProfileForView
        participatedEvents.value = userStore.getViewedUserEvents;
        userProjects.value = userStore.getViewedUserProjects;

        // Calculate stats from events (participated/organized)
        // Win count will come from user.xpData.count_wins
        calculateStatsFromEvents(participatedEvents.value);
        // Ensure wonCount in stats also reflects xpData if available
        if (user.value?.xpData) {
            stats.value.wonCount = user.value.xpData.count_wins ?? 0;
        }


    } catch (error: any) {
        errorMessage.value = error?.message || 'Failed to load profile.';
    } finally {
        loading.value = false;
        loadingEventsOrProjects.value = false;
        initialDataLoaded.value = true;
    }
};

const calculateStatsFromEvents = (events: AppEvent[]) => {
    let participated = 0, organized = 0; // won is handled by xpData
    const userId = props.userId;

    events.forEach((eventItem: AppEvent) => {
        const isOrg = Array.isArray(eventItem.details?.organizers) && eventItem.details.organizers.includes(userId);
        const isPart = Array.isArray(eventItem.participants) && eventItem.participants.includes(userId);
        let isTeamMember = false;
        if (eventItem.details?.format === EventFormat.Team && Array.isArray(eventItem.teams)) {
            isTeamMember = eventItem.teams.some(team => Array.isArray(team.members) && team.members.includes(userId));
        }

        if (isPart || isTeamMember) participated++;
        if (isOrg) organized++;
    });
    // Only update participated and organized here. Won count comes from xpData.
    stats.value = { ...stats.value, participatedCount: participated, organizedCount: organized };
};


watch(() => props.userId, (newUserId) => {
  if (newUserId && typeof newUserId === 'string') {
    fetchProfileData();
    isCurrentUser.value = newUserId === userStore.uid;
  } else {
      loading.value = false;
      errorMessage.value = "Invalid User ID.";
      user.value = null;
  }
}, { immediate: true });

watch(() => props.isCurrentUserProp, (newVal) => {
    isCurrentUser.value = newVal;
});

const openEditProfile = () => {
  if (props.userId) {
    router.push({ name: 'EditProfile', params: { id: props.userId } });
  }
};
defineExpose({ openEditProfile });

onMounted(() => {
  if (user.value && !user.value.photoURL && profileImageRef.value) {
    profileImageRef.value.src = defaultAvatarUrl;
  }
});

</script>

<style scoped>
.badge.bg-light {
  border: 1px solid var(--bs-border-color-translucent);
}
.event-history-section { font-size: 0.875rem; }
.event-history-section .router-link-active,
.event-history-section .router-link { font-size: 0.9rem; }
.event-history-section .badge { font-size: 0.75rem; }
.event-history-section i { font-size: 0.825rem; }
</style>