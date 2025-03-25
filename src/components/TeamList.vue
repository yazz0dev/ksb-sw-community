<template>
    <div>
      <div v-for="team in teams" :key="team.teamName" class="team-card">
        <h4>{{ team.teamName }}</h4>
           <button @click="toggleTeamDetails(team)">
               {{ team.showDetails? 'Hide Members' : 'Show Members' }}
             </button>
             <div v-if="team.showDetails">
                <UserCard v-for="memberId in team.members" :key="memberId" :userId="memberId" :eventId="eventId" :teamId="team.teamName"/>
             </div>
              <!-- Rating Button (Conditional) -->
             <button v-if="!hasRated[team.teamName] && canRate"  @click="goToRatingForm(team.teamName, team.members)">Rate</button>
      </div>
    </div>
   </template>
   
   <script>
   import {computed, ref, onMounted} from 'vue';
   import UserCard from './UserCard.vue';
   import { useStore } from 'vuex';
    import { useRouter } from 'vue-router';
   
   export default {
    components: {
      UserCard,
    },
    props: {
      teams: {
        type: Array,
        required: true,
      },
        eventId:{
           type: String,
           required: true
        }
    },
    setup(props) {
        const store = useStore();
       const router = useRouter();
        const hasRated = ref({}); // Object to track if user has rated each team.
         const canRate = computed(() => store.getters.isAuthenticated);
   
   
       //Check rating exist on mounted
       onMounted(() => {
         props.teams.forEach(team => {
           hasRated.value[team.teamName] = hasUserRated(team);
         });
       });
   
        const toggleTeamDetails = (team) => {
           team.showDetails = !team.showDetails;
         };
   
        const hasUserRated = () => {
           //Check the rating exist in user data.
           const userRatings = store.getters.getUser.ratings || [];  //important
           return userRatings.some(rating => rating.eventId === props.eventId);
        }
   
        const goToRatingForm = (teamId, members) =>
        {
           router.push({
               path: `/rating/${props.eventId}/${teamId}`,
               query: { members: members.join(',') } // Pass members as query parameter
             });
        }
   
      return {
       toggleTeamDetails,
       hasRated,
       hasUserRated,
       goToRatingForm,
       canRate
      };
    },
   };
   </script>
   
   <style scoped>
    .team-card {
      border: 1px solid #ddd;
      margin-bottom: 10px;
      padding: 10px;
    }
   </style>