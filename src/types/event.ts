// src/types/event.ts
import type { Timestamp } from 'firebase/firestore';
import type { XpCalculationRoleKey } from './xp';

// --- Enums (remain the same) ---
export enum EventStatus {
  Pending = 'Pending',
  Approved = 'Approved',
  Rejected = 'Rejected',
  InProgress = 'InProgress',
  Completed = 'Completed',
  Cancelled = 'Cancelled', // Kept for completeness, though its timestamp is removed
  Closed = 'Closed'
}

export enum EventFormat {
  Individual = 'Individual',
  Team = 'Team',
  Competition = 'Competition'
}

// --- Supporting Interfaces (mostly remain the same) ---

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
  organizers: string[]; // Student UIDs
  date: EventDate;
  allowProjectSubmission: boolean;
  prize?: string;
}

export interface EventCriterion {
  constraintIndex: number;
  constraintLabel: string;
  points: number;
  role: XpCalculationRoleKey | string;
  selections?: Record<string, string>; // voterUID -> selectedEntityID
}

export interface Team {
  teamName: string;
  members: string[]; // Student UIDs
  teamLead: string;  // Student UID
}

export interface Submission {
  projectName: string;
  link: string;
  description?: string;
  submittedBy: string; // Student UID
  submittedAt: Timestamp;
  teamName?: string;
  participantId?: string;
}

export type EventWinners = Record<string, string[]>;

export interface OrganizerRating {
  userId: string; // Student UID who rated
  rating: number;
  feedback?: string;
  ratedAt: Timestamp;
}

// --- MODIFIED: Simplified Lifecycle Timestamps ---
export interface EventLifecycleTimestamps {
  rejectedAt?: Timestamp;   // When event was moved to Rejected status
  completedAt?: Timestamp;  // When event was moved to Completed status
  // approvedAt, startedAt, cancelledAt are removed from this map
}

// --- Main Event Interface (Firestore: events/{eventId}) ---
export interface Event {
  id: string; // Firestore document ID
  details: EventDetails;
  status: EventStatus;
  requestedBy: string; // Student UID

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

  // --- Core Timestamps (Top-Level) ---
  createdAt: Timestamp;         // Immutable: When the event request document was first created.
  lastUpdatedAt: Timestamp;     // Mutable: When any field in the event document was last modified.
  closedAt?: Timestamp;        // Mutable: When event is fully archived and XP awarded. Signifies terminal state.

  // --- Simplified Lifecycle Timestamps (Nested) ---
  lifecycleTimestamps?: EventLifecycleTimestamps; // Optional: created/updated as needed.

  rejectionReason?: string;    // If status is 'Rejected'.
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
      start: string | Date | null;
      end: string | Date | null;
    };
    allowProjectSubmission: boolean;
    prize?: string;
  };
  criteria: EventCriterion[];
  teams?: Team[];
  status?: EventStatus;
}