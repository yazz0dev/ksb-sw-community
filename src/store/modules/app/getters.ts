import { GetterTree } from 'vuex';
import { AppState } from '@/types/store';
import { RootState } from '@/store/types';

const getters: GetterTree<AppState, RootState> = {
  isOnline: (state): boolean => state.networkStatus.online,
  hasPendingOfflineChanges: (state): boolean => state.offlineQueue.actions.length > 0,
  pendingOfflineChangesCount: (state): number => state.offlineQueue.actions.length,
  isCacheValid: (state): boolean => {
    if (!state.lastSyncTimestamp) return false;
    const now = Date.now();
    return (now - state.lastSyncTimestamp) < state.cacheExpiration;
  },
  isEventClosed: (state) => (eventId: string): boolean => !!state.eventClosed[eventId]
};

export default getters;
