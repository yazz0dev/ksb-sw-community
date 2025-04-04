// src/views/PublicProfile.vue
<template>
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6"> <!-- Container -->
        <!-- Back Button -->
        <div class="mb-6">
            <button 
                class="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                @click="$router.back()">
                <i class="fas fa-arrow-left mr-1 h-3 w-3"></i> Back
            </button>
        </div>

        <!-- Loading State -->
        <div v-if="loading" class="flex justify-center py-10">
             <svg class="animate-spin h-10 w-10 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
             </svg>
        </div>
        <!-- Error State -->
        <div v-else-if="errorMessage" class="bg-yellow-50 border border-yellow-300 text-yellow-800 px-4 py-3 rounded-md text-sm">
            {{ errorMessage }}
        </div>
        <!-- No User Data State -->
        <div v-else-if="!user" class="bg-yellow-50 border border-yellow-300 text-yellow-800 px-4 py-3 rounded-md text-sm">
            User profile data not available.
        </div>
        <!-- Admin Profile State -->
        <div v-else-if="user?.role === 'Admin'" class="bg-blue-50 text-blue-700 px-4 py-3 rounded-md text-sm">
            Administrator accounts do not have public profiles.
        </div>
        
        <!-- Profile Content -->
        <div v-else class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <!-- Left Column: Profile Info -->
            <div class="lg:col-span-1">
                <div class="bg-white shadow rounded-lg p-4 sm:p-6 text-center h-full flex flex-col">
                    <!-- Profile Photo -->
                    <div class="mb-4">
                        <img :src="user.photoURL || defaultAvatarUrl" 
                             :alt="user.name || 'Profile Photo'"
                             class="w-24 h-24 sm:w-32 sm:h-32 mx-auto rounded-full object-cover shadow-md"
                             @error="handleImageError">
                    </div>
                    <h2 class="text-xl font-bold text-gray-900 mb-4">{{ user.name || 'User Profile' }}</h2>
                    
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
                        <div class="text-3xl font-bold text-gray-900">{{ totalXp }}</div>
                    </div>

                    <!-- Skills & Roles -->
                    <div class="text-left mt-auto pt-4 border-t border-gray-200"> <!-- Aligned left, push to bottom -->
                        <h3 class="text-sm font-medium text-gray-700 mb-2 flex items-center">
                            <i class="fas fa-cogs mr-2 text-gray-400"></i>Skills
                        </h3>
                        <div class="flex flex-wrap gap-1 mb-4">
                            <span v-if="user.skills?.length" 
                                  class="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800" 
                                  v-for="skill in user.skills" :key="skill">
                                {{ skill }}
                            </span>
                            <span v-else class="text-xs text-gray-500">Not specified</span>
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
                            <span v-else class="text-xs text-gray-500">Not specified</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Right Column: XP & Events -->
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
                                    <div class="bg-blue-600 h-1.5 rounded-full" :style="{ width: totalXp > 0 ? (xp / totalXp * 100) + '%' : '0%' }"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Events Participation -->
                <div class="bg-white shadow rounded-lg overflow-hidden">
                    <div class="flex justify-between items-center px-4 py-3 bg-gray-50 border-b border-gray-200">
                        <h3 class="text-base font-semibold text-gray-900 flex items-center">
                           <i class="fas fa-lightbulb mr-2 text-green-500"></i>Event History
                        </h3>
                        <span class="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800">{{ participatedEvents.length }} Events</span>
                    </div>
                    <div class="p-4 sm:p-6">
                        <div v-if="loadingEvents" class="flex justify-center py-3">
                            <svg class="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                               <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                           </svg>
                        </div>
                        <div v-else-if="participatedEvents.length === 0" class="text-center py-3 text-sm text-gray-500">
                            No events participated yet
                        </div>
                        <ul v-else class="divide-y divide-gray-200 -my-4">
                            <li v-for="event in participatedEvents" :key="event.id" class="py-4">
                                <div class="flex flex-wrap justify-between items-start gap-2">
                                    <div>
                                        <h4 class="text-sm font-semibold text-gray-800 mb-0.5">{{ event.eventName }}</h4>
                                        <p class="text-xs text-gray-500 mb-1 flex items-center flex-wrap gap-x-2">
                                            <span><i class="fas fa-calendar mr-1"></i> {{ formatDate(event.endDate) }}</span>
                                            <span class="hidden sm:inline">|</span>
                                            <span><i class="fas fa-tag mr-1"></i> {{ event.eventType }}</span>
                                        </p>
                                    </div>
                                    <div class="flex space-x-1 flex-shrink-0">
                                        <span v-if="event.isWinner" class="inline-flex items-center rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800">
                                            <i class="fas fa-trophy mr-1"></i> Winner
                                        </span>
                                        <span v-if="event.isOrganizer" class="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
                                            <i class="fas fa-star mr-1"></i> Organizer
                                        </span>
                                    </div>
                                </div>
                                <!-- Show project if available -->
                                <div v-if="event.project" class="mt-2 text-xs">
                                    <strong class="text-gray-600">Project:</strong> {{ event.project.projectName }}
                                    <a v-if="event.project.link" :href="event.project.link" 
                                       target="_blank" rel="noopener noreferrer"
                                       class="inline-flex items-center rounded border border-gray-300 bg-white px-2 py-0.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 ml-2">
                                        <i class="fas fa-external-link-alt mr-1 h-2.5 w-2.5"></i> View
                                    </a>
                                </div>
                            </li>
                        </ul>
                    </div>
                </div>

                <!-- Projects Section -->
                 <div class="bg-white shadow rounded-lg overflow-hidden">
                     <div class="px-4 py-3 bg-gray-50 border-b border-gray-200">
                        <h3 class="text-base font-semibold text-gray-900 flex items-center">
                           <i class="fas fa-paperclip mr-2 text-cyan-500"></i>Project Submissions
                        </h3>
                    </div>
                    <div class="p-4 sm:p-6">
                        <div v-if="loadingProjects" class="flex justify-center py-3">
                             <svg class="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                               <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                           </svg>
                        </div>
                        <div v-else-if="userProjects.length === 0" class="text-center py-3 text-sm text-gray-500">
                            No projects submitted yet
                        </div>
                         <ul v-else class="divide-y divide-gray-200 -my-4">
                            <li v-for="project in userProjects" :key="project.eventId" class="py-4">
                                <h4 class="text-sm font-semibold text-gray-800 mb-1">{{ project.projectName }}</h4>
                                <p class="text-xs text-gray-500 mb-1">
                                    Event: {{ project.eventName }} ({{ project.eventType }})
                                    <span v-if="project.teamName" class="ml-2">
                                        <i class="fas fa-users mr-1"></i> {{ project.teamName }}
                                    </span>
                                </p>
                                <p v-if="project.description" class="text-sm text-gray-700 mb-2">{{ project.description }}</p>
                                <a v-if="project.link" :href="project.link" target="_blank" rel="noopener noreferrer"
                                   class="inline-flex items-center rounded border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50">
                                    <i class="fas fa-external-link-alt mr-1 h-3 w-3"></i> View Project
                                </a>
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
import { useRoute } from 'vue-router'; // Import useRoute

// Use new URL pattern for asset handling
const defaultAvatarUrl = new URL('../assets/default-avatar.png', import.meta.url).href;

// Define props or get userId from route
// const props = defineProps({ userId: { type: String, required: true } });
const route = useRoute();
const userId = ref(route.params.userId);

const user = ref(null);
const loading = ref(true);
const errorMessage = ref('');
const userProjects = ref([]);
const loadingProjects = ref(true);
const participatedEvents = ref([]);
const loadingEvents = ref(true);

// Stats
const stats = ref({
    participatedCount: 0,
    organizedCount: 0,
    wonCount: 0
});

// Computed properties
const totalXp = computed(() => {
    if (!user.value?.xpByRole) return 0;
    return Object.values(user.value.xpByRole).reduce((sum, val) => sum + (Number(val) || 0), 0);
});

const hasXpData = computed(() => totalXp.value > 0 && Object.keys(user.value?.xpByRole || {}).some(key => user.value.xpByRole[key] > 0));

// Handlers
const handleImageError = (e) => {
    e.target.src = defaultAvatarUrl;
};

// Helpers
const formatRoleName = (roleKey) => {
    if (!roleKey) return '';
    return roleKey
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, (str) => str.toUpperCase());
};

const formatDate = (timestamp) => {
    if (!timestamp?.seconds) return 'N/A';
    // Use Luxon for better date formatting if available, otherwise fallback
    try {
        const { DateTime } = require("luxon");
        return DateTime.fromSeconds(timestamp.seconds).toLocaleString(DateTime.DATE_MED);
    } catch (e) {
        return new Date(timestamp.seconds * 1000).toLocaleDateString();
    }
};

// Fetch Function
async function fetchData(currentUserId) {
    if (!currentUserId) {
        errorMessage.value = "Invalid User ID.";
        loading.value = false;
        return;
    }

    loading.value = true;
    loadingEvents.value = true;
    loadingProjects.value = true;
    errorMessage.value = '';
    user.value = null; // Reset user data on new fetch
    participatedEvents.value = [];
    userProjects.value = [];
    stats.value = { participatedCount: 0, organizedCount: 0, wonCount: 0 };

    try {
        // 1. Fetch User Data
        const userDocRef = doc(db, 'users', currentUserId);
        const userDocSnap = await getDoc(userDocRef);

        if (!userDocSnap.exists()) {
            errorMessage.value = "User not found.";
            throw new Error("User not found");
        } 
        
        user.value = userDocSnap.data();

        if (user.value.role === 'Admin') {
             // Don't fetch events/projects for admin, message is shown in template
             loading.value = false;
             loadingEvents.value = false;
             loadingProjects.value = false;
             return; 
        }

        // 2. Fetch Events the User Participated In
        const eventsRef = collection(db, "events");
        // Query based on user being in participants map (more reliable than array-contains)
        const participatedEventsQuery = query(eventsRef, 
             where(`participants.${currentUserId}.uid`, '==', currentUserId),
             orderBy('endDate', 'desc') // Show most recent first
        );
        const participatedSnapshot = await getDocs(participatedEventsQuery);
        
        const eventsData = [];
        let organizedCount = 0;
        let wonCount = 0;

        participatedSnapshot.forEach(doc => {
            const eventData = doc.data();
            const participantData = eventData.participants?.[currentUserId] || {};
            const teamData = eventData.teams?.find(t => t.members?.includes(currentUserId));
            
            eventsData.push({
                id: doc.id,
                eventName: eventData.eventName,
                eventType: eventData.eventType,
                endDate: eventData.endDate,
                isWinner: participantData.isWinner || teamData?.isWinner || false,
                isOrganizer: participantData.isOrganizer || false,
                project: participantData.project || teamData?.project // Check both user and team project links
            });
            if (participantData.isOrganizer) organizedCount++;
            if (participantData.isWinner || teamData?.isWinner) wonCount++;
        });
        participatedEvents.value = eventsData;
        stats.value.participatedCount = eventsData.length;
        stats.value.organizedCount = organizedCount;
        stats.value.wonCount = wonCount;
        loadingEvents.value = false;

        // 3. Fetch Projects Submitted by the User (across all events)
        // This requires querying projects where userId matches
        const projectsRef = collection(db, "projects"); // Assuming a top-level 'projects' collection
        const userProjectsQuery = query(projectsRef, where("submittedByUid", "==", currentUserId), orderBy("submittedAt", "desc"));
        const projectsSnapshot = await getDocs(userProjectsQuery);
        
        // We need event names/types, potentially fetch associated event data if not stored with project
        // For simplicity here, assume project doc contains necessary event info or fetch it.
        userProjects.value = projectsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
            // eventName: fetchedEventData.eventName, // Example if fetched separately
            // eventType: fetchedEventData.eventType, // Example if fetched separately
        }));
        loadingProjects.value = false;

    } catch (err) {
        console.error("Error fetching public profile data:", err);
        errorMessage.value = err.message === "User not found" ? "User not found." : "Failed to load profile data. Please try again later.";
        // Ensure loading states are false on error
        loadingEvents.value = false;
        loadingProjects.value = false;
    } finally {
        loading.value = false;
    }
}

// Watch for route param changes to refetch data
watch(() => route.params.userId, (newUserId) => {
    if (newUserId) {
        userId.value = newUserId; // Update the reactive ref
        fetchData(newUserId);
    }
}, { immediate: true }); // Fetch data immediately when component mounts

</script>

<!-- <style scoped>
/* Scoped styles removed */
</style> -->
