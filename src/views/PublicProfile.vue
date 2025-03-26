// src/views/PublicProfile.vue
<template>
    <div class="container mt-4">
        <div v-if="loading" class="text-center">
             <div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div>
        </div>
        <div v-else-if="!user" class="alert alert-warning">User not found.</div>
        <div v-else class="card">
            <div class="card-header"><h2>{{ user.name }}'s Public Profile</h2></div>
            <div class="card-body">
                <!-- Basic Info -->
                <div class="profile-section profile-info mb-4">
                    <p><strong>Name:</strong> {{ user.name }}</p>
                    <!-- Calculate and display Total XP -->
                    <p><strong>Total XP:</strong> {{ totalXp }}</p>
                    <p v-if="user.skills?.length"><strong>Skills:</strong> {{ user.skills.join(', ') }}</p>
                    <p v-if="user.preferredRoles?.length"><strong>Preferred Roles:</strong> {{ user.preferredRoles.join(', ') }}</p>

                    <!-- Optional: Display XP Breakdown -->
                    <div v-if="user.xpByRole" class="mt-3 pt-3 border-top">
                         <p><strong>XP Breakdown:</strong></p>
                         <ul class="list-unstyled small">
                             <li v-for="(xp, role) in user.xpByRole" :key="role">
                                {{ formatRoleName(role) }}: {{ xp || 0 }}
                             </li>
                         </ul>
                    </div>
                </div>

                <!-- Public Projects List (Read-Only) -->
                <div class="profile-section projects-section">
                    <h3 class="mb-3">Projects</h3>
                    <div v-if="user.projects && user.projects.length > 0">
                        <ul class="list-group list-group-flush">
                            <li v-for="(project, index) in user.projects" :key="`proj-${index}`" class="list-group-item project-item">
                                <div class="flex-grow-1">
                                    <strong>{{ project.projectName }}</strong>
                                    <p class="mb-1 text-muted small" v-if="project.description">{{ project.description }}</p>
                                    <a v-if="project.githubLink" :href="project.githubLink" target="_blank" rel="noopener noreferrer" class="small-link">
                                        <i class="fab fa-github"></i> GitHub Link
                                    </a>
                                </div>
                            </li>
                        </ul>
                    </div>
                    <div v-else><p class="text-muted">No projects listed.</p></div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'; // Import computed
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

const props = defineProps({ userId: { type: String, required: true } });
const user = ref(null);
const loading = ref(true);
const errorMessage = ref('');

// Calculate Total XP
const totalXp = computed(() => {
    if (!user.value || !user.value.xpByRole) return 0;
    return Object.values(user.value.xpByRole).reduce((sum, val) => sum + (val || 0), 0);
});

// Helper to format role keys for display
const formatRoleName = (roleKey) => {
    if (!roleKey) return '';
    // Add spaces before capitals (except the first) and capitalize
    return roleKey
        .replace(/([A-Z])/g, ' $1') // Add space before capital letters
        .replace(/^./, (str) => str.toUpperCase()); // Capitalize first letter
};


async function fetchUserData(id) {
    // ... fetch logic remains the same, ensures xpByRole is fetched ...
     if (!id) return;
    loading.value = true;
    errorMessage.value = '';
    user.value = null;
    try {
        const userDocRef = doc(db, 'users', id);
        const docSnap = await getDoc(userDocRef);
        if (docSnap.exists()) {
            // Fetch all needed public data, including xpByRole
             user.value = {
                uid: docSnap.id,
                name: docSnap.data().name,
                xpByRole: docSnap.data().xpByRole, // Fetch the map
                skills: docSnap.data().skills,
                preferredRoles: docSnap.data().preferredRoles,
                projects: docSnap.data().projects,
             };
        } else {
             console.warn(`Public profile request: User document not found for UID: ${id}`);
            errorMessage.value = "User not found.";
        }
    } catch (error) {
         console.error('Error fetching public user data:', error);
         errorMessage.value = "Failed to load user profile.";
    } finally {
         loading.value = false;
    }
}

onMounted(() => { fetchUserData(props.userId); });
// watch(() => props.userId, (newId) => { fetchUserData(newId); }); // Optional watcher

</script>

<style scoped>
/* Styles remain the same */
.profile-section { margin-bottom: var(--space-6); }
.profile-info p { margin-bottom: var(--space-2); }
.profile-info p strong { color: var(--color-text); margin-right: var(--space-2); min-width: 100px; display: inline-block; }
.project-item { padding-top: var(--space-3); padding-bottom: var(--space-3); border-bottom: var(--border-width) solid var(--color-border); }
.project-item:last-child { border-bottom: none; }
.small-link { font-size: var(--font-size-sm); color: var(--color-primary); text-decoration: none; }
.small-link:hover { text-decoration: underline; }
.small-link i { margin-right: var(--space-1); }
.card-header h2 { font-size: 1.5rem; margin-bottom: 0; }
.list-unstyled li { margin-bottom: var(--space-1); }
</style>