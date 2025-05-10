// src/utils/eventDataMapper.ts
import { Timestamp } from 'firebase/firestore';
import { DateTime } from 'luxon';
import { Team, Event, EventFormat } from '@/types/event';

// Helper function to convert JS Date or ISO string to Firestore Timestamp in IST
const getISTTimestamp = (dateInput: Date | string | Timestamp | null | undefined): Timestamp | null => {
    if (!dateInput) return null;
    if (dateInput instanceof Timestamp) return dateInput;
    if (dateInput instanceof Date) return Timestamp.fromDate(dateInput);
    if (typeof dateInput === 'string') {
        const dt = DateTime.fromISO(dateInput);
        if (dt.isValid) return Timestamp.fromDate(dt.toJSDate());
        return null;
    }
    return null;
};

// Interface for the structure expected by Firestore (can be Partial<Event> potentially)
export type MappedEventData = Partial<Event> & {
    // Add any specific transformations if needed, e.g., dates become Timestamps
    createdAt?: Timestamp;
    lastUpdatedAt?: Timestamp;
};

export function mapEventDataToFirestore(eventData: Partial<Event>): Record<string, any> {
    const mappedData: Record<string, any> = JSON.parse(JSON.stringify(eventData));

    if (mappedData.details?.date) {
        mappedData.details.date.start = getISTTimestamp(mappedData.details.date.start);
        mappedData.details.date.end = getISTTimestamp(mappedData.details.date.end);
    }
    if (mappedData.createdAt) mappedData.createdAt = getISTTimestamp(mappedData.createdAt);
    if (mappedData.lastUpdatedAt) mappedData.lastUpdatedAt = getISTTimestamp(mappedData.lastUpdatedAt);
    if (mappedData.completedAt) mappedData.completedAt = getISTTimestamp(mappedData.completedAt);
    if (mappedData.closedAt) mappedData.closedAt = getISTTimestamp(mappedData.closedAt);


    if (mappedData.teams && Array.isArray(mappedData.teams)) {
        mappedData.teams = mappedData.teams.map((t: Team) => ({
            teamName: t.teamName || '',
            members: Array.isArray(t.members) ? t.members.filter(Boolean) : [],
            teamLead: t.teamLead || (Array.isArray(t.members) && t.members.length > 0 ? t.members[0] : ''),
            // Submissions and ratings are no longer part of Team type for Firestore storage
        }));
        // Calculate teamMembersFlat if teams are present
        mappedData.teamMembersFlat = Array.from(new Set(mappedData.teams.flatMap((team: Team) => team.members || []).filter(Boolean)));
    } else if (mappedData.details?.format === EventFormat.Team && !mappedData.teams) {
        // If it's a team event but teams array is missing or empty, ensure teamMembersFlat is an empty array
        mappedData.teamMembersFlat = [];
    }


    if (mappedData.participants && !Array.isArray(mappedData.participants)) {
        mappedData.participants = [];
        console.warn("Participants field was not an array, defaulting to empty.");
    } else if (Array.isArray(mappedData.participants)) {
        mappedData.participants = mappedData.participants.filter(Boolean);
    }

    // Ensure submissions array exists and is clean if provided
    if (mappedData.submissions && Array.isArray(mappedData.submissions)) {
        mappedData.submissions = mappedData.submissions.map((s: any) => ({ // Use 'any' temporarily if Submission type causes issues here
            ...s,
            submittedAt: getISTTimestamp(s.submittedAt) || Timestamp.now() // Default to now if missing
        }));
    } else if (mappedData.details?.allowProjectSubmission && !mappedData.submissions) {
        mappedData.submissions = []; // Initialize if allowed but not present
    }


    Object.keys(mappedData).forEach(key => {
        if (mappedData[key] === undefined) {
            delete mappedData[key];
        }
        // Ensure nested objects like 'details' are also cleaned
        if (typeof mappedData[key] === 'object' && mappedData[key] !== null) {
            Object.keys(mappedData[key]).forEach(subKey => {
                if (mappedData[key][subKey] === undefined) {
                    delete mappedData[key][subKey];
                }
            });
        }
    });

    return mappedData;
}
