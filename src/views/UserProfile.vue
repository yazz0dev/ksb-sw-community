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
                <span v-else-if="user" class="text-muted small mt-2 mt-md-0">
                    (Portfolio PDF available after completing events with project submissions)
                </span>
            </div>

            <div v-if="loading || !user" class="text-center my-5"> 
                <div v-if="loading" class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <p v-else class="text-muted">User profile data could not be loaded.</p>
            </div>

            <div v-else class="row g-4">
                <!-- Left Column: Profile Info -->
                <div class="col-md-4">
                    <div class="card shadow h-100">  
                        <div class="card-body text-center">
                            <!-- Profile Photo -->
                            <div class="profile-photo-container mb-3">
                                <img :src="user.photoURL || '/default-avatar.png'" 
                                     :alt="user.name || 'Profile Photo'"
                                     class="rounded-circle profile-photo"
                                     @error="handleImageError">
                            </div>
                            <h2 class="h4 mb-3">{{ user.name || 'My Profile' }}</h2>
                            
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
                                <div class="h2">{{ currentUserTotalXp }}</div>
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
                    <div class="card shadow mb-4" v-if="hasXpData">  
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
                                            <div class="progress-bar" :style="{ width: (xp / currentUserTotalXp * 100) + '%' }"></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Event Projects -->
                    <div class="card shadow mb-4"> 
                        <div class="card-header d-flex justify-content-between align-items-center">
                            <h3 class="h5 mb-0">My Event Projects</h3>
                            <span class="badge bg-secondary">{{ userProjects.length }} Projects</span>
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

                    <!-- Event Requests -->
                    <div class="card shadow"> 
                        <div class="card-header">
                            <h3 class="h5 mb-0">My Event Requests</h3>
                        </div>
                        <div class="card-body">
                            <UserRequests />
                        </div>
                    </div>
                </div>
            </div>
        </template>
    </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useStore } from 'vuex';
import { useRouter } from 'vue-router';
import { db } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import PortfolioGeneratorButton from '../components/PortfolioGeneratorButton.vue';
import UserRequests from '../components/UserRequests.vue';

const store = useStore();
const router = useRouter();
const userProjects = ref([]);
const stats = ref({
    participatedCount: 0,
    organizedCount: 0,
    wonCount: 0
});
const loading = ref(true);
const loadingProjects = ref(false);

const fetchUserEventProjects = async () => {
    if (!user.value?.uid) return;
    
    try {
        loadingProjects.value = true;
        const q = query(
            collection(db, 'events'),
            where('status', '==', 'Completed')
        );
        const querySnapshot = await getDocs(q);
        const projects = [];
        let participated = 0;
        let organized = 0;
        let won = 0;

        querySnapshot.forEach((doc) => {
            const event = doc.data();
            const userId = user.value?.uid;
            const eventId = doc.id;

            if (event.participants?.includes(userId) || 
                event.teams?.some(team => team.members?.includes(userId))) {
                participated++;
            }

            if (event.organizer === userId || event.coOrganizers?.includes(userId)) {
                organized++;
            }

            if ((event.winners?.includes(userId)) || 
                (event.teams?.some(team => team.members?.includes(userId) && event.winners?.includes(team.teamName)))) {
                won++;
            }

            if (event.isTeamEvent) {
                const userTeam = event.teams?.find(team => team.members?.includes(userId));
                if (userTeam?.submissions?.length) {
                    userTeam.submissions.forEach(sub => {
                        projects.push({
                            eventId,
                            eventName: event.eventName,
                            eventType: event.eventType,
                            teamName: userTeam.teamName,
                            ...sub
                        });
                    });
                }
            } else {
                const userSubmission = event.submissions?.find(sub => sub.participantId === userId);
                if (userSubmission) {
                    projects.push({
                        eventId,
                        eventName: event.eventName,
                        eventType: event.eventType,
                        ...userSubmission
                    });
                }
            }
        });

        userProjects.value = projects;
        stats.value = {
            participatedCount: participated,
            organizedCount: organized,
            wonCount: won
        };
    } catch (error) {
        console.error('Error fetching user projects:', error);
    } finally {
        loadingProjects.value = false;
    }
};

// Computed properties
const user = computed(() => store.getters['user/getUser']);
const isAdmin = computed(() => store.getters['user/isAdmin']);
const hasFetchedUserData = computed(() => store.getters['user/hasFetchedUserData']);
const currentUserTotalXp = computed(() => {
    const xpByRole = user.value?.xpByRole || {};
    return Object.values(xpByRole).reduce((sum, xp) => sum + xp, 0);
});

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

// Watch for initial data load and trigger project fetch once
watch(hasFetchedUserData, async (hasFetched) => {
    if (hasFetched) {
        loading.value = false;
        // Fetch projects only after user data is confirmed loaded
        if (user.value?.uid) {
            loadingProjects.value = true;
            await fetchUserEventProjects();
            loadingProjects.value = false;
        }
    }
}, { immediate: true, once: true });

// Watch for subsequent user ID changes (e.g., re-login)
watch(() => user.value?.uid, async (newUid, oldUid) => {
    // Run only if UID changes *after* initial load
    if (newUid && newUid !== oldUid && !loading.value) {
        loadingProjects.value = true;
        await fetchUserEventProjects();
        loadingProjects.value = false;
    }
});

// Redirect admins away from profile page
watch(() => isAdmin.value, (newValue) => {
    if (newValue) {
        router.replace({ name: 'Home' });
    }
}, { immediate: true });
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

/* Removed redundant card-header style */

.list-group-item:last-child {
    border-bottom: 0 !important;
}

/* Keep existing styles */
.profile-info p { margin-bottom: var(--space-2); }
.profile-info p strong { min-width: 120px; font-weight: 500; }
.small-link i { width: 1em; text-align: center; }
.card-header h3 { font-size: 1.15rem; }
</style>
