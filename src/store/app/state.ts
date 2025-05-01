import { AppState } from '@/types/store';

const state: AppState = {
  isOnline: navigator.onLine,
  pendingOfflineChanges: [],
  lastSyncTimestamp: null,
  cacheExpiration: 30 * 60 * 1000,
  eventClosed: {},
  notifications: [],
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

export default state;
