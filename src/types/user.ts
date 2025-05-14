// src/types/user.ts
import type { Event as AppEvent } from './event';
import type { Project } from './project';
import type { XPData } from './xp';

// UserData: Base profile info from /users collection
export interface User {
    uid: string;
    email: string | null;
    name: string | null;
    photoURL?: string | null;
    bio?: string;
    socialLink?: string;
    skills?: string[];
    preferredRoles?: string[];
    participatedEvent?: string[];
    organizedEvent?: string[];
    hasLaptop?: boolean; // Keep hasLaptop here as it's basic profile info
}
export interface UserData extends User {
    batch?: string;
    studentId?: string;
    linkedin?: string;
    github?: string;
}

// EnrichedUserData: UserData + XPData
export interface EnrichedUserData extends UserData {
    xpData?: XPData | null;
}

export interface NameCacheEntry {
    name: string;
    timestamp: number;
}
export interface ViewedUserProfile extends EnrichedUserData {}
export interface UserProject {
  id: string;
  projectName: string;
  link: string;
  description?: string;
  eventId?: string;
  eventName?: string;
  submittedAt?: any;
}

export function formatRoleName(roleKey: string): string {
    // ... (implementation remains the same)
    if (!roleKey) return 'Unknown Role';
    const cleanKey = roleKey.startsWith('xp_') ? roleKey.substring(3) : roleKey;
    const name: string = cleanKey
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, (str) => str.toUpperCase())
        .trim();
    switch (name) {
        case 'Xp By Role': return 'Overall';
        case 'Problem Solver': return 'Problem Solver';
        case 'Best Performer': return 'Best Performer';
        default: return name;
    }
}

export interface UserState {
  currentUser: EnrichedUserData | null;
  isAuthenticated: boolean;
  nameCache: Map<string, NameCacheEntry>;
  hasFetched: boolean;
  viewedUserProfile: ViewedUserProfile | null;
  viewedUserProjects: UserProject[];
  viewedUserEvents: AppEvent[];
  userRequests: AppEvent[];
  currentUserPortfolioData: {
    projects: Project[];
    eventParticipationCount: number;
  };
  allUsers: UserData[]; // List of all users (base data)
  studentList: UserData[]; // List of students (base data) - THIS IS THE KEY CHANGE FOR HYBRID
  leaderboardUsers: EnrichedUserData[];
  loading: boolean;
  error: Error | null;
}

export interface UserProfileUpdatePayload {
  userId: string;
  profileData: Partial<{
    name: string;
    photoURL: string;
    bio: string;
    socialLink: string;
    skills: string[];
    preferredRoles: string[];
    hasLaptop: boolean;
    [key: string]: any;
  }>;
}