<template>
  <div class="py-5 profile-section" style="background-color: var(--bs-body-bg); min-height: calc(100vh - 8rem);">
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

      <!-- Admin View Message -->
      <div v-if="isAdminProfile" class="alert alert-info d-flex align-items-center" role="alert">
        <i class="fas fa-user-shield fs-4 me-3"></i>
         <div>
            <h5 class="fw-semibold mb-1">Admin Account</h5>
            <p class="small mb-0">Admin accounts do not have personal profiles. Access admin tools via the main navigation.</p>
         </div>
      </div>

      <!-- Standard User View -->
      <template v-else>
        <!-- Header for Current User -->
        <div v-if="isCurrentUser" class="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-5 pb-4" style="border-bottom: 1px solid var(--bs-border-color);">
          <h2 class="h2 text-primary mb-0">My Profile</h2>
          <!-- Portfolio Button Area -->
          <div class="d-flex align-items-center">
            <PortfolioGeneratorButton
              v-if="!loadingProjectsForPortfolio && userProjectsForPortfolio.length > 0"
              :user="userForPortfolio"
              :projects="userProjectsForPortfolio"
            />
            <p v-else-if="loadingProjectsForPortfolio" class="small text-secondary fst-italic ms-2 mb-0">
              Loading portfolio data...
            </p>
            <p v-else class="small text-secondary fst-italic ms-2 mb-0">
              (Portfolio PDF available after completing events with submissions)
            </p>
          </div>
        </div>

        <!-- Profile Content -->
        <ProfileViewContent v-if="targetUserId" :user-id="targetUserId" :is-current-user="isCurrentUser">
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
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useStore } from 'vuex';
import { useRoute, useRouter } from 'vue-router';
import { db } from '../firebase';
import { collection, query, where, getDocs, orderBy, doc, getDoc, DocumentData } from 'firebase/firestore';

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
const isAdminProfile = ref<boolean>(false);
const userProjectsForPortfolioButton = ref<Project[]>([]); // Use Project[] type
const loadingProjectsForPortfolio = ref<boolean>(false);

// --- Add missing refs for profileUser, loading, error ---
const profileUser = ref<UserData | null>(null);
const loading = ref<boolean>(false);
const error = ref<string>('');

// --- Computed Properties ---
const loggedInUserId = computed<string | null>(() => store.state.user.uid);
const loggedInUserIsAdmin = computed<boolean>(() => store.getters['user/isAdmin']);

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

// --- Methods ---
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
                projectName: data.projectName || data.eventName || `Project (${doc.id.substring(0, 5)}...)`,
                eventName: data.eventName || `Event (${data.eventId?.substring(0, 5) || doc.id.substring(0, 5)}...)`,
                eventType: data.eventType || 'Unknown',
                description: data.details?.description || '',
                link: data.link || '#', // Required field with fallback
                submittedAt: data.submittedAt
             };
             return project;
         });
    } catch (error) {
        console.error("Error fetching user projects for portfolio:", error);
        userProjectsForPortfolioButton.value = [];
    } finally {
        loadingProjectsForPortfolio.value = false;
    }
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
        isAdminProfile.value = false; // Public profiles are never "Admin" profiles in this context
        await fetchUserProfile(targetUid); // Fetch specific user profile
    } else if (loggedInUid && route.name === 'Profile') {
        // Viewing own profile via /profile
        isCurrentUser.value = true;
        targetUserId.value = loggedInUid;
        isAdminProfile.value = loggedInUserIsAdmin.value; // Check if logged-in user is admin
        if (!isAdminProfile.value) {
            await fetchUserProfile(loggedInUid); // Fetch own profile if not admin
        } else {
            // Handle admin viewing their own "profile" page (might be different)
            console.log("Admin viewing their profile page.");
            // Reset or load admin-specific data if necessary
            profileUser.value = null;
            loading.value = false;
        }
    } else {
        // No target user and not logged in or invalid route
        console.error("Cannot determine profile context.");
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
            // Fetch projects only if viewing a student profile
            if ((profileUser.value as any).role === 'Student') {
                 await fetchUserProjectsForPortfolio();
            } else {
                 userProjectsForPortfolioButton.value = []; // Clear projects for non-students
            }
        } else {
            error.value = 'User profile not found.';
            profileUser.value = null;
        }
    } catch (err: any) {
        console.error('Error fetching user profile:', err);
        error.value = err.message || 'Failed to load profile.';
        profileUser.value = null;
    } finally {
        loading.value = false;
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
