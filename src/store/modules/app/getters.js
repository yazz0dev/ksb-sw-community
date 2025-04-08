// src/store/modules/app/getters.js

export default {
  isOnline: state => state.isOnline,
  
  hasPendingOfflineChanges: state => state.pendingOfflineChanges.length > 0,
  
  pendingOfflineChangesCount: state => state.pendingOfflineChanges.length,
  
  isCacheValid: state => {
    if (!state.lastSyncTimestamp) return false;
    const now = Date.now();
    return (now - state.lastSyncTimestamp) < state.cacheExpiration;
  },
  
  isEventClosed: state => eventId => !!state.eventClosed[eventId]
};
