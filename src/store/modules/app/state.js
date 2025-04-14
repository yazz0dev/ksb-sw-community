// src/store/modules/app/state.js

export default {
  isOnline: navigator.onLine,
  pendingOfflineChanges: [],
  lastSyncTimestamp: null,
  cacheExpiration: 30 * 60 * 1000, // 30 minutes in milliseconds
  eventClosed: {}, // Map of eventId -> boolean to track closed state
  notifications: [], // Array to store notification objects
  offlineQueue: {
    actions: [],
    lastSyncAttempt: null,
    syncInProgress: false,
    failedActions: [],
    supportedTypes: [
      'submissions/addSubmission',
      'events/rateTeam',
      'events/submitFeedback'
    ]
  },
  networkStatus: {
    online: navigator.onLine,
    lastChecked: Date.now(),
    reconnectAttempts: 0
  },
  offlineCapabilities: {
    rating: true,
    submission: true,
    eventRequest: false,
  },
  supportedOfflineActions: [
    'events/rateTeam',
    'events/submitProjectRating',
    'submissions/addSubmission'
  ]
};
