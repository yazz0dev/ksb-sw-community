// src/utils/eventDataMapper.ts
import { Timestamp } from 'firebase/firestore';
import { DateTime } from 'luxon';
import { Team, Event, EventFormat, EventCriteria, Submission } from '@/types/event'; // Added EventCriteria

// Helper function to convert JS Date or ISO string to Firestore Timestamp in IST
const getISTTimestamp = (dateInput: Date | string | Timestamp | { seconds: number, nanoseconds: number } | null | undefined): Timestamp | null => {
    if (!dateInput) return null;
    if (dateInput instanceof Timestamp) return dateInput; // Already a Timestamp

    // Handle plain objects that look like Firestore Timestamps (from JSON.parse(JSON.stringify(timestamp)))
    if (typeof dateInput === 'object' && 'seconds' in dateInput && 'nanoseconds' in dateInput && !(dateInput instanceof Date)) {
        return new Timestamp(dateInput.seconds, dateInput.nanoseconds);
    }

    let dt: DateTime;
    if (dateInput instanceof Date) {
        dt = DateTime.fromJSDate(dateInput);
    } else if (typeof dateInput === 'string') {
        // Try to parse as ISO, if it fails, it might be a different format or invalid
        dt = DateTime.fromISO(dateInput);
        if (!dt.isValid) {
            // Attempt to parse common date formats if ISO fails, or handle as error
            // For now, we assume ISO or JS Date. Add more parsing if needed.
            console.warn("getISTTimestamp received a string that is not a valid ISO date:", dateInput);
            return null;
        }
    } else {
        console.warn("getISTTimestamp received unexpected dateInput type:", dateInput);
        return null;
    }

    if (dt.isValid) {
        return Timestamp.fromDate(dt.toJSDate());
    }
    // This path should ideally not be reached if the above checks are comprehensive
    console.warn("getISTTimestamp failed to convert dateInput:", dateInput);
    return null;
};

// Interface for the structure expected by Firestore (can be Partial<Event> potentially)
export type MappedEventData = Partial<Event> & {
    // Add any specific transformations if needed, e.g., dates become Timestamps
    createdAt?: Timestamp;
    lastUpdatedAt?: Timestamp;
};

export function mapEventDataToFirestore(eventData: Partial<Event>): Record<string, any> {
    // Deep clone to avoid modifying the original object, especially important for Vue reactivity
    const data: Record<string, any> = JSON.parse(JSON.stringify(eventData));

    // Convert dates in details
    if (data.details?.date) {
        if (data.details.date.start !== undefined && data.details.date.start !== null) {
            data.details.date.start = getISTTimestamp(data.details.date.start);
        }
        if (data.details.date.end !== undefined && data.details.date.end !== null) {
            data.details.date.end = getISTTimestamp(data.details.date.end);
        }
    }

    // Convert top-level Timestamp fields if they are present and not already Timestamps
    const dateFields: (keyof Event)[] = ['createdAt', 'lastUpdatedAt', 'completedAt', 'closedAt'];
    dateFields.forEach(field => {
        // Simplified condition: if the field exists (not null/undefined),
        // let getISTTimestamp handle it (it returns existing Timestamps as is).
        if (data[field] != null) { 
            data[field] = getISTTimestamp(data[field]);
        }
    });

    // Ensure submissions have Timestamps if present
    if (Array.isArray(data.submissions)) {
        data.submissions = data.submissions.map((sub: Partial<Submission>) => ({
            ...sub,
            // Simplified logic: if sub.submittedAt exists (not null/undefined),
            // let getISTTimestamp handle it. Otherwise, keep it as null/undefined.
            submittedAt: sub.submittedAt != null 
                ? getISTTimestamp(sub.submittedAt) 
                : sub.submittedAt
        }));
    }
    
    // Ensure criteria is an array (it might be an object if coming directly from Firestore in some cases)
    if (data.criteria && typeof data.criteria === 'object' && !Array.isArray(data.criteria)) {
        data.criteria = Object.values(data.criteria as Record<string, EventCriteria>);
    }

    // Ensure teams is an array
    if (data.teams && typeof data.teams === 'object' && !Array.isArray(data.teams)) {
        data.teams = Object.values(data.teams as Record<string, Team>);
    }

    // Recursively remove undefined properties to prevent them being written to Firestore,
    // as Firestore rules might behave unexpectedly with fields explicitly set to undefined.
    function removeUndefined(obj: any): any {
        if (typeof obj !== 'object' || obj === null) return obj;
        if (Array.isArray(obj)) return obj.map(removeUndefined).filter(item => item !== undefined);

        const newObj: Record<string, any> = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key) && obj[key] !== undefined) {
                const value = removeUndefined(obj[key]);
                if (value !== undefined) {
                    newObj[key] = value;
                }
            }
        }
        return newObj;
    }

    return removeUndefined(data);
}
