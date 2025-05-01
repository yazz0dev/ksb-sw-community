// src/store/modules/app/actions.js
import { ActionTree } from 'vuex';
import { disableNetwork, enableNetwork } from 'firebase/firestore';
import { db } from '../../firebase';
import { AppState, QueuedAction, RootState } from '@/types/store';

const actions: ActionTree<AppState, RootState> = {
  initOfflineCapabilities({ commit, state, dispatch }) {
    try {
      window.addEventListener('online', () => {
        commit('setOnlineStatus', true); // Use the correct mutation name
        dispatch('syncOfflineChanges');
      });

      window.addEventListener('offline', () => {
        commit('setOnlineStatus', false); // Use the correct mutation name
      });

      commit('setOnlineStatus', navigator.onLine); // Use the correct mutation name
      console.log('Offline listeners initialized.');
    } catch (error) {
      console.error('Error setting up offline listeners:', error);
    }
  },

  async toggleNetworkConnection({ commit, state }) {
    const isCurrentlyOnline = state.networkStatus.online;
    if (isCurrentlyOnline) {
      await enableNetwork(db);
      console.log('Firebase network connection enabled');
    } else {
      await disableNetwork(db);
      console.log('Firebase network connection disabled');
    }
  },

  async syncOfflineChanges({ state, commit, dispatch }) {
    if (state.offlineQueue.syncInProgress || !state.networkStatus.online) return; // Check networkStatus.online

    commit('setOfflineQueueSyncing', true); // Use correct mutation

    for (const action of state.offlineQueue.actions) {
      try {
        await dispatch(action.type, action.payload, { root: true });
        commit('removeQueuedAction', action.id); // Need mutation 'removeQueuedAction'
      } catch (error: any) {
        commit('addFailedAction', { ...action, error: error?.message || 'Unknown processing error' });
        console.error('Sync failed for action:', action, error);
      }
    }

    commit('setOfflineQueueSyncing', false); // Use correct mutation
    commit('setOfflineQueueLastSync', Date.now()); // Use correct mutation
  },

  monitorNetworkStatus({ commit, dispatch }) {
    window.addEventListener('online', () => {
      commit('setOnlineStatus', true); // Use correct mutation
      dispatch('syncOfflineChanges');
    });

    window.addEventListener('offline', () => {
      commit('setOnlineStatus', false); // Use correct mutation
    });
    // Set initial status
    commit('setOnlineStatus', navigator.onLine);
  },

  recordOfflineChange({ commit }, { type, data }: { type: string; data: any }) {
    const id = `queued_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    commit('addOfflineChange', { id, type, payload: data, timestamp: Date.now() }); // Use correct mutation
  },

  setEventClosedState({ commit }, { eventId, isClosed }: { eventId: string; isClosed: boolean }) {
    commit('setEventClosed', { eventId, isClosed }); // Use correct mutation
  },

  async handleOfflineAction({ state, commit }, { type, payload }: QueuedAction) {
    const supported = state.offlineQueue?.supportedTypes || [];
    if (supported.includes(type)) {
      const id = `queued_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      commit('addOfflineChange', { id, type, payload, timestamp: Date.now() }); // Use correct mutation
      return { queued: true };
    }
    throw new Error('This action cannot be performed offline');
  },

  async processOfflineQueue({ state, commit, dispatch }) {
    if (state.offlineQueue.syncInProgress || !state.networkStatus.online) return;

    commit('setOfflineQueueSyncing', true); // Use correct mutation

    // Iterate over a copy in case mutations change the array during loop
    const actionsToProcess = [...state.offlineQueue.actions];
    for (const action of actionsToProcess) {
      try {
        await dispatch(action.type, action.payload, { root: true });
        console.log(`Successfully replayed action: ${action.type}`);
        commit('removeQueuedAction', action.id); // Need mutation 'removeQueuedAction'
      } catch (error: any) {
        console.error(`Failed to replay action ${action.type}:`, error);
        commit('addFailedAction', { ...action, error: error?.message || 'Unknown replay error' });
      }
    }

    commit('setOfflineQueueSyncing', false); // Use correct mutation
    commit('setOfflineQueueLastSync', Date.now()); // Use correct mutation
  },

  async checkNetworkAndSync({ state, dispatch, commit }) {
    const online = navigator.onLine;
    commit('setOnlineStatus', online);

    if (online && state.offlineQueue.actions.length > 0) {
      await dispatch('syncOfflineChanges');
    }
  },

};

export default actions;