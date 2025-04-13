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

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useStore } from 'vuex';
import { useRoute, useRouter } from 'vue-router';
import { db } from '../firebase';
import { collection, query, where, getDocs, orderBy, doc, getDoc } from 'firebase/firestore';

// Removed Chakra UI imports

// Import Components
import ProfileViewContent from '../components/ProfileViewContent.vue';
import PortfolioGeneratorButton from '../components/PortfolioGeneratorButton.vue';
import UserRequests from '../components/UserRequests.vue';
import AuthGuard from '../components/AuthGuard.vue';

const store = useStore();
const route = useRoute();
const router = useRouter();

// --- State ---
const targetUserId = ref(null);
const isCurrentUser = ref(false);
const isAdminProfile = ref(false);
const userProjectsForPortfolioButton = ref([]);
const loadingProjectsForPortfolio = ref(false);

// --- Computed Properties ---
const loggedInUserId = computed(() => store.state.user.uid);
const loggedInUserIsAdmin = computed(() => store.getters['user/isAdmin']);

const userForPortfolio = computed(() => {
    if (!isCurrentUser.value) return {};
    const currentUserData = store.getters['user/getUser'];
    if (!currentUserData || !currentUserData.uid) return {};
    const totalXp = store.getters['user/currentUserTotalXp'];
    return {
        name: currentUserData.name,
        uid: currentUserData.uid,
        skills: currentUserData.skills || [],
        preferredRoles: currentUserData.preferredRoles || [],
        xpByRole: currentUserData.xpByRole || {},
        totalXp: totalXp
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
             return { id: doc.id, ...data, eventName: data.eventName || `Event (${data.eventId.substring(0, 5)}...)`, eventType: data.eventType || 'Unknown' };
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
    const currentLoggedInUserId = loggedInUserId.value;
    isAdminProfile.value = false;

    if (routeUserId) {
        targetUserId.value = routeUserId;
        isCurrentUser.value = routeUserId === currentLoggedInUserId;
        try {
            const userDocRef = doc(db, 'users', routeUserId);
            const userDocSnap = await getDoc(userDocRef);
            if (userDocSnap.exists() && userDocSnap.data().role === 'Admin') {
                isAdminProfile.value = true;
            }
        } catch (error) {
            console.error("Error checking if target user is admin:", error);
        }
    } else if (currentLoggedInUserId) {
        targetUserId.value = currentLoggedInUserId;
        isCurrentUser.value = true;
        isAdminProfile.value = loggedInUserIsAdmin.value;
        if (!isAdminProfile.value) {
             fetchUserProjectsForPortfolio();
        } else {
             loadingProjectsForPortfolio.value = false;
             userProjectsForPortfolioButton.value = [];
        }
    } else {
        targetUserId.value = null;
        isCurrentUser.value = false;
        console.warn("Cannot determine profile: No route parameter and user not logged in.");
        // Consider redirecting if profile cannot be determined
        // if (!route.meta.public) { // Example check if route requires auth
        //    router.push({ name: 'Login' });
        // }
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
