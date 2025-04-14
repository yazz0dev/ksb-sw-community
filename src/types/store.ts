import { Timestamp } from 'firebase/firestore';

export interface AppState {
  isOnline: boolean;
  lastSyncTimestamp: number | null;
  cacheExpiration: number;
  offlineQueue: {
    actions: OfflineAction[];
    syncInProgress: boolean;
    supportedTypes: string[];
  };
  networkStatus: {
    online: boolean;
  };
  eventClosed: Record<string, boolean>;
}

export interface OfflineAction {
  id?: string;
  type: string;
  payload: any;
  error?: string;
}

export interface Notification {
  id: string;
  message: string;
  timeout?: number;
  type?: string;
}
