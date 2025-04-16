import { Timestamp } from 'firebase/firestore';

export interface QueuedAction {
  type: string;
  payload: any;
  timestamp: number;
  retries?: number;
  error?: string; // Add error field if needed for failed actions
}

export interface Notification {
  id: string;
  title?: string; // Add optional title
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
}

export interface OfflineQueueState {
  actions: QueuedAction[]; // Use QueuedAction
  syncInProgress: boolean;
  supportedTypes: string[];
  lastSyncAttempt?: number | null; // Add missing field
  lastError?: string | null; // Add missing field
  failedActions?: QueuedAction[]; // Add missing field
}

export interface NetworkStatusState {
  online: boolean;
  lastChecked?: number; // Add missing field
}

export interface AppState {
  isOnline: boolean;
  lastSyncTimestamp: number | null;
  cacheExpiration: number;
  eventClosed: Record<string, boolean>;
  pendingOfflineChanges: QueuedAction[]; // Add missing field
  notifications: Notification[]; // Add missing field
  offlineQueue: OfflineQueueState; // Use the refined interface
  networkStatus: NetworkStatusState; // Use the refined interface
}
