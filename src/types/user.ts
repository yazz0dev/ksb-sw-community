// src/types/user.ts

export interface User {
  uid: string;
  name: string;
  photoURL?: string;
  bio?: string;
  socialLink?: string;
  xpByRole?: Record<string, number>;
  skills?: string[];
  preferredRoles?: string[];
  isAuthenticated?: boolean;
  lastXpCalculationTimestamp?: number | null;
  /**
   * Array of event IDs the user has participated in
   */
  participatedEvent?: string[];
  /**
   * Array of event IDs the user has organized
   */
  organizedEvent?: string[];
}

export interface UserData extends User {
  isAuthenticated: boolean;
  /**
   * Array of event IDs the user has participated in
   */
  participatedEvent?: string[];
  /**
   * Array of event IDs the user has organized
   */
  organizedEvent?: string[];
}

// --- UserState Interface (for student/community users only) ---
export interface UserState {
  currentUser: User | null;
  // Core User Data
  uid: string | null;
  name: string | null;
  isAuthenticated: boolean;
  hasFetched: boolean;

  // Student Data
  xpByRole: Record<string, number>;
  skills: string[];
  preferredRoles: string[];

  // XP Calculation Timestamp
  lastXpCalculationTimestamp: number | null;

  // Student List Management
  studentList: User[];
  studentListLastFetch: number | null;
  studentListTTL: number;
  studentListLoading: boolean;
  studentListError: Error | null;

  // General User List
  allUsers: User[];

  // Name Caching (Using Map structure)
  nameCache: Map<string, { name: string; timestamp: number }>;
  nameCacheTTL: number;

  // General Loading/Error State
  loading: boolean;
  error: Error | null;
}

export interface NameCacheEntry {
  name: string;
  timestamp: number;
}

export type NameCacheMap = Map<string, NameCacheEntry>;