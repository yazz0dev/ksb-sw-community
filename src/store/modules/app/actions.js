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

  async syncOfflineChanges({ commit, state, dispatch }) {
    if (!state.isOnline || !state.pendingOfflineChanges.length) return;
    
    try {
      // Process each pending change
      for (const change of state.pendingOfflineChanges) {
        switch (change.type) {
          case 'rating':
            await dispatch('events/submitRating', change.data, { root: true });
            break;
          case 'submission':
            await dispatch('events/submitProject', change.data, { root: true });
            break;
          // Add other types as needed
        }
      }
      
      // Clear pending changes after successful sync
      commit('CLEAR_OFFLINE_CHANGES');
      console.log('Offline changes synced successfully');
    } catch (error) {
      console.error('Error syncing offline changes:', error);
    }
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
  }
};
