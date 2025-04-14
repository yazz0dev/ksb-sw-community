// /src/components/UserCard.vue
<template>
  <div class="d-flex align-items-center p-3" style="background-color: var(--bs-light); border-bottom: 1px solid var(--bs-border-color);">
    <p class="fs-7 fw-medium text-primary me-2 mb-0">{{ name || userId }}</p> 
    <div v-if="averageRating !== null" class="d-flex align-items-center">
      <span class="fs-7 text-secondary me-1">-</span>
      <vue3-star-ratings
        v-model:rating="averageRating" 
        :star-size="14" 
        :read-only="true"
        :show-rating="false"
        inactive-color="var(--bs-gray-300)"  
        active-color="var(--bs-warning)" 
        :star-spacing="1"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useStore } from 'vuex';
import vue3StarRatings from 'vue3-star-ratings';

interface Props {
  userId: string;
  eventId: string;
  teamId?: string;
}

const props = defineProps<Props>();

const store = useStore();
const averageRating = ref<number | null>(null);
const name = ref<string | null>(null);

const fetchUserName = (): void => {
  const cachedName = store.getters['user/getCachedUserName'](props.userId);
  if (cachedName) {
    name.value = cachedName;
  }
};

onMounted(async () => {
  fetchUserName();
  try {
    const ratingResult = await store.dispatch('user/calculateWeightedAverageRating', {
      eventId: props.eventId,
      userId: props.userId
    });
    averageRating.value = ratingResult;
  } catch (error) {
    console.error(`Error fetching rating for user ${props.userId} in event ${props.eventId}:`, error);
    averageRating.value = null;
  }
});
</script>

<style scoped>
/* Style adjustments for vue3-star-ratings if needed */
:deep(.vue-star-rating-star) {
  margin-bottom: 0 !important; /* Override potential default margins */
}

/* Define fs-7 if not already defined globally */
.fs-7 {
    font-size: 0.8rem !important; /* Adjust size as needed */
}
</style>
