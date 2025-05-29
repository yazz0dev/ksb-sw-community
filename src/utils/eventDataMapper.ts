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

export const mapEventDataToFirestore = (data: EventFormData): any => {
    const firestoreData = { ...data };
    
    // Handle date conversion to Firestore Timestamps
    if (data.details.date.start || data.details.date.end) {
        const convertToTimestamp = (dateValue: any): Timestamp | null => {
            if (!dateValue) return null;
            
            try {
                let dateTime: DateTime;
                
                if (typeof dateValue === 'string') {
                    dateTime = DateTime.fromISO(dateValue);
                } else if (dateValue instanceof Date) {
                    dateTime = DateTime.fromJSDate(dateValue);
                } else if (dateValue && typeof dateValue === 'object' && 'toDate' in dateValue) {
                    return dateValue; // Already a Firestore Timestamp
                } else {
                    console.warn('Unknown date format:', dateValue);
                    return null;
                }
                
                if (!dateTime.isValid) {
                    console.warn('Invalid date:', dateValue, dateTime.invalidReason);
                    return null;
                }
                
                return Timestamp.fromDate(dateTime.toJSDate());
            } catch (error) {
                console.error('Error converting date to Timestamp:', error);
                return null;
            }
        };
        
        // Convert to Timestamps for Firestore storage
        const startTimestamp = convertToTimestamp(data.details.date.start);
        const endTimestamp = convertToTimestamp(data.details.date.end);
        
        // Add dateTimestamps as a separate top-level property for Firestore
        firestoreData.dateTimestamps = {
            start: startTimestamp,
            end: endTimestamp
        };
    }
    
    // Add createdAt and lastUpdatedAt timestamps for new events
    if (!firestoreData.createdAt) {
        firestoreData.createdAt = Timestamp.now();
    }
    firestoreData.lastUpdatedAt = Timestamp.now();
    
    return firestoreData;
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

    // Convert Firestore date objects back to Event format (Timestamp | null)
    if (event.details && typeof event.details === 'object' && event.details.date && typeof event.details.date === 'object') {
        const sourceStartDate = firestoreData.details?.date?.start;
        if (sourceStartDate instanceof Timestamp) {
            event.details.date.start = sourceStartDate;
        } else if (sourceStartDate) {
            event.details.date.start = getISTTimestamp(sourceStartDate);
        } else {
            event.details.date.start = null;
        }

        const sourceEndDate = firestoreData.details?.date?.end;
        if (sourceEndDate instanceof Timestamp) {
            event.details.date.end = sourceEndDate;
        } else if (sourceEndDate) {
            event.details.date.end = getISTTimestamp(sourceEndDate);
        } else {
            event.details.date.end = null;
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