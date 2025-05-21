<<<<<<< HEAD
// src/store/events/actions.validation.ts (Conceptual Student Site Helpers)
import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { db } from '@/firebase';
import type { Event, EventStatus } from '@/types/event';
import { toAppTimezone } from '@/utils/dateTime'; // For date comparisons
import { Interval } from 'luxon'; // For date range overlap checks
=======
// src/store/events/actions.validation.ts
// Helper functions for validation actions.
import { Timestamp, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/firebase';
import { Event, EventStatus, EventFormat } from '@/types/event'; // Removed EventDetails and EventDate
import { mapFirestoreToEventData } from '@/utils/eventDataMapper';
import { DateTime } from 'luxon';
>>>>>>> 18584e3e4cbfec6471edfa715168774adf7c20a5

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
<<<<<<< HEAD
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
=======
export async function checkDateConflictInFirestore(
    startDate: string | Date | Timestamp | null,
    endDate: string | Date | Timestamp | null,
    excludeEventId: string | null = null
): Promise<{ hasConflict: boolean; nextAvailableDate: string | null; conflictingEvent: Event | null }> {
    if (!startDate || !endDate) {
        return { hasConflict: false, nextAvailableDate: null, conflictingEvent: null };
    }

    const startTimestamp = startDate instanceof Timestamp ? startDate : Timestamp.fromDate(new Date(startDate as any));
    const endTimestamp = endDate instanceof Timestamp ? endDate : Timestamp.fromDate(new Date(endDate as any));

    const eventsCollection = collection(db, 'events');
    // Query for events that overlap with the given date range
    // An event conflicts if its start is before the new event's end AND its end is after the new event's start
    const q = query(
        eventsCollection,
        where('status', 'in', [EventStatus.Approved, EventStatus.InProgress, EventStatus.Pending]),
        // No direct way to query (event.start < new.end && event.end > new.start)
        // So, we fetch broader and filter client-side, or use multiple queries if performance is an issue.
        // For simplicity, fetching events that *could* conflict based on start or end times near the range.
        // This might fetch more documents than necessary, but Firestore's querying capabilities for date ranges are limited.
>>>>>>> 18584e3e4cbfec6471edfa715168774adf7c20a5
    );

    try {
        const querySnapshot = await getDocs(q);
<<<<<<< HEAD
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
=======
        let conflictingEvent: Event | null = null;
        let hasConflict = false;
        let earliestConflictEnd: Timestamp | null = null;

        querySnapshot.forEach((docSnap) => {
            if (excludeEventId && docSnap.id === excludeEventId) {
                return; // Skip the event being edited
            }
            const event = mapFirestoreToEventData(docSnap.id, docSnap.data());
            if (!event || !event.details.date.start || !event.details.date.end) return;

            const eventStart = event.details.date.start;
            const eventEnd = event.details.date.end;

            // Check for overlap: (StartA <= EndB) and (EndA >= StartB)
            if (startTimestamp.toMillis() < eventEnd.toMillis() && endTimestamp.toMillis() > eventStart.toMillis()) {
                hasConflict = true;
                conflictingEvent = event;
                if (!earliestConflictEnd || eventEnd.toMillis() > earliestConflictEnd.toMillis()) {
                    earliestConflictEnd = eventEnd;
                }
                // Break early if a conflict is found (though forEach doesn't directly support break)
                // For finding *any* conflict, this is sufficient. For *next available*, we might need to process all.
>>>>>>> 18584e3e4cbfec6471edfa715168774adf7c20a5
            }
        });

        let nextAvailableDateISO: string | null = null;
        if (hasConflict && earliestConflictEnd) {
            // Suggest next day after the conflicting event ends
            nextAvailableDateISO = DateTime.fromMillis(earliestConflictEnd.toMillis()).plus({ days: 1 }).startOf('day').toISO();
        }
<<<<<<< HEAD
        return { hasConflict: false, conflictingEventName: null };
    } catch (error: any) {
        console.error("Firestore date conflict check query error:", error);
        throw new Error(`Failed to check date conflicts: ${error.message}`);
=======

        return { hasConflict, nextAvailableDate: nextAvailableDateISO, conflictingEvent };

    } catch (error) {
        console.error("Error checking date conflict in Firestore:", error);
        throw new Error("Failed to check for date conflicts.");
>>>>>>> 18584e3e4cbfec6471edfa715168774adf7c20a5
    }
}