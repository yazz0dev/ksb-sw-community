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
export interface OrganizerRating {
  userId: string;
  rating: number;
  feedback?: string;
}

export interface CriteriaRating {
  criteriaLabel: string;
  points: number;
  ratings: Array<{
    userId: string;
    rating: number;
  }>;
}

export interface EventCriteria {
  constraintIndex: number;
  constraintLabel: string;
  points: number;
  targetRole: string; // e.g., 'fullstack', 'designer', etc.
  // Mandatory: userId -> selected winner (teamName or participantId)
  criteriaSelections: { [userId: string]: string };
  // For UI compatibility:
  role?: string; // Alias for targetRole, for EventDisplayCard
}

export interface Team {
  id?: string; // For UI v-for compatibility
  teamName: string;
  members: string[];
  submissions?: Submission[];
  ratings?: any[]; // For team ratings (optional)
}

export interface Submission {
  projectName: string;
  link: string;
  submittedBy: string;
  submittedAt: Timestamp;
  description?: string | null;
  participantId?: string | null;
}

export interface WinnerInfo {
  [Criteria: string]: string[]; // e.g. { "Best Designer": [userId1], ... }
}

export interface GalleryItem {
  url: string;
  addedBy: string;
  addedAt: Timestamp;
  description?: string;
}

// --- Main Event Interface ---
export interface Event {
  id: string; // Firestore document ID

  // Top-level status and requestor
  status: EventStatus | string;
  requestedBy: string;

  // --- Details ---
  details: {
    format: 'Individual' | 'Team';
    type: string;
    organizers: string[];
    date: {
      desired: {
        start: Timestamp | null;
        end: Timestamp | null;
      };
      final: {
        start: Timestamp | null;
        end: Timestamp | null;
      };
    };
    description: string;
  };

  // --- Criteria Definition ---
  criteria: EventCriteria[];

  // --- Participants/Teams ---
  participants?: string[];
  teams?: Team[];

  // --- Submissions ---
  submissions?: Submission[];

  // --- Ratings ---
  ratings: {
    organizer: OrganizerRating[];
  };

  // --- Winners ---
  winners: WinnerInfo;

  // --- Gallery ---
  gallery?: GalleryItem[];

  // --- System fields ---
  createdAt: Timestamp;
  lastUpdatedAt?: Timestamp;
  completedAt?: Timestamp | null;
  closedAt?: Timestamp | null;

  rejectionReason?: string | null;
}
