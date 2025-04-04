// /src/views/UserProfile.vue
<template>
    <!-- Use theme background, adjust padding -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 bg-secondary-light min-h-[calc(100vh-8rem)]">
        <!-- Admin View: Refined styling -->
        <div v-if="isAdmin" class="bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-4 rounded-md shadow-sm">
            <h3 class="text-lg font-semibold flex items-center mb-1"><i class="fas fa-user-shield mr-2"></i>Admin Account</h3>
            <p class="text-sm mb-0">Admin accounts do not have personal profiles. Access admin tools via the main navigation.</p>
        </div>

        <!-- Standard User View -->
        <template v-else>
            <!-- Header: Improved spacing and alignment -->
            <div class="flex flex-wrap justify-between items-center gap-4 mb-8 pb-4 border-b border-secondary">
                <h2 class="text-3xl font-bold text-gray-800">My Profile</h2>
                <!-- Portfolio Button Area -->
                <div class="flex items-center">
                    <PortfolioGeneratorButton
                        v-if="user && userProjectsForPortfolio.length > 0"
                        :user="userForPortfolio"
                        :projects="userProjectsForPortfolio" />
                    <span v-else-if="user" class="text-xs text-gray-500 italic ml-2">
                        (Portfolio PDF generation available after completing events with project submissions)
                    </span>
                 </div>
            </div>

            <!-- Loading / No User Data State: Enhanced styling -->
            <div v-if="loading || !user" class="flex flex-col items-center justify-center py-16 text-gray-500">
                <div v-if="loading">
                    <svg class="animate-spin h-10 w-10 text-primary mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                       <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                       <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                   </svg>
                   <p>Loading profile data...</p>
                </div>
                <p v-else class="text-center">
                    <i class="fas fa-exclamation-circle text-2xl text-red-400 mb-2"></i><br/>
                    User profile data could not be loaded. Please try again later.
                </p>
            </div>

            <!-- Profile Grid -->
            <div v-else class="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
                <!-- Left Column: Profile Info Card - Enhanced -->
                 <div class="lg:col-span-1">
                    <div class="bg-white shadow-lg rounded-lg p-5 sm:p-6 text-center h-full flex flex-col border border-secondary">
                        <!-- Profile Photo: Added border -->
                        <div class="mb-4">
                            <img :src="user.photoURL || defaultAvatarUrl"
                                 :alt="user.name || 'Profile Photo'"
                                 class="w-28 h-28 sm:w-36 sm:h-36 mx-auto rounded-full object-cover shadow-md border-4 border-white ring-2 ring-primary-light"
                                 @error="handleImageError">
                        </div>
                        <h2 class="text-2xl font-bold text-gray-800 mb-5">{{ user.name || 'My Profile' }}</h2>

                        <!-- Quick Stats: Enhanced styling -->
                         <div class="grid grid-cols-3 gap-3 mb-6">
                            <div class="bg-secondary border border-secondary-dark rounded-lg p-3 shadow-sm">
                                <div class="text-2xl font-bold text-primary">{{ stats.participatedCount }}</div>
                                <small class="text-xs text-gray-600 block font-medium uppercase tracking-wider">Participated</small>
                            </div>
                            <div class="bg-secondary border border-secondary-dark rounded-lg p-3 shadow-sm">
                                <div class="text-2xl font-bold text-primary">{{ stats.organizedCount }}</div>
                                <small class="text-xs text-gray-600 block font-medium uppercase tracking-wider">Organized</small>
                            </div>
                            <div class="bg-secondary border border-secondary-dark rounded-lg p-3 shadow-sm">
                                <div class="text-2xl font-bold text-yellow-500">{{ stats.wonCount }}</div>
                                <small class="text-xs text-gray-600 block font-medium uppercase tracking-wider">Won</small>
                            </div>
                        </div>

                        <!-- Total XP: Enhanced styling -->
                        <div class="mb-6">
                            <h3 class="text-sm font-semibold text-gray-500 flex items-center justify-center mb-1">
                               <i class="fas fa-star mr-1.5 text-yellow-400"></i>Total XP Earned
                            </h3>
                            <div class="text-4xl font-bold text-gray-900">{{ currentUserTotalXp }}</div>
                        </div>

                        <!-- Skills & Roles: Enhanced with themed pills -->
                         <div class="text-left mt-auto pt-5 border-t border-secondary space-y-4">
                             <div>
                                <h3 class="text-sm font-medium text-gray-700 mb-2 flex items-center">
                                   <i class="fas fa-cogs mr-2 text-gray-400 w-4 text-center"></i>Skills
                                </h3>
                                <div class="flex flex-wrap gap-1.5">
                                    <span v-if="user.skills?.length" 
                                          class="inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-gray-700 border border-secondary-dark shadow-sm"
                                          v-for="skill in user.skills" :key="skill">
                                            {{ skill }}
                                        </span>
                                    <span v-else class="text-xs text-gray-500 italic">No skills specified</span>
                                </div>
                            </div>

                            <div>
                                <h3 class="text-sm font-medium text-gray-700 mb-2 flex items-center">
                                   <i class="fas fa-user-tag mr-2 text-gray-400 w-4 text-center"></i>Preferred Roles
                                </h3>
                                <div class="flex flex-wrap gap-1.5">
                                    <span v-if="user.preferredRoles?.length" 
                                          class="inline-flex items-center rounded-full bg-primary-light bg-opacity-20 px-2.5 py-0.5 text-xs font-medium text-primary-dark border border-primary-light shadow-sm"
                                          v-for="role in user.preferredRoles" :key="role">
                                            {{ role }}
                                        </span>
                                    <span v-else class="text-xs text-gray-500 italic">No preferred roles specified</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Right Column: XP, Projects, Requests -->
                <div class="lg:col-span-2 space-y-6">
                    <!-- XP Breakdown Card: Enhanced Styling -->
                    <div class="bg-white shadow-lg rounded-lg overflow-hidden border border-secondary" v-if="hasXpData">
                        <div class="px-4 py-3 sm:px-6 bg-secondary border-b border-secondary-dark">
                            <h3 class="text-base font-semibold text-gray-800 flex items-center">
                               <i class="fas fa-chart-pie mr-2 text-primary"></i>XP Breakdown by Role
                            </h3>
                        </div>
                        <div class="p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
                            <div v-for="(xp, role) in user.xpByRole" :key="role">
                                <div v-if="xp > 0">
                                    <div class="flex justify-between items-center mb-1.5">
                                        <span class="text-sm font-medium text-gray-700">{{ formatRoleName(role) }}</span>
                                        <span class="inline-flex items-center rounded-full bg-primary-light bg-opacity-20 px-2 py-0.5 text-xs font-medium text-primary-dark border border-primary-light">{{ xp }} XP</span>
                                    </div>
                                    <!-- Progress Bar: Use primary color -->
                                    <div class="w-full bg-secondary rounded-full h-2 overflow-hidden border border-secondary-dark">
                                        <div class="bg-primary h-2 rounded-full transition-all duration-500 ease-out" :style="{ width: xpPercentage(xp) + '%' }"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div v-else class="bg-white shadow rounded-lg p-4 text-center text-sm text-gray-500 border border-secondary">
                        Participate in events to start earning XP!
                    </div>

                    <!-- Event Projects: Enhanced Styling -->
                    <div class="bg-white shadow-lg rounded-lg overflow-hidden border border-secondary">
                         <div class="flex justify-between items-center px-4 py-3 sm:px-6 bg-secondary border-b border-secondary-dark">
                            <h3 class="text-base font-semibold text-gray-800 flex items-center">
                               <i class="fas fa-lightbulb mr-2 text-green-500"></i>My Event Projects
                            </h3>
                            <span class="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700 border border-gray-200">{{ userProjects.length }} Projects</span>
                        </div>
                        <div class="p-4 sm:p-6">
                            <div v-if="loadingProjects" class="flex items-center justify-center py-5">
                                <svg class="animate-spin h-5 w-5 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                   <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                               </svg>
                                <span class="ml-2 text-sm text-gray-500">Loading projects...</span>
                            </div>
                            <div v-else-if="userProjects.length === 0" class="text-center py-5 text-sm text-gray-500 italic">
                                No projects submitted yet. Join an event and showcase your work!
                            </div>
                             <!-- Project List: Improved item styling -->
                             <ul v-else class="divide-y divide-secondary -my-4">
                                <li v-for="project in userProjects" :key="project.eventId + '-' + project.projectName"
                                     class="py-4 space-y-1.5">
                                    <h4 class="text-sm font-semibold text-gray-800">{{ project.projectName }}</h4>
                                    <p class="text-xs text-gray-500">
                                        <span class="inline-flex items-center mr-3">
                                            <i class="fas fa-calendar-alt mr-1"></i> Event: <span class="font-medium ml-1">{{ project.eventName }}</span> ({{ project.eventType }})
                                        </span>
                                        <span v-if="project.teamName" class="inline-flex items-center">
                                            <i class="fas fa-users mr-1"></i> Team: <span class="font-medium ml-1">{{ project.teamName }}</span>
                                        </span>
                                    </p>
                                    <p v-if="project.description" class="text-sm text-gray-600 italic">"{{ project.description }}"</p>
                                    <!-- Styled Link Button -->
                                    <a v-if="project.link" :href="project.link" target="_blank" rel="noopener noreferrer"
                                       class="inline-flex items-center rounded-md border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 shadow-sm hover:bg-secondary-light focus:outline-none focus:ring-1 focus:ring-primary-light transition-colors">
                                        <i class="fas fa-external-link-alt mr-1.5 h-3 w-3"></i> View Project
                                    </a>
                                </li>
                            </ul>
                        </div>
                    </div>

                    <!-- Event Requests: Enhanced Card -->
                     <div class="bg-white shadow-lg rounded-lg overflow-hidden border border-secondary">
                         <div class="px-4 py-3 sm:px-6 bg-secondary border-b border-secondary-dark">
                            <h3 class="text-base font-semibold text-gray-800 flex items-center">
                               <i class="fas fa-paper-plane mr-2 text-cyan-500"></i>My Event Requests
                            </h3>
                        </div>
                        <!-- Remove default padding, UserRequests should handle its own internal padding -->
                        <div class="p-0">
                            <UserRequests />
                        </div>
                    </div>
                </div>
            </div>
        </template>
    </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useStore } from 'vuex';
import { useRouter } from 'vue-router';
import { db } from '../firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import PortfolioGeneratorButton from '../components/PortfolioGeneratorButton.vue';
import UserRequests from '../components/UserRequests.vue';

const defaultAvatarUrl = new URL('../assets/default-avatar.png', import.meta.url).href;

const store = useStore();
const router = useRouter();

const userProjects = ref([]);
const stats = ref({
    participatedCount: 0,
    organizedCount: 0,
    wonCount: 0
});
const loading = ref(!store.getters['user/hasFetchedUserData']); // Initialize based on store state
const loadingProjects = ref(true);

const user = computed(() => store.getters['user/getUser']);
const isAdmin = computed(() => store.getters['user/isAdmin']);
const isAuthenticated = computed(() => store.getters['user/isAuthenticated']);
const currentUserTotalXp = computed(() => store.getters['user/currentUserTotalXp']);
const hasFetchedUserData = computed(() => store.getters['user/hasFetchedUserData']);

const hasXpData = computed(() => currentUserTotalXp.value > 0 && user.value?.xpByRole && Object.values(user.value.xpByRole).some(xp => xp > 0));

const userForPortfolio = computed(() => {
    if (!user.value) return {};
    return {
        name: user.value.name,
        uid: user.value.uid,
        skills: user.value.skills || [],
        preferredRoles: user.value.preferredRoles || [],
        xpByRole: user.value.xpByRole || {},
        totalXp: currentUserTotalXp.value
    };
});

const userProjectsForPortfolio = computed(() => {
    return userProjects.value;
});

const handleImageError = (e) => {
    e.target.src = defaultAvatarUrl;
};

const formatRoleName = (roleKey) => {
    if (!roleKey) return '';
    // Improved formatting for keys like 'fullstack' or 'problemSolver'
    const words = roleKey.replace(/([A-Z])/g, ' $1').split(/ |(?=[A-Z])/);
    return words.map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
};

const xpPercentage = (xp) => {
  const total = currentUserTotalXp.value;
  return total > 0 ? Math.min(100, (xp / total * 100)) : 0; // Ensure max 100%
};

// --- Data Fetching ---
const fetchProfileData = async () => {
    if (!isAuthenticated.value || isAdmin.value) {
        loading.value = false;
        return; // No profile needed for admin or unauthenticated
    }

    // If data is already fetched by initial auth check, don't refetch immediately
    if (hasFetchedUserData.value) {
        loading.value = false;
    } else {
        loading.value = true;
        try {
            await store.dispatch('user/fetchUserData');
        } catch (error) {
            console.error("Error fetching user data on profile mount:", error);
        } finally {
            loading.value = false;
        }
    }
    // Always fetch projects regardless of user data fetch status
    await fetchUserProjects();
     // Fetch stats after user data is available
     if (user.value?.uid) {
         await fetchUserStats(user.value.uid);
     }
};

const fetchUserProjects = async () => {
    if (!user.value?.uid) return;
    loadingProjects.value = true;
    try {
        const submissionsQuery = query(
            collection(db, 'submissions'), 
            where('userId', '==', user.value.uid),
            orderBy('submittedAt', 'desc') // Fetch newest first
        );
        const snapshot = await getDocs(submissionsQuery);
        
        const projects = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        // TODO: Fetch corresponding event names/types efficiently if needed
        // For now, we might only have eventId in submission data.
        // A Vuex action could handle batch fetching event details.
        // Placeholder: Assuming project data might already contain eventName/eventType
        userProjects.value = projects.map(p => ({
            ...p,
            eventName: p.eventName || `Event (${p.eventId.substring(0, 5)}...)`, // Placeholder name
            eventType: p.eventType || 'Unknown'
        }));

    } catch (error) {
        console.error("Error fetching user projects:", error);
    } finally {
        loadingProjects.value = false;
    }
};

const fetchUserStats = async (userId) => {
     // This is a placeholder. Ideally, these stats would be pre-calculated 
     // or efficiently queried. Fetching all events/ratings here is inefficient.
     // Example: Assume stats are part of the user document or a separate stats doc.
     stats.value = {
         participatedCount: user.value?.eventsParticipated?.length || 0, // Example if stored on user doc
         organizedCount: user.value?.eventsOrganized?.length || 0,
         wonCount: user.value?.eventsWon?.length || 0
     };
};

onMounted(() => {
    fetchProfileData();
});

// Re-fetch if user ID changes (e.g., after login)
watch(() => user.value?.uid, (newUid, oldUid) => {
    if (newUid && newUid !== oldUid) {
        fetchProfileData();
    }
});

</script>

<style scoped>
/* Add component-specific styles here if needed */
</style>


