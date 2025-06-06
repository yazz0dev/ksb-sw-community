import { Timestamp, serverTimestamp } from 'firebase/firestore';
import type { DocumentData } from 'firebase/firestore';
import { DateTime } from 'luxon';
import { BEST_PERFORMER_LABEL } from '@/utils/constants';
import type {
    Event,
    EventFormData,
    EventCriteria,
    EventLifecycleTimestamps
} from '@/types/event';
import { EventFormat, EventStatus } from '@/types/event';

// ------------------------------------------------
// TIMESTAMP CONVERSION UTILITIES
// ------------------------------------------------

/**
 * Converts a JS Date, ISO string, or timestamp object to Firestore Timestamp in IST timezone
 */
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

/**
 * Converts null to undefined for Timestamp fields
 */
const tsNullToUndefined = (ts: Timestamp | null): Timestamp | undefined => {
    return ts === null ? undefined : ts;
};

/**
 * Helper function to convert different date formats to Firestore Timestamp
 */
function convertToTimestamp(dateValue: any): Timestamp | null {
    if (!dateValue) return null;
    
    try {
        let dateTime: DateTime;
        
        if (typeof dateValue === 'string') {
            dateTime = DateTime.fromISO(dateValue);
        } else if (dateValue instanceof Date) {
            dateTime = DateTime.fromJSDate(dateValue);
        } else if (dateValue && typeof dateValue === 'object' && 'toDate' in dateValue) {
            return dateValue; // Already a Firestore Timestamp
        } else if (dateValue && typeof dateValue === 'object' && 'seconds' in dateValue) {
            return new Timestamp(dateValue.seconds, dateValue.nanoseconds || 0);
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
}

// ------------------------------------------------
// FIRESTORE DATA MAPPING FUNCTIONS
// ------------------------------------------------

/**
 * Maps event data from application format to Firestore format
 * Handles date conversions and ensures proper timestamps
 */
export const mapEventDataToFirestore = (data: EventFormData | Partial<Event>): any => {
    const firestoreData: any = { ...data };
    
    // Ensure optional fields are null, not undefined
    if (firestoreData.details) {
        firestoreData.details.prize = firestoreData.details.prize || null;
        firestoreData.details.rules = firestoreData.details.rules || null;
    }
    
    // Handle date conversion to Firestore Timestamps
    if (data.details?.date?.start || data.details?.date?.end) {
        firestoreData.details = firestoreData.details || {};
        firestoreData.details.date = firestoreData.details.date || {};

        if (data.details.date.start) {
            (firestoreData.details.date as any).start = convertToTimestamp(data.details.date.start);
        }
        
        if (data.details.date.end) {
            (firestoreData.details.date as any).end = convertToTimestamp(data.details.date.end);
        }
    }
    
    // Always set/update lastUpdatedAt
    firestoreData.lastUpdatedAt = serverTimestamp();
    
    return firestoreData;
};

/**
 * Maps Firestore document data back to application Event format
 * Handles type conversions and ensures proper timestamps
 */
export const mapFirestoreToEventData = (id: string, firestoreData: DocumentData | null | undefined): Event | null => {
    if (!firestoreData) return null;

    const event: Partial<Event> = {
        id,
        ...firestoreData,
    };

    // Convert Firestore date objects back to Event format
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
    
    // Handle timestamp fields
    const timestampFields: (keyof Event)[] = ['createdAt', 'lastUpdatedAt'];
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

    // Handle lifecycle timestamps
    if (firestoreData.lifecycleTimestamps && typeof firestoreData.lifecycleTimestamps === 'object') {
        event.lifecycleTimestamps = {};
        const lifecycleKeys: (keyof EventLifecycleTimestamps)[] = ['approvedAt', 'startedAt', 'rejectedAt', 'completedAt', 'cancelledAt', 'closedAt'];
        lifecycleKeys.forEach(key => {
            const tsValue = firestoreData.lifecycleTimestamps[key];
            if (tsValue instanceof Timestamp) {
                event.lifecycleTimestamps![key] = tsValue;
            } else if (tsValue) {
                const convertedTs = tsNullToUndefined(getISTTimestamp(tsValue));
                if (convertedTs) {
                    event.lifecycleTimestamps![key] = convertedTs;
                }
            }
        });
    }

    // Handle organizer ratings
    if (Array.isArray(firestoreData.organizerRatings)) {
        const filteredRatings = firestoreData.organizerRatings.map((rating: any) => {
            const ratedAtValue = rating.ratedAt;
            return {
                ...rating,
                ratedAt: ratedAtValue instanceof Timestamp ? ratedAtValue : tsNullToUndefined(getISTTimestamp(ratedAtValue)),
            };
        }).filter((rating: any) => rating.ratedAt);
        
        if (filteredRatings.length > 0) {
            event.organizerRatings = filteredRatings;
        }
    }

    // Handle submissions
    if (Array.isArray(firestoreData.submissions)) {
        const filteredSubmissions = firestoreData.submissions.map((sub: any) => {
            const submittedAtValue = sub.submittedAt;
            return {
                ...sub,
                submittedAt: submittedAtValue instanceof Timestamp ? submittedAtValue : tsNullToUndefined(getISTTimestamp(submittedAtValue)),
            };
        }).filter((sub: any) => sub.submittedAt);
        
        if (filteredSubmissions.length > 0) {
            event.submissions = filteredSubmissions;
        }
    }

    // Handle criteria
    if (firestoreData.criteria && typeof firestoreData.criteria === 'object' && !Array.isArray(firestoreData.criteria)) {
        const criteriaArray = Object.values(firestoreData.criteria) as EventCriteria[];
        if (criteriaArray.length > 0) {
            event.criteria = criteriaArray;
        }
    } else if (Array.isArray(firestoreData.criteria) && firestoreData.criteria.length > 0) {
        event.criteria = firestoreData.criteria;
    }

    return event as Event;
};

// ------------------------------------------------
// EVENT DATA UTILITY FUNCTIONS
// ------------------------------------------------

/**
 * Checks if voting is currently open for an event
 */
export function isVotingOpen(event: Event | null): boolean {
  if (!event) return false;
  return event.status === EventStatus.Completed && event.votingOpen === true;
}

/**
 * Checks if a user has already submitted votes/selections for an event
 */
export function hasUserSubmittedVotes(event: Event | null, userId: string | null): boolean {
  if (!event || !userId) return false;
  
  const criteriaArray = Array.isArray(event.criteria) ? event.criteria : [];
  
  if (event.details?.format === EventFormat.Team) {
    const criteriaVoted = criteriaArray.some((c: EventCriteria) => 
      c.votes && c.votes[userId] !== undefined
    );
    const bestPerformerVoted = !!(event.bestPerformerSelections && 
      event.bestPerformerSelections[userId] !== undefined);
    
    return criteriaVoted || bestPerformerVoted;
  } else {
    return criteriaArray.some((c: EventCriteria) => 
      c.votes && c.votes[userId] !== undefined
    );
  }
}

/**
 * Filters and returns valid criteria for voting/display
 */
export function getValidCriteria(
  event: Event | null, 
  excludeBestPerformer: boolean = false
): EventCriteria[] {
  if (!event || !Array.isArray(event.criteria)) return [];
  
  return event.criteria.filter(c => {
    const hasLabel = !!c.title;
    const hasValidPoints = typeof c.points === 'number' && c.points > 0;
    const hasValidIndex = typeof c.constraintIndex === 'number';
    
    // Skip best performer if requested
    const isBestPerformer = c.title === BEST_PERFORMER_LABEL;
    if (excludeBestPerformer && isBestPerformer) {
      return false;
    }
    
    return hasLabel && hasValidPoints && hasValidIndex;
  });
}

/**
 * Creates a payload for submitting team criteria votes
 */
export function createTeamVotePayload(
  eventId: string, 
  criteriaVotes: Record<string, string>, 
  bestPerformerSelection?: string
): { eventId: string; selections: { criteria: Record<string, string>; bestPerformer?: string } } {
  const criteriaPayload: Record<string, string> = {};
  
  Object.entries(criteriaVotes).forEach(([key, value]) => {
    // Extract constraint index from keys like "constraint0"
    const constraintIndex = key.replace('constraint', '');
    if (value) {
      criteriaPayload[constraintIndex] = value;
    }
  });
  
  const selections: { criteria: Record<string, string>; bestPerformer?: string } = {
    criteria: criteriaPayload
  };
  
  if (bestPerformerSelection) {
    selections.bestPerformer = bestPerformerSelection;
  }
  
  return {
    eventId,
    selections
  };
}

/**
 * Creates a payload for submitting individual winner votes
 */
export function createIndividualVotePayload(
  eventId: string,
  winnerVotes: Record<string, string>
): { eventId: string; winnervotes: Record<string, string> } {
  const winnervotes: Record<string, string> = {};
  
  Object.entries(winnerVotes).forEach(([key, value]) => {
    // Extract constraint index from keys like "constraint0" 
    const constraintIndex = key.replace('constraint', '');
    if (value) {
      winnervotes[constraintIndex] = value;
    }
  });
  
  return {
    eventId,
    winnervotes
  };
}

/**
 * Creates a payload for submitting manual winner selections
 */
export function createManualWinnerPayload(
  eventId: string,
  manualSelections: Record<string, string>,
  bestPerformerSelection?: string
): { eventId: string; winnervotes: Record<string, string[]> } {
  const winnervotes: Record<string, string[]> = {};
  
  Object.entries(manualSelections).forEach(([key, value]) => {
    // Extract constraint index from keys like "constraint0"
    const constraintIndex = key.replace('constraint', '');
    if (value) {
      winnervotes[constraintIndex] = [value];
    }
  });
  
  if (bestPerformerSelection) {
    winnervotes['bestPerformer'] = [bestPerformerSelection];
  }
  
  return {
    eventId,
    winnervotes
  };
}

/**
 * Checks if a student has voted for an event
 */
export function hasStudentVotedForEvent(event: Event | null, userId: string | null): boolean {
  if (!event || !userId || !event.criteria) return false;
  return event.criteria.some(c =>
    c.votes && c.votes[userId] !== undefined
  );
}

/**
 * Gets the student's vote for a specific criterion
 */
export function getStudentVoteForCriterion(
  event: Event | null, 
  userId: string | null, 
  criterionConstraintIndex: number | string
): string | undefined {
  if (!event || !userId || !event.criteria) return undefined;
  const criterion = event.criteria.find(c => c.constraintIndex === criterionConstraintIndex);
  return criterion?.votes?.[userId];
}