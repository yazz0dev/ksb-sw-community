<template>
  <div v-if="!isOnline || hasQueuedActions" 
       class="offline-status-bar" 
       :class="{ 'has-queued': hasQueuedActions }">
    <div class="container-fluid">
      <div class="d-flex justify-content-between align-items-center">
        <span>
          <i class="fas" :class="isOnline ? 'fa-clock' : 'fa-wifi-slash'"></i>
          {{ statusMessage }}
        </span>
        <button v-if="canSync" 
                @click="syncNow" 
                class="btn btn-sm btn-light"
                :disabled="isSyncing">
          <span v-if="isSyncing" class="spinner-border spinner-border-sm me-1"></span>
          {{ isSyncing ? 'Syncing...' : 'Sync Now' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useAppStore } from '@/store/studentAppStore';

interface QueuedAction {
  type: string;
  payload: any;
  timestamp: number;
}
 
const appStore = useAppStore();
 
const isOnline = computed<boolean>(() => appStore.isOnline);
const hasQueuedActions = computed<boolean>(() => appStore.offlineQueue.actions.length > 0);
const isSyncing = computed<boolean>(() => appStore.isSyncing);

const statusMessage = computed<string>(() => {
  if (!isOnline.value) return 'You are currently offline';
  if (hasQueuedActions.value) {
    return `${appStore.offlineQueue.actions.length} action(s) pending sync`;
  }
  return '';
});

const canSync = computed<boolean>(() => isOnline.value && hasQueuedActions.value && !isSyncing.value);

const syncNow = (): void => {
  appStore.syncOfflineChanges();
};
</script>

<style scoped>
.offline-status-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background-color: var(--bs-danger);
  color: white;
  padding: 0.5rem;
  z-index: 1050;
  transition: transform 0.3s ease-in-out;
}

.offline-status-bar.has-queued {
  background-color: var(--bs-warning);
  color: var(--bs-dark);
}
</style>
