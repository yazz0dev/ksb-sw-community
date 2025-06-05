// src/types/student.ts
import type { XPData } from './xp';
export type { XPData } from './xp'; // Re-export XPData
import type { Project } from './project'; // For portfolio data
import type { EventFormat, EventStatus } from './event';   // For event history
import type { Timestamp } from 'firebase/firestore';

// --- Base Student Data Interface (Represents the object stored under students/{studentUid}) ---
export interface StudentProfileData { 
  name: string | null;        // Should be required, with fallback for display
  studentId?: string;         // College student ID (Optional)
  batchYear?: number;         // Numeric batch year (e.g., 2023, 2024) - Now a field
  batch?: string;             // String batch year (e.g., "2023") - Now a field

  photoURL?: string | null;
  bio?: string;
  skills?: string[];          // Self-reported
  hasLaptop?: boolean;        // Default to false if not set

  socialLinks?: {
    linkedin?: string;        // Full LinkedIn profile URL
    github?: string;          // Full GitHub profile URL
    portfolio?: string;       // Primary portfolio/website URL
    instagram?: string;       // Instagram username without @ prefix
  };

  // Arrays of Event IDs.
  participatedEventIDs?: string[];
  organizedEventIDs?: string[];

  // Fields like uid, email, createdAt, lastUpdatedAt are not stored in this nested object.
  // uid is the document ID (students/{uid})
  // email is available via Auth.
}

// --- Enriched Student Data (StudentProfileData + XPData + context like UID, email) ---
// This is what's typically constructed in the application layer when a full student profile is needed.
export interface EnrichedStudentData extends StudentProfileData {
  uid: string; // Document ID from students/{uid}
  email: string | null; // From Auth
  // batchYear is part of StudentProfileData now
  xpData?: XPData | null; // XP data from separate collection
  // If you need createdAt/lastUpdatedAt for the student's record itself (not the parent doc),
  // they would be added here, potentially fetched from a different source or managed differently.
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

// This interface defines the core data structure for a student user.
// It's based on properties observed in ManageUsersView.vue and common user profile fields.
export interface UserData {
  uid: string;
  name?: string | null;
  email?: string | null;
  photoURL?: string | null; // Allow null to match EnrichedStudentData and widen compatibility
  batch?: string;         // e.g., "2023", "2024" - Stored as a field
  batchYear?: number;     // Numeric batch year (e.g., 2023, 2024) - Stored as a field
  studentId?: string;     // College/University ID
  bio?: string;
  skills?: string[];
  hasLaptop?: boolean;
  
  // Social & Professional Links
  socialLink?: string;    // Legacy field: A generic social media link (e.g., personal website, Behance)
  github?: string;        // Legacy field: GitHub username or profile URL
  linkedin?: string;      // Legacy field: LinkedIn profile URL
  socialLinks?: {         // Structured social links (preferred over legacy fields)
    linkedin?: string;    // Full LinkedIn profile URL
    github?: string;      // Full GitHub profile URL
    portfolio?: string;   // Primary portfolio/website URL
    instagram?: string;   // Instagram username without @ prefix
    other?: string;       // Secondary portfolio/project URL
  };

  // Event participation
  participatedEventIDs?: string[];
  organizedEventIDs?: string[];

  // Timestamps
  createdAt?: Timestamp;
  lastLogin?: Timestamp;
  profileUpdatedAt?: Timestamp;
  lastUpdatedAt?: Timestamp;
}

// This interface extends UserData with additional information,
// specifically XP data, often used in views that display richer user profiles.
export interface EnrichedUserData extends UserData {
  xpData: XPData | null; // Detailed XP breakdown for the user
}

// --- Image Upload Types ---
export enum UploadStatus {
  Idle = 'idle',
  Uploading = 'uploading',
  Success = 'success',
  Error = 'error'
}

export interface ImageUploadState {
  status: UploadStatus;
  progress: number;
  error: string | null;
  fileName: string | null;
  downloadURL: string | null;
}

export interface ImageUploadOptions {
  maxSizeMB?: number;
  maxWidthOrHeight?: number;
  quality?: number;
  path?: string; // Storage path
}