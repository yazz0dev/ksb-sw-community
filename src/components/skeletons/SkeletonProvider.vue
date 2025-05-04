<template>
  <div class="skeleton-provider">
    <component
      v-if="loading"
      :is="skeletonComponent"
      v-bind="skeletonProps"
    />
    <slot v-else />
    <!-- Offline indicator -->
    <div v-if="!isOnline || hasQueuedActions" 
         class="connection-status"
         :class="{ 'has-queue': hasQueuedActions }">
      <span class="badge" :class="statusClass">
        <i class="fas" :class="statusIcon"></i>
        {{ statusMessage }}
        <small v-if="queueCount" class="ms-1">({{ queueCount }} pending)</small>
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useAppStore } from '@/store/app';

interface Props {
  loading: boolean;
  skeletonComponent: object | Function;
  skeletonProps?: Record<string, any>;
}

const props = withDefaults(defineProps<Props>(), {
  skeletonProps: () => ({})
});

const appStore = useAppStore();

const isOnline = computed(() => appStore.isOnline);
const hasQueuedActions = computed(() => appStore.offlineQueue.actions.length > 0);
const queueCount = computed(() => appStore.offlineQueue.actions.length);

const statusClass = computed(() => ({
  'bg-warning text-dark': !isOnline.value,
  'bg-info text-white': isOnline.value && hasQueuedActions.value
}));

const statusIcon = computed(() => ({
  'fa-wifi-slash': !isOnline.value,
  'fa-clock': isOnline.value && hasQueuedActions.value
}));

const statusMessage = computed((): string => {
  if (!isOnline.value) return 'Working Offline';
  if (hasQueuedActions.value) return 'Syncing Changes';
  return '';
});
</script>

<style scoped>
.skeleton-provider {
  position: relative;
}

.connection-status {
  position: fixed;
  bottom: 1rem;
  right: 1rem;
  z-index: 1050;
  transition: all 0.3s ease-in-out;
}

.connection-status.has-queue {
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
}

.offline-indicator {
  position: fixed;
  bottom: 1rem;
  right: 1rem;
  z-index: 1000;
  animation: fadeIn 0.3s ease-in-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
