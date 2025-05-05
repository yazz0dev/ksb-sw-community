// src/types/store.ts

// --- Notification Interface ---
export interface Notification {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  title?: string; 
  createdAt: number; // Added creation timestamp
}

// --- QueuedAction, OfflineQueueState, NetworkStatusState ---
export interface QueuedAction {
  id: string; // Unique ID for the queued action
  type: string; // Identifier for the action (e.g., 'event/rateTeam')
  payload: any; // Data needed for the action
  timestamp: number; // When the action was queued
  retries?: number; // Optional: Track retry attempts
  error?: string; // Optional: Store error message if failed
}

export interface OfflineQueueState {
  actions: QueuedAction[];
  syncInProgress: boolean;
  supportedTypes: string[]; // Action types supported for offline queuing
  lastSyncAttempt?: number | null;
  lastError?: string | null;
  failedActions?: QueuedAction[]; // Store actions that failed during sync
}

export interface NetworkStatusState {
  online: boolean;
  lastChecked: number;
  lastOnline?: number; // Timestamp when last online
  lastOffline?: number; // Timestamp when last offline
  reconnectAttempts: number;
}


// --- AppState ---
export interface AppState {
  lastSyncTimestamp: number | null; // Timestamp of the last successful sync
  cacheExpiration: number; // How long caches are considered valid (e.g., 30 mins)
  eventClosed: Record<string, boolean>; // Map of eventId -> isClosed status
  offlineQueue: OfflineQueueState; // Manages actions queued while offline
  networkStatus: NetworkStatusState; // Tracks online/offline status
}


// --- NotificationState ---
export interface NotificationState {
  notifications: Notification[];
}