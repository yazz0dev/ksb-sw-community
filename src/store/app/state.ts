import { AppState } from '@/types/store';

const state: AppState = {
  lastSyncTimestamp: null,
  cacheExpiration: 30 * 60 * 1000,
  eventClosed: {},
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
    lastOnline: undefined,
    lastOffline: undefined,
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
