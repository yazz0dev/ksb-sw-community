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
        <div v-else-if="user?.role === 'Admin'" class="alert alert-info">
            Administrator accounts do not have public profiles.
        </div>
        <div v-else class="row g-4">
            <!-- Left Column: Profile Info -->
            <div class="col-md-4">
                <div class="card shadow-sm h-100">
                    <div class="card-body text-center">
                        <!-- Profile Photo -->
                        <div class="profile-photo-container mb-3">
                            <img :src="user.photoURL || '@/assets/images/default-avatar.png'" 
                                 :alt="user.name || 'Profile Photo'"
                                 class="rounded-circle profile-photo"
                                 @error="handleImageError">
                        </div>
                        <h2 class="h4 mb-3">{{ user.name || 'User Profile' }}</h2>
                        
                        <!-- Quick Stats -->
                        <div class="row g-2 stats-container mb-4">
                            <div class="col-4">
                                <div class="p-2 rounded bg-light">
                                    <div class="h4 mb-0">{{ stats.participatedCount }}</div>
                                    <small class="text-muted">Participated</small>
                                </div>
                            </div>
                            <div class="col-4">
                                <div class="p-2 rounded bg-light">
                                    <div class="h4 mb-0">{{ stats.organizedCount }}</div>
                                    <small class="text-muted">Organized</small>
                                </div>
                            </div>
                            <div class="col-4">
                                <div class="p-2 rounded bg-light">
                                    <div class="h4 mb-0">{{ stats.wonCount }}</div>
                                    <small class="text-muted">Won</small>
                                </div>
                            </div>
                        </div>

                        <!-- Total XP -->
                        <div class="mb-4">
                            <h3 class="h5">Total XP</h3>
                            <div class="h2">{{ totalXp }}</div>
                        </div>

                        <!-- Skills & Roles -->
                        <div class="text-start">
                            <h3 class="h5 mb-2">Skills</h3>
                            <div class="mb-3">
                                <span v-if="user.skills?.length" class="badge bg-secondary me-1 mb-1" 
                                      v-for="skill in user.skills" :key="skill">
                                    {{ skill }}
                                </span>
                                <span v-else class="text-muted">Not specified</span>
                            </div>

                            <h3 class="h5 mb-2">Preferred Roles</h3>
                            <div>
                                <span v-if="user.preferredRoles?.length" class="badge bg-info me-1 mb-1" 
                                      v-for="role in user.preferredRoles" :key="role">
                                    {{ role }}
                                </span>
                                <span v-else class="text-muted">Not specified</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Right Column: XP & Events -->
            <div class="col-md-8">
                <!-- XP Breakdown Card -->
                <div class="card shadow-sm mb-4" v-if="hasXpData">
                    <div class="card-header">
                        <h3 class="h5 mb-0">XP Breakdown</h3>
                    </div>
                    <div class="card-body">
                        <div class="row">
                            <div class="col-sm-6 mb-3" v-for="(xp, role) in user.xpByRole" :key="role">
                                <div v-if="xp > 0">
                                    <div class="d-flex justify-content-between align-items-center mb-1">
                                        <span>{{ formatRoleName(role) }}</span>
                                        <span class="badge bg-primary">{{ xp }} XP</span>
                                    </div>
                                    <div class="progress" style="height: 6px;">
                                        <div class="progress-bar" :style="{ width: (xp / totalXp * 100) + '%' }"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Events Participation -->
                <div class="card shadow-sm mb-4">
                    <div class="card-header d-flex justify-content-between align-items-center">
                        <h3 class="h5 mb-0">Event History</h3>
                        <span class="badge bg-secondary">{{ participatedEvents.length }} Events</span>
                    </div>
                    <div class="card-body">
                        <div v-if="loadingEvents" class="text-center py-3">
                            <div class="spinner-border spinner-border-sm text-primary" role="status"></div>
                        </div>
                        <div v-else-if="participatedEvents.length === 0" class="text-center py-3 text-muted">
                            No events participated yet
                        </div>
                        <div v-else>
                            <div v-for="event in participatedEvents" :key="event.id" class="mb-3 pb-3 border-bottom">
                                <div class="d-flex justify-content-between align-items-start">
                                    <div>
                                        <h4 class="h6 mb-1">{{ event.eventName }}</h4>
                                        <p class="small text-muted mb-1">
                                            <i class="fas fa-calendar me-1"></i> {{ formatDate(event.endDate) }}
                                            <span class="mx-2">|</span>
                                            <i class="fas fa-tag me-1"></i> {{ event.eventType }}
                                        </p>
                                    </div>
                                    <div>
                                        <span v-if="event.isWinner" class="badge bg-warning text-dark">
                                            <i class="fas fa-trophy me-1"></i> Winner
                                        </span>
                                        <span v-if="event.isOrganizer" class="badge bg-info ms-1">
                                            <i class="fas fa-star me-1"></i> Organizer
                                        </span>
                                    </div>
                                </div>
                                <!-- Show project if available -->
                                <div v-if="event.project" class="mt-2">
                                    <div class="small">
                                        <strong>Project:</strong> {{ event.project.projectName }}
                                        <a v-if="event.project.link" :href="event.project.link" 
                                           target="_blank" rel="noopener noreferrer"
                                           class="btn btn-sm btn-outline-primary ms-2">
                                            <i class="fas fa-external-link-alt"></i> View Project
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Projects Section -->
                <div class="card shadow-sm">
                    <div class="card-header">
                        <h3 class="h5 mb-0">Project Submissions</h3>
                    </div>
                    <div class="card-body">
                        <div v-if="loadingProjects" class="text-center py-3">
                            <div class="spinner-border spinner-border-sm text-primary" role="status"></div>
                        </div>
                        <div v-else-if="userProjects.length === 0" class="text-center py-3 text-muted">
                            No projects submitted yet
                        </div>
                        <div v-else class="list-group list-group-flush">
                            <div v-for="project in userProjects" :key="project.eventId" 
                                 class="list-group-item border-0 px-0">
                                <h4 class="h6 mb-1">{{ project.projectName }}</h4>
                                <p class="small text-muted mb-1">
                                    Event: {{ project.eventName }} ({{ project.eventType }})
                                    <span v-if="project.teamName" class="ms-2">
                                        <i class="fas fa-users me-1"></i> {{ project.teamName }}
                                    </span>
                                </p>
                                <p v-if="project.description" class="small mb-2">{{ project.description }}</p>
                                <a v-if="project.link" :href="project.link" target="_blank" rel="noopener noreferrer"
                                   class="btn btn-sm btn-outline-primary">
                                    <i class="fas fa-external-link-alt me-1"></i> View Project
                                </a>
                            </div>
                        </div>
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

const props = defineProps({ userId: { type: String, required: true } });
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

const hasXpData = computed(() => totalXp.value > 0);

// Handlers
const handleImageError = (e) => {
    e.target.src = '@/assets/images/default-avatar.png';
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
    return new Date(timestamp.seconds * 1000).toLocaleDateString();
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
                role: docSnap.data().role, // Added role field
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

// Fetch projects and event participation
async function fetchUserEventHistory(userId) {
    if (!userId) {
        loadingEvents.value = false;
        loadingProjects.value = false;
        return;
    }

    loadingEvents.value = true;
    loadingProjects.value = true;
    const events = [];
    const projects = [];
    let participated = 0, organized = 0, won = 0;

    try {
        const eventsRef = collection(db, 'events');
        const q = query(eventsRef, where('status', '==', 'Completed'), orderBy('endDate', 'desc'));
        const querySnapshot = await getDocs(q);

        querySnapshot.forEach((doc) => {
            const eventData = doc.data();
            const eventId = doc.id;
            const isOrganizer = eventData.organizer === userId || (eventData.coOrganizers || []).includes(userId);
            let participantFound = false;
            let projectSubmission = null;

            // Check participation and submission
            if (!eventData.isTeamEvent) {
                if (Array.isArray(eventData.participants) && eventData.participants.includes(userId)) {
                    participantFound = true;
                    projectSubmission = (eventData.submissions || []).find(sub => sub.participantId === userId);
                }
            } else if (Array.isArray(eventData.teams)) {
                const userTeam = eventData.teams.find(team => Array.isArray(team.members) && team.members.includes(userId));
                if (userTeam) {
                    participantFound = true;
                    if (userTeam.submissions?.length > 0) {
                        projectSubmission = { ...userTeam.submissions[0], teamName: userTeam.teamName };
                    }
                }
            }

            // Check if winner
            const isWinner = Array.isArray(eventData.winners) && eventData.winners.includes(userId);

            if (participantFound || isOrganizer) {
                // Update stats
                if (participantFound) participated++;
                if (isOrganizer) organized++;
                if (isWinner) won++;

                // Add to events list
                events.push({
                    id: eventId,
                    eventName: eventData.eventName,
                    eventType: eventData.eventType,
                    endDate: eventData.endDate,
                    isOrganizer,
                    isWinner,
                    project: projectSubmission
                });

                // Add to projects list if submission exists
                if (projectSubmission) {
                    projects.push({
                        ...projectSubmission,
                        eventId,
                        eventName: eventData.eventName,
                        eventType: eventData.eventType
                    });
                }
            }
        });

        // Update state
        participatedEvents.value = events;
        userProjects.value = projects;
        stats.value = {
            participatedCount: participated,
            organizedCount: organized,
            wonCount: won
        };

    } catch (error) {
        console.error("Error fetching user history:", error);
        errorMessage.value = "Could not load user's event history.";
    } finally {
        loadingEvents.value = false;
        loadingProjects.value = false;
    }
}

// Lifecycle hooks
onMounted(() => {
    fetchUserData(props.userId);
    fetchUserEventHistory(props.userId);
});

// Watch for changes
watch(() => props.userId, (newId) => {
    fetchUserData(newId);
    fetchUserEventHistory(newId);
});
</script>

<style scoped>
.profile-photo-container {
    width: 150px;
    height: 150px;
    margin: 0 auto;
    overflow: hidden;
}

.profile-photo {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.stats-container {
    text-align: center;
}

.progress {
    background-color: #e9ecef;
}

.progress-bar {
    background-color: #0d6efd;
}

.card-header {
    background-color: rgba(0,0,0,.03);
}

.list-group-item:last-child {
    border-bottom: 0 !important;
}
</style>