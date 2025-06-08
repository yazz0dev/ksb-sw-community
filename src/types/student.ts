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
export interface StudentProfileData { 
  name: string | null;        // Should be required, with fallback for display
  studentId?: string | undefined;         // College student ID (Optional)
  batchYear?: number | undefined;         // Numeric batch year (e.g., 2023, 2024) - Now a field
  batch?: string | undefined;             // String batch year (e.g., "2023") - Now a field

  photoURL?: string | null | undefined;
  bio?: string | undefined;
  skills?: string[] | undefined;          // Self-reported
  hasLaptop?: boolean | undefined;        // Default to false if not set

  socialLinks?: SocialLinks | undefined; // Allow undefined for the object itself

  // Arrays of Event IDs.
  participatedEventIDs?: string[] | undefined;
  organizedEventIDs?: string[] | undefined;

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
  xpData?: XPData | null | undefined; // XP data from separate collection
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

  // Event participation
  participatedEventIDs?: string[] | undefined;
  organizedEventIDs?: string[] | undefined;

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