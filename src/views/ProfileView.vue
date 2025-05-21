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
            :projects="currentUserPortfolioData.projects"
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

      <ProfileViewContent
        ref="profileContentRef"
        v-if="targetUserId"
        :user-id="targetUserId"
        :is-current-user-prop="isCurrentUser"
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
      </ProfileViewContent>

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
import { useUserStore } from '@/store/studentProfileStore';
import { EnrichedUserData, UserProject as PortfolioUserProject } from '@/types/student'; // Project type for portfolio is different

import ProfileViewContent from '@/components/user/ProfileViewContent.vue';
import PortfolioGeneratorButton from '@/components/user/PortfolioGeneratorButton.vue';
import UserRequests from '@/components/user/UserRequests.vue';
import AuthGuard from '@/components/AuthGuard.vue';

// Define a more specific type for the portfolio button's user prop
interface UserForPortfolio {
  name: string;
  uid: string;
  xpData?: Partial<import('@/types/xp').XPData>; // Using Partial as not all XP fields might be needed
  skills?: string[];
  bio?: string;
}

const route = useRoute();
const router = useRouter(); // Added to satisfy template if $router is used, though not directly in script
const userStore = useUserStore();

const targetUserId = ref<string | null>(null);
const isCurrentUser = ref<boolean>(false);
const loadingPortfolioData = ref<boolean>(false); // Renamed from loadingProjectsForPortfolio
const loading = ref(true); // General loading for the view

// This ref will hold the EnrichedUserData for the current user when isCurrentUser is true
const currentUserData = computed<EnrichedUserData | null>(() => userStore.currentUser);
// This ref will hold the portfolio-specific data
const currentUserPortfolioData = computed(() => userStore.currentUserPortfolioData);


const userForPortfolioGeneration = computed<UserForPortfolio>(() => {
    if (!isCurrentUser.value || !currentUserData.value) {
        return { name: 'User', uid: '' }; // Fallback
    }
    const user = currentUserData.value;
    return {
        name: user.name || 'User',
        uid: user.uid,
        xpData: user.xpData ? { // Pass only necessary parts of xpData
            totalCalculatedXp: user.xpData.totalCalculatedXp,
            xp_developer: user.xpData.xp_developer,
            xp_presenter: user.xpData.xp_presenter,
            xp_designer: user.xpData.xp_designer,
            xp_problemSolver: user.xpData.xp_problemSolver,
            xp_organizer: user.xpData.xp_organizer,
            xp_participation: user.xpData.xp_participation,
            xp_bestPerformer: user.xpData.xp_bestPerformer,
            count_wins: user.xpData.count_wins,
        } : undefined,
        skills: user.skills || [],
        bio: user.bio || '',
    };
});


const fetchPortfolioRelatedDataForCurrentUser = async () => {
    if (!userStore.uid || !isCurrentUser.value) {
        // Reset portfolio data if not current user or not logged in
        userStore.$patch(state => {
            state.currentUserPortfolioData = { projects: [], eventParticipationCount: 0 };
        });
        return;
    }
    loadingPortfolioData.value = true;
    try {
        await userStore.fetchCurrentUserPortfolioData();
        // Data is now in userStore.currentUserPortfolioData, accessed by computed prop
    } catch (err) {
        console.error("Error fetching portfolio data for ProfileView:", err);
    } finally {
        loadingPortfolioData.value = false;
    }
};

const determineProfileContextAndLoad = async () => {
    loading.value = true;
    const routeUserIdParam = route.params.userId;
    const loggedInUid = userStore.uid; // Access uid getter

    const targetUidFromRoute = Array.isArray(routeUserIdParam) ? routeUserIdParam[0] : routeUserIdParam;

    if (targetUidFromRoute) {
        targetUserId.value = targetUidFromRoute;
        isCurrentUser.value = targetUidFromRoute === loggedInUid;
    } else if (loggedInUid && route.name === 'Profile') { // Viewing own profile via /profile
        targetUserId.value = loggedInUid;
        isCurrentUser.value = true;
    } else { // No specific user ID in route and not /profile, or not logged in
        targetUserId.value = null;
        isCurrentUser.value = false;
        // Potentially redirect or show an error if no profile can be determined
        if (!loggedInUid && route.name === 'Profile') {
            router.replace({ name: 'Login', query: { redirect: route.fullPath }});
            loading.value = false;
            return;
        }
    }

    if (isCurrentUser.value && targetUserId.value) {
        // Ensure current user data (including XP) is fresh if viewing own profile
        // fetchUserData in userStore now fetches both profile and XP
        await userStore.fetchUserData(targetUserId.value);
        await fetchPortfolioRelatedDataForCurrentUser();
    } else if (targetUserId.value) {
        // For viewing others, ProfileViewContent will trigger fetchFullUserProfileForView
        // which also fetches both profile and XP via userStore.
    }
    loading.value = false;
};

watch(() => route.params.userId, determineProfileContextAndLoad, { immediate: true });
// Watch for login/logout to re-determine context
watch(() => userStore.uid, (newUid, oldUid) => {
    if (newUid !== oldUid) {
        determineProfileContextAndLoad();
    }
});

onMounted(() => {
    // Initial determination is handled by the immediate watcher
    // If it's the current user, fetch portfolio data
    if (isCurrentUser.value) {
        fetchPortfolioRelatedDataForCurrentUser();
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
/* Ensure min-height is applied as intended */
.min-vh-100-subtract-nav {
  min-height: calc(100vh - var(--navbar-height-desktop, 4.5rem) - var(--bottom-nav-height-mobile, 0rem)); /* Adjust vars as needed */
}
@media (max-width: 991.98px) {
  .min-vh-100-subtract-nav {
    min-height: calc(100vh - var(--navbar-height-mobile, 4rem) - var(--bottom-nav-height-mobile, 4rem));
  }
}

</style>