// src/types/event.ts
import { Timestamp } from 'firebase/firestore';

// --- Base User/Member Types ---
export interface User {
    uid: string;
    name?: string;
    email?: string;
    role?: 'Student' | 'Admin' | 'Organizer'; // Keep specific roles
    photoURL?: string;
    skills?: string[];
    preferredRoles?: string[];
    xpByRole?: Record<string, number>;
}

// --- Event Related Types ---

export interface RatingCriteria {
    label: string;
    role: string;
    points: number;
}

// Make ratings/submissions consistently optional
export interface EventTeam {
    teamName: string;
    members: string[]; // Array of user UIDs
    ratings?: any[]; // Optional
    submissions?: any[]; // Optional
}

export interface XPAllocation {
    constraintIndex: number;
    constraintLabel: string;
    role: 'fullstack' | 'presenter' | 'designer' | 'problemSolver';
    points: number;
}

// Keep only one EventStatus definition
export type EventStatus = 'Pending' | 'Approved' | 'InProgress' | 'Completed' | 'Cancelled' | 'Rejected' | 'RatingOpen';

// Main Event Interface (As stored in DB)
export interface Event {
    id?: string;
    eventName: string;
    eventType: string;
    description: string;
    isTeamEvent: boolean;

    // Dates & Status
    startDate?: Timestamp; // Optional until approved
    endDate?: Timestamp;   // Optional until approved
    desiredStartDate?: Timestamp; // From request
    desiredEndDate?: Timestamp;   // From request
    createdAt: Timestamp;
    status: EventStatus;
    rejectionReason?: string;
    completedAt?: Timestamp;
    ratingsLastOpenedAt?: Timestamp;
    ratingsOpenCount?: number;
    lastUpdatedAt?: Timestamp;

    // Users
    requester: string; // UID
    organizers: string[]; // Array of UIDs

    // Configuration
    location?: string; // Make location optional here too
    xpAllocation: XPAllocation[];
    ratingsOpen: boolean;

    // Dynamic Data
    participants?: string[]; // Optional list of UIDs for individual events
    winnersPerRole?: Record<string, string[]>; // Optional
    winners?: string[]; // Optional
    teams?: EventTeam[]; // Optional, only if isTeamEvent is true
    submissions?: any[]; // Optional
    ratings?: any[]; // Optional
}

// Data Transfer Object for Creating an event (Admin/Organizer)
export interface EventCreateDTO {
    eventName: string;
    eventType: string;
    description: string;
    isTeamEvent: boolean;
    startDate: Date; // Required JS Date for creation DTO input
    endDate: Date;   // Required JS Date for creation DTO input
    location?: string; // Optional
    organizers: string[];
    xpAllocation: XPAllocation[];
    teams: EventTeam[]; // Expects potentially optional ratings/submissions
}

// Interface for Submitting an Event Request (Student)
export interface EventRequest {
    eventName: string;
    eventType: string;
    description: string;
    isTeamEvent: boolean;
    desiredStartDate: Timestamp; // Required Timestamp
    desiredEndDate: Timestamp;   // Required Timestamp
    location?: string; // Optional
    organizers: string[];
    requester: string; // UID
    xpAllocation: XPAllocation[];
    teams: EventTeam[]; // Use EventTeam[], expects potentially optional ratings/submissions
    // requestedAt: Timestamp; // Set by backend/action
    // status: 'Pending';    // Set by backend/action
}

// Represents the full event data structure, omitting the ID (Remove duplicate)
// export type EventData = Omit<Event, 'id'>;

// Represents the data structure bound to the form inputs
export interface EventFormData {
    isTeamEvent: boolean;
    eventType: string;
    eventName: string;
    description: string;
    startDate: string;
    endDate: string;
    desiredStartDate: string;
    desiredEndDate: string;
    location: string; // Keep as string, make optional if needed based on UI
    organizers: string[]; // Array of UIDs
    xpAllocation: XPAllocation[];
    teams: EventTeam[]; // Use EventTeam[], matches the source/target types
}