// src/store/app.ts
import { defineStore } from 'pinia';
import { AppState, QueuedAction } from '@/types/store'; // Assuming types/store.ts defines AppState and QueuedAction
import { disableNetwork, enableNetwork } from 'firebase/firestore';
import { db } from '../firebase'; // Adjusted path

// Import other Pinia stores needed for dispatching actions during sync
// import { useEventStore } from './events'; // Example
// import { useSubmissionStore } from './submissions'; // Example
import { useNotificationStore } from './notification'; // Import notification store

export const useAppStore = defineStore('app', {
  // State definition from your previous state.ts
  state: (): AppState => ({
    lastSyncTimestamp: null,
    cacheExpiration: 30 * 60 * 1000, // 30 minutes
    eventClosed: {},
    offlineQueue: {
      actions: [],
      lastSyncAttempt: null,
      syncInProgress: false,
      failedActions: [],
      supportedTypes: [
        // Update these to Pinia action names (storeId/actionName)
        'event/submitTeamCriteriaVote', // Example: Team Rating
        'event/submitIndividualWinnerVote', // Example: Individual Rating
        'event/submitOrganizationRating', // Example: Organizer Rating
        'submission/submitProjectToEvent', // Example: Submission
        // Add other supported actions here
      ],
      lastError: null,
    },
    networkStatus: {
      online: typeof navigator !== 'undefined' ? navigator.onLine : true, // Handle SSR/Node env
      lastChecked: Date.now(),
      lastOnline: typeof navigator !== 'undefined' && navigator.onLine ? Date.now() : undefined,
      lastOffline: typeof navigator !== 'undefined' && !navigator.onLine ? Date.now() : undefined,
      reconnectAttempts: 0,
    },
    // Removed redundant/Vuex specific fields like offlineCapabilities, supportedOfflineActions
    // 'isOnline' and 'pendingOfflineChanges' are now getters or derived from state.networkStatus/state.offlineQueue
    // Notifications are handled by the notification store
  }),

  // Getters definition from your previous getters.ts
  getters: {
    isOnline: (state): boolean => state.networkStatus.online,
    hasPendingOfflineChanges: (state): boolean => state.offlineQueue.actions.length > 0,
    pendingOfflineChangesCount: (state): number => state.offlineQueue.actions.length,
    isSyncing: (state): boolean => state.offlineQueue.syncInProgress, // Added getter for sync status
    isCacheValid: (state): boolean => {
      if (!state.lastSyncTimestamp) return false;
      const now = Date.now();
      return (now - state.lastSyncTimestamp) < state.cacheExpiration;
    },
    // Getter that returns a function needs slight adjustment for 'this'
    isEventClosed: (state) => {
      return (eventId: string): boolean => !!state.eventClosed[eventId];
    },
    supportedOfflineActionTypes: (state): string[] => state.offlineQueue.supportedTypes,
  },

  // Actions integrate mutations from your previous actions.ts and mutations.ts
  actions: {
    // --- Network Status Actions ---
    setOnlineStatus(isOnline: boolean) {
      // Direct state mutation
      this.networkStatus.online = isOnline;
      this.networkStatus.lastChecked = Date.now();
      if (isOnline) {
        this.networkStatus.lastOnline = Date.now();
        this.networkStatus.reconnectAttempts = 0;
      } else {
        this.networkStatus.lastOffline = Date.now();
      }
      this.toggleNetworkConnection(); // Toggle Firebase connection
    },

    async toggleNetworkConnection() {
      try {
        if (this.networkStatus.online) {
          await enableNetwork(db);
          console.log('Firebase network connection enabled');
        } else {
          await disableNetwork(db);
          console.log('Firebase network connection disabled');
        }
      } catch (error) {
         console.error('Error toggling Firebase network connection:', error);
      }
    },

    // --- Initialization Actions ---
    initOfflineCapabilities() {
      // Ensure listeners are only added once
      if ((window as any).__offlineListenersInitialized) return;

      try {
        window.addEventListener('online', () => {
          this.setOnlineStatus(true);
          this.syncOfflineChanges();
        });

        window.addEventListener('offline', () => {
          this.setOnlineStatus(false);
        });

        // Set initial status
        this.setOnlineStatus(navigator.onLine);
        (window as any).__offlineListenersInitialized = true; // Mark as initialized
        console.log('Offline listeners initialized.');
      } catch (error) {
        console.error('Error setting up offline listeners:', error);
      }
    },

    // --- Offline Queue Actions ---
    addOfflineChange(change: QueuedAction) {
      this.offlineQueue.actions.push(change);
    },

    removeQueuedAction(actionId: string) {
      this.offlineQueue.actions = this.offlineQueue.actions.filter(a => a.id !== actionId);
    },

    clearOfflineChanges() {
      this.offlineQueue.actions = [];
      this.offlineQueue.failedActions = [];
      this.offlineQueue.lastError = null;
    },

    setOfflineQueueSyncing(syncing: boolean) {
      this.offlineQueue.syncInProgress = syncing;
    },

    setOfflineQueueLastSync(timestamp: number | null) {
      this.offlineQueue.lastSyncAttempt = timestamp;
    },

    addFailedAction(action: QueuedAction & { error: string }) {
      if (!this.offlineQueue.failedActions) {
        this.offlineQueue.failedActions = [];
      }
      if (!this.offlineQueue.failedActions.some(fa => fa.id === action.id)) {
         this.offlineQueue.failedActions.push(action);
      }
      this.offlineQueue.lastError = action.error;
    },

    setOfflineQueueLastError(error: string | null) {
      this.offlineQueue.lastError = error;
    },

    async handleOfflineAction({ type, payload }: { type: string; payload: any }): Promise<{ queued: boolean }> {
      if (this.isOnline) {
        return { queued: false }; // Execute immediately if online
      }

      const supported = this.offlineQueue.supportedTypes || [];
      if (supported.includes(type)) {
        const id = `queued_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        this.addOfflineChange({ id, type, payload, timestamp: Date.now() });
        console.log(`Action ${type} queued for offline execution.`);

        // Show notification that action is queued
        const notificationStore = useNotificationStore();
        notificationStore.showNotification({
            message: `Action queued (${type}). Will sync when online.`,
            type: 'info',
            duration: 3000
        });

        return { queued: true };
      } else {
        console.warn(`Action ${type} cannot be performed offline.`);
        throw new Error(`Action ${type} cannot be performed offline`);
      }
    },

    async syncOfflineChanges() {
      if (this.offlineQueue.syncInProgress || !this.isOnline || this.offlineQueue.actions.length === 0) {
        return;
      }

      console.log(`Starting sync for ${this.pendingOfflineChangesCount} offline actions.`);
      this.setOfflineQueueSyncing(true);
      this.setOfflineQueueLastError(null);

      const notificationStore = useNotificationStore();
      notificationStore.showNotification({
          message: `Syncing ${this.pendingOfflineChangesCount} offline changes...`,
          type: 'info',
          duration: 2000
      });

      // Import stores *inside* the action
      const { useEventStore } = await import('./events');
      // Add imports for other stores as needed (e.g., submissions)
      // const { useSubmissionStore } = await import('./submissions'); // Example

      const eventStore = useEventStore();
      // const submissionStore = useSubmissionStore(); // Example

      const actionsToProcess = [...this.offlineQueue.actions];
      let successCount = 0;
      let failCount = 0;

      for (const action of actionsToProcess) {
        try {
          console.log(`Attempting to replay action: ${action.type}`);
          const [storeId, actionName] = action.type.split('/'); // e.g., 'event/rateTeam'

          // Dispatch based on storeId and actionName
          switch (storeId) {
             case 'event':
               if (actionName in eventStore && typeof (eventStore as any)[actionName] === 'function') {
                  await (eventStore as any)[actionName](action.payload);
               } else { throw new Error(`Action ${actionName} not found in event store.`); }
               break;
            //  case 'submission': // Example for another store
            //    if (actionName in submissionStore && typeof (submissionStore as any)[actionName] === 'function') {
            //       await (submissionStore as any)[actionName](action.payload);
            //    } else { throw new Error(`Action ${actionName} not found in submission store.`); }
            //    break;
             default:
               throw new Error(`Unknown store identifier: ${storeId}`);
          }

          console.log(`Successfully replayed action: ${action.type} (${action.id})`);
          this.removeQueuedAction(action.id);
          successCount++;
        } catch (error: any) {
          console.error(`Failed to replay action ${action.type} (${action.id}):`, error);
          this.addFailedAction({ ...action, error: error?.message || 'Unknown replay error' });
          this.removeQueuedAction(action.id); // Remove from main queue even if failed
          failCount++;
        }
      }

      this.setOfflineQueueSyncing(false);
      this.setOfflineQueueLastSync(Date.now());
      console.log(`Offline sync completed. Success: ${successCount}, Failed: ${failCount}.`);

      if (failCount > 0) {
          notificationStore.showNotification({
              message: `Sync complete, but ${failCount} action(s) failed. Check logs.`,
              type: 'warning',
              duration: 5000
          });
          console.warn("Failed Actions:", this.offlineQueue.failedActions);
      } else if (successCount > 0) {
           notificationStore.showNotification({
              message: `Sync complete. ${successCount} action(s) processed.`,
              type: 'success',
              duration: 3000
           });
      }
    },

    async checkNetworkAndSync() {
      const online = navigator.onLine;
      if (online !== this.isOnline) {
         this.setOnlineStatus(online);
      }
      if (online && this.hasPendingOfflineChanges) {
        console.log("Network check: Online with pending changes, triggering sync.");
        await this.syncOfflineChanges();
      }
    },

    // --- Event Closed State ---
    setEventClosedState({ eventId, isClosed }: { eventId: string; isClosed: boolean }) {
      // Direct state mutation using Vue 3 reactivity (no spread needed for top-level)
      this.eventClosed[eventId] = isClosed;
    },
  },
});