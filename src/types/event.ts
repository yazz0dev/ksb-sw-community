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
    startDate: Timestamp;
    endDate: Timestamp;
    createdAt: Timestamp;
    status: 'Pending' | 'Approved' | 'In Progress' | 'Completed' | 'Cancelled';

    // Users
    organizer: string;
    requester: string;
    coOrganizers: string[];
    participants: string[];

    // Ratings & XP
    xpAllocation: XPAllocation[];
    ratingsOpen: boolean;
    winnersPerRole: Record<string, string[]>;

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
    organizer: string;
    coOrganizers: string[];
    xpAllocation: XPAllocation[];
    teams?: Partial<EventTeam>[];
}
