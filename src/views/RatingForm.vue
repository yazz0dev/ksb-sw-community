<template>
    <div>
      <h2>Rate Team: {{ teamId }} (Event: {{ eventId }})</h2>
       <div v-if="errorMessage" class="error">{{ errorMessage }}</div>
      <form @submit.prevent="submitRating">
        <div v-for="(member, index) in members" :key="index">
            <p>Rating For: {{member}}</p>
          <div>
            <label>Design:</label>
            <vue3-star-ratings v-model="ratings[index].design" :star-size="30" :show-rating="false" :increment="1"/>
          </div>
          <div>
            <label>Presentation:</label>
             <vue3-star-ratings v-model="ratings[index].presentation" :star-size="30" :show-rating="false" :increment="1"/>
          </div>
          <div>
            <label>Problem Solving:</label>
             <vue3-star-ratings v-model="ratings[index].problemSolving" :star-size="30" :show-rating="false" :increment="1"/>
          </div>
          <div>
            <label>Execution:</label>
            <vue3-star-ratings v-model="ratings[index].execution" :star-size="30" :show-rating="false" :increment="1"/>
          </div>
          <div>
            <label>Technology:</label>
            <vue3-star-ratings v-model="ratings[index].technology" :star-size="30" :show-rating="false" :increment="1"/>
          </div>
        </div>
        <button type="submit">Submit Rating</button>
      </form>
    </div>
  </template>
  
  <script>
  import { ref, onMounted, computed } from 'vue';
  import { useStore } from 'vuex';
  import { useRoute, useRouter } from 'vue-router';
  import vue3StarRatings from "vue3-star-ratings";
  
  
  export default {
      components:{
          vue3StarRatings
      },
    props: {
      eventId: {
        type: String,
        required: true,
      },
      teamId: {
        type: String,
        required: false, // Optional for individual events
      },
    },
    setup(props) {
      const store = useStore();
      const route = useRoute();
      const router = useRouter();
      const members = ref([]);
      const ratings = ref([]);
      const errorMessage = ref('');
  
      //Initialize members from query params
      onMounted(() => {
          const membersQuery = route.query.members;
          if(membersQuery)
          {
                  //members data is comma seperated
              members.value = membersQuery.split(','); // Convert comma-separated string to array
          }
  
          // Initialize ratings array based on members.  Make sure this happens *after* members is set.
          members.value.forEach(() => {
              ratings.value.push({
                  design: 0,
                  presentation: 0,
                  problemSolving: 0,
                  execution: 0,
                  technology: 0,
              });
          });
      });
  
  
       const isTeacher = computed(() => store.getters.getUserRole === 'Teacher');
  
  
      const submitRating = async () => {
          errorMessage.value = ''; //clear error
        try {
  
          // Prepare the rating data
          const ratingData = {
                design: 0,
                presentation: 0,
                problemSolving: 0,
                execution: 0,
                technology: 0,
                ratedBy: store.getters.getUser.registerNumber,
                isTeacherRating: isTeacher.value, // Access computed value
              };
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
                  await store.dispatch('submitRating', {
                    eventId: props.eventId,
                    teamId: props.teamId,
                    members: [member], // Send as an array,
                    ratingData
                  });
              }
  
          router.back(); // Navigate back after submission
  
        } catch (error) {
            errorMessage.value = error.message || 'Failed to submit rating';
        }
      };
  
      return {
        members,
        ratings,
        submitRating,
        isTeacher,
        errorMessage
      };
    },
  };
  </script>
  
  <style scoped>
  .error{
      color: red;
  }
  </style>