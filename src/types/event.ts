import { Timestamp } from 'firebase/firestore';

export interface Student {
    uid: string;
    name: string;
    role?: string;
}

export interface RatingCriteria {
    label: string;
    role: string;
    points: number;
}

export interface TeamMember {
    teamName: string;
    members: string[];
    ratings?: any[];
    submissions?: any[];
    isNew?: boolean;
}

// renamed from EventTeam to TeamMember for consistency
export type EventTeam = Omit<TeamMember, 'isNew'>;

export interface XPAllocation {
    constraintIndex: number;
    constraintLabel: string;
    points: number;
    role: string;
}

export type EventStatus = 'Pending' | 'Approved' | 'InProgress' | 'Completed' | 'Cancelled' | 'Rejected';

export interface Event {
    // Basic Info
    id?: string;
    eventName: string;
    eventType: string;
    description: string;
    isTeamEvent: boolean;

    // Dates & Status
    startDate?: Timestamp;
    endDate?: Timestamp;
    desiredStartDate?: Timestamp;
    desiredEndDate?: Timestamp;
    createdAt: Timestamp;
    status: EventStatus;
    rejectionReason?: string;
    completedAt?: Timestamp;
    ratingsLastOpenedAt?: Timestamp;
    ratingsOpenCount?: number;
    lastUpdatedAt?: Timestamp;

    // Users
    requester: string;
    organizers: string[];
    participants?: string[];

    // Ratings & XP
    xpAllocation: XPAllocation[];
    ratingsOpen: boolean;
    winnersPerRole?: Record<string, string[]>;
    winners?: string[];

    // Team or Individual specific data
    teams?: EventTeam[];
    submissions?: any[];
    ratings?: any[];
}

export interface EventCreateDTO {
    eventName: string;
    eventType: string;
    description: string;
    isTeamEvent: boolean;
    startDate: Date;
    endDate: Date;
    organizers: string[];
    xpAllocation: XPAllocation[];
    teams?: Partial<EventTeam>[];
}

// Add EventRequest interface
export interface EventRequest {
    eventName: string;
    eventType: string;
    description: string;
    isTeamEvent: boolean;
    desiredStartDate: Timestamp;
    desiredEndDate: Timestamp;
    organizers: string[];
    requester: string;
    xpAllocation: XPAllocation[];
    teams: TeamMember[];
    requestedAt: Timestamp;
    status: 'Pending';
}

// Add EventData type (used in CreateEditEventView)
export type EventData = Omit<Event, 'id'>;
