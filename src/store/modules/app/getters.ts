import { GetterTree } from 'vuex';
import { AppState } from '@/types/store';
import { RootState } from '@/store/types';

const getters: GetterTree<AppState, RootState> = {
  isOnline: (state): boolean => state.isOnline,
  hasPendingOfflineChanges: (state): boolean => state.pendingOfflineChanges.length > 0,
  pendingOfflineChangesCount: (state): number => state.pendingOfflineChanges.length,
  isCacheValid: (state): boolean => {
    if (!state.lastSyncTimestamp) return false;
    const now = Date.now();
    return (now - state.lastSyncTimestamp) < state.cacheExpiration;
  },
  isEventClosed: (state) => (eventId: string): boolean => !!state.eventClosed[eventId]
};

export default getters;
