// /src/components/TeamList.vue (Handles 'Show Members' correctly and uses name getter)
<template>
    <div class="space-y-4"> <!-- Added vertical spacing -->
        <!-- Loop over the reactive teamsWithDetails ref -->
        <div v-for="team in teamsWithDetails" :key="team.teamName" class="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden"> 
            <div class="p-4"> <!-- Use Tailwind padding -->
                <div class="flex justify-between items-center mb-3"> <!-- Flex layout, added bottom margin -->
                    <h4 class="text-lg font-semibold text-gray-800">{{ team.teamName }}</h4> <!-- Tailwind text style -->
                    <!-- Rating Button - styled with Tailwind, conditional classes -->
                    <button v-if="ratingsOpen && canRate" @click="goToRatingForm(team.teamName)"
                        class="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors"
                        :class="currentUserHasRatedTeam ? 
                                   'text-gray-700 bg-white border-gray-300 hover:bg-gray-50 focus:ring-indigo-500' : 
                                   'text-white bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'">
                        <i class="fas fa-star mr-1"></i> <!-- Adjusted margin -->
                        {{ currentUserHasRatedTeam ? 'View/Edit Ratings' : 'Rate Team' }}
                    </button>
                </div>

                <!-- Toggle Button - styled with Tailwind -->
                <button @click="toggleTeamDetails(team.teamName)"
                    class="inline-flex items-center px-2.5 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors">
                    <i :class="['fas', team.showDetails ? 'fa-chevron-up' : 'fa-chevron-down', 'mr-1']"></i>
                    {{ team.showDetails ? 'Hide Members' : 'Show Members' }}
                </button>

                <!-- Member List (Conditional) - Using Tailwind for list structure -->
                 <transition name="fade-fast">
                    <div v-if="team.showDetails" class="mt-4 border-t border-gray-200 divide-y divide-gray-200">
                        <div v-if="organizerNamesLoading" class="py-3 text-sm text-gray-500">Loading members...</div>
                        <div v-else-if="team.members && team.members.length > 0">
                            <!-- Use ul for semantic list -->
                            <ul role="list">
                                <li v-for="memberId in team.members" :key="memberId"
                                    class="py-3 flex items-center"
                                    :class="{ 'bg-blue-50 rounded px-2 -mx-2 font-medium': memberId === currentUserUid }"> <!-- Tailwind highlighting -->
                                    <i class="fas fa-user mr-2 text-gray-400 flex-shrink-0"></i> <!-- Styled icon -->
                                    <router-link 
                                        :to="{ name: 'PublicProfile', params: { userId: memberId } }"
                                        class="text-sm text-gray-800 hover:text-blue-600 truncate" 
                                        :class="{'text-blue-700': memberId === currentUserUid}">
                                        {{ getUserName(memberId) || memberId }}
                                    </router-link>
                                </li>
                            </ul>
                        </div>
                        <div v-else class="py-3 text-sm text-gray-500">
                            No members in this team.
                        </div>
                    </div>
                 </transition>
            </div>
        </div>
        <!-- No teams alert - styled with Tailwind -->
        <div v-if="teamsWithDetails.length === 0" class="bg-gray-50 text-gray-700 px-4 py-3 rounded-md text-sm mt-4">
             No teams created yet.
        </div>
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
    organizerNamesLoading: { type: Boolean, default: false }, // Loading state from parent
    currentUserUid: { type: String, default: null }, // Add the missing prop definition
    currentUserHasRatedTeam: { type: Boolean, default: false } // Prop to indicate if user has rated any team
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

// // Add new computed property to check if all students are assigned
// // This logic seems more relevant in ManageTeamsComponent, keeping it commented here for reference
// const areAllStudentsAssigned = computed(() => {
//     // Get all unique students from all teams
//     const assignedStudents = new Set(
//         teamsWithDetails.value.flatMap(team => team.members || [])
//     );

//     // Compare with total available students (props.students would be needed)
//     // Assuming props.students is available:
//     // return props.students.every(student => assignedStudents.has(student.uid));
//     return false; // Placeholder
// });

// Pass this to parent slot or emit as needed
defineEmits(['update:teams', 'canAddTeam']);

</script>

<style scoped>
/* Scoped styles removed, replaced by Tailwind utilities */

/* Added transition for member list visibility */
.fade-fast-enter-active,
.fade-fast-leave-active {
  transition: opacity 0.2s ease-in-out;
}

.fade-fast-enter-from,
.fade-fast-leave-to {
  opacity: 0;
}
</style>
