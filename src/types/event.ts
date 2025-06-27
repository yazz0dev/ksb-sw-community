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
  MultiEvent = 'MultiEvent' // New format for multi-stage/phase events, replaces Competition
}

// --- Supporting Interfaces ---

// New interface for individual phases within a MultiEvenet
export interface EventPhase {
  id: string; // Unique ID for the phase within the event
  phaseName: string; // e.g., "Round 1: Coding Challenge", "Final Pitch"
  description: string;
  format: EventFormat.Individual | EventFormat.Team; // A phase itself is either Individual or Team based
  type: string; // Specific type for this phase, e.g., "Coding Submission", "Presentation"
  
  participants?: string[] | null; // Participants specific to this phase (can be subset of main event)
  coreParticipants?: string[] | null; // If phase format is Individual
  
  criteria?: EventCriteria[] | null; // Rating criteria specific to this phase
  teams?: Team[] | null; // Teams specific to this phase (if phase format is Team)
  
  rules?: string | null; // Make sure this is string | null and not undefined
  prize?: string | null; // Prize for this specific phase
  allowProjectSubmission: boolean; // Ensure this is always boolean, not nullable
  
  // Phase-specific winner tracking
  winners?: Record<string, string[]> | null; // Key: criterionKey/title from phase.criteria, Value: array of user UIDs
  // Optional: For more detailed phase-level voting, if implemented in future
  // criteriaVotes?: Record<string, Record<string, string>> | null;
  // bestPerformerSelections?: Record<string, string> | null;

  // Dates for phases are typically relative to parent or sequential, not absolute standalone dates.
  // For simplicity, not adding separate start/end here; they'd be managed by parent event's timeline.
  // Voting for a phase would also be managed in context of the phase.
}

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
  format: EventFormat; // This will determine if 'phases' array is used
  isCompetition?: boolean; // NEW: Indicates if the MultiEvent as a whole is a competition OR if an Individual event is a competition
  organizers: string[];
  // coreParticipants: For Individual events, these are the main participants
  // For Team events, participants are organized in teams, not here
  // For MultiEvent, coreParticipants at this level represent overall event participants
  coreParticipants: string[]; 
  type?: string; // Added back for Individual and Team formats
  date: {
    start: Timestamp | string | null;
    end: Timestamp | string | null;
  };
  rules?: string | null; // Overall event rules
  prize?: string | null; // Overall event prize (if any, distinct from phase prizes)
  allowProjectSubmission: boolean; // Overall setting, can be overridden by phase if not MultiEvent

  phases?: EventPhase[] | null; // Array of phases, only if format is MultiEvenet
}

export interface EventCriteria {
  description?: string | null | undefined; // Changed from any
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
  phaseId?: string | null; // Optional: to link submission to a specific phase
}

export interface Team {
  id: string | undefined; // Make explicit to handle exactOptionalPropertyTypes
  teamName: string;
  members: string[];
  teamLead: string | undefined; // Allow undefined for team lead
}

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
  requestedBy: string;
  votingOpen: boolean; // Overall voting status, phase-specific voting might be handled differently
  // childEventIds is removed
  lastUpdatedAt?: Timestamp | null | undefined;
  // participants: General event participants (can include organizers, observers, etc.)
  // For Individual events, use details.coreParticipants for the actual competitors
  participants?: string[] | null | undefined; 
  submissions?: Submission[] | null | undefined;
  criteria?: EventCriteria[] | null | undefined;
  teams?: Team[] | null | undefined;
  organizerRatings?: Record<string, OrganizerRating> | null | undefined; // UID to Rating
  winners?: Record<string, string[]> | null | undefined; // Consistent array type for all winners
  
  // Fix the type definitions for criteriaVotes and bestPerformerSelections
  criteriaVotes?: Record<string, Record<string, string>> | null | undefined; // userId -> constraintKey -> selected value
  bestPerformerSelections?: Record<string, string> | null | undefined; // userId -> selected performer userId
  
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
    rules?: string | null | undefined; // Allow undefined for form data compatibility
    format: EventFormat;
    isCompetition?: boolean; // NEW: Applicable to Individual or MultiEvent
    organizers: string[];
    coreParticipants: string[];
    type?: string; // Added back for Individual and Team formats
    parentId?: string | null; // Ensure parentId is here
    date: {
      start: string | null;
      end: string | null;
    };
    allowProjectSubmission: boolean;
    prize?: string | null | undefined; // Allow undefined for form data compatibility
    phases?: EventPhase[] | null; // For creating/editing MultiEvenets
  };
  participants?: string[]; // Added participants to the root
  // childEventIds is removed
  criteria?: EventCriteria[]; // Overall criteria if not a MultiEvenet or default criteria for phases
  teams?: Team[]; // Overall teams if not a MultiEvenet or default teams for phases
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

export type EventWinners = Record<string, string[]>; // Consistent array type for winners