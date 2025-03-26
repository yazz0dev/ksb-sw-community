// src/views/RatingForm.vue
<template>
  <div class="container">
    <!-- Dynamic Title -->
    <h2 v-if="!loading && eventName">
        Rate {{ isTeamEvent ? `Team: ${teamId}` : `Participant` }} (Event: {{ eventName }})
    </h2>
    <!-- Display Participant ID/Name if applicable -->
    <h4 v-if="!loading && !isTeamEvent && participantToRate" class="text-muted mb-4">
        Rating: {{ participantName || participantToRate }}
    </h4>
     <!-- Loading and Error Messages -->
     <div v-if="loading" class="text-center my-5">
         <div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div>
     </div>
    <div v-if="errorMessage && !loading" class="alert alert-danger" role="alert">{{ errorMessage }}</div>

    <form @submit.prevent="submitRating" v-if="!loading && !errorMessage">
      <!-- Common Rating Section (Looping through constraints) -->
       <div v-for="(constraint, index) in ratingConstraints" :key="`constraint-${index}`" class="mb-4 p-3 border rounded bg-light shadow-sm">
           <label class="form-label d-block fw-bold">{{ constraint }}:</label>
            <!-- Use index to bind to the correct property in rating object -->
           <vue3-star-ratings
               :modelValue="rating[getConstraintKey(index)]"
               @update:modelValue="updateRatingValue(getConstraintKey(index), $event)"
               :star-size="35" 
               :show-rating="false"
               :increment="1"
               :key="`stars-${index}-${rating[getConstraintKey(index)]}`"
               :active-color="`var(--color-warning)`" 
               :inactive-color="`var(--color-border)`" 
               class="d-flex justify-content-center" 
            />
       </div>

      <button type="submit" class="btn btn-primary mt-3" :disabled="isSubmitting">
           {{ isSubmitting ? 'Submitting...' : 'Submit Rating' }}
      </button>
      <button type="button" @click="goBack" class="btn btn-secondary mt-3 ms-2">
        Cancel
      </button>
    </form>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useStore } from 'vuex';
import { useRoute, useRouter } from 'vue-router';
import vue3StarRatings from "vue3-star-ratings";
import { doc, getDoc } from 'firebase/firestore'; // Import Firestore functions if fetching name
import { db } from '../firebase'; // Import db if fetching name

const props = defineProps({
  eventId: { type: String, required: true },
  teamId: { type: String, required: false }, // For team events
});

const store = useStore();
const route = useRoute();
const router = useRouter();

const loading = ref(true);
const errorMessage = ref('');
const isSubmitting = ref(false);

const eventName = ref('');
const isTeamEvent = ref(null);
const ratingConstraints = ref(['', '', '', '', '']);
const participantToRate = ref(null); // Store the single participant UID
const participantName = ref(null); // Store fetched participant name

// Rating data structure: Use fixed keys
const rating = ref({
  constraint0: 0, constraint1: 0, constraint2: 0, constraint3: 0, constraint4: 0,
});

// Helper to map index to fixed key
const getConstraintKey = (index) => `constraint${index}`;

// Helper to update the rating ref object
const updateRatingValue = (key, value) => {
    rating.value[key] = value;
};

// --- Helper Function to Fetch User Name ---
async function fetchUserName(userId) {
    if (!userId) return null;
    try {
        const userDocRef = doc(db, 'users', userId);
        const docSnap = await getDoc(userDocRef);
        if (docSnap.exists()) {
            return docSnap.data().name || userId; // Return name or fallback to ID
        }
        return userId; // Fallback to ID if not found
    } catch (error) {
        console.error(`Error fetching name for ${userId}:`, error);
        return userId; // Fallback to ID on error
    }
}
// --- End Helper Function ---

onMounted(async () => {
  loading.value = true;
  errorMessage.value = '';
  participantToRate.value = null; // Reset
  participantName.value = null; // Reset name

  try {
    // Fetch event details
    const event = await store.dispatch('events/fetchEventDetails', props.eventId);
    if (!event) { throw new Error('Event not found.'); }

    eventName.value = event.eventName;
    isTeamEvent.value = event.isTeamEvent;
    ratingConstraints.value = event.ratingConstraints && event.ratingConstraints.length === 5
        ? event.ratingConstraints
        : ['Design', 'Presentation', 'Problem Solving', 'Execution', 'Technology']; // Fallback

    if (!isTeamEvent.value) {
      // Read 'participant' query parameter for individual rating
      const participantQuery = route.query.participant;
      if (participantQuery && typeof participantQuery === 'string') {
          participantToRate.value = participantQuery;
          // Fetch participant name for display
          participantName.value = await fetchUserName(participantToRate.value);
      } else {
          throw new Error("Participant ID missing in URL query for individual rating.");
      }
    } else {
        // Check teamId prop for team events
        if (!props.teamId) {
            throw new Error("Team ID is missing for this team event rating.");
        }
    }

  } catch (error) {
    console.error("Error loading rating form:", error);
    errorMessage.value = error.message || 'Failed to load details. Please try again.';
  } finally {
    loading.value = false;
  }
});


const submitRating = async () => {
  if (isSubmitting.value) return;
  errorMessage.value = '';
  isSubmitting.value = true;

  // Prepare rating data with standard keys
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
          // Submit rating for the individual participant
           if (!participantToRate.value) { throw new Error("No participant specified to rate."); }
           await store.dispatch('user/submitRating', {
              eventId: props.eventId,
              teamId: null, // No team ID for individual
              members: [participantToRate.value], // Pass the specific member UID being rated
              ratingData: ratingPayload
            });
      }

      alert('Rating submitted successfully!'); // Provide user feedback
      router.back(); // Navigate back after successful submission

  } catch (error) {
    errorMessage.value = error.message || 'Failed to submit rating. You might have already rated or ratings are closed.';
    console.error("Rating submission error:", error);
  } finally {
    isSubmitting.value = false;
  }
};

// Function to go back
const goBack = () => {
    router.back();
};

</script>

<style scoped>
/* Add styles if needed */
.vue3-star-ratings {
    padding: 0.5rem 0; /* Add some vertical padding */
    /* Ensure alignment if needed */
    display: flex;
    justify-content: center;
    gap: 0.25rem; /* Small gap between stars */
}
.form-label {
    margin-bottom: 0.25rem; /* Reduce space below label */
}
.border { /* Ensure Bootstrap border utility works */
    border: 1px solid var(--color-border) !important;
}
.rounded {
    border-radius: var(--border-radius) !important;
}
.bg-light {
     background-color: #f8f9fa !important; /* Or use a theme variable like var(--color-background) slightly darkened */
}
</style>