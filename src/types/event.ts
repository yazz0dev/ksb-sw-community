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

// --- Supporting Types ---
export interface EventCriteria {
  constraintIndex: number;
  constraintLabel: string;
  constraintKey: string; // ADDED
  xpValue: number; // RENAMED from points
  roleKey?: string; // RENAMED from role
  targetRole?: string;
  votes?: { [userId: string]: string }; // RENAMED from criteriaSelections and made optional
}

export interface Submission {
  projectName: string;
  link: string;
  submittedBy: string;
  submittedAt: Timestamp;
  description?: string | null;
  participantId?: string | null; // For individual/competition submissions
  teamId?: string; // For team submissions (stores teamName)
}

export interface Team {
  id?: string; // Optional, if you use a unique ID for teams separate from name
  teamName: string;
  members: string[];
  teamLead: string; // Required field
}

export interface WinnerInfo {
  [Criteria: string]: string[]; // e.g. { "Best Designer": [userId1], ... }
}

export interface GalleryItem {
  url: string;
  addedBy: string;
  description?: string;
}

export enum EventFormat {
  Individual = 'Individual',
  Team = 'Team',
  Competition = 'Competition'
}

export interface OrganizerRating {
  userId: string;
  score: number; // RENAMED from rating
  feedback?: string;
}

// --- Event Form Data Interface ---
export interface EventFormData {
  details: {
    eventName: string;
    description: string;
    format: EventFormat;
    type?: string;
    date: {
      start: string | null;
      end: string | null;
    };
    organizers: string[];
    allowProjectSubmission?: boolean;
    prize?: string;
    rules?: string;
    [key: string]: any;
  };
  criteria: EventCriteria[];
  teams?: Team[];
  status?: EventStatus;
  [key: string]: any;
}

// --- Main Event Interface ---
export interface Event {
  id: string;
  status: EventStatus;
  requestedBy: string;

  details: {
    format: EventFormat;
    type: string;
    eventName: string;
    organizers: string[];
    date: {
      start: Timestamp | null;
      end: Timestamp | null;
    };
    description: string;
    allowProjectSubmission?: boolean;
    prize?: string;
    rules?: string;
  };

  criteria?: EventCriteria[];
  participants?: string[];
  teams?: Team[];
  teamMembersFlat?: string[]; // ADDED: For Team format, a flat list of all member UIDs

  // CONSOLIDATED SUBMISSIONS
  submissions?: Submission[]; // Single list for all submissions

  // ORGANIZER RATING - Keep top-level
  organizerRating?: OrganizerRating[];

  
  winners?: WinnerInfo;

  gallery?: GalleryItem[];
  
  // Controls if participants can submit votes
  votingOpen: boolean;
  
  bestPerformerSelections?: Record<string, string>;

  createdAt: Timestamp | null; // MODIFIED
  lastUpdatedAt: Timestamp | null; // MODIFIED
  completedAt?: Timestamp | null;
  closedAt?: Timestamp | null;
  rejectionReason?: string | null;
  manuallySelectedBy?: string; // ADDED: To track if winners were manually set
}