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
          <textarea v-model="feedback" class="form-control" rows="1" maxlength="300" placeholder="Share your thoughts..."></textarea>
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

// Also watch store loading and error states
watch(() => eventStore.actionError, (val) => {
  if (val) errorMessage.value = val;
});

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
    // Uses submitOrganizationRatingInFirestore from eventVoting.ts via the store
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
    // Clear any store errors after handling
    eventStore.clearError();
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
    0 4px 15px rgba(var(--bs-dark-rgb), 0.06), /* Reduced shadow */
    0 1px 4px rgba(var(--bs-dark-rgb), 0.03);
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
  padding: 0.75rem 1rem; /* Reduced padding */
}

.card-header i {
  font-size: 1.1rem; /* Slightly smaller icon */
  color: var(--bs-warning);
  filter: drop-shadow(0 1px 2px rgba(var(--bs-warning-rgb), 0.3));
}

.h6 { /* This targets the "Rate the Organizers" text */
  color: var(--bs-primary);
  font-weight: 600; /* Adjusted weight */
  font-size: 1rem; /* Slightly smaller */
  margin-bottom: 0;
  letter-spacing: normal; /* Reset letter-spacing */
}

/* Card Body */
.card-body {
  padding: 1rem; /* Reduced padding */
}

/* Success Alert */
.alert-success {
  background: linear-gradient(135deg, 
    rgba(var(--bs-success-rgb), 0.12) 0%, 
    rgba(var(--bs-success-rgb), 0.06) 100%);
  border: none;
  border-left: 3px solid var(--bs-success); /* Thinner border */
  border-radius: var(--bs-border-radius-lg);
  padding: 0.75rem 1rem; /* Reduced padding */
  backdrop-filter: blur(10px);
  box-shadow: 0 2px 8px rgba(var(--bs-success-rgb), 0.08); /* Reduced shadow */
}

.alert-success i {
  color: var(--bs-success);
  font-size: 1rem; /* Smaller icon */
}

/* Form Labels */
.form-label {
  color: var(--bs-dark);
  font-weight: 500; /* Adjusted weight */
  margin-bottom: 0.3rem; /* Reduced margin */
  font-size: 0.9rem; /* Slightly smaller */
}

/* Star Rating System */
.rating-stars {
  display: flex;
  gap: 0.3rem; /* Reduced gap */
  margin: 0.25rem 0 0.75rem 0; /* Adjusted margins */
  justify-content: center;
  padding: 0.5rem; /* Reduced padding */
  background: rgba(var(--bs-light-rgb), 0.2); /* Lighter background */
  border-radius: var(--bs-border-radius); /* Smaller radius */
  border: 1px solid rgba(var(--bs-border-color-translucent), 0.2);
}

.star-rating {
  cursor: pointer;
  font-size: 1.5rem; /* Smaller stars */
  transition: all 0.2s ease;
  position: relative;
  display: inline-block;
  transform-origin: center;
  padding: 0.15rem; /* Reduced padding */
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
  border: 1px solid rgba(var(--bs-border-color-translucent), 0.5); /* Thinner border */
  border-radius: var(--bs-border-radius); /* Smaller radius */
  padding: 0.5rem 0.75rem; /* Reduced padding */
  font-size: 0.875rem; /* Slightly smaller font */
  line-height: 1.3;
  background: rgba(var(--bs-white-rgb), 0.7);
  transition: all 0.3s ease;
  resize: vertical;
  min-height: 40px; /* Reduced min-height */
}

/* Rating form submit button - extends base button styles */
.rating-submit-btn {
  &.btn-primary {
    box-shadow: 0 2px 8px rgba(var(--bs-primary-rgb), 0.25); /* Reduced shadow */
    padding: 0.375rem 0.75rem; /* Ensure btn-sm padding */
    font-size: 0.875rem; /* Ensure btn-sm font size */
    
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
  width: 0.875rem; /* Slightly smaller spinner */
  height: 0.875rem;
  border-width: 0.125em;
}

/* Error Message */
.text-danger {
  font-size: 0.8rem; /* Slightly smaller error text */
  font-weight: 500;
  margin-left: 0.4rem;
}

/* Action Container */
.d-flex.align-items-center.gap-2 {
  margin-top: 0.75rem; /* Reduced margin */
  justify-content: center;
}

/* Animation for form appearance */
.animate-fade-in {
  /* Uses global keyframe 'fadeInUp' */
  animation: fadeInUp 0.6s cubic-bezier(0.4, 0, 0.2, 1) forwards;
}

/* Local @keyframes fadeInUp removed. */

/* Mobile Responsive */
@media (max-width: 575.98px) {
  .organizer-rating-form {
    margin: 0 0.25rem; /* Reduced margin */
  }
  
  .card-header,
  .card-body {
    padding: 0.75rem 1rem; /* Adjusted padding */
  }
  
  .rating-stars {
    gap: 0.25rem;
    padding: 0.5rem;
  }
  
  .star-rating {
    font-size: 1.4rem; /* Further reduce star size */
  }
  
  .star-rating:hover {
    transform: scale(1.1) rotate(-3deg);
  }
  
  .rating-submit-btn.btn-primary {
    width: 100%;
  }
  
  .form-control {
    font-size: 0.85rem; /* Smaller font for textarea */
    padding: 0.5rem 0.75rem;
  }
}

/* Extra small screens */
@media (max-width: 374px) {
  .rating-stars {
    gap: 0.15rem;
  }
  
  .star-rating {
    font-size: 1.3rem;
  }
  
  .card-header,
  .card-body {
    padding: 0.6rem 0.75rem;
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
