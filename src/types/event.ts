import { Timestamp } from 'firebase/firestore';

export interface EventTeam {
    teamName: string;
    members: string[];
    ratings: any[];
    submissions: any[];
}

export interface XPAllocation {
    constraintIndex: number;
    constraintLabel: string;
    points: number;
    role: string;
}

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
    status: 'Pending' | 'Approved' | 'InProgress' | 'Completed' | 'Cancelled' | 'Rejected';
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
