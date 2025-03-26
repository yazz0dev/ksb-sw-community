// /src/views/UserProfile.vue
<template>
    <div class="container">
        <div v-if="isAdmin" class="alert alert-info">
            <h3>Admin Account</h3>
            <p>Admin accounts do not have personal profiles. Use admin tools.</p>
        </div>
        <template v-else>
            <div class="d-flex justify-content-between align-items-center mb-3">
                <h2>User Profile</h2>
                <!-- Pass fetched projects to portfolio button -->
                <PortfolioGeneratorButton v-if="user && userProjects.length > 0" :user="userForPortfolio" :projects="userProjectsForPortfolio" />
                 <span v-else-if="user" class="text-muted small">(Portfolio available after project submissions)</span>
            </div>

            <div v-if="loading">Loading...</div>
            <div v-else-if="user">
                <!-- User Info Section (remains mostly the same) -->
                <div class="profile-section profile-info card card-body mb-4">
                    <p><strong>Name:</strong> {{ user.name }}</p>
                    <p><strong>UID:</strong> {{ user.uid }}</p>
                    <p><strong>Role:</strong> {{ user.role }}</p>
                    <p><strong>Total XP:</strong> {{ currentUserTotalXp }}</p>
                    <p v-if="user.skills?.length"><strong>Skills:</strong> {{ user.skills.join(', ') }}</p>
                    <p v-if="user.preferredRoles?.length"><strong>Preferred Roles:</strong> {{ user.preferredRoles.join(', ') }}</p>
                    <div v-if="user.xpByRole" class="mt-3 pt-3 border-top">
                         <p><strong>XP Breakdown:</strong></p>
                         <ul class="list-unstyled small">
                             <li v-for="(xp, role) in user.xpByRole" :key="role">
                                {{ formatRoleName(role) }}: {{ xp || 0 }}
                             </li>
                         </ul>
                    </div>
                </div>

                <!-- Projects Section - Display Fetched Event Submissions -->
                <div class="profile-section projects-section card mb-4">
                     <div class="card-header d-flex justify-content-between align-items-center">
                        <h3>Event Projects</h3>
                        <!-- Remove Add Project Button -->
                    </div>
                     <div class="card-body">
                         <div v-if="loadingProjects" class="text-center">Loading projects...</div>
                         <div v-else-if="userProjects.length > 0">
                            <ul class="list-group list-group-flush">
                                {/* Loop through fetched userProjects */}
                                <li v-for="(project, index) in userProjects" :key="`proj-${project.eventId}-${index}`" class="list-group-item project-item">
                                     <div class="flex-grow-1 me-3">
                                        <strong>{{ project.projectName }}</strong>
                                        <span class="text-muted small ms-2">- {{ project.eventName }} ({{ project.eventType }})</span>
                                        <p class="mb-1 text-muted" v-if="project.description">{{ project.description }}</p>
                                        <a :href="project.link" target="_blank" rel="noopener noreferrer" class="small-link" v-if="project.link"><i class="fas fa-link"></i> View Submission</a>
                                     </div>
                                     {/* Remove Edit/Delete Buttons */}
                                </li>
                            </ul>
                        </div>
                         <div v-else><p class="text-muted">No project submissions found from completed events.</p></div>
                    </div>
                </div>

                <!-- Requests Section (remains the same) -->
                <div class="profile-section requests-section card mb-4">
                    <div class="card-header"><h3>My Event Requests</h3></div>
                    <div class="card-body"><UserRequests /></div>
                </div>
            </div>
            <div v-else><p>User not found.</p></div>
        </template>
    </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { useStore } from 'vuex';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore'; // Import firestore functions
import { db } from '../firebase';
import UserRequests from '../components/UserRequests.vue';
import PortfolioGeneratorButton from '../components/PortfolioGeneratorButton.vue';

const store = useStore();
const loading = ref(true);
const user = computed(() => store.getters['user/getUser']);
const isAdmin = computed(() => store.getters['user/isAdmin']);
const currentUserTotalXp = computed(() => store.getters['user/currentUserTotalXp']);

// State for fetched projects
const userProjects = ref([]);
const loadingProjects = ref(true);

// Helper to format role keys
const formatRoleName = (roleKey) => { /* ... remains same ... */ };

// Prepare user data for portfolio (excluding projects here)
const userForPortfolio = computed(() => {
    if (!user.value) return null;
    // Portfolio Button now gets projects via prop
    return {
        uid: user.value.uid,
        name: user.value.name,
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
        githubLink: p.link, // Map 'link' to 'githubLink' expected by generator
        // Add other fields if the generator uses them
    }));
});


// Fetch projects from completed events
async function fetchUserProjects() {
    if (!user.value?.uid) {
        loadingProjects.value = false;
        return;
    }
    loadingProjects.value = true;
    const fetchedProjects = [];
    const userId = user.value.uid;

    try {
        const eventsRef = collection(db, 'events');
        // Query completed events, ordered by date might be nice
        const q = query(eventsRef, where('status', '==', 'Completed'), orderBy('endDate', 'desc'));
        const querySnapshot = await getDocs(q);

        querySnapshot.forEach((doc) => {
            const eventData = doc.data();
            const eventId = doc.id;
            let participationFound = false;

            // Check individual participation and submissions
            if (!eventData.isTeamEvent && eventData.participants?.includes(userId)) {
                participationFound = true;
                const userSubmission = eventData.submissions?.find(sub => sub.participantId === userId);
                if (userSubmission) {
                    fetchedProjects.push({
                        ...userSubmission,
                        eventId: eventId,
                        eventName: eventData.eventName,
                        eventType: eventData.eventType,
                    });
                }
            }
            // Check team participation and submissions
            else if (eventData.isTeamEvent && eventData.teams) {
                const userTeam = eventData.teams.find(team => team.members?.includes(userId));
                if (userTeam) {
                    participationFound = true;
                    // Add all submissions from that team (assuming multiple possible later?)
                    (userTeam.submissions || []).forEach(submission => {
                         fetchedProjects.push({
                            ...submission,
                            eventId: eventId,
                            eventName: eventData.eventName,
                            eventType: eventData.eventType,
                            teamName: userTeam.teamName // Add team context if needed
                        });
                    });
                }
            }
        });

        userProjects.value = fetchedProjects;
        console.log("Fetched user projects:", userProjects.value);

    } catch (error) {
        console.error("Error fetching user projects:", error);
        // Handle error display if needed
    } finally {
        loadingProjects.value = false;
    }
}


onMounted(async () => {
    // Wait for user data to be potentially fetched by App.vue's onAuthStateChanged
    if (!store.getters['user/hasFetchedUserData']) {
        const unsubscribe = store.watch(
            (state, getters) => getters['user/hasFetchedUserData'],
            (newValue) => {
                if (newValue) {
                    loading.value = false;
                    if (user.value?.uid && !isAdmin.value) {
                        fetchUserProjects(); // Fetch projects once user data is ready
                    } else {
                        loadingProjects.value = false; // No user or is admin, no projects to fetch
                    }
                    unsubscribe(); // Stop watching once data is fetched
                }
            }
        );
         // Timeout failsafe
        setTimeout(() => {
            if (loading.value) {
                 loading.value = false;
                 loadingProjects.value = false;
                 console.warn("User data fetch timed out.");
                 unsubscribe();
            }
        }, 5000); // 5 second timeout

    } else {
         // User data was already fetched
        loading.value = false;
         if (user.value?.uid && !isAdmin.value) {
             fetchUserProjects();
         } else {
             loadingProjects.value = false;
         }
    }
});

// REMOVED: addProject, editProject, cancelEdit, updateProject, deleteProject, submitProject functions

</script>

<style scoped>
/* Styles remain largely the same, just remove styles related to the form/edit buttons */
.profile-section { margin-bottom: var(--space-8); }
.profile-info p { margin-bottom: var(--space-3); }
.profile-info p strong { color: var(--color-text); margin-right: var(--space-2); min-width: 120px; display: inline-block; }
.project-item { padding-top: var(--space-4); padding-bottom: var(--space-4); }
.small-link { font-size: var(--font-size-sm); color: var(--color-primary); text-decoration: none; }
.small-link:hover { text-decoration: underline; }
.small-link i { margin-right: var(--space-1); }
.requests-section .list-group-item { padding-left: 0; padding-right: 0; }
.list-unstyled li { margin-bottom: var(--space-1); }
</style>