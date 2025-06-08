import { type Event, EventStatus, type EventLifecycleTimestamps, type EventDetails } from '@/types/event';
import { Timestamp } from 'firebase/firestore';
import { convertToISTDateTime } from '@/utils/dateTime';
import { type EventCriteria, EventFormat } from '@/types/event'; // Add EventCriteria, EventFormat
import { type XPData, mapCalcRoleToFirestoreKey, type XpCalculationRoleKey } from '@/types/xp';
import { BEST_PERFORMER_LABEL, BEST_PERFORMER_POINTS } from '@/utils/constants';

// ------------------------------------------------
// HELPER FUNCTIONS (merged from helpers.ts)
// ------------------------------------------------

/**
 * Performs a deep clone of an object.
 * Note: This simple version using JSON.stringify/parse has limitations
 * (e.g., doesn't handle Dates, Functions, undefined, Infinity, NaN, RegExps, Maps, Sets correctly).
 * For more robust cloning, consider a library like lodash.cloneDeep.
 * @param obj The object to clone.
 * @returns A deep clone of the object.
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  try {
    return JSON.parse(JSON.stringify(obj));
  } catch (e) {
    console.error("deepClone failed:", e);
    // Fallback or re-throw, depending on desired error handling
    // For simplicity, returning the original object on failure,
    // but this means it's not a true clone in case of error.
    return obj;
  }
}

/**
 * Gets the current Firestore Timestamp.
 * @returns A Firestore Timestamp representing the current time.
 */
export function now(): Timestamp {
  return Timestamp.now();
}

/**
 * Checks if a value is empty.
 * Considers null, undefined, empty string, empty array, or empty object as empty.
 * @param value The value to check.
 * @returns True if the value is empty, false otherwise.
 */
export function isEmpty(value: any): boolean {
  if (value === null || value === undefined) {
    return true;
  }
  if (typeof value === 'string' && value.trim() === '') {
    return true;
  }
  if (Array.isArray(value) && value.length === 0) {
    return true;
  }
  if (typeof value === 'object' && Object.keys(value).length === 0 && !(value instanceof Date)) {
    return true;
  }
  return false;
}

// ------------------------------------------------
// EVENT UTILITY FUNCTIONS
// ------------------------------------------------

/**
 * Returns the Bootstrap badge class for a given event status.
 */
export function getEventStatusBadgeClass(status: EventStatus | string | undefined): string {
  switch (status) {
    case EventStatus.Approved:
      return 'bg-success-subtle text-success-emphasis';
    case EventStatus.Pending:
      return 'bg-warning-subtle text-warning-emphasis';
    case EventStatus.InProgress:
      return 'bg-info-subtle text-info-emphasis';
    case EventStatus.Rejected:
      return 'bg-danger-subtle text-danger-emphasis';
    case EventStatus.Completed:
      return 'bg-dark text-white';
    case EventStatus.Cancelled:
      return 'bg-secondary-subtle text-secondary-emphasis';
    case EventStatus.Closed:
      return 'bg-dark text-white';
    default:
      return 'bg-secondary-subtle text-secondary-emphasis';
  }
}

/**
 * Compares two events for sorting purposes.
 * Sorts by status group, then by relevant dates within those groups.
 * - Active events (InProgress, Approved, Pending) are sorted by start date (earliest first).
 * - Past/Ended events (Completed, Rejected, Cancelled, Closed) are sorted by end/updated date (latest first).
 */
export function compareEventsForSort(a: Event, b: Event): number {
    const statusOrder: Record<string, number> = {
        [EventStatus.InProgress]: 1,
        [EventStatus.Approved]: 2,
        [EventStatus.Pending]: 3,
        [EventStatus.Completed]: 4,
        [EventStatus.Closed]: 5, // Moved Closed before Rejected/Cancelled for typical display
        [EventStatus.Rejected]: 6,
        [EventStatus.Cancelled]: 7,
    };
    const orderA = statusOrder[a.status] ?? 99;
    const orderB = statusOrder[b.status] ?? 99;

    if (orderA !== orderB) return orderA - orderB;

    // Use a consistent default for invalid dates, far in the past for ascending, far in future for descending
    const defaultPastDate = convertToISTDateTime(new Date(0))!; // for ascending sort (older is smaller)
    const defaultFutureDate = convertToISTDateTime(new Date('2999-12-31'))!; // for descending sort (newer is smaller)

    const getDateValue = (dateField: Timestamp | Date | string | null | undefined, fallbackDate?: Timestamp | Date | string | null | undefined, sortDirection: 'asc' | 'desc' = 'asc'): number => {
        let dt = convertToISTDateTime(dateField);
        if (!dt || !dt.isValid) dt = convertToISTDateTime(fallbackDate);
        if (!dt || !dt.isValid) return sortDirection === 'asc' ? defaultFutureDate.toMillis() : defaultPastDate.toMillis();
        return dt.toMillis();
    };

    // For active-like statuses, sort ascending by start date (or creation date)
    if ([EventStatus.Pending, EventStatus.Approved, EventStatus.InProgress].includes(a.status as EventStatus)) {
        const dateA = getDateValue(a.details?.date?.start, a.lifecycleTimestamps?.createdAt, 'asc');
        const dateB = getDateValue(b.details?.date?.start, b.lifecycleTimestamps?.createdAt, 'asc');
        return dateA - dateB;
    } else {
        // For completed/closed/etc. statuses, sort descending by a relevant end/completion/update date
        let timeA = 0;
        if (a.status === EventStatus.Closed) timeA = getDateValue(a.lifecycleTimestamps?.closedAt, a.lastUpdatedAt, 'desc');
        else if (a.status === EventStatus.Completed) timeA = getDateValue(a.lifecycleTimestamps?.completedAt, a.lastUpdatedAt, 'desc');
        else if (a.status === EventStatus.Rejected) timeA = getDateValue(a.lifecycleTimestamps?.rejectedAt, a.lastUpdatedAt, 'desc');
        else if (a.status === EventStatus.Cancelled) timeA = getDateValue(a.lastUpdatedAt, a.lifecycleTimestamps?.createdAt, 'desc'); // Use createdAt as fallback for cancelled if lastUpdatedAt is not set
        else timeA = getDateValue(a.details?.date?.end, a.lastUpdatedAt, 'desc');

        let timeB = 0;
        if (b.status === EventStatus.Closed) timeB = getDateValue(b.lifecycleTimestamps?.closedAt, b.lastUpdatedAt, 'desc');
        else if (b.status === EventStatus.Completed) timeB = getDateValue(b.lifecycleTimestamps?.completedAt, b.lastUpdatedAt, 'desc');
        else if (b.status === EventStatus.Rejected) timeB = getDateValue(b.lifecycleTimestamps?.rejectedAt, b.lastUpdatedAt, 'desc');
        else if (b.status === EventStatus.Cancelled) timeB = getDateValue(b.lastUpdatedAt, b.lifecycleTimestamps?.createdAt, 'desc');
        else timeB = getDateValue(b.details?.date?.end, b.lastUpdatedAt, 'desc');
        
        return timeB - timeA; // Note: timeB - timeA for descending
    }
}

/**
 * Merges EventLifecycleTimestamps objects. 
 * Handles null for properties in `updates` as a directive to remove the property from the base.
 * Also handles a special `_methodName: 'delete'` like syntax for explicit field deletion if needed,
 * though `null` is the primary mechanism here.
 * @param baseTimestamps The base timestamps object.
 * @param updates The updates to apply. If null or undefined, baseTimestamps (or undefined) is returned.
 * @returns A new merged EventLifecycleTimestamps object, or undefined if the result is empty.
 */
export function mergeLifecycleTimestamps(
    baseTimestamps: EventLifecycleTimestamps | undefined | null,
    updates: Partial<EventLifecycleTimestamps> | undefined | null
): EventLifecycleTimestamps | undefined {
    if (!updates) {
        return isEmpty(baseTimestamps) ? undefined : (baseTimestamps as EventLifecycleTimestamps);
    }
    // Start with a clone of base or an empty object
    const merged: Partial<EventLifecycleTimestamps> = baseTimestamps ? { ...baseTimestamps } : {};

    for (const key in updates) {
        if (Object.prototype.hasOwnProperty.call(updates, key)) {
            const typedKey = key as keyof EventLifecycleTimestamps;
            const value = updates[typedKey];

            if (value === null || (typeof value === 'object' && (value as any)?._methodName === 'delete')) {
                delete merged[typedKey];
            } else if (value !== undefined) {
                merged[typedKey] = value;
            }
        }
    }
    return isEmpty(merged) ? undefined : (merged as EventLifecycleTimestamps);
}

/**
 * Converts date strings within event details to Firestore Timestamp objects.
 * @param details The event details object.
 * @returns Event details with dates converted to Timestamps.
 */
export function convertEventDetailsDateFormat(details: any): EventDetails {
  if (!details) return {} as EventDetails; // Return an empty object typed as EventDetails
  
  // Create a shallow copy to avoid modifying the original object directly
  const convertedDetails = { ...details };
  
  // Convert date strings to Timestamp objects if they exist
  if (convertedDetails.date) {
    convertedDetails.date = {
      start: convertedDetails.date.start ? 
        (typeof convertedDetails.date.start === 'string' ? 
          Timestamp.fromDate(new Date(convertedDetails.date.start)) : 
          convertedDetails.date.start) : // Keep as is if already a Timestamp or null
        null,
      end: convertedDetails.date.end ? 
        (typeof convertedDetails.date.end === 'string' ? 
          Timestamp.fromDate(new Date(convertedDetails.date.end)) : 
          convertedDetails.date.end) : // Keep as is if already a Timestamp or null
        null
    };
  }
  
  return convertedDetails as EventDetails; // Cast to EventDetails
}

/**
 * Create a new XPData object with default values for all required properties.
 * @param userId - The user ID to associate with this XP data
 * @returns A properly initialized XPData object
 */
function createDefaultXpData(userId?: string): XPData {
  return {
    uid: userId || '',
    totalCalculatedXp: 0,
    xp_developer: 0,
    xp_presenter: 0, 
    xp_designer: 0,
    xp_organizer: 0,
    xp_problemSolver: 0,
    xp_bestPerformer: 0,
    xp_participation: 0,
    count_wins: 0,
    lastUpdatedAt: Timestamp.now()
  };
}

// Extended interface for EventCriteria with the additional properties we need
interface EventCriteriaWithXP extends EventCriteria {
  xpValue?: number;
  roleKey?: XpCalculationRoleKey;
}

/**
 * Calculates XP changes for an event based on participation, organization, and winning.
 * @param eventData - The event data.
 * @returns Record<string, XPData> - Map of user IDs to their XP changes.
 */
export function calculateEventXP(eventData: Event): Record<string, Partial<XPData>> { // Return type changed to Partial<XPData>
    const xpChangesMap: Record<string, Partial<XPData>> = {};

    const baseParticipationXP = 10;
    const organizerXP = 50;

    const addXPChange = (userId: string, calcRole: XpCalculationRoleKey, amount: number) => {
        if (!userId || amount <= 0) return;
        if (!xpChangesMap[userId]) {
            xpChangesMap[userId] = createDefaultXpData(userId);
        }
        const firestoreKey = mapCalcRoleToFirestoreKey(calcRole);
        (xpChangesMap[userId] as any)[firestoreKey] = ((xpChangesMap[userId] as any)[firestoreKey] || 0) + amount;
        xpChangesMap[userId]!.totalCalculatedXp = (xpChangesMap[userId]!.totalCalculatedXp || 0) + amount;
    };

    const incrementWinCount = (userId: string) => {
        if (!userId) return;
        if (!xpChangesMap[userId]) {
            xpChangesMap[userId] = createDefaultXpData(userId);
        }
        xpChangesMap[userId]!.count_wins = (xpChangesMap[userId]!.count_wins || 0) + 1;
    };

    (eventData.details?.organizers || []).filter(Boolean).forEach((uid: string) => {
        addXPChange(uid, 'organizer', organizerXP);
    });

    if (eventData.details?.format === EventFormat.Team && Array.isArray(eventData.teams)) {
        eventData.teams.forEach((team: any) => {
            (team.members || []).filter(Boolean).forEach((uid: string) => {
                addXPChange(uid, 'participation', baseParticipationXP);
            });
        });
    } else if (Array.isArray(eventData.participants)) {
        eventData.participants.filter(Boolean).forEach((uid: string) => {
            addXPChange(uid, 'participation', baseParticipationXP);
        });
    }

    const winners = eventData.winners || {};
    const criteriaMap = new Map<string, EventCriteriaWithXP>();
    if (Array.isArray(eventData.criteria)) {
        eventData.criteria.forEach((c: EventCriteria) => {
            const criterionWithXP = c as EventCriteriaWithXP;
            if (criterionWithXP?.constraintKey && criterionWithXP?.xpValue) {
                criteriaMap.set(criterionWithXP.constraintKey, criterionWithXP);
            }
        });
    }

    for (const [criterionOrLabel, winnerIdOrIds] of Object.entries(winners)) {
        const criterionConfig = criteriaMap.get(criterionOrLabel);
        const xpValue = criterionConfig?.xpValue || 0;
        if (Array.isArray(winnerIdOrIds)) {
            winnerIdOrIds.filter(Boolean).forEach(winnerId => {
                if (xpValue > 0) addXPChange(winnerId, (criterionConfig?.roleKey || 'problemSolver'), xpValue);
                incrementWinCount(winnerId);
            });
        } else if (typeof winnerIdOrIds === 'string' && winnerIdOrIds) {
            if (criterionOrLabel !== BEST_PERFORMER_LABEL) {
                 if (xpValue > 0) addXPChange(winnerIdOrIds, (criterionConfig?.roleKey || 'problemSolver'), xpValue);
                 incrementWinCount(winnerIdOrIds);
            }
        }
    }
    
    const bestPerformerWinner = winners[BEST_PERFORMER_LABEL];
    if (bestPerformerWinner) {
        if (Array.isArray(bestPerformerWinner)) {
            bestPerformerWinner.filter(Boolean).forEach(bpUid => {
                addXPChange(bpUid, 'bestPerformer', BEST_PERFORMER_POINTS);
            });
        } else if (typeof bestPerformerWinner === 'string' && bestPerformerWinner) {
            addXPChange(bestPerformerWinner, 'bestPerformer', BEST_PERFORMER_POINTS);
        }
    }
    return xpChangesMap;
}

/**
 * Checks if the student has already submitted selections/votes for a given event.
 * @param event - The event object.
 * @param studentId - The UID of the student.
 * @returns boolean - True if the student has made selections.
 */
export function hasStudentSubmittedvotes(event: Event | null, studentId: string | null): boolean {
    if (!event || !studentId) return false;
    
    // Check in the new criteriaVotes structure
    if (event.criteriaVotes && event.criteriaVotes[studentId]) {
        return Object.keys(event.criteriaVotes[studentId]).length > 0;
    }
    
    // Check for best performer selection in team events
    if (event.details?.format === EventFormat.Team && event.bestPerformerSelections) {
        return event.bestPerformerSelections[studentId] !== undefined;
    }
    
    return false;
}
