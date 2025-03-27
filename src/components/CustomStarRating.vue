// src/components/CustomStarRating.vue
<template>
  <div
    class="custom-star-rating"
    @mouseleave="!readOnly ? (hoverRating = 0) : null"
  >
    <span
      v-for="starIndex in maxRating"
      :key="starIndex"
      class="star-item"
      :style="starStyle(starIndex)"
      @mouseover="!readOnly ? (hoverRating = starIndex) : null"
      @click="!readOnly ? setRating(starIndex) : null"
    >
      <i class="fas fa-star"></i>
    </span>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';

const props = defineProps({
  modelValue: { // Current rating value (for v-model)
    type: Number,
    default: 0, // Default to 0 stars selected
  },
  maxRating: { // Total number of stars
    type: Number,
    default: 5,
  },
  readOnly: { // Disable interaction
    type: Boolean,
    default: false,
  },
  activeColor: { // Color for selected/hovered stars
    type: String,
    default: 'var(--color-warning)', // Use CSS variable
  },
  inactiveColor: { // Color for unselected stars
    type: String,
    default: 'var(--color-border)', // Use CSS variable
  },
  starSize: { // Size in pixels
    type: Number,
    default: 35,
  },
  starSpacing: { // Gap between stars in pixels
      type: Number,
      default: 4,
  }
});

const emit = defineEmits(['update:modelValue']);

// Internal state for hover effect
const hoverRating = ref(0);

// --- Methods ---

// Determine the color of an individual star based on hover and modelValue
const starStyle = (starIndex) => {
  let color = props.inactiveColor; // Default to inactive

  // Determine the rating value to compare against (hover overrides modelValue)
  const compareRating = hoverRating.value > 0 ? hoverRating.value : props.modelValue;

  if (starIndex <= compareRating) {
    color = props.activeColor; // Set to active color if index is less than or equal
  }

  return {
    color: color,
    fontSize: `${props.starSize}px`,
    cursor: props.readOnly ? 'default' : 'pointer',
    marginRight: starIndex < props.maxRating ? `${props.starSpacing}px` : '0px' // Apply spacing except for last star
  };
};

// Set the rating when a star is clicked
const setRating = (starIndex) => {
  // If clicking the current rating, clear it (set to 0), otherwise set to clicked index
  const newValue = props.modelValue === starIndex ? 0 : starIndex;
  emit('update:modelValue', newValue);
};
</script>

<style scoped>
.custom-star-rating {
  display: inline-flex; /* Allows centering by parent */
  align-items: center;
  line-height: 1; /* Prevent extra space */
}

.star-item {
  display: inline-block;
  transition: color 0.1s ease-in-out; /* Smooth color transition */
  /* Spacing is now handled by inline style */
}
.star-item i {
   display: block; /* Ensures icon sizing is consistent */
}
</style>