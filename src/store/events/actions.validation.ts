// src/store/events/actions.validation.ts
// Helper functions for validation actions.
import { Timestamp, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/firebase';
import { Event, EventStatus, EventFormat } from '@/types/event'; // Removed EventDetails and EventDate
import { mapFirestoreToEventData } from '@/utils/eventDataMapper';
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
    );

    try {
        const querySnapshot = await getDocs(q);
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
            }
        });

        let nextAvailableDateISO: string | null = null;
        if (hasConflict && earliestConflictEnd) {
            // Suggest next day after the conflicting event ends
            nextAvailableDateISO = DateTime.fromMillis(earliestConflictEnd.toMillis()).plus({ days: 1 }).startOf('day').toISO();
        }

        return { hasConflict, nextAvailableDate: nextAvailableDateISO, conflictingEvent };

    } catch (error) {
        console.error("Error checking date conflict in Firestore:", error);
        throw new Error("Failed to check for date conflicts.");
    }
}