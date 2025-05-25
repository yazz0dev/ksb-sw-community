// src/types/storeStudent.ts
import type { EnrichedStudentData, StudentPortfolioGenerationData, NameCacheMap, StudentEventHistoryItem } from './student';
import type { Event, EventStatus, Submission } from './event'; // Common event type
import type { XPData } from './xp'; // Common XP type

// --- Student Authentication/Profile Store State ---
export interface StudentProfileState {
  currentStudent: EnrichedStudentData | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  portfolioData: StudentPortfolioGenerationData | null; // Data prepared for portfolio generation
  allUsers: EnrichedStudentData[]; // Added to address 'allUsers' property error
}

// --- Student Profile Store Getters ---
export interface StudentProfileGetters {
  getCachedUserName: (userId: string) => string | undefined;
}

// --- Student Profile Store Actions ---
export interface StudentProfileActions {
  fetchUserData: (userId: string) => Promise<void>;
}

// --- Student Event Interaction Store State ---
export interface StudentEventState {
  // Events relevant to the student (e.g., upcoming, active, participated)
  // This might be a subset of all events, fetched based on student context.
  relevantEvents: Event[];
  viewedEventDetails: Event | null; // For the event details page
  isLoading: boolean;
  error: string | null;
  // Student's own event requests
  myEventRequests: Event[];
  // For event forms (requesting/editing)
  eventFormData: Partial<import('./event').EventFormData> | null; // Using EventFormData from event.ts
}

// --- Student Notification Store State (Can use common Notification type) ---
export interface StudentNotification {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  duration?: number;
  createdAt: number;
}
export interface StudentNotificationState {
  notifications: StudentNotification[];
}

// --- Student App Shell/Global UI Store State ---
export interface StudentAppState {
  currentTheme: 'light' | 'dark';
  isOnline: boolean; // Network status
  hasFetchedInitialAuth: boolean; // To manage initial loading/redirects
  // Offline queue for student actions (e.g., submitting votes, project submissions)
  offlineQueue: {
    actions: Array<{ id: string; type: string; payload: any; timestamp: number }>;
    isSyncing: boolean;
  };
  newAppVersionAvailable: boolean; // For service worker updates
  nameCache: NameCacheMap; // Common name cache
}

// --- Root Student Pinia Store State ---
export interface StudentRootState {
  profile: StudentProfileState;
  events: StudentEventState;
  notifications: StudentNotificationState;
  app: StudentAppState;
}