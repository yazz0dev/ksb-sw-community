// /src/components/UserCard.vue
<template>
  <CFlex align="center" p="3" bg="surface" borderBottomWidth="1px" borderColor="border" gap="2">
    <CText fontSize="sm" fontWeight="medium" color="text-primary">{{ userId }}</CText>
    <CFlex v-if="averageRating !== null" align="center">
      <CText fontSize="sm" color="text-secondary" mr="1">-</CText>
      <vue3-star-ratings
        :rating="averageRating"
        :star-size="16" 
        :read-only="true"
        :show-rating="false"
        inactive-color="var(--color-border)"  
        active-color="var(--color-warning)"   
        :star-spacing="1"
      />
    </CFlex>
  </CFlex>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useStore } from 'vuex';
import vue3StarRatings from "vue3-star-ratings";
import {
  Flex as CFlex,
  Text as CText
} from '@chakra-ui/vue-next';

const props = defineProps({
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
});

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
</script>
