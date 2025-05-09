// src/types/user.ts
import type { Event as AppEvent } from './event';
import type { Project } from './project';

/**
 * Represents the core user data structure, often mirroring Firestore document.
 */
export interface User {
    uid: string;
    email?: string | null;
    name: string;
    photoURL?: string;
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
}

/**
 * Structure for entries in the name cache Map.
 */
export interface NameCacheEntry {
    name: string;
    timestamp: number; // When the name was fetched/cached
}

// Interface for viewed user profile data
export interface ViewedUserProfile extends UserData {
  participatedEvent?: string[];
  organizedEvent?: string[];
}

// Interface for profile-related projects
export interface UserProject {
  id: string;
  projectName: string;
  link: string;
  description?: string;
  eventId?: string;
  eventName?: string;
  submittedAt?: any;
}

// Define the default XP structure helper - centralize keys
export const defaultXpRoleKeys = [
    'developer', 'presenter', 'designer',
    'organizer', 'problemSolver', 'participation', 'BestPerformer'
] as const; // Use 'as const' for stricter typing

export type XpRoleKey = typeof defaultXpRoleKeys[number]; // Type for valid role keys

export const defaultXpStructure: Record<XpRoleKey, number> = defaultXpRoleKeys.reduce((acc, key) => {
    acc[key] = 0;
    return acc;
}, {} as Record<XpRoleKey, number>);

// Helper to format role names (consider moving to utils/formatters)
export function formatRoleName(roleKey: string): string {
    if (!roleKey) return 'Unknown Role';
    // Simple formatting, can be expanded
    return roleKey
        .replace(/([A-Z])/g, ' $1') // Add space before uppercase letters
        .replace(/^./, (str) => str.toUpperCase()) // Capitalize first letter
        .trim();
}

// Interface for UserState in the userStore
export interface UserState {
  currentUser: UserData | null;
  isAuthenticated: boolean;
  nameCache: Map<string, { name: string, timestamp: number }>; // Matches NameCacheEntry
  hasFetched: boolean;
  viewedUserProfile: ViewedUserProfile | null;
  viewedUserProjects: UserProject[];
  viewedUserEvents: AppEvent[]; // Use AppEvent
  userRequests: AppEvent[]; // Use AppEvent
  currentUserPortfolioData: {
    projects: Project[];
    eventParticipationCount: number;
  };
  allUsers: UserData[]; // Added
  studentList: UserData[]; // Added
  leaderboardUsers: UserData[]; // Added for leaderboard
  loading: boolean;
  error: Error | null; // Can also be 'any' or a custom error type
}

// Interface for user profile update payload
export interface UserProfileUpdatePayload {
  userId: string;
  profileData: {
    name: string;
    photoURL: string;
    bio: string;
    socialLink: string;
    skills: string[];
    preferredRoles: string[];
    hasLaptop: boolean;
  };
}