// src/store/app/mutations.ts
import { AppState, Notification, QueuedAction } from '@/types/store';

export const appMutations = {
  // --- Offline Queue Mutations ---
  addOfflineChange(state: AppState, change: QueuedAction) {
    state.offlineQueue.actions.push(change);
  },

  // --- FIX: Added removeQueuedAction mutation ---
  removeQueuedAction(state: AppState, actionId: string) {
      state.offlineQueue.actions = state.offlineQueue.actions.filter(a => a.id !== actionId);
  },
  // --- END FIX ---

  clearOfflineChanges(state: AppState) {
    state.offlineQueue.actions = [];
  },

  setOfflineQueueSyncing(state: AppState, syncing: boolean) {
    state.offlineQueue.syncInProgress = syncing;
  },

  setOfflineQueueLastSync(state: AppState, timestamp: number | null) {
    state.offlineQueue.lastSyncAttempt = timestamp;
  },

  addFailedAction(state: AppState, action: QueuedAction & { error: string }) { // Add error type
    if (!state.offlineQueue.failedActions) {
        state.offlineQueue.failedActions = [];
    }
    state.offlineQueue.failedActions.push(action);
  },

  setOfflineQueueLastError(state: AppState, error: string | null) {
      state.offlineQueue.lastError = error;
  },

  // --- Network Status Mutations ---
  setOnlineStatus(state: AppState, isOnline: boolean) {
    state.networkStatus.online = isOnline;
    state.networkStatus.lastChecked = Date.now();
  },

  // --- Event Closed State ---
setEventClosed(state: AppState, { eventId, isClosed }: { eventId: string; isClosed: boolean }) {
  state.eventClosed = { ...state.eventClosed, [eventId]: isClosed };
},

  // --- Aliases for legacy mutation names (Remove if not needed) ---
SET_ONLINE_STATUS(state: AppState, isOnline: boolean) {
  // This directly calls the main mutation now
  appMutations.setOnlineStatus(state, isOnline);
},
};