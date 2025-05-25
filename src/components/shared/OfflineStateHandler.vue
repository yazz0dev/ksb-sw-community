// src/components/shared/OfflineStateHandler.vue
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
import { useAppStore } from '@/stores/appStore';
// QueuedAction should be imported from types/store.ts if it's shared
// For this component, it doesn't directly use the QueuedAction type in its script,
// but relies on appStore which uses it.

const appStore = useAppStore();

const isOnline = computed<boolean>(() => appStore.isOnline);
// Accessing the reactive ref directly from the store
const hasQueuedActions = computed<boolean>(() => appStore.offlineQueue.actions.length > 0);
const isSyncing = computed<boolean>(() => appStore.offlineQueue.isSyncing); // Corrected path

const statusMessage = computed<string>(() => {
  if (!isOnline.value) return 'You are currently offline';
  if (hasQueuedActions.value) {
    // Accessing the reactive ref directly
    return `${appStore.offlineQueue.actions.length} action(s) pending sync`;
  }
  return '';
});

const canSync = computed<boolean>(() => isOnline.value && hasQueuedActions.value && !isSyncing.value);

const syncNow = (): void => {
  appStore.syncOfflineActions(); // Corrected method name
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