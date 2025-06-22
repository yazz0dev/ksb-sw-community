// src/types/student.ts
import type { XPData } from './xp';
export type { XPData } from './xp'; // Re-export XPData
import type { Project } from './project'; // For portfolio data
import type { EventFormat, EventStatus } from './event';   // For event history
import type { Timestamp } from 'firebase/firestore';

// Social links interface with exact optional property types
export interface SocialLinks {
  primary?: string | undefined; // Allow undefined
  linkedin?: string | undefined; // Allow undefined
  github?: string | undefined; // Allow undefined
  portfolio?: string | undefined; // Allow undefined
  instagram?: string | undefined; // Allow undefined
}

// --- Base Student Data Interface (Represents the object stored under students/{studentUid}) ---
// export interface StudentProfileData { ... } // Original definition commented out or removed
// StudentProfileData is now an alias for StudentDbData for backward compatibility or phased refactoring.
export type StudentProfileData = StudentDbData;

// --- Student Data Hierarchy ---

// Step 1: StudentDbData - Raw data from Firestore students/{uid} document
// (Derived from the existing StudentProfileData, ensuring no uid/email)
export interface StudentDbData {
  name: string | null;
  studentId?: string | undefined;
  batchYear?: number | undefined;
  batch?: string | undefined; // Consider making this derived from batchYear if possible
  photoURL?: string | null | undefined;
  bio?: string | undefined;
  skills?: string[] | undefined;
  hasLaptop?: boolean | undefined;
  socialLinks?: SocialLinks | undefined;
  // Add any other fields that are directly part of the student document in Firestore
  // Excludes uid, email (from Auth), xpData (separate collection)
}

// Step 2: StudentAppModel - Base model for use within the application
// Combines raw DB data with essential auth information.
export interface StudentAppModel extends StudentDbData {
  uid: string; // From Firebase Auth
  email: string | null; // From Firebase Auth (can be null)
}

// Step 3: EnrichedStudentData - The most comprehensive student type for app use
// Extends StudentAppModel with related data like XP.
// This replaces the old EnrichedStudentData definition.
export interface EnrichedStudentData extends StudentAppModel {
  xpData?: XPData | null | undefined; // XP data from separate collection
  // Other enriched fields can be added here, e.g., event participation summaries, etc.
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
  // Inherits from Project, enhanced with additional portfolio display fields
  eventFormat?: EventFormat | undefined; // Allow undefined
  eventStatus?: EventStatus | undefined; // Allow undefined
  eventDate?: {
    start: Timestamp | null;
    end: Timestamp | null;
  } | undefined; // Allow undefined
  teamName?: string | undefined; // If it was a team project
  teamMembers?: string[] | undefined; // List of team member names
  role?: string | undefined; // Student's specific role in the project
  technologies?: string[] | undefined; // Technologies/skills used
  achievements?: string[] | undefined; // Awards, recognitions, special mentions
  githubUrl?: string | undefined; // Separate GitHub link if different from main link
  liveUrl?: string | undefined; // Live demo URL if different from main link
  imageUrls?: string[] | undefined; // Project screenshots/images
  submissionRank?: number | undefined; // If the project was ranked in competition, allow undefined
  mentorFeedback?: string | undefined; // Feedback from mentors/judges
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
  eventDescription?: string | undefined; // Brief description of the event
  eventType?: string | undefined; // Type of event (hackathon, workshop, competition, etc.)
  organizerNames?: string[] | undefined; // Names of event organizers
  participantCount?: number | undefined; // Total number of participants
  xpEarnedInEvent?: number | undefined;
  projectsSubmitted?: number | undefined; // Number of projects the student submitted
  awardsReceived?: string[] | undefined; // Any awards/recognitions received in this event
  skillsGained?: string[] | undefined; // Skills learned/practiced in this event
  certificateUrl?: string | undefined; // Link to participation/achievement certificate
}

// Enhanced portfolio generation data with comprehensive student profile
export interface StudentPortfolioGenerationData {
  student: EnrichedStudentData;
  projects: StudentPortfolioProject[];
  eventHistory: StudentEventHistoryItem[];
  eventParticipationCount: number;
  portfolioMetrics: {
    totalProjects: number;
    totalEvents: number;
    totalXP: number;
    topSkills: string[];
    preferredTechnologies: string[];
    leadershipExperience: number; // Number of times as team lead or organizer
    winRate: number; // Percentage of competitions won
    collaborationScore: number; // Based on team participation
    consistencyScore: number; // Based on regular participation over time
  };
  achievements: {
    awards: string[];
    certifications: string[];
    specialRecognitions: string[];
    topRankings: Array<{
      eventName: string;
      rank: number;
      totalParticipants: number;
    }>;
  };
  skillsMatrix: Array<{
    skill: string;
    proficiencyLevel: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';
    projectsUsed: number;
    eventsUsed: number;
    lastUsed: Timestamp | null;
  }>;
  recommendations: Array<{
    source: string; // Event organizer, mentor, team member
    content: string;
    eventContext?: string | undefined; // Changed from string to string | undefined
    date: Timestamp;
  }>;
}

// This interface defines the core data structure for a student user.
// It's based on properties observed in ManageUsersView.vue and common user profile fields.
export interface UserData {
  uid: string;
  name?: string | null | undefined;
  email?: string | null | undefined;
  photoURL?: string | null | undefined;
  batch?: string | undefined;
  batchYear?: number | undefined;
  studentId?: string | undefined;
  bio?: string | undefined;
  skills?: string[] | undefined;
  hasLaptop?: boolean | undefined;
  
  // Social & Professional Links
  socialLink?: string | undefined;
  github?: string | undefined;
  linkedin?: string | undefined;
  socialLinks?: SocialLinks | undefined; // Explicitly allow undefined

  // Timestamps
  createdAt?: Timestamp | undefined;
  lastLogin?: Timestamp | undefined;
  profileUpdatedAt?: Timestamp | undefined;
  lastUpdatedAt?: Timestamp | undefined;
}

// This interface extends UserData with additional information,
// specifically XP data, often used in views that display richer user profiles.
export interface EnrichedUserData extends UserData {
  xpData: XPData | null; // Detailed XP breakdown for the user
  socialLinks?: SocialLinks | undefined; // Explicitly allow undefined to match UserData
}

// --- Interface for Portfolio Generation Button ---
export interface UserForPortfolio {
  name: string;
  uid: string;
  email?: string | null;
  photoURL?: string | null;
  xpData?: Partial<XPData> | undefined;
  skills?: string[] | undefined;
  bio?: string | undefined;
  socialLinks?: SocialLinks;
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