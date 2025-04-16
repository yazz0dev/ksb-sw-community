// src/types/user.ts

// Keep or refine your User interface
export interface User {
  uid: string;
  name: string;
  role?: string;
  xpByRole?: Record<string, number>;
  skills?: string[];
  preferredRoles?: string[];
  isAuthenticated?: boolean;
  lastXpCalculationTimestamp?: number | null;
}

export interface UserData extends User {
  isAuthenticated: boolean;
}

// --- Updated UserState Interface ---
export interface UserState {
  // Core User Data
  uid: string | null;
  name: string | null;
  role: string | null; // Consider specific roles: 'Student' | 'Admin' | null;
  isAuthenticated: boolean;
  hasFetched: boolean;

  // Student Specific Data (or data relevant to non-Admins)
  xpByRole: Record<string, number>;
  skills: string[];
  preferredRoles: string[];

  // XP Calculation Timestamp
  lastXpCalculationTimestamp: number | null;

  // Student List Management
  studentList: User[]; // Use User[] for better type safety
  studentListLastFetch: number | null;
  studentListTTL: number;
  studentListLoading: boolean;
  studentListError: Error | null; // Use Error type

  // General User List
  allUsers: User[]; // Use User[] for better type safety

  // Name Caching (Using Map structure)
  nameCache: Map<string, { name: string; timestamp: number }>;
  nameCacheTTL: number;

  // General Loading/Error State
  loading: boolean;
  error: Error | null; // Use Error type
}

// Add Record type for name cache
export interface NameCacheEntry {
  name: string;
  timestamp: number;
}

export type NameCacheMap = Map<string, NameCacheEntry>;