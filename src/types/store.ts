import { Store } from 'vuex';

// --- UserState and EventState imports (define or import as needed) ---
import { UserState } from '@/types/user';
import { EventState } from '@/types/event';

// --- Notification Interface  ---
export interface Notification {
  id: string;
  title?: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
}

// --- QueuedAction, OfflineQueueState, NetworkStatusState ---
export interface QueuedAction {
  id: string;
  type: string;
  payload: any;
  timestamp: number;
  retries?: number;
  error?: string;
}

export interface OfflineQueueState {
  actions: QueuedAction[];
  syncInProgress: boolean;
  supportedTypes: string[];
  lastSyncAttempt?: number | null;
  lastError?: string | null;
  failedActions?: QueuedAction[];
}

export interface NetworkStatusState {
  online: boolean;
  lastChecked?: number;
}

// --- AppState ---
export interface AppState {
  isOnline: boolean;
  lastSyncTimestamp: number | null;
  cacheExpiration: number;
  eventClosed: Record<string, boolean>;
  pendingOfflineChanges: QueuedAction[];
  notifications: Notification[];
  offlineQueue: OfflineQueueState;
  networkStatus: NetworkStatusState;
}

// --- RootState (merged from root-state.ts) ---
export interface RootState {
  user: UserState;
  events: EventState;
  app: AppState;
}

// --- NotificationState (if needed for notification module) ---
export interface NotificationState {
  notifications: Notification[];
}

// --- TypedStore ---
export type TypedStore = Store<RootState>;
