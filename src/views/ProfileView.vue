<template>
  <CBox maxW="7xl" mx="auto" p={{ base: '4', sm: '6', lg: '8' }} bg="background" minH="calc(100vh - 8rem)">
    <!-- Back Button -->
    <CBox v-if="!isCurrentUser" mb="6">
      <CButton
        leftIcon={<CIcon name="fa-arrow-left" />}
        variant="outline"
        size="sm"
        onClick={() => $router.back()}
      >
        Back
      </CButton>
    </CBox>

    <!-- Admin View -->
    <CAlert v-if="isAdminProfile" status="info" variant="left-accent">
      <CFlex align="center">
        <CIcon name="fa-user-shield" mr="2" />
        <CBox>
          <CHeading size="md" mb="1">Admin Account</CHeading>
          <CText>Admin accounts do not have personal profiles. Access admin tools via the main navigation.</CText>
        </CBox>
      </CFlex>
    </CAlert>

    <!-- Standard User View -->
    <template v-else>
      <!-- Header -->
      <CFlex v-if="isCurrentUser" wrap="wrap" justify="space-between" align="center" gap="4" mb="8" pb="4" borderBottomWidth="1px" borderColor="border">
        <CHeading as="h2" size="xl" color="text-primary">My Profile</CHeading>
        <!-- Portfolio Button Area -->
        <CFlex align="center">
          <PortfolioGeneratorButton
            v-if="!loadingProjectsForPortfolio && userProjectsForPortfolio.length > 0"
            :user="userForPortfolio"
            :projects="userProjectsForPortfolio"
          />
          <CText v-else-if="loadingProjectsForPortfolio" fontSize="xs" color="text-secondary" fontStyle="italic" ml="2">
            Loading portfolio data...
          </CText>
          <CText v-else fontSize="xs" color="text-secondary" fontStyle="italic" ml="2">
            (Portfolio PDF generation available after completing events with project submissions)
          </CText>
        </CFlex>
      </CFlex>

      <!-- Profile Content -->
      <ProfileViewContent v-if="targetUserId" :user-id="targetUserId" :is-current-user="isCurrentUser">
        <template #additional-content v-if="isCurrentUser">
          <AuthGuard>
            <CCard variant="outline" shadow="lg">
              <CCardHeader bg="secondary" borderBottomWidth="1px" borderColor="secondary-dark">
                <CFlex align="center">
                  <CIcon name="fa-paper-plane" color="primary" mr="2" />
                  <CHeading size="md" color="text-primary">My Event Requests</CHeading>
                </CFlex>
              </CCardHeader>
              <UserRequests />
            </CCard>
          </AuthGuard>
        </template>
      </ProfileViewContent>

      <!-- Fallback -->
      <CText v-else textAlign="center" color="text-secondary" py="10">
        Could not determine user profile to display.
      </CText>
    </template>
  </CBox>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useStore } from 'vuex';
import { useRoute, useRouter } from 'vue-router';
import { db } from '../firebase';
import { collection, query, where, getDocs, orderBy, doc, getDoc } from 'firebase/firestore';

import {
  Box as CBox,
  Flex as CFlex,
  Heading as CHeading,
  Text as CText,
  Button as CButton,
  Card as CCard,
  CardHeader as CCardHeader,
  Alert as CAlert,
  Icon as CIcon
} from '@chakra-ui/vue-next';

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
