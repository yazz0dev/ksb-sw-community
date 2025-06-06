import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  Timestamp,
  updateDoc,
  arrayUnion,
  setDoc,
  deleteField,
  serverTimestamp,
  writeBatch,
  arrayRemove
} from 'firebase/firestore';
import { db } from '@/firebase';
import { DateTime } from 'luxon';
import { 
  type Event, 
  EventStatus, 
  type EventFormData, 
  type Submission,
  EventFormat,
  type EventLifecycleTimestamps,
  type Team,
  type EventCriteria,
  type OrganizerRating
} from '@/types/event';
import { type EnrichedStudentData, type UserData } from '@/types/student';
import { mapEventDataToFirestore, mapFirestoreToEventData } from '@/utils/eventDataUtils';
import { deepClone, isEmpty } from '@/utils/helpers';
import { runTransaction, type Transaction } from 'firebase/firestore';
import { calculateEventXP } from '@/utils/eventUtils';
import { BEST_PERFORMER_LABEL, EVENTS_COLLECTION } from '@/utils/constants';
import { applyXpAwardsBatch } from '@/services/xpService'; // Added import

/**
 * Submit a project to an event
 * @param eventId Event ID
 * @param studentId Student's UID
 * @param submissionData Submission data
 * @returns Promise that resolves when submission is complete
 */
export const submitProject = async (
  eventId: string,
  studentId: string,
  submissionData: Omit<Submission, 'submittedBy' | 'submittedAt' | 'teamName' | 'participantId'>
): Promise<void> => {
  if (!eventId || !studentId) throw new Error("Event ID and Student ID are required.");
  if (!submissionData?.projectName?.trim()) throw new Error("Project Name is required.");
  if (!submissionData?.link?.trim()) throw new Error("Project Link is required.");
  
  try { 
    new URL(submissionData.link); 
  } catch (_) { 
    throw new Error("Invalid Project Link URL."); 
  }

    const eventRef = doc(db, EVENTS_COLLECTION, eventId);
  try {
    const eventSnap = await getDoc(eventRef);
    if (!eventSnap.exists()) throw new Error('Event not found.');
    
    const eventData = mapFirestoreToEventData(eventSnap.id, eventSnap.data());
    if (!eventData) throw new Error('Failed to map event data.');

    if (eventData.status !== EventStatus.InProgress) {
      throw new Error("Submissions only allowed for 'In Progress' events.");
    }
    
    if (eventData.details.allowProjectSubmission === false) {
      throw new Error("Project submissions are not allowed for this event.");
    }

    const newSubmission: Submission = {
      projectName: submissionData.projectName.trim(),
      link: submissionData.link.trim(),
      description: submissionData.description?.trim() || undefined,
      submittedBy: studentId,
      submittedAt: serverTimestamp() as any, // Fix: Cast to any
    };

    if (eventData.details.format === EventFormat.Team) {
      const userTeam = eventData.teams?.find(t => t.members.includes(studentId));
      if (!userTeam) throw new Error("You are not part of a team in this event.");
      newSubmission.teamName = userTeam.teamName;
    } else {
      if (!eventData.participants?.includes(studentId)) {
        throw new Error("You are not a participant in this event.");
      }
      newSubmission.participantId = studentId;
    }

    const existingSubmissions = eventData.submissions || [];
    const isDuplicate = existingSubmissions.some(s =>
      s.projectName.toLowerCase() === newSubmission.projectName.toLowerCase() &&
      ((s.teamName && s.teamName === newSubmission.teamName) || 
       (s.participantId && s.participantId === newSubmission.participantId))
    );
    
    if (isDuplicate) {
      throw new Error(`Project "${newSubmission.projectName}" has already been submitted for your ${newSubmission.teamName ? 'team' : 'entry'}.`);
    }

    await updateDoc(eventRef, {
      submissions: arrayUnion(newSubmission),
      lastUpdatedAt: serverTimestamp()
    });
  } catch (error: any) {
    const message = error.message || `Failed to submit project for event ${eventId}.`;
    console.error(`Error submitting project for event ${eventId}:`, error);
    throw new Error(message);
  }
};

/**
 * Create a new event request
 * @param formData Event form data
 * @param studentId Student's UID
 * @returns Promise that resolves with the new event ID
 */
export const createEventRequest = async (
  formData: EventFormData, 
  studentId: string
): Promise<string> => {
  if (!studentId) throw new Error('Student ID is required to request an event.');
  if (!formData.details?.eventName?.trim()) throw new Error('Event name is required.');

  // --- Start of date validation from actions.lifecycle.ts --- 
  const startDateInput = formData.details.date.start;
  const endDateInput = formData.details.date.end;
  if (!startDateInput || !endDateInput) {
      throw new Error('Both start and end dates are required.');
  }
  let startDateTime: DateTime;
  let endDateTime: DateTime;
  try {
      // formData.details.date.start and .end are expected to be ISO strings or null
      // The types in EventFormData are `string | null`
      if (typeof startDateInput === 'string') startDateTime = DateTime.fromISO(startDateInput);
      // else if (startDateInput instanceof Date) startDateTime = DateTime.fromJSDate(startDateInput); // Not expected per type
      // else if (startDateInput && typeof (startDateInput as any).toDate === 'function') startDateTime = DateTime.fromJSDate((startDateInput as any).toDate()); // Not expected per type
      else throw new Error('Invalid start date format, expected ISO string.');

      if (typeof endDateInput === 'string') endDateTime = DateTime.fromISO(endDateInput);
      // else if (endDateInput instanceof Date) endDateTime = DateTime.fromJSDate(endDateInput); // Not expected per type
      // else if (endDateInput && typeof (endDateInput as any).toDate === 'function') endDateTime = DateTime.fromJSDate((endDateInput as any).toDate()); // Not expected per type
      else throw new Error('Invalid end date format, expected ISO string.');
  } catch (error) {
      // Type assertion for error
      const message = error instanceof Error ? error.message : 'Unknown error during date parsing.';
      throw new Error(`Invalid date format provided for validation: ${message}`);
  }

  if (!startDateTime.isValid || !endDateTime.isValid) {
      let invalidReasons = [];
      if (!startDateTime.isValid) invalidReasons.push(`Start date: ${startDateTime.invalidReason} (value: ${startDateInput})`);
      if (!endDateTime.isValid) invalidReasons.push(`End date: ${endDateTime.invalidReason} (value: ${endDateInput})`);
      throw new Error(`Invalid dates provided. ${invalidReasons.join(', ')}`);
  }

  if (endDateTime <= startDateTime) {
      throw new Error('Event end date must be after start date.');
  }
  
  // FIX: Normalize to start of day for comparison
  const nowLuxon = DateTime.now().setZone('Asia/Kolkata').startOf('day');
  if (startDateTime.startOf('day') < nowLuxon) {
      throw new Error('Event start date cannot be in the past.');
  }
  // --- End of date validation --- 

  try {
    const newEventRef = doc(collection(db, EVENTS_COLLECTION));
    const newEventId = newEventRef.id;

    // mapEventDataToFirestore will convert string dates from formData to Timestamps
    const mappedData = mapEventDataToFirestore(formData);
    
    const dataToSubmit: Partial<Event> = {
      ...mappedData,
      id: newEventId,
      requestedBy: studentId,
      status: EventStatus.Pending,
      votingOpen: false,
      organizerRatings: {},
      submissions: [],
      winners: {},
      bestPerformerSelections: {},
      // lifecycleTimestamps.createdAt will be set by mapEventDataToFirestore due to isNew=true
    };
    
    if (dataToSubmit.details && !dataToSubmit.details.organizers?.includes(studentId)) {
      dataToSubmit.details.organizers = [studentId, ...(dataToSubmit.details.organizers || [])];
    }

    await setDoc(newEventRef, dataToSubmit);
    return newEventId;
  } catch (error) {
    // Type assertion for error
    const message = error instanceof Error ? error.message : 'Unknown error during event creation.';
    console.error('Error creating event request:', message);
    throw new Error(`Failed to create event request: ${message}`);
  }
};

/**
 * Update an existing event request
 * @param eventId ID of the event to update
 * @param formData Event form data containing updates
 * @param studentId Student's UID for permission checks
 * @returns Promise that resolves when the update is complete
 */
export const updateEventRequestInService = async (
  eventId: string,
  formData: EventFormData,
  studentId: string // Added studentId for permission checks
): Promise<void> => {
  if (!eventId) throw new Error('Event ID is required for updates.');
  if (!studentId) throw new Error('Student ID is required for permission checks.');

  const eventRef = doc(db, EVENTS_COLLECTION, eventId);
  try {
    const eventSnap = await getDoc(eventRef);
    if (!eventSnap.exists()) throw new Error('Event request not found.');
    
    // Use mapFirestoreToEventData for robust mapping, though it might not be strictly necessary
    // if only a few fields are being checked. Raw data access is also fine here.
    const currentEvent = mapFirestoreToEventData(eventSnap.id, eventSnap.data());
    if (!currentEvent) throw new Error('Failed to map current event data.');

    // --- Permission and state checks from actions.lifecycle.ts --- 
    if (currentEvent.requestedBy !== studentId) {
        throw new Error("Permission denied: You can only edit your own event requests.");
    }
    // Allow edits also if status is Rejected, not just Pending, as per common UX.
    if (![EventStatus.Pending, EventStatus.Rejected].includes(currentEvent.status)) {
        throw new Error(`Cannot edit request with status: ${currentEvent.status}. Only Pending or Rejected requests are editable.`);
    }
    // --- End of permission and state checks ---

    // Date validation for updates (similar to createEventRequest)
    const startDateInput = formData.details.date.start;
    const endDateInput = formData.details.date.end;
    if (!startDateInput || !endDateInput) {
        throw new Error('Both start and end dates are required for update.');
    }
    let startDateTime: DateTime;
    let endDateTime: DateTime;
    try {
        if (typeof startDateInput === 'string') startDateTime = DateTime.fromISO(startDateInput);
        else if ((startDateInput as any) instanceof Date) startDateTime = DateTime.fromJSDate(startDateInput as Date); // Fix: Cast for instanceof
        else if (startDateInput && typeof (startDateInput as any).toDate === 'function') startDateTime = DateTime.fromJSDate((startDateInput as any).toDate());
        else throw new Error('Invalid start date format');

        if (typeof endDateInput === 'string') endDateTime = DateTime.fromISO(endDateInput);
        else if ((endDateInput as any) instanceof Date) endDateTime = DateTime.fromJSDate(endDateInput as Date); // Fix: Cast for instanceof
        else if (endDateInput && typeof (endDateInput as any).toDate === 'function') endDateTime = DateTime.fromJSDate((endDateInput as any).toDate());
        else throw new Error('Invalid end date format');
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error during date parsing.';
        throw new Error(`Invalid date format for update: ${message}`);
    }
    if (!startDateTime.isValid || !endDateTime.isValid) {
        let invalidReasons = [];
        if (!startDateTime.isValid) invalidReasons.push(`Start date: ${startDateTime.invalidReason}`);
        if (!endDateTime.isValid) invalidReasons.push(`End date: ${endDateTime.invalidReason}`);
        throw new Error(`Invalid dates provided for update. ${invalidReasons.join(', ')}`);
    }
    if (endDateTime <= startDateTime) {
        throw new Error('Event end date must be after start date for update.');
    }
    // For updates, checking if start date is in the past might be too restrictive if only minor details are changed.
    // If a past event's text is edited, this rule might block it.
    // Consider if this check is desired for updates or only for new requests.
    // For now, matching createEventRequest logic, but this could be relaxed.
    const nowLuxon = DateTime.now().setZone('Asia/Kolkata').startOf('day');
    if (startDateTime.startOf('day') < nowLuxon && currentEvent.status === EventStatus.Pending) { // Only apply past check if it was pending (not already started/approved)
         // And if the date itself is being changed to past. Check if startDateTime is different from currentEvent.details.date.start
         let originalStartDateTime: DateTime;
         if ((currentEvent.details.date.start as any) instanceof Timestamp) {
           originalStartDateTime = DateTime.fromJSDate((currentEvent.details.date.start as any).toDate());
         } else if (typeof currentEvent.details.date.start === 'string') {
           originalStartDateTime = DateTime.fromISO(currentEvent.details.date.start);
         } else {
           throw new Error('Invalid original start date format.');
         }
         // FIX: Normalize to start of day for comparison
         if (startDateTime.startOf('day').valueOf() !== originalStartDateTime.startOf('day').valueOf() && startDateTime.startOf('day') < nowLuxon) {
            throw new Error('Event start date cannot be set to the past for an update.');
         }
    }

    // `isNew` is false for updates, so mapEventDataToFirestore will set lastUpdatedAt to serverTimestamp()
    const mappedUpdates = mapEventDataToFirestore(formData); 

    // --- Field protection from actions.lifecycle.ts --- 
    const updatesToApply: any = {
        ...mappedUpdates,
        // lastUpdatedAt is handled by mapEventDataToFirestore
    };

    // Fields that a student requester should NOT be able to change during an edit of their request:
    delete updatesToApply.status;
    delete updatesToApply.requestedBy; // Should remain the original requester
    delete updatesToApply.createdAt;   // Should not be changed
    // delete updatesToApply.closedAt; // Removed as closedAt is now in lifecycleTimestamps
    delete updatesToApply.lifecycleTimestamps; // Admins/system manage these state transitions
    delete updatesToApply.votingOpen;          // Managed by status changes or admin actions
    delete updatesToApply.winners;             // Managed by voting/admin actions
    delete updatesToApply.manuallySelectedBy;
    delete updatesToApply.organizerRatings;    // Separate submission process
    delete updatesToApply.submissions;         // Usually managed via separate submission actions, not event edit
    delete updatesToApply.teamMemberFlatList;  // System generated
    delete updatesToApply.participants;        // Managed by join/leave actions
    // delete updatesToApply.details?.format; // Consider if format should be editable once requested.
                                          // The original function took existingEventFormat, implying it shouldn't change easily.
                                          // For now, allowing it if formData includes it.

    // If the event was rejected, and is now being edited, clear the rejection reason.
    if (currentEvent.status === EventStatus.Rejected) {
        // Only use deleteField() in the update object, not in a local variable of type string
        (updatesToApply as any).rejectionReason = deleteField(); // Or set to null
        updatesToApply.status = EventStatus.Pending; // Resubmit as Pending
    }
    // --- End of field protection ---

    await updateDoc(eventRef, updatesToApply);

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error during event update.';
    console.error(`Error updating event request ${eventId}:`, message);
    throw new Error(`Failed to update event request ${eventId}: ${message}`);
  }
};

/**
 * Closes an event, updates its status, and awards XP to participants.
 * @param eventId The ID of the event to close.
 * @param closingUser The user profile performing the close operation (for logging/permissions).
 * @returns Promise resolving to an object with success status and XP changes map.
 * @throws Throws an error if any step fails.
 */
export const closeEventAndAwardXP = async (
  eventId: string,
  closingUser: EnrichedStudentData | UserData // Must have a 'uid' field
): Promise<{ success: boolean; message: string; xpAwarded?: any }> => {
  if (!eventId) throw new Error('Event ID is required.');
  if (!closingUser?.uid) throw new Error('Closing user and their UID are required.');

  const eventRef = doc(db, EVENTS_COLLECTION, eventId);
  const batch = writeBatch(db);

  try {
    const eventSnap = await getDoc(eventRef);
    if (!eventSnap.exists()) {
      throw new Error('Event not found.');
    }

    const eventData = mapFirestoreToEventData(eventSnap.id, eventSnap.data()) as Event;
    if (!eventData) {
      throw new Error('Failed to map event data for closing.');
    }

    // --- Permission Check (from original closeEventDocumentInFirestore & existing service logic) ---
    const isOrganizerOrRequester = eventData.details.organizers?.includes(closingUser.uid) || eventData.requestedBy === closingUser.uid;
    if (!isOrganizerOrRequester) {
      throw new Error('User does not have permission to close this event.');
    }

    // --- State Validation (from actions.lifecycle.ts#closeEventDocumentInFirestore) ---
    if (eventData.status === EventStatus.Closed) { // Check if already closed first
      // Return a success=false or specific message if already closed, instead of throwing an error that might be caught as a generic failure.
      // Or, the store action could check this before calling if it matters for UI flow.
      // For now, keeping original service behavior of throwing:
      throw new Error('Event is already closed.');
    }
    if (eventData.status !== EventStatus.Completed) {
      throw new Error("Event must be in 'Completed' status to be closed.");
    }
    if (eventData.votingOpen) {
      throw new Error("Voting must be closed before closing the event.");
    }
    if (!eventData.winners || Object.keys(eventData.winners).length === 0) {
      // Allow closing if format is Individual_No_Winner or if winners object exists but might be empty for other reasons.
      // This check might be too strict if an event can be completed and closed without explicit winners (e.g. participation-only event)
      // Re-evaluating this check: The original check in actions.lifecycle was `!eventData.winners || Object.keys(eventData.winners).length === 0`
      // This implies winners object must exist AND have entries. This might be too strict for all event types.
      // Let's soften it: if winners are expected (e.g. based on criteria), then they should be present.
      // For now, keeping it as it was in actions.lifecycle.ts for consistency during this refactor phase.
      // This can be revisited later if event closure rules need more flexibility.
      throw new Error("Winners must be determined and saved before closing the event.");
    }
    // --- End of State Validation ---

    const xpAwards = calculateEventXP(eventData); // Corrected: Removed second argument
    const studentIdsWithXP = Object.keys(xpAwards);

    if (studentIdsWithXP.length > 0) {
      await applyXpAwardsBatch(xpAwards); // Only pass xpAwards if that's the correct signature
    }

    const updatePayload = {
      status: EventStatus.Closed,
      // closedAt: serverTimestamp(), // Removed top-level closedAt
      lastUpdatedAt: serverTimestamp(),
      lifecycleTimestamps: {
        ...(eventData.lifecycleTimestamps || {}),
        closedAt: serverTimestamp(), // Ensure closedAt is set here
      },
    };
    batch.update(eventRef, updatePayload as any);

    await batch.commit();

    return {
      success: true,
      message: `Event "${eventData.details.eventName}" closed successfully. XP awarded to ${studentIdsWithXP.length} participants.`,
      xpAwarded: xpAwards,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error during event closure.';
    console.error(`Error closing event ${eventId}:`, message, error);
    // Ensure this re-throws a clear error for the store to handle
    throw new Error(`Failed to close event ${eventId}: ${message}`);
  }
};

/**
 * Fetches event requests made by a specific student.
 * (Moved from actions.fetching.ts)
 * @param studentId - The UID of the student.
 * @returns Promise<Event[]> - An array of the student's event requests (Pending, Rejected).
 */
export async function fetchMyEventRequests(studentId: string): Promise<Event[]> {
    if (!studentId) return [];
    try {
        const q = query(
            collection(db, EVENTS_COLLECTION), // EVENTS_COLLECTION is already defined in this file
            where('requestedBy', '==', studentId),
            where('status', 'in', [EventStatus.Pending, EventStatus.Rejected]),
            orderBy('createdAt', 'desc')
        );
        const snapshot = await getDocs(q);
        return snapshot.docs
            .map(docSnap => mapFirestoreToEventData(docSnap.id, docSnap.data()))
            .filter((event): event is Event => event !== null);
    } catch (error: any) {
        console.error(`Error in fetchMyEventRequests for ${studentId}:`, error);
        throw new Error(`Failed to fetch your event requests: ${error.message}`);
    }
}

/**
 * Fetches details for a single event from Firestore, with student-specific access checks.
 * (Moved from actions.fetching.ts)
 * @param eventId - The ID of the event to fetch.
 * @param currentStudentId - The UID of the currently logged-in student (can be null if unauthenticated).
 * @returns Promise<Event | null> - The event object or null if not found/accessible.
 */
export async function fetchSingleEventForStudent(eventId: string, currentStudentId: string | null): Promise<Event | null> {
    if (!eventId) throw new Error('Event ID required for fetching details.');
    const eventRef = doc(db, EVENTS_COLLECTION, eventId);
    try {
        const eventSnap = await getDoc(eventRef);
        if (!eventSnap.exists()) {
            console.log(`No event found with ID: ${eventId}`);
            return null;
        }
        const eventData = mapFirestoreToEventData(eventSnap.id, eventSnap.data());

        if (!eventData) {
            console.warn(`Failed to map event data for document ID: ${eventSnap.id} in fetchSingleEventForStudent`);
            return null;
        }

        const publiclyViewableStatuses = [EventStatus.Approved, EventStatus.Completed, EventStatus.Closed];
        const isPublic = publiclyViewableStatuses.includes(eventData.status);
        const isInProgressAndAuthenticated = currentStudentId && eventData.status === EventStatus.InProgress;
        const isMyRequest = currentStudentId && eventData.requestedBy === currentStudentId && 
                            [EventStatus.Pending, EventStatus.Rejected, EventStatus.Cancelled].includes(eventData.status);

        if (isPublic || isInProgressAndAuthenticated || isMyRequest) {
            return eventData;
        } else {
            if (!currentStudentId && eventData.status === EventStatus.InProgress) {
                 console.warn(`Unauthenticated access attempt to InProgress event ${eventId}.`);
                 return null;
            }
            console.log(`Student ${currentStudentId || 'Unauthenticated'} does not have permission to view event ${eventId} with status ${eventData.status}.`);
            return null; 
        }
    } catch (error: any) {
        console.error(`Error fetching single event for student (ID: ${eventId}):`, error);
        throw new Error(`Failed to fetch event details for ${eventId}: ${error.message}`);
    }
}

/**
 * Fetches events that are generally viewable by unauthenticated users: Approved, Completed, or Closed.
 * (Moved from actions.fetching.ts)
 */
export async function fetchPubliclyViewableEvents(): Promise<Event[]> {
  try {
    const q = query(
      collection(db, EVENTS_COLLECTION),
      where('status', 'in', [
        EventStatus.Approved,
        EventStatus.Completed,
        EventStatus.Closed,
      ]),
      orderBy('details.date.start', 'desc')
    );
    const querySnapshot = await getDocs(q);
    const events: Event[] = [];
    querySnapshot.forEach((docSnap) => {
      const eventData = mapFirestoreToEventData(docSnap.id, docSnap.data());
      if (eventData) {
        events.push(eventData);
      } else {
        console.warn(`Failed to map event data for document ID: ${docSnap.id} in fetchPubliclyViewableEvents`);
      }
    });
    return events;
  } catch (error: any) {
    console.error('Error fetching publicly viewable events:', error);
    throw new Error(`Failed to fetch public events: ${error.message}`);
  }
}

/**
 * Updates the status of an event document in Firestore.
 * @param eventId - The ID of the event.
 * @param newStatus - The new EventStatus.
 * @param currentUser - The user attempting to update the status. (Type UserData)
 * @param rejectionReason - Optional reason for rejection.
 * @returns Promise<Partial<Event>> - Returns the specific fields that were updated.
 * @throws Error if status change invalid, event not found, or Firestore update fails.
 */
export async function updateEventStatusInFirestore(
    eventId: string,
    newStatus: EventStatus,
    currentUser: UserData | null, 
    rejectionReason?: string
): Promise<Partial<Event>> {
    const validStatuses = Object.values(EventStatus);
    if (!validStatuses.includes(newStatus)) throw new Error(`Invalid status: ${newStatus}.`);
    if (!eventId) throw new Error('Event ID required for status update.');
    // currentUser might be null if called from a context where user is not fully loaded but UID is known
    // However, the original function checked currentUser?.uid. Let's ensure consistency or clarify.
    // For now, assuming UserData implies uid is present if object is not null.
    if (!currentUser?.uid) throw new Error('User not authenticated for status update.');

    const eventRef = doc(db, EVENTS_COLLECTION, eventId);
    try {
        const eventSnap = await getDoc(eventRef);
        if (!eventSnap.exists()) throw new Error('Event not found.');
        const currentEvent = mapFirestoreToEventData(eventSnap.id, eventSnap.data());
        if (!currentEvent) throw new Error('Failed to map current event data.');

        const updatesToApply: any = { // Use 'any' for Firestore update object
            status: newStatus,
            lastUpdatedAt: serverTimestamp(),
        };
        
        // Retain original notification logic placeholders, but they are commented out

        if (newStatus === EventStatus.Rejected && rejectionReason) {
            updatesToApply.rejectionReason = rejectionReason;
        }
        
        // Logic for lifecycleTimestamps
        const currentLifecycleTimestamps = currentEvent.lifecycleTimestamps || {};
        let updatedLifecycleTimestamps: Partial<EventLifecycleTimestamps> = {};

        switch (newStatus) {
            case EventStatus.Approved:
                (updatedLifecycleTimestamps as any).approvedAt = serverTimestamp();
                // notificationType = 'event_approved';
                // targetUserIds = currentEvent.requestedBy ? [currentEvent.requestedBy] : [];
                // eventNameForNotification = currentEvent.details?.eventName || 'Your Event';
                break;
            case EventStatus.InProgress:
                updatesToApply.votingOpen = true; 
                (updatedLifecycleTimestamps as any).startedAt = serverTimestamp();
                // notificationType = 'event_in_progress';
                // targetUserIds = currentEvent.details?.organizers || [];
                break;
            case EventStatus.Completed:
                updatesToApply.votingOpen = true; 
                (updatedLifecycleTimestamps as any).completedAt = serverTimestamp(); // Fix: Cast updatedLifecycleTimestamps to any
                // notificationType = 'event_completed';
                // targetUserIds = currentEvent.details?.organizers || [];
                break;
            case EventStatus.Cancelled:
                updatesToApply.votingOpen = false; 
                (updatedLifecycleTimestamps as any).cancelledAt = serverTimestamp(); // Fix: Cast updatedLifecycleTimestamps to any for missing 'cancelledAt'
                // notificationType = 'event_cancelled';
                // targetUserIds = currentEvent.requestedBy ? [currentEvent.requestedBy] : [];
                break;
            case EventStatus.Rejected:
                updatesToApply.votingOpen = false;
                (updatedLifecycleTimestamps as any).rejectedAt = serverTimestamp(); // Fix: Cast updatedLifecycleTimestamps to any
                // notificationType = 'event_rejected'; 
                // targetUserIds = currentEvent.requestedBy ? [currentEvent.requestedBy] : [];
                // eventNameForNotification = currentEvent.details?.eventName || 'Your Event Request';
                break;
            case EventStatus.Closed:
                // This status is typically set by closeEventAndAwardXP, which also sets closedAt.
                // If called directly, ensure closedAt is also set.
                // The original function threw an error here, let's reconsider if this function should handle 'Closed' directly.
                // For now, mirroring the original:
                throw new Error(`Use 'closeEventAndAwardXP' service function to close an event.`);
            case EventStatus.Pending:
                throw new Error(`Changing status back to '${newStatus}' is not supported here.`);
        }
        
        if (Object.keys(updatedLifecycleTimestamps).length > 0) {
            updatesToApply.lifecycleTimestamps = {
                ...currentLifecycleTimestamps,
                ...updatedLifecycleTimestamps
            };
        }

        await updateDoc(eventRef, updatesToApply);

        // Trigger notification (assuming isSupabaseConfigured and invokePushNotification are available)
        // if (isSupabaseConfigured() && notificationType && targetUserIds.length > 0) {
        //     invokePushNotification({ 
        //         type: notificationType, 
        //         eventId, 
        //         eventName: eventNameForNotification, 
        //         targetUserIds 
        //     })
        //         .catch((pushError: any) => console.error("Push notification failed:", pushError));
        // }

        // Return only the fields that were meant to be updated on the event document
        const { lastUpdatedAt, ...returnedUpdates } = updatesToApply; // Exclude serverTimestamp from returned object if not needed by caller
        return returnedUpdates; 

    } catch (error: any) {
        // Ensure a clear error message is thrown
        throw new Error(error.message || `Failed to update event status to ${newStatus}.`);
    }
}

/**
 * Creates a new event document in Firestore (directly, not a request).
 * Typically for admin use.
 * @param eventData - The event form data.
 * @param userId - The UID of the user creating the event (admin).
 * @returns Promise<string> - The ID of the newly created event document.
 */
export async function createEventInFirestore(eventData: EventFormData, userId: string): Promise<string> {
    if (!userId) throw new Error('User ID is required to create an event.');
    if (!eventData.details?.eventName?.trim()) throw new Error('Event name is required.');
    
    // Date validation (similar to createEventRequestByStudentInFirestore)
    const startDateInput = eventData.details.date.start;
    const endDateInput = eventData.details.date.end;
    if (!startDateInput || !endDateInput) {
        throw new Error('Both start and end dates are required.');
    }
    let startDateTime: DateTime;
    let endDateTime: DateTime;
    try {
        if (typeof startDateInput === 'string') startDateTime = DateTime.fromISO(startDateInput);
        else if ((startDateInput as any) instanceof Date) startDateTime = DateTime.fromJSDate(startDateInput as Date); // Fix: Cast for instanceof
        else if (startDateInput && typeof (startDateInput as any).toDate === 'function') startDateTime = DateTime.fromJSDate((startDateInput as any).toDate());
        else throw new Error('Invalid start date format');

        if (typeof endDateInput === 'string') endDateTime = DateTime.fromISO(endDateInput);
        else if ((endDateInput as any) instanceof Date) endDateTime = DateTime.fromJSDate(endDateInput as Date); // Fix: Cast for instanceof
        else if (endDateInput && typeof (endDateInput as any).toDate === 'function') endDateTime = DateTime.fromJSDate((endDateInput as any).toDate());
        else throw new Error('Invalid end date format');
    } catch (error) {
        throw new Error('Invalid date format provided for validation.');
    }

    if (!startDateTime.isValid || !endDateTime.isValid) {
        throw new Error('Invalid dates provided. Please check your date selection.');
    }
    if (endDateTime <= startDateTime) { // End date must be strictly after start date
        throw new Error('Event end date must be after start date.');
    }
    // Consider adding check for start date not in the past.
    // const nowLuxon = DateTime.now().setZone('Asia/Kolkata');
    // if (startDateTime < nowLuxon) {
    //     throw new Error('Event start date cannot be in the past.');
    // }

    try {
        const newEventRef = doc(collection(db, EVENTS_COLLECTION));
        const newEventId = newEventRef.id;

        const mappedData = mapEventDataToFirestore(eventData); // isNew = true for createdAt/lastUpdatedAt server timestamps

        const dataToSubmit: Partial<Event> = {
            ...mappedData,
            id: newEventId,
            requestedBy: userId, // Creator is the requester
            status: EventStatus.Approved, // Directly approved
            votingOpen: false, 
            organizerRatings: {},
            submissions: [],
            winners: {},
            bestPerformerSelections: {},
            lifecycleTimestamps: {
                createdAt: serverTimestamp(), // Already handled by mapEventDataToFirestore if isNew is true
                approvedAt: serverTimestamp(), // Set approvedAt timestamp
                // lastUpdatedAt is also handled by mapEventDataToFirestore
            }
        };
        
        // Ensure organizers list includes the creator if not already, or if organizers are provided
        if (dataToSubmit.details) {
            if (!dataToSubmit.details.organizers || dataToSubmit.details.organizers.length === 0) {
                dataToSubmit.details.organizers = [userId];
            }
        }


        await setDoc(newEventRef, dataToSubmit);
        return newEventId;
    } catch (error: any) {
        throw new Error(error.message || 'Failed to create event directly.');
    }
}

/**
 * Records a request for event deletion in Firestore.
 * This is a soft delete request, actual deletion might be an admin process.
 * @param eventId - The ID of the event to request deletion for.
 * @param userId - The UID of the user making the request.
 * @param reason - The reason for requesting deletion.
 */
export async function requestEventDeletionInFirestore(eventId: string, userId: string, reason: string): Promise<void> {
    if (!eventId) throw new Error('Event ID is required to request deletion.');
    if (!userId) throw new Error('User ID is required to request deletion.');
    if (!reason || reason.trim().length === 0) throw new Error('A reason for deletion is required.');

    const eventRef = doc(db, EVENTS_COLLECTION, eventId);
    try {
        const eventSnap = await getDoc(eventRef);
        if (!eventSnap.exists()) {
            throw new Error('Event not found.');
        }
        // Optional: Add permission checks here, e.g., only requester or admin can request deletion.
        // const eventData = eventSnap.data();
        // if (eventData.requestedBy !== userId && !userIsAdmin(userId)) { // Assuming a userIsAdmin check
        //    throw new Error('Permission denied to request deletion for this event.');
        // }

        const deletionRequest = {
            requestedBy: userId,
            requestedAt: serverTimestamp(),
            reason: reason.trim(),
            status: 'PendingReview' // Example status for the deletion request
        };

        // Store this request in a subcollection or a separate collection, or update the event doc.
        // For simplicity, updating the event doc:
        await updateDoc(eventRef, {
            deletionRequested: deletionRequest,
            lastUpdatedAt: serverTimestamp()
        });
        
        // Consider a notification to admins about the deletion request.

    } catch (error: any) {
        throw new Error(error.message || `Failed to request deletion for event ${eventId}.`);
    }
}

/**
 * Adds a student to an event's participants list in Firestore (for Individual/Competition events).
 * For Team events, students join teams, not the event directly as a participant.
 * @param eventId - The ID of the event.
 * @param studentId - The UID of the student joining.
 */
export async function joinEventByStudentInFirestore(eventId: string, studentId: string): Promise<void> {
    if (!eventId || !studentId) throw new Error('Event ID and Student ID are required.');

    const eventRef = doc(db, EVENTS_COLLECTION, eventId);
    try {
        const eventSnap = await getDoc(eventRef);
        if (!eventSnap.exists()) throw new Error('Event not found.');
        
        // Use the already imported mapFirestoreToEventData from eventDataUtils
        const eventData = mapFirestoreToEventData(eventSnap.id, eventSnap.data());
        if (!eventData) throw new Error('Failed to map event data.');

        if (![EventStatus.Approved, EventStatus.InProgress].includes(eventData.status as EventStatus)) {
            throw new Error(`Cannot join event with status: ${eventData.status}`);
        }
        if (eventData.details.format === EventFormat.Team) {
            throw new Error("To join a team event, please find and join a specific team through team management actions.");
        }
        if (eventData.participants?.includes(studentId)) {
            // This is not an error, more of a successful no-op or a warning.
            // Depending on desired behavior, could return a specific status or just log.
            console.warn(`Student ${studentId} is already a participant in event ${eventId}.`);
            return; 
        }
        if (eventData.details.organizers?.includes(studentId)) {
            throw new Error("Organizers are automatically part of the event and cannot join as a participant.");
        }

        await updateDoc(eventRef, {
            participants: arrayUnion(studentId),
            lastUpdatedAt: serverTimestamp()
        });
    } catch (error: any) {
        // Ensure a clear error message is thrown for the store to handle
        throw new Error(error.message || `Failed to join event ${eventId}.`);
    }
}

/**
 * Removes a student from an event's participants list or their team in Firestore.
 * @param eventId - The ID of the event.
 * @param studentId - The UID of the student leaving.
 */
export async function leaveEventByStudentInFirestore(eventId: string, studentId: string): Promise<void> {
    if (!eventId || !studentId) throw new Error('Event ID and Student ID are required.');

    const eventRef = doc(db, EVENTS_COLLECTION, eventId);
    try {
        const eventSnap = await getDoc(eventRef);
        if (!eventSnap.exists()) throw new Error('Event not found.');
        
        const eventData = mapFirestoreToEventData(eventSnap.id, eventSnap.data());
        if (!eventData) throw new Error('Failed to map event data.');

        if ([EventStatus.Completed, EventStatus.Cancelled, EventStatus.Closed].includes(eventData.status as EventStatus)) {
            throw new Error(`Cannot leave event with status: ${eventData.status}.`);
        }
        if (eventData.details.organizers?.includes(studentId)) {
            throw new Error("Organizers cannot leave the event using this action. Admin action required.");
        }

        const updates: Partial<Event> = { lastUpdatedAt: serverTimestamp() as any }; // Fix: Cast to any
        let userFoundAndRemoved = false;

        if (eventData.details.format !== EventFormat.Team) {
            if (eventData.participants?.includes(studentId)) {
                (updates as any).participants = arrayRemove(studentId); // Fix: Cast updates to any for arrayRemove
                userFoundAndRemoved = true;
            } else {
                // Not an error if not found for non-team, could be they already left.
                console.warn(`Student ${studentId} not found in participants list for non-team event ${eventId}.`);
                // Decide if this should throw or be a silent success/warning.
                // For now, let it proceed to the check below, which will throw if no action taken.
            }
        } else if (eventData.details.format === EventFormat.Team && eventData.teams) {
            const originalTeams = eventData.teams || [];
            const newTeams: Team[] = [];

            for (const team of originalTeams) {
                const originalMemberCount = team.members.length;
                const filteredMembers = team.members.filter(m => m !== studentId);
                
                if (filteredMembers.length < originalMemberCount) {
                    userFoundAndRemoved = true;
                    team.members = filteredMembers;
                    if (team.teamLead === studentId) {
                        team.teamLead = team.members.length > 0 ? team.members[0] : '';
                    }
                }
                // Keep the team if it still has members after potential removal
                if (team.members.length > 0) {
                    newTeams.push(team);
                }
            }

            if (userFoundAndRemoved) {
                updates.teams = newTeams; // This will replace the entire teams array
                // Update flat list only if teams were modified
                updates.teamMemberFlatList = [...new Set(newTeams.flatMap(team => team.members).filter(Boolean))];
            } else {
                 console.warn(`Student ${studentId} not found in any team for team event ${eventId}.`);
            }
        }

        if (!userFoundAndRemoved) {
            // This error will be thrown if the student was not found in participants (for non-team) 
            // or in any team (for team events).
            throw new Error('You are not currently registered as a participant or team member in this event.');
        }

        await updateDoc(eventRef, updates as any);
    } catch (error: any) {
        // Ensure a clear error message is thrown for the store to handle
        throw new Error(error.message || `Failed to leave event ${eventId}.`);
    }
}

/**
 * Allows a student to request to join an existing team in an event.
 * Assumes automatic join if team is not full (MAX_TEAM_MEMBERS = 5).
 * @param eventId - The ID of the event.
 * @param studentId - The UID of the student requesting to join.
 * @param targetTeamName - The name of the team the student wants to join.
 */
export async function requestToJoinTeamInFirestore(
    eventId: string,
    studentId: string,
    targetTeamName: string
): Promise<void> { // Removed erroneous "=>"
    if (!eventId || !studentId || !targetTeamName.trim()) throw new Error('Event ID, Student ID, and Target Team Name are required.');

    const eventRef = doc(db, EVENTS_COLLECTION, eventId);
    const MAX_TEAM_MEMBERS = 5; // Example limit, can be made configurable per event if needed.

    try {
        const eventSnap = await getDoc(eventRef);
        if (!eventSnap.exists()) throw new Error('Event not found.');
        const eventData = mapFirestoreToEventData(eventSnap.id, eventSnap.data());
        if (!eventData) throw new Error('Failed to map event data.');

        if (eventData.details.format !== EventFormat.Team) throw new Error("This action is only for team events.");
        if (![EventStatus.Approved, EventStatus.InProgress].includes(eventData.status as EventStatus)) {
             throw new Error("Can only join teams for Approved or InProgress events.");
        }
        if (eventData.teams?.some(t => t.members.includes(studentId))) {
            // Consider if this should be an error or a silent success if already in a team.
            // For now, treating as an error to prevent joining multiple teams.
            throw new Error("You are already in a team for this event.");
        }

        const teams = deepClone(eventData.teams || []);
        const teamIndex = teams.findIndex(t => t.teamName.toLowerCase() === targetTeamName.trim().toLowerCase());

        if (teamIndex === -1) throw new Error(`Team "${targetTeamName.trim()}" not found.`);
        const targetTeam = teams[teamIndex];
        if (!targetTeam) throw new Error("Team data is corrupted.");
        
        if (targetTeam.members.length >= MAX_TEAM_MEMBERS) throw new Error(`Team "${targetTeamName.trim()}" is full.`);
        if (targetTeam.members.includes(studentId)) {
             // This case should be caught by the earlier check (eventData.teams?.some(...))
             // but adding belt-and-suspenders here within the cloned `teams` array manipulation.
             throw new Error(`You are already a member of team "${targetTeamName.trim()}".`);
        }

        targetTeam.members.push(studentId);
        const newTeamMemberFlatList = [...new Set(teams.flatMap(team => team.members).filter(Boolean))];

        await updateDoc(eventRef, {
            teams: teams,
            teamMemberFlatList: newTeamMemberFlatList,
            lastUpdatedAt: serverTimestamp()
        });
    } catch (error: any) {
        // Ensure a clear error message is thrown for the store to handle
        throw new Error(error.message || `Failed to join team "${targetTeamName.trim()}".`);
    }
}

/**
 * Allows a student to leave their current team in an event.
 * @param eventId - The ID of the event.
 * @param studentId - The UID of the student leaving.
 */
export async function leaveMyTeamInFirestore(eventId: string, studentId: string): Promise<void> {
     if (!eventId || !studentId ) throw new Error('Event ID and Student ID are required.');

    const eventRef = doc(db, EVENTS_COLLECTION, eventId);
    try {
        const eventSnap = await getDoc(eventRef);
        if (!eventSnap.exists()) throw new Error('Event not found.');
        const eventData = mapFirestoreToEventData(eventSnap.id, eventSnap.data());
        if (!eventData) throw new Error('Failed to map event data.');

        if (eventData.details.format !== EventFormat.Team) throw new Error("This action is only for team events.");
        if (![EventStatus.Approved, EventStatus.InProgress].includes(eventData.status as EventStatus)) {
            throw new Error("Can only leave teams for Approved or InProgress events.");
        }
        // Consider adding checks: e.g., cannot leave if event is too close to starting, or if submissions have begun.

        const teams = deepClone(eventData.teams || []);
        let teamModified = false;
        let studentFoundInTeam = false;
        const studentTeamIndex = teams.findIndex(t => t.members.includes(studentId));

        if (studentTeamIndex === -1) throw new Error("You are not currently in any team for this event.");
        
        studentFoundInTeam = true;
        const teamToLeave = teams[studentTeamIndex];
        if (!teamToLeave) throw new Error("Team data is corrupted.");
        
        const originalMemberCount = teamToLeave.members.length;
        teamToLeave.members = teamToLeave.members.filter(m => m !== studentId);

        if (teamToLeave.members.length < originalMemberCount) {
            teamModified = true;
            if (teamToLeave.teamLead === studentId) {
                teamToLeave.teamLead = teamToLeave.members.length > 0 ? teamToLeave.members[0] : '';
            }
        }

        // Filter out teams that become empty after the student leaves
        const updatedTeams = teams.filter(t => t.members.length > 0);
        const newTeamMemberFlatList = [...new Set(updatedTeams.flatMap(team => team.members).filter(Boolean))];

        if (!studentFoundInTeam) {
             // This should ideally be caught by the studentTeamIndex check above.
            throw new Error("You were not found in any team for this event.");
        }
        if (!teamModified && studentFoundInTeam){
            // This means student was found, but for some reason filter didn't remove them - should not happen.
            // Or, if the intent is to throw if they were not in a team initially, the above check is better.
            // For now, if they were found but not removed (which is unlikely with current logic), still proceed to update.
            // Let's assume teamModified flag is the source of truth for whether an update is needed after changes.
            console.warn(`Student ${studentId} was found in team but removal logic did not change members list.`);
            // No updateDoc will be called if !teamModified.
        }

        if (teamModified) { 
            await updateDoc(eventRef, {
                teams: updatedTeams,
                teamMemberFlatList: newTeamMemberFlatList,
                lastUpdatedAt: serverTimestamp()
            });
        } else if (studentFoundInTeam && !teamModified) {
            // Student was in a team, but no modification occurred (e.g. trying to leave a team they are not in - caught earlier)
            // This path implies an issue or that no actual change was needed. For safety, don't update.
            // The initial `studentTeamIndex === -1` check should handle cases where student isn't in any team.
            console.warn("Team modification was indicated, but no changes made to Firestore.");
        }

    } catch (error: any) {
        console.error(`Firestore leaveMyTeam error for ${eventId}:`, error);
        throw new Error(error.message || 'Failed to leave team.');
    }
}

/**
 * Adds a new team to an event in Firestore.
 * @param eventId - The ID of the event.
 * @param teamName - The name for the new team.
 * @param members - Optional array of student UIDs to add as initial members.
 * @param teamLead - Optional UID of the team lead. If not provided and members exist, first member becomes lead.
 * @returns Promise<Team> - The newly created team object.
 */
export async function addTeamToEventInFirestore(
    eventId: string,
    teamName: string,
    members: string[] = [],
    teamLead?: string
): Promise<Team> {
    if (!eventId || !teamName.trim()) throw new Error("Event ID and a valid team name are required.");

    const eventRef = doc(db, EVENTS_COLLECTION, eventId);
    try {
        const eventSnap = await getDoc(eventRef);
        if (!eventSnap.exists()) throw new Error("Event not found.");
        const eventData = mapFirestoreToEventData(eventSnap.id, eventSnap.data());
        if (!eventData) throw new Error('Failed to map event data.');

        if (eventData.details.format !== EventFormat.Team) throw new Error("Teams can only be added to 'Team' format events.");
        if (eventData.teams?.some(t => t.teamName.toLowerCase() === teamName.trim().toLowerCase())) {
            throw new Error(`A team with the name "${teamName.trim()}" already exists in this event.`);
        }

        const newTeam: Team = {
            id: `team_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, // Generate unique ID
            teamName: teamName.trim(),
            members: Array.isArray(members) ? [...new Set(members)] : [],
            teamLead: teamLead || (members && members.length > 0 ? members[0] : '')
        };

        const updatedTeams = [...(eventData.teams || []), newTeam];
        const newTeamMemberFlatList = [...new Set(updatedTeams.flatMap(team => team.members).filter(Boolean))];

        await updateDoc(eventRef, {
            teams: updatedTeams,
            teamMemberFlatList: newTeamMemberFlatList,
            lastUpdatedAt: serverTimestamp()
        });
        return newTeam;
    } catch (error: any) {
        throw new Error(error.message || `Failed to add team "${teamName.trim()}" to event ${eventId}.`);
    }
}

/**
 * Updates the entire list of teams for an event in Firestore.
 * @param eventId - The ID of the event.
 * @param teams - The new array of Team objects.
 * @returns Promise<Team[]> - The updated array of teams.
 */
export async function updateEventTeamsInFirestore(eventId: string, teams: Team[]): Promise<Team[]> {
    if (!eventId) throw new Error("Event ID is required.");
    if (!Array.isArray(teams)) throw new Error("Teams must be an array.");
    // Consider adding more validation for each team object in the array (e.g. unique names, valid members).

    const eventRef = doc(db, EVENTS_COLLECTION, eventId);
    try {
        const eventSnap = await getDoc(eventRef); // Fetch to ensure event exists and is a team event.
        if (!eventSnap.exists()) throw new Error("Event not found.");
        const eventData = mapFirestoreToEventData(eventSnap.id, eventSnap.data());
        if (!eventData) throw new Error('Failed to map event data.');
        if (eventData.details.format !== EventFormat.Team) {
            throw new Error("Can only update teams for 'Team' format events.");
        }

        const newTeamMemberFlatList = [...new Set(teams.flatMap(team => team.members).filter(Boolean))];

        await updateDoc(eventRef, {
            teams: teams, // Replace the entire teams array
            teamMemberFlatList: newTeamMemberFlatList,
            lastUpdatedAt: serverTimestamp()
        });
        return teams;
    } catch (error: any) {
        throw new Error(error.message || `Failed to update teams for event ${eventId}.`);
    }
}

/**
 * Auto-generates teams for an event by distributing a list of students among pre-defined team shells.
 * @param eventId - The ID of the event.
 * @param students - Array of student objects (must have a 'uid' property).
 * @param minMembersPerTeam - Minimum members required for a team to be considered valid after distribution.
 * @param maxMembersPerTeam - Maximum members a team can have.
 * @returns Promise<Team[]> - The array of generated teams.
 */
export async function autoGenerateEventTeamsInFirestore(
  eventId: string,
  students: Array<{ uid: string; [key: string]: any }>, 
  minMembersPerTeam: number = 2,
  maxMembersPerTeam: number = 8
): Promise<Team[]> {
  if (!eventId) throw new Error("Event ID is required.");
  if (!Array.isArray(students)) throw new Error("Students input must be an array.");
  if (minMembersPerTeam <= 0) throw new Error("Minimum members per team must be positive.");
  if (maxMembersPerTeam < minMembersPerTeam) throw new Error("Maximum members per team cannot be less than minimum.");

  const eventRef = doc(db, EVENTS_COLLECTION, eventId);
  try {
    const eventSnapshot = await getDoc(eventRef);
    if (!eventSnapshot.exists()) throw new Error("Event not found.");
    
    const eventData = mapFirestoreToEventData(eventSnapshot.id, eventSnapshot.data());
    if (!eventData) throw new Error('Failed to map event data.');

    if (eventData.details.format !== EventFormat.Team) {
      throw new Error("Auto-generation of teams is only applicable to 'Team' format events.");
    }
    if (!eventData.teams || eventData.teams.length === 0) { 
      throw new Error("Auto-generation requires at least one team shell (name) to be pre-defined in the event details.");
    }
    
    const numberOfTeamShells = eventData.teams.length;
    // Check if enough students for the defined shells and min members criteria
    if (students.length < numberOfTeamShells * minMembersPerTeam && students.length < minMembersPerTeam) {
        let errorMsg = `Not enough students (${students.length}) available. `; 
        if (numberOfTeamShells === 1) {
            errorMsg += `At least ${minMembersPerTeam} are required to populate the defined team shell.`;
        } else {
            errorMsg += `At least ${numberOfTeamShells * minMembersPerTeam} are required to populate ${numberOfTeamShells} teams with ${minMembersPerTeam} members each.`;
        }
        throw new Error(errorMsg);
    }

    // Initialize teams to populate based on existing team shells (names only, members will be new)
    const teamsToPopulate: Team[] = eventData.teams.map(shell => ({
      id: shell.id || `team_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      teamName: shell.teamName, // Use the predefined name
      members: [],
      teamLead: '',
    }));
    
    const validStudents = students.filter(s => s && typeof s.uid === 'string');
    if (validStudents.length === 0 && students.length > 0) throw new Error ("No valid student UIDs provided for team generation.");
    if (validStudents.length < students.length) console.warn("Some invalid student entries were excluded from team generation.");

    const shuffledStudents = [...validStudents].sort(() => 0.5 - Math.random());
    
    // Distribute students into the prepared team shells
    shuffledStudents.forEach((student, idx) => {
      teamsToPopulate[idx % numberOfTeamShells].members.push(student.uid);
    });
    
    // Finalize teams: filter out underpopulated, cap size, assign lead
    const finalTeams = teamsToPopulate
      .map(team => { // First, cap members and assign lead before filtering
        const currentMembers = team.members.slice(0, maxMembersPerTeam);
        const newTeamLead = currentMembers.length > 0 ? currentMembers[0] : '';
        return { ...team, members: currentMembers, teamLead: newTeamLead };
      })
      .filter(team => team.members.length >= minMembersPerTeam); // Then filter by min members
    
    if (finalTeams.length === 0 && numberOfTeamShells > 0 && validStudents.length >= minMembersPerTeam) {
        throw new Error("Could not form any valid teams meeting the minimum member criteria after distribution. Adjust student count or team size settings.");
    }
    // If numberOfTeamShells was 0, finalTeams will be 0, which is fine (caught by earlier check).
    // If finalTeams.length < numberOfTeamShells, it means some shells couldn't be filled to min capacity, which is also possible.

    const newTeamMemberFlatList = [...new Set(finalTeams.flatMap(team => team.members).filter(Boolean))];

    await updateDoc(eventRef, {
      teams: finalTeams,
      teamMemberFlatList: newTeamMemberFlatList,
      lastUpdatedAt: serverTimestamp()
    });
    
    return finalTeams;
  } catch (error: any) {
    console.error(`Error auto-generating teams for event ${eventId}:`, error);
    throw new Error(error.message || `Failed to auto-generate teams for event ${eventId}.`);
  }
}

/**
 * Submits a user's vote/selection for team event criteria in Firestore.
 * @param eventId - The ID of the event.
 * @param userId - The UID of the student submitting votes.
 * @param votes - Object containing criteria votes and/or best performer.
 */
export async function submitTeamCriteriaVoteInFirestore(
    eventId: string,
    userId: string,
    votes: { criteria: Record<string, string>; bestPerformer?: string }
): Promise<void> {
    if (!eventId || !userId) throw new Error("Event ID and User ID are required.");
    if (!votes || typeof votes.criteria !== 'object' || isEmpty(votes.criteria)) {
        throw new Error("Criteria votes are required and cannot be empty.");
    }

    const eventRef = doc(db, EVENTS_COLLECTION, eventId);
    try {
        await runTransaction(db, async (transaction: Transaction) => { // Explicitly type transaction
            const eventSnap = await transaction.get(eventRef);
            if (!eventSnap.exists()) throw new Error('Event not found in transaction.');
            
            const currentEventData = mapFirestoreToEventData(eventSnap.id, eventSnap.data());
            if (!currentEventData) throw new Error('Failed to map event data in transaction.');

            if (currentEventData.status !== EventStatus.Completed && currentEventData.status !== EventStatus.InProgress) {
                throw new Error("Voting is only allowed for 'Completed' or 'In Progress' events.");
            }
            if (!currentEventData.votingOpen) throw new Error("Voting is currently closed for this event.");
            if (currentEventData.details.format !== EventFormat.Team) throw new Error("Team criteria voting only for team events.");
            if (!currentEventData.participants?.includes(userId) && 
                !currentEventData.teamMemberFlatList?.includes(userId)) {
                throw new Error("Only event participants or team members can vote.");
            }

            let updatedCriteria = deepClone(currentEventData.criteria || []);
            
            Object.entries(votes.criteria).forEach(([constraintKey, selectedTeamName]) => {
                const constraintIndex = parseInt(constraintKey.replace('constraint', ''));
                if (isNaN(constraintIndex)) {
                    console.warn(`Could not parse a valid index from key: ${constraintKey}. Vote not recorded.`);
                    return; // Skip this entry
                }

                const criterionIndex = updatedCriteria.findIndex(c => 
                    typeof c.constraintIndex === 'number' && c.constraintIndex === constraintIndex
                );
                
                if (criterionIndex !== -1) {
                    if (!updatedCriteria[criterionIndex].votes || typeof updatedCriteria[criterionIndex].votes !== 'object') {
                        updatedCriteria[criterionIndex].votes = {};
                    }
                    updatedCriteria[criterionIndex].votes![userId] = selectedTeamName;
                } else {
                    console.warn(`Criterion with constraintIndex ${constraintIndex} not found for event ${eventId}. Vote not recorded.`);
                }
            });

            const updateData: any = {
                criteria: updatedCriteria,
                lastUpdatedAt: serverTimestamp()
            };

            if (votes.bestPerformer) {
                const currentBestPerformerSelections = currentEventData.bestPerformerSelections || {};
                updateData.bestPerformerSelections = {
                    ...currentBestPerformerSelections,
                    [userId]: votes.bestPerformer
                };
            }
            transaction.update(eventRef, updateData);
        });
    } catch (error: any) {
        throw new Error(error.message || `Failed to submit team criteria vote for event ${eventId}.`);
    }
}

/**
 * Submits a user's vote for an individual winner in Firestore.
 * @param eventId - The ID of the event.
 * @param userId - The UID of the user submitting the vote.
 * @param selectedWinnerId - The UID of the user selected as the winner.
 */
export async function submitIndividualWinnerVoteInFirestore(
    eventId: string,
    userId: string,
    selectedWinnerId: string 
): Promise<void> {
    await runTransaction(db, async (transaction) => {
        const eventRef = doc(db, 'events', eventId);
        const eventSnap = await transaction.get(eventRef);
        if (!eventSnap.exists()) {
            throw new Error(`Event with ID ${eventId} not found.`);
        }
        
        const eventData = mapFirestoreToEventData(eventSnap.id, eventSnap.data());
        if (!eventData) {
          throw new Error('Could not map event data');
        }

        // Basic validation
        if (eventData.status !== EventStatus.Completed) {
            throw new Error('Voting is only allowed for completed events.');
        }

        const participantIds = (eventData.participants || []).map((p: any) => typeof p === 'string' ? p : p.uid);
        if (!participantIds.includes(userId)) {
            throw new Error("You are not a participant in this event.");
        }

        // This function is now simplified and assumes the store has prepared the correct payload
        // The logic for updating a specific winner based on criteria index is now handled in the store
        // or a more specific service function if needed.
        transaction.update(eventRef, {
            // A field for winners could be structured like: winners: { [criterionId]: winnerId }
            // For now, this is a placeholder for a more complex implementation if needed.
            [`winners.${userId}`]: selectedWinnerId, // Example of how to record one vote per user
            lastUpdatedAt: serverTimestamp()
        });
    });
}

/**
 * Records an organizer rating for an event using a Map structure.
 * @param payload - The data for the rating submission.
 * @param payload.eventId - The ID of the event to rate.
 * @param payload.userId - The ID of the user submitting the rating.
 * @param payload.score - The rating score (e.g., 1-5).
 * @param payload.feedback - Optional feedback comment.
 * @returns A promise that resolves when the transaction is complete.
 */
export async function submitOrganizationRatingInFirestore(payload: {
    eventId: string;
    userId: string;
    score: number;
    feedback?: string | null;
}): Promise<void> {
    const { eventId, userId, score, feedback } = payload;
    if (!eventId || !userId) throw new Error("Event ID and User ID are required.");
    if (score < 1 || score > 5) throw new Error("Rating score must be between 1 and 5.");

    const eventRef = doc(db, EVENTS_COLLECTION, eventId);

    try {
        await runTransaction(db, async (transaction) => {
            const eventSnap = await transaction.get(eventRef);
            if (!eventSnap.exists()) throw new Error("Event not found.");
            
            const eventData = eventSnap.data();
            if (eventData.status !== EventStatus.Completed) {
                throw new Error("You can only rate organizers for completed events.");
            }

            const isParticipant = (eventData.participants || []).includes(userId) || 
                                  (eventData.teamMemberFlatList || []).includes(userId);

            if (!isParticipant) {
                throw new Error("Only event participants can rate organizers.");
            }

            // Prepare the new rating object
            const newRating: OrganizerRating = {
                userId: userId,
                rating: score,
                ratedAt: serverTimestamp() as any, // Let Firestore set the timestamp
            };
            if (feedback) {
                newRating.feedback = feedback;
            }

            // Overwrite the organizerRatings field with the updated map
            transaction.update(eventRef, {
                [`organizerRatings.${userId}`]: newRating,
                lastUpdatedAt: serverTimestamp()
            });
        });
    } catch (error: any) {
        console.error(`Error submitting rating for event ${eventId}:`, error);
        throw new Error(error.message || 'Failed to submit rating.');
    }
}

/**
 * Toggles the voting status (open/closed) for an event.
 * @param eventId - The ID of the event.
 * @param open - Boolean indicating whether to open (true) or close (false) voting.
 * @param currentUser - The user performing the action (for permission checks).
 */
export async function toggleVotingStatusInFirestore(eventId: string, open: boolean, currentUser: EnrichedStudentData | UserData | null): Promise<void> {
    if (!currentUser) throw new Error("Authentication required to change voting status.");
    if (!eventId) throw new Error("Event ID is required.");
    if (!currentUser?.uid) throw new Error("User performing action is required for permission check.");

    const eventRef = doc(db, EVENTS_COLLECTION, eventId);
    try {
        await runTransaction(db, async (transaction: Transaction) => {
            const eventSnap = await transaction.get(eventRef);
            if (!eventSnap.exists()) throw new Error("Event not found.");
            const eventData = mapFirestoreToEventData(eventSnap.id, eventSnap.data());
            if (!eventData) throw new Error("Failed to map event data.");

            // currentUser is non-null here due to the check above.
            const isOrganizer = eventData.details.organizers.includes(currentUser!.uid);

            if (!isOrganizer) {
                throw new Error("Permission denied. Only event organizers or admins can toggle voting status.");
            }

            // If opening voting, ensure event is not Closed or Cancelled first.
            if (open === true && (eventData.status === EventStatus.Closed || eventData.status === EventStatus.Cancelled)) {
                throw new Error(`Cannot open voting for an event that is already ${eventData.status}.`);
            }

            // General restriction for toggling: only for In Progress or Completed events.
            if (eventData.status !== EventStatus.InProgress && eventData.status !== EventStatus.Completed) {
                throw new Error(`Voting can only be toggled for 'In Progress' or 'Completed' events. Current status: ${eventData.status}`);
            }

            // If closing voting, and event is InProgress, consider changing status to Completed.
            let statusUpdate = {};
            if (open === false && eventData.status === EventStatus.InProgress) {
                console.warn(`Voting closed for event ${eventId} while it was 'In Progress'. Consider updating event status to 'Completed'.`);
                // Optionally, auto-update status to Completed here if that's the desired workflow.
                // statusUpdate = { status: EventStatus.Completed }; // Example
            }
            
            transaction.update(eventRef, {
                votingOpen: open,
                lastUpdatedAt: serverTimestamp(),
                ...statusUpdate
            });
        });
        // Placeholder for notification
        // invokePushNotification({ type: open ? 'voting_opened' : 'voting_closed', eventId, eventName: eventData.details.eventName });
    } catch (error: any) {
        throw new Error(error.message || `Failed to toggle voting status for event ${eventId}.`);
    }
}

/**
 * Calculates winners from votes.
 * This version handles both criteria-based voting (teams) and best performer selections.
 * @param eventId - The ID of the event.
 * @returns A record where keys are criteria titles (or BEST_PERFORMER_LABEL) and values are winner IDs/names.
 */
export async function calculateWinnersFromVotes(eventId: string): Promise<Record<string, string | string[]>> {
    if (!eventId) throw new Error("Event ID is required.");

    const eventRef = doc(db, EVENTS_COLLECTION, eventId);
    const eventSnap = await getDoc(eventRef);
    if (!eventSnap.exists()) throw new Error("Event not found for calculating winners.");

    const eventData = mapFirestoreToEventData(eventSnap.id, eventSnap.data());
    if (!eventData) {
        throw new Error("Failed to map event data for calculating winners.");
    }

    const winners: Record<string, string | string[]> = {};

    // Calculate winners from criteria votes
    if (eventData.criteria && Array.isArray(eventData.criteria)) {
        eventData.criteria.forEach((criterion: EventCriteria) => {
            if (criterion.votes && !isEmpty(criterion.votes)) {
                               const voteCounts: Record<string, number> = {};
                Object.values(criterion.votes).forEach((selectedEntityId: string) => {
                    voteCounts[selectedEntityId] = (voteCounts[selectedEntityId] || 0) + 1;
                });

                if (!isEmpty(voteCounts)) {
                    const maxVotes = Math.max(...Object.values(voteCounts));
                    const criterionWinners = Object.keys(voteCounts).filter(id => voteCounts[id] === maxVotes);
                    
                    // If criterion.title is undefined or empty, use a generic key or index
                    const criterionKey = criterion.title?.trim() || `criterion_${criterion.constraintIndex || 'unknown'}`;
                    const winnerValue = criterionWinners.length === 1 ? criterionWinners[0] : criterionWinners;
                    if (winnerValue) {
                        winners[criterionKey] = winnerValue;
                    }
                }
            }
        });
    }

    // Calculate winner from bestPerformerSelections (can be for individual or overall best performer in team events)
    if (eventData.bestPerformerSelections && !isEmpty(eventData.bestPerformerSelections)) {
        const bestPerformerVoteCounts: Record<string, number> = {};
        Object.values(eventData.bestPerformerSelections).forEach((selectedUserId: string) => {
            bestPerformerVoteCounts[selectedUserId] = (bestPerformerVoteCounts[selectedUserId] || 0) + 1;
        });

        if (!isEmpty(bestPerformerVoteCounts)) {
            const maxVotes = Math.max(...Object.values(bestPerformerVoteCounts));
            const bestPerformers = Object.keys(bestPerformerVoteCounts).filter(id => bestPerformerVoteCounts[id] === maxVotes);
            const bestPerformerValue = bestPerformers.length === 1 ? bestPerformers[0] : bestPerformers;
            if (bestPerformerValue) {
                winners[BEST_PERFORMER_LABEL] = bestPerformerValue;
            }
        }
    }
    return winners;
}

/**
 * Saves calculated or manually selected winners to Firestore.
 * @param eventId - The ID of the event.
 * @param winners - A record of winners (criterion/label -> winnerId(s)).
 * @param manuallySelectedBy - UID of the organizer if manually selected.
 */
export async function saveWinnersToFirestore(
    eventId: string, 
    winners: Record<string, string | string[]>): Promise<void> {
    if (!eventId) throw new Error("Event ID required.");
    if (isEmpty(winners)) {
        // console.warn(`No winners data provided to save for event ${eventId}. Skipping update.`);
        // return; // Or throw error if winners are expected
        throw new Error("Winners data cannot be empty when attempting to save.");
    }

    const eventRef = doc(db, EVENTS_COLLECTION, eventId);
    const updatePayload: any = {
       
    }

    try {
        await updateDoc(eventRef, updatePayload);
    } catch (error: any) {
        throw new Error(error.message || `Failed to save winners for event ${eventId}.`);
    }
}


/**
 * Allows an organizer to manually select/override winners for an event.
 * @param eventId - The ID of the event.
 * @param userId - The UID of the organizer performing the action.
 * @param votes - Record where key is criterion title or BEST_PERFORMER_LABEL, value is the selected winner's ID (string). Assumes single winner per category for manual override.
 */
export async function submitManualWinnerSelectionInFirestore(
    eventId: string,
    userId: string, 
    votes: Record<string, string> 
): Promise<void> {

    const eventRef = doc(db, EVENTS_COLLECTION, eventId);
    try {
        await runTransaction(db, async (transaction: Transaction) => {
            const eventSnap = await transaction.get(eventRef);
            if (!eventSnap.exists()) throw new Error('Event not found.');
            const eventData = mapFirestoreToEventData(eventSnap.id, eventSnap.data());
            if (!eventData) throw new Error('Failed to map event data.');

            const isOrganizer = eventData.details.organizers.includes(userId);
            // const isAdmin = (currentUser as EnrichedStudentData).isAdmin; // currentUser not passed, rely on isOrganizer
            if (!isOrganizer) throw new Error("Permission denied. Only event organizers or admins can manually select winners.");

            // Validate that selected entities (teams/users) are valid for the event context if possible
            // This might involve checking against eventData.teams, eventData.participants etc.
            // For simplicity, this example assumes votes are valid UIDs/team names.

            // The `winners` field will store this manual selection.
            // `calculateWinnersFromVotes` might produce arrays for ties, but manual selection implies single winner.
            const newWinnersData: Record<string, string> = {};
            for (const key in votes) { 
                newWinnersData[key] = votes[key]; 
            }
            if (Object.keys(newWinnersData).length === 0 && Object.keys(votes).length > 0) { 
                throw new Error("Failed to populate winners data from selections."); 
            }


            transaction.update(eventRef, {
                winners: newWinnersData,
                manuallySelectedBy: userId,
                lastUpdatedAt: serverTimestamp()
            });
        });
    } catch (error: any) {
        throw new Error(error.message || `Failed to submit manual winner selection for event ${eventId}.`);
    }
}

// --- Potentially internal helper functions or less frequently used actions ---
// These were also in actions.voting.ts. Review if they are directly used by store or are helpers.

/**
 * (Helper/Alternative) Records an organizer rating for an event in Firestore.
 * This is similar to submitOrganizationRatingInFirestore but might have been intended for a different flow or as a helper.
 * @param eventId - The ID of the event.
 * @param userId - The UID of the user submitting the rating.
 * @param ratingData - The rating data { score: number; feedback?: string }.
 */
export async function recordOrganizerRatingInFirestore(
    eventId: string,
    userId: string, // Could be student or any user context allows
    ratingData: { score: number; feedback?: string }
): Promise<void> {
    if (!eventId || !userId) throw new Error("Event ID and User ID are required.");
    if (!ratingData || typeof ratingData.score !== 'number' || ratingData.score < 1 || ratingData.score > 5) {
        throw new Error("Valid rating score (1-5) is required.");
    }
    // This function is very similar to submitOrganizationRatingInFirestore.
    // Consolidate or ensure distinct purpose. For now, keeping it as moved.
    // It lacks the specific permission/state checks of submitOrganizationRatingInFirestore.
    const eventRef = doc(db, EVENTS_COLLECTION, eventId);
    const newRating: OrganizerRating = {
        userId: userId,
        rating: ratingData.score,
        feedback: ratingData.feedback || undefined,
        ratedAt: serverTimestamp() as any, // Corrected: Cast to any
    };
    try {
        // Using arrayUnion to add; if user can rate multiple times, this is fine.
        // If only one rating per user, runTransaction with read-modify-write (like submitOrganizationRatingInFirestore) is better.
        // For now, assuming arrayUnion is the intended behavior if this is a distinct function.
        await updateDoc(eventRef, {
            organizerRatings: arrayUnion(newRating),
            lastUpdatedAt: serverTimestamp()
        });
    } catch (error: any) {
        throw new Error(error.message || `Failed to record organizer rating for event ${eventId}.`);
    }
}

/**
 * (Helper) Submits a vote for a single criterion.
 * @param eventId - The ID of the event.
 * @param userId - The UID of the user submitting the vote.
 * @param criteriaConstraintKey - The unique key or constraintIndex of the criterion.
 * @param selectedValue - The ID of the team/entity selected for this criterion.
 */
export async function castVoteInFirestore(
    eventId: string,
    userId: string,
    criteriaConstraintKey: string, // This needs to map to criterion.constraintIndex or a unique title
    selectedValue: string
): Promise<void> {
    if (!eventId || !userId || !criteriaConstraintKey || !selectedValue) {
        throw new Error("All parameters are required for casting a vote.");
    }
    const eventRef = doc(db, EVENTS_COLLECTION, eventId);
    try {
        await runTransaction(db, async (transaction: Transaction) => {
            const eventSnap = await transaction.get(eventRef);
            if (!eventSnap.exists()) throw new Error("Event not found.");
            const eventData = mapFirestoreToEventData(eventSnap.id, eventSnap.data());
            if (!eventData) throw new Error("Failed to map event data.");

            // Basic validation (can be expanded based on event state, votingOpen etc.)
            if (eventData.details.format !== EventFormat.Team) throw new Error("Criteria voting is for team events.");

            const criteria = deepClone(eventData.criteria || []);
            // Attempt to find by constraintIndex first, then by title as fallback
            let targetCriterionIndex = criteria.findIndex(c => 
                (typeof c.constraintIndex === 'number' && c.constraintIndex.toString() === criteriaConstraintKey) ||
                (c.title && c.title.trim().toLowerCase() === criteriaConstraintKey.trim().toLowerCase())
            );

            if (targetCriterionIndex === -1) {
                throw new Error(`Criterion with key/title "${criteriaConstraintKey}" not found for event ${eventId}.`);
            }

            if (!criteria[targetCriterionIndex].votes || typeof criteria[targetCriterionIndex].votes !== 'object') {
                criteria[targetCriterionIndex].votes = {};
            }
            criteria[targetCriterionIndex].votes![userId] = selectedValue;

            transaction.update(eventRef, {
                criteria: criteria,
                lastUpdatedAt: serverTimestamp()
            });
        });
    } catch (error: any) {
        throw new Error(error.message || `Failed to cast vote for criterion "${criteriaConstraintKey}" in event ${eventId}.`);
    }
}


/**
 * (Helper) Submits a selection for the best performer.
 * @param eventId - The ID of the event.
 * @param userId - The UID of the user making the selection.
 * @param selectedUserId - The UID of the user selected as best performer.
 */
export async function selectBestPerformerInFirestore(
    eventId: string,
    userId: string,
    selectedUserId: string
): Promise<void> {
    if (!eventId || !userId || !selectedUserId) {
        throw new Error("All parameters are required for selecting best performer.");
    }
    const eventRef = doc(db, EVENTS_COLLECTION, eventId);
    try {
        // Basic update, assumes event state/permissions are checked by caller or are not restrictive
        const fieldPath = `bestPerformerSelections.${userId}`;
        await updateDoc(eventRef, {
            [fieldPath]: selectedUserId,
            lastUpdatedAt: serverTimestamp()
        });
    } catch (error: any) {
        throw new Error(error.message || `Failed to select best performer for event ${eventId}.`);
    }
}


/**
 * Finalizes winners for an event, typically called by an organizer/admin.
 * This might involve calculating from votes if not already done, or could be a simple state transition.
 * The version in actions.voting.ts was complex and included XP calculation placeholders.
 * This simplified version focuses on ensuring winners are set and event state reflects finalization.
 * @param eventId - The ID of the event.
 * @param currentUser - The user performing the action (for permission checks).
 * @returns Promise<Record<string, string | string[]>> - The determined winners.
 */
export async function finalizeWinnersInFirestore(
    eventId: string, 
    currentUser: EnrichedStudentData | UserData | null
): Promise<Record<string, string | string[]>> {
    if (!eventId) throw new Error("Event ID required.");
    if (!currentUser?.uid) throw new Error("User performing action is required for permission check.");

    const eventRef = doc(db, EVENTS_COLLECTION, eventId);
    let finalWinners: Record<string, string | string[]> = {};

    try {
        await runTransaction(db, async (transaction: Transaction) => {
            const eventSnap = await transaction.get(eventRef);
            if (!eventSnap.exists()) throw new Error("Event not found.");
            const eventData = mapFirestoreToEventData(eventSnap.id, eventSnap.data());
            if (!eventData) throw new Error("Failed to map event data.");

            const isOrganizer = eventData.details.organizers.includes(currentUser.uid);
            if (!isOrganizer ) {
                throw new Error("Permission denied. Only event organizers or admins can finalize winners.");
            }

            if (eventData.status !== EventStatus.Completed) {
                throw new Error("Winners can only be finalized for 'Completed' events.");
            }
            if (eventData.votingOpen === true) {
                // It's generally expected that voting is closed before finalization.
                // Consider throwing an error or automatically closing voting here.
                // For now, let's throw an error to enforce the sequence.
                throw new Error("Voting must be closed before finalizing winners. Please close voting first.");
            }

            if (!isEmpty(eventData.winners)) {
                finalWinners = eventData.winners!; // Use already saved winners if they exist
                console.log(`Using pre-existing winners for event ${eventId}.`);
            } else {
                // If winners are not already set (e.g., by manual selection or prior calculation), calculate them now.
                console.log(`No pre-existing winners found for event ${eventId}. Attempting to calculate from votes...`);
                finalWinners = await calculateWinnersFromVotes(eventId); // Calls the service function
                if (isEmpty(finalWinners)) {
                    throw new Error("No winners could be determined from votes. Manual selection might be required.");
                }
            }
            
            // Update the event with the determined winners and potentially other finalization flags
            const updatePayload: any = {
                winners: finalWinners, // Ensure winners are saved
                // votingOpen: false, // Ensure voting is marked closed if not already (belt-and-suspenders)
                lastUpdatedAt: serverTimestamp()
            };
            if (eventData.manuallySelectedBy) { // Preserve who manually selected if that was the case
                updatePayload.manuallySelectedBy = eventData.manuallySelectedBy;
            } else if (!isEmpty(finalWinners) && !eventData.manuallySelectedBy){ // If calculated and not manual, ensure manuallySelectedBy is not set or cleared
                 updatePayload.manuallySelectedBy = deleteField(); // Or null
            }


            transaction.update(eventRef, updatePayload);
        });
        
        // Placeholder for notification
        // invokePushNotification({ type: 'winners_finalized', eventId, eventName: eventData.details.eventName }); // eventData not in scope here
        
        return finalWinners;

    } catch (error: any) {
        throw new Error(error.message || `Failed to finalize winners for event ${eventId}.`);
    }
}

/**
 * Checks if a student already has an active (Pending) event request.
 * @param studentId - The UID of the student to check.
 * @returns Promise<boolean> - True if an active request exists, false otherwise.
 */
export async function checkExistingPendingRequest(studentId: string): Promise<boolean> {
    if (!studentId) return false;
    try {
        const q = query(
            collection(db, EVENTS_COLLECTION), // Use existing EVENTS_COLLECTION
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
 * Checks if the proposed event dates conflict with existing Approved/InProgress/Completed events.
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
        collection(db, EVENTS_COLLECTION), // Use existing EVENTS_COLLECTION
        where('status', 'in', [EventStatus.Approved, EventStatus.InProgress, EventStatus.Completed])
        // Note: Removed EventStatus.Pending from the query because students cannot read other users' pending events
        // Only publicly viewable events should be checked for conflicts
    );

    try {
        const querySnapshot = await getDocs(q);
        let conflictingEvent: Event | null = null;
        let conflictingEventName: string | null = null;
        let hasConflict = false;
        let earliestConflictEndMillis: number | null = null;

        for (const docSnap of querySnapshot.docs) {
            if (excludeEventId && docSnap.id === excludeEventId) continue;

            const event = mapFirestoreToEventData(docSnap.id, docSnap.data()); // mapFirestoreToEventData is already imported
            if (!event || !event.details.date.start || !event.details.date.end) continue;

            const eventStartLuxon = getValidDateTime(event.details.date.start);
            const eventEndLuxon = getValidDateTime(event.details.date.end);

            if (!eventStartLuxon || !eventEndLuxon) continue;

            if (checkStartLuxon <= eventEndLuxon && checkEndLuxon >= eventStartLuxon) {
                hasConflict = true;
                conflictingEvent = event;
                conflictingEventName = event.details.eventName || "an existing event";
                if (earliestConflictEndMillis === null || eventEndLuxon.toMillis() > earliestConflictEndMillis) {
                    earliestConflictEndMillis = eventEndLuxon.toMillis();
                }
                 break; 
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