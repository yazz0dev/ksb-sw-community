// src/store/events/actions.validation.ts (Conceptual Student Site Helpers)
import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { db } from '@/firebase';
import type { Event, EventStatus } from '@/types/event';
import { toAppTimezone } from '@/utils/dateTime'; // For date comparisons
import { Interval } from 'luxon'; // For date range overlap checks

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
            where('status', '==', EventStatus.Pending) // Only check for Pending
        );
        const querySnapshot = await getDocs(q);
        return !querySnapshot.empty; // True if any PENDING documents match
    } catch (error: any) {
        console.error("Error checking existing student requests:", error);
        throw new Error(`Failed to check existing requests: ${error.message}`);
    }
}

/**
 * Checks if the proposed event dates conflict with existing Approved/InProgress events.
 * This is important for students when requesting an event to avoid obvious clashes.
 * @param startDateInput - Proposed start date.
 * @param endDateInput - Proposed end date.
 * @param excludeEventId - Optional ID of an event to exclude (used when student is editing their own PENDING request).
 * @returns Promise<{ hasConflict: boolean; conflictingEventName: string | null }>
 */
export async function checkDateConflictForRequest(
    startDateInput: Date | string | Timestamp | null | undefined,
    endDateInput: Date | string | Timestamp | null | undefined,
    excludeEventId?: string | null
): Promise<{ hasConflict: boolean; conflictingEventName: string | null }> {
    const checkStartLuxon = toAppTimezone(startDateInput)?.startOf('day');
    const checkEndLuxon = toAppTimezone(endDateInput)?.startOf('day');

    if (!checkStartLuxon?.isValid || !checkEndLuxon?.isValid) {
        throw new Error('Invalid date(s) provided for conflict check.');
    }
    if (checkEndLuxon < checkStartLuxon) {
        throw new Error('End date cannot be before start date.');
    }

    // Query for potentially conflicting events (Approved or InProgress)
    const q = query(
        collection(db, 'events'),
        where('status', 'in', [EventStatus.Approved, EventStatus.InProgress])
    );

    try {
        const querySnapshot = await getDocs(q);
        for (const docSnap of querySnapshot.docs) {
            if (excludeEventId && docSnap.id === excludeEventId) continue;

            const event = docSnap.data() as Event;
            const eventStartLuxon = toAppTimezone(event.details?.date?.start)?.startOf('day');
            const eventEndLuxon = toAppTimezone(event.details?.date?.end)?.startOf('day');

            if (!eventStartLuxon?.isValid || !eventEndLuxon?.isValid) continue;

            // Check for overlap
            const requestedInterval = Interval.fromDateTimes(checkStartLuxon, checkEndLuxon.endOf('day'));
            const existingEventInterval = Interval.fromDateTimes(eventStartLuxon, eventEndLuxon.endOf('day'));

            if (requestedInterval.overlaps(existingEventInterval)) {
                return { hasConflict: true, conflictingEventName: event.details.eventName || "an existing event" };
            }
        }
        return { hasConflict: false, conflictingEventName: null };
    } catch (error: any) {
        console.error("Firestore date conflict check query error:", error);
        throw new Error(`Failed to check date conflicts: ${error.message}`);
    }
}