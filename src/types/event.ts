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
  role?: string; // e.g., 'fullstack', 'designer', etc.
  targetRole?: string; // Add targetRole as optional
  // userId -> selected winner (teamName or participantId)
  criteriaSelections: { [userId: string]: string };
}

export interface Team {
  id?: string; 
  teamName: string;
  members: string[];
  teamLead: string; // Add team lead field
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
  Team = 'Team'
}

// Add TeamCriteriaRating interface
export interface TeamCriteriaRating {
  ratedBy: string;
  ratedAt: Timestamp;
  selections: {
    criteria: Record<string, string>;
    bestPerformer: string;
  };
}

// Add OrganizerRating interface
export interface OrganizerRating {
  userId: string;
  rating: number;
  feedback?: string;
}

// --- Main Event Interface ---
export interface Event {
  id: string; // Firestore document ID

  // Top-level status and requestor
  status: EventStatus;
  requestedBy: string;

  // --- Details ---
  details: {
    format: EventFormat;
    type: string;
    eventName: string;  // Move eventName here
    organizers: string[];
    date: {
      start: Timestamp | null;
      end: Timestamp | null;
    };
    description: string;
  };

  // --- Additional Properties ---
  teamSize?: number; // Add optional teamSize

  // --- Criteria Definition ---
  criteria?: EventCriteria[];

  // --- Participants/Teams ---
  participants?: string[];
  teams?: Team[];

  // --- Submissions ---
  submissions?: Submission[];

  // --- Organizer Rating ---
  organizerRating?: {
    userId: string;
    rating: number;
    feedback?: string;
  }[];

  // --- Winners ---
  winners?: WinnerInfo;

  // --- Gallery ---
  gallery?: GalleryItem[];

  // --- Additional Fields ---
  ratingsOpen?: boolean;
  teamCriteriaRatings?: TeamCriteriaRating[];
  winnersPerRole?: Record<string, string[]>;

  // Add ratings field
  ratings?: {
    organizer?: OrganizerRating[];
  };

  // --- System fields ---
  createdAt: Timestamp;
  lastUpdatedAt: Timestamp;
  completedAt?: Timestamp | null;
  closedAt?: Timestamp | null;

  rejectionReason?: string | null;
}
