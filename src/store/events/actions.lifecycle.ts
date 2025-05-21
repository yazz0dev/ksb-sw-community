// src/store/events/actions.lifecycle.ts
// Helper functions for lifecycle operations.
import { doc, getDoc, updateDoc, addDoc, collection, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/firebase';
import { EventFormData, Event, EventStatus, EventFormat, EventCriteria } from '@/types/event';
import { User } from '@/types/user'; // Assuming User type exists
import { invokePushNotification, isSupabaseConfigured } from '@/notifications';
import { mapEventDataToFirestore, mapFirestoreToEventData } from '@/utils/eventDataMapper'; // Import mappers

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
             // createdAt and votingOpen will be set by mapEventDataToFirestore if not present
        });

        // lastUpdatedAt is set by mapEventDataToFirestore
        // delete mappedData.lastUpdatedAt; // No, this is set by the mapper

        // Remove fields that shouldn't be set on creation explicitly
        delete mappedData.id;
        delete mappedData.completedAt;
        delete mappedData.closedAt;
        delete mappedData.teamMembersFlat;
        delete mappedData.gallery;
        delete mappedData.winners;
        delete mappedData.manuallySelectedBy;

        // Only include fields explicitly allowed by Firestore rules
        const allowedFields = [
            'details', 'requestedBy', 'status', 'createdAt', 'lastUpdatedAt',
            'votingOpen', 'criteria', 'teams', 'participants', 'submissions',
            'organizerRating', 'bestPerformerSelections', 'rejectionReason'
        ];

        const filteredData: Record<string, any> = {};
        allowedFields.forEach(field => {
            if (field in mappedData) {
                filteredData[field] = mappedData[field];
            }
        });

        // Ensure required fields are properly initialized according to the security rules
        // For non-Team events, teams must be null or an empty list
        if (filteredData.details?.format !== 'Team') {
            filteredData.teams = [];
        } else if (!filteredData.teams) {
            filteredData.teams = [];
        }

        // Initialize participants as an empty array (required by rules)
        filteredData.participants = filteredData.participants || [];
        
        // Initialize submissions as an empty array (required by rules)
        filteredData.submissions = filteredData.submissions || [];
        
        // Initialize organizerRating as an empty array (required by rules)
        filteredData.organizerRating = filteredData.organizerRating || [];
        
        // Initialize bestPerformerSelections as an empty object (required by rules)
        filteredData.bestPerformerSelections = filteredData.bestPerformerSelections || {};

        // Log the FILTERED data being sent to Firestore
        console.log("Data being sent to Firestore for event creation:", JSON.stringify(filteredData, (key, value) => {
            if (value && value.toDate instanceof Function) {
                return value.toDate().toISOString();
            }
            return value;
        }, 2));

        // Use filteredData instead of mappedData for the Firestore call
        const docRef = await addDoc(collection(db, 'events'), filteredData);

        // Trigger notification (keep this logic here or move to Pinia action)
        if (isSupabaseConfigured()) {
            invokePushNotification({
                type: 'event_request', 
                eventId: docRef.id, 
                eventName: filteredData.details?.name || 'New Event', // ADDED eventName
                requestedBy: currentUserUid,
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
        // Use the mapper to convert Firestore data to Event object
        const eventData = mapFirestoreToEventData(eventSnap.id, eventSnap.data());
        if (!eventData) throw new Error('Failed to map event data.'); // Should not happen if exists()

        // Enhanced Permission Check
        const isOrganizer = eventData.details?.organizers?.includes(currentUser.uid) || eventData.requestedBy === currentUser.uid;
 
    
        if (!isOrganizer ) {
            throw new Error(`Permission denied: Only organizers  can modify this event.`);
        }
        
        const currentStatus = eventData.status as EventStatus;
        const editableStatuses: EventStatus[] = [EventStatus.Pending, EventStatus.Approved, EventStatus.InProgress];

        if (!editableStatuses.includes(currentStatus)) {
            throw new Error(`Cannot edit event in status '${currentStatus}'.`);
        }

        // Prepare payload using mapper
        const mappedUpdates = mapEventDataToFirestore({
            ...updates,
            // lastUpdatedAt is set by mapEventDataToFirestore
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
        } else if (mappedUpdates.details && Object.keys(mappedUpdates.details).length === 0) {
            // If details was in updates but became empty after mapping (e.g. all undefined), remove it
            delete mappedUpdates.details;
        }

        // Log the data being sent for debugging Firestore rules
        console.log("Data being sent to Firestore for event update:", JSON.stringify(mappedUpdates, (key, value) => {
            if (value && value.toDate instanceof Function) {
                return value.toDate().toISOString();
            }
            return value;
        }, 2));

        await updateDoc(eventRef, mappedUpdates);
        console.log(`Firestore: Event ${eventId} details updated.`);

    } catch (error: any) {
        // Enhanced error handling
        console.error(`Firestore updateEventDetails error for ${eventId}:`, error);
        
        // Categorize errors for better user feedback
        if (error.code === 'permission-denied') {
            throw new Error(`Permission denied: You don't have access to update this event.`);
        } else if (error.code === 'not-found') {
            throw new Error(`Event not found. It may have been deleted.`);
        } else if (error.code === 'unavailable') {
            throw new Error(`Service temporarily unavailable. Please try again later.`);
        } else {
            throw new Error(`Failed to update event details: ${error.message || 'Unknown error'}`);
        }
    }
}


/**
 * Updates the status of an event document in Firestore.
 * @param eventId - The ID of the event.
 * @param newStatus - The new EventStatus.
 * @param currentUser - The user attempting to update the status.
 * @returns Promise<Partial<Event>> - Returns the specific fields that were updated.
 * @throws Error if status change invalid, event not found, or Firestore update fails.
 */
export async function updateEventStatusInFirestore(eventId: string, newStatus: EventStatus, currentUser: User | null): Promise<Partial<Event>> {
    const validStatuses = Object.values(EventStatus);
    if (!validStatuses.includes(newStatus)) throw new Error(`Invalid status: ${newStatus}.`);
    if (!eventId) throw new Error('Event ID required for status update.');
    if (!currentUser?.uid) throw new Error('User not authenticated for status update.');

    const eventRef = doc(db, 'events', eventId);
    try {
        const eventSnap = await getDoc(eventRef);
        if (!eventSnap.exists()) throw new Error('Event not found.');
        // Use the mapper to convert Firestore data to Event object
        const currentEvent = mapFirestoreToEventData(eventSnap.id, eventSnap.data());
        if (!currentEvent) throw new Error('Failed to map current event data.');

        // Permission Check: Allow organizers or the event requester.
        const isOrganizer = currentEvent.details?.organizers?.includes(currentUser.uid) || currentEvent.requestedBy === currentUser.uid;
        if (!isOrganizer) {
            throw new Error(`Permission denied: Only organizers or the event requester can change the event status.`);
        }

        let updates: Partial<Event> = { 
            status: newStatus,
            lastUpdatedAt: Timestamp.now() // ADDED
        };
        let notificationType = '';
        let targetUserIds: string[] = [];
        let eventName = ''; // ADDED

        // Logic based on newStatus 
        switch (newStatus) {
            case EventStatus.Approved:
                notificationType = 'event_approved';
                targetUserIds = currentEvent.requestedBy ? [currentEvent.requestedBy] : [];
                eventName = currentEvent.details?.name || 'Your Event'; // ADDED
                break;
            case EventStatus.InProgress:
                updates.votingOpen = true; // Open voting when starting
                notificationType = 'event_in_progress';
                targetUserIds = currentEvent.details?.organizers || [];
                eventName = currentEvent.details?.name || 'Event'; // ADDED
                break;
            case EventStatus.Completed:
                updates.completedAt = Timestamp.now();
                updates.votingOpen = true; // Ensure voting are open initially on completion
                notificationType = 'event_completed';
                targetUserIds = currentEvent.details?.organizers || [];
                eventName = currentEvent.details?.name || 'Event'; // ADDED
                break;
            case EventStatus.Cancelled:
                updates.votingOpen = false; // Close voting on cancellation
                notificationType = 'event_cancelled';
                targetUserIds = currentEvent.requestedBy ? [currentEvent.requestedBy] : [];
                eventName = currentEvent.details?.name || 'Event'; // ADDED
                break;
            case EventStatus.Rejected:
                updates.votingOpen = false;
                notificationType = 'event_rejected'; // Assuming a type exists
                targetUserIds = currentEvent.requestedBy ? [currentEvent.requestedBy] : [];
                eventName = currentEvent.details?.name || 'Your Event Request'; // ADDED
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
            invokePushNotification({ 
                type: notificationType, 
                eventId, 
                eventName, // ADDED
                targetUserIds 
            })
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
         // Use the mapper to convert Firestore data to Event object
         const eventData = mapFirestoreToEventData(eventSnap.id, eventSnap.data());
         if (!eventData) throw new Error('Failed to map event data for closing.');

         // Permission Check
         const isOrganizer = eventData.details?.organizers?.includes(currentUser.uid) || eventData.requestedBy === currentUser.uid;
         if (!isOrganizer) throw new Error("Unauthorized: Only organizers can close events.");

         // State Check
         if (eventData.status !== EventStatus.Completed) throw new Error("Event must be 'Completed' to be closed.");
         if (eventData.votingOpen) throw new Error("Voting must be closed before closing the event.");
         if (!eventData.winners || Object.keys(eventData.winners).length === 0) throw new Error("Winners must be determined before closing.");

         // Update Firestore status and timestamp
         await updateDoc(eventRef, {
             status: EventStatus.Closed,
             closedAt: Timestamp.now(),
             // lastUpdatedAt is handled by the Pinia store batch write
         });
         console.log(`Firestore: Event ${eventId} marked as Closed.`);

     } catch (error: any) {
         console.error(`Firestore closeEvent error for ${eventId}:`, error);
         throw new Error(`Failed to close event document: ${error.message}`);
     }
}

/**
 * Creates a new event document in Firestore.
 * @param eventData - The data for the event being created.
 * @param userId - The ID of the user creating the event.
 * @returns Promise<string> - The ID of the newly created event document.
 * @throws Error if user not logged in, data invalid, or Firestore operation fails.
 */
export async function createEventInFirestore(eventData: EventFormData, userId: string): Promise<string> {
    if (!userId) throw new Error("User ID is required to create an event.");
    if (!eventData.details.eventName) throw new Error("Event name is required.");

    const newEventRef = doc(collection(db, 'events'));
    const newEventId = newEventRef.id;

    // Prepare the Event object from EventFormData
    const eventToCreate: Event = {
        id: newEventId,
        requestedBy: userId,
        status: eventData.status || EventStatus.Pending, // Default to Pending if not specified
        details: {
            eventName: eventData.details.eventName,
            description: eventData.details.description,
            format: eventData.details.format,
            type: eventData.details.type || 'General', // Default type
            date: {
                start: eventData.details.date.start ? Timestamp.fromDate(new Date(eventData.details.date.start)) : null,
                end: eventData.details.date.end ? Timestamp.fromDate(new Date(eventData.details.date.end)) : null,
            },
            organizers: eventData.details.organizers || [userId], // Default organizer to requester
            allowProjectSubmission: eventData.details.allowProjectSubmission || false,
            prize: eventData.details.prize || undefined,
            rules: eventData.details.rules || undefined,
        },
        criteria: eventData.criteria ? eventData.criteria.map((c, i) => ({ ...c, constraintKey: c.constraintKey || `criterion_${i}`})) : [],
        teams: eventData.teams || [],
        participants: [], // Initialize as empty
        submissions: [], // Initialize as empty
        organizerRating: [], // Initialize as empty
        votingOpen: false, // Default to false
        createdAt: Timestamp.now(),
        lastUpdatedAt: Timestamp.now(),
    };

    try {
        await setDoc(newEventRef, eventToCreate);
        console.log("Firestore: Event created with ID:", newEventId);
        return newEventId;
    } catch (error: any) {
        console.error("Error creating event in Firestore:", error);
        throw new Error(`Failed to create event: ${error.message}`);
    }
}

/**
 * Requests deletion of an event by updating its document in Firestore.
 * @param eventId - The ID of the event to delete.
 * @param userId - The ID of the user requesting the deletion.
 * @param reason - The reason for deletion.
 * @returns Promise<void>
 * @throws Error if event not found, user not authorized, or Firestore operation fails.
 */
export async function requestEventDeletionInFirestore(eventId: string, userId: string, reason: string): Promise<void> {
    if (!eventId || !userId || !reason) {
        throw new Error("Event ID, User ID, and reason are required for deletion request.");
    }
    // For now, this might just update the event status to something like 'PendingDeletion'
    // Or add a field like `deletionRequestedBy: userId`, `deletionReason: reason`.
    // True deletion should be an admin action.
    // This example will add a request note to the event.
    const eventRef = doc(db, 'events', eventId);
    try {
        await updateDoc(eventRef, {
            lastUpdatedAt: Timestamp.now(),
            // Example: Add a specific field for deletion requests
            deletionRequest: {
                userId,
                reason,
                requestedAt: Timestamp.now(),
            },
            // Optionally, change status to a review state if applicable
            // status: EventStatus.PendingDeletionReview 
        });
        console.log(`Firestore: Deletion requested for event ${eventId} by user ${userId}. Reason: ${reason}`);
    } catch (error: any) {
        console.error(`Error requesting deletion for event ${eventId}:`, error);
        throw new Error(`Failed to request event deletion: ${error.message}`);
    }
}