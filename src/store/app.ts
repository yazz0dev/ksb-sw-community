// src/store/app.ts
import { defineStore } from 'pinia';
import { AppState, QueuedAction } from '@/types/store';
import { disableNetwork, enableNetwork } from 'firebase/firestore';
import { db } from '../firebase'; // Adjusted path

// TODO: Import other Pinia stores once they are created (e.g., useEventStore, useSubmissionStore)
// import { useEventStore } from './events'; // Example
// import { useSubmissionStore } from './submissions'; // Example

export const useAppStore = defineStore('app', {
  // State definition from state.ts
  state: (): AppState => ({
    // isOnline is now part of networkStatus
    lastSyncTimestamp: null,
    cacheExpiration: 30 * 60 * 1000, // 30 minutes
    eventClosed: {},
    // pendingOfflineChanges is now offlineQueue.actions
    // notifications are handled in notification store
    offlineQueue: {
      actions: [],
      lastSyncAttempt: null,
      syncInProgress: false,
      failedActions: [],
      supportedTypes: [ // Keep supported types definition
        'submissions/addSubmission', // TODO: Update these to Pinia action names (e.g., 'submission/addSubmission')
        'events/rateTeam',           // TODO: Update (e.g., 'event/rateTeam')
        'events/submitFeedback'      // TODO: Update (e.g., 'event/submitFeedback')
      ],
      lastError: null, // Added from type definition
    },
    networkStatus: {
      online: navigator.onLine,
      lastChecked: Date.now(),
      lastOnline: navigator.onLine ? Date.now() : undefined, // Initialize based on current status
      lastOffline: !navigator.onLine ? Date.now() : undefined, // Initialize based on current status
      reconnectAttempts: 0,
    },
    // These seem redundant or specific to Vuex structure, review if needed for Pinia
    // offlineCapabilities: {
    //   rating: true,
    //   submission: true,
    //   eventRequest: false,
    // },
    // supportedOfflineActions: [
    //   'events/rateTeam',
    //   'events/submitProjectRating',
    //   'submissions/addSubmission'
    // ]
  }),

  // Getters definition from getters.ts
  getters: {
    isOnline: (state): boolean => state.networkStatus.online,
    hasPendingOfflineChanges: (state): boolean => state.offlineQueue.actions.length > 0,
    pendingOfflineChangesCount: (state): number => state.offlineQueue.actions.length,
    isCacheValid: (state): boolean => {
      if (!state.lastSyncTimestamp) return false;
      const now = Date.now();
      return (now - state.lastSyncTimestamp) < state.cacheExpiration;
    },
    // Getter that returns a function
    isEventClosed: (state) => {
      return (eventId: string): boolean => !!state.eventClosed[eventId];
    },
    // Expose supported types if needed elsewhere
    supportedOfflineActionTypes: (state): string[] => state.offlineQueue.supportedTypes,
  },

  // Actions definition from actions.ts (mutations integrated)
  actions: {
    // --- Network Status Actions ---
    setOnlineStatus(isOnline: boolean) {
      this.networkStatus.online = isOnline;
      this.networkStatus.lastChecked = Date.now();
      if (isOnline) {
        this.networkStatus.lastOnline = Date.now();
        this.networkStatus.reconnectAttempts = 0; // Reset attempts on reconnect
      } else {
        this.networkStatus.lastOffline = Date.now();
      }
      // Toggle Firebase network connection based on status
      this.toggleNetworkConnection();
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
    // Note: These add global listeners. Ensure they are called appropriately (e.g., once in main.ts or App.vue)
    initOfflineCapabilities() {
      try {
        window.addEventListener('online', () => {
          this.setOnlineStatus(true);
          this.syncOfflineChanges(); // Trigger sync when coming online
        });

        window.addEventListener('offline', () => {
          this.setOnlineStatus(false);
        });

        // Set initial status
        this.setOnlineStatus(navigator.onLine);
        console.log('Offline listeners initialized.');
      } catch (error) {
        console.error('Error setting up offline listeners:', error);
      }
    },

    // monitorNetworkStatus() is effectively covered by initOfflineCapabilities now.

    // --- Offline Queue Actions ---
    addOfflineChange(change: QueuedAction) {
      this.offlineQueue.actions.push(change);
    },

    removeQueuedAction(actionId: string) {
      this.offlineQueue.actions = this.offlineQueue.actions.filter(a => a.id !== actionId);
    },

    clearOfflineChanges() {
      this.offlineQueue.actions = [];
      this.offlineQueue.failedActions = []; // Also clear failed actions
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
      // Avoid adding duplicates if sync is retried
      if (!this.offlineQueue.failedActions.some(fa => fa.id === action.id)) {
         this.offlineQueue.failedActions.push(action);
      }
      this.offlineQueue.lastError = action.error; // Store the latest error
    },

    setOfflineQueueLastError(error: string | null) {
      this.offlineQueue.lastError = error;
    },

    /**
     * Attempts to queue an action if offline, or throws if not supported offline.
     * @param type The action type (e.g., 'event/rateTeam')
     * @param payload The action payload
     * @returns { queued: boolean } indicating if the action was queued.
     * @throws Error if the action type is not supported offline.
     */
    async handleOfflineAction({ type, payload }: { type: string; payload: any }): Promise<{ queued: boolean }> {
      if (this.isOnline) {
        // If online, don't queue, let the original action proceed
        return { queued: false };
      }

      // If offline, check if supported
      const supported = this.offlineQueue.supportedTypes || [];
      if (supported.includes(type)) {
        const id = `queued_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        this.addOfflineChange({ id, type, payload, timestamp: Date.now() });
        console.log(`Action ${type} queued for offline execution.`);
        return { queued: true };
      } else {
        console.warn(`Action ${type} cannot be performed offline.`);
        throw new Error(`Action ${type} cannot be performed offline`);
      }
    },

    /**
     * Processes the offline queue, replaying actions if online.
     */
    async syncOfflineChanges() {
      if (this.offlineQueue.syncInProgress || !this.isOnline || this.offlineQueue.actions.length === 0) {
        if(this.offlineQueue.syncInProgress) console.log("Sync already in progress.");
        if(!this.isOnline) console.log("Cannot sync, currently offline.");
        if(this.offlineQueue.actions.length === 0) console.log("No offline actions to sync.");
        return;
      }

      console.log(`Starting sync for ${this.offlineQueue.actions.length} offline actions.`);
      this.setOfflineQueueSyncing(true);
      this.setOfflineQueueLastError(null); // Clear last error before sync

      // TODO: Get instances of other stores needed for dispatching
      // const eventStore = useEventStore();
      // const submissionStore = useSubmissionStore();

      // Iterate over a copy
      const actionsToProcess = [...this.offlineQueue.actions];
      for (const action of actionsToProcess) {
        try {
          console.log(`Attempting to replay action: ${action.type}`);
          // TODO: Replace this switch with actual calls to actions in other Pinia stores
          switch (action.type) {
             case 'events/rateTeam': // Example old name
             case 'event/rateTeam': // Example new name
               // await eventStore.rateTeam(action.payload); // Example call
               console.warn(`TODO: Implement replay logic for ${action.type}`);
               break;
             case 'submissions/addSubmission': // Example old name
             case 'submission/addSubmission': // Example new name
               // await submissionStore.addSubmission(action.payload); // Example call
               console.warn(`TODO: Implement replay logic for ${action.type}`);
               break;
             case 'events/submitFeedback': // Example old name
             case 'event/submitFeedback': // Example new name
                // await eventStore.submitFeedback(action.payload); // Example call
                console.warn(`TODO: Implement replay logic for ${action.type}`);
                break;
             default:
               console.warn(`Unknown action type in offline queue: ${action.type}`);
               // Optionally mark as failed or skip
               throw new Error(`Unknown action type: ${action.type}`);
          }
          console.log(`Successfully replayed action: ${action.type} (${action.id})`);
          this.removeQueuedAction(action.id); // Remove from queue on success
        } catch (error: any) {
          console.error(`Failed to replay action ${action.type} (${action.id}):`, error);
          // Add to failed actions and remove from main queue
          this.addFailedAction({ ...action, error: error?.message || 'Unknown replay error' });
          this.removeQueuedAction(action.id);
        }
      }

      this.setOfflineQueueSyncing(false);
      this.setOfflineQueueLastSync(Date.now());
      console.log("Offline sync completed.");
      if(this.offlineQueue.failedActions && this.offlineQueue.failedActions.length > 0) {
          console.warn(`${this.offlineQueue.failedActions.length} actions failed to sync. Check failedActions state.`);
      }
    },

    /**
     * Checks network status and triggers sync if online and queue has items.
     */
    async checkNetworkAndSync() {
      const online = navigator.onLine;
      // No need to call setOnlineStatus here as the event listener already does
      if (online !== this.isOnline) {
         this.setOnlineStatus(online); // Update if status differs from listener
      }

      if (online && this.hasPendingOfflineChanges) {
        console.log("Network check: Online with pending changes, triggering sync.");
        await this.syncOfflineChanges();
      } else if (online) {
         console.log("Network check: Online, no pending changes.");
      } else {
         console.log("Network check: Offline.");
      }
    },

    // --- Event Closed State ---
    setEventClosedState({ eventId, isClosed }: { eventId: string; isClosed: boolean }) {
      // Direct state mutation
      this.eventClosed = { ...this.eventClosed, [eventId]: isClosed };
    },
  },
});
