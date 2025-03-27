// /src/views/UserProfile.vue
<template>
    <div class="container mt-4"> 
        <div v-if="isAdmin" class="alert alert-info">
            <h3 class="mb-1">Admin Account</h3>
            <p class="mb-0">Admin accounts do not have personal profiles. Use admin tools via navigation.</p>
        </div>
        <template v-else>
            <div class="d-flex justify-content-between align-items-center mb-4 flex-wrap"> 
                <h2 class="mb-0 me-3">My Profile</h2>
                <PortfolioGeneratorButton
                    v-if="user && userProjectsForPortfolio.length > 0"
                    :user="userForPortfolio"
                    :projects="userProjectsForPortfolio"
                    class="mt-2 mt-md-0" /> 
                 <span v-else-if="user" class="text-muted small mt-2 mt-md-0">(Portfolio PDF available after completing events with project submissions)</span>
            </div>

            <div v-if="loading || !user" class="text-center my-5"> 
                 <div v-if="loading" class="spinner-border text-primary" role="status">
                     <span class="visually-hidden">Loading...</span>
                 </div>
                 <p v-else class="text-muted">User profile data could not be loaded.</p>
            </div>

            <div v-else>
                <div class="profile-section profile-info card card-body mb-4 shadow-sm">
                    <p><strong>Name:</strong> {{ user.name || 'N/A' }}</p>
                    <p><strong>Role:</strong> {{ user.role }}</p>
                    <p><strong>Total XP:</strong> <span class="fw-bold">{{ currentUserTotalXp }}</span></p>
                    <p v-if="user.skills?.length"><strong>Skills:</strong> {{ user.skills.join(', ') }}</p>
                     <p v-else><strong>Skills:</strong> <span class="text-muted">Not specified</span></p>
                    <p v-if="user.preferredRoles?.length"><strong>Preferred Roles:</strong> {{ user.preferredRoles.join(', ') }}</p>
                     <p v-else><strong>Preferred Roles:</strong> <span class="text-muted">Not specified</span></p>

                     
                    <div v-if="hasXpData" class="mt-4 pt-3 border-top">
                         <p class="fw-semibold mb-2">XP Breakdown:</p>
                         <ul class="list-unstyled small row row-cols-2 row-cols-sm-3"> 
                             <li v-for="(xp, role) in user.xpByRole" :key="role" class="col">
                                <span v-if="xp > 0">{{ formatRoleName(role) }}: {{ xp }}</span>
                             </li>
                         </ul>
                    </div>
                     <div v-else-if="user.xpByRole" class="mt-4 pt-3 border-top">
                         <p class="text-muted small mb-0">No XP earned yet.</p>
                    </div>
                </div>

                
                <div class="profile-section projects-section card mb-4 shadow-sm">
                     <div class="card-header d-flex justify-content-between align-items-center">
                        <h3 class="mb-0">My Event Projects</h3>
                    </div>
                     <div class="card-body">
                         <div v-if="loadingProjects" class="text-center py-3">
                              <div class="spinner-border spinner-border-sm text-muted" role="status"></div>
                              <span class="ms-2 text-muted small">Loading project history...</span>
                         </div>
                         <div v-else-if="userProjects.length > 0">
                            <ul class="list-group list-group-flush">
                                <li v-for="(project, index) in userProjects" :key="`proj-${project.eventId}-${index}`" class="list-group-item project-item px-0 py-3"> 
                                     <div class="flex-grow-1 me-3">
                                        <strong class="d-block mb-1">{{ project.projectName }}</strong>
                                        <span class="text-muted small mb-2 d-block">From Event: {{ project.eventName }} ({{ project.eventType }})</span>
                                        <p class="mb-2 text-muted small" v-if="project.description">{{ project.description }}</p>
                                        <a :href="project.link" target="_blank" rel="noopener noreferrer" class="small-link" v-if="project.link">
                                            <i class="fas fa-link fa-fw"></i> View Submission
                                        </a>
                                     </div>
                                </li>
                            </ul>
                        </div>
                         <div v-else><p class="text-muted mb-0">No project submissions found from completed events.</p></div>
                    </div>
                </div>

                <div class="profile-section requests-section card mb-4 shadow-sm">
                <div class="card-header"><h3 class="mb-0">My Event Requests</h3></div>
                <div class="card-body">
+                   <!-- UserRequests component now fetches events with status Pending/Rejected for the current user -->
                    <UserRequests />
                </div>
            </div>
            </div>
        </template>
    </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'; // Added watch
import { useStore } from 'vuex';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import UserRequests from '../components/UserRequests.vue';
import PortfolioGeneratorButton from '../components/PortfolioGeneratorButton.vue';

const store = useStore();
const loading = ref(true); // Loading state for user data
const user = computed(() => store.getters['user/getUser']);
const isAdmin = computed(() => store.getters['user/isAdmin']);
const currentUserTotalXp = computed(() => store.getters['user/currentUserTotalXp']);
const hasFetchedUserData = computed(() => store.getters['user/hasFetchedUserData']); // Track initial fetch

// State for fetched projects
const userProjects = ref([]);
const loadingProjects = ref(true);

// Helper to format role keys
const formatRoleName = (roleKey) => {
     if (!roleKey) return '';
     return roleKey.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase());
};
// Check if there's any XP data
const hasXpData = computed(() => currentUserTotalXp.value > 0);


// Prepare user data for portfolio button
const userForPortfolio = computed(() => {
    if (!user.value) return null;
    return {
        uid: user.value.uid, name: user.value.name,
        xpByRole: { ...(user.value.xpByRole || {}) },
        skills: user.value.skills ? [...user.value.skills] : [],
        preferredRoles: user.value.preferredRoles ? [...user.value.preferredRoles] : [],
    };
});

// Prepare projects specifically for the portfolio button prop
const userProjectsForPortfolio = computed(() => {
    return userProjects.value.map(p => ({
        projectName: p.projectName,
        description: p.description,
        link: p.link, // Pass the original link
        eventName: p.eventName, // Pass event context
        // Map other fields if needed by PDF generator
    }));
});

// Fetch projects from completed events
async function fetchUserEventProjects() {
    if (isAdmin.value || !user.value?.uid) { // Skip if admin or no user ID
        loadingProjects.value = false;
        userProjects.value = [];
        return;
    }
    loadingProjects.value = true;
    const fetchedProjects = [];
    const userId = user.value.uid;

    try {
        const eventsRef = collection(db, 'events');
        const q = query(eventsRef, where('status', '==', 'Completed'), orderBy('endDate', 'desc'));
        const querySnapshot = await getDocs(q);

        querySnapshot.forEach((doc) => {
            const eventData = doc.data();
            const eventId = doc.id;
            // Check individual participation
            if (!eventData.isTeamEvent && Array.isArray(eventData.participants) && eventData.participants.includes(userId)) {
                const userSubmission = (Array.isArray(eventData.submissions) ? eventData.submissions : []).find(sub => sub.participantId === userId);
                if (userSubmission) {
                    fetchedProjects.push({ ...userSubmission, eventId, eventName: eventData.eventName, eventType: eventData.eventType });
                }
            }
            // Check team participation
            else if (eventData.isTeamEvent && Array.isArray(eventData.teams)) {
                const userTeam = eventData.teams.find(team => Array.isArray(team.members) && team.members.includes(userId));
                if (userTeam) {
                    (userTeam.submissions || []).forEach(submission => {
                         fetchedProjects.push({ ...submission, eventId, eventName: eventData.eventName, eventType: eventData.eventType, teamName: userTeam.teamName });
                    });
                }
            }
        });
        userProjects.value = fetchedProjects;
    } catch (error) {
        console.error("Error fetching user projects:", error);
        userProjects.value = []; // Reset on error
    } finally {
        loadingProjects.value = false;
    }
}


// Watch for user data availability before fetching projects
watch(hasFetchedUserData, (fetched) => {
    if (fetched) {
        loading.value = false; // Mark user data loading as complete
        fetchUserEventProjects(); // Trigger project fetch
    }
}, { immediate: true }); // Run immediately in case data is already fetched

// Re-fetch projects if the user ID changes (e.g., during hot-reloading or complex scenarios)
watch(() => user.value?.uid, (newUid, oldUid) => {
     if (newUid && newUid !== oldUid) {
         fetchUserEventProjects();
     }
});

// REMOVED: Manual project management functions (addProject, etc.)

</script>

<style scoped>
/* Profile info uses utilities */
.profile-info p { margin-bottom: var(--space-2); } /* Tighter spacing */
.profile-info p strong { min-width: 120px; font-weight: 500; }

.small-link i { width: 1em; text-align: center; }


/* Ensure consistent heading size in cards */
.card-header h3 { font-size: 1.15rem; }
</style>