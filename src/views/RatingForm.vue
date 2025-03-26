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
           <label class="form-label d-block fw-bold mb-2 text-center">{{ constraint }}:</label>
           <vue3-star-ratings
               v-model="rating[getConstraintKey(index)]"
               :star-size="35"
               :show-rating="false"
               :increment="1"
               :key="`stars-${index}`"
               :active-color="`#ffc107`"
               :inactive-color="`#e5e7eb`"
               class="rating-stars-wrapper"
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
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

const props = defineProps({
  eventId: { type: String, required: true },
  teamId: { type: String, required: false },
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
const participantToRate = ref(null);
const participantName = ref(null);

// Rating data structure
const rating = ref({
  constraint0: 0, constraint1: 0, constraint2: 0, constraint3: 0, constraint4: 0,
});

// Helper to map index to fixed key
const getConstraintKey = (index) => `constraint${index}`;

// Helper to update the rating ref object
const updateRatingValue = (key, value) => {
    // Ensure value is a number, default to 0 if null/undefined
    rating.value[key] = value ?? 0;
};

// Fetch User Name
async function fetchUserName(userId) {
    if (!userId) return null;
    try {
        const userDocRef = doc(db, 'users', userId);
        const docSnap = await getDoc(userDocRef);
        if (docSnap.exists()) {
            return docSnap.data().name || userId;
        }
        return userId;
    } catch (error) {
        console.error(`Error fetching name for ${userId}:`, error);
        return userId;
    }
}

onMounted(async () => {
  loading.value = true;
  errorMessage.value = '';
  participantToRate.value = null;
  participantName.value = null;
   // Reset ratings
   rating.value = { constraint0: 0, constraint1: 0, constraint2: 0, constraint3: 0, constraint4: 0 };

  try {
    const event = await store.dispatch('events/fetchEventDetails', props.eventId);
    if (!event) { throw new Error('Event not found or not accessible.'); } // More specific error

    eventName.value = event.eventName;
    isTeamEvent.value = event.isTeamEvent;
    ratingConstraints.value = event.ratingConstraints && event.ratingConstraints.length === 5
        ? event.ratingConstraints
        : ['Design', 'Presentation', 'Problem Solving', 'Execution', 'Technology'];

     // Check if ratings are actually open
     if (event.status !== 'Completed' || !event.ratingsOpen) {
         throw new Error('Ratings are currently closed for this event.');
     }

    if (!isTeamEvent.value) {
      const participantQuery = route.query.participant;
      if (participantQuery && typeof participantQuery === 'string') {
          participantToRate.value = participantQuery;
          participantName.value = await fetchUserName(participantToRate.value);
          if (!participantName.value) { // If fetch fails or returns null ID
              participantName.value = participantToRate.value; // Fallback to ID
          }
      } else {
          throw new Error("Participant ID missing in URL query for individual rating.");
      }
    } else {
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

  const ratingPayload = {
      design: rating.value.constraint0 ?? 0, // Ensure 0 if null/undefined
      presentation: rating.value.constraint1 ?? 0,
      problemSolving: rating.value.constraint2 ?? 0,
      execution: rating.value.constraint3 ?? 0,
      technology: rating.value.constraint4 ?? 0,
  };

   const totalStars = Object.values(ratingPayload).reduce((sum, val) => sum + val, 0);
   if (totalStars === 0) {
       errorMessage.value = "Please provide a rating (at least 1 star overall).";
       isSubmitting.value = false;
       return;
   }

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
    errorMessage.value = error.message || 'Failed to submit rating. You might have already rated or ratings are closed.';
    console.error("Rating submission error:", error);
  } finally {
    isSubmitting.value = false;
  }
};

const goBack = () => {
    router.back();
};

</script>

<style scoped>
.rating-stars-wrapper {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 1rem 0;
    width: 100%;
}

/* Fix star ratings display */
:deep(.vue3-star-ratings__wrapper) {
    display: flex !important;
    justify-content: center !important;
    padding: 0 !important;
    margin: 0 !important;
}

:deep(.stars) {
    display: inline-flex !important;
    gap: 4px;
}

:deep(.vue3-star-ratings svg) {
    width: 35px !important;
    height: 35px !important;
}

.form-label {
    margin-bottom: 0.25rem;
}

.border {
    border: 1px solid var(--color-border) !important;
}

.rounded {
    border-radius: var(--border-radius) !important;
}

.bg-light {
    background-color: #f8f9fa !important;
}
</style>