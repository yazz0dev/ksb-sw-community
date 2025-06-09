// src/components/shared/OfflineStateHandler.vue
<template>
  <!-- Top Offline Banner -->
  <div v-if="!isOnline" class="offline-banner alert alert-warning" role="alert">
    <i class="fas fa-wifi-slash me-2"></i>
    You're offline. Some features may be limited.
  </div>

  <!-- Bottom Status Bar -->
  <div 
    v-if="!isOnline || hasQueuedActions"
    class="offline-status-bar animate-slide-up"
    :class="{ 
      'status-offline': !isOnline,
      'status-queued': hasQueuedActions && isOnline 
    }"
  >
    <div class="container-fluid">
      <div class="status-content d-flex justify-content-between align-items-center">
        <!-- Status Info -->
        <div class="status-info d-flex align-items-center">
          <div class="status-icon me-3">
            <i class="fas" :class="statusIcon"></i>
          </div>
          <div class="status-details">
            <span class="status-message">{{ statusMessage }}</span>
            <div v-if="hasQueuedActions" class="status-submessage">
              {{ queuedActionsCount }} action{{ queuedActionsCount === 1 ? '' : 's' }} waiting to sync
            </div>
          </div>
        </div>
        
        <!-- Connection Check Button (when offline) -->
        <div v-if="!isOnline" class="check-connection-section me-2">
          <button
            @click="checkConnection"
            class="btn btn-sm btn-outline-light d-inline-flex align-items-center"
            :disabled="isCheckingConnection"
          >
            <span v-if="isCheckingConnection" class="spinner-border spinner-border-sm me-2" role="status">
              <span class="visually-hidden">Checking...</span>
            </span>
            <i v-else class="fas fa-network-wired me-2"></i>
            <span>Check Connection</span>
          </button>
        </div>
        
        <!-- Sync Button -->
        <div v-if="canSync" class="sync-section">
          <button
            @click="syncNow"
            class="btn btn-sm btn-sync d-inline-flex align-items-center"
            :disabled="isSyncing"
            :class="{ 'btn-syncing': isSyncing }"
          >
            <span v-if="isSyncing" class="spinner-border spinner-border-sm me-2" role="status">
              <span class="visually-hidden">Syncing...</span>
            </span>
            <i v-else class="fas fa-sync-alt me-2"></i>
            <span class="sync-text">{{ isSyncing ? 'Syncing...' : 'Sync Now' }}</span>
          </button>
        </div>
      </div>
      
      <!-- Progress Bar for Syncing -->
      <div v-if="isSyncing" class="sync-progress">
        <div class="progress-bar"></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useAppStore } from '@/stores/appStore';
// QueuedAction should be imported from types/store.ts if it's shared
// For this component, it doesn't directly use the QueuedAction type in its script,
// but relies on appStore which uses it.

const appStore = useAppStore();
const isCheckingConnection = ref(false);

const isOnline = computed<boolean>(() => appStore.isOnline);
// Accessing the reactive ref directly from the store
const hasQueuedActions = computed<boolean>(() => appStore.offlineQueue.actions.length > 0);
const isSyncing = computed<boolean>(() => appStore.offlineQueue.isSyncing); // Corrected path

const queuedActionsCount = computed<number>(() => appStore.offlineQueue.actions.length);

const statusMessage = computed<string>(() => {
  if (!isOnline.value) return 'You are currently offline';
  if (hasQueuedActions.value) {
    return 'Connection restored';
  }
  return '';
});

const statusIcon = computed<string>(() => {
  if (isSyncing.value) return 'fa-sync-alt fa-spin';
  if (!isOnline.value) return 'fa-wifi-slash';
  if (hasQueuedActions.value) return 'fa-clock';
  return 'fa-check-circle';
});

const canSync = computed<boolean>(() => isOnline.value && hasQueuedActions.value && !isSyncing.value);

const syncNow = (): void => {
  appStore.syncOfflineActions(); // Corrected method name
};

// New method to manually check connection
const checkConnection = async (): Promise<void> => {
  isCheckingConnection.value = true;
  try {
    // Use fetch API to check for connectivity by pinging a reliable endpoint
    const response = await fetch('/api/health-check', { 
      method: 'HEAD',
      // Cache-busting to prevent cached responses
      headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' },
      cache: 'no-store'
    });
    
    if (response.ok) {
      // If fetch succeeds, we're online
      appStore.$patch({ isOnline: true });
    }
  } catch (error) {
    // If fetch fails, we're still offline
    // No need to update offline state as it's already set to false
  } finally {
    isCheckingConnection.value = false;
  }
};
</script>

<style scoped>
/* Offline Banner */
.offline-banner {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1060;
  margin: 0;
  text-align: center;
  border-radius: 0;
}

/* Offline Status Bar */
.offline-status-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 1050;
  padding: 0.75rem 0;
  backdrop-filter: blur(10px);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease-in-out;
}

/* Status Variants */
.status-offline {
  background: linear-gradient(135deg, var(--bs-danger), var(--bs-danger-emphasis));
  color: var(--bs-white);
}

.status-queued {
  background: linear-gradient(135deg, var(--bs-warning), var(--bs-warning-emphasis));
  color: var(--bs-dark);
}

/* Status Content */
.status-content {
  gap: 1rem;
}

/* Status Info */
.status-info {
  min-width: 0; /* Allow text truncation */
}

.status-icon {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  backdrop-filter: blur(5px);
}

.status-offline .status-icon {
  background: rgba(255, 255, 255, 0.2);
}

.status-queued .status-icon {
  background: rgba(0, 0, 0, 0.1);
}

.status-details {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.status-message {
  font-weight: 600;
  font-size: 0.95rem;
  line-height: 1.2;
}

.status-submessage {
  font-size: 0.8rem;
  opacity: 0.9;
  margin-top: 0.1rem;
}

.status-offline .status-submessage {
  color: rgba(255, 255, 255, 0.8);
}

.status-queued .status-submessage {
  color: var(--bs-dark);
  opacity: 0.7;
}

/* Sync Section */
.sync-section {
  flex-shrink: 0;
}

.btn-sync {
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: inherit;
  font-weight: 600;
  transition: all 0.3s ease;
  backdrop-filter: blur(5px);
  min-width: 100px;
}

.btn-sync:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.3);
  border-color: rgba(255, 255, 255, 0.5);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.btn-sync:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.status-queued .btn-sync {
  background: rgba(0, 0, 0, 0.1);
  border-color: rgba(0, 0, 0, 0.2);
  color: var(--bs-dark);
}

.status-queued .btn-sync:hover:not(:disabled) {
  background: rgba(0, 0, 0, 0.15);
  border-color: rgba(0, 0, 0, 0.3);
}

.btn-sync.btn-syncing {
  cursor: progress;
}

.sync-text {
  font-size: 0.85rem;
}

/* Sync Progress */
.sync-progress {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: rgba(255, 255, 255, 0.2);
  overflow: hidden;
}

.sync-progress .progress-bar {
  height: 100%;
  background: rgba(255, 255, 255, 0.6);
  animation: syncProgress 2s infinite;
}

.status-queued .sync-progress .progress-bar {
  background: rgba(0, 0, 0, 0.3);
}

/* Responsive Design */
@media (max-width: 768px) {
  .offline-status-bar {
    padding: 0.5rem 0;
  }
  
  .status-content {
    flex-direction: column;
    align-items: flex-start !important;
    gap: 0.75rem;
  }
  
  .status-info {
    width: 100%;
  }
  
  .status-icon {
    width: 2rem;
    height: 2rem;
    margin-right: 0.75rem !important;
  }
  
  .status-message {
    font-size: 0.9rem;
  }
  
  .status-submessage {
    font-size: 0.75rem;
  }
  
  .sync-section {
    width: 100%;
  }
  
  .btn-sync {
    width: 100%;
    justify-content: center;
  }
}

@media (max-width: 480px) {
  .status-content {
    gap: 0.5rem;
  }
  
  .status-info {
    flex-direction: column;
    align-items: flex-start !important;
    gap: 0.5rem;
  }
  
  .status-icon {
    margin-right: 0 !important;
    align-self: flex-start;
  }
  
  .status-details {
    width: 100%;
  }
  
  .status-message {
    font-size: 0.85rem;
  }
  
  .status-submessage {
    font-size: 0.7rem;
  }
  
  .sync-text {
    font-size: 0.8rem;
  }
}

/* Animations */
@keyframes syncProgress {
  0% {
    transform: translateX(-100%);
  }
  50% {
    transform: translateX(0%);
  }
  100% {
    transform: translateX(100%);
  }
}

.animate-slide-up {
  animation: slideUp 0.4s ease-out;
}

@keyframes slideUp {
  from {
    transform: translateY(100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

/* Focus states for accessibility */
.btn-sync:focus {
  outline: 2px solid rgba(255, 255, 255, 0.5);
  outline-offset: 2px;
}

.btn-sync:focus:not(:focus-visible) {
  outline: none;
}

/* High contrast mode support */
@media (prefers-contrast: high) {
  .offline-status-bar {
    border-top-width: 2px;
  }
  
  .status-icon {
    border: 1px solid currentColor;
  }
  
  .btn-sync {
    border-width: 2px;
  }
}
</style>