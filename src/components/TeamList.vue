// /src/components/TeamList.vue (Handles 'Show Members' correctly and uses name getter)
<template>
  <div>
    <!-- Loop over the reactive teamsWithDetails ref -->
    <div v-for="team in teamsWithDetails" :key="team.teamName" class="card mb-3 team-card">
      <div class="card-body">
        <div class="d-flex justify-content-between align-items-center">
             <h4 class="card-title mb-0">{{ team.teamName }}</h4>
             <!-- Rating Button -->
             <button v-if="ratingsOpen && canRate"
                @click="goToRatingForm(team.teamName)" class="btn btn-info btn-sm">Rate Team</button>
        </div>

        <!-- Toggle Button -->
        <button @click="toggleTeamDetails(team.teamName)" class="btn btn-secondary btn-sm mt-2 mb-2">
          {{ team.showDetails ? 'Hide Members' : 'Show Members' }}
        </button>

        <!-- Member List (Conditional) -->
        <div v-if="team.showDetails" class="list-group list-group-flush">
           <div v-if="organizerNamesLoading">Loading members...</div>
           <!-- Display member names using the passed-in function -->
           <div v-else v-for="memberId in team.members" :key="memberId" class="list-group-item user-card-item">
                <p class="mb-0">
                    <!-- Link to public profile -->
                    <router-link :to="{ name: 'PublicProfile', params: { userId: memberId }}">
                        {{ getUserName(memberId) || memberId }}
                    </router-link>
                    <!-- Star ratings can potentially be added back here if UserCard logic is integrated or refetched -->
                </p>
           </div>
           <div v-if="!organizerNamesLoading && (!team.members || team.members.length === 0)" class="list-group-item text-muted">
               No members in this team.
           </div>
        </div>

      </div>
    </div>
     <div v-if="teamsWithDetails.length === 0" class="alert alert-light">No teams created yet.</div>
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
 const canRate = computed(() => store.getters['user/isAuthenticated']);

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
     });
 };

 // Initialize on mount
 onMounted(() => {
     updateLocalTeams(props.teams);
 });

 // Watch for changes in the props.teams array and update local state
 watch(() => props.teams, (newTeams) => {
     console.log("TeamList props.teams changed, updating local state.");
     updateLocalTeams(newTeams);
 }, { deep: true }); // Use deep watch for array changes


 const toggleTeamDetails = (teamName) => {
    const teamIndex = teamsWithDetails.value.findIndex(t => t.teamName === teamName);
    if (teamIndex !== -1) {
       // Directly mutate the reactive ref's item property
       teamsWithDetails.value[teamIndex].showDetails = !teamsWithDetails.value[teamIndex].showDetails;
       console.log(`Toggled details for ${teamName} to ${teamsWithDetails.value[teamIndex].showDetails}`);
    } else {
        console.warn(`Could not find team ${teamName} to toggle details.`);
    }
 };

 const goToRatingForm = (teamId) => {
   router.push({ path: `/rating/${props.eventId}/${teamId}` });
 };

</script>

<style scoped>
 .team-card .card-title { margin-bottom: 0; }
 .user-card-item p a {
     text-decoration: none;
     color: var(--color-text-secondary);
 }
  .user-card-item p a:hover {
     color: var(--color-primary);
 }
</style>