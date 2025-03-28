// /src/components/TeamList.vue (Handles 'Show Members' correctly and uses name getter)
<template>
    <div>
        <!-- Loop over the reactive teamsWithDetails ref -->
        <div v-for="team in teamsWithDetails" :key="team.teamName" class="card mb-3 team-card shadow-sm">
            <div class="card-body">
                <div class="d-flex justify-content-between align-items-center">
                    <h4 class="card-title mb-0">{{ team.teamName }}</h4>
                    <!-- Rating Button -->
                    <button v-if="ratingsOpen && canRate" @click="goToRatingForm(team.teamName)"
                        class="btn btn-info btn-sm btn-inline-mobile">
                        <i class="fas fa-star me-1"></i> Rate Team
                    </button>
                </div>

                <!-- Toggle Button -->
                <button @click="toggleTeamDetails(team.teamName)"
                    class="btn btn-secondary btn-sm mt-2 mb-3 btn-inline-mobile">
                    <i :class="['fas', team.showDetails ? 'fa-chevron-up' : 'fa-chevron-down', 'me-1']"></i>
                    {{ team.showDetails ? 'Hide Members' : 'Show Members' }}
                </button>

                <!-- Member List (Conditional) -->
                <div v-if="team.showDetails" class="list-group list-group-flush mt-2">
                    <div v-if="organizerNamesLoading" class="list-group-item text-muted">Loading members...</div>
                    <!-- Display member names using the passed-in function -->
                    <div v-else-if="team.members && team.members.length > 0">
                        <div v-for="memberId in team.members" :key="memberId"
                            class="list-group-item user-card-item px-0"
                            :class="{ 'highlighted-user': memberId === currentUserUid }">
                            <p class="mb-0">
                                <!-- Link to public profile -->
                                <router-link :to="{ name: 'PublicProfile', params: { userId: memberId } }">
                                    <i class="fas fa-user me-2 text-muted"></i>{{ getUserName(memberId) || memberId }}
                                </router-link>
                                <!-- Star ratings can potentially be added back here if UserCard logic is integrated or refetched -->
                            </p>
                        </div>
                    </div>
                    <div v-else class="list-group-item text-muted px-0">
                        No members in this team.
                    </div>
                </div>

            </div>
        </div>
        <div v-if="teamsWithDetails.length === 0" class="alert alert-light mt-3">No teams created yet.</div>
    </div>
</template>

<script setup>
import { computed, ref, watch, onMounted } from 'vue';
import { useStore } from 'vuex';
import { useRouter } from 'vue-router';
// UserCard component is removed as we display names directly here now

const props = defineProps({
    teams: { type: Array, required: true, default: () => [] },
    eventId: { type: String, required: true },
    ratingsOpen: { type: Boolean, required: true, default: false },
    getUserName: { type: Function, required: true }, // Function passed from parent
    organizerNamesLoading: { type: Boolean, default: false } // Loading state from parent
});

const store = useStore();
const router = useRouter();
const canRate = computed(() => store.getters['user/isAuthenticated']); // Assuming only authenticated users can rate

// Reactive state for teams including the showDetails flag
const teamsWithDetails = ref([]);

// Function to initialize or update teamsWithDetails based on props
const updateLocalTeams = (teamsFromProps) => {
    teamsWithDetails.value = teamsFromProps.map(team => {
        // Try to preserve existing showDetails state if team exists, otherwise default to false
        const existing = teamsWithDetails.value.find(t => t.teamName === team.teamName);
        return {
            ...team,
            showDetails: existing ? existing.showDetails : false
        };
    }).sort((a, b) => a.teamName.localeCompare(b.teamName)); // Sort teams alphabetically
};

// Initialize on mount
onMounted(() => {
    updateLocalTeams(props.teams);
});

// Watch for changes in the props.teams array and update local state
watch(() => props.teams, (newTeams) => {
    // console.log("TeamList props.teams changed, updating local state.");
    updateLocalTeams(newTeams);
}, { deep: true }); // Use deep watch for array changes


const toggleTeamDetails = (teamName) => {
    const teamIndex = teamsWithDetails.value.findIndex(t => t.teamName === teamName);
    if (teamIndex !== -1) {
        // Directly mutate the reactive ref's item property
        teamsWithDetails.value[teamIndex].showDetails = !teamsWithDetails.value[teamIndex].showDetails;
        // console.log(`Toggled details for ${teamName} to ${teamsWithDetails.value[teamIndex].showDetails}`);
    } else {
        console.warn(`Could not find team ${teamName} to toggle details.`);
    }
};

const goToRatingForm = (teamId) => {
    router.push({ name: 'RatingForm', params: { eventId: props.eventId, teamId: teamId } }); // Use named route
};

// Add new computed property to check if all students are assigned
const areAllStudentsAssigned = computed(() => {
    // Get all unique students from all teams
    const assignedStudents = new Set(
        teamsWithDetails.value.flatMap(team => team.members || [])
    );

    // Compare with total available students
    return props.students.every(student => assignedStudents.has(student.uid));
});

// Pass this to parent slot or emit as needed
defineEmits(['update:teams', 'canAddTeam']);

</script>

<style scoped>
/* Scoped styles for the TeamList component */

.highlighted-user {
    background-color: rgba(var(--color-primary-rgb), 0.1); /* Light primary background */
    border-left: 4px solid var(--color-primary); /* Primary border on left */
}
</style>