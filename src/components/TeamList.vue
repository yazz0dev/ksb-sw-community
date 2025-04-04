// /src/components/TeamList.vue (Handles 'Show Members' correctly and uses name getter)
<template>
    <!-- Added padding to the container if it's the root element -->
    <div class="p-4 sm:p-6 space-y-4"> <!-- Applied padding directly here as requested in parent -->
        <!-- Team Card: Improved styling -->
        <div v-for="team in teamsWithDetails" :key="team.teamName" class="bg-white border border-secondary rounded-lg shadow-sm overflow-hidden transition-shadow duration-200 hover:shadow-md">
            <div class="p-4 sm:p-5"> <!-- Adjusted padding -->
                <div class="flex justify-between items-start mb-3"> <!-- Align items start for better wrap -->
                    <h4 class="text-lg font-semibold text-primary-dark">{{ team.teamName }}</h4>
                    <!-- Rating Button: Refined styling -->
                    <button v-if="ratingsOpen && canRate" @click="goToRatingForm(team.teamName)"
                        class="ml-2 flex-shrink-0 inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors"
                        :class="currentUserHasRatedTeam ?
                                   'text-gray-700 bg-white border-gray-300 hover:bg-gray-50 focus:ring-primary-light' :
                                   'text-white bg-primary hover:bg-primary-dark focus:ring-primary'">
                        <i class="fas fa-star mr-1.5"></i>
                        {{ currentUserHasRatedTeam ? 'View/Edit Ratings' : 'Rate Team' }}
                    </button>
                </div>

                <!-- Toggle Button: Refined styling -->
                <button @click="toggleTeamDetails(team.teamName)"
                    class="inline-flex items-center px-3 py-1.5 border border-secondary shadow-sm text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-secondary-light focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary-light transition-colors">
                    <i :class="['fas w-3 transition-transform duration-200', team.showDetails ? 'fa-chevron-up' : 'fa-chevron-down', 'mr-1.5']"></i>
                    {{ team.showDetails ? 'Hide Members' : `Show Members (${team.members?.length || 0})` }}
                </button>

                <!-- Member List (Conditional): Improved styling and structure -->
                 <transition name="fade-fast">
                    <div v-if="team.showDetails" class="mt-4 pt-4 border-t border-secondary">
                        <div v-if="organizerNamesLoading" class="py-3 text-sm text-gray-500 italic">
                            <i class="fas fa-spinner fa-spin mr-1"></i> Loading members...
                        </div>
                        <div v-else-if="team.members && team.members.length > 0">
                            <h5 class="text-xs font-semibold text-gray-500 uppercase mb-2">Team Members</h5>
                            <ul role="list" class="space-y-2">
                                <li v-for="memberId in team.members" :key="memberId"
                                    class="flex items-center p-2 rounded-md transition-colors duration-150"
                                    :class="{ 'bg-primary-light bg-opacity-10 font-medium': memberId === currentUserUid }">
                                    <i class="fas fa-user mr-2 text-gray-400 flex-shrink-0 w-4 text-center"></i>
                                    <router-link
                                        :to="{ name: 'PublicProfile', params: { userId: memberId } }"
                                        class="text-sm text-gray-800 hover:text-primary truncate"
                                        :class="{'text-primary-dark font-semibold': memberId === currentUserUid}">
                                        {{ getUserName(memberId) || memberId }} {{ memberId === currentUserUid ? '(You)' : '' }}
                                    </router-link>
                                </li>
                            </ul>
                        </div>
                        <div v-else class="py-3 text-sm text-gray-500 italic">
                            No members assigned to this team yet.
                        </div>
                    </div>
                 </transition>
            </div>
        </div>
        <!-- No teams alert: Improved styling -->
        <div v-if="teamsWithDetails.length === 0" class="bg-secondary text-gray-700 px-4 py-3 rounded-md text-sm mt-4 border border-secondary-dark italic">
             <i class="fas fa-info-circle mr-1"></i> No teams have been created for this event yet.
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
/* Styles moved to Tailwind utilities */

/* Keep fast fade transition */
.fade-fast-enter-active,
.fade-fast-leave-active {
  transition: opacity 0.2s ease-in-out, max-height 0.3s ease-in-out; /* Added max-height */
  overflow: hidden; /* Prevent content spill during transition */
  max-height: 200px; /* Adjust as needed, should be > expected content height */
}

.fade-fast-enter-from,
.fade-fast-leave-to {
  opacity: 0;
  max-height: 0;
}
</style>
