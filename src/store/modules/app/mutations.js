// src/store/modules/app/mutations.js

export default {
  SET_ONLINE_STATUS(state, status) {
    state.isOnline = status;
  },
  
  ADD_OFFLINE_CHANGE(state, change) {
    state.pendingOfflineChanges.push(change);
  },
  
  CLEAR_OFFLINE_CHANGES(state) {
    state.pendingOfflineChanges = [];
  },
  
  SET_LAST_SYNC_TIMESTAMP(state, timestamp) {
    state.lastSyncTimestamp = timestamp;
  },
  
  SET_EVENT_CLOSED_STATE(state, { eventId, isClosed }) {
    state.eventClosed = {
      ...state.eventClosed,
      [eventId]: isClosed
    };
  },
  
  ADD_NOTIFICATION(state, notification) {
    // Generate a unique ID if not provided
    const id = notification.id || Date.now().toString();
    state.notifications.push({
      id,
      type: notification.type || 'info',
      title: notification.title || '',
      message: notification.message,
      timeout: notification.timeout || 5000, // Default 5 seconds
      timestamp: Date.now()
    });
  },
  
  REMOVE_NOTIFICATION(state, notificationId) {
    state.notifications = state.notifications.filter(n => n.id !== notificationId);
  },
  
  CLEAR_ALL_NOTIFICATIONS(state) {
    state.notifications = [];
  },

  queueOfflineAction(state, action) {
    state.offlineQueue.actions.push({
      ...action,
      timestamp: Date.now(),
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    });
  },
  
  removeQueuedAction(state, actionId) {
    state.offlineQueue.actions = state.offlineQueue.actions.filter(
      action => action.id !== actionId
    );
  },
  
  setSyncStatus(state, { inProgress, lastAttempt = null }) {
    state.offlineQueue.syncInProgress = inProgress;
    if (lastAttempt) {
      state.offlineQueue.lastSyncAttempt = lastAttempt;
    }
  },
  
  addFailedAction(state, action) {
    state.offlineQueue.failedActions.push(action);
  },

  setNetworkStatus(state, { online }) {
    state.networkStatus.online = online;
    state.networkStatus.lastChecked = Date.now();
  },

  clearQueuedAction(state, actionId) {
    state.offlineQueue.actions = state.offlineQueue.actions
      .filter(action => action.id !== actionId);
  },

  setOfflineSync(state, { inProgress, error = null }) {
    state.offlineQueue.syncInProgress = inProgress;
    if (error) {
      state.offlineQueue.lastError = error;
    }
  }
};
