// src/store/modules/app/state.js

export default {
  isOnline: navigator.onLine,
  pendingOfflineChanges: [],
  lastSyncTimestamp: null,
  cacheExpiration: 30 * 60 * 1000, // 30 minutes in milliseconds
  eventClosed: {}, // Map of eventId -> boolean to track closed state
  notifications: [], // Array to store notification objects
};
