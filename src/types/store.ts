// src/types/store.ts

import type { EnrichedStudentData, StudentPortfolioGenerationData, NameCacheMap, UserData } from './student';
import type { Event, EventFormData } from './event';

// --- Notification Interface ---
export interface Notification {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  title?: string; 
  createdAt: number; // Added creation timestamp
  duration?: number; // Added from StudentNotification
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
  newVersionAvailable: boolean; 
  currentTheme?: 'light' | 'dark'; // Added from StudentAppState
  hasFetchedInitialAuth?: boolean; // Added from StudentAppState
  nameCache?: NameCacheMap; // Added from StudentAppState
}

// --- NotificationState ---
export interface NotificationState {
  notifications: Notification[];
}

// --- Student Profile State (From store.ts) ---
export interface StudentProfileState {
  currentStudent: EnrichedStudentData | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  actionError: string | null;
  fetchError: string | null;
  hasFetched: boolean;
  nameCache: NameCacheMap;
  allUsers: UserData[];
  getAllUsers: UserData[];
  viewedStudentProfile: EnrichedStudentData | null;
  portfolioData: StudentPortfolioGenerationData | null;
}

// --- Student Profile Getters and Actions ---
export interface StudentProfileGetters {
  getCachedUserName: (userId: string) => string | undefined;
}

export interface StudentProfileActions {
  fetchUserData: (userId: string) => Promise<void>;
}

// --- Student Event State ---
export interface StudentEventState {
  relevantEvents: Event[];
  viewedEventDetails: Event | null;
  isLoading: boolean;
  error: string | null;
  myEventRequests: Event[];
  eventFormData: Partial<EventFormData> | null;
}

// --- Student Root State ---
export interface StudentRootState {
  profile: StudentProfileState;
  events: StudentEventState;
  notifications: NotificationState;
  app: AppState;
}