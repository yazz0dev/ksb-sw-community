// src/store/modules/app/actions.js
import { ActionTree } from 'vuex';
import { disableNetwork, enableNetwork } from 'firebase/firestore';
import { db } from '../../../firebase';
import { AppState, QueuedAction, Notification, RootState } from '@/types/store';
import { User } from '@/types/user';
import { invokePushNotification, isSupabaseConfigured } from '@/notifications';

// Define GeneralNotificationPayload type locally
type GeneralNotificationPayload = {
  title: string;
  body: string;
  url?: string;
};

const actions: ActionTree<AppState, RootState> = {
  initOfflineCapabilities({ commit, state, dispatch }) {
    try {
      window.addEventListener('online', () => {
        commit('SET_ONLINE_STATUS', true);
        dispatch('syncOfflineChanges');
      });

      window.addEventListener('offline', () => {
        commit('SET_ONLINE_STATUS', false);
      });

      commit('SET_ONLINE_STATUS', navigator.onLine);
      commit('SET_LAST_SYNC_TIMESTAMP', Date.now());
      console.log('Offline listeners initialized.');
    } catch (error) {
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
      } catch (error: any) {
        commit('addFailedAction', { ...action, error: error?.message || 'Unknown processing error' });
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

  recordOfflineChange({ commit }, { type, data }: { type: string; data: any }) {
    // Generate a unique id for the queued action
    const id = `queued_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    commit('ADD_OFFLINE_CHANGE', { id, type, payload: data, timestamp: Date.now() });
  },

  updateLastSyncTimestamp({ commit }) {
    commit('SET_LAST_SYNC_TIMESTAMP', Date.now());
  },

  setEventClosedState({ commit }, { eventId, isClosed }: { eventId: string; isClosed: boolean }) {
    commit('SET_EVENT_CLOSED_STATE', { eventId, isClosed });
  },

  showNotification({ commit, dispatch }, notification: Omit<Notification, 'id'>) {
    if (!notification.message) {
      console.error('Notification message is required');
      return;
    }

    // Generate a unique ID for this notification
    const id = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const notificationWithId = { ...notification, id };

    commit('ADD_NOTIFICATION', notificationWithId);

    // Use 'duration' for auto-dismiss, default 5000ms
    const duration = (notification as any).duration;
    if (duration !== 0) {
      setTimeout(() => {
        dispatch('dismissNotification', id);
      }, duration || 5000);
    }

    return id;
  },

  dismissNotification({ commit }, notificationId: string) {
    commit('REMOVE_NOTIFICATION', notificationId);
  },

  clearAllNotifications({ commit }) {
    commit('CLEAR_ALL_NOTIFICATIONS');
  },

  async handleOfflineAction({ state, commit }, { type, payload }: QueuedAction) {
    if (state.offlineQueue.supportedTypes.includes(type)) {
      // Generate a unique id for the queued action
      const id = `queued_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      commit('queueOfflineAction', { id, type, payload, timestamp: Date.now() });
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
        console.log(`Successfully replayed action: ${action.type}`);
        commit('removeQueuedAction', action.id);
      } catch (error: any) {
        console.error(`Failed to replay action ${action.type}:`, error);
        commit('addFailedAction', { ...action, error: error?.message || 'Unknown replay error' });
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
  },

  // --- NEW ACTION for General Notifications ---
  async sendGeneralNotification(
    { rootGetters, dispatch },
    payload: GeneralNotificationPayload
  ): Promise<void> {
    const currentUser: User | null = rootGetters['user/getUser'];
    if (currentUser?.role !== 'Admin') {
      throw new Error('Unauthorized: Only Admins can send general notifications.');
    }

    if (!isSupabaseConfigured()) {
      console.warn("Supabase not configured. Cannot send general notification.");
      dispatch('notification/showNotification', {
        message: 'Supabase Messaging is not configured.',
        type: 'error'
      }, { root: true });
      return;
    }

    if (!payload.title || !payload.body) {
      throw new Error('Notification title and body are required.');
    }

    try {
      const functionPayload = {
        notificationType: 'general',
        messageTitle: payload.title,
        messageBody: payload.body,
        eventUrl: payload.url || '/',
      };

      console.log("Triggering Supabase Edge Function for general notification:", functionPayload);

      await invokePushNotification(functionPayload);

      dispatch('notification/showNotification', {
        message: 'General notification sent successfully.',
        type: 'success'
      }, { root: true });

      console.log(`Supabase Edge Function execution triggered for general notification.`);

    } catch (error: any) {
      console.error('Failed to trigger Supabase function for general notification:', error);
      dispatch('notification/showNotification', {
        message: `Failed to send general notification: ${error?.message || 'Unknown error'}`,
        type: 'error'
      }, { root: true });
      throw error;
    }
  }
};

export default actions;
