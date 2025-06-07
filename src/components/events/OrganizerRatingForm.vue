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
            <span
              v-for="(_, idx) in Array(5)"
              :key="idx"
              @click="setRating(idx + 1)"
              @mouseenter="setHoverRating(idx + 1)"
              @mouseleave="setHoverRating(0)"
              class="star-rating"
              :class="{ 
                'star-active': idx < (hoverRating || rating), 
                'star-inactive': idx >= (hoverRating || rating) 
              }"
            >
              <i class="fas fa-star"></i>
            </span>
          </div>
        </div>
        <div class="mb-3">
          <label class="form-label">Feedback (optional)</label>
          <textarea v-model="feedback" class="form-control" rows="2" maxlength="300" placeholder="Share your thoughts about the organizers..."></textarea>
        </div>
        <div class="d-flex align-items-center gap-2">
                        <button type="submit" class="btn btn-primary rating-submit-btn btn-sm" :disabled="isSubmitting || rating === 0">
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
const hoverRating = ref<number>(0);
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

function setHoverRating(val: number) {
  if (!hasRated.value) hoverRating.value = val;
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
      feedback: feedback.value.trim() ? feedback.value.trim() : null
    });
    hasRated.value = true;
  } catch (err: any) {
    console.error('Error submitting organizer rating:', err);
    errorMessage.value = err?.message || 'Failed to submit rating.';
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<style scoped>
/* Main Container */
.organizer-rating-form {
  max-width: 500px;
  margin: 0 auto;
  background: linear-gradient(145deg, 
    var(--bs-white) 0%, 
    rgba(var(--bs-light-rgb), 0.3) 100%);
  border: 1px solid rgba(var(--bs-border-color-translucent), 0.6);
  border-radius: var(--bs-border-radius-xl);
  overflow: hidden;
  box-shadow: 
    0 6px 20px rgba(var(--bs-dark-rgb), 0.08),
    0 2px 6px rgba(var(--bs-dark-rgb), 0.04);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
}

.organizer-rating-form::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, 
    var(--bs-warning) 0%, 
    var(--bs-primary) 50%, 
    var(--bs-success) 100%);
  opacity: 0.8;
}

.organizer-rating-form:hover {
  transform: translateY(-2px);
  box-shadow: 
    0 8px 25px rgba(var(--bs-dark-rgb), 0.12),
    0 4px 8px rgba(var(--bs-dark-rgb), 0.06);
}

/* Card Header */
.card-header {
  background: linear-gradient(135deg, 
    rgba(var(--bs-warning-rgb), 0.08) 0%, 
    rgba(var(--bs-warning-rgb), 0.04) 100%);
  border-bottom: 1px solid rgba(var(--bs-warning-rgb), 0.2);
  padding: 1.25rem 1.5rem;
}

.card-header i {
  font-size: 1.25rem;
  color: var(--bs-warning);
  filter: drop-shadow(0 1px 2px rgba(var(--bs-warning-rgb), 0.3));
}

.h6 {
  color: var(--bs-primary);
  font-weight: 700;
  font-size: 1.1rem;
  margin-bottom: 0;
  letter-spacing: -0.02em;
}

/* Card Body */
.card-body {
  padding: 1.25rem;
}

/* Success Alert */
.alert-success {
  background: linear-gradient(135deg, 
    rgba(var(--bs-success-rgb), 0.12) 0%, 
    rgba(var(--bs-success-rgb), 0.06) 100%);
  border: none;
  border-left: 4px solid var(--bs-success);
  border-radius: var(--bs-border-radius-lg);
  padding: 1rem 1.25rem;
  backdrop-filter: blur(10px);
  box-shadow: 0 2px 10px rgba(var(--bs-success-rgb), 0.1);
}

.alert-success i {
  color: var(--bs-success);
  font-size: 1.1rem;
}

/* Form Labels */
.form-label {
  color: var(--bs-dark);
  font-weight: 600;
  margin-bottom: 0.5rem;
  font-size: 0.95rem;
}

/* Star Rating System */
.rating-stars {
  display: flex;
  gap: 0.5rem;
  margin: 0.5rem 0 1rem 0;
  justify-content: center;
  padding: 1rem;
  background: rgba(var(--bs-light-rgb), 0.3);
  border-radius: var(--bs-border-radius-lg);
  border: 1px solid rgba(var(--bs-border-color-translucent), 0.3);
}

.star-rating {
  cursor: pointer;
  font-size: 1.8rem;
  transition: all 0.2s ease;
  position: relative;
  display: inline-block;
  transform-origin: center;
  padding: 0.25rem;
}

.star-rating i {
  transition: all 0.2s ease;
  filter: drop-shadow(0 2px 4px rgba(var(--bs-dark-rgb), 0.1));
}

.star-rating.star-active i {
  color: #ffc107;
  transform: scale(1.1);
}

.star-rating.star-inactive i {
  color: #e5e7eb;
  transform: scale(1);
}

.star-rating:hover {
  transform: scale(1.15);
}

/* Textarea Styling */
.form-control {
  border: 2px solid rgba(var(--bs-border-color-translucent), 0.6);
  border-radius: var(--bs-border-radius-lg);
  padding: 0.75rem 1rem;
  font-size: 0.9rem;
  line-height: 1.4;
  background: rgba(var(--bs-white-rgb), 0.8);
  transition: all 0.3s ease;
  resize: vertical;
  min-height: 70px;
}

.form-control:focus {
  border-color: var(--bs-primary);
  box-shadow: 0 0 0 0.25rem rgba(var(--bs-primary-rgb), 0.15);
  background: var(--bs-white);
  outline: none;
}

.form-control::placeholder {
  color: var(--bs-secondary);
  font-style: italic;
}

/* Rating form submit button - extends base button styles */
.rating-submit-btn {
  &.btn-primary {
    box-shadow: 0 4px 12px rgba(var(--bs-primary-rgb), 0.3);
    
    &::after {
      content: '';
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, 
        transparent, 
        rgba(255, 255, 255, 0.2), 
        transparent);
      transition: left 0.5s ease;
      z-index: 2;
    }

    &:hover {
      box-shadow: 0 6px 20px rgba(var(--bs-primary-rgb), 0.4);
      
      &::after {
        left: 100%;
      }
    }

    &:disabled {
      background: var(--bs-secondary);
      color: var(--bs-light);
      cursor: not-allowed;
      opacity: 0.6;
    }
  }
}

/* Spinner */
.spinner-border-sm {
  width: 1rem;
  height: 1rem;
  border-width: 0.15em;
}

/* Error Message */
.text-danger {
  font-size: 0.875rem;
  font-weight: 500;
  margin-left: 0.5rem;
}

/* Action Container */
.d-flex.align-items-center.gap-2 {
  margin-top: 1rem;
  justify-content: center;
}

/* Animation for form appearance */
.animate-fade-in {
  animation: fadeInUp 0.6s cubic-bezier(0.4, 0, 0.2, 1) forwards;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Mobile Responsive */
@media (max-width: 575.98px) {
  .organizer-rating-form {
    margin: 0 0.5rem;
  }
  
  .card-header,
  .card-body {
    padding: 1rem 1.25rem;
  }
  
  .rating-stars {
    gap: 0.375rem;
    padding: 0.75rem;
  }
  
  .star-rating {
    font-size: 1.75rem;
  }
  
  .star-rating:hover {
    transform: scale(1.1) rotate(-3deg);
  }
  
  .rating-submit-btn.btn-primary {
    width: 100%;
  }
  
  .form-control {
    font-size: 0.9rem;
    padding: 0.75rem 0.875rem;
  }
}

/* Extra small screens */
@media (max-width: 374px) {
  .rating-stars {
    gap: 0.25rem;
  }
  
  .star-rating {
    font-size: 1.5rem;
  }
  
  .card-header,
  .card-body {
    padding: 0.875rem 1rem;
  }
}

/* Accessibility improvements */
@media (prefers-reduced-motion: reduce) {
  .star-rating,
  .rating-submit-btn,
  .organizer-rating-form {
    transition: none;
  }
  
  .star-rating:hover {
    transform: none;
  }
  
  .star-rating:hover::before {
    animation: none;
  }
  
  .animate-fade-in {
    animation: none;
  }
}

/* High contrast mode support */
@media (prefers-contrast: high) {
  .organizer-rating-form {
    border: 2px solid var(--bs-dark);
  }
  
  .star-rating.text-muted i {
    color: var(--bs-secondary);
  }
}
</style>
