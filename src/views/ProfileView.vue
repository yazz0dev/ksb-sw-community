<template>
  <div class="py-3 py-md-5 profile-section bg-body-tertiary min-vh-100-subtract-nav">
    <div class="container-lg">
      <!-- Back Button -->
      <div v-if="!isCurrentUser" class="mb-4">
        <button
          class="btn btn-outline-secondary btn-sm btn-icon"
          @click="$router.back()"
        >
          <i class="fas fa-arrow-left me-1"></i>
          <span>Back</span>
        </button>
      </div>

      <!-- Header for Current User -->
      <div v-if="isCurrentUser && currentUserData" class="d-flex flex-column flex-md-row justify-content-md-between align-items-md-center gap-3 mb-4 pb-3 border-bottom">
        <div>
          <h2 class="h2 text-gradient-primary mb-0 d-inline-flex align-items-center">
            <i class="fas fa-user-circle me-2"></i>My Profile
          </h2>
        </div>
        <div class="d-flex align-items-center justify-content-center justify-content-md-end" style="min-height: 38px;">
          <PortfolioGeneratorButton
            v-if="!loadingPortfolioData && currentUserPortfolioData.projects.length > 0 && currentUserPortfolioData.eventParticipationCount >= 5"
            :user="userForPortfolioGeneration"
            :projects="projectsForPortfolio"
            :event-participation-count="currentUserPortfolioData.eventParticipationCount"
          />
          <div v-else-if="loadingPortfolioData" class="d-flex align-items-center text-secondary px-3">
            <div class="spinner-border spinner-border-sm me-2" role="status"></div>
            <span class="small fw-medium">Loading portfolio data...</span>
          </div>
           <div v-else-if="currentUserPortfolioData.eventParticipationCount < 5 && currentUserPortfolioData.projects.length > 0" class="bg-light-subtle text-secondary-emphasis border rounded-pill px-3 py-1 small d-inline-flex align-items-center">
            <i class="fas fa-info-circle me-2"></i>
            <span>Generate portfolio after 5 event participations.</span>
          </div>
          <div v-else class="bg-light-subtle text-secondary-emphasis border rounded-pill px-3 py-1 small d-inline-flex align-items-center">
            <i class="fas fa-info-circle me-2"></i>
            <span>No project data for portfolio generation.</span>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="loading-container d-flex flex-column align-items-center justify-content-center py-5">
        <div class="spinner-border text-primary mb-3" role="status" style="width: 3rem; height: 3rem;">
          <span class="visually-hidden">Loading...</span>
        </div>
        <p class="text-secondary fw-medium">Loading profile...</p>
      </div>

      <!-- Error/Not Found States -->
      <div v-else-if="errorMessage || !viewedUser" class="error-container animate-fade-in">
        <div class="alert alert-warning d-flex align-items-center shadow-sm rounded-4" role="alert">
          <div class="alert-icon me-3"><i class="fas fa-exclamation-triangle fa-2x"></i></div>
          <div class="alert-content">
            <h6 class="alert-heading mb-1">Profile Not Available</h6>
            <p class="mb-0">{{ errorMessage || 'User profile could not be displayed.' }}</p>
          </div>
        </div>
      </div>
      
      <!-- Main Profile Content -->
      <div v-else-if="viewedUser" class="profile-content animate-fade-in">
        <div class="row g-4 g-lg-5">
          <!-- Left Column (Sidebar) -->
          <div class="col-12 col-lg-4">
            <div class="profile-sidebar sticky-lg-top">
              <UserProfileHeader 
                :user="viewedUser" 
                :is-current-user="isCurrentUser" 
                :stats="stats"
                @edit-profile="handleEditProfile"
                class="animate-fade-in" style="animation-delay: 0.1s"
              />
            </div>
          </div>

          <!-- Right Column (Main Details) -->
          <div class="col-12 col-lg-8">
            <div class="profile-details d-flex flex-column gap-3 gap-md-4">
              <!-- XP Breakdown -->
              <div v-if="hasXpData" class="xp-section animate-fade-in" style="animation-delay: 0.2s">
                <UserXpBreakdown :xp-data="filteredXpData" />
              </div>

              <!-- Event History -->
              <div class="events-section animate-fade-in" style="animation-delay: 0.3s">
                <UserEventHistory :events="participatedEvents" :loading="loadingEventsOrProjects" />
              </div>

              <!-- Projects -->
              <div class="projects-section animate-fade-in" style="animation-delay: 0.4s">
                <UserProjects :projects="userProjects" :loading="loadingEventsOrProjects" :initial-data-loaded="initialDataLoaded" />
              </div>
              
              <!-- Additional Content for Current User -->
              <div v-if="isCurrentUser" class="additional-content animate-fade-in" style="animation-delay: 0.5s">
                  <AuthGuard>
                    <div class="card">
                      <div class="card-header requests-card-header">
                        <h6 class="mb-0 d-flex align-items-center">
                          <i class="fas fa-inbox text-primary me-2"></i>My Event Requests
                        </h6>
                      </div>
                      <div class="card-body p-0">
                        <UserRequests />
                      </div>
                    </div>
                  </AuthGuard>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useProfileStore } from '@/stores/profileStore';
import type { EnrichedStudentData, StudentEventHistoryItem, EnrichedUserData, StudentPortfolioProject } from '@/types/student';
import type { XPData } from '@/types/xp';

// Component imports
import PortfolioGeneratorButton from '@/components/user/PortfolioGeneratorButton.vue';
import UserRequests from '@/components/user/UserRequests.vue';
import AuthGuard from '@/components/AuthGuard.vue';
import UserProfileHeader from '@/components/user/UserProfileHeader.vue';
import UserXpBreakdown from '@/components/user/UserXpBreakdown.vue';
import UserEventHistory from '@/components/user/UserEventHistory.vue';
import UserProjects from '@/components/user/UserProjects.vue';

// Define a type for the portfolio component projects
interface PortfolioProject {
  id: string;
  projectName: string;
  description?: string | undefined;
  eventId?: string | undefined;
  eventName?: string | undefined;
  eventFormat?: any;
  role?: string | undefined;
  roleDescription?: string | undefined;
  startDate?: any;
  endDate?: any;
  tags?: string[] | undefined;
  link: string;
  submittedBy?: string | undefined;
  submittedAt?: any;
}

// Define a more specific type for the portfolio button's user prop
interface UserForPortfolio {
  name: string;
  uid: string;
  xpData?: Partial<XPData> | undefined;
  skills?: string[] | undefined;
  bio?: string | undefined;
}

interface Stats {
    participatedCount: number;
    organizedCount: number;
    wonCount: number;
}

const route = useRoute();
const router = useRouter();
const studentStore = useProfileStore();

// --- State for ProfileView ---
const targetUserId = ref<string | null>(null);
const isCurrentUser = ref<boolean>(false);
const loading = ref(true);
const loadingPortfolioData = ref<boolean>(false);

// --- State merged from UserProfile ---
const viewedUser = ref<EnrichedUserData | null>(null);
const errorMessage = ref<string>('');
const userProjects = ref<StudentPortfolioProject[]>([]);
const participatedEvents = ref<StudentEventHistoryItem[]>([]);
const loadingEventsOrProjects = ref<boolean>(true);
const stats = ref<Stats>({ participatedCount: 0, organizedCount: 0, wonCount: 0 });
const initialDataLoaded = ref<boolean>(false);


// --- Computed for Current User (Portfolio, etc.) ---
const currentUserData = computed<EnrichedStudentData | null>(() => studentStore.currentStudent);
const currentUserPortfolioData = computed(() => studentStore.currentUserPortfolioData);

const userForPortfolioGeneration = computed<UserForPortfolio>(() => {
    if (!isCurrentUser.value || !currentUserData.value) return { name: 'User', uid: '' };
    const user = currentUserData.value;
    return {
        name: user.name || 'User',
        uid: user.uid,
        xpData: user.xpData || undefined,
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

// --- Computed merged from UserProfile ---
const hasXpData = computed((): boolean => {
  const xp = viewedUser.value?.xpData;
  return !!(xp && xp.totalCalculatedXp > 0 && Object.values(xp).some(val => typeof val === 'number' && val > 0));
});

const filteredXpData = computed(() => {
  if (!viewedUser.value?.xpData) return null;
  const result: Record<string, number> = {};
  Object.entries(viewedUser.value.xpData).forEach(([key, value]) => {
    if (typeof value === 'number') result[key] = value;
  });
  return result;
});


// --- Methods ---
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

const calculateStatsFromEvents = (events: StudentEventHistoryItem[]) => {
    let participated = 0, organized = 0;
    events.forEach((eventItem) => { 
        if (['participant', 'team_member', 'team_lead'].includes(eventItem.roleInEvent)) participated++;
        if (eventItem.roleInEvent === 'organizer') organized++;
    });
    stats.value = { ...stats.value, participatedCount: participated, organizedCount: organized };
};

const fetchFullProfile = async (userId: string) => {
    loading.value = true;
    loadingEventsOrProjects.value = true;
    errorMessage.value = '';
    
    // Reset states
    viewedUser.value = null;
    userProjects.value = [];
    participatedEvents.value = [];
    stats.value = { participatedCount: 0, organizedCount: 0, wonCount: 0 };
    initialDataLoaded.value = false;

    try {
        await studentStore.fetchProfileForView(userId);
        const profileDataFromStore = studentStore.viewedStudentProfile; 

        if (!profileDataFromStore) throw new Error('User data not found.');

        viewedUser.value = { ...profileDataFromStore, xpData: profileDataFromStore.xpData ?? null };
        participatedEvents.value = studentStore.viewedStudentEventHistory; 
        userProjects.value = studentStore.viewedStudentProjects.map(p => ({...p, description: p.description ?? null }));

        calculateStatsFromEvents(participatedEvents.value);
        if (viewedUser.value?.xpData) {
            stats.value.wonCount = viewedUser.value.xpData.count_wins ?? 0;
        }

    } catch (error: any) {
        errorMessage.value = error?.message || 'Failed to load profile.';
    } finally {
        loading.value = false;
        loadingEventsOrProjects.value = false;
        initialDataLoaded.value = true;
    }
};


const determineProfileContextAndLoad = async () => {
    loading.value = true;
    const routeUserIdParam = route.params.userId;
    const loggedInUid = studentStore.currentStudent?.uid; 
    const targetUidFromRoute = Array.isArray(routeUserIdParam) ? routeUserIdParam[0] : routeUserIdParam;

    let finalUserId: string | null = null;

    if (targetUidFromRoute) {
        finalUserId = targetUidFromRoute;
    } else if (loggedInUid && route.name === 'Profile') {
        finalUserId = loggedInUid;
    }
    
    isCurrentUser.value = finalUserId === loggedInUid;
    targetUserId.value = finalUserId;

    if (finalUserId) {
        await fetchFullProfile(finalUserId);
        if (isCurrentUser.value) {
            await fetchPortfolioRelatedDataForCurrentUser();
        }
    } else {
        isCurrentUser.value = false;
        if (!loggedInUid && route.name === 'Profile') {
            router.replace({ name: 'Login', query: { redirect: route.fullPath }});
        }
        loading.value = false;
    }
};

const handleEditProfile = () => {
  router.push({ name: 'EditProfile' });
};

// --- Watchers ---
watch(() => route.params.userId, (newRouteUserId, oldRouteUserId) => {
    if (newRouteUserId !== oldRouteUserId) {
        determineProfileContextAndLoad();
    }
});

watch(() => studentStore.currentStudent, (newStudent, oldStudent) => {
    if (newStudent?.uid !== oldStudent?.uid) {
        determineProfileContextAndLoad();
    }
}, { deep: true, immediate: true });
</script>

<style scoped>
.profile-section {
  background-color: var(--bs-body-tertiary-bg);
  position: relative;
  z-index: 1;
}
.requests-card-header {
  background-color: var(--bs-tertiary-bg);
  border-bottom: 1px solid var(--bs-border-color);
}
/* Styles from UserProfile.vue */
.loading-container {
  min-height: 400px;
}
.error-container {
  margin: 2rem 0;
}
.alert {
  border: none;
  border-left: 4px solid var(--bs-warning);
}
.alert-icon {
  color: var(--bs-warning);
  opacity: 0.8;
}
.alert-content .alert-heading {
  color: var(--bs-warning-emphasis);
  font-weight: 600;
}
.profile-sidebar {
  position: sticky;
  top: 2rem;
  z-index: 10;
}
.profile-details > div {
  opacity: 0;
  transform: translateY(20px);
  animation: slideInUp 0.6s ease-out forwards;
}
@media (max-width: 991.98px) {
  .profile-sidebar {
    position: static;
    top: auto;
  }
}
@keyframes slideInUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>