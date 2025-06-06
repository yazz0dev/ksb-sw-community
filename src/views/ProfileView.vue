<template>
  <div class="py-3 py-md-5 profile-section bg-body min-vh-100-subtract-nav">
    <div class="container-lg">
      <!-- Back Button -->
      <div v-if="!isCurrentUser" class="mb-5">
        <button
          class="btn btn-sm btn-outline-secondary d-inline-flex align-items-center"
          @click="$router.back()"
        >
          <i class="fas fa-arrow-left me-1"></i>
          <span>Back</span>
        </button>
      </div>

      <!-- Header for Current User -->
      <div v-if="isCurrentUser && currentUserData" class="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-5 pb-4 border-bottom">
        <div>
          <h2 class="h2 text-primary mb-2 d-inline-flex align-items-center">
            <i class="fas fa-user-circle me-2"></i>My Profile
          </h2>
        </div>
        <div class="d-flex align-items-center">
          <PortfolioGeneratorButton
            v-if="!loadingPortfolioData && currentUserPortfolioData.projects.length > 0 && currentUserPortfolioData.eventParticipationCount >= 5"
            :user="userForPortfolioGeneration"
            :projects="projectsForPortfolio"
            :event-participation-count="currentUserPortfolioData.eventParticipationCount"
          />
          <div v-else-if="loadingPortfolioData" class="d-flex align-items-center text-secondary">
            <div class="spinner-border spinner-border-sm me-2"></div>
            <span class="small">Loading portfolio data...</span>
          </div>
           <div v-else-if="currentUserPortfolioData.eventParticipationCount < 5 && currentUserPortfolioData.projects.length > 0" class="text-secondary small">
            <i class="fas fa-info-circle me-1"></i> Generate portfolio after 5 event participations.
          </div>
          <div v-else class="text-secondary small">
            <i class="fas fa-info-circle me-1"></i> No project data for portfolio generation.
          </div>
        </div>
      </div>

      <!-- User Profile Content -->
      <UserProfile
        v-if="targetUserId"
        :user-id="targetUserId"
        :is-current-user-prop="isCurrentUser"
        @edit-profile="handleEditProfile"
      >
        <template #additional-content v-if="isCurrentUser">
          <AuthGuard>
            <div class="card mt-5">
              <div class="card-header requests-card-header">
                <h6 class="mb-0 d-flex align-items-center">
                  <i class="fas fa-bell text-primary me-2"></i>Notifications & Requests
                </h6>
              </div>
              <div class="card-body p-0">
                <UserRequests />
              </div>
            </div>
          </AuthGuard>
        </template>
      </UserProfile>

      <p v-else-if="!loading" class="text-center text-secondary py-5">
        Could not determine user profile to display.
      </p>
       <div v-else class="text-center py-5"> <!-- Fallback loading indicator -->
         <div class="spinner-border text-primary"></div>
         <p class="mt-2 text-muted">Loading profile...</p>
       </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useProfileStore } from '@/stores/profileStore';
import type { EnrichedStudentData } from '@/types/student';
import type { XPData } from '@/types/xp';

import UserProfile from '@/components/user/UserProfile.vue';
import PortfolioGeneratorButton from '@/components/user/PortfolioGeneratorButton.vue';
import UserRequests from '@/components/user/UserRequests.vue';
import AuthGuard from '@/components/AuthGuard.vue';

// Define a type for the portfolio component projects
interface PortfolioProject {
  id: string;
  projectName: string;
  description?: string;
  eventId?: string;
  eventName?: string;
  eventFormat?: any;
  role?: string;
  roleDescription?: string;
  startDate?: any;
  endDate?: any;
  tags?: string[];
  link: string;
  submittedBy?: string;
  submittedAt?: any;
}

// Define a more specific type for the portfolio button's user prop
interface UserForPortfolio {
  name: string;
  uid: string;
  xpData?: Partial<XPData>;
  skills?: string[];
  bio?: string;
}

const route = useRoute();
const router = useRouter();
const studentStore = useProfileStore();
const targetUserId = ref<string | null>(null);
const isCurrentUser = ref<boolean>(false);
const loadingPortfolioData = ref<boolean>(false);
const loading = ref(true);

const currentUserData = computed<EnrichedStudentData | null>(() => studentStore.currentStudent);
const currentUserPortfolioData = computed(() => studentStore.currentUserPortfolioData);

const userForPortfolioGeneration = computed<UserForPortfolio>(() => {
    if (!isCurrentUser.value || !currentUserData.value) {
        return { name: 'User', uid: '' };
    }
    const user = currentUserData.value;
    return {
        name: user.name || 'User',
        uid: user.uid,
        xpData: user.xpData ? { 
            totalCalculatedXp: user.xpData.totalCalculatedXp,
            xp_developer: user.xpData.xp_developer,
            xp_presenter: user.xpData.xp_presenter,
            xp_designer: user.xpData.xp_designer,
            xp_problemSolver: user.xpData.xp_problemSolver,
            xp_organizer: user.xpData.xp_organizer,
            xp_participation: user.xpData.xp_participation,
            xp_bestPerformer: user.xpData.xp_bestPerformer,
            count_wins: user.xpData.count_wins,
            uid: user.xpData.uid, 
            lastUpdatedAt: user.xpData.lastUpdatedAt, 
        } : undefined,
        skills: user.skills || [],
        bio: user.bio || '',
    };
});

const projectsForPortfolio = computed<PortfolioProject[]>(() => {
  return (currentUserPortfolioData.value.projects || []).map(project => ({
    ...project,
    description: project.description === null ? undefined : project.description
  }));
});

const fetchPortfolioRelatedDataForCurrentUser = async () => {
    if (!studentStore.currentStudent?.uid || !isCurrentUser.value) {
        studentStore.$patch(state => {
            state.currentUserPortfolioData = { projects: [], eventParticipationCount: 0 };
        });
        return;
    }
    loadingPortfolioData.value = true;
    try {
        await studentStore.fetchCurrentUserPortfolioData();
    } catch (err) {
        console.error("Error fetching portfolio data for ProfileView:", err);
    } finally {
        loadingPortfolioData.value = false;
    }
};

const determineProfileContextAndLoad = async () => {
    loading.value = true;
    const routeUserIdParam = route.params.userId;
    const loggedInUid = studentStore.currentStudent?.uid; 

    const targetUidFromRoute = Array.isArray(routeUserIdParam) ? routeUserIdParam[0] : routeUserIdParam;

    if (targetUidFromRoute) {
        targetUserId.value = targetUidFromRoute;
        isCurrentUser.value = targetUidFromRoute === loggedInUid;
    } else if (loggedInUid && route.name === 'Profile') {
        targetUserId.value = loggedInUid;
        isCurrentUser.value = true;
    } else { 
        targetUserId.value = null;
        isCurrentUser.value = false;
        if (!loggedInUid && route.name === 'Profile') {
            router.replace({ name: 'Login', query: { redirect: route.fullPath }});
            loading.value = false;
            return;
        }
    }

    if (isCurrentUser.value && targetUserId.value) {
        if (studentStore.fetchProfileForView && loggedInUid) {
            await studentStore.fetchProfileForView(loggedInUid);
        }
        await fetchPortfolioRelatedDataForCurrentUser();
    }
    loading.value = false;
};

const handleEditProfile = () => {
  router.push({ name: 'EditProfile' });
};

// Watch for route changes
watch(() => route.params.userId, 
    (newRouteUserId, oldRouteUserId) => {
        if (newRouteUserId !== oldRouteUserId) {
            determineProfileContextAndLoad();
        }
    }
);

// Watch for changes in the logged-in user's state
watch(() => studentStore.currentStudent,
    (newStudent, oldStudent) => {
        if (newStudent?.uid !== oldStudent?.uid) {
            determineProfileContextAndLoad();
        }
    },
    { deep: true, immediate: true }
);

onMounted(async () => {
  if (isCurrentUser.value && studentStore.currentStudent?.uid) {
     await fetchPortfolioRelatedDataForCurrentUser();
  }
});
</script>

<style scoped>
.profile-section {
  background-color: var(--bs-body-bg);
}
.requests-card-header {
  background-color: var(--bs-tertiary-bg);
  border-bottom: 1px solid var(--bs-border-color);
}

/* The .min-vh-100-subtract-nav class is now defined globally in main.scss */
/* This ensures consistency and uses the correct CSS variables for navbar heights. */

</style>