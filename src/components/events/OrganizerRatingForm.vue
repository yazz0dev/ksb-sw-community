<template>
  <div class="organizer-rating-form card shadow-sm mb-4 animate-fade-in">
    <div class="card-header bg-light d-flex align-items-center">
      <i class="fas fa-star text-warning me-2"></i>
      <span class="h6 mb-0 text-primary">Rate the Organizers</span>
    </div>
    <div class="card-body">
      <div v-if="hasRated" class="alert alert-success py-2 mb-3 d-flex align-items-center">
        <i class="fas fa-check-circle me-2"></i>
        Thank you for rating the organizers!
      </div>
      <form v-else @submit.prevent="submitRating">
        <div class="mb-3">
          <label class="form-label">Your Rating</label>
          <div class="rating-stars">
            <i v-for="star in 5" :key="star" class="fas fa-star"
               :class="star <= rating ? 'text-warning' : 'text-secondary'"
               @click="setRating(star)"
               style="cursor:pointer;font-size:1.5rem;"
            ></i>
          </div>
        </div>
        <div class="mb-3">
          <label class="form-label">Feedback (optional)</label>
          <textarea v-model="feedback" class="form-control" rows="2" maxlength="300" placeholder="Share your thoughts about the organizers..."></textarea>
        </div>
        <div class="d-flex align-items-center gap-2">
          <button type="submit" class="btn btn-primary btn-sm" :disabled="isSubmitting || rating === 0">
            <span v-if="isSubmitting" class="spinner-border spinner-border-sm me-2" role="status"></span>
            Submit Rating
          </button>
          <span v-if="errorMessage" class="text-danger small ms-2">{{ errorMessage }}</span>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useEventStore } from '@/stores/eventStore';
import type { OrganizerRating } from '@/types/event';

interface Props {
  eventId: string;
  existingRatings?: OrganizerRating[];
  currentUserId: string;
}
const props = defineProps<Props>();
const eventStore = useEventStore();

const rating = ref<number>(0);
const feedback = ref<string>('');
const isSubmitting = ref(false);
const errorMessage = ref('');
const hasRated = ref(false);

const userExistingRating = computed(() => {
  return props.existingRatings?.find(r => r.userId === props.currentUserId) || null;
});

watch(userExistingRating, (val) => {
  if (val) {
    rating.value = val.rating;
    feedback.value = val.feedback || '';
    hasRated.value = true;
  }
}, { immediate: true });

function setRating(val: number) {
  if (!hasRated.value) rating.value = val;
}

async function submitRating() {
  if (rating.value < 1 || rating.value > 5) {
    errorMessage.value = 'Please select a rating between 1 and 5.';
    return;
  }
  isSubmitting.value = true;
  errorMessage.value = '';
  try {
    await eventStore.submitOrganizationRating({
      eventId: props.eventId,
      score: rating.value,
      feedback: feedback.value.trim() || '' // Pass empty string if feedback is empty or whitespace
    });
    hasRated.value = true;
  } catch (err: any) {
    errorMessage.value = err?.message || 'Failed to submit rating.';
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<style scoped>
.organizer-rating-form {
  max-width: 500px;
  margin: 0 auto;
}
.rating-stars .fa-star {
  transition: color 0.15s;
}
</style>
