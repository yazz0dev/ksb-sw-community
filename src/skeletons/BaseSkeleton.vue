<template>
  <div
    class="skeleton-loader"
    :class="[
      `skeleton-${type}`,
      animated && 'skeleton-animated',
      rounded && 'skeleton-rounded',
      className
    ]"
    :style="{
      width: type === 'avatar' ? size : width,
      height: type === 'avatar' ? size : height,
      borderRadius: rounded ? 'var(--bs-border-radius-pill)' : borderRadius
    }"
  ></div>
</template>

<script setup lang="ts">
type SkeletonType = 'text' | 'block' | 'circle' | 'image' | 'avatar';

interface Props {
  type: SkeletonType;
  width?: string;
  height?: string;
  animated?: boolean;
  borderRadius?: string;
  className?: string;
  rounded?: boolean;
  size?: string; // For avatar/circle types
}

withDefaults(defineProps<Props>(), {
  type: 'block',
  width: '100%',
  height: '1rem',
  animated: true,
  borderRadius: 'var(--bs-border-radius-sm)', // Use Bootstrap variable
  className: '',
  rounded: false,
  size: '2rem'
});
</script>

<style lang="scss" scoped>
.skeleton-loader {
  background: var(--bs-secondary-bg);
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
  animation: shimmer 2s infinite; // Using global 'shimmer' animation
  content: '';
}

.skeleton-circle,
.skeleton-avatar {
  border-radius: 50%;
}

.skeleton-image {
  border-radius: var(--bs-border-radius);
}

.skeleton-text {
  border-radius: var(--bs-border-radius-sm);
}

.skeleton-rounded {
  border-radius: var(--bs-border-radius-pill);
}
</style>