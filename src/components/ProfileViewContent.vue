<template>
    <!-- Loading State -->
    <div v-if="loading" class="flex flex-col items-center justify-center py-16 text-gray-500">
        <svg class="animate-spin h-10 w-10 text-primary mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
           <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
           <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
       </svg>
       <p>Loading profile data...</p>
    </div>

    <!-- Error/Not Found States -->
    <div v-else-if="errorMessage || !user" class="rounded-md bg-yellow-100 border-l-4 border-yellow-400 text-yellow-800 p-4 shadow-sm">
         <div class="flex">
            <div class="flex-shrink-0">
                <i class="fas fa-exclamation-triangle text-yellow-500"></i>
            </div>
            <div class="ml-3">
                <p class="text-sm font-medium">{{ errorMessage || 'User profile data not available or could not be loaded.' }}</p>
            </div>
         </div>
    </div>

    <!-- Admin Profile State -->
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

    <!-- Profile Grid -->
    <div v-else class="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        <!-- Left Column: Profile Info Card -->
         <div class="lg:col-span-1">
            <div class="bg-surface shadow-lg rounded-lg p-5 sm:p-6 text-center h-full flex flex-col border border-border">
                <!-- Profile Photo -->
                <div class="mb-4">
                    <img :src="user.photoURL || defaultAvatarUrl"
                         :alt="user.name || 'Profile Photo'"
                         class="w-28 h-28 sm:w-36 sm:h-36 mx-auto rounded-full object-cover shadow-md border-4 border-white ring-2 ring-primary"
                         @error="handleImageError">
                </div>
                <h2 class="text-2xl font-bold text-text-primary mb-5">{{ user.name || 'User Profile' }}</h2>

                <!-- Quick Stats: Added responsive text size -->
                 <div class="grid grid-cols-3 gap-3 mb-6">
                    <div class="bg-primary-extraLight border border-primary-light rounded-lg p-3 shadow-sm">
                        <div class="text-2xl font-bold text-primary">{{ stats.participatedCount }}</div>
                        <small class="text-[10px] sm:text-xs text-text-secondary block font-medium uppercase tracking-wider">Participated</small>
                    </div>
                    <div class="bg-primary-extraLight border border-primary-light rounded-lg p-3 shadow-sm">
                        <div class="text-2xl font-bold text-primary">{{ stats.organizedCount }}</div>
                        <small class="text-[10px] sm:text-xs text-text-secondary block font-medium uppercase tracking-wider">Organized</small>
                    </div>
                    <div class="bg-primary-extraLight border border-primary-light rounded-lg p-3 shadow-sm">
                        <div class="text-2xl font-bold text-warning">{{ stats.wonCount }}</div>
                        <small class="text-[10px] sm:text-xs text-text-secondary block font-medium uppercase tracking-wider">Won</small>
                    </div>
                </div>

                <!-- Total XP -->
                <div class="mb-6">
                    <h3 class="text-sm font-semibold text-text-secondary flex items-center justify-center mb-1">
                       <i class="fas fa-star mr-1.5 text-warning"></i>Total XP Earned
                    </h3>
                    <div class="text-4xl font-bold text-text-primary">{{ totalXp }}</div>
                </div>

                <!-- Skills & Roles -->
                 <div class="text-left mt-auto pt-5 border-t border-border space-y-4">
                     <div>
                        <h3 class="text-sm font-medium text-text-secondary mb-2 flex items-center">
                           <i class="fas fa-cogs mr-2 text-text-disabled w-4 text-center"></i>Skills
                        </h3>
                        <div class="flex flex-wrap gap-1.5">
                            <span v-if="user.skills?.length"
                                  class="inline-flex items-center rounded-full bg-neutral-light px-2.5 py-0.5 text-xs font-medium text-neutral-dark border border-neutral shadow-sm"
                                  v-for="skill in user.skills" :key="skill">
                                    {{ skill }}
                                </span>
                            <span v-else class="text-xs text-text-disabled italic">No skills specified</span>
                        </div>
                    </div>

                    <div>
                        <h3 class="text-sm font-medium text-text-secondary mb-2 flex items-center">
                           <i class="fas fa-user-tag mr-2 text-text-disabled w-4 text-center"></i>Preferred Roles
                        </h3>
                        <div class="flex flex-wrap gap-1.5">
                            <span v-if="user.preferredRoles?.length"
                                  class="inline-flex items-center rounded-full bg-primary-extraLight px-2.5 py-0.5 text-xs font-medium text-primary-dark border border-primary-light shadow-sm"
                                  v-for="role in user.preferredRoles" :key="role">
                                    {{ role }}
                                </span>
                            <span v-else class="text-xs text-text-disabled italic">No preferred roles specified</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Right Column: XP, Projects/History -->
        <div class="lg:col-span-2 space-y-6">
            <!-- XP Breakdown Card -->
            <div class="bg-surface shadow-lg rounded-lg overflow-hidden border border-border" v-if="hasXpData">
                <div class="px-4 py-3 sm:px-6 bg-primary-extraLight border-b border-primary-light">
                    <h3 class="text-base font-semibold text-primary-dark flex items-center">
                       <i class="fas fa-chart-pie mr-2 text-primary"></i>XP Breakdown by Role
                    </h3>
                </div>
                <div class="p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
                    <div v-for="(xp, role) in user.xpByRole" :key="role">
                        <div v-if="xp > 0">
                            <div class="flex justify-between items-center mb-1.5">
                                <span class="text-sm font-medium text-text-primary">{{ formatRoleName(role) }}</span>
                                <span class="inline-flex items-center rounded-full bg-primary-light px-2 py-0.5 text-xs font-medium text-primary-dark border border-primary-light">{{ xp }} XP</span>
                            </div>
                            <!-- Progress Bar -->
                            <div class="w-full bg-secondary rounded-full h-2 overflow-hidden border border-secondary-dark">
                                <div class="bg-primary h-2 rounded-full transition-all duration-500 ease-out" :style="{ width: xpPercentage(xp) + '%' }"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div v-else class="bg-surface shadow rounded-lg p-4 text-center text-sm text-text-disabled border border-border">
                {{ isCurrentUser ? 'Participate in events to start earning XP!' : 'This user hasn\'t earned any XP yet.' }}
            </div>

            <!-- Event Projects (Current User) / Event History (Public View) -->
            <div class="bg-surface shadow-lg rounded-lg overflow-hidden border border-border">
                 <div class="flex justify-between items-center px-4 py-3 sm:px-6 bg-secondary border-b border-secondary-dark">
                    <h3 class="text-base font-semibold text-text-primary flex items-center">
                       <i :class="['fas mr-2', isCurrentUser ? 'fa-lightbulb text-success' : 'fa-history text-info']"></i>
                       {{ isCurrentUser ? 'My Event Projects' : 'Event History' }}
                    </h3>
                    <span v-if="isCurrentUser" class="inline-flex items-center rounded-full bg-neutral-light px-2.5 py-0.5 text-xs font-medium text-neutral-dark border border-neutral">{{ userProjects.length }} Projects</span>
                    <span v-else class="inline-flex items-center rounded-full bg-neutral-light px-2.5 py-0.5 text-xs font-medium text-neutral-dark border border-neutral">{{ participatedEvents.length }} Events</span>
                </div>
                <div class="p-4 sm:p-6">
                    <!-- Loading Indicator -->
                    <div v-if="loadingEventsOrProjects" class="flex items-center justify-center py-5">
                        <svg class="animate-spin h-5 w-5 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                           <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                       </svg>
                        <span class="ml-2 text-sm text-text-secondary">Loading {{ isCurrentUser ? 'projects' : 'event history' }}...</span>
                    </div>

                    <!-- Empty State -->
                    <div v-else-if="(isCurrentUser && userProjects.length === 0) || (!isCurrentUser && participatedEvents.length === 0)" class="text-center py-5 text-sm text-text-disabled italic">
                        {{ isCurrentUser ? 'No projects submitted yet. Join an event and showcase your work!' : 'User has not participated in any recorded events yet.' }}
                    </div>

                    <!-- Project List (Current User) -->
                     <ul v-else-if="isCurrentUser" class="divide-y divide-secondary -my-4">
                        <li v-for="project in userProjects" :key="project.eventId + '-' + project.projectName"
                             class="py-4 space-y-1.5">
                            <h4 class="text-sm font-semibold text-text-primary">{{ project.projectName }}</h4>
                            <p class="text-xs text-text-secondary">
                                <span class="inline-flex items-center mr-3">
                                    <i class="fas fa-calendar-alt mr-1 text-text-disabled"></i> Event: <span class="font-medium ml-1">{{ project.eventName }}</span> ({{ project.eventType }})
                                </span>
                                <span v-if="project.teamName" class="inline-flex items-center">
                                    <i class="fas fa-users mr-1 text-text-disabled"></i> Team: <span class="font-medium ml-1">{{ project.teamName }}</span>
                                </span>
                            </p>
                            <p v-if="project.description" class="text-sm text-text-secondary italic">"{{ project.description }}"</p>
                            <a v-if="project.link" :href="project.link" target="_blank" rel="noopener noreferrer"
                               class="inline-flex items-center rounded-md border border-border bg-surface px-2.5 py-1 text-xs font-medium text-text-secondary shadow-sm hover:bg-secondary-light focus:outline-none focus:ring-1 focus:ring-primary transition-colors">
                                <i class="fas fa-external-link-alt mr-1.5 h-3 w-3"></i> View Project
                            </a>
                        </li>
                    </ul>

                    <!-- Event History List (Public View) -->
                    <ul v-else class="divide-y divide-secondary -my-4">
                        <li v-for="event in participatedEvents" :key="event.id" class="py-4">
                            <div class="flex flex-wrap justify-between items-start gap-2">
                                <div class="flex-1">
                                    <h4 class="text-sm font-semibold text-text-primary mb-0.5">{{ event.eventName }}</h4>
                                    <p class="text-xs text-text-secondary flex items-center flex-wrap gap-x-3">
                                        <span class="inline-flex items-center"><i class="fas fa-calendar-alt mr-1 text-text-disabled"></i> {{ formatDate(event.endDate) }}</span>
                                        <span class="inline-flex items-center"><i class="fas fa-tag mr-1 text-text-disabled"></i> {{ event.eventType }}</span>
                                    </p>
                                </div>
                                <div class="flex space-x-1.5 flex-shrink-0 mt-1 sm:mt-0">
                                    <span v-if="event.isWinner" class="inline-flex items-center rounded-full bg-warning-light px-2 py-0.5 text-xs font-medium text-warning-dark border border-warning-light shadow-sm">
                                        <i class="fas fa-trophy mr-1"></i> Winner
                                    </span>
                                    <span v-if="event.isOrganizer" class="inline-flex items-center rounded-full bg-info-light px-2 py-0.5 text-xs font-medium text-info-dark border border-info-light shadow-sm">
                                        <i class="fas fa-star mr-1"></i> Organizer
                                    </span>
                                </div>
                            </div>
                            <div v-if="event.project" class="mt-2 pt-2 border-t border-secondary-light">
                                 <p class="text-xs text-text-secondary mb-1">
                                     <strong class="font-medium">Project Submission:</strong> {{ event.project.projectName }}
                                 </p>
                                <a v-if="event.project.link" :href="event.project.link"
                                   target="_blank" rel="noopener noreferrer"
                                   class="inline-flex items-center rounded-md border border-border bg-surface px-2.5 py-1 text-xs font-medium text-text-secondary shadow-sm hover:bg-secondary-light focus:outline-none focus:ring-1 focus:ring-primary transition-colors">
                                    <i class="fas fa-external-link-alt mr-1.5 h-3 w-3"></i> View Project
                                </a>
                            </div>
                        </li>
                    </ul>
                </div>
            </div>

            <!-- Slot for additional content (like User Requests) -->
            <slot name="additional-content"></slot>

        </div>
    </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, toRefs } from 'vue';
import { useStore } from 'vuex';
import { db } from '../firebase';
import { doc, getDoc, collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { DateTime } from 'luxon';
import { formatRoleName as formatRoleNameUtil } from '../utils/formatters'; // Import shared formatter

const props = defineProps({
    userId: {
        type: String,
        required: true
    },
    isCurrentUser: {
        type: Boolean,
        default: false
    }
});

const { userId, isCurrentUser } = toRefs(props);

const defaultAvatarUrl = new URL('../assets/default-avatar.png', import.meta.url).href;

const store = useStore();

const user = ref(null);
const loading = ref(true);
const errorMessage = ref('');
const userProjects = ref([]);
const participatedEvents = ref([]);
const loadingEventsOrProjects = ref(true); // Combined loading state

const stats = ref({
    participatedCount: 0,
    organizedCount: 0,
    wonCount: 0
});

// --- Computed Properties ---
const totalXp = computed(() => {
    if (!user.value?.xpByRole) return 0;
    return Object.values(user.value.xpByRole).reduce((sum, val) => sum + (Number(val) || 0), 0);
});

const hasXpData = computed(() => totalXp.value > 0 && user.value?.xpByRole && Object.values(user.value.xpByRole).some(xp => xp > 0));

// --- Methods ---
const handleImageError = (e) => {
    e.target.src = defaultAvatarUrl;
};

const formatRoleName = (roleKey) => {
    return formatRoleNameUtil(roleKey); // Use imported utility
};

const formatDate = (dateInput) => {
    try {
        const dt = dateInput?.toDate ? DateTime.fromJSDate(dateInput.toDate()) : DateTime.fromISO(dateInput);
        return dt.isValid ? dt.toLocaleString(DateTime.DATE_MED) : 'Date N/A';
    } catch (e) {
        return 'Date N/A';
    }
};

const xpPercentage = (xp) => {
  const total = totalXp.value;
  return total > 0 ? Math.min(100, (xp / total * 100)) : 0;
};

// --- Data Fetching ---
const fetchProfileData = async () => {
    loading.value = true;
    loadingEventsOrProjects.value = true;
    errorMessage.value = '';
    user.value = null; // Reset user data on new fetch
    userProjects.value = [];
    participatedEvents.value = [];
    stats.value = { participatedCount: 0, organizedCount: 0, wonCount: 0 };

    try {
        // Fetch User Document
        const userDocRef = doc(db, 'users', userId.value);
        const userDocSnap = await getDoc(userDocRef);

        if (!userDocSnap.exists()) {
            throw new Error('User profile not found.');
        }
        user.value = userDocSnap.data();

        // Fetch Events/Projects based on context
        if (isCurrentUser.value) {
            await fetchUserProjects(userId.value);
        } else {
            await fetchEventHistory(userId.value); // Also calculates stats
        }

        // If fetching projects (current user), stats need separate calculation/fetch
        if (isCurrentUser.value) {
             await fetchUserStats(userId.value); // Fetch/calculate stats separately for current user
        }

    } catch (error) {
        console.error("Error fetching profile data:", error);
        errorMessage.value = error.message || 'Failed to load profile.';
        user.value = null;
    } finally {
        loading.value = false;
        // loadingEventsOrProjects is set within its respective fetch function
    }
};

const fetchUserProjects = async (targetUserId) => {
    loadingEventsOrProjects.value = true;
    try {
        const submissionsQuery = query(
            collection(db, 'submissions'),
            where('userId', '==', targetUserId),
            orderBy('submittedAt', 'desc')
        );
        const snapshot = await getDocs(submissionsQuery);

        // TODO: Enhance with event details fetching if needed
        userProjects.value = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                eventName: data.eventName || `Event (${data.eventId.substring(0, 5)}...)`,
                eventType: data.eventType || 'Unknown'
            };
        });
    } catch (error) {
        console.error("Error fetching user projects:", error);
        userProjects.value = []; // Reset on error
    } finally {
        loadingEventsOrProjects.value = false;
    }
};

const fetchEventHistory = async (targetUserId) => {
    loadingEventsOrProjects.value = true;
    try {
        const eventsRef = collection(db, 'events');
        const q = query(eventsRef, orderBy('endDate', 'desc'));
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

            if (event.requester === targetUserId || event.organizers?.includes(targetUserId)) {
                isOrganizerFlag = true;
            }

            if (event.isTeamEvent && Array.isArray(event.teams)) {
                const userTeam = event.teams.find(team => team.members?.includes(targetUserId));
                if (userTeam) {
                    isParticipant = true;
                    if (Array.isArray(event.winners) && event.winners.includes(userTeam.teamName)) isWinnerFlag = true;
                    const teamSubmission = event.submissions?.find(sub => sub.teamId === userTeam.teamName);
                    if (teamSubmission) projectSubmission = teamSubmission;
                }
            } else if (Array.isArray(event.participants) && event.participants.includes(targetUserId)) {
                isParticipant = true;
                if (Array.isArray(event.winners) && event.winners.includes(targetUserId)) isWinnerFlag = true;
                const userSubmission = event.submissions?.find(sub => sub.userId === targetUserId);
                if (userSubmission) projectSubmission = userSubmission;
            }

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
                    project: projectSubmission
                });
            }
        });

        participatedEvents.value = eventsHistory;
        stats.value = { participatedCount: participated, organizedCount: organized, wonCount: won }; // Update stats here

    } catch (error) {
        console.error("Error fetching event history:", error);
        participatedEvents.value = []; // Reset on error
        stats.value = { participatedCount: 0, organizedCount: 0, wonCount: 0 }; // Reset stats
    } finally {
        loadingEventsOrProjects.value = false;
    }
};

const fetchUserStats = async (targetUserId) => {
     // Placeholder: Fetch/calculate stats if not derived from event history
     // This might involve a separate query or using pre-calculated fields on the user doc
     // For now, let's assume stats are derived like in PublicProfile fetchEventHistory
     // If stats are stored directly on the user doc, fetch them here.
     // Example: stats.value = { participatedCount: user.value?.participatedCount || 0, ... }
     // Since fetchEventHistory calculates stats for public view, we replicate similar logic here
     // or ideally fetch pre-calculated stats if available.
     // Re-running event history logic just for stats is inefficient.
     // Let's assume for now stats are calculated during fetchEventHistory and we need a similar mechanism here.
     // TEMPORARY: Re-use fetchEventHistory logic just to get stats (INEFFICIENT - REPLACE LATER)
     await fetchEventHistory(targetUserId);
};


// --- Lifecycle Hooks ---
onMounted(() => {
    fetchProfileData();
});

// Watch for prop changes to refetch data
watch(userId, (newVal, oldVal) => {
    if (newVal && newVal !== oldVal) {
        fetchProfileData();
    }
});
watch(isCurrentUser, () => {
    // Refetch if the context changes (e.g., navigating from public to own profile)
    // This might be redundant if userId also changes, but good for safety.
    fetchProfileData();
});

</script>

<style scoped>
/* Add component-specific styles here if needed */
/* Responsive text size fix applied directly with Tailwind classes */
</style>
