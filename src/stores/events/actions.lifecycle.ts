// src/stores/events/actions.lifecycle.ts
import { doc, getDoc, updateDoc, addDoc, collection, Timestamp, setDoc } from 'firebase/firestore'; // Added setDoc
import { db } from '@/firebase';
// Import EventStatus as a value, not just a type
import { EventStatus, type Event, type EventFormData, type EventLifecycleTimestamps } from '@/types/event';
import { mapEventDataToFirestore, mapFirestoreToEventData } from '@/utils/eventDataMapper'; // Added mapFirestoreToEventData
import { DateTime } from 'luxon'; // Import DateTime for date handling

// Assuming User type is defined in @/types/user.ts
import type { UserData } from '@/types/student'; // Changed from {} to UserData
// Assuming notification helpers are defined elsewhere, e.g., @/notifications.ts
// For now, these will be commented out if their definitions are not provided.
// import { invokePushNotification, isSupabaseConfigured } from '@/notifications';


const now = () => Timestamp.now();

/**
 * Creates a new event request document in Firestore submitted by a student.
 * @param formData - The event form data.
 * @param studentId - The UID of the student making the request.
 * @returns Promise<string> - The ID of the newly created event document.
 */
export async function createEventRequestByStudentInFirestore(formData: EventFormData, studentId: string): Promise<string> {
    if (!studentId) throw new Error('Student ID is required to request an event.');
    if (!formData.details?.eventName?.trim()) throw new Error('Event name is required.');
    // Add more formData validation as needed

    try {
        const newEventRef = doc(collection(db, 'events')); // Generate a new document reference
        const newEventId = newEventRef.id; // Get the auto-generated ID

        // formData.createdAt and .lastUpdatedAt are now optional (Timestamp | undefined)
        // mapEventDataToFirestore expects only EventFormData
        const mappedData = mapEventDataToFirestore(formData);
        
        const dataToSubmit: Partial<Event> = {
            ...mappedData,
            id: newEventId, // Include the generated ID in the document data
            requestedBy: studentId,
            status: EventStatus.Pending, // EventStatus can now be used as a value
            votingOpen: false,
            organizerRatings: [], // Ensure these are initialized if not in formData/mappedData
            submissions: [],
            winners: {},
            bestPerformerSelections: {},
            // createdAt & lastUpdatedAt are handled by mapEventDataToFirestore
        };
        // Ensure organizers array includes the requester if not already
        if (dataToSubmit.details && !dataToSubmit.details.organizers?.includes(studentId)) {
            dataToSubmit.details.organizers = [studentId, ...(dataToSubmit.details.organizers || [])];
        }
        // mapEventDataToFirestore should handle setting createdAt and lastUpdatedAt if isNew is true
        // If they are still undefined here, it means formData didn't provide them and mapEventDataToFirestore also didn't set them.
        // However, the logic in mapEventDataToFirestore for isNew=true should set them.

        await setDoc(newEventRef, dataToSubmit); // Use setDoc with the generated reference
        return newEventId;
    } catch (error: any) {
        console.error('Firestore createEventRequestByStudent error:', error);
        throw new Error(`Failed to submit event request: ${error.message}`);
    }
}

/**
 * Updates an existing event request document in Firestore by a student.
 * Only for their own PENDING requests.
 * @param eventId - The ID of the event to update.
 * @param formData - The partial event form data containing updates.
 * @param studentId - The UID of the student making the update.
 */
export async function updateMyEventRequestInFirestore(eventId: string, formData: EventFormData, studentId: string): Promise<void> {
    if (!eventId) throw new Error('Event ID is required for updates.');
    if (!studentId) throw new Error('Student ID is required.');

    const eventRef = doc(db, 'events', eventId);
    try {
        const eventSnap = await getDoc(eventRef);
        if (!eventSnap.exists()) throw new Error('Event request not found.');
        const currentEvent = eventSnap.data() as Event;

        if (currentEvent.requestedBy !== studentId) {
            throw new Error("Permission denied: You can only edit your own event requests.");
        }
        if (currentEvent.status !== EventStatus.Pending) { // EventStatus can now be used as a value
            throw new Error(`Cannot edit request with status: ${currentEvent.status}. Contact an admin.`);
        }

        // mapEventDataToFirestore expects only EventFormData
        const mappedUpdates = mapEventDataToFirestore(formData);

        const updates: Partial<Event> = { // Changed from MappedEventForFirestore
            ...mappedUpdates,
            lastUpdatedAt: now() // mapEventDataToFirestore should also set this if !isNew
        };
        // Ensure student cannot change status, requester, or critical system-managed fields
        delete updates.status;
        delete updates.requestedBy;
        delete updates.createdAt; // Should not be changed by student edit
        delete updates.closedAt;
        delete updates.lifecycleTimestamps; // Admins manage these
        delete updates.votingOpen;
        delete updates.winners;
        delete updates.manuallySelectedBy;
        delete updates.organizerRatings;
        // `submissions` might be editable if you allow pre-adding submission links, but usually not by student edit of PENDING request.

        await updateDoc(eventRef, updates);
    } catch (error: any) {
        console.error(`Firestore updateMyEventRequest error for ${eventId}:`, error);
        throw new Error(`Failed to update event request: ${error.message}`);
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
export async function updateEventStatusInFirestore(
    eventId: string,
    newStatus: EventStatus, // EventStatus can be used as a value
    currentUser: UserData | null, 
    rejectionReason?: string
): Promise<Partial<Event>> {
    const validStatuses = Object.values(EventStatus); // EventStatus can now be used as a value
    if (!validStatuses.includes(newStatus)) throw new Error(`Invalid status: ${newStatus}.`);
    if (!eventId) throw new Error('Event ID required for status update.');
    if (!currentUser?.uid) throw new Error('User not authenticated for status update.');

    const eventRef = doc(db, 'events', eventId);
    try {
        const eventSnap = await getDoc(eventRef);
        if (!eventSnap.exists()) throw new Error('Event not found.');
        const currentEvent = mapFirestoreToEventData(eventSnap.id, eventSnap.data()); // mapFirestoreToEventData is now imported
        if (!currentEvent) throw new Error('Failed to map current event data.');

        const updatesToApply: Partial<Event> = {
            status: newStatus,
            lastUpdatedAt: now(),
        };
        
        let notificationType: string = ''; // Define notificationType
        let targetUserIds: string[] = [];  // Define targetUserIds
        let eventName: string = currentEvent.details?.eventName || 'Event'; // Define eventName


        if (newStatus === EventStatus.Rejected && rejectionReason) {
            updatesToApply.rejectionReason = rejectionReason;
        }
        // Correctly update lifecycleTimestamps
        if (newStatus === EventStatus.Completed) {
            updatesToApply.lifecycleTimestamps = {
                ...(currentEvent.lifecycleTimestamps || {}), // Spread existing or empty object
                completedAt: now(),
            };
        }
        // Logic based on newStatus 
        switch (newStatus) {
            case EventStatus.Approved: // EventStatus can now be used as a value
                notificationType = 'event_approved';
                targetUserIds = currentEvent.requestedBy ? [currentEvent.requestedBy] : [];
                eventName = currentEvent.details?.eventName || 'Your Event';
                break;
            case EventStatus.InProgress:
                updatesToApply.votingOpen = true; 
                notificationType = 'event_in_progress';
                targetUserIds = currentEvent.details?.organizers || [];
                break;
            case EventStatus.Completed: // EventStatus can now be used as a value
                // completedAt is handled above
                updatesToApply.votingOpen = true; 
                notificationType = 'event_completed';
                targetUserIds = currentEvent.details?.organizers || [];
                break;
            case EventStatus.Cancelled: // EventStatus can now be used as a value
                updatesToApply.votingOpen = false; 
                notificationType = 'event_cancelled';
                targetUserIds = currentEvent.requestedBy ? [currentEvent.requestedBy] : [];
                break;
            case EventStatus.Rejected: // EventStatus can now be used as a value
                updatesToApply.votingOpen = false;
                notificationType = 'event_rejected'; 
                targetUserIds = currentEvent.requestedBy ? [currentEvent.requestedBy] : [];
                eventName = currentEvent.details?.eventName || 'Your Event Request';
                break;
            case EventStatus.Closed: // EventStatus can now be used as a value
                throw new Error(`Use 'closeEventPermanently' action to close an event.`);
            case EventStatus.Pending: // EventStatus can now be used as a value
                throw new Error(`Changing status back to '${newStatus}' is not supported here.`);
        }

        await updateDoc(eventRef, updatesToApply);
        console.log(`Firestore: Event ${eventId} status updated to ${newStatus}.`);

        // Trigger notification (assuming isSupabaseConfigured and invokePushNotification are available)
        // if (isSupabaseConfigured() && notificationType && targetUserIds.length > 0) {
        //     invokePushNotification({ 
        //         type: notificationType, 
        //         eventId, 
        //         eventName, 
        //         targetUserIds 
        //     })
        //         .catch((pushError: any) => console.error("Push notification failed:", pushError));
        // }

        return updatesToApply; 

    } catch (error: any) {
        console.error(`Firestore updateMyEventRequest error for ${eventId}:`, error);
        throw new Error(`Failed to update event request: ${error.message}`);
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
export async function closeEventDocumentInFirestore(eventId: string, currentUser: UserData | null): Promise<void> {
     if (!eventId) throw new Error('Event ID required.');
     if (!currentUser?.uid) throw new Error('User not authenticated.');

     const eventRef = doc(db, 'events', eventId);
     try {
         const eventSnap = await getDoc(eventRef);
         if (!eventSnap.exists()) throw new Error('Event not found.');
         const eventData = mapFirestoreToEventData(eventSnap.id, eventSnap.data()); // mapFirestoreToEventData is now imported
         if (!eventData) throw new Error('Failed to map event data for closing.');

         // Permission Check
         const isOrganizer = eventData.details?.organizers?.includes(currentUser.uid) || eventData.requestedBy === currentUser.uid;
         if (!isOrganizer) throw new Error("Unauthorized: Only organizers can close events.");

         // State Check
         if (eventData.status !== EventStatus.Completed) throw new Error("Event must be 'Completed' to be closed."); // EventStatus can now be used as a value
         if (eventData.votingOpen) throw new Error("Voting must be closed before closing the event.");
         if (!eventData.winners || Object.keys(eventData.winners).length === 0) throw new Error("Winners must be determined before closing.");

         // Update Firestore status and timestamp
         await updateDoc(eventRef, {
             status: EventStatus.Closed, // EventStatus can now be used as a value
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

    const eventToCreate: Event = {
        id: newEventId,
        requestedBy: userId,
        status: eventData.status || EventStatus.Pending, // EventStatus can now be used as a value
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
        participants: [], 
        submissions: [], 
        organizerRatings: eventData.organizerRatings || [], // Corrected: organizerRatings, and use form data if present
        votingOpen: false, 
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

/**
 * Creates a new event request document in Firestore submitted by a student.
 * @param formData - The event form data.
 * @param studentId - The UID of the student making the request.
 * @returns Promise<string> - The ID of the newly created event document.
 */
export async function createEventRequest(formData: EventFormData, studentId: string): Promise<string> {
    if (!formData || !studentId) {
        throw new Error('Event form data and student ID are required.');
    }

    // Validate dates before processing
    const startDate = formData.details.date.start;
    const endDate = formData.details.date.end;
    
    if (!startDate || !endDate) {
        throw new Error('Both start and end dates are required.');
    }

    // Convert and validate dates
    let startDateTime: DateTime;
    let endDateTime: DateTime;
    
    try {
        if (typeof startDate === 'string') {
            startDateTime = DateTime.fromISO(startDate);
        } else if (startDate && typeof startDate === 'object' && (startDate as any) instanceof Date) {
            startDateTime = DateTime.fromJSDate(startDate as Date);
        } else if (startDate && typeof startDate === 'object' && 'toDate' in startDate) {
            startDateTime = DateTime.fromJSDate((startDate as any).toDate());
        } else {
            throw new Error('Invalid start date format');
        }
        
        if (typeof endDate === 'string') {
            endDateTime = DateTime.fromISO(endDate);
        } else if (endDate && typeof endDate === 'object' && (endDate as any) instanceof Date) {
            endDateTime = DateTime.fromJSDate(endDate as Date);
        } else if (endDate && typeof endDate === 'object' && 'toDate' in endDate) {
            endDateTime = DateTime.fromJSDate((endDate as any).toDate());
        } else {
            throw new Error('Invalid end date format');
        }
    } catch (error) {
        throw new Error('Invalid date format provided.');
    }

    if (!startDateTime.isValid || !endDateTime.isValid) {
        throw new Error('Invalid dates provided. Please check your date selection.');
    }

    if (endDateTime <= startDateTime) {
        throw new Error(`Event end date must be after start date.`);
    }

    try {
        const eventRef = await addDoc(collection(db, 'events'), {
            ...mapEventDataToFirestore(formData),
            requestedBy: studentId,
            createdAt: now(),
            lastUpdatedAt: now()
        });
        
        return eventRef.id;
    } catch (error: any) {
        console.error('Error creating event request:', error);
        throw new Error('Failed to create event request: ' + error.message);
    }
}