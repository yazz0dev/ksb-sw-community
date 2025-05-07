// src/types/user.ts
import type { Event } from './event'; // Import Event type if needed for requests

/**
 * Represents the core user data structure, often mirroring Firestore document.
 */
export interface User {
    uid: string;
    email: string | null;
    name: string;
    role?: 'Student' | 'Admin' | string; // Define roles more explicitly if possible
    photoURL?: string; // Added
    bio?: string;
    socialLink?: string;
    xpByRole?: Record<string, number>; // e.g., { developer: 150, presenter: 50 }
    skills?: string[];
    preferredRoles?: string[];
    lastXpCalculationTimestamp?: number | null;
    participatedEvent?: string[]; // Array of event IDs
    organizedEvent?: string[]; // Array of event IDs
    hasLaptop?: boolean;
    // ... any other fields from your Firestore user document
}

/**
 * Represents user data potentially enriched for display purposes (e.g., in lists or profiles).
 * Often includes calculated fields or application state relevant to the user.
 */
export interface UserData extends User {
    // Could add calculated fields like totalXp here if needed frequently
    // isAuthenticated might be better tracked purely in store state,
    // but keeping it here can be convenient for components if needed.
    // Consider if it truly belongs to the *user data* concept.
    // isAuthenticated: boolean;
}

/**
 * Structure for entries in the name cache Map.
 */
export interface NameCacheEntry {
    name: string;
    timestamp: number; // When the name was fetched/cached
}

// --- UserState Interface (for Pinia Store State) ---
// This defines the shape of the state managed by the user store.
// It avoids duplicating fields already present within `currentUser`.
export interface UserState {
    // --- Core Authentication & Current User ---
    currentUser: User | null; // Holds the complete data object for the logged-in user
    isAuthenticated: boolean; // Tracks if a user is currently logged in
    hasFetched: boolean; // Tracks if the initial authentication check has completed

    // --- Data for Specific Views/Features ---
    profileData: UserData | null; // Data for the profile currently being viewed (could be self or another user)
    userRequests: Event[]; // Event requests made by the logged-in user
    leaderboardUsers: UserData[]; // Users fetched for the leaderboard view

    // --- Fetched Lists & Management ---
    studentList: UserData[]; // Cache of users with the 'Student' role
    studentListLastFetch: number | null; // Timestamp of the last fetch
    studentListTTL: number; // Time-to-live for the student list cache
    studentListLoading: boolean; // Loading state specifically for the student list
    studentListError: Error | null; // Error state specifically for the student list

    allUsers: UserData[]; // Cache of all users (use with caution for large user bases)
    // Add metadata for allUsers if needed (lastFetch, TTL, loading, error)

    // --- Caching ---
    nameCache: Map<string, NameCacheEntry>; // Cache for user names (UID -> Name + Timestamp)
    nameCacheTTL: number; // Time-to-live for name cache entries

    // --- General Store Status ---
    loading: boolean; // General loading indicator for user store actions
    error: Error | null; // General error state for user store actions
}

// Default structure for XP to ensure all roles are present
export const defaultXpStructure: Record<string, number> = {
    developer: 0,
    designer: 0,
    presenter: 0,
    problemSolver: 0, // If you have this role
    organizer: 0,
    // ... other roles
};