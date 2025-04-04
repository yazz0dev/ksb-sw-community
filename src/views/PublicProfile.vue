// src/views/PublicProfile.vue
<template>
    <!-- Use theme background, adjust padding -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 bg-secondary-light min-h-[calc(100vh-8rem)]">
        <!-- Back Button: Themed styling -->
        <div class="mb-6">
            <button
                class="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-light transition-colors"
                @click="$router.back()">
                <i class="fas fa-arrow-left mr-1.5 h-4 w-4"></i> Back
            </button>
        </div>

        <!-- Loading State: Enhanced -->
        <div v-if="loading" class="flex flex-col items-center justify-center py-16 text-gray-500">
             <svg class="animate-spin h-10 w-10 text-primary mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
             </svg>
             <p>Loading profile...</p>
        </div>
        <!-- Error/Not Found States: Enhanced -->
        <div v-else-if="errorMessage || !user" class="rounded-md bg-yellow-100 border-l-4 border-yellow-400 text-yellow-800 p-4 shadow-sm">
             <div class="flex">
                <div class="flex-shrink-0">
                    <i class="fas fa-exclamation-triangle text-yellow-500"></i>
                </div>
                <div class="ml-3">
                    <p class="text-sm font-medium">{{ errorMessage || 'User profile data not available.' }}</p>
                </div>
             </div>
        </div>
        <!-- Admin Profile State: Consistent styling -->
        <div v-else-if="user?.role === 'Admin'" class="bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-4 rounded-md shadow-sm">
             <div class="flex">
                <div class="flex-shrink-0">
                    <i class="fas fa-info-circle text-blue-500"></i>
                </div>
                <div class="ml-3">
                    <p class="text-sm font-medium">Administrator accounts do not have public profiles.</p>
                </div>
             </div>
        </div>

        <!-- Profile Content Grid: Consistent with UserProfile -->
        <div v-else class="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
            <!-- Left Column: Profile Info Card -->
            <div class="lg:col-span-1">
                <div class="bg-white shadow-lg rounded-lg p-5 sm:p-6 text-center h-full flex flex-col border border-secondary">
                    <!-- Profile Photo -->
                    <div class="mb-4">
                        <img :src="user.photoURL || defaultAvatarUrl"
                             :alt="user.name || 'Profile Photo'"
                             class="w-28 h-28 sm:w-36 sm:h-36 mx-auto rounded-full object-cover shadow-md border-4 border-white ring-2 ring-primary-light"
                             @error="handleImageError">
                    </div>
                    <h2 class="text-2xl font-bold text-gray-800 mb-5">{{ user.name || 'User Profile' }}</h2>

                    <!-- Quick Stats -->
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

                    <!-- Total XP -->
                    <div class="mb-6">
                        <h3 class="text-sm font-semibold text-gray-500 flex items-center justify-center mb-1">
                            <i class="fas fa-star mr-1.5 text-yellow-400"></i>Total XP Earned
                        </h3>
                        <div class="text-4xl font-bold text-gray-900">{{ totalXp }}</div>
                    </div>

                    <!-- Skills & Roles: Themed pills -->
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

            <!-- Right Column: XP & Events -->
            <div class="lg:col-span-2 space-y-6">
                <!-- XP Breakdown Card: Enhanced -->
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
                                <!-- Progress Bar -->
                                <div class="w-full bg-secondary rounded-full h-2 overflow-hidden border border-secondary-dark">
                                    <div class="bg-primary h-2 rounded-full transition-all duration-500 ease-out" :style="{ width: totalXp > 0 ? (xp / totalXp * 100) + '%' : '0%' }"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                 <div v-else class="bg-white shadow rounded-lg p-4 text-center text-sm text-gray-500 border border-secondary">
                    This user hasn't earned any XP yet.
                </div>

                <!-- Event History Card: Enhanced -->
                <div class="bg-white shadow-lg rounded-lg overflow-hidden border border-secondary">
                    <div class="flex justify-between items-center px-4 py-3 sm:px-6 bg-secondary border-b border-secondary-dark">
                        <h3 class="text-base font-semibold text-gray-800 flex items-center">
                           <i class="fas fa-history mr-2 text-green-500"></i>Event History
                        </h3>
                        <span class="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700 border border-gray-200">{{ participatedEvents.length }} Events</span>
                    </div>
                    <div class="p-4 sm:p-6">
                        <div v-if="loadingEvents" class="flex items-center justify-center py-5">
                            <svg class="animate-spin h-5 w-5 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                               <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                           </svg>
                            <span class="ml-2 text-sm text-gray-500">Loading event history...</span>
                        </div>
                        <div v-else-if="participatedEvents.length === 0" class="text-center py-5 text-sm text-gray-500 italic">
                            User has not participated in any recorded events yet.
                        </div>
                        <!-- Event List: Improved styling -->
                        <ul v-else class="divide-y divide-secondary -my-4">
                            <li v-for="event in participatedEvents" :key="event.id" class="py-4">
                                <div class="flex flex-wrap justify-between items-start gap-2">
                                    <div class="flex-1">
                                        <h4 class="text-sm font-semibold text-gray-800 mb-0.5">{{ event.eventName }}</h4>
                                        <p class="text-xs text-gray-500 flex items-center flex-wrap gap-x-3">
                                            <span class="inline-flex items-center"><i class="fas fa-calendar-alt mr-1 text-gray-400"></i> {{ formatDate(event.endDate) }}</span>
                                            <span class="inline-flex items-center"><i class="fas fa-tag mr-1 text-gray-400"></i> {{ event.eventType }}</span>
                                        </p>
                                    </div>
                                    <!-- Badges: Winner/Organizer -->
                                    <div class="flex space-x-1.5 flex-shrink-0 mt-1 sm:mt-0">
                                        <span v-if="event.isWinner" class="inline-flex items-center rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800 border border-yellow-200 shadow-sm">
                                            <i class="fas fa-trophy mr-1"></i> Winner
                                        </span>
                                        <span v-if="event.isOrganizer" class="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 border border-blue-200 shadow-sm">
                                            <i class="fas fa-star mr-1"></i> Organizer
                                        </span>
                                    </div>
                                </div>
                                <!-- Project Link: Consistent button styling -->
                                <div v-if="event.project" class="mt-2 pt-2 border-t border-secondary-light">
                                     <p class="text-xs text-gray-600 mb-1">
                                         <strong class="font-medium">Project Submission:</strong> {{ event.project.projectName }}
                                     </p>
                                    <a v-if="event.project.link" :href="event.project.link"
                                       target="_blank" rel="noopener noreferrer"
                                       class="inline-flex items-center rounded-md border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 shadow-sm hover:bg-secondary-light focus:outline-none focus:ring-1 focus:ring-primary-light transition-colors">
                                        <i class="fas fa-external-link-alt mr-1.5 h-3 w-3"></i> View Project
                                    </a>
                                </div>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { doc, getDoc, collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { useRoute } from 'vue-router';
import { DateTime } from 'luxon'; // Import Luxon

const defaultAvatarUrl = new URL('../assets/default-avatar.png', import.meta.url).href;

const route = useRoute();
const userId = ref(route.params.userId);

const user = ref(null);
const loading = ref(true);
const errorMessage = ref('');
const userProjects = ref([]); // Keep for potential future use if showing projects separately
const loadingProjects = ref(false); // Set to false if not loading separately
const participatedEvents = ref([]);
const loadingEvents = ref(true);

const stats = ref({
    participatedCount: 0,
    organizedCount: 0,
    wonCount: 0
});

const totalXp = computed(() => {
    if (!user.value?.xpByRole) return 0;
    return Object.values(user.value.xpByRole).reduce((sum, val) => sum + (Number(val) || 0), 0);
});

const hasXpData = computed(() => totalXp.value > 0 && user.value?.xpByRole && Object.values(user.value.xpByRole).some(xp => xp > 0));

const handleImageError = (e) => {
    e.target.src = defaultAvatarUrl;
};

const formatRoleName = (roleKey) => {
    if (!roleKey) return '';
    const words = roleKey.replace(/([A-Z])/g, ' $1').split(/ |(?=[A-Z])/);
    return words.map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
};

const formatDate = (dateInput) => {
    try {
        const dt = dateInput?.toDate ? DateTime.fromJSDate(dateInput.toDate()) : DateTime.fromISO(dateInput);
        return dt.isValid ? dt.toLocaleString(DateTime.DATE_MED) : 'Date N/A';
    } catch (e) {
        return 'Date N/A';
    }
};

// --- Data Fetching ---
const fetchPublicProfile = async () => {
    loading.value = true;
    loadingEvents.value = true;
    errorMessage.value = '';
    try {
        const userDocRef = doc(db, 'users', userId.value);
        const userDocSnap = await getDoc(userDocRef);

        if (!userDocSnap.exists()) {
            throw new Error('User profile not found.');
        }

        user.value = userDocSnap.data();

        // Reset stats before recalculating or fetching
        stats.value = { participatedCount: 0, organizedCount: 0, wonCount: 0 };

        // Fetch event participation details
        await fetchEventHistory(userId.value);

    } catch (error) {
        console.error("Error fetching public profile:", error);
        errorMessage.value = error.message || 'Failed to load profile.';
        user.value = null;
    } finally {
        loading.value = false;
    }
};

const fetchEventHistory = async (targetUserId) => {
    loadingEvents.value = true;
    try {
        const eventsRef = collection(db, 'events');
        // Fetch all events - This is inefficient. Ideally, participation info is stored differently.
        // For demo, we query all and filter. Replace with better query if possible.
        const q = query(eventsRef, orderBy('endDate', 'desc')); // Order by end date
        const querySnapshot = await getDocs(q);

        let participated = 0;
        let organized = 0;
        let won = 0;
        const eventsHistory = [];

        querySnapshot.forEach(docSnap => {
            const event = { id: docSnap.id, ...docSnap.data() };
            let isParticipant = false;
            let isOrganizerFlag = false;
            let isWinnerFlag = false;
            let projectSubmission = null;

            // Check Organizer
            if (event.requester === targetUserId || event.organizers?.includes(targetUserId)) {
                isOrganizerFlag = true;
            }

            // Check Participant & Winner
            if (event.isTeamEvent && Array.isArray(event.teams)) {
                const userTeam = event.teams.find(team => team.members?.includes(targetUserId));
                if (userTeam) {
                    isParticipant = true;
                    if (Array.isArray(event.winners) && event.winners.includes(userTeam.teamName)) {
                        isWinnerFlag = true;
                    }
                    // Find submission for this user's team (assuming one submission per team)
                     const teamSubmission = event.submissions?.find(sub => sub.teamId === userTeam.teamName);
                     if (teamSubmission) {
                        projectSubmission = teamSubmission; // Use submission object
                     }
                }
            } else if (Array.isArray(event.participants) && event.participants.includes(targetUserId)) {
                isParticipant = true;
                if (Array.isArray(event.winners) && event.winners.includes(targetUserId)) {
                    isWinnerFlag = true;
                }
                 // Find submission for this individual user
                 const userSubmission = event.submissions?.find(sub => sub.userId === targetUserId);
                 if (userSubmission) {
                    projectSubmission = userSubmission;
                 }
            }

            // If user was involved, update stats and add to history
            if (isParticipant || isOrganizerFlag) {
                if (isParticipant) participated++;
                if (isOrganizerFlag) organized++;
                if (isWinnerFlag) won++;

                eventsHistory.push({
                    id: event.id,
                    eventName: event.eventName,
                    eventType: event.eventType,
                    endDate: event.endDate,
                    isWinner: isWinnerFlag,
                    isOrganizer: isOrganizerFlag,
                    project: projectSubmission // Add project details if found
                });
            }
        });

        participatedEvents.value = eventsHistory;
        stats.value = { participatedCount: participated, organizedCount: organized, wonCount: won };

    } catch (error) {
        console.error("Error fetching event history:", error);
        // Handle error display if needed
    } finally {
        loadingEvents.value = false;
    }
};

onMounted(() => {
    fetchPublicProfile();
});

// Watch for route param changes if navigating between profiles
watch(() => route.params.userId, (newUserId) => {
    if (newUserId && newUserId !== userId.value) {
        userId.value = newUserId;
        fetchPublicProfile();
    }
});

</script>

<style scoped>
/* Add component-specific styles if needed */
</style>


