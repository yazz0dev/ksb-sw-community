<template>
  <div class="container">
    <h2>Rate {{ isTeamEvent ? 'Team' : 'Participant(s)' }}: {{ teamId }} (Event: {{ eventId }})</h2>
    <div v-if="errorMessage" class="alert alert-danger" role="alert">{{ errorMessage }}</div>
    <form @submit.prevent="submitRating">
      <!-- Team Event -->
      <template v-if="isTeamEvent">
          <!-- No loop for team rating, as it's a single rating per team -->
        <div class="mb-3">
          <label class="form-label">Design:</label>
          <vue3-star-ratings v-model="rating.design" :star-size="30" :show-rating="false" :increment="1" />
        </div>
        <div class="mb-3">
          <label class="form-label">Presentation:</label>
          <vue3-star-ratings v-model="rating.presentation" :star-size="30" :show-rating="false" :increment="1" />
        </div>
        <div class="mb-3">
          <label class="form-label">Problem Solving:</label>
          <vue3-star-ratings v-model="rating.problemSolving" :star-size="30" :show-rating="false" :increment="1" />
        </div>
        <div class="mb-3">
          <label class="form-label">Execution:</label>
          <vue3-star-ratings v-model="rating.execution" :star-size="30" :show-rating="false" :increment="1" />
        </div>
        <div class="mb-3">
          <label class="form-label">Technology:</label>
          <vue3-star-ratings v-model="rating.technology" :star-size="30" :show-rating="false" :increment="1" />
        </div>
      </template>

      <!-- Individual Event -->
      <template v-else>
           <div v-for="(member, index) in members" :key="index">
            <p>Rating For: {{member}}</p>
          <div class="mb-3">
            <label class="form-label">Design:</label>
            <vue3-star-ratings v-model="ratings[index].design" :star-size="30" :show-rating="false" :increment="1"/>
          </div>
          <div class="mb-3">
            <label class="form-label">Presentation:</label>
             <vue3-star-ratings v-model="ratings[index].presentation" :star-size="30" :show-rating="false" :increment="1"/>
          </div>
          <div class="mb-3">
            <label class="form-label">Problem Solving:</label>
             <vue3-star-ratings v-model="ratings[index].problemSolving" :star-size="30" :show-rating="false" :increment="1"/>
          </div>
          <div class="mb-3">
            <label class="form-label">Execution:</label>
             <vue3-star-ratings v-model="ratings[index].execution" :star-size="30" :show-rating="false" :increment="1"/>
          </div>
          <div class="mb-3">
            <label class="form-label">Technology:</label>
            <vue3-star-ratings v-model="ratings[index].technology" :star-size="30" :show-rating="false" :increment="1"/>
          </div>
        </div>
      </template>

      <button type="submit" class="btn btn-primary">Submit Rating</button>
    </form>
  </div>
</template>

<script>
import { ref, onMounted, computed } from 'vue';
import { useStore } from 'vuex';
import { useRoute, useRouter } from 'vue-router';
import vue3StarRatings from "vue3-star-ratings";
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';


export default {
  components: {
    vue3StarRatings
  },
  props: {
    eventId: {
      type: String,
      required: true,
    },
    teamId: {
      type: String, // Keep teamId for team events
      required: false,
    },
  },
  setup(props) {
    const store = useStore();
    const route = useRoute();
    const router = useRouter();
    const members = ref([]);
    const ratings = ref([]); // For individual event
    const rating = ref({ // For team event
      design: 0,
      presentation: 0,
      problemSolving: 0,
      execution: 0,
      technology: 0,
    });
    const errorMessage = ref('');
    const isTeamEvent = ref(true); // Default to team event

    onMounted(async () => {
      // Determine if it's a team event or individual event
      const eventDocRef = doc(db, 'events', props.eventId);
      const eventDocSnap = await getDoc(eventDocRef);

      if (eventDocSnap.exists()) {
        isTeamEvent.value = eventDocSnap.data().isTeamEvent;

        if (!isTeamEvent.value) {
            const membersQuery = route.query.members;
            if(membersQuery)
            {
                members.value = membersQuery.split(',');
            }

            members.value.forEach(() => {
              ratings.value.push({
                  design: 0,
                  presentation: 0,
                  problemSolving: 0,
                  execution: 0,
                  technology: 0,
              });
          });
        }
      } else {
        errorMessage.value = 'Event not found.';
      }
    });


    const isTeacher = computed(() => store.getters.isTeacher);


      const submitRating = async () => {
          errorMessage.value = ''; //clear error
        try {
              const ratingData = {
                design: 0,
                presentation: 0,
                problemSolving: 0,
                execution: 0,
                technology: 0,
              };

            if(isTeamEvent.value) //team
            {
                ratingData.design = rating.value.design;
                ratingData.presentation = rating.value.presentation;
                ratingData.problemSolving = rating.value// Continuation of /src/views/RatingForm.vue (script section)
                ratingData.problemSolving = rating.value.problemSolving;
                ratingData.execution = rating.value.execution;
                ratingData.technology = rating.value.technology;

                 await store.dispatch('user/submitRating', { //namespaced
                    eventId: props.eventId,
                    teamId: props.teamId,  // Pass teamId for team events
                    members: [],           // No members needed for overall team rating
                    ratingData
                  });
            }else{ //individual
                 //Rating for each user
              for(const member of members.value)
              {
                  //Get rating from array according to the member index.
                  const memberIndex = members.value.indexOf(member);
                  ratingData.design = ratings.value[memberIndex].design;
                  ratingData.presentation = ratings.value[memberIndex].presentation;
                  ratingData.problemSolving = ratings.value[memberIndex].problemSolving;
                  ratingData.execution = ratings.value[memberIndex].execution;
                  ratingData.technology = ratings.value[memberIndex].technology;
                  //Submit rating for each members
                  await store.dispatch('user/submitRating', { //namespaced
                    eventId: props.eventId,
                    teamId: null, //No team id
                    members: [member], // Send as an array,
                    ratingData
                  });
              }
            }

          router.back(); // Navigate back after submission

        } catch (error) {
            errorMessage.value = error.message || 'Failed to submit rating';
        }
      };

    return {
      members,
      ratings, // For individual events
      rating,  // For team events
      submitRating,
      isTeacher,
      errorMessage,
      isTeamEvent, // Expose isTeamEvent to the template
    };
  },
};
</script>