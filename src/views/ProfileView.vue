<template>
  <div class="section" style="background-color: var(--color-background); min-height: calc(100vh - 8rem);">
    <div class="container is-max-widescreen">
      <!-- Back Button -->
      <div v-if="!isCurrentUser" class="mb-6">
        <button
          class="button is-small is-outlined"
          @click="$router.back()"
        >
          <span class="icon is-small"><i class="fas fa-arrow-left"></i></span>
          <span>Back</span>
        </button>
      </div>

      <!-- Admin View Message -->
      <div v-if="isAdminProfile" class="message is-info">
        <div class="message-body">
          <div class="is-flex is-align-items-center">
             <span class="icon is-medium mr-2"><i class="fas fa-user-shield"></i></span>
             <div>
                <p class="is-size-5 has-text-weight-semibold mb-1">Admin Account</p>
                <p class="is-size-7">Admin accounts do not have personal profiles. Access admin tools via the main navigation.</p>
             </div>
          </div>
        </div>
      </div>

      <!-- Standard User View -->
      <template v-else>
        <!-- Header for Current User -->
        <div v-if="isCurrentUser" class="is-flex is-flex-wrap-wrap is-justify-content-space-between is-align-items-center gap-4 mb-6 pb-4" style="border-bottom: 1px solid var(--color-border);">
          <h2 class="title is-3 has-text-primary mb-0">My Profile</h2>
          <!-- Portfolio Button Area -->
          <div class="is-flex is-align-items-center">
            <PortfolioGeneratorButton
              v-if="!loadingProjectsForPortfolio && userProjectsForPortfolio.length > 0"
              :user="userForPortfolio"
              :projects="userProjectsForPortfolio"
            />
            <p v-else-if="loadingProjectsForPortfolio" class="is-size-7 has-text-grey is-italic ml-2">
              Loading portfolio data...
            </p>
            <p v-else class="is-size-7 has-text-grey is-italic ml-2">
              (Portfolio PDF available after completing events with submissions)
            </p>
          </div>
        </div>

        <!-- Profile Content -->
        <ProfileViewContent v-if="targetUserId" :user-id="targetUserId" :is-current-user="isCurrentUser">
           <!-- Slot for Additional Content (e.g., User Requests) -->
           <template #additional-content v-if="isCurrentUser">
             <AuthGuard>
                <div class="card mt-6">
                  <header class="card-header" style="background-color: var(--color-secondary-light); border-bottom: 1px solid var(--color-secondary-border);">
                    <p class="card-header-title">
                       <span class="icon has-text-primary mr-2"><i class="fas fa-paper-plane"></i></span>
                       My Event Requests
                    </p>
                  </header>
                  <div class="card-content p-0"> <!-- Remove padding if UserRequests handles it -->
                     <UserRequests />
                  </div>
                </div>
             </AuthGuard>
           </template>
        </ProfileViewContent>

        <!-- Fallback if no target user -->
        <p v-else class="has-text-centered has-text-grey py-6">
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
.gap-4 { gap: 1rem; }
.py-6 { padding-top: 1.5rem; padding-bottom: 1.5rem; }
</style>
