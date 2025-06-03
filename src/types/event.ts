// src/types/event.ts
import type { Timestamp } from 'firebase/firestore';
import type { XpCalculationRoleKey } from './xp';

// --- Enums ---
export enum EventStatus {
  Pending = 'Pending',
  Approved = 'Approved',
  Rejected = 'Rejected',
  InProgress = 'InProgress',
  Completed = 'Completed',
  Cancelled = 'Cancelled',
  Closed = 'Closed'
}

export enum EventFormat {
  Individual = 'Individual',
  Team = 'Team',
  Competition = 'Competition'
}

// --- Supporting Interfaces ---
export interface EventDate {
  start: Timestamp | null;
  end: Timestamp | null;
}

export interface EventDetails {
  eventName: string;
  description: string;
  rules?: string;
  format: EventFormat;
  type: string;
  organizers: string[];
  date: EventDate;
  allowProjectSubmission: boolean;
  prize?: string;
}

export interface EventCriterion {
  constraintIndex: number;
  constraintLabel: string;
  constraintKey?: string;
  title?: string; // Add title property for backward compatibility
  points: number;
  role: XpCalculationRoleKey | string;
  targetRole?: string;
  selections?: Record<string, string>;
  criteriaSelections?: Record<string, string>; // Add this property for backward compatibility
  votes?: Record<string, string>; // Add votes property for storing user votes
}


export interface Submission {
  projectName: string;
  link: string;
  submittedBy: string;
  submittedAt: Timestamp;
  description?: string | null;
  participantId?: string | null;
  teamName?: string;
}

export interface Team {
  id?: string;
  teamName: string;
  members: string[];
  teamLead: string;
}

export type EventWinners = Record<string, string[]>;

export interface OrganizerRating {
  userId: string;
  rating: number;
  feedback?: string;
  ratedAt: Timestamp;
}

export interface EventLifecycleTimestamps {
  rejectedAt?: Timestamp;
  completedAt?: Timestamp;
}

export interface GalleryItem {
  url: string;
  addedBy: string;
  description?: string;
}

// --- Main Event Interface (Firestore: events/{eventId}) ---
export interface Event {
  id: string;
  details: EventDetails;
  status: EventStatus;
  requestedBy: string;

  criteria?: EventCriterion[];
  participants?: string[];
  teams?: Team[];
  teamMemberFlatList?: string[];

  submissions?: Submission[];
  votingOpen: boolean;
  bestPerformerSelections?: Record<string, string>;

  winners?: EventWinners;
  manuallySelectedBy?: string;
  organizerRatings?: OrganizerRating[];

  createdAt: Timestamp;
  lastUpdatedAt: Timestamp;
  closedAt?: Timestamp;
  lifecycleTimestamps?: EventLifecycleTimestamps;
  rejectionReason?: string;
}

// --- EventFormData Interface (For event creation/editing forms) ---
export interface EventFormData {
  details: {
    eventName: string;
    description: string;
    rules?: string;
    format: EventFormat;
    type: string;
    organizers: string[];
    date: {
      start: string | null; // Dates as strings for form compatibility
      end: string | null;
    };
    allowProjectSubmission: boolean;
    prize?: string;
  };
  criteria: EventCriterion[];
  teams?: Team[];
  status?: EventStatus;

  submissions?: Submission[];
  organizerRatings?: OrganizerRating[];
  votingOpen: boolean; // Made required
  bestPerformerSelections?: Record<string, string>;
  winners?: EventWinners;
  gallery?: GalleryItem[];

  // Firestore timestamp storage for date operations
  dateTimestamps?: {
    start: Timestamp | null;
    end: Timestamp | null;
  };

  createdAt?: Timestamp;
  lastUpdatedAt?: Timestamp;
  completedAt?: Timestamp;
  closedAt?: Timestamp;
  rejectionReason?: string | null;
  manuallySelectedBy?: string;
}