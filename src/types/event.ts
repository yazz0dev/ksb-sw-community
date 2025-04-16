// src/types/event.ts
import { Timestamp } from 'firebase/firestore';
import { User } from './user'; // Assuming User type is defined here

export enum EventStatus {
  Pending = 'Pending',
  Approved = 'Approved',
  InProgress = 'InProgress',
  Completed = 'Completed',
  Cancelled = 'Cancelled',
  Rejected = 'Rejected'
}

// Added based on usage in actions/mutations
export enum EventFormat {
    Individual = 'Individual',
    Team = 'Team'
}

export interface OrganizationRating {
  ratedBy: string; // User ID
  score: number; // Added based on usage
  ratedAt: Timestamp;
  comment?: string; // Optional comment
}

export interface Team {
  teamName: string;
  members: string[]; // Array of User UIDs
  submissions?: Submission[];
  ratings?: Rating[];
}

export interface Submission {
  projectName: string; // Added
  link: string; // Added
  submittedBy: string; // Added: User UID
  submittedAt: Timestamp;
  description?: string | null; // Added, optional
  participantId?: string | null; // Added, optional (for individual events)
}

export interface Rating {
  scores: Record<string, number>; // Changed to Record<string, number>
  ratedBy: string; // User UID
  ratedAt: Timestamp; // Added
  feedback?: string; // Optional feedback/comment
}

export interface XPAllocation {
  constraintLabel: string;
  points: number;
  role: string; // Role the XP is awarded for
  constraintIndex: number; // Made mandatory for sorting/indexing
}

// Main Event Interface
export interface Event {
  id: string; // Firestore document ID
  eventName: string; // Renamed from title for consistency
  eventType: string; // Add this field
  description: string;
  status: EventStatus;
  eventFormat: EventFormat; // Added instead of isTeamEvent
  isTeamEvent: boolean; // Keep for backward compatibility checks if needed, but prefer eventFormat

  // Dates (use Timestamp for consistency with Firestore)
  startDate: Timestamp | null;
  endDate: Timestamp | null;
  desiredStartDate?: Timestamp | null; // Optional: For requests
  desiredEndDate?: Timestamp | null; // Optional: For requests
  createdAt: Timestamp; // When the document was created
  lastUpdatedAt?: Timestamp; // Optional: When last updated

  // People involved
  requester: string; // User UID who requested/created
  organizers: string[]; // Array of User UIDs

  // Participants/Teams (use one based on eventFormat)
  participants: string[]; // Array of User UIDs (for Individual format)
  teams: Team[]; // Array of Team objects (for Team format)

  // Status/Lifecycle related
  ratingsOpen: boolean;
  ratingsOpenCount: number; // How many times ratings have been opened
  ratingsLastOpenedAt: Timestamp | null; // When ratings were last opened
  ratingsClosed?: boolean; // Optional: If ratings manually closed by admin
  completedAt: Timestamp | null; // When status changed to Completed
  closed: boolean; // If permanently closed by Admin
  closedAt: Timestamp | null; // Optional: When closed
  rejectionReason?: string | null; // Optional: Reason if Rejected

  // Submissions & Ratings
  submissions: Submission[]; // For individual events
  ratings: Rating[]; // For individual events (maybe winner selections recorded here?)
  organizationRatings: OrganizationRating[]; // Ratings for the event organization itself
  teamCriteriaRatings?: Array<{ ratedBy: string; selections: { criteria: Record<string, string>; bestPerformer: string } }>;

  // Configuration
  xpAllocation: XPAllocation[]; // How XP is awarded
  winnersPerRole?: Record<string, string[]>; // role -> [winnerId] map for winner selection
  teamSize?: number; // Optional: Max team size constraint

}

// Vuex State type
export interface EventState {
  events: Event[];
  currentEventDetails: Event | null;
}
