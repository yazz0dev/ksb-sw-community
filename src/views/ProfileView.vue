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
          <h2 class="h2 text-primary mb-2">My Profile</h2>
          <button 
            v-if="isCurrentUser"
            @click="profileContentRef?.openEditProfile()"
            class="btn btn-outline-primary"
          >
            <i class="fas fa-edit me-1"></i> Edit Profile
          </button>
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
        :is-current-user="isCurrentUser"
        @hook:mounted="() => {}"
      >
        <!-- Slot for Additional Content (e.g., User Requests) -->
        <template #additional-content v-if="isCurrentUser">
          <AuthGuard>
            <div class="card mt-5">
              <div class="card-header requests-card-header">
                <h6 class="mb-0 d-flex align-items-center">
                  <i class="fas fa-paper-plane text-primary me-2"></i>
                  My Event Requests
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
import { useStore } from 'vuex';
import { useRoute, useRouter } from 'vue-router';
import { db } from '../firebase';
// Import necessary Firestore functions
import { collection, query, where, getDocs, orderBy, doc, getDoc, DocumentData, collectionGroup,getCountFromServer } from 'firebase/firestore';
import { generatePortfolioPDF } from '../utils/pdfGenerator'; // Import PDF generator


// Import Components
import ProfileViewContent from '../components/ProfileViewContent.vue';
import PortfolioGeneratorButton from '../components/PortfolioGeneratorButton.vue';
import UserRequests from '../components/UserRequests.vue';
import AuthGuard from '../components/AuthGuard.vue';
import { Project } from '@/types/project'; // Import the Project type

interface UserData {
  name: string;
  uid: string;
  skills: string[];
  preferredRoles: string[];
  xpByRole: Record<string, number>;
  totalXp: number;
}

interface UserProject extends DocumentData {
  id: string;
  eventName: string;
  eventType: string;
}

const store = useStore();
const route = useRoute();
const router = useRouter();

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
const loggedInUserId = computed<string | null>(() => store.state.user.uid);

const userForPortfolio = computed<UserData>(() => {
    if (!isCurrentUser.value) return {} as UserData;
    const currentUserData = store.getters['user/getUser'];
    if (!currentUserData || !currentUserData.uid) return {} as UserData;
    const totalXp = store.getters['user/currentUserTotalXp'];
    return {
        name: currentUserData.name,
        uid: currentUserData.uid,
        skills: currentUserData.skills || [],
        preferredRoles: currentUserData.preferredRoles || [],
        xpByRole: currentUserData.xpByRole || {},
        totalXp
    };
});

const userProjectsForPortfolio = computed(() => {
    return userProjectsForPortfolioButton.value;
});


const fetchUserProjectsForPortfolio = async () => {
    if (!loggedInUserId.value) return;
    loadingProjectsForPortfolio.value = true;
    try {
        const submissionsQuery = query(
            collection(db, 'submissions'),
            where('userId', '==', loggedInUserId.value),
            orderBy('submittedAt', 'desc')
        );
        const snapshot = await getDocs(submissionsQuery);
        userProjectsForPortfolioButton.value = snapshot.docs.map(doc => {
             const data = doc.data();
             // Ensure all required fields are present
             const project: Project = {
                id: doc.id,
                projectName: data.projectName || data.details.eventName || `Project (${doc.id.substring(0, 5)}...)`,
                eventName: data.details.eventName || `Event (${data.eventId?.substring(0, 5) || doc.id.substring(0, 5)}...)`,
                eventType: data.details.type || 'Unknown',
                description: data.details?.description || '',
                link: data.link || '#', // Required field with fallback
                submittedAt: data.submittedAt
             };
             return project;
         });
    } catch (error) {
        userProjectsForPortfolioButton.value = [];
    } finally {
        loadingProjectsForPortfolio.value = false;
    }
};

const fetchEventParticipationCount = async (userId: string) => {
    if (!userId) return 0;
    loadingEventCount.value = true;
    let participatedCount = 0;
    let organizedCount = 0;
    try {
        // Fetch user doc and count participated/organized events from user fields
        const userDocRef = doc(db, 'users', userId);
        const userDocSnap = await getDoc(userDocRef);
        if (!userDocSnap.exists()) throw new Error('User profile not found.');
        const data = userDocSnap.data();
        participatedCount = Array.isArray(data.participatedEvent) ? data.participatedEvent.length : 0;
        organizedCount = Array.isArray(data.organizedEvent) ? data.organizedEvent.length : 0;
        eventParticipationCount.value = participatedCount + organizedCount;
    } catch (err) {
        eventParticipationCount.value = 0; // Reset on error
    } finally {
        loadingEventCount.value = false;
    }
    return eventParticipationCount.value;
};


const determineProfileContext = async () => {
    const routeUserId = route.params.userId;
    const loggedInUid = loggedInUserId.value;

    // Handle potential array from route params
    const targetUid = Array.isArray(routeUserId) ? routeUserId[0] : routeUserId;

    if (targetUid) {
        // Viewing someone else's profile (or own via /user/:userId)
        isCurrentUser.value = targetUid === loggedInUid;
        targetUserId.value = targetUid; // Assign the string value
        await fetchUserProfile(targetUid); // Fetch specific user profile
    } else if (loggedInUid && route.name === 'Profile') {
        // Viewing own profile via /profile
        isCurrentUser.value = true;
        targetUserId.value = loggedInUid;
        await fetchUserProfile(loggedInUid);
    } else {
        // No target user and not logged in or invalid route
        // Optionally redirect to login or show an error
        // if (!loggedInUid) {
        //    router.push({ name: 'Login' });
        // }
    }
};

const fetchUserProfile = async (userIdToFetch: string) => {
    if (!userIdToFetch) return;
    loading.value = true;
    error.value = '';
    try {
        // Ensure userIdToFetch is a string before calling doc
        if (typeof userIdToFetch !== 'string') {
            throw new Error("Invalid User ID provided.");
        }
        const userDocRef = doc(db, 'users', userIdToFetch);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
            profileUser.value = { uid: userDocSnap.id, ...userDocSnap.data() } as UserData;
            // Fetch projects and participation count for all users now
            await Promise.all([
                fetchUserProjectsForPortfolio(),
                fetchEventParticipationCount(userIdToFetch)
            ]);
        } else {
            error.value = 'User profile not found.';
            profileUser.value = null;
        }
    } catch (err: any) {
        error.value = err.message || 'Failed to load profile.';
        profileUser.value = null;
    } finally {
        loading.value = false;
    }
};

// Update openEditProfile method
const openEditProfile = () => {
  if (profileContentRef.value) {
    profileContentRef.value.openEditModal();
  }
};

// --- Watchers ---
watch(() => route.params.userId, determineProfileContext, { immediate: true });
watch(loggedInUserId, (newUid, oldUid) => {
    if ((!oldUid && newUid) || (oldUid && !newUid)) {
        determineProfileContext();
    } else if (newUid && route.params.userId === newUid) {
        determineProfileContext();
    }
});

// --- Lifecycle Hooks ---
onMounted(() => {
    // Initial determination is handled by the immediate watcher
    // determineProfileContext(); 
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
