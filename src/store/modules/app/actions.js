// src/store/modules/app/actions.js
import { disableNetwork, enableNetwork } from 'firebase/firestore'; // Removed enableIndexedDbPersistence
import { db } from '../../../firebase';

export default {
  initOfflineCapabilities({ commit, state, dispatch }) { // Removed async as enableIndexedDbPersistence was the only async part
    // Persistence is now handled during Firestore initialization in firebase.js
    // We just need to set up the online/offline listeners here.
    try {
      // Set up online/offline listeners
      window.addEventListener('online', () => {
        commit('SET_ONLINE_STATUS', true);
        dispatch('syncOfflineChanges');
      });
      
      window.addEventListener('offline', () => {
        commit('SET_ONLINE_STATUS', false);
      });
      
      // Set initial online status
      commit('SET_ONLINE_STATUS', navigator.onLine);
      
      // Initial sync timestamp
      commit('SET_LAST_SYNC_TIMESTAMP', Date.now());
      console.log('Offline listeners initialized.'); // Added log for clarity
    } catch (error) {
      // Handle potential errors setting up listeners, though less likely
      console.error('Error setting up offline listeners:', error);
    }
  },

  async toggleNetworkConnection({ commit, state }) {
    if (state.isOnline) {
      await enableNetwork(db);
      console.log('Firebase network connection enabled');
    } else {
      await disableNetwork(db);
      console.log('Firebase network connection disabled');
    }
  },

  async syncOfflineChanges({ state, commit, dispatch }) {
    if (state.offlineQueue.syncInProgress || !navigator.onLine) return;

    commit('setSyncStatus', { inProgress: true });
    
    for (const action of state.offlineQueue.actions) {
      try {
        await dispatch(action.type, action.payload, { root: true });
        commit('removeQueuedAction', action.id);
      } catch (error) {
        commit('addFailedAction', { ...action, error: error.message });
        console.error('Sync failed for action:', action, error);
      }
    }

    commit('setSyncStatus', { 
      inProgress: false, 
      lastAttempt: Date.now() 
    });
  },

  monitorNetworkStatus({ commit, dispatch }) {
    window.addEventListener('online', () => {
      commit('setNetworkStatus', { online: true });
      dispatch('syncOfflineChanges');
    });

    window.addEventListener('offline', () => {
      commit('setNetworkStatus', { online: false });
    });
  },

  recordOfflineChange({ commit }, { type, data }) {
    commit('ADD_OFFLINE_CHANGE', { type, data, timestamp: Date.now() });
  },

  updateLastSyncTimestamp({ commit }) {
    commit('SET_LAST_SYNC_TIMESTAMP', Date.now());
  },

  setEventClosedState({ commit }, { eventId, isClosed }) {
    commit('SET_EVENT_CLOSED_STATE', { eventId, isClosed });
  },

  // Notification system actions
  showNotification({ commit, dispatch }, notification) {
    // Validate required fields
    if (!notification.message) {
      console.error('Notification message is required');
      return;
    }

    // Generate a unique ID for this notification
    const id = Date.now().toString();
    const notificationWithId = { ...notification, id };
    
    // Add notification to state
    commit('ADD_NOTIFICATION', notificationWithId);
    
    // Auto-dismiss after timeout if specified
    if (notification.timeout !== 0) { // 0 means don't auto-dismiss
      const timeout = notification.timeout || 5000; // Default 5 seconds
      setTimeout(() => {
        dispatch('dismissNotification', id);
      }, timeout);
    }
    
    return id; // Return ID for potential manual dismissal
  },
  
  dismissNotification({ commit }, notificationId) {
    commit('REMOVE_NOTIFICATION', notificationId);
  },
  
  clearAllNotifications({ commit }) {
    commit('CLEAR_ALL_NOTIFICATIONS');
  },

  async handleOfflineAction({ state, commit }, { type, payload }) {
    if (state.offlineQueue.supportedTypes.includes(type)) {
      commit('queueOfflineAction', { type, payload });
      return { queued: true };
    }
    throw new Error('This action cannot be performed offline');
  },

  async syncOfflineQueue({ state, commit, dispatch }) {
    if (state.offlineQueue.syncInProgress || !state.networkStatus.online) return;
    
    commit('setSyncProgress', true);
    
    for (const action of state.offlineQueue.actions) {
      try {
        await dispatch(action.type, action.payload, { root: true });
        commit('removeQueuedAction', action.id);
      } catch (error) {
        commit('addFailedAction', { ...action, error: error.message });
      }
    }
    
    commit('setSyncProgress', false);
  },

  async checkNetworkAndSync({ state, dispatch, commit }) {
    const online = navigator.onLine;
    commit('setNetworkStatus', online);
    
    if (online && state.offlineQueue.actions.length > 0) {
      await dispatch('syncOfflineQueue');
    }
  }
};
