// src/utils/eventDataMapper.ts
import { Timestamp, DocumentData, deleteField } from 'firebase/firestore';
import {
    Event,
    EventStatus,
    EventFormat,
    Team,
    Submission,
    OrganizerRating,
    EventFormData,
    EventDetails,
    EventDate,
    GalleryItem,
    EventCriterion,
    EventLifecycleTimestamps
} from '@/types/event';
import { DateTime } from 'luxon';

// Helper function to convert JS Date or ISO string to Firestore Timestamp in IST
export const getISTTimestamp = (dateInput: Date | string | Timestamp | { seconds: number, nanoseconds: number } | null | undefined): Timestamp | null => {
    if (!dateInput) return null;
    if (dateInput instanceof Timestamp) return dateInput;

    if (typeof dateInput === 'object' && 'seconds' in dateInput && 'nanoseconds' in dateInput && !(dateInput instanceof Date)) {
        return new Timestamp(dateInput.seconds, dateInput.nanoseconds);
    }

    let dt: DateTime;
    if (typeof dateInput === 'string') {
        dt = DateTime.fromISO(dateInput, { zone: 'utc' });
    } else if (dateInput instanceof Date) {
        dt = DateTime.fromJSDate(dateInput);
    } else {
        return null; 
    }
    
    if (!dt.isValid) return null;

    return Timestamp.fromDate(dt.setZone('Asia/Kolkata').toJSDate());
};


export const mapEventDataToFirestore = (data: Partial<Event> | EventFormData, isNew = false, existingEvent?: Event): Partial<Event> => {
    const sourceData = { ...data };
    const eventToFirestore: Partial<Event> = {};

    // Validate organizers if details are present
    if ('details' in sourceData && sourceData.details) {
        const detailsFromSource = sourceData.details;
        
        // Ensure organizers list is valid
        if (!Array.isArray(detailsFromSource.organizers)) {
            throw new Error('Organizers must be an array');
        }
        if (detailsFromSource.organizers.length === 0) {
            throw new Error('Event must have at least one organizer');
        }
        if (detailsFromSource.organizers.length > 10) {
            throw new Error('Event cannot have more than 10 organizers');
        }
        
        // For new events, ensure creator is in organizers list
        if (isNew && 'requestedBy' in sourceData && typeof sourceData.requestedBy === 'string') {
            if (!detailsFromSource.organizers.includes(sourceData.requestedBy)) {
                detailsFromSource.organizers.push(sourceData.requestedBy);
            }
        }

        eventToFirestore.details = {
            ...detailsFromSource,
            date: { 
                start: getISTTimestamp(detailsFromSource.date?.start),
                end: getISTTimestamp(detailsFromSource.date?.end),
            },
        } as EventDetails;
    }

    if ('id' in sourceData && typeof sourceData.id === 'string') {
        eventToFirestore.id = sourceData.id;
    }
    if ('status' in sourceData && sourceData.status !== undefined) {
        eventToFirestore.status = sourceData.status;
    }
    if ('requestedBy' in sourceData && typeof sourceData.requestedBy === 'string') {
        eventToFirestore.requestedBy = sourceData.requestedBy;
    }
    
    if ('criteria' in sourceData && sourceData.criteria !== undefined) eventToFirestore.criteria = sourceData.criteria;
    if ('participants' in sourceData && sourceData.participants !== undefined) eventToFirestore.participants = sourceData.participants;
    if ('teams' in sourceData && sourceData.teams !== undefined) eventToFirestore.teams = sourceData.teams;
    if ('teamMemberFlatList' in sourceData && sourceData.teamMemberFlatList !== undefined) eventToFirestore.teamMemberFlatList = sourceData.teamMemberFlatList;
    if ('submissions' in sourceData && sourceData.submissions !== undefined) eventToFirestore.submissions = sourceData.submissions;
    
    if ('votingOpen' in sourceData && typeof sourceData.votingOpen === 'boolean') eventToFirestore.votingOpen = sourceData.votingOpen;
    if ('bestPerformerSelections' in sourceData && sourceData.bestPerformerSelections !== undefined) eventToFirestore.bestPerformerSelections = sourceData.bestPerformerSelections;
    if ('winners' in sourceData && sourceData.winners !== undefined) eventToFirestore.winners = sourceData.winners;
    if ('manuallySelectedBy' in sourceData && sourceData.manuallySelectedBy !== undefined) {
         eventToFirestore.manuallySelectedBy = sourceData.manuallySelectedBy === null ? undefined : sourceData.manuallySelectedBy;
    }
    if ('organizerRatings' in sourceData && sourceData.organizerRatings !== undefined) eventToFirestore.organizerRatings = sourceData.organizerRatings; 
    
    if ('lifecycleTimestamps' in sourceData && sourceData.lifecycleTimestamps !== undefined) eventToFirestore.lifecycleTimestamps = sourceData.lifecycleTimestamps;
    
    if ('rejectionReason' in sourceData) {
        const reason = sourceData.rejectionReason;
        eventToFirestore.rejectionReason = reason === null ? undefined : reason;
    }
    
    const srcCreatedAt = 'createdAt' in sourceData ? sourceData.createdAt : undefined;
    const srcLastUpdatedAt = 'lastUpdatedAt' in sourceData ? sourceData.lastUpdatedAt : undefined;

    if (isNew) {
        eventToFirestore.createdAt = srcCreatedAt instanceof Timestamp ? srcCreatedAt : Timestamp.now();
        eventToFirestore.lastUpdatedAt = srcLastUpdatedAt instanceof Timestamp ? srcLastUpdatedAt : Timestamp.now();
        eventToFirestore.votingOpen = false; // Ensure votingOpen is false for new events
    } else {
        eventToFirestore.lastUpdatedAt = srcLastUpdatedAt instanceof Timestamp ? srcLastUpdatedAt : Timestamp.now();
        if (existingEvent?.createdAt) {
            eventToFirestore.createdAt = existingEvent.createdAt;
        } else if (srcCreatedAt instanceof Timestamp) {
            eventToFirestore.createdAt = srcCreatedAt;
        }
    }
    
    // These keys are expected to be on `Event` or `EventFormData`
    const optionalTimestampKeys: (keyof Event | keyof EventFormData)[] = ['completedAt', 'closedAt'];
    
    optionalTimestampKeys.forEach(key => {
        if (key in sourceData) {
            const tsValue = (sourceData as Partial<Event> & EventFormData)[key] as Date | string | Timestamp | null | undefined;
            if (tsValue instanceof Timestamp) {
                (eventToFirestore as any)[key] = tsValue;
            } else if (tsValue) { 
                (eventToFirestore as any)[key] = getISTTimestamp(tsValue);
            } else if (tsValue === null) {
                (eventToFirestore as any)[key] = null; 
            }
        }
    });

    return eventToFirestore;
};

const tsNullToUndefined = (ts: Timestamp | null): Timestamp | undefined => {
    return ts === null ? undefined : ts;
};

export const mapFirestoreToEventData = (id: string, firestoreData: DocumentData | null | undefined): Event | null => {
    if (!firestoreData) return null;

    const event: Partial<Event> = {
        id,
        ...firestoreData,
    };

    // Assuming EventDetails.date.start/end can be Timestamp | null
    if (event.details && typeof event.details === 'object' && event.details.date && typeof event.details.date === 'object') {
        const sourceStartDate = firestoreData.details?.date?.start;
        if (sourceStartDate instanceof Timestamp) {
            event.details.date.start = sourceStartDate;
        } else if (sourceStartDate) {
            event.details.date.start = getISTTimestamp(sourceStartDate); // Returns Timestamp | null
        } else {
            event.details.date.start = null; // Or undefined if your type prefers that
        }

        const sourceEndDate = firestoreData.details?.date?.end;
        if (sourceEndDate instanceof Timestamp) {
            event.details.date.end = sourceEndDate;
        } else if (sourceEndDate) {
            event.details.date.end = getISTTimestamp(sourceEndDate); // Returns Timestamp | null
        } else {
            event.details.date.end = null; // Or undefined
        }
    }
    
    // For fields on Event type that are Timestamp | undefined
    const timestampFields: (keyof Event)[] = ['createdAt', 'lastUpdatedAt', 'closedAt'];
    timestampFields.forEach(field => {
        const fieldValue = firestoreData[field];
        if (fieldValue instanceof Timestamp) {
            (event as any)[field] = fieldValue;
        } else if (fieldValue) {
            (event as any)[field] = tsNullToUndefined(getISTTimestamp(fieldValue));
        } else {
            (event as any)[field] = undefined;
        }
    });

    if (firestoreData.lifecycleTimestamps && typeof firestoreData.lifecycleTimestamps === 'object') {
        event.lifecycleTimestamps = {};
        const lifecycleKeys: (keyof EventLifecycleTimestamps)[] = ['rejectedAt', 'completedAt'];
        lifecycleKeys.forEach(key => {
            const tsValue = firestoreData.lifecycleTimestamps[key];
            if (tsValue instanceof Timestamp) {
                event.lifecycleTimestamps![key] = tsValue;
            } else if (tsValue) {
                event.lifecycleTimestamps![key] = tsNullToUndefined(getISTTimestamp(tsValue));
            } else {
                event.lifecycleTimestamps![key] = undefined;
            }
        });
    } else if ('lifecycleTimestamps' in event) {
        event.lifecycleTimestamps = undefined;
    }
    
    if (Array.isArray(firestoreData.organizerRatings)) {
        event.organizerRatings = firestoreData.organizerRatings.map((rating: any) => {
            const ratedAtValue = rating.ratedAt;
            return {
                ...rating,
                ratedAt: ratedAtValue instanceof Timestamp ? ratedAtValue : tsNullToUndefined(getISTTimestamp(ratedAtValue)),
            };
        });
    } else if ('organizerRatings' in event) {
         event.organizerRatings = undefined;
    }

    if (Array.isArray(firestoreData.submissions)) {
        event.submissions = firestoreData.submissions.map((sub: any) => {
            const submittedAtValue = sub.submittedAt;
            return {
                ...sub,
                submittedAt: submittedAtValue instanceof Timestamp ? submittedAtValue : tsNullToUndefined(getISTTimestamp(submittedAtValue)),
            };
        });
    } else if ('submissions' in event) {
        event.submissions = undefined;
    }

    if (firestoreData.criteria && typeof firestoreData.criteria === 'object' && !Array.isArray(firestoreData.criteria)) {
        event.criteria = Object.values(firestoreData.criteria) as EventCriterion[];
    } else if (Array.isArray(firestoreData.criteria)) {
        event.criteria = firestoreData.criteria as EventCriterion[];
    } else {
        event.criteria = undefined;
    }

    return event as Event;
};