// /src/components/UserCard.vue (Bootstrap styling)
<template>
    <div class="list-group-item">
      <p>
          {{ userId }}
           <span v-if="averageRating !== null">
               - <vue3-star-ratings :rating="averageRating" :star-size="20" :read-only="true"/>
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
            required: false
        }
    },
    setup(props) {
        const store = useStore();
        const averageRating = ref(null);

        onMounted(async () => {
            // Dispatch with UID
            averageRating.value = await store.dispatch('calculateWeightedAverageRating', {
                eventId: props.eventId,
                userId: props.userId // Pass the UID
            });
        });

        return {
            averageRating
        };
    }
};
</script>