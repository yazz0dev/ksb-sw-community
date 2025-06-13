<template>
  <div class="section-spacing profile-section bg-body-tertiary min-vh-100-subtract-nav">
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
      <div v-if="isCurrentUser && currentUserData" class="profile-header mb-4 pb-3 border-bottom">
        <div class="d-flex align-items-start justify-content-between">
          <!-- Left side: Profile heading and subtitle -->
          <div class="header-text flex-grow-1">
            <div class="d-flex align-items-center justify-content-between mb-1">
              <h2 class="h2 text-gradient-primary mb-0 d-inline-flex align-items-center">
                <i class="fas fa-user-circle me-2"></i>My Profile
              </h2>
              
              <!-- Portfolio Button - All screen sizes -->
              <div class="ms-3 flex-shrink-0">
                <PortfolioGeneratorButton
                  v-if="!loadingPortfolioData && currentUserPortfolioData.eventParticipationCount >= 1"
                  :user="userForPortfolioGeneration"
                  :projects="projectsForPortfolio"
                  :event-participation-count="currentUserPortfolioData.eventParticipationCount"
                  v-bind="currentUserPortfolioData.comprehensiveData ? { comprehensiveData: currentUserPortfolioData.comprehensiveData } : {}"
                />
                <div v-else-if="loadingPortfolioData" class="d-flex align-items-center text-secondary">
                  <div class="spinner-border spinner-border-sm me-2" role="status"></div>
                  <span class="small fw-medium d-none d-sm-inline">Loading...</span>
                </div>
                <div v-else class="bg-light-subtle text-secondary-emphasis border rounded px-2 py-1 small d-none d-sm-flex align-items-center">
                  <i class="fas fa-info-circle me-1"></i>
                  <span class="text-nowrap">Generate after event</span>
                </div>
              </div>
            </div>
            <p class="text-muted small mb-0">
              <i class="fas fa-chart-line me-1"></i>
              Portfolio ready for generation with {{ currentUserPortfolioData.projects.length }} projects
            </p>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading">
        <ProfileSkeleton />
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
                <UserProjects :projects="projectsForUserComponent" :loading="loadingEventsOrProjects" :initial-data-loaded="initialDataLoaded" />
              </div>
              
              <!-- Additional Content for Current User -->
              <div v-if="isCurrentUser" class="additional-content animate-fade-in" style="animation-delay: 0.5s">
                  <AuthGuard>
                    <div class="card">
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
import { fetchStudentEventsWithFallback } from '@/services/eventService/eventQueries'; // Updated import
import type { EnrichedStudentData, StudentEventHistoryItem, EnrichedUserData, StudentPortfolioProject, UserForPortfolio } from '@/types/student';

// Component imports
import PortfolioGeneratorButton from '@/components/user/PortfolioGeneratorButton.vue';
import UserRequests from '@/components/user/UserRequests.vue';
import AuthGuard from '@/components/AuthGuard.vue';
import UserProfileHeader from '@/components/user/UserProfileHeader.vue';
import UserXpBreakdown from '@/components/user/UserXpBreakdown.vue';
import UserEventHistory from '@/components/user/UserEventHistory.vue';
import UserProjects from '@/components/user/UserProjects.vue';
import ProfileSkeleton from '@/skeletons/ProfileSkeleton.vue';

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

const fetchPortfolioRelatedDataForCurrentUser = async () => {
    if (!studentStore.currentStudent?.uid || !isCurrentUser.value) {
        studentStore.$patch((state: any) => {
            state.currentUserPortfolioData = { projects: [], eventParticipationCount: 0 };
        });
        return;
    }
    
    // Only fetch if we don't already have the data or if it's stale
    if (loadingPortfolioData.value) return; // Prevent multiple simultaneous fetches
    
    loadingPortfolioData.value = true;
    try {
        await Promise.all([
            studentStore.fetchCurrentUserPortfolioData(),
            studentStore.fetchCurrentUserComprehensivePortfolioData()
        ]);
    } catch (err) {
        console.error("Error fetching portfolio data for ProfileView:", err);
    } finally {
        loadingPortfolioData.value = false;
    }
};

// Memoize computed properties to prevent unnecessary recalculations
const userForPortfolioGeneration = computed<UserForPortfolio>(() => {
    if (!isCurrentUser.value || !currentUserData.value) return { name: 'User', uid: '' };
    const user = currentUserData.value;
    return {
        name: user.name || 'User',
        uid: user.uid,
        email: user.email ?? null,
        photoURL: user.photoURL ?? null,
        xpData: user.xpData || undefined,
        skills: user.skills || [],
        bio: user.bio || '',
        socialLinks: user.socialLinks || {},
    };
});

const projectsForPortfolio = computed(() => {
  if (!currentUserPortfolioData.value.projects) return [];
  return currentUserPortfolioData.value.projects.map((project: StudentPortfolioProject) => ({
    projectName: project.projectName,
    link: project.link,
    description: project.description === null ? undefined : project.description
  }));
});

const projectsForUserComponent = computed(() => {
  return userProjects.value.map((p: any) => ({
    ...p,
    description: p.description === null ? null : p.description // Keep as null for UserProjects component
  }));
});

// --- Computed ---
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
const fetchUserRequestsForCurrentUser = async (userId: string) => {
    try {
        await studentStore.fetchUserRequests(userId);
    } catch (err) {
        console.error("Error fetching user requests:", err);
        if (errorMessage.value === '') {
            errorMessage.value = 'Failed to load event requests. Some profile data may be incomplete.';
        }
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
    // This function now only manages loading state for projects/events, not the main 'loading'
    loadingEventsOrProjects.value = true;
    // errorMessage.value = ''; // Error message is handled by determineProfileContextAndLoad

    // Reset specific parts for the viewed profile if it's being re-fetched
    if (viewedUser.value?.uid !== userId) {
        viewedUser.value = null;
        userProjects.value = [];
        participatedEvents.value = [];
        stats.value = { participatedCount: 0, organizedCount: 0, wonCount: 0 };
    }
    initialDataLoaded.value = false;

    try {
        await studentStore.fetchProfileForView(userId);
        const profileDataFromStore = studentStore.viewedStudentProfile;

        if (!profileDataFromStore) throw new Error('User data not found.');

        viewedUser.value = {
          ...profileDataFromStore,
          xpData: profileDataFromStore.xpData ?? null,
          socialLinks: profileDataFromStore.socialLinks || undefined
        };

        // Use the fallback function instead of the direct one
        try {
          const studentEvents = await fetchStudentEventsWithFallback(userId);
          
          // Get organizer names for all events at once
          const allOrganizerIds = [...new Set(studentEvents.flatMap(event => event.details.organizers || []))];
          const organizerNamesMap = allOrganizerIds.length > 0 
            ? await studentStore.fetchUserNamesBatch(allOrganizerIds)
            : {};
          
          // Convert Event objects to StudentEventHistoryItem format
          // Events are already sorted by Firebase queries, just filter and map
          participatedEvents.value = studentEvents
            .filter(event => event.status !== 'Pending') // Filter out pending events
            .map(event => {
            const eventName = event.details.eventName || 'Unnamed Event';
            
            return {
              eventId: event.id,
              eventName: eventName,
              eventStatus: event.status,
              eventFormat: event.details.format,
              roleInEvent: event.details.organizers?.includes(userId) ? 'organizer' as const : 'participant' as const,
              date: {
                start: event.details.date.start && typeof event.details.date.start === 'object' && 'toMillis' in event.details.date.start 
                  ? event.details.date.start 
                  : null,
                end: event.details.date.end && typeof event.details.date.end === 'object' && 'toMillis' in event.details.date.end 
                  ? event.details.date.end 
                  : null
              },
              eventDescription: event.details.description,
              eventType: event.details.type,
              organizerNames: event.details.organizers 
                ? event.details.organizers.map(id => organizerNamesMap[id] || `Student (${id.substring(0,5)})`)
                : undefined,
              participantCount: event.participants?.length || 0
            };
          });
        } catch (eventsError) {
          console.warn("Failed to fetch student events, continuing without event data:", eventsError);
          participatedEvents.value = [];
        }

        // Try to get projects from the store, but handle gracefully if not available
        userProjects.value = studentStore.viewedStudentProjects?.map((p: any) => ({
          ...p,
          description: p.description === null ? undefined : p.description
        })) || [];

        calculateStatsFromEvents(participatedEvents.value);
        if (viewedUser.value?.xpData) {
            stats.value.wonCount = viewedUser.value.xpData.count_wins ?? 0;
        }

    } catch (error: any) {
        // Let determineProfileContextAndLoad handle setting the main errorMessage
        console.error(`[ProfileView] Error in fetchFullProfile for ${userId}:`, error);
        throw error; // Re-throw to be caught by determineProfileContextAndLoad
    } finally {
        loadingEventsOrProjects.value = false;
        initialDataLoaded.value = true;
    }
};

const determineProfileContextAndLoad = async () => {
    loading.value = true;
    errorMessage.value = '';

    // Reset states for viewed user profile data
    viewedUser.value = null;
    userProjects.value = [];
    participatedEvents.value = [];
    stats.value = { participatedCount: 0, organizedCount: 0, wonCount: 0 };
    initialDataLoaded.value = false;
    // Do not reset currentUserPortfolioData here as it's for the logged-in user, not necessarily the viewed profile

    const routeUserIdParam = route.params.userId;
    const loggedInUid = studentStore.currentStudent?.uid;
    const targetUidFromRoute = Array.isArray(routeUserIdParam) ? routeUserIdParam[0] : routeUserIdParam;

    let finalUserId: string | null = null;

    if (targetUidFromRoute) {
        finalUserId = targetUidFromRoute;
    } else if (loggedInUid && route.name === 'Profile') {
        finalUserId = loggedInUid;
    }

    isCurrentUser.value = !!finalUserId && finalUserId === loggedInUid;
    targetUserId.value = finalUserId;

    try {
        if (finalUserId) {
            await fetchFullProfile(finalUserId);

            if (isCurrentUser.value) {
                await Promise.all([
                    fetchPortfolioRelatedDataForCurrentUser(),
                    fetchUserRequestsForCurrentUser(finalUserId)
                ]);
            }
        } else {
            // Handle case where no user ID could be determined (e.g., accessing /profile when not logged in)
            if (!loggedInUid && route.name === 'Profile') {
                router.replace({ name: 'Login', query: { redirect: route.fullPath } });
            } else if (route.name !== 'Profile' && !targetUidFromRoute) {
                // Generic error if a user ID was expected but not found (e.g. direct navigation to a bad user profile URL)
                errorMessage.value = "User profile ID is missing.";
            }
        }
    } catch (error: any) {
        console.error("[ProfileView] Error in determineProfileContextAndLoad:", error);
        errorMessage.value = error?.message || "Failed to load profile data.";
        viewedUser.value = null; // Ensure profile is cleared on error
    } finally {
        loading.value = false;
    }
};

const handleEditProfile = () => {
  router.push({ name: 'EditProfile' });
};

// --- Watchers ---
watch(() => studentStore.currentStudent?.uid, (newUid, oldUid) => {
    // Only react to actual UID changes, not other property changes
    if (newUid !== oldUid) {
        determineProfileContextAndLoad();
    }
}, { immediate: true });

watch(() => route.params.userId, (newRouteUserId, oldRouteUserId) => {
    if (newRouteUserId !== oldRouteUserId) {
        determineProfileContextAndLoad();
    }
});
</script>

<style scoped>
.profile-section {
  background-color: var(--bs-body-tertiary-bg);
  position: relative;
  z-index: 1;
}

.profile-header {
  .header-text {
    width: 100%;
  }
  
  .h2 {
    font-size: 1.25rem;
    
    @media (min-width: 576px) {
      font-size: 1.5rem;
    }
  }
  
  .text-muted {
    font-size: 0.75rem;
    
    @media (min-width: 576px) {
      font-size: 0.8rem;
    }
  }
  
  .ms-3 {
    margin-left: 0.75rem !important;
    
    @media (min-width: 576px) {
      margin-left: 1rem !important;
    }
  }
}

.requests-card-header {
  background-color: var(--bs-tertiary-bg);
  border-bottom: 1px solid var(--bs-border-color);
}
/* Styles from UserProfile.vue */
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