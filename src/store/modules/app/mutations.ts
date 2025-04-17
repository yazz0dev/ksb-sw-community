import { AppState, Notification, QueuedAction } from '@/types/store';

export const appMutations = {
  // --- Offline Queue Mutations ---
  addOfflineChange(state: AppState, change: QueuedAction) {
    state.offlineQueue.actions.push(change); // Use offlineQueue.actions
  },

  clearOfflineChanges(state: AppState) {
    state.offlineQueue.actions = []; // Use offlineQueue.actions
  },

  setOfflineQueueSyncing(state: AppState, syncing: boolean) {
    state.offlineQueue.syncInProgress = syncing;
  },

  setOfflineQueueLastSync(state: AppState, timestamp: number | null) {
    state.offlineQueue.lastSyncAttempt = timestamp; // Use correct property
  },

  addFailedAction(state: AppState, action: QueuedAction) {
    if (!state.offlineQueue.failedActions) {
        state.offlineQueue.failedActions = []; // Initialize if undefined
    }
    state.offlineQueue.failedActions.push(action); // Use correct property
  },

  setOfflineQueueLastError(state: AppState, error: string | null) {
      state.offlineQueue.lastError = error; // Use correct property
  },

  // --- Notification Mutations ---
  addNotification(state: AppState, notification: Omit<Notification, 'id'>) {
    const newNotification: Notification = {
      ...notification,
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      title: notification.title || '', // Ensure title exists
    };
    state.notifications.push(newNotification); // Use notifications property
  },

  dismissNotification(state: AppState, notificationId: string) {
    state.notifications = state.notifications.filter((n: Notification) => n.id !== notificationId); // Use notifications property, type n
  },

  clearAllNotifications(state: AppState) {
    state.notifications = []; // Use notifications property
  },

  // --- Network Status Mutations ---
  setOnlineStatus(state: AppState, isOnline: boolean) {
    state.networkStatus.online = isOnline;
    state.networkStatus.lastChecked = Date.now(); // Use correct property
  },

  // --- Cache Status Mutations ---
  setLastSyncTimestamp(state: AppState, timestamp: number | null) {
    state.lastSyncTimestamp = timestamp;
  },

  // --- Event Closed State ---
  setEventClosed(state: AppState, { eventId, isClosed }: { eventId: string; isClosed: boolean }) {
    state.eventClosed = { ...state.eventClosed, [eventId]: isClosed };
  },

  // --- Aliases for legacy mutation names (for compatibility) ---
  SET_ONLINE_STATUS(state: AppState, isOnline: boolean) {
    state.networkStatus.online = isOnline;
    state.networkStatus.lastChecked = Date.now();
  },
  SET_LAST_SYNC_TIMESTAMP(state: AppState, timestamp: number | null) {
    state.lastSyncTimestamp = timestamp;
  },
};