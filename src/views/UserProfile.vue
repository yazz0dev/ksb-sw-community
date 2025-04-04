// /src/views/UserProfile.vue
<template>
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6"> <!-- Container -->
        <!-- Admin View -->
        <div v-if="isAdmin" class="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-md">
            <h3 class="text-base font-semibold flex items-center mb-1"><i class="fas fa-user-shield mr-2"></i>Admin Account</h3>
            <p class="text-sm mb-0">Admin accounts do not have personal profiles. Use admin tools via navigation.</p>
        </div>
        
        <!-- Standard User View -->
        <template v-else>
            <!-- Header -->
            <div class="flex flex-wrap justify-between items-center gap-4 mb-8"> 
                <h2 class="text-2xl font-bold text-gray-900">My Profile</h2>
                <PortfolioGeneratorButton
                    v-if="user && userProjectsForPortfolio.length > 0"
                    :user="userForPortfolio"
                    :projects="userProjectsForPortfolio" /> 
                <span v-else-if="user" class="text-sm text-gray-500">
                    (Portfolio PDF available after completing events with project submissions)
                </span>
            </div>

            <!-- Loading / No User Data State -->
            <div v-if="loading || !user" class="flex justify-center py-10"> 
                <div v-if="loading">
                    <svg class="animate-spin h-10 w-10 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                       <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                       <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                   </svg>
                </div>
                <p v-else class="text-gray-500">User profile data could not be loaded.</p>
            </div>

            <!-- Profile Grid -->
            <div v-else class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <!-- Left Column: Profile Info -->
                 <div class="lg:col-span-1">
                    <div class="bg-white shadow rounded-lg p-4 sm:p-6 text-center h-full flex flex-col">
                            <!-- Profile Photo -->
                        <div class="mb-4">
                                <img :src="user.photoURL || defaultAvatarUrl"
                                     :alt="user.name || 'Profile Photo'"
                                 class="w-24 h-24 sm:w-32 sm:h-32 mx-auto rounded-full object-cover shadow-md border-2 border-white ring-1 ring-gray-300"
                                     @error="handleImageError">
                            </div>
                        <h2 class="text-xl font-bold text-gray-900 mb-4">{{ user.name || 'My Profile' }}</h2>

                            <!-- Quick Stats -->
                         <div class="grid grid-cols-3 gap-2 mb-6">
                            <div class="bg-gray-50 border border-gray-200 rounded p-2">
                                <div class="text-lg font-bold text-blue-600">{{ stats.participatedCount }}</div>
                                <small class="text-xs text-gray-500 block">Participated</small>
                                    </div>
                            <div class="bg-gray-50 border border-gray-200 rounded p-2">
                                <div class="text-lg font-bold text-cyan-600">{{ stats.organizedCount }}</div>
                                <small class="text-xs text-gray-500 block">Organized</small>
                            </div>
                            <div class="bg-gray-50 border border-gray-200 rounded p-2">
                                <div class="text-lg font-bold text-yellow-500">{{ stats.wonCount }}</div>
                                <small class="text-xs text-gray-500 block">Won</small>
                            </div>
                        </div>

                        <!-- Total XP -->
                        <div class="mb-6">
                            <h3 class="text-sm font-medium text-gray-500 flex items-center justify-center mb-1">
                               <i class="fas fa-star mr-1 text-yellow-400"></i>Total XP
                            </h3>
                            <div class="text-3xl font-bold text-gray-900">{{ currentUserTotalXp }}</div>
                            </div>

                            <!-- Skills & Roles -->
                         <div class="text-left mt-auto pt-4 border-t border-gray-200">
                            <h3 class="text-sm font-medium text-gray-700 mb-2 flex items-center">
                               <i class="fas fa-cogs mr-2 text-gray-400"></i>Skills
                            </h3>
                            <div class="flex flex-wrap gap-1 mb-4">
                                <span v-if="user.skills?.length" 
                                      class="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800" 
                                          v-for="skill in user.skills" :key="skill">
                                        {{ skill }}
                                    </span>
                                <span v-else class="text-xs text-gray-500 italic">Not specified</span>
                                </div>

                            <h3 class="text-sm font-medium text-gray-700 mb-2 flex items-center">
                               <i class="fas fa-user-tag mr-2 text-gray-400"></i>Preferred Roles
                            </h3>
                            <div class="flex flex-wrap gap-1">
                                <span v-if="user.preferredRoles?.length" 
                                      class="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800" 
                                          v-for="role in user.preferredRoles" :key="role">
                                        {{ role }}
                                    </span>
                                <span v-else class="text-xs text-gray-500 italic">Not specified</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Right Column: XP, Projects, Requests -->
                <div class="lg:col-span-2 space-y-6">
                    <!-- XP Breakdown Card -->
                    <div class="bg-white shadow rounded-lg overflow-hidden" v-if="hasXpData">
                        <div class="px-4 py-3 bg-gray-50 border-b border-gray-200">
                            <h3 class="text-base font-semibold text-gray-900 flex items-center">
                               <i class="fas fa-chart-pie mr-2 text-blue-500"></i>XP Breakdown
                            </h3>
                        </div>
                        <div class="p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                            <div v-for="(xp, role) in user.xpByRole" :key="role">
                                    <div v-if="xp > 0">
                                    <div class="flex justify-between items-center mb-1">
                                        <span class="text-sm font-medium text-gray-700">{{ formatRoleName(role) }}</span>
                                        <span class="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">{{ xp }} XP</span>
                                        </div>
                                    <div class="w-full bg-gray-200 rounded-full h-1.5">
                                        <div class="bg-blue-600 h-1.5 rounded-full" :style="{ width: xpPercentage(xp) + '%' }" ></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Event Projects -->
                    <div class="bg-white shadow rounded-lg overflow-hidden">
                         <div class="flex justify-between items-center px-4 py-3 bg-gray-50 border-b border-gray-200">
                            <h3 class="text-base font-semibold text-gray-900 flex items-center">
                               <i class="fas fa-lightbulb mr-2 text-green-500"></i>My Event Projects
                            </h3>
                            <span class="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800">{{ userProjects.length }} Projects</span>
                        </div>
                        <div class="p-4 sm:p-6">
                            <div v-if="loadingProjects" class="flex justify-center py-3">
                                <svg class="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                   <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                               </svg>
                                <span class="ml-2 text-sm text-gray-500">Loading projects...</span>
                            </div>
                            <div v-else-if="userProjects.length === 0" class="text-center py-3 text-sm text-gray-500">
                                No projects submitted yet. Participate in events!
                            </div>
                             <ul v-else class="divide-y divide-gray-200 -my-4">
                                <li v-for="project in userProjects" :key="project.eventId + '-' + project.projectName"
                                     class="py-4">
                                    <h4 class="text-sm font-semibold text-gray-800 mb-1">{{ project.projectName }}</h4>
                                    <p class="text-xs text-gray-500 mb-1">
                                        <i class="fas fa-calendar-alt mr-1"></i> Event: {{ project.eventName }} ({{ project.eventType }})
                                        <span v-if="project.teamName" class="ml-2">
                                            <i class="fas fa-users mr-1"></i> {{ project.teamName }}
                                        </span>
                                    </p>
                                    <p v-if="project.description" class="text-sm text-gray-600 italic mb-2">{{ project.description }}</p>
                                    <a v-if="project.link" :href="project.link" target="_blank" rel="noopener noreferrer"
                                       class="inline-flex items-center rounded border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 mt-1">
                                        <i class="fas fa-external-link-alt mr-1 h-3 w-3"></i> View Project
                                    </a>
                                </li>
                            </ul>
                        </div>
                    </div>

                    <!-- Event Requests -->
                     <div class="bg-white shadow rounded-lg overflow-hidden">
                         <div class="px-4 py-3 bg-gray-50 border-b border-gray-200">
                            <h3 class="text-base font-semibold text-gray-900 flex items-center">
                               <i class="fas fa-paper-plane mr-2 text-cyan-500"></i>My Event Requests
                            </h3>
                        </div>
                        <div class="p-0 sm:p-0"> <!-- Remove padding as UserRequests might have its own -->
                             <!-- UserRequests component is already refactored -->
                            <UserRequests />
                        </div>
                    </div>
                </div>
            </div>
        </template>
    </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'; // Added onMounted
import { useStore } from 'vuex';
import { useRouter } from 'vue-router';
import { db } from '../firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore'; // Added orderBy
import PortfolioGeneratorButton from '../components/PortfolioGeneratorButton.vue';
import UserRequests from '../components/UserRequests.vue';

// Use new URL pattern for asset handling
const defaultAvatarUrl = new URL('../assets/default-avatar.png', import.meta.url).href;

const store = useStore();
const router = useRouter(); // Although not used directly, good practice to keep if needed

const userProjects = ref([]);
const stats = ref({
    participatedCount: 0,
    organizedCount: 0,
    wonCount: 0
});
const loading = ref(false); // Set initial loading based on Vuex state
const loadingProjects = ref(true); // Separate loading for projects

// --- Vuex State Access --- 
// Use computed properties to react to store changes
const user = computed(() => store.getters['user/getUser']);
const isAdmin = computed(() => store.getters['user/isAdmin']);
const isAuthenticated = computed(() => store.getters['user/isAuthenticated']);
const currentUserTotalXp = computed(() => store.getters['user/currentUserTotalXp']);
const hasFetchedUserData = computed(() => store.getters['user/hasFetchedUserData']);

// --- Computed Properties --- 
const hasXpData = computed(() => currentUserTotalXp.value > 0 && Object.keys(user.value?.xpByRole || {}).some(key => user.value.xpByRole[key] > 0));

// For Portfolio Button
const userForPortfolio = computed(() => {
    if (!user.value) return {};
    // Pass only necessary, non-sensitive data
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
    // Format projects if needed for the PDF generator component
    return userProjects.value;
});

// --- Methods --- 
const handleImageError = (e) => {
    e.target.src = defaultAvatarUrl;
};

const formatRoleName = (roleKey) => {
    if (!roleKey) return '';
    return roleKey
        .replace(/([A-Z])/g, ' $1') // Add space before caps
        .replace(/^./, str => str.toUpperCase()); // Capitalize first letter
};

// Calculate percentage for progress bar (ensure totalXp is not zero)
const xpPercentage = (xp) => {
  return currentUserTotalXp.value > 0 ? (xp / currentUserTotalXp.value * 100) : 0;
};

// --- Data Fetching --- 
const fetchUserEventData = async () => {
    if (!user.value?.uid || isAdmin.value) return; // Don't fetch for admin or if no UID

    loadingProjects.value = true;
    // Reset stats before fetching
    stats.value = { participatedCount: 0, organizedCount: 0, wonCount: 0 };
    const fetchedProjects = [];
    
    try {
        const eventsRef = collection(db, 'events');
        // Query needed depends on what data needs to be aggregated
        // Option 1: Query events where user is participant OR organizer OR team member
        // This might require multiple queries or a more complex data structure
        
        // Option 2: Simpler - query all completed events and filter client-side (less efficient for many events)
         const q = query(eventsRef, where('status', '==', 'Completed'), orderBy('endDate', 'desc'));
        const querySnapshot = await getDocs(q);

        let participated = 0;
        let organized = 0;
        let won = 0;

        querySnapshot.forEach((doc) => {
            const event = doc.data();
            const userId = user.value?.uid;
            const eventId = doc.id;
            let isParticipantInEvent = false;
            let isOrganizerInEvent = false;
            let isWinnerInEvent = false;
            let userSubmission = null;

            // Check if Organizer
            if (event.organizer === userId || event.coOrganizers?.includes(userId)) {
                isOrganizerInEvent = true;
            }

            // Check participation and project submission
            if (event.isTeamEvent) {
                const team = event.teams?.find(t => t.members?.includes(userId));
                if (team) {
                    isParticipantInEvent = true;
                    if (event.winners?.includes(team.teamName)) {
                         isWinnerInEvent = true;
                    }
                    if (team.submissions?.length) {
                        userSubmission = { ...team.submissions[0], teamName: team.teamName };
                    }
                }
            } else {
                if (event.participants?.includes(userId)) {
                    isParticipantInEvent = true;
                    if (event.winners?.includes(userId)) {
                         isWinnerInEvent = true;
                    }
                userSubmission = event.submissions?.find(sub => sub.participantId === userId);
                }
            }
            
             // Update counts only if user was involved
             if (isParticipantInEvent || isOrganizerInEvent) {
                 if (isParticipantInEvent) participated++;
                 if (isOrganizerInEvent) organized++;
                 if (isWinnerInEvent) won++;
             }

            // Add project if found
            if (userSubmission) {
                fetchedProjects.push({
                    eventId,
                    eventName: event.eventName,
                    eventType: event.eventType,
                    ...userSubmission
                });
            }
        });

        userProjects.value = fetchedProjects.sort((a, b) => (a.eventName || '').localeCompare(b.eventName || ''));
        stats.value = { participatedCount: participated, organizedCount: organized, wonCount: won };

    } catch (error) {
        console.error("Error fetching user event projects/stats:", error);
        // Handle error display if needed
    } finally {
        loadingProjects.value = false;
    }
};

// --- Watchers & Lifecycle --- 

// Watch for initial user data fetch completion
watch(hasFetchedUserData, (newValue) => {
    if (newValue) {
        loading.value = false; // Stop main loading once user data is available
        // Fetch event-related data only after user is loaded and is not admin
         if (user.value && !isAdmin.value) {
             fetchUserEventData();
         }
    }
}, { immediate: true }); // Check immediately on component load

// Optional: If user data might change while profile is open (e.g., role change), watch user itself
// watch(user, (newUser) => {
//     if (newUser && !isAdmin.value) {
//         fetchUserEventData();
//     }
// }, { deep: true });

onMounted(() => {
    // Initial fetch might be triggered by the watcher above
    // If Vuex doesn't guarantee immediate state availability, trigger fetch here too
    if (!hasFetchedUserData.value && isAuthenticated.value) {
        // Optional: Dispatch fetchUserData again if needed, though App.vue should handle it
        // store.dispatch('user/fetchUserData', store.getters['user/getUser']?.uid);
         loading.value = true; // Ensure loading is true if we trigger manual fetch
    } else if (hasFetchedUserData.value) {
         loading.value = false; // Already loaded
         if(user.value && !isAdmin.value) {
            fetchUserEventData(); // Fetch event data if user loaded & not admin
         }
    }
     // If not authenticated, loading should stop, potentially show login prompt (handled by router guards mostly)
     else if (!isAuthenticated.value) {
         loading.value = false;
     }
});

</script>

<!-- <style scoped>
/* Styles removed */
</style> -->
