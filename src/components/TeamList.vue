// /src/components/TeamList.vue
<template>
  <div>
    <div v-for="team in teams" :key="team.teamName" class="card mb-3 team-card">
      <div class="card-body">
        <div class="d-flex justify-content-between align-items-center">
             <h4 class="card-title mb-0">{{ team.teamName }}</h4>
             <!-- Rating Button (Conditional on ratingsOpen prop) -->
             <button v-if="ratingsOpen && canRate" <!-- Removed !hasRated check -->
                @click="goToRatingForm(team.teamName)" class="btn btn-info btn-sm">Rate Team</button>
        </div>

        <button @click="toggleTeamDetails(team)" class="btn btn-secondary btn-sm mt-2 mb-2">
          {{ team.showDetails ? 'Hide Members' : 'Show Members' }}
        </button>

        <div v-if="team.showDetails" class="list-group list-group-flush">
          <!-- Pass UID -->
          <UserCard v-for="memberId in team.members" :key="memberId" :userId="memberId" :eventId="eventId"
            :teamId="team.teamName" />
        </div>

      </div>
    </div>
  </div>
 </template>

 <script setup>
 import { computed, ref, onMounted } from 'vue';
 import UserCard from './UserCard.vue';
 import { useStore } from 'vuex';
 import { useRouter } from 'vue-router';

 const props = defineProps({
    teams: {
      type: Array,
      required: true,
      default: () => [] // Add default empty array
    },
    eventId: {
      type: String,
      required: true
    },
    ratingsOpen: { // New prop from EventDetails
       type: Boolean,
       required: true,
       default: false
    }
  });

 const store = useStore();
 const router = useRouter();
 // Removed hasRated ref - rely on backend/store logic to prevent duplicates if needed
 const canRate = computed(() => store.getters['user/isAuthenticated']);

 // Initialize showDetails for each team (consider doing this reactivity in the parent if needed)
 const teamsWithDetails = ref(props.teams.map(team => ({ ...team, showDetails: false })));

 onMounted(() => {
    // Reset showDetails state based on props when component mounts or props change
     teamsWithDetails.value = props.teams.map(team => ({ ...team, showDetails: false }));
 });


 const toggleTeamDetails = (team) => {
   // Find the team in the reactive ref and toggle its property
    const teamInRef = teamsWithDetails.value.find(t => t.teamName === team.teamName);
    if (teamInRef) {
       teamInRef.showDetails = !teamInRef.showDetails;
    }
 };

 const goToRatingForm = (teamId) => {
     // No need to pass members, RatingForm fetches event details if needed
   router.push({
     // Use named route if available, otherwise path
     // name: 'RatingForm', // Assuming you have a named route
     path: `/rating/${props.eventId}/${teamId}`,
     // params: { eventId: props.eventId, teamId: teamId } // Use params if route is defined like /rating/:eventId/:teamId
   });
 }

 // Expose necessary refs and functions to the template
 // Use props.teams directly in the template v-for loop
</script>

<style scoped>
 .team-card .card-title {
     margin-bottom: 0; /* Adjusted spacing */
 }
</style>