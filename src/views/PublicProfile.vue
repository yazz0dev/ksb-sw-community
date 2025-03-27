// src/views/PublicProfile.vue
<template>
    <div class="container mt-4">
        <div class="mb-4"> 
            <button class="btn btn-secondary btn-sm" @click="$router.back()">
                <i class="fas fa-arrow-left me-1"></i> Back
            </button>
        </div>

        <div v-if="loading" class="text-center my-5">
             <div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div>
        </div>
        <div v-else-if="errorMessage" class="alert alert-warning">{{ errorMessage }}</div>
        <div v-else-if="!user" class="alert alert-warning">User profile data not available.</div>

        <div v-else class="card shadow-sm">
            <div class="card-header">
                <h2 class="mb-0">{{ user.name || 'User Profile' }}</h2>
            </div>
            <div class="card-body">
                <div class="profile-section profile-info mb-4">
                    <h3 class="mb-3">Details</h3>
                    <p><strong>Name:</strong> {{ user.name || 'N/A' }}</p>
                    <p><strong>Total XP:</strong> {{ totalXp }}</p>
                    <p v-if="user.skills?.length"><strong>Skills:</strong> {{ user.skills.join(', ') }}</p>
                    <p v-else><strong>Skills:</strong> <span class="text-muted">Not specified</span></p>
                    <p v-if="user.preferredRoles?.length"><strong>Preferred Roles:</strong> {{ user.preferredRoles.join(', ') }}</p>
                     <p v-else><strong>Preferred Roles:</strong> <span class="text-muted">Not specified</span></p>

                    <div v-if="hasXpData" class="mt-4 pt-3 border-top">
                         <p class="fw-semibold mb-2">XP Breakdown:</p> 
                         <ul class="list-unstyled small">
                             <li v-for="(xp, role) in user.xpByRole" :key="role">
                                <span v-if="xp > 0">{{ formatRoleName(role) }}: {{ xp }}</span>
                             </li>
                         </ul>
                    </div>
                    <div v-else-if="user.xpByRole" class="mt-4 pt-3 border-top">
                         <p class="text-muted small">No XP earned yet.</p>
                    </div>
                </div>

                <div class="profile-section projects-section pt-4 border-top"> 
                    <h3 class="mb-3">Event Projects</h3>
                    <div v-if="loadingProjects" class="text-center">Loading projects...</div>
                    <div v-else-if="userProjects.length > 0">
                         <ul class="list-group list-group-flush">
                            <li v-for="(project, index) in userProjects" :key="`proj-${project.eventId}-${index}`" class="list-group-item project-item px-0 py-3"> 
                                 <div class="flex-grow-1">
                                    <strong class="d-block mb-1">{{ project.projectName }}</strong>
                                    <span class="text-muted small mb-2 d-block">From Event: {{ project.eventName }} ({{ project.eventType }})</span>
                                    <p class="mb-2 text-muted small" v-if="project.description">{{ project.description }}</p>
                                    <a v-if="project.link" :href="project.link" target="_blank" rel="noopener noreferrer" class="small-link">
                                        <i class="fas fa-link fa-fw"></i> View Submission
                                    </a>
                                </div>
                            </li>
                        </ul>
                    </div>
                    <div v-else><p class="text-muted">No project submissions found from completed events.</p></div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue'; // Import watch
import { doc, getDoc, collection, query, where, getDocs, orderBy } from 'firebase/firestore'; // Added event fetching imports
import { db } from '../firebase';

const props = defineProps({ userId: { type: String, required: true } });
const user = ref(null);
const loading = ref(true);
const errorMessage = ref('');

// State for fetched projects from events
const userProjects = ref([]);
const loadingProjects = ref(true);

// Calculate Total XP
const totalXp = computed(() => {
    if (!user.value || typeof user.value.xpByRole !== 'object' || user.value.xpByRole === null) return 0;
    return Object.values(user.value.xpByRole).reduce((sum, val) => sum + (Number(val) || 0), 0);
});

// Check if there's any XP data to display in breakdown
const hasXpData = computed(() => totalXp.value > 0);


// Helper to format role keys for display
const formatRoleName = (roleKey) => {
    if (!roleKey) return '';
    return roleKey
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, (str) => str.toUpperCase());
};

// Fetch core user data
async function fetchUserData(id) {
     if (!id) {
         errorMessage.value = "Invalid User ID.";
         loading.value = false;
         return;
     }
    loading.value = true;
    errorMessage.value = '';
    user.value = null;
    try {
        const userDocRef = doc(db, 'users', id);
        const docSnap = await getDoc(userDocRef);
        if (docSnap.exists()) {
            // Only fetch necessary public fields
             user.value = {
                uid: docSnap.id,
                name: docSnap.data().name,
                xpByRole: docSnap.data().xpByRole,
                skills: docSnap.data().skills,
                preferredRoles: docSnap.data().preferredRoles,
                // projects: docSnap.data().projects, // REMOVED - Fetch from events now
             };
        } else {
            errorMessage.value = "User not found.";
        }
    } catch (error) {
         console.error('Error fetching public user data:', error);
         errorMessage.value = "Failed to load user profile.";
    } finally {
         loading.value = false;
    }
}

// Fetch projects from completed events where the user participated
async function fetchUserEventProjects(userId) {
    if (!userId) {
        loadingProjects.value = false;
        return;
    }
    loadingProjects.value = true;
    const fetchedProjects = [];

    try {
        const eventsRef = collection(db, 'events');
        // Query completed events, order by end date descending
        const q = query(eventsRef, where('status', '==', 'Completed'), orderBy('endDate', 'desc'));
        const querySnapshot = await getDocs(q);

        querySnapshot.forEach((doc) => {
            const eventData = doc.data();
            const eventId = doc.id;

            // Check individual participation
            if (!eventData.isTeamEvent && Array.isArray(eventData.participants) && eventData.participants.includes(userId)) {
                const userSubmission = (Array.isArray(eventData.submissions) ? eventData.submissions : []).find(sub => sub.participantId === userId);
                if (userSubmission) {
                    fetchedProjects.push({
                        ...userSubmission, eventId,
                        eventName: eventData.eventName, eventType: eventData.eventType,
                    });
                }
            }
            // Check team participation
            else if (eventData.isTeamEvent && Array.isArray(eventData.teams)) {
                const userTeam = eventData.teams.find(team => Array.isArray(team.members) && team.members.includes(userId));
                if (userTeam) {
                    (userTeam.submissions || []).forEach(submission => {
                         fetchedProjects.push({
                            ...submission, eventId,
                            eventName: eventData.eventName, eventType: eventData.eventType,
                            teamName: userTeam.teamName
                        });
                    });
                }
            }
        });

        userProjects.value = fetchedProjects;
        console.log("Fetched user projects for public profile:", userProjects.value);

    } catch (error) {
        console.error("Error fetching user projects:", error);
        errorMessage.value = (errorMessage.value ? errorMessage.value + '\n' : '') + "Could not load project history.";
    } finally {
        loadingProjects.value = false;
    }
}


onMounted(() => {
    fetchUserData(props.userId);
    fetchUserEventProjects(props.userId); // Fetch projects as well
});

// Watch for userId changes if the component might be reused without unmounting
watch(() => props.userId, (newId) => {
    fetchUserData(newId);
    fetchUserEventProjects(newId);
});

</script>

<style scoped>
/* Profile info uses utilities */
.profile-info p strong { min-width: 120px; }

.small-link i { width: 1em; text-align: center;} /* Align icon */

.card-header h2 { font-size: 1.5rem; }
/* Use list-group-flush styles from main.css */
</style>