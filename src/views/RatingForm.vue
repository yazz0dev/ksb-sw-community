<template>
  <div class="container">
    <h2>Rate {{ isTeamEvent ? 'Team' : 'Participant(s)' }}: {{ teamId || 'Participants' }} (Event: {{ eventName }})</h2>
     <div v-if="loading">Loading event details...</div>
    <div v-if="errorMessage" class="alert alert-danger" role="alert">{{ errorMessage }}</div>

    <form @submit.prevent="submitRating" v-if="!loading && !errorMessage">
      <!-- Common Rating Section (Looping through constraints) -->
       <div v-for="(constraint, index) in ratingConstraints" :key="`constraint-${index}`" class="mb-3">
           <label class="form-label">{{ constraint }}:</label>
            <!-- Use index to bind to the correct property in rating object -->
           <vue3-star-ratings
               :modelValue="rating[getConstraintKey(index)]"
               @update:modelValue="updateRatingValue(getConstraintKey(index), $event)"
               :star-size="30"
               :show-rating="false"
               :increment="1"
               :key="`stars-${index}-${rating[getConstraintKey(index)]}`" 
            />
       </div>

       <!-- Removed separate Team/Individual templates, unified above -->

      <button type="submit" class="btn btn-primary" :disabled="isSubmitting">
           {{ isSubmitting ? 'Submitting...' : 'Submit Rating' }}
        </button>
    </form>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useStore } from 'vuex';
import { useRoute, useRouter } from 'vue-router';
import vue3StarRatings from "vue3-star-ratings";
// No need to import db/doc/getDoc here if event details come from store

// Props definition using defineProps
const props = defineProps({
  eventId: {
    type: String,
    required: true,
  },
  teamId: { // For team events
    type: String,
    required: false,
  },
});

const store = useStore();
const route = useRoute();
const router = useRouter();

const loading = ref(true);
const errorMessage = ref('');
const isSubmitting = ref(false);

const eventName = ref('');
const isTeamEvent = ref(null); // Use null to indicate not yet loaded
const ratingConstraints = ref(['', '', '', '', '']); // Default structure, labels will be updated
const membersToRate = ref([]); // For individual events, UIDs from query param

// Rating data structure: Use fixed keys, labels are dynamic
// For individual events, we'll submit one user at a time, so one rating object is enough state
const rating = ref({
  constraint0: 0, // Corresponds to ratingConstraints[0]
  constraint1: 0,
  constraint2: 0,
  constraint3: 0,
  constraint4: 0,
});

// Helper to map index to fixed key
const getConstraintKey = (index) => `constraint${index}`;

// Helper to update the rating ref object
const updateRatingValue = (key, value) => {
    rating.value[key] = value;
};


onMounted(async () => {
  loading.value = true;
  errorMessage.value = '';
  try {
    // Fetch event details including constraints and type
    const event = await store.dispatch('events/fetchEventDetails', props.eventId);

    if (!event) {
      errorMessage.value = 'Event not found.';
      loading.value = false;
      return;
    }

    eventName.value = event.eventName;
    isTeamEvent.value = event.isTeamEvent;

    // Use fetched constraints or defaults
    const fetchedConstraints = event.ratingConstraints && event.ratingConstraints.length === 5
        ? event.ratingConstraints
        : ['Design', 'Presentation', 'Problem Solving', 'Execution', 'Technology']; // Fallback
    ratingConstraints.value = fetchedConstraints;


    if (!isTeamEvent.value) {
      // Get participants from event data if teamId is not present (should ideally pass participants via query)
      // const participants = event.participants || [];
      // For now, assume UIDs are passed via query parameter named 'members' as before
        const membersQuery = route.query.members;
        if (membersQuery) {
            membersToRate.value = membersQuery.split(',');
            if (membersToRate.value.length === 0) {
                 errorMessage.value = "No participants specified for rating.";
            }
             // Currently, the form allows rating ONE participant specified by the route query
             // If multiple ratings needed, the UI flow needs adjustment (e.g. separate page per user or section per user)
        } else if (event.participants && event.participants.length > 0) {
            // Fallback if no query param, but this implies rating ALL participants at once which the current form doesn't support well
             membersToRate.value = event.participants;
             console.warn("Rating form opened for individual event without specific 'members' query param. Displaying all participants, but submission logic might need review.");
             // In this fallback case, you might want to disable submission or show a message.
             // For now, we'll assume the query param method is used.
        } else {
             errorMessage.value = "No participants found for this event.";
        }
    } else {
        // Team event, ensure teamId is provided
        if (!props.teamId) {
            errorMessage.value = "Team ID is missing for this team event rating.";
        }
    }

  } catch (error) {
    console.error("Error loading rating form:", error);
    errorMessage.value = 'Failed to load event details. Please try again.';
  } finally {
    loading.value = false;
  }
});


const submitRating = async () => {
  if (isSubmitting.value) return;

  errorMessage.value = '';
  isSubmitting.value = true;

  // Prepare rating data with standard keys, values from the ref
  const ratingPayload = {
      design: rating.value.constraint0,
      presentation: rating.value.constraint1,
      problemSolving: rating.value.constraint2,
      execution: rating.value.constraint3,
      technology: rating.value.constraint4,
  };

   // Basic validation: ensure at least one star is given? Optional.
   const totalStars = Object.values(ratingPayload).reduce((sum, val) => sum + val, 0);
   if (totalStars === 0) {
       errorMessage.value = "Please provide a rating for at least one criterion.";
       isSubmitting.value = false;
       return;
   }


  try {
      if (isTeamEvent.value) {
          // Submit rating for the team
           await store.dispatch('user/submitRating', {
              eventId: props.eventId,
              teamId: props.teamId,
              members: [], // Not needed for team rating
              ratingData: ratingPayload
            });
      } else {
          // Submit rating for the individual participant(s) - assuming one for now
           if (membersToRate.value.length === 0) {
               throw new Error("No participant specified to rate.");
           }
           // In the current setup, assume we rate the first member from the query list
           const memberToRate = membersToRate.value[0];
           await store.dispatch('user/submitRating', {
              eventId: props.eventId,
              teamId: null, // No team ID for individual
              members: [memberToRate], // Pass the specific member UID being rated
              ratingData: ratingPayload
            });
      }

      // Navigate back after successful submission
      router.back();

  } catch (error) {
    errorMessage.value = error.message || 'Failed to submit rating. You might have already rated or ratings are closed.';
    console.error("Rating submission error:", error);
  } finally {
    isSubmitting.value = false;
  }
};
</script>

<style scoped>
/* Add styles if needed */
.vue3-star-ratings {
    display: block; /* Make stars take full width potentially */
}
</style>