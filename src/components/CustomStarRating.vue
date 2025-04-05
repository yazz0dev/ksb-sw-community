// src/components/CustomStarRating.vue
<template>
  <div
    class="inline-flex items-center leading-none"
    @mouseleave="!readOnly ? (hoverRating = 0) : null"
  >
    <span
      v-for="starIndex in maxRating"
      :key="starIndex"
      class="inline-block transition-colors duration-100 ease-in-out"
      :style="starStyle(starIndex)"
      @mouseover="!readOnly ? (hoverRating = starIndex) : null"
      @click="!readOnly ? setRating(starIndex) : null"
    >
      <i class="fas fa-star block"></i>
    </span>
  </div>
</template>

<script setup>
import { ref } from 'vue';

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
    default: 'var(--color-warning)', // Use CSS variable for warning color
  },
  inactiveColor: { // Color for unselected stars
    type: String,
    default: 'var(--color-border)', // Use CSS variable for border/inactive color
  },
  starSize: { // Size in pixels
    type: Number,
    default: 20, // Adjusted default size
  },
  starSpacing: { // Gap between stars in pixels
      type: Number,
      default: 2, // Adjusted default spacing
  }
});

const emit = defineEmits(['update:modelValue']);

// Internal state for hover effect
const hoverRating = ref(0);

// --- Methods ---

// Determine the color of an individual star based on hover and modelValue
const starStyle = (starIndex) => {
  // --- DEBUG LOG --- 
  console.log(`starStyle(${starIndex}): hover=${hoverRating.value}, modelValue=${props.modelValue}`);
  // --- END DEBUG LOG ---

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
