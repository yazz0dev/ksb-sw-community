// src/types/event.ts
import { Timestamp } from 'firebase/firestore';

export enum EventFormat {
  Individual = 'Individual',
  Team = 'Team'
}

export enum EventStatus {
  Pending = 'Pending',
  Approved = 'Approved', 
  InProgress = 'InProgress',
  Completed = 'Completed',
  Cancelled = 'Cancelled',
  Rejected = 'Rejected'
}

export interface Submission {
  projectName: string;
  link: string;
  description?: string | null;
  submittedAt: Timestamp;
  submittedBy: string;
  participantId: string | null;
}

export interface Rating {
  ratedBy: string;
  ratedAt: Timestamp;
  scores?: Record<string, number>;
  type?: 'winner_selection' | string;
}

export interface Team {
  teamName: string;
  members: string[];
  submissions: Submission[];
  ratings: Rating[];
}

export interface OrganizationRating {
  ratedBy: string;
  score: number;
  ratedAt: Timestamp;
}

export interface XPAllocation {
  constraintLabel: string;
  points: number;
  role?: string;
  targetRole?: string;
  constraintIndex?: number;
}

export interface Event {
  id?: string;
  eventName: string;
  eventType: string;
  description: string;
  status: EventStatus;
  isTeamEvent: boolean;
  eventFormat?: EventFormat;
  startDate: Timestamp | null;
  endDate: Timestamp | null;
  desiredStartDate?: Timestamp | null;
  desiredEndDate?: Timestamp | null;
  requester: string;
  organizers: string[];
  participants: string[];
  teams: Team[];
  submissions: Submission[];
  ratings: Rating[];
  ratingsOpen: boolean;
  ratingsOpenCount: number;
  ratingsLastOpenedAt?: Timestamp | null;
  xpAllocation: XPAllocation[];
  organizationRatings: OrganizationRating[];
  winnersPerRole: Record<string, string[]>;
  rejectionReason?: string | null;
  completedAt?: Timestamp | null;
  closed: boolean;
  closedAt?: Timestamp | null;
  createdAt: Timestamp;
  lastUpdatedAt?: Timestamp;
}

export interface EventState {
  events: Event[];
  currentEventDetails: Event | null;
  loading: boolean;
  error: string | null;
}

export type EventData = Partial<Event>;