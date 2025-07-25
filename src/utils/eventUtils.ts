import { type Event, EventStatus, type EventLifecycleTimestamps, type EventDetails } from '@/types/event';
import { Timestamp } from 'firebase/firestore';
import { convertToISTDateTime } from '@/utils/dateTime';
import { type EventCriteria, EventFormat } from '@/types/event'; // Add EventCriteria, EventFormat
import { type XpCalculationRoleKey } from '@/types/xp';
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
        [EventStatus.Approved]: 1,
        [EventStatus.Pending]: 2,
        [EventStatus.Closed]: 3,
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
    if ([EventStatus.Pending, EventStatus.Approved].includes(a.status as EventStatus)) {
        const dateA = getDateValue(a.details?.date?.start, a.lifecycleTimestamps?.createdAt, 'asc');
        const dateB = getDateValue(b.details?.date?.start, b.lifecycleTimestamps?.createdAt, 'asc');
        return dateA - dateB;
    } else {
        // For completed/closed/etc. statuses, sort descending by a relevant end/completion/update date
        let timeA = 0;
        if (a.status === EventStatus.Closed) timeA = getDateValue(a.lifecycleTimestamps?.closedAt, a.lastUpdatedAt, 'desc');
        else timeA = getDateValue(a.details?.date?.end, a.lastUpdatedAt, 'desc');

        let timeB = 0;
        if (b.status === EventStatus.Closed) timeB = getDateValue(b.lifecycleTimestamps?.closedAt, b.lastUpdatedAt, 'desc');
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
 * @param details The event details object, potentially with string dates.
 * @returns Event details with dates converted to Timestamps.
 */
export function convertEventDetailsDateFormat(details: Record<string, any>): EventDetails { // Changed details from any
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


// Extended interface for EventCriteria with the additional properties we need
interface EventCriteriaWithXP extends EventCriteria {
  xpValue?: number;
  roleKey?: XpCalculationRoleKey;
}

// src/types/event.ts - EventFormat, Event, EventPhase
// src/types/xp.ts - XPData, XpCalculationRoleKey, mapCalcRoleToFirestoreKey
// Assume BEST_PERFORMER_LABEL, BEST_PERFORMER_POINTS are defined constants.

// Define the return structure for individual XP awards
export interface EventXPAward {
    userId: string;
    eventId: string;
    eventName: string;
    phaseId?: string | undefined; // Make explicitly optional with undefined
    phaseName?: string | undefined; // Make explicitly optional with undefined
    role: XpCalculationRoleKey;
    points: number;
    isWinner: boolean; // To help xpService update count_wins
}

/**
 * Calculates XP awards for an event.
 * For MultiEvents, XP is calculated per phase and returned as a list of awards.
 * For single events, XP is calculated and returned as a list of awards.
 * @param eventData - The event data.
 * @returns EventXPAward[] - An array of XP awards.
 */
export function calculateEventXP(eventData: Event): EventXPAward[] {
    const xpAwards: EventXPAward[] = [];
    const baseParticipationXP = 10;
    const organizerXP = 50;

    const addAward = (
        userId: string,
        role: XpCalculationRoleKey,
        points: number,
        isWinner: boolean = false,
        phaseId?: string | undefined,
        phaseName?: string | undefined
    ) => {
        if (!userId || points <= 0) return;
        xpAwards.push({
            userId,
            eventId: eventData.id,
            eventName: eventData.details.eventName,
            phaseId,
            phaseName,
            role,
            points,
            isWinner,
        });
    };

    // --- Event-level XP (Organizers) ---
    // Organizers get XP for the overall event, not per phase by default.
    (eventData.details?.organizers || []).filter(Boolean).forEach((uid: string) => {
        addAward(uid, 'organizer', organizerXP);
    });

    // --- Main XP Calculation Logic ---
    if (eventData.details?.format === EventFormat.MultiEvent && Array.isArray(eventData.details.phases) && eventData.details.phases.length > 0) {
        // --- MultiEvent XP Calculation ---
        eventData.details.phases.forEach(phase => {
            // Participation XP for this phase
            if (phase.format === EventFormat.Team && Array.isArray(phase.teams)) {
                phase.teams.forEach(team => {
                    (team.members || []).filter(Boolean).forEach((uid: string) => {
                        addAward(uid, 'participation', baseParticipationXP, false, phase.id, phase.type); // Use phase.type instead of phase.phaseName
                    });
                });
            } else if (Array.isArray(phase.participants)) { // Individual format for phase or fallback
                phase.participants.filter(Boolean).forEach((uid: string) => {
                    addAward(uid, 'participation', baseParticipationXP, false, phase.id, phase.type); // Use phase.type instead of phase.phaseName
                });
            }
            // --- Phase Winner XP Calculation ---
            if (phase.winners && Array.isArray(phase.criteria)) {
                const phaseCriteriaDetails = new Map<string, { points: number, role: XpCalculationRoleKey }>();
                phase.criteria.forEach(c => {
                    // Use constraintKey if available, otherwise title. Ensure it's a string.
                    const key = String(c.constraintKey || c.title);
                    phaseCriteriaDetails.set(key, { points: c.points, role: c.role as XpCalculationRoleKey });
                });

                for (const [criteriaKeyOrTitle, winnerUids] of Object.entries(phase.winners)) {
                    const criteriaDetail = phaseCriteriaDetails.get(String(criteriaKeyOrTitle));
                    if (criteriaDetail && Array.isArray(winnerUids)) {
                        winnerUids.filter(Boolean).forEach(winnerUid => {
                            addAward(
                                winnerUid,
                                criteriaDetail.role,
                                criteriaDetail.points,
                                true, // isWinner
                                phase.id,
                                phase.type // Use phase.type instead of phase.phaseName
                            );
                        });
                    }
                }
            }
            // Note: Phase-level "Best Performer" XP is not handled here yet.
            // Would require phase.bestPerformerSelections and a defined BEST_PERFORMER_POINTS_PHASE.
        });

    } else {
        // --- Single Event XP Calculation (Original Logic Adapted) ---
        if (eventData.details?.format === EventFormat.Team && Array.isArray(eventData.teams)) {
            eventData.teams.forEach((team: any) => { // Consider defining a proper Team type if not already
                (team.members || []).filter(Boolean).forEach((uid: string) => {
                    addAward(uid, 'participation', baseParticipationXP);
                });
            });
        } else if (Array.isArray(eventData.participants)) { // Handles Individual events or events with flat participant lists
            eventData.participants.filter(Boolean).forEach((uid: string) => {
                addAward(uid, 'participation', baseParticipationXP);
            });
        } else if (Array.isArray(eventData.details?.coreParticipants)) { // Fallback to coreParticipants for Individual events
             eventData.details.coreParticipants.filter(Boolean).forEach((uid: string) => {
                addAward(uid, 'participation', baseParticipationXP);
            });
        }

        const winners = eventData.winners || {};
        const criteriaMap = new Map<string, EventCriteriaWithXP>();
        if (Array.isArray(eventData.criteria)) {
            eventData.criteria.forEach((c: EventCriteria) => {
                const criteriaWithXP = c as EventCriteriaWithXP;
                // Ensure roleKey and xpValue are correctly derived or assigned
                const roleKey = c.role as XpCalculationRoleKey; // Assuming c.role directly maps or needs mapping
                const xpValue = c.points; // Assuming c.points is the xpValue
                if (criteriaWithXP?.constraintKey && xpValue) {
                    criteriaMap.set(criteriaWithXP.constraintKey, { ...criteriaWithXP, roleKey, xpValue });
                } else if (xpValue) { // Fallback if constraintKey is missing but title can be used
                    criteriaMap.set(criteriaWithXP.title, { ...criteriaWithXP, roleKey, xpValue });
                }
            });
        }

        for (const [criteriaOrLabel, winnerIdOrIds] of Object.entries(winners)) {
            if (criteriaOrLabel === BEST_PERFORMER_LABEL) continue; // Handled separately

            const criteriaConfig = criteriaMap.get(criteriaOrLabel);
            const xpValue = criteriaConfig?.xpValue || 0;
            const roleKey = criteriaConfig?.roleKey || 'problemSolver'; // Default role

            if (xpValue > 0) {
                if (Array.isArray(winnerIdOrIds)) {
                    winnerIdOrIds.filter(Boolean).forEach(winnerId => {
                        addAward(winnerId, roleKey, xpValue, true);
                    });
                } else if (typeof winnerIdOrIds === 'string' && winnerIdOrIds) {
                    addAward(winnerIdOrIds, roleKey, xpValue, true);
                }
            }
        }

        const bestPerformerWinner = winners[BEST_PERFORMER_LABEL];
        if (bestPerformerWinner) {
            if (Array.isArray(bestPerformerWinner)) {
                bestPerformerWinner.filter(Boolean).forEach(bpUid => {
                    addAward(bpUid, 'bestPerformer', BEST_PERFORMER_POINTS, true);
                });
            } else if (typeof bestPerformerWinner === 'string' && bestPerformerWinner) {
                addAward(bestPerformerWinner, 'bestPerformer', BEST_PERFORMER_POINTS, true);
            }
        }
    }

    return xpAwards;
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
        return Object.keys(event.criteriaVotes[studentId] || {}).length > 0;
    }
    
    // Check for best performer selection in team events
    if (event.details?.format === EventFormat.Team && event.bestPerformerSelections) {
        return event.bestPerformerSelections[studentId] !== undefined;
    }
    
    return false;
}
