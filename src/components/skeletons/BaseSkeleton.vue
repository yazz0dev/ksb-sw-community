<template>
  <div 
    class="skeleton-loader"
    :class="[
      `skeleton-${type}`,
      animated && 'skeleton-animated',
      className
    ]"
    :style="{
      width,
      height,
      borderRadius
    }"
  ></div>
</template>

<script setup>
defineProps({
  type: {
    type: String,
    default: 'block',
    validator: (value) => ['text', 'block', 'circle', 'image'].includes(value)
  },
  width: {
    type: String,
    default: '100%'
  },
  height: {
    type: String,
    default: '1rem'
  },
  animated: {
    type: Boolean,
    default: true
  },
  borderRadius: {
    type: String,
    default: '0.25rem'
  },
  className: {
    type: String,
    default: ''
  }
});
</script>

<style scoped>
.skeleton-loader {
  background: var(--bs-gray-200);
  position: relative;
  overflow: hidden;
}

.skeleton-animated::after {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  transform: translateX(-100%);
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0) 0,
    rgba(255, 255, 255, 0.2) 20%,
    rgba(255, 255, 255, 0.5) 60%,
    rgba(255, 255, 255, 0)
  );
  animation: shimmer 2s infinite;
  content: '';
}

@keyframes shimmer {
  100% {
    transform: translateX(100%);
  }
}

.skeleton-circle {
  border-radius: 50%;
}

.skeleton-image {
  border-radius: 0.5rem;
}

.skeleton-text {
  border-radius: 0.25rem;
}
</style>
