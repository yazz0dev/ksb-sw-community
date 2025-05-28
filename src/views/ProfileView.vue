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
import { useProfileStore } from '@/stores/profileStore';
// Import Project type but use it only for type annotations, not directly
import type { Project } from '@/types/project';
import type { EnrichedStudentData } from '@/types/student'; // Import EnrichedStudentData
import type { XPData } from '@/types/xp'; // Import XPData

import ProfileViewContent from '@/components/user/ProfileViewContent.vue';
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
  eventFormat?: any; // Consider using a more specific type if available (e.g., EventFormat from '@/types/event')
  role?: string;
  roleDescription?: string;
  startDate?: any; // Consider using Timestamp or Date
  endDate?: any;   // Consider using Timestamp or Date
  tags?: string[];
  link: string;
  // Add any other fields that StudentPortfolioProject might have and are needed by PortfolioGeneratorButton
  submittedBy?: string; // Example, if needed
  submittedAt?: any; // Example, if needed
}

// Define a more specific type for the portfolio button's user prop
interface UserForPortfolio {
  name: string;
  uid: string;
  xpData?: Partial<XPData>; // Changed from `| null` to match button's expectation (undefined if not present)
  skills?: string[];
  bio?: string;
}

const route = useRoute();
const router = useRouter(); // Added to satisfy template if $router is used, though not directly in script
const studentStore = useProfileStore();
const targetUserId = ref<string | null>(null);
const isCurrentUser = ref<boolean>(false);
const loadingPortfolioData = ref<boolean>(false); // Renamed from loadingProjectsForPortfolio
const loading = ref(true); // General loading for the view

// This ref will hold the user data for the current user when isCurrentUser is true
// Use EnrichedStudentData directly from the store
const currentUserData = computed<EnrichedStudentData | null>(() => studentStore.currentStudent);
// This ref will hold the portfolio-specific data
const currentUserPortfolioData = computed(() => studentStore.currentUserPortfolioData);

const userForPortfolioGeneration = computed<UserForPortfolio>(() => {
    if (!isCurrentUser.value || !currentUserData.value) {
        return { name: 'User', uid: '' }; // Fallback
    }
    const user = currentUserData.value; // user is now EnrichedStudentData | null
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
        } : undefined, // Ensure it's undefined if user.xpData is null/undefined
        skills: user.skills || [],
        bio: user.bio || '',
    };
});

// This computed property converts projects to the format expected by the PortfolioGeneratorButton
const projectsForPortfolio = computed<PortfolioProject[]>(() => {
  return (currentUserPortfolioData.value.projects || []).map(project => ({
    ...project,
    // Convert null descriptions to undefined to match the expected type
    description: project.description === null ? undefined : project.description
  }));
});

const fetchPortfolioRelatedDataForCurrentUser = async () => {
    // Fix access to student ID from store
    if (!studentStore.currentStudent?.uid || !isCurrentUser.value) {
        // Reset portfolio data if not current user or not logged in
        studentStore.$patch(state => {
            state.currentUserPortfolioData = { projects: [], eventParticipationCount: 0 };
        });
        return;
    }
    loadingPortfolioData.value = true;
    try {
        await studentStore.fetchCurrentUserPortfolioData();
        // Data is now in studentStore.currentUserPortfolioData, accessed by computed prop
    } catch (err) {
        console.error("Error fetching portfolio data for ProfileView:", err);
    } finally {
        loadingPortfolioData.value = false;
    }
};

const determineProfileContextAndLoad = async () => {
    loading.value = true;
    // Ensure studentStore.currentStudent is at least checked once initial auth might have settled.
    // This relies on the watcher for studentStore.currentStudent to trigger this function
    // once the login state is more definitively known.
    
    const routeUserIdParam = route.params.userId;
    const loggedInUid = studentStore.currentStudent?.uid; 

    const targetUidFromRoute = Array.isArray(routeUserIdParam) ? routeUserIdParam[0] : routeUserIdParam;

    if (targetUidFromRoute) {
        targetUserId.value = targetUidFromRoute;
        isCurrentUser.value = targetUidFromRoute === loggedInUid;
    } else if (loggedInUid && route.name === 'Profile') { // Viewing own profile via /profile
        targetUserId.value = loggedInUid;
        isCurrentUser.value = true;
    } else { 
        targetUserId.value = null;
        isCurrentUser.value = false;
        if (!loggedInUid && route.name === 'Profile') {
            // Only redirect if explicitly trying to access own profile page without being logged in.
            router.replace({ name: 'Login', query: { redirect: route.fullPath }});
            loading.value = false;
            return;
        }
    }

    if (isCurrentUser.value && targetUserId.value) {
        if (studentStore.fetchProfileForView && loggedInUid) { // Ensure loggedInUid before fetching
            await studentStore.fetchProfileForView(loggedInUid);
        }
        await fetchPortfolioRelatedDataForCurrentUser();
    }
    loading.value = false;
};

// Watch for route changes (e.g., navigating from one user's profile to another)
watch(() => route.params.userId, 
    (newRouteUserId, oldRouteUserId) => {
        if (newRouteUserId !== oldRouteUserId) {
            determineProfileContextAndLoad();
        }
    }
);

// Watch for changes in the logged-in user's state (login/logout)
// This is crucial for updating isCurrentUser correctly.
watch(() => studentStore.currentStudent, // Watch the whole currentStudent object
    (newStudent, oldStudent) => {
        // Re-evaluate profile context if the student object itself changes (login/logout)
        // or if the UID specifically changes (though student object changing implies this)
        if (newStudent?.uid !== oldStudent?.uid) {
            determineProfileContextAndLoad();
        }
    },
    { deep: true, immediate: true } // immediate: true to run on component mount
);


onMounted(async () => {
  // determineProfileContextAndLoad is now called by the immediate watcher for studentStore.currentStudent
  // Additional logic for onMounted if needed, but primary load is handled by watcher.
  // If for some reason the watcher didn't fire immediately or if initial loggedInUid was available,
  // we can re-check portfolio data fetching.
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