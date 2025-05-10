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

      <!-- Standard User View -->
      <!-- Main Content Block  -->
      <!-- Header for Current User -->
      <div v-if="isCurrentUser" class="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-5 pb-4 border-bottom">
        <div>
          <h2 class="h2 text-primary mb-2 d-inline-flex align-items-center">
            <i class="fas fa-user-circle me-2"></i>My Profile
          </h2>
          <!-- Edit Profile Button Removed From Here -->
        </div>
        <!-- Portfolio Button Area -->
        <div class="d-flex align-items-center">
          <PortfolioGeneratorButton
            v-if="!loadingProjectsForPortfolio && userProjectsForPortfolio.length > 0"
            :user="userForPortfolio"
            :projects="userProjectsForPortfolio"
            :event-participation-count="eventParticipationCount"
          />
          <div v-else class="d-flex align-items-center text-secondary">
            <div v-if="loadingProjectsForPortfolio || loadingEventCount" class="spinner-border spinner-border-sm me-2"></div>
            <span class="small">{{ loadingProjectsForPortfolio ? 'Loading portfolio data...' : 'No portfolio data' }}</span>
          </div>
        </div>
      </div>

      <!-- Profile Content -->
      <ProfileViewContent
        ref="profileContentRef"
        v-if="targetUserId"
        :user-id="targetUserId"
        :is-current-user-prop="isCurrentUser"
      >
        <!-- Slot for Additional Content (e.g., User Requests) -->
        <template #additional-content v-if="isCurrentUser">
          <AuthGuard>
            <div class="card mt-5">
              <div class="card-header requests-card-header">
                <h6 class="mb-0 d-flex align-items-center">
                  <i class="fas fa-bell text-primary me-2"></i>Notifications
                </h6>
              </div>
              <div class="card-body p-0"> <!-- Bootstrap uses card-body -->
                <UserRequests />
              </div>
            </div>
          </AuthGuard>
        </template>
      </ProfileViewContent>

      <!-- Fallback if no target user -->
      <p v-else class="text-center text-secondary py-5">
        Could not determine user profile to display.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useUserStore } from '@/store/user';
import { DocumentData } from 'firebase/firestore';

// Import Components
import ProfileViewContent from '@/components/user/ProfileViewContent.vue';
import PortfolioGeneratorButton from '@/components/user/PortfolioGeneratorButton.vue';
import UserRequests from '@/components/user/UserRequests.vue';
import AuthGuard from '@/components/AuthGuard.vue';
import { Project } from '@/types/project'; 

interface UserData {
  name: string;
  uid: string;
  photoURL?: string; // Added
  skills: string[];
  preferredRoles: string[];
  xpByRole: Record<string, number>;
  totalXp: number;
  hasLaptop?: boolean;
}

interface UserProject extends DocumentData {
  id: string;
  eventName: string;
  eventType: string;
}

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();

// --- State ---
const targetUserId = ref<string | null>(null);
const isCurrentUser = ref<boolean>(false);
const userProjectsForPortfolioButton = ref<Project[]>([]); // Use Project[] type
const loadingProjectsForPortfolio = ref<boolean>(false);
const eventParticipationCount = ref<number>(0); // State for event count
const loadingEventCount = ref<boolean>(false); // Loading state for count

// --- Add missing refs for profileUser, loading, error ---
const profileUser = ref<UserData | null>(null);
const loading = ref<boolean>(false);
const error = ref<string>('');

// Add ref for ProfileViewContent
const profileContentRef = ref();

// --- Computed Properties ---
const loggedInUserId = computed<string | null>(() => userStore.uid);

const userForPortfolio = computed<UserData>(() => {
    if (!isCurrentUser.value) return {} as UserData;
    const currentUserData = userStore.currentUser;
    if (!currentUserData || !currentUserData.uid) return {} as UserData;
    const totalXp = userStore.currentUserTotalXp;
    return {
        name: currentUserData.name,
        uid: currentUserData.uid,
        photoURL: currentUserData.photoURL, // Added
        skills: currentUserData.skills || [],
        preferredRoles: currentUserData.preferredRoles || [],
        xpByRole: currentUserData.xpByRole || {},
        totalXp,
        hasLaptop: currentUserData.hasLaptop || false,
    };
});

const userProjectsForPortfolio = computed(() => {
    // Use store getter for current user's projects
    return userStore.currentUserProjectsForPortfolio || [];
});

// --- Fetch portfolio data for current user ---
const fetchPortfolioRelatedDataForCurrentUser = async () => {
    if (!loggedInUserId.value || !isCurrentUser.value) {
        userProjectsForPortfolioButton.value = [];
        eventParticipationCount.value = 0;
        return;
    }
    
    loadingProjectsForPortfolio.value = true;
    loadingEventCount.value = true;
    
    try {
        // Fetch portfolio data from store
        await userStore.fetchCurrentUserPortfolioData();
        
        // Get data from store
        userProjectsForPortfolioButton.value = userStore.currentUserProjectsForPortfolio;
        eventParticipationCount.value = userStore.currentUserEventParticipationCount;
    } catch (err) {
        console.error("Error fetching portfolio data:", err);
        userProjectsForPortfolioButton.value = [];
        eventParticipationCount.value = 0;
    } finally {
        loadingProjectsForPortfolio.value = false;
        loadingEventCount.value = false;
    }
};

const determineProfileContext = async () => {
    const routeUserId = route.params.userId;
    const loggedInUid = loggedInUserId.value;
    const targetUid = Array.isArray(routeUserId) ? routeUserId[0] : routeUserId;

    if (targetUid) {
        isCurrentUser.value = targetUid === loggedInUid;
        targetUserId.value = targetUid;
    } else if (loggedInUid && route.name === 'Profile') {
        isCurrentUser.value = true;
        targetUserId.value = loggedInUid;
    } else {
        isCurrentUser.value = false;
        targetUserId.value = null;
    }

    if (isCurrentUser.value && loggedInUid) {
        await fetchPortfolioRelatedDataForCurrentUser();
    } else {
        userProjectsForPortfolioButton.value = [];
        eventParticipationCount.value = 0;
    }
};

// --- Watchers ---
watch(() => route.params.userId, determineProfileContext, { immediate: true });
watch(loggedInUserId, (newUid, oldUid) => {
    if (newUid !== oldUid) {
        determineProfileContext();
    }
});

// --- Lifecycle Hooks ---
onMounted(() => {
    if (isCurrentUser.value) {
        fetchPortfolioRelatedDataForCurrentUser();
    }
});

</script>

<style scoped>
.profile-section {
  background-color: var(--bs-body-bg);
  min-height: calc(100vh - 8rem); /* Keep min-height */
}

.requests-card-header {
  background-color: var(--bs-tertiary-bg); /* Using BS variable */
  border-bottom: 1px solid var(--bs-border-color); /* Using BS variable */
}

/* Removed custom gap-4 class */
</style>
