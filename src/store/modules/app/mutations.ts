import { AppState, Notification, QueuedAction } from '@/types/store';
import { MutationTree } from 'vuex';

const mutations: MutationTree<AppState> = {
  SET_ONLINE_STATUS(state, status: boolean): void {
    state.isOnline = status;
  },
  
  ADD_OFFLINE_CHANGE(state, change: { type: string; data: any; timestamp: number }): void {
    state.pendingOfflineChanges.push(change);
  },
  
  CLEAR_OFFLINE_CHANGES(state): void {
    state.pendingOfflineChanges = [];
  },
  
  SET_LAST_SYNC_TIMESTAMP(state, timestamp: number): void {
    state.lastSyncTimestamp = timestamp;
  },
  
  SET_EVENT_CLOSED_STATE(state, { eventId, isClosed }: { eventId: string; isClosed: boolean }): void {
    state.eventClosed = {
      ...state.eventClosed,
      [eventId]: isClosed
    };
  },
  
  ADD_NOTIFICATION(state, notification: Notification): void {
    const id = notification.id || Date.now().toString();
    state.notifications.push({
      id,
      type: notification.type || 'info',
      title: notification.title || '',
      message: notification.message,
      timeout: notification.timeout || 5000,
      timestamp: Date.now()
    });
  },
  
  REMOVE_NOTIFICATION(state, notificationId: string): void {
    state.notifications = state.notifications.filter(n => n.id !== notificationId);
  },
  
  CLEAR_ALL_NOTIFICATIONS(state): void {
    state.notifications = [];
  },

  queueOfflineAction(state, action: QueuedAction): void {
    state.offlineQueue.actions.push({
      ...action,
      timestamp: Date.now(),
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    });
  },
  
  removeQueuedAction(state, actionId: string): void {
    state.offlineQueue.actions = state.offlineQueue.actions.filter(
      action => action.id !== actionId
    );
  },
  
  setSyncStatus(state, { inProgress, lastAttempt = null }: { inProgress: boolean; lastAttempt?: number | null }): void {
    state.offlineQueue.syncInProgress = inProgress;
    if (lastAttempt) {
      state.offlineQueue.lastSyncAttempt = lastAttempt;
    }
  },
  
  addFailedAction(state, action: QueuedAction): void {
    state.offlineQueue.failedActions.push(action);
  },

  setNetworkStatus(state, { online }: { online: boolean }): void {
    state.networkStatus.online = online;
    state.networkStatus.lastChecked = Date.now();
  },

  clearQueuedAction(state, actionId: string): void {
    state.offlineQueue.actions = state.offlineQueue.actions
      .filter(action => action.id !== actionId);
  },

  setOfflineSync(state, { inProgress, error = null }: { inProgress: boolean; error?: string | null }): void {
    state.offlineQueue.syncInProgress = inProgress;
    if (error) {
      state.offlineQueue.lastError = error;
    }
  }
};

export default mutations;