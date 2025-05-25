// src/stores/events/actions.validation.ts
import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { db } from '@/firebase';
import { Event, EventStatus } from '@/types/event';
import { DateTime } from 'luxon';
import { mapFirestoreToEventData } from '@/utils/eventDataMapper'; // Assuming this mapper is available

/**
 * Checks if a student already has an active (Pending) event request.
 * @param studentId - The UID of the student to check.
 * @returns Promise<boolean> - True if an active request exists, false otherwise.
 */
export async function checkExistingPendingRequestForStudent(studentId: string): Promise<boolean> {
    if (!studentId) return false;
    try {
        const q = query(
            collection(db, 'events'),
            where('requestedBy', '==', studentId),
            where('status', '==', EventStatus.Pending)
        );
        const querySnapshot = await getDocs(q);
        return !querySnapshot.empty;
    } catch (error: any) {
        console.error("Error checking existing student requests:", error);
        throw new Error(`Failed to check existing requests: ${error.message}`);
    }
}

/**
 * Checks if the proposed event dates conflict with existing Approved/InProgress/Pending events.
 * @param startDateInput - Proposed start date.
 * @param endDateInput - Proposed end date.
 * @param excludeEventId - Optional ID of an event to exclude (used when editing).
 * @returns Promise<{ hasConflict: boolean; nextAvailableDate: string | null; conflictingEvent: Event | null; conflictingEventName: string | null }>
 */
export async function checkDateConflictForRequest(
    startDateInput: Date | string | Timestamp | null | undefined,
    endDateInput: Date | string | Timestamp | null | undefined,
    excludeEventId?: string | null
): Promise<{ hasConflict: boolean; nextAvailableDate: string | null; conflictingEvent: Event | null; conflictingEventName: string | null }> {

    const getValidDateTime = (input: any): DateTime | null => {
        if (!input) return null;
        let dt: DateTime;
        if (input instanceof Timestamp) dt = DateTime.fromJSDate(input.toDate());
        else if (input instanceof Date) dt = DateTime.fromJSDate(input);
        else if (typeof input === 'string') dt = DateTime.fromISO(input);
        else return null;
        return dt.isValid ? dt.setZone('Asia/Kolkata').startOf('day') : null;
    };

    const checkStartLuxon = getValidDateTime(startDateInput);
    const checkEndLuxon = getValidDateTime(endDateInput);

    if (!checkStartLuxon || !checkEndLuxon) {
        throw new Error('Invalid date(s) provided for conflict check.');
    }
    if (checkEndLuxon < checkStartLuxon) {
        throw new Error('End date cannot be before start date.');
    }

    const q = query(
        collection(db, 'events'),
        where('status', 'in', [EventStatus.Approved, EventStatus.InProgress, EventStatus.Pending])
        // We fetch broadly and filter client-side due to Firestore's range query limitations
        // where('details.date.end', '>=', Timestamp.fromDate(checkStartLuxon.toJSDate())) // Example of a broader query if needed
    );

    try {
        const querySnapshot = await getDocs(q);
        let conflictingEvent: Event | null = null;
        let conflictingEventName: string | null = null;
        let hasConflict = false;
        let earliestConflictEndMillis: number | null = null;

        for (const docSnap of querySnapshot.docs) {
            if (excludeEventId && docSnap.id === excludeEventId) continue;

            const event = mapFirestoreToEventData(docSnap.id, docSnap.data());
            if (!event || !event.details.date.start || !event.details.date.end) continue;

            const eventStartLuxon = getValidDateTime(event.details.date.start);
            const eventEndLuxon = getValidDateTime(event.details.date.end);

            if (!eventStartLuxon || !eventEndLuxon) continue;

            // Check for overlap: (StartA <= EndB) and (EndA >= StartB)
            if (checkStartLuxon <= eventEndLuxon && checkEndLuxon >= eventStartLuxon) {
                hasConflict = true;
                conflictingEvent = event;
                conflictingEventName = event.details.eventName || "an existing event";
                if (earliestConflictEndMillis === null || eventEndLuxon.toMillis() > earliestConflictEndMillis) {
                    earliestConflictEndMillis = eventEndLuxon.toMillis();
                }
                // If only checking for *any* conflict, we can break here.
                // For "next available", we might need to check all.
                 break; // Found a conflict, no need to check further for this simple check
            }
        }

        let nextAvailableDateISO: string | null = null;
        if (hasConflict && earliestConflictEndMillis) {
            nextAvailableDateISO = DateTime.fromMillis(earliestConflictEndMillis).plus({ days: 1 }).startOf('day').toISODate();
        }

        return { hasConflict, nextAvailableDate: nextAvailableDateISO, conflictingEvent, conflictingEventName };
    } catch (error: any) {
        console.error("Firestore date conflict check query error:", error);
        throw new Error(`Failed to check date conflicts: ${error.message}`);
    }
}