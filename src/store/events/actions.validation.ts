// src/store/events/actions.validation.ts
// Helper functions for validation actions.
import { getDocs, Timestamp, collection, query, where } from 'firebase/firestore';
import { db } from '@/firebase';
import { Event, EventStatus, EventFormat } from '@/types/event'; // Add EventFormat
import { DateTime } from 'luxon';

/**
 * Checks if a user already has active (Pending, Approved, InProgress) event requests.
 * @param userId - The UID of the user to check.
 * @returns Promise<boolean> - True if an active request exists, false otherwise.
 */
export async function checkExistingRequestsForUser(userId: string): Promise<boolean> {
    if (!userId) return false; // No user, no requests

    try {
        const q = query(
            collection(db, 'events'),
            where('requestedBy', '==', userId),
            where('status', 'in', [EventStatus.Pending, EventStatus.Approved, EventStatus.InProgress])
        );
        const querySnapshot = await getDocs(q);
        return !querySnapshot.empty; // Return true if any documents match
    } catch (error) {
        console.error("Error checking existing requests:", error);
        // Decide error handling: rethrow or return false? Returning false might be safer UI-wise.
        return false;
    }
}

/**
 * Checks if the proposed event dates conflict with existing Approved/InProgress events.
 * @param startDate - Proposed start date (Date, ISO string, or Timestamp).
 * @param endDate - Proposed end date (Date, ISO string, or Timestamp).
 * @param excludeEventId - Optional ID of an event to exclude (used when editing).
 * @returns Promise<{ hasConflict: boolean; nextAvailableDate: string | null; conflictingEvent: Event | null }>
 * @throws Error if dates are invalid or Firestore query fails.
 */
export async function checkDateConflictInFirestore(
    startDate: Date | string | Timestamp | null,
    endDate: Date | string | Timestamp | null,
    excludeEventId: string | null = null
): Promise<{ hasConflict: boolean; nextAvailableDate: string | null; conflictingEvent: Event | null }> {

    // Helper to convert various date types to Luxon DateTime in UTC start of day
    const convertToLuxonUTC = (d: Date | string | Timestamp | null): DateTime | null => {
        if (!d) return null;
        let dt: DateTime;
        try {
            if (d instanceof Timestamp) dt = DateTime.fromJSDate(d.toDate());
            else if (d instanceof Date) dt = DateTime.fromJSDate(d);
            else dt = DateTime.fromISO(d); // Assume ISO string

            if (!dt.isValid) throw new Error(`Invalid date value: ${d}`);
            return dt.toUTC().startOf('day'); // Normalize to UTC start of day
        } catch (e) {
            console.error("Date conversion error:", e);
            return null;
        }
    };

    const checkStartLuxon = convertToLuxonUTC(startDate);
    const checkEndLuxon = convertToLuxonUTC(endDate);

    if (!checkStartLuxon || !checkEndLuxon) {
        throw new Error('Invalid date(s) provided for conflict check.');
    }
    if (checkEndLuxon < checkStartLuxon) {
        throw new Error('End date cannot be before start date.');
    }

    // Query for potentially conflicting events
    const q = query(collection(db, 'events'), where('status', 'in', [EventStatus.Approved, EventStatus.InProgress]));
    let conflictingEvent: Event | null = null;
    let latestConflictEndDate: DateTime | null = null;

    try {
        const querySnapshot = await getDocs(q);

        for (const docSnap of querySnapshot.docs) {
            const event = { id: docSnap.id, ...docSnap.data() } as Event;
            if (excludeEventId && event.id === excludeEventId) continue; // Skip self if editing

            const eventStartLuxon = convertToLuxonUTC(event.details?.date?.start);
            const eventEndLuxon = convertToLuxonUTC(event.details?.date?.end);

            if (!eventStartLuxon || !eventEndLuxon) continue; // Skip events with invalid dates

            // Check for overlap: (StartA <= EndB) and (EndA >= StartB)
            if (checkStartLuxon <= eventEndLuxon && checkEndLuxon >= eventStartLuxon) {
                conflictingEvent = event; // Mark conflict
                // Track the latest end date among all conflicting events
                if (!latestConflictEndDate || eventEndLuxon > latestConflictEndDate) {
                    latestConflictEndDate = eventEndLuxon;
                }
                // Don't break; check all events to find the latest conflict end date
            }
        }
    } catch (error: any) {
        console.error("Firestore date conflict check query error:", error);
        // Decide how to handle query errors - maybe return conflict=true?
        throw new Error(`Failed to check date conflicts: ${error.message}`);
    }

    // Calculate the next available date based on the latest conflict end date found
    const nextAvailableDate = latestConflictEndDate
        ? latestConflictEndDate.plus({ days: 1 }).toISODate() // Return YYYY-MM-DD format
        : null;

    return {
        hasConflict: !!conflictingEvent,
        nextAvailableDate: nextAvailableDate,
        conflictingEvent: conflictingEvent // Return the first conflicting event found (or null)
    };
}