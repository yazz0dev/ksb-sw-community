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

export interface EventGalleryItem {
  url: string;
  caption?: string | null;
  uploadedBy?: string | null; // UID of uploader
  uploadedAt?: Timestamp | null;
}

export interface EventDetails {
  eventName: string;
  description: string;
  format: EventFormat;
  type: string; // e.g., 'Workshop', 'Competition', 'Seminar'
  organizers: string[]; // Array of student UIDs
  date: {
    start: Timestamp | string | null; // Allow string for form input, convert to Timestamp for store/Firestore
    end: Timestamp | string | null;   // Allow string for form input, convert to Timestamp for store/Firestore
  };
  rules?: string | null; // Optional, use null if not provided
  prize?: string | null; // Optional, use null if not provided
  allowProjectSubmission: boolean;
}

export interface EventCriteria {
  description?: any; // Make optional
  constraintIndex: number;
  title: string;
  constraintKey?: string;
  points: number;
  role: XpCalculationRoleKey | 'xp_developer' | 'xp_designer' | 'xp_presenter' | 'xp_problemSolver' | string;
  targetRole?: string; 
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
  feedback?: string | null;
  ratedAt: Timestamp | null; // This is already correct
}

export interface EventLifecycleTimestamps {
  createdAt?: Timestamp | null | undefined;
  approvedAt?: Timestamp | null; // Changed from Timestamp to Timestamp | null
  startedAt?: Timestamp | null;  // Changed from Timestamp to Timestamp | null
  rejectedAt?: Timestamp | null; // Changed from Timestamp to Timestamp | null
  completedAt?: Timestamp | null;// Changed from Timestamp to Timestamp | null
  cancelledAt?: Timestamp | null;// Changed from Timestamp to Timestamp | null
  closedAt?: Timestamp | null;   // Changed from Timestamp to Timestamp | null
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
  requestedBy: string; // UID of the student who requested
  votingOpen: boolean;
  lastUpdatedAt?: Timestamp | null | undefined;
  participants?: string[] | null | undefined;
  submissions?: Submission[] | null | undefined;
  criteria?: EventCriteria[] | null | undefined;
  teams?: Team[] | null | undefined;
  organizerRatings?: Record<string, OrganizerRating> | null | undefined; // UID to Rating
  winners?: Record<string, string | string[]> | null | undefined; // maps criteria title/ID to winner UID(s)
  criteriaVotes?: Record<string, Record<string, string>> | null | undefined; // { [voterUid]: { [criterionId]: selectedTeamOrParticipantUid } }
  bestPerformerSelections?: Record<string, string> | null | undefined; // { [voterUid]: selectedParticipantUid }
  rejectionReason?: string | null | undefined; // Reason if the event request was rejected
  manuallySelectedBy?: string | null | undefined; // UID of admin/organizer who manually selected winners
  gallery?: EventGalleryItem[] | null | undefined; // For event photos/videos
  lifecycleTimestamps?: EventLifecycleTimestamps | null | undefined;
  teamMemberFlatList?: string[] | null | undefined; // Denormalized list of all UIDs in all teams for easier querying
}

// --- EventFormData Interface (For event creation/editing forms) ---
export interface EventFormData {
  details: {
    eventName: string;
    description: string;
    rules?: string | null;
    format: EventFormat;
    type: string;
    organizers: string[];
    date: {
      start: string | null;
      end: string | null;
    };
    allowProjectSubmission: boolean;
    prize?: string | null;
  };
  criteria?: EventCriteria[];
  teams?: Team[];
  status?: EventStatus;

  submissions?: Submission[];
  organizerRatings?: Record<string, OrganizerRating>;
  votingOpen?: boolean;
  
  criteriaVotes?: Record<string, Record<string, string>>;
  bestPerformerSelections?: Record<string, string>;
  winners?: EventWinners;
  gallery?: GalleryItem[];

  dateTimestamps?: {
    start: Timestamp | null;
    end: Timestamp | null;
  };

  lastUpdatedAt?: Timestamp;
  rejectionReason?: string | null;
  manuallySelectedBy?: string;
}