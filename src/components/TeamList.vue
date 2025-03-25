// /src/components/TeamList.vue
<template>
  <div>
    <div v-for="team in teams" :key="team.teamName" class="card mb-3">
      <div class="card-body">
        <h4 class="card-title">{{ team.teamName }}</h4>
        <button @click="toggleTeamDetails(team)" class="btn btn-secondary btn-sm mb-2">
          {{ team.showDetails ? 'Hide Members' : 'Show Members' }}
        </button>
        <div v-if="team.showDetails" class="list-group">
          <!-- Pass UID instead of registerNumber -->
          <UserCard v-for="memberId in team.members" :key="memberId" :userId="memberId" :eventId="eventId"
            :teamId="team.teamName" />
        </div>
        <!-- Rating Button (Conditional) -->
        <button v-if="!hasRated[team.teamName] && canRate"
          @click="goToRatingForm(team.teamName, team.members)" class="btn btn-info btn-sm mt-2">Rate</button>
      </div>
    </div>
  </div>
 </template>

 <script>
 import { computed, ref, onMounted } from 'vue';
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
    eventId: {
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
           //hasRated.value[team.teamName] = hasUserRated(team); //removed
           hasRated.value[team.teamName] = false; // Initialize to false
      });
    });

    const toggleTeamDetails = (team) => {
      team.showDetails = !team.showDetails;
    };

    // const hasUserRated = () => { //Removed - Not needed
    //   //Check the rating exist in user data.
    //   const userRatings = store.getters.getUser.ratings || [];  //important
    //   return userRatings.some(rating => rating.eventId === props.eventId);
    // }

    const goToRatingForm = (teamId, members) => {
      // Pass members (UIDs) as query parameter
      router.push({
        path: `/rating/${props.eventId}/${teamId}`,
        query: { members: members.join(',') }
      });
    }

    return {
      toggleTeamDetails,
      hasRated,
      goToRatingForm,
      canRate
    };
  },
 };
 </script>