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
  rules?: string | undefined;
  format: EventFormat;
  type: string;
  organizers: string[];
  date: EventDate;
  allowProjectSubmission: boolean;
  prize?: string | undefined;
}

export interface EventCriteria {
  description?: any; // Make optional
  constraintIndex: number;
  title: string;
  constraintKey?: string;
  points: number;
  role: XpCalculationRoleKey | 'xp_developer' | 'xp_designer' | 'xp_presenter' | 'xp_problemSolver' | string;
  targetRole?: string;
  votes?: Record<string, string>; 
}

export interface Submission {
  projectName: string;
  link: string;
  submittedBy: string;
  submittedAt: Timestamp;
  description?: string | null | undefined; // Allow undefined
  participantId?: string | null;
  teamName?: string;
}

export interface Team {
  id: string | undefined; // Make explicit to handle exactOptionalPropertyTypes
  teamName: string;
  members: string[];
  teamLead: string | undefined; // Allow undefined for team lead
}

export type EventWinners = Record<string, string[]>;

export interface OrganizerRating {
  userId: string;
  rating: number;
  feedback?: string | undefined; // Allow undefined
  ratedAt: Timestamp;
}

export interface EventLifecycleTimestamps {
  approvedAt?: Timestamp;
  startedAt?: Timestamp;
  rejectedAt?: Timestamp;
  completedAt?: Timestamp;
  cancelledAt?: Timestamp;
  closedAt?: Timestamp;
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

  criteria?: EventCriteria[];
  participants?: string[];
  teams?: Team[];
  teamMemberFlatList?: string[];

  submissions?: Submission[];
  votingOpen: boolean;
  bestPerformerSelections?: Record<string, string>;

  winners?: EventWinners;
  manuallySelectedBy?: string;
  organizerRatings?: Record<string, OrganizerRating>;

  createdAt: Timestamp;
  lastUpdatedAt: Timestamp;
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
  criteria: EventCriteria[];
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
  rejectionReason?: string | null;
  manuallySelectedBy?: string;
}