// /src/components/UserCard.vue
<template>
    <!-- Use a specific class for styling -->
    <div class="list-group-item user-card-item">
      <p>
          {{ userId }}
          <span v-if="averageRating !== null">
               - <vue3-star-ratings :rating="averageRating" :star-size="18" :read-only="true" :show-rating="false"/>
          </span>
      </p>
    </div>
</template>

<script>
import { ref, onMounted } from 'vue';
import { useStore } from 'vuex';
import vue3StarRatings from "vue3-star-ratings";

export default {
    components: {
        vue3StarRatings
    },
    props: {
        userId: { // This is now the UID
            type: String,
            required: true,
        },
        eventId: {
            type: String,
            required: true
        },
        teamId: {
            type: String,
            required: false // TeamId might not always be relevant here
        }
    },
    setup(props) {
        const store = useStore();
        const averageRating = ref(null);

        onMounted(async () => {
             try {
                // Dispatch action to get the average rating for this specific user in this event context
                const ratingResult = await store.dispatch('user/calculateWeightedAverageRating', { // Ensure this action exists and calculates correctly
                    eventId: props.eventId,
                    userId: props.userId
                });
                 averageRating.value = ratingResult; // Assuming the action returns the calculated average
             } catch (error) {
                console.error(`Error fetching rating for user ${props.userId} in event ${props.eventId}:`, error);
                averageRating.value = null; // Set to null on error
             }
        });

        return {
            averageRating
        };
    }
};
</script>

<!-- Scoped styles can refine positioning if needed -->
<style scoped>
.user-card-item p {
    display: flex;
    align-items: center;
    gap: 0.5rem; /* Space between ID and stars */
    margin-bottom: 0;
}
 /* Adjust star rating vertical alignment if necessary */
.vue3-star-ratings {
    display: inline-block;
    vertical-align: middle;
}
</style>