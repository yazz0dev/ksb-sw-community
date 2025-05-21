// src/types/student.ts
import type { XPData } from './xp';
import type { Project } from './project'; // For portfolio data
import type { Event, EventFormat, EventStatus } from './event';   // For event history
import { Timestamp } from 'firebase/firestore';

// --- Base Student Data Interface (Represents the object stored under students/{batchYear}/{studentUid}) ---
export interface StudentProfileData { // Renamed to avoid confusion with a top-level document
  name: string | null;        // Should be required, with fallback for display
  studentId?: string;         // College student ID (Optional)

  photoURL?: string | null;
  bio?: string;
  skills?: string[];          // Self-reported
  preferredRoles?: string[];  // For event participation
  hasLaptop?: boolean;        // Default to false if not set

  socialLinks?: {
    linkedin?: string;
    github?: string;
    portfolio?: string; // Personal portfolio website
  };

  // Arrays of Event IDs.
  participatedEventIDs?: string[];
  organizedEventIDs?: string[];

  // Fields like uid, email, batchYear, createdAt, lastUpdatedAt are not stored in this nested object.
}

// --- Enriched Student Data (StudentProfileData + XPData + context like UID, email, batchYear) ---
export interface EnrichedStudentData extends StudentProfileData {
  uid: string; // Added here as it's contextually important
  email: string | null; // Added here from Auth
  batchYear: number; // Added here as it's contextually important
  xpData?: XPData | null; // XPData can be optional if a student might not have an XP doc yet
}

// --- For Name Caching (Used by both admin and student sites) ---
export interface NameCacheEntry {
  name: string;
  timestamp: number; // For TTL logic
}
export type NameCacheMap = Map<string, NameCacheEntry>;

// --- Data Structures for Student-Facing UI (e.g., Profile View) ---

// Portfolio specific project data
export interface StudentPortfolioProject extends Project {
  // Inherits from Project, can add student-specific portfolio display fields if needed
  eventFormat?: EventFormat; // To show if it was an individual or team project
}

// Event history item for student profile
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
  xpEarnedInEvent?: number; // Optional: total XP earned from this specific event (could be complex to track accurately here)
}

// Data specifically for generating a student's portfolio PDF
export interface StudentPortfolioGenerationData {
  student: EnrichedStudentData; // Full student data including XP
  projects: StudentPortfolioProject[]; // List of their notable projects
  eventParticipationCount: number; // Count of genuinely participated events (e.g., not cancelled/rejected)
  // Could also include skills, bio, preferred roles directly if needed by PDF generator
}