// src/views/RatingForm.vue
<template>
  <div class="container mt-4">
    <h2 v-if="!loading && eventName" class="text-center mb-3">
        Rate {{ isTeamEvent ? `Team: ${teamId}` : `Participant` }}
    </h2>
     <h4 v-if="!loading && !isTeamEvent && participantToRate" class="text-center text-muted mb-4">
        {{ participantName || participantToRate }}
    </h4>
    <p v-if="!loading && eventName" class="text-center text-muted mb-4 small">Event: {{ eventName }}</p>

     <div v-if="loading" class="text-center my-5">
         <div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div>
     </div>
    <div v-if="errorMessage && !loading" class="alert alert-danger" role="alert">{{ errorMessage }}</div>

    <form @submit.prevent="submitRating" v-if="!loading && !errorMessage">
       <div v-for="(constraint, index) in ratingConstraints" :key="`constraint-${index}`"
            class="mb-4 p-3 border rounded bg-light shadow-sm">
           <label class="form-label d-block fw-bold mb-2 text-center">{{ constraint }}:</label>
           <div class="rating-stars-wrapper">
                <CustomStarRating
                    v-model="rating[getConstraintKey(index)]"
                    :star-size="35"
                    :star-spacing="4"
                    :active-color="'var(--color-warning)'"
                    :inactive-color="'var(--color-border)'"
                />
                 <span class="ms-2 text-muted small">({{ rating[getConstraintKey(index)] }})</span> 
           </div>
       </div>

       <div class="d-flex justify-content-center gap-3 mt-4">
          <button type="submit" class="btn btn-primary" :disabled="isSubmitting">
              <span v-if="isSubmitting" class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
              {{ isSubmitting ? 'Submitting...' : 'Submit Rating' }}
          </button>
          <button type="button" @click="goBack" class="btn btn-secondary">
            Cancel
          </button>
      </div>
    </form>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useStore } from 'vuex';
import { useRoute, useRouter } from 'vue-router';
// *** REMOVE import vue3StarRatings from "vue3-star-ratings"; ***
import CustomStarRating from '../components/CustomStarRating.vue'; // *** IMPORT Custom Component ***
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

// Props and setup vars remain the same
const props = defineProps({ eventId: { type: String, required: true }, teamId: { type: String, required: false } });
const store = useStore();
const route = useRoute();
const router = useRouter();
const loading = ref(true);
const errorMessage = ref('');
const isSubmitting = ref(false);
const eventName = ref('');
const isTeamEvent = ref(null);
const ratingConstraints = ref([]);
const participantToRate = ref(null);
const participantName = ref(null);

// *** Initialize rating values back to 0 ***
const rating = ref({
  constraint0: 0, constraint1: 0, constraint2: 0, constraint3: 0, constraint4: 0,
});

const getConstraintKey = (index) => `constraint${index}`;

// Fetch User Name (remains the same)
async function fetchUserName(userId) { if (!userId) return null; try { const userDocRef = doc(db, 'users', userId); const docSnap = await getDoc(userDocRef); return docSnap.exists() ? (docSnap.data().name || userId) : userId; } catch (error) { console.error(`Error fetching name for ${userId}:`, error); return userId; } }

// onMounted (ensure rating reset uses 0)
onMounted(async () => {
  loading.value = true;
  errorMessage.value = '';
  participantToRate.value = null;
  participantName.value = null;
  isTeamEvent.value = null;
  ratingConstraints.value = [];
  // *** Ensure reset uses 0 ***
  rating.value = { constraint0: 0, constraint1: 0, constraint2: 0, constraint3: 0, constraint4: 0 };

  try {
    const event = await store.dispatch('events/fetchEventDetails', props.eventId);
    if (!event) throw new Error('Event not found or not accessible.');
    eventName.value = event.eventName;
    isTeamEvent.value = !!event.isTeamEvent;
    const defaultConstraints = ['Design', 'Presentation', 'Problem Solving', 'Execution', 'Technology'];
    ratingConstraints.value = (Array.isArray(event.ratingConstraints) && event.ratingConstraints.length === 5) ? event.ratingConstraints : defaultConstraints;
    if (event.status !== 'Completed' || !event.ratingsOpen) throw new Error('Ratings are currently closed for this event.');
    if (isTeamEvent.value) {
        if (!props.teamId) throw new Error("Team ID is required for rating this team event.");
    } else {
      const participantQuery = route.query.participant;
      if (!participantQuery || typeof participantQuery !== 'string') throw new Error("Participant ID missing in URL query for individual rating.");
      participantToRate.value = participantQuery;
      participantName.value = await fetchUserName(participantToRate.value);
    }
  } catch (error) {
    console.error("Error loading rating form:", error);
    errorMessage.value = error.message || 'Failed to load rating details. Please try again.';
  } finally {
    loading.value = false;
  }
});

// Submit Rating Logic
const submitRating = async () => {
  if (isSubmitting.value) return;
  errorMessage.value = '';

  // Payload uses 0 for unrated, which is correct now
  const ratingPayload = {
      design: rating.value.constraint0 ?? 0, // Use ?? 0 just in case, though it should be number
      presentation: rating.value.constraint1 ?? 0,
      problemSolving: rating.value.constraint2 ?? 0,
      execution: rating.value.constraint3 ?? 0,
      technology: rating.value.constraint4 ?? 0,
  };

   // Validation remains the same
   const totalStars = Object.values(ratingPayload).reduce((sum, val) => sum + val, 0);
   if (totalStars === 0) {
       errorMessage.value = "Please provide a rating (select at least 1 star overall).";
       return;
   }

  isSubmitting.value = true;
  try {
      const dispatchPayload = {
          eventId: props.eventId,
          teamId: isTeamEvent.value ? props.teamId : null,
          members: isTeamEvent.value ? [] : [participantToRate.value],
          ratingData: ratingPayload
      };
      await store.dispatch('user/submitRating', dispatchPayload);
      alert('Rating submitted successfully!');
      router.back();
  } catch (error) {
    errorMessage.value = error.message || 'Failed to submit rating. You might have already rated, or ratings could be closed.';
    console.error("Rating submission error:", error);
  } finally {
    isSubmitting.value = false;
  }
};

const goBack = () => { router.back(); };

</script>

<style scoped>
/* Keep the wrapper style for centering */
.rating-stars-wrapper {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: var(--space-2) 0;
    width: 100%;
}
</style>