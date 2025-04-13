// /src/components/UserCard.vue
<template>
  <div class="is-flex is-align-items-center p-3" style="background-color: var(--color-surface); border-bottom: 1px solid var(--color-border);">
    <p class="is-size-7 has-text-weight-medium has-text-primary mr-2">{{ name || userId }}</p> 
    <div v-if="averageRating !== null" class="is-flex is-align-items-center">
      <span class="is-size-7 has-text-grey mr-1">-</span>
      <vue3-star-ratings
        v-model:rating="averageRating" 
        :star-size="14" 
        :read-only="true"
        :show-rating="false"
        inactive-color="#dbdbdb"  
        active-color="#ffdd57" 
        :star-spacing="1"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useStore } from 'vuex';

const props = defineProps({
  userId: { 
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
});

const store = useStore();
const averageRating = ref(null);
const name = ref(null);

// Fetch user name from cache or store
const fetchUserName = () => {
  const cachedName = store.getters['user/getCachedUserName'](props.userId);
  if (cachedName) {
    name.value = cachedName;
  } else {
    // Optionally fetch if not in cache, depending on your store setup
    // store.dispatch('user/fetchUserNameIfNotCached', props.userId).then(fetchedName => name.value = fetchedName);
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

.p-3 {
  padding: 0.75rem;
}
.mr-1 {
  margin-right: 0.25rem;
}
.mr-2 {
  margin-right: 0.5rem;
}
</style>
