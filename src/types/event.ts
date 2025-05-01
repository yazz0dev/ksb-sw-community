// src/types/event.ts
import { Timestamp } from 'firebase/firestore';

// --- Event Status Enum ---
export enum EventStatus {
  Pending = 'Pending',
  Approved = 'Approved',
  Rejected = 'Rejected',
  InProgress = 'InProgress',
  Completed = 'Completed',
  Cancelled = 'Cancelled',
  Closed = 'Closed'
}

// --- EventState Interface for Vuex ---
export interface EventState {
  events: Event[];
  currentEventDetails: Event | null;
}

// --- Supporting Types ---
export interface EventCriteria {
  constraintIndex: number;
  constraintLabel: string;
  points: number;
  role?: string; // e.g., 'developer', 'designer', etc.
  targetRole?: string; // Add targetRole as optional
  /**
   * For team events: userId -> selected teamName
   * For individual events: userId -> selected participantId
   * Note: Team events should always include a "Best Performer" criteria with 10 XP
   */
  criteriaSelections: { [userId: string]: string }; // Always present, used for both event types
}

export interface Team {
  id?: string;
  teamName: string;
  members: string[];
  teamLead: string; // Required field
  submissions?: Submission[]; // Add submissions array
  ratings?: any[]; // Add ratings field
}

export interface Submission {
  projectName: string;
  link: string;
  submittedBy: string;
  submittedAt: Timestamp;
  description?: string | null;
  participantId?: string | null;
  teamId?: string; // Add teamId to track which team submitted (if team event)
}

export interface WinnerInfo {
  [Criteria: string]: string[]; // e.g. { "Best Designer": [userId1], ... }
}

export interface GalleryItem {
  url: string;
  addedBy: string;
  description?: string;
}

// Add EventFormat enum for better type safety
export enum EventFormat {
  Individual = 'Individual',
  Team = 'Team',
  Competition = 'Competition' // Added Competition format
}

// Add OrganizerRating interface
export interface OrganizerRating {
  userId: string;
  rating: number;
  feedback?: string;
}

// --- Event Form Data Interface ---
export interface EventFormData {
  details: {
    eventName: string;
    description: string;
    format: EventFormat; // Use enum
    type?: string;
    date: {
      start: string | null;
      end: string | null;
    };
    organizers: string[];
    allowProjectSubmission?: boolean;
    prize?: string; // Add prize field
    [key: string]: any;
  };
  criteria: EventCriteria[]; // Keep criteria
  teams?: Team[];
  status?: EventStatus;
  [key: string]: any;
}

// --- Main Event Interface ---
export interface Event {
  id: string; // Firestore document ID

  // Top-level status and requestor
  status: EventStatus;
  requestedBy: string;

  // --- Details ---
  details: {
    format: EventFormat; // Use enum
    type: string;
    eventName: string;
    organizers: string[];
    date: {
      start: Timestamp | null;
      end: Timestamp | null;
    };
    description: string;
    allowProjectSubmission?: boolean;
    prize?: string; // Add prize field
  };

  // --- Criteria Definition ---
  criteria?: EventCriteria[];

  // --- Participants/Teams ---
  participants?: string[]; // Used for Individual and Competition
  teams?: Team[]; // Used for Team format

  // --- Submissions ---
  submissions?: Submission[];

  // --- Organizer Rating ---
  organizerRating?: OrganizerRating[]; // Keep array structure

  // --- Winners ---
  winners?: WinnerInfo;

  // --- Gallery ---
  gallery?: GalleryItem[];

  // --- Additional Fields ---
  ratingsOpen: boolean; // Ensure always present
  winnersPerRole?: Record<string, string[]>;

  // Updated ratings structure
  ratings?: {
    organizer?: OrganizerRating[]; // Use array
  };

  bestPerformerSelections?: Record<string, string>; // userId -> selectedParticipantId (Team only)

  // --- System fields ---
  createdAt: Timestamp;
  lastUpdatedAt: Timestamp;
  completedAt?: Timestamp | null;
  closedAt?: Timestamp | null;

  rejectionReason?: string | null;
}