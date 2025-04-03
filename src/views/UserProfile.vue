// /src/views/UserProfile.vue
<template>
    <div class="container mt-4"> 
        <div v-if="isAdmin" class="alert alert-info">
            <h3 class="mb-1"><i class="fas fa-user-shield me-2"></i>Admin Account</h3>
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

            <div v-if="loading || !user" class="text-center my-5 py-5"> 
                <div v-if="loading" class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <p v-else class="text-muted">User profile data could not be loaded.</p>
            </div>

            <div v-else class="row g-4">
                <!-- Left Column: Profile Info -->
                <div class="col-lg-4">
                    <div class="card h-100">  
                        <div class="card-body text-center p-4">
                            <!-- Profile Photo -->
                            <div class="profile-photo-container mb-3">
                                <img :src="user.photoURL || defaultAvatarUrl" 
                                     :alt="user.name || 'Profile Photo'"
                                     class="rounded-circle profile-photo border border-2 border-light"
                                     @error="handleImageError">
                            </div>
                            <h2 class="h4 mb-3">{{ user.name || 'My Profile' }}</h2>
                            
                            <!-- Quick Stats -->
                            <div class="row g-2 stats-container mb-4">
                                <div class="col-4">
                                    <div class="p-2 rounded bg-light-subtle border">
                                        <div class="h4 mb-0 text-primary">{{ stats.participatedCount }}</div>
                                        <small class="text-muted">Participated</small>
                                    </div>
                                </div>
                                <div class="col-4">
                                    <div class="p-2 rounded bg-light-subtle border">
                                        <div class="h4 mb-0 text-info">{{ stats.organizedCount }}</div>
                                        <small class="text-muted">Organized</small>
                                    </div>
                                </div>
                                <div class="col-4">
                                    <div class="p-2 rounded bg-light-subtle border">
                                        <div class="h4 mb-0 text-warning">{{ stats.wonCount }}</div>
                                        <small class="text-muted">Won</small>
                                    </div>
                                </div>
                            </div>

                            <!-- Total XP -->
                            <div class="mb-4">
                                <h3 class="h5 text-muted"><i class="fas fa-star me-1 text-warning"></i>Total XP</h3>
                                <div class="h2 fw-bold">{{ currentUserTotalXp }}</div>
                            </div>

                            <!-- Skills & Roles -->
                            <div class="text-start">
                                <h3 class="h5 mb-2"><i class="fas fa-cogs me-1 text-secondary"></i>Skills</h3>
                                <div class="mb-3">
                                    <span v-if="user.skills?.length" class="badge text-bg-secondary me-1 mb-1" 
                                          v-for="skill in user.skills" :key="skill">
                                        {{ skill }}
                                    </span>
                                    <span v-else class="text-muted fst-italic">Not specified</span>
                                </div>

                                <h3 class="h5 mb-2"><i class="fas fa-user-tag me-1 text-info"></i>Preferred Roles</h3>
                                <div>
                                    <span v-if="user.preferredRoles?.length" class="badge text-bg-info me-1 mb-1" 
                                          v-for="role in user.preferredRoles" :key="role">
                                        {{ role }}
                                    </span>
                                    <span v-else class="text-muted fst-italic">Not specified</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Right Column: XP & Events -->
                <div class="col-lg-8">
                    <!-- XP Breakdown Card -->
                    <div class="card mb-4" v-if="hasXpData">  
                        <div class="card-header bg-white py-3">
                            <h3 class="h5 mb-0"><i class="fas fa-chart-pie me-2 text-primary"></i>XP Breakdown</h3>
                        </div>
                        <div class="card-body p-4">
                            <div class="row g-3">
                                <div class="col-md-6" v-for="(xp, role) in user.xpByRole" :key="role">
                                    <div v-if="xp > 0">
                                        <div class="d-flex justify-content-between align-items-center mb-1">
                                            <span>{{ formatRoleName(role) }}</span>
                                            <span class="badge bg-primary rounded-pill">{{ xp }} XP</span>
                                        </div>
                                        <div class="progress" style="height: 8px;">
                                            <div class="progress-bar" role="progressbar" :style="{ width: xpPercentage(xp) + '%' }" :aria-valuenow="xpPercentage(xp)" aria-valuemin="0" aria-valuemax="100"></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Event Projects -->
                    <div class="card mb-4"> 
                        <div class="card-header bg-white py-3 d-flex justify-content-between align-items-center">
                            <h3 class="h5 mb-0"><i class="fas fa-lightbulb me-2 text-success"></i>My Event Projects</h3>
                            <span class="badge bg-secondary rounded-pill">{{ userProjects.length }} Projects</span>
                        </div>
                        <div class="card-body p-4">
                            <div v-if="loadingProjects" class="text-center py-3">
                                <div class="spinner-border spinner-border-sm text-primary" role="status"></div>
                                <span class="ms-2">Loading projects...</span>
                            </div>
                            <div v-else-if="userProjects.length === 0" class="text-center py-3 text-muted">
                                No projects submitted yet. Participate in events!
                            </div>
                            <div v-else class="list-group list-group-flush">
                                <div v-for="project in userProjects" :key="project.eventId + '-' + project.projectName"
                                     class="list-group-item border-0 px-0 pb-3 mb-3 border-bottom">
                                    <h4 class="h6 mb-1 fw-semibold">{{ project.projectName }}</h4>
                                    <p class="small text-muted mb-1">
                                        <i class="fas fa-calendar-alt me-1"></i> Event: {{ project.eventName }} ({{ project.eventType }})
                                        <span v-if="project.teamName" class="ms-2">
                                            <i class="fas fa-users me-1"></i> {{ project.teamName }}
                                        </span>
                                    </p>
                                    <p v-if="project.description" class="small mb-2 fst-italic">{{ project.description }}</p>
                                    <a v-if="project.link" :href="project.link" target="_blank" rel="noopener noreferrer"
                                       class="btn btn-sm btn-outline-primary mt-1">
                                        <i class="fas fa-external-link-alt me-1"></i> View Project
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Event Requests -->
                    <div class="card mb-4"> 
                        <div class="card-header bg-white py-3">
                            <h3 class="h5 mb-0"><i class="fas fa-paper-plane me-2 text-info"></i>My Event Requests</h3>
                        </div>
                        <div class="card-body p-4">
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

// Use new URL pattern for asset handling
const defaultAvatarUrl = new URL('../assets/default-avatar.png', import.meta.url).href;

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

            const isParticipant = event.participants?.includes(userId) || event.teams?.some(team => team.members?.includes(userId));
            const isOrganizer = event.organizer === userId || event.coOrganizers?.includes(userId);

            if (isParticipant) {
                participated++;
            }
            if (isOrganizer) {
                organized++;
            }

            const userTeam = event.teams?.find(team => team.members?.includes(userId));
            const isWinner = event.winners?.includes(userId) || (userTeam && event.winners?.includes(userTeam.teamName));

            if (isWinner) {
                won++;
            }

            let userSubmission = null;
            if (event.isTeamEvent) {
                const team = event.teams?.find(t => t.members?.includes(userId));
                if (team?.submissions?.length) {
                    userSubmission = {
                        ...team.submissions[0],
                        teamName: team.teamName
                    };
                }
            } else {
                userSubmission = event.submissions?.find(sub => sub.participantId === userId);
            }

            if (userSubmission) {
                projects.push({
                    eventId,
                    eventName: event.eventName,
                    eventType: event.eventType,
                    ...userSubmission
                });
            }
        });

        userProjects.value = projects.sort((a, b) => (a.eventName || '').localeCompare(b.eventName || ''));
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
    return Object.values(xpByRole).reduce((sum, xp) => sum + (Number(xp) || 0), 0);
});

// Helper to format role keys
const formatRoleName = (roleKey) => {
     if (!roleKey) return '';
     return roleKey
         .replace(/([A-Z])/g, ' $1')
         .replace(/^./, (str) => str.toUpperCase())
         .trim();
};
// Check if there's any XP data
const hasXpData = computed(() => currentUserTotalXp.value > 0);

// Calculate percentage for progress bars, handling zero total XP
const xpPercentage = (xp) => {
    const total = currentUserTotalXp.value;
    if (!total || total === 0) return 0;
    return Math.round((Number(xp) / total) * 100);
};

// Prepare user data for portfolio button
const userForPortfolio = computed(() => {
    if (!user.value) return null;
    return {
        uid: user.value.uid,
        name: user.value.name,
        xpByRole: { ...(user.value.xpByRole || {}) },
        skills: user.value.skills ? [...user.value.skills] : [],
        preferredRoles: user.value.preferredRoles ? [...user.value.preferredRoles] : [],
        photoURL: user.value.photoURL
    };
});

// Prepare projects specifically for the portfolio button prop
const userProjectsForPortfolio = computed(() => {
    return userProjects.value.map(p => ({
        projectName: p.projectName,
        description: p.description,
        link: p.link,
        eventName: p.eventName,
        eventType: p.eventType,
        teamName: p.teamName
    }));
});

// Watch for initial data load and trigger project fetch once
watch(hasFetchedUserData, async (hasFetched, _, onCleanup) => {
    let isCancelled = false;
    onCleanup(() => { isCancelled = true; });

    if (hasFetched && !isCancelled) {
        loading.value = false;
        if (user.value?.uid) {
            await fetchUserEventProjects();
        } else {
            loadingProjects.value = false;
        }
    } else if (!hasFetched) {
        loading.value = true;
        loadingProjects.value = true;
    }
}, { immediate: true });

// Watch for subsequent user ID changes (e.g., re-login)
watch(() => user.value?.uid, async (newUid, oldUid, onCleanup) => {
    let isCancelled = false;
    onCleanup(() => { isCancelled = true; });

    if (newUid && newUid !== oldUid && hasFetchedUserData.value && !isCancelled) {
        await fetchUserEventProjects();
    } else if (!newUid && !isCancelled) {
        userProjects.value = [];
        stats.value = { participatedCount: 0, organizedCount: 0, wonCount: 0 };
        loadingProjects.value = false;
    }
}, { immediate: false });

// Redirect admins away from profile page
watch(() => isAdmin.value, (newValue) => {
    if (newValue) {
        router.replace({ name: 'Home' });
    }
}, { immediate: true });

// Error handling for image loading
const handleImageError = (e) => {
    e.target.src = defaultAvatarUrl; // Explicitly set fallback on error
};
</script>

<style scoped>
.profile-photo-container {
    width: 150px;
    height: 150px;
    margin: 0 auto;
    overflow: hidden;
    border-radius: 50%;
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
}

.profile-photo {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.stats-container .col-4 > div {
    transition: transform 0.2s ease-in-out;
}
.stats-container .col-4 > div:hover {
     transform: translateY(-2px);
}

.progress {
    background-color: #e9ecef;
    border-radius: 4px;
}

.progress-bar {
    background-color: #0d6efd;
    transition: width 0.6s ease;
}

.card {
    border: none;
}

.card-header {
     border-bottom: 1px solid #dee2e6;
}

.list-group-item:last-child {
    border-bottom: 0 !important;
}

.list-group-item.border-bottom {
     border-bottom: 1px solid #dee2e6 !important;
}

.list-group-item h4 {
    color: var(--bs-primary);
}

.badge {
    font-weight: 500;
}
</style>
