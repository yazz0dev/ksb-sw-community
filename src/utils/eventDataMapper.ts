// src/utils/eventDataMapper.ts
import { Timestamp } from 'firebase/firestore';
import { DateTime } from 'luxon';
import { EventFormat, Team, Event } from '@/types/event'; // Remove EventData, keep Event

// Helper function to convert JS Date or ISO string to Firestore Timestamp in IST
const getISTTimestamp = (dateInput: Date | string | Timestamp | null | undefined): Timestamp | null => {
/*...*/
};

// Interface for the structure expected by Firestore (can be Partial<Event> potentially)
export type MappedEventData = Partial<Event> & {
    // Add any specific transformations if needed, e.g., dates become Timestamps
    startDate?: Timestamp | null;
    endDate?: Timestamp | null;
    desiredStartDate?: Timestamp | null;
    desiredEndDate?: Timestamp | null;
    createdAt?: Timestamp;
    lastUpdatedAt?: Timestamp;
};

// Function to map frontend event data (like FormData) to Firestore-compatible structure
export function mapEventDataToFirestore(eventData: Partial<Event>): MappedEventData {
    const mappedData: any = { ...eventData }; // Use any for flexibility or MappedEventData

    // Convert date strings/objects to Timestamps
    const dateFields: (keyof Event)[] = ['startDate', 'endDate', 'desiredStartDate', 'desiredEndDate', 'createdAt', 'lastUpdatedAt'];
    dateFields.forEach(field => {
        if (mappedData[field]) {
            mappedData[field] = getISTTimestamp(mappedData[field]);
        } else if (mappedData.hasOwnProperty(field)) { // Handle null/undefined cases explicitly if needed
            mappedData[field] = null;
        }
    });

    // Ensure teams structure is correct (example: filter empty members)
    if (mappedData.teams && Array.isArray(mappedData.teams)) {
        mappedData.teams = mappedData.teams.map((t: Team) => ({ // Add type Team
            ...t,
            members: Array.isArray(t.members) ? t.members.filter(Boolean) : [],
            // Ensure other team sub-properties are handled if needed
            submissions: Array.isArray(t.submissions) ? t.submissions : [],
            ratings: Array.isArray(t.ratings) ? t.ratings : [],
        }));
    }

    // Ensure participants is an array of strings
    if (mappedData.participants && !Array.isArray(mappedData.participants)) {
        // Handle potential legacy object format if necessary, otherwise default to empty array
        mappedData.participants = [];
        console.warn("Participants field was not an array, defaulting to empty.");
    } else if (Array.isArray(mappedData.participants)) {
        mappedData.participants = mappedData.participants.filter(Boolean); // Filter out falsy values
    }

    // Remove undefined fields as Firestore doesn't accept them
    Object.keys(mappedData).forEach(key => {
        if (mappedData[key] === undefined) {
            delete mappedData[key];
        }
    });

    return mappedData as MappedEventData; // Assert final type
}
