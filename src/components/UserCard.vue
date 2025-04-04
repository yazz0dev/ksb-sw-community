// /src/components/UserCard.vue
<template>
    <!-- Replaced list-group-item and scoped styles with Tailwind utilities -->
    <div class="flex items-center p-3 bg-white border-b border-gray-200 space-x-2">
        <span class="text-sm font-medium text-gray-700">{{ userId }}</span>
        <span v-if="averageRating !== null" class="flex items-center">
            <span class="text-sm text-gray-500 mr-1">-</span>
            <vue3-star-ratings
                :rating="averageRating"
                :star-size="16" 
                :read-only="true"
                :show-rating="false"
                inactive-color="#d1d5db" /* Tailwind gray-300 */
                active-color="#f59e0b"   /* Tailwind amber-500 */
                :star-spacing="1"
            />
        </span>
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

<!-- Scoped styles removed -->
<!--
<style scoped>
.user-card-item p {
    display: flex;
    align-items: center;
    gap: 0.5rem; /* Space between ID and stars */
    margin-bottom: 0;
}
</style>
-->