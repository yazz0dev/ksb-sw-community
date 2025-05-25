// src/types/student.ts
import type { XPData } from './xp';
import type { Project } from './project'; // For portfolio data
import type { EventFormat, EventStatus } from './event';   // For event history
import { Timestamp } from 'firebase/firestore';

// UserData: Basic information often needed for lists, dropdowns, etc.
export interface UserData {
  uid: string;
  name: string | null;
  email?: string | null | undefined; // Allow undefined
  photoURL?: string | null;
  batchYear?: number;
  hasLaptop?: boolean;
}

// --- Base Student Data Interface (Represents the object stored under students/{studentUid}) ---
export interface StudentProfileData {
  name: string | null;
  studentId?: string;

  photoURL?: string | null;
  bio?: string;
  skills?: string[];
  preferredRoles?: string[];
  hasLaptop?: boolean;

  socialLink?: string;

  participatedEventIDs?: string[];
  organizedEventIDs?: string[];
}

// --- Enriched Student Data (StudentProfileData + XPData + context like UID, email, batchYear) ---
export interface EnrichedStudentData extends StudentProfileData {
  uid: string;
  email?: string | null | undefined; // MODIFIED: Allow undefined to match potential sources
  batchYear: number | undefined; // MODIFIED: Allow undefined
  xpData: XPData;
}

// --- For Name Caching (Used by both admin and student sites) ---
export interface NameCacheEntry {
  name: string;
  timestamp: number; // For TTL logic
}
export type NameCacheMap = Map<string, NameCacheEntry>;

// --- Data Structures for Student-Facing UI (e.g., Profile View) ---
export interface StudentPortfolioProject extends Project {
  eventFormat?: EventFormat;
}

export interface StudentEventHistoryItem {
  eventId: string;
  eventName: string;
  eventStatus: EventStatus;
  eventFormat: EventFormat;
  roleInEvent: 'participant' | 'organizer' | 'team_member' | 'team_lead';
  date: {
    start: Timestamp | null;
    end: Timestamp | null;
  };
  xpEarnedInEvent?: number;
}

export interface StudentPortfolioGenerationData {
  student: EnrichedStudentData;
  projects: StudentPortfolioProject[];
  eventParticipationCount: number;
}