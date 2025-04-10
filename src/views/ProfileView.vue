<template>
    <!-- Use theme background, adjust padding -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 bg-background min-h-[calc(100vh-8rem)]">

        <!-- Back Button (Only for Public Profiles) -->
        <div v-if="!isCurrentUser" class="mb-6">
            <button
                class="inline-flex items-center px-3 py-1.5 border border-border shadow-sm text-sm font-medium rounded-md text-text-secondary bg-surface hover:bg-secondary-light focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors"
                @click="$router.back()">
                <i class="fas fa-arrow-left mr-1.5 h-4 w-4"></i> Back
            </button>
        </div>

        <!-- Admin View (If target user is Admin or current user is Admin viewing own non-existent profile) -->
         <div v-if="isAdminProfile" class="bg-info-light border-l-4 border-info text-info-dark p-4 rounded-md shadow-sm">
             <h3 class="text-lg font-semibold flex items-center mb-1"><i class="fas fa-user-shield mr-2"></i>Admin Account</h3>
             <p class="text-sm mb-0">Admin accounts do not have personal profiles. Access admin tools via the main navigation.</p>
         </div>

        <!-- Standard User View -->
        <template v-else>
            <!-- Header (Only for Current User Profile) -->
            <div v-if="isCurrentUser" class="flex flex-wrap justify-between items-center gap-4 mb-8 pb-4 border-b border-border">
                <h2 class="text-3xl font-bold text-text-primary">My Profile</h2>
                <!-- Portfolio Button Area -->
                <div class="flex items-center">
                    <PortfolioGeneratorButton
                        v-if="!loadingProjectsForPortfolio && userProjectsForPortfolio.length > 0"
                        :user="userForPortfolio"
                        :projects="userProjectsForPortfolio" />
                     <span v-else-if="loadingProjectsForPortfolio" class="text-xs text-text-secondary italic ml-2">
                        Loading portfolio data...
                    </span>
                    <span v-else class="text-xs text-text-secondary italic ml-2">
                        (Portfolio PDF generation available after completing events with project submissions)
                    </span>
                 </div>
            </div>

            <!-- Use the ProfileViewContent component -->
            <ProfileViewContent v-if="targetUserId" :user-id="targetUserId" :is-current-user="isCurrentUser">
                <!-- Slot for content specific to the current user's profile -->
                <template #additional-content v-if="isCurrentUser">
                    <AuthGuard>
                        <!-- Event Requests Card -->
                         <div class="bg-surface shadow-lg rounded-lg overflow-hidden border border-border">
                             <div class="px-4 py-3 sm:px-6 bg-secondary border-b border-secondary-dark">
                                <h3 class="text-base font-semibold text-text-primary flex items-center">
                                   <i class="fas fa-paper-plane mr-2 text-primary"></i>My Event Requests
                                </h3>
                            </div>
                            <div class="p-0">
                                <UserRequests />
                            </div>
                        </div>
                    </AuthGuard>
                </template>
            </ProfileViewContent>

            <!-- Fallback if targetUserId couldn't be determined -->
             <div v-else class="text-center text-text-secondary py-10">
                Could not determine user profile to display.
            </div>
        </template>
    </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useStore } from 'vuex';
import { useRoute, useRouter } from 'vue-router';
import { db } from '../firebase';
import { collection, query, where, getDocs, orderBy, doc, getDoc } from 'firebase/firestore';

// Import Components
import ProfileViewContent from '../components/ProfileViewContent.vue';
import PortfolioGeneratorButton from '../components/PortfolioGeneratorButton.vue';
import UserRequests from '../components/UserRequests.vue';
import AuthGuard from '../components/AuthGuard.vue';

const store = useStore();
const route = useRoute();
const router = useRouter(); // Added useRouter for potential navigation

// --- State ---
const targetUserId = ref(null);
const isCurrentUser = ref(false);
const isAdminProfile = ref(false); // To handle showing the admin message

// Portfolio-specific state (only relevant if isCurrentUser is true)
const userProjectsForPortfolioButton = ref([]);
const loadingProjectsForPortfolio = ref(false); // Default to false, set true when fetching

// --- Computed Properties ---
const loggedInUserId = computed(() => store.state.user.uid);
const loggedInUserIsAdmin = computed(() => store.getters['user/isAdmin']);

// Computed property for portfolio button data (depends on store data)
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

// Fetch projects specifically for the portfolio button
const fetchUserProjectsForPortfolio = async () => {
    if (!loggedInUserId.value) return; // Need logged-in user ID

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

// Determine profile context based on route and auth state
const determineProfileContext = async () => {
    const routeUserId = route.params.userId;
    const currentLoggedInUserId = loggedInUserId.value;

    isAdminProfile.value = false; // Reset admin flag

    if (routeUserId) {
        // Public profile view
        targetUserId.value = routeUserId;
        isCurrentUser.value = routeUserId === currentLoggedInUserId;

        // Check if the target public profile is an admin
        try {
            const userDocRef = doc(db, 'users', routeUserId);
            const userDocSnap = await getDoc(userDocRef);
            if (userDocSnap.exists() && userDocSnap.data().role === 'Admin') {
                isAdminProfile.value = true;
            }
        } catch (error) {
            console.error("Error checking if target user is admin:", error);
            // Decide how to handle error - maybe show profile anyway or an error message
        }

    } else if (currentLoggedInUserId) {
        // Current user's profile view (route has no userId)
        targetUserId.value = currentLoggedInUserId;
        isCurrentUser.value = true;
        isAdminProfile.value = loggedInUserIsAdmin.value; // Show admin message if logged-in user is admin

        // Fetch projects for portfolio button only when viewing own profile
        if (!isAdminProfile.value) { // Don't fetch for admins
             fetchUserProjectsForPortfolio();
        } else {
             loadingProjectsForPortfolio.value = false; // Ensure loading stops for admin
             userProjectsForPortfolioButton.value = []; // Clear projects for admin
        }

    } else {
        // No route user ID and no logged-in user ID - cannot determine profile
        targetUserId.value = null;
        isCurrentUser.value = false;
        console.warn("Cannot determine profile: No route parameter and user not logged in.");
        // Optionally redirect to login or show an error message
        // router.push({ name: 'Login' });
    }
};

// --- Watchers ---

// Watch route changes to update profile context
watch(() => route.params.userId, determineProfileContext, { immediate: true });

// Watch login status changes
watch(loggedInUserId, (newUid, oldUid) => {
    // Re-determine context if login status changes significantly
    if ((!oldUid && newUid) || (oldUid && !newUid)) {
        determineProfileContext();
    } else if (newUid && route.params.userId === newUid) {
        // If user logs in while viewing their own public profile, update context
        determineProfileContext();
    }
});

// --- Lifecycle Hooks ---
onMounted(() => {
    determineProfileContext(); // Initial determination
});

</script>

<style scoped>
/* Add component-specific styles here if needed */
</style>
