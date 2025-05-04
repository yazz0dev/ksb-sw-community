// src/store/events/actions.lifecycle.ts
// Helper functions for lifecycle operations.
import { doc, getDoc, updateDoc, addDoc, collection, Timestamp } from 'firebase/firestore';
import { db } from '@/firebase';
import { Event, EventStatus } from '@/types/event';
import { User } from '@/types/user'; // Assuming User type exists
import { invokePushNotification, isSupabaseConfigured } from '@/notifications';
import { mapEventDataToFirestore } from '@/utils/eventDataMapper'; // Import mapper

/**
 * Creates a new event request document in Firestore.
 * @param initialData - The initial event data (Partial<Event>).
 * @param currentUserUid - The UID of the user making the request.
 * @returns Promise<string> - The ID of the newly created event document.
 * @throws Error if user not logged in, data invalid, or Firestore operation fails.
 */
export async function createEventRequestInFirestore(initialData: Partial<Event>, currentUserUid: string): Promise<string> {
    if (!currentUserUid) throw new Error('User must be logged in to request an event.');
    if (!initialData.details?.date?.start || !initialData.details?.date?.end) {
        throw new Error('Event start and end dates are required.');
    }

    try {
        // Use the mapper to prepare data
        const mappedData = mapEventDataToFirestore({
             ...initialData,
             requestedBy: currentUserUid,
             status: EventStatus.Pending,
             createdAt: Timestamp.now(),
             lastUpdatedAt: Timestamp.now(),
             ratingsOpen: false, // Default value
        });

        // Remove fields that shouldn't be set on creation explicitly
        delete mappedData.id;
        delete mappedData.completedAt;
        delete mappedData.closedAt;

        const docRef = await addDoc(collection(db, 'events'), mappedData);

        // Trigger notification (keep this logic here or move to Pinia action)
        if (isSupabaseConfigured()) {
            invokePushNotification({
                type: 'event_request', eventId: docRef.id, requestedBy: currentUserUid,
            }).catch(pushError => {
                console.error(`Failed to trigger Supabase function for event request:`, pushError);
                // Consider how to notify about this - maybe return a flag?
            });
        }
        return docRef.id;
    } catch (error: any) {
        console.error('Firestore createEventRequest error:', error);
        throw new Error(`Failed to submit event request: ${error.message}`);
    }
}

/**
 * Updates an existing event document in Firestore.
 * @param eventId - The ID of the event to update.
 * @param updates - The partial event data containing updates.
 * @param currentUser - The currently logged-in user object.
 * @returns Promise<void>
 * @throws Error if permissions fail, event not found, or Firestore update fails.
 */
export async function updateEventDetailsInFirestore(eventId: string, updates: Partial<Event>, currentUser: User | null): Promise<void> {
    if (!eventId) throw new Error('Event ID is required for updates.');
    if (!currentUser?.uid) throw new Error('User not authenticated for update.');
    if (typeof updates !== 'object' || updates === null || Object.keys(updates).length === 0) {
         console.warn("No updates provided for event:", eventId);
         return;
     }

    const eventRef = doc(db, 'events', eventId);
    try {
        const eventSnap = await getDoc(eventRef);
        if (!eventSnap.exists()) throw new Error('Event not found.');
        const eventData = eventSnap.data() as Event;

        // Permission Check
        const isOrganizer = eventData.details?.organizers?.includes(currentUser.uid) || eventData.requestedBy === currentUser.uid;
        const currentStatus = eventData.status as EventStatus;
        const editableStatuses: EventStatus[] = [EventStatus.Pending, EventStatus.Approved, EventStatus.InProgress];

        if (!isOrganizer || !editableStatuses.includes(currentStatus)) {
            throw new Error(`Permission denied or cannot edit event in status '${currentStatus}'.`);
        }

        // Prepare payload using mapper, ensuring lastUpdatedAt is set
        const mappedUpdates = mapEventDataToFirestore({
            ...updates,
            lastUpdatedAt: Timestamp.now()
        });

        // Prevent crucial fields from being overwritten accidentally
        delete mappedUpdates.id;
        delete mappedUpdates.createdAt;
        delete mappedUpdates.requestedBy;
        delete mappedUpdates.status; // Status updated via specific function
        delete mappedUpdates.completedAt;
        delete mappedUpdates.closedAt;
        // Only include 'details' if it was actually part of the 'updates'
        if (!updates.details) {
            delete mappedUpdates.details;
        }


        await updateDoc(eventRef, mappedUpdates);
        console.log(`Firestore: Event ${eventId} details updated.`);

    } catch (error: any) {
        console.error(`Firestore updateEventDetails error for ${eventId}:`, error);
        throw new Error(`Failed to update event details: ${error.message}`);
    }
}


/**
 * Updates the status of an event document in Firestore.
 * @param eventId - The ID of the event.
 * @param newStatus - The new EventStatus.
 * @returns Promise<Partial<Event>> - Returns the specific fields that were updated.
 * @throws Error if status change invalid, event not found, or Firestore update fails.
 */
export async function updateEventStatusInFirestore(eventId: string, newStatus: EventStatus): Promise<Partial<Event>> {
    const validStatuses = Object.values(EventStatus);
    if (!validStatuses.includes(newStatus)) throw new Error(`Invalid status: ${newStatus}.`);
    if (!eventId) throw new Error('Event ID required for status update.');

    const eventRef = doc(db, 'events', eventId);
    try {
        const eventSnap = await getDoc(eventRef);
        if (!eventSnap.exists()) throw new Error('Event not found.');
        const currentEvent = eventSnap.data() as Event;

        // TODO: Implement permission checks here based on who is calling

        let updates: Partial<Event> = { status: newStatus, lastUpdatedAt: Timestamp.now() };
        let notificationType = '';
        let targetUserIds: string[] = [];

        // Logic based on newStatus 
        switch (newStatus) {
            case EventStatus.Approved:
                notificationType = 'event_approved';
                targetUserIds = currentEvent.requestedBy ? [currentEvent.requestedBy] : [];
                break;
            case EventStatus.InProgress:
                updates.ratingsOpen = true; // Open ratings when starting
                notificationType = 'event_in_progress';
                targetUserIds = currentEvent.details?.organizers || [];
                break;
            case EventStatus.Completed:
                updates.completedAt = Timestamp.now();
                updates.ratingsOpen = true; // Ensure ratings are open initially on completion
                notificationType = 'event_completed';
                targetUserIds = currentEvent.details?.organizers || [];
                break;
            case EventStatus.Cancelled:
                updates.ratingsOpen = false; // Close ratings on cancellation
                notificationType = 'event_cancelled';
                targetUserIds = currentEvent.requestedBy ? [currentEvent.requestedBy] : [];
                break;
            case EventStatus.Rejected:
                updates.ratingsOpen = false;
                notificationType = 'event_rejected'; // Assuming a type exists
                targetUserIds = currentEvent.requestedBy ? [currentEvent.requestedBy] : [];
                break;
            case EventStatus.Closed:
                throw new Error(`Use 'closeEventPermanently' action to close an event.`);
            case EventStatus.Pending:
                throw new Error(`Changing status back to '${newStatus}' is not supported here.`);
        }

        await updateDoc(eventRef, updates);
        console.log(`Firestore: Event ${eventId} status updated to ${newStatus}.`);

        // Trigger notification (keep logic here or move to Pinia action)
        if (isSupabaseConfigured() && notificationType && targetUserIds.length > 0) {
            invokePushNotification({ type: notificationType, eventId, targetUserIds })
                .catch(pushError => console.error("Push notification failed:", pushError));
        }

        return updates; // Return the updates applied

    } catch (error: any) {
        console.error(`Firestore updateEventStatus error for ${eventId}:`, error);
        throw new Error(`Failed to update event status: ${error.message}`);
    }
}

/**
 * Closes an event permanently in Firestore (sets status and closedAt).
 * Does NOT handle XP calculation/award - that's done in the Pinia action.
 * @param eventId - The ID of the event.
 * @param currentUser - The currently logged-in user object.
 * @returns Promise<void>
 * @throws Error if permissions fail, event not found, state invalid, or Firestore update fails.
 */
export async function closeEventDocumentInFirestore(eventId: string, currentUser: User | null): Promise<void> {
     if (!eventId) throw new Error('Event ID required.');
     if (!currentUser?.uid) throw new Error('User not authenticated.');

     const eventRef = doc(db, 'events', eventId);
     try {
         const eventSnap = await getDoc(eventRef);
         if (!eventSnap.exists()) throw new Error('Event not found.');
         const eventData = eventSnap.data() as Event;

         // Permission Check
         const isOrganizer = eventData.details?.organizers?.includes(currentUser.uid) || eventData.requestedBy === currentUser.uid;
         if (!isOrganizer) throw new Error("Unauthorized: Only organizers can close events.");

         // State Check
         if (eventData.status !== EventStatus.Completed) throw new Error("Event must be 'Completed' to be closed.");
         if (eventData.ratingsOpen) throw new Error("Ratings must be closed before closing the event.");
         if (!eventData.winners || Object.keys(eventData.winners).length === 0) throw new Error("Winners must be determined before closing.");

         // Update Firestore status and timestamp
         await updateDoc(eventRef, {
             status: EventStatus.Closed,
             closedAt: Timestamp.now(),
             lastUpdatedAt: Timestamp.now()
         });
         console.log(`Firestore: Event ${eventId} marked as Closed.`);

     } catch (error: any) {
         console.error(`Firestore closeEvent error for ${eventId}:`, error);
         throw new Error(`Failed to close event document: ${error.message}`);
     }
}