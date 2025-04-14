// src/types/event.ts
import { Timestamp } from 'firebase/firestore';

// Basic structure for XP allocation criteria
export interface XPAllocation {
    constraintIndex: number; // Index within the array (0-3)
    constraintLabel: string; // e.g., "Functionality", "Presentation Clarity"
    role: 'fullstack' | 'presenter' | 'designer' | 'problemSolver' | string; // Role this criteria applies to
    points: number; // XP points awarded for meeting this criteria
}

// Structure for a team within an event
export interface EventTeam {
    teamName: string;
    members: string[]; // Array of user UIDs
    submissions: any[]; // Array of submission objects (define structure if needed)
    ratings: any[]; // Array of rating objects (define structure if needed)
}

export interface Student {
    uid: string;
    name?: string;
    role?: string;
}

// Base Event structure (Common fields)
interface EventBase {
    id?: string; // Optional Firestore document ID
    eventName: string;
    eventType: string;
    description: string;
    isTeamEvent: boolean;
    location?: string; // Optional location field
    organizers: string[]; // Array of user UIDs (includes requester/creator)
    xpAllocation: XPAllocation[];
    teams: EventTeam[];
    status: 'Pending' | 'Approved' | 'InProgress' | 'Completed' | 'Cancelled' | 'Rejected';
    createdAt?: Timestamp; // Firestore Timestamp
    lastUpdatedAt?: Timestamp; // Firestore Timestamp
    // Fields populated after creation/approval
    participants?: string[]; // Array of user UIDs (for individual events)
    ratingsOpen?: boolean;
    winnersPerRole?: Record<string, string[]>; // Map of role to array of winner UIDs
    submissions?: any[]; // Submissions for individual events
    ratings?: any[]; // Ratings for individual events or overall event ratings
    organizationRatings?: number[]; // Array of scores (e.g., 1-5)
    completedAt?: Timestamp | null;
    ratingsLastOpenedAt?: Timestamp | null;
    ratingsOpenCount?: number;
    rejectionReason?: string | null;
}

// Structure for creating a new event (Admin)
export interface EventCreateDTO extends Omit<EventBase, 'id' | 'status' | 'desiredStartDate' | 'desiredEndDate' | 'requester' | 'createdAt' | 'lastUpdatedAt'> {
    startDate: Timestamp; // Admin sets actual dates
    endDate: Timestamp;
}

// Structure for requesting a new event (Non-Admin)
export interface EventRequest extends Omit<EventBase, 'id' | 'status' | 'startDate' | 'endDate' | 'createdAt' | 'lastUpdatedAt'> {
    desiredStartDate: Timestamp; // User requests desired dates
    desiredEndDate: Timestamp;
    requester: string; // UID of the user making the request
}

// Combined type representing an event document in Firestore
export interface EventDocument extends EventBase {
    // Fields specific to Firestore document structure if any
    startDate?: Timestamp | null; // Actual start date (set on approval/creation)
    endDate?: Timestamp | null; // Actual end date (set on approval/creation)
    desiredStartDate?: Timestamp | null; // Requested start date (for pending requests)
    desiredEndDate?: Timestamp | null; // Requested end date (for pending requests)
    requester?: string | null; // UID of the user who requested (if applicable)
}

// --- NEW: Structure for the form data in EventForm.vue ---
export interface EventFormData {
    isTeamEvent: boolean;
    eventType: string;
    eventName: string;
    description: string;
    // Dates are handled as YYYY-MM-DD strings in the form
    startDate: string | null; // YYYY-MM-DD format
    endDate: string | null; // YYYY-MM-DD format
    desiredStartDate: string | null; // YYYY-MM-DD format
    desiredEndDate: string | null; // YYYY-MM-DD format
    location: string; // Optional location
    organizers: string[]; // Array of co-organizer UIDs (creator/requester added in action)
    xpAllocation: XPAllocation[];
    teams: EventTeam[];
}