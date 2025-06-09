import { 
  collection, 
  doc, 
  getDoc, 
  setDoc,
  updateDoc,
  deleteField,
  serverTimestamp,
  Timestamp,
  runTransaction // Added for potential transactional updates
} from 'firebase/firestore';
import { db } from '@/firebase';
import { DateTime } from 'luxon';
import { 
  type Event as EventBaseData,
  EventStatus, 
  type EventFormData,
  EventFormat
} from '@/types/event';
import { mapEventDataToFirestore, mapFirestoreToEventData } from '@/utils/eventDataUtils';
import { EVENTS_COLLECTION } from '@/utils/constants';

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
  
  const isChildEvent = !!formData.details.parentId;

  if (!isChildEvent && !formData.details?.eventName?.trim()) {
    throw new Error('Event name is required for a parent event.');
  }
  if (!formData.details?.type?.trim()) {
    throw new Error('Event type is required.');
  }

  // Date validation - only for parent events
  let startDateTime: DateTime | null = null;
  let endDateTime: DateTime | null = null;

  if (!isChildEvent) {
    const startDateInput = formData.details.date.start;
    const endDateInput = formData.details.date.end;
    if (!startDateInput || !endDateInput) {
        throw new Error('Both start and end dates are required for a parent event.');
    }
    try {
        if (typeof startDateInput === 'string') startDateTime = DateTime.fromISO(startDateInput);
        else throw new Error('Invalid start date format, expected ISO string.');

        if (typeof endDateInput === 'string') endDateTime = DateTime.fromISO(endDateInput);
        else throw new Error('Invalid end date format, expected ISO string.');
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error during date parsing.';
        throw new Error(`Invalid date format provided for validation: ${message}`);
    }
    if (!startDateTime.isValid || !endDateTime.isValid) {
        let invalidReasons = [];
        if (!startDateTime.isValid) invalidReasons.push(`Start date: ${startDateTime.invalidReason} (value: ${startDateInput})`);
        if (!endDateTime.isValid) invalidReasons.push(`End date: ${endDateTime.invalidReason} (value: ${endDateInput})`);
        throw new Error(`Invalid dates provided. ${invalidReasons.join(', ')}`);
    }
    if (endDateTime < startDateTime) {
        throw new Error('Event end date must be on or after the start date.');
    }
    const nowLuxon = DateTime.now().setZone('Asia/Kolkata').startOf('day');
    if (startDateTime.startOf('day') < nowLuxon) {
        throw new Error('Event start date cannot be in the past.');
    }
  }

  try {
    const newEventRef = doc(collection(db, EVENTS_COLLECTION));
    const newEventId = newEventRef.id;

    let parentEventData: EventBaseData | null = null;
    if (isChildEvent && formData.details.parentId) {
      const parentEventSnap = await getDoc(doc(db, EVENTS_COLLECTION, formData.details.parentId));
      if (!parentEventSnap.exists()) {
        throw new Error(`Parent event with ID ${formData.details.parentId} not found.`);
      }
      parentEventData = mapFirestoreToEventData(parentEventSnap.id, parentEventSnap.data()) as EventBaseData;
      if (!parentEventData) {
        throw new Error(`Could not map parent event data for ID ${formData.details.parentId}.`);
      }
    }

    const mappedData = mapEventDataToFirestore(formData);
    
    const dataToSubmit: any = {
      ...mappedData,
      requestedBy: studentId,
      status: EventStatus.Pending, // Child events also go through approval
      votingOpen: false,
      organizerRatings: {},
      submissions: [],
      winners: {},
      bestPerformerSelections: {},
      criteriaVotes: {},
      participants: [],
      teamMemberFlatList: [],
      lifecycleTimestamps: {
        createdAt: serverTimestamp(),
      },
      rejectionReason: null,
      manuallySelectedBy: null,
      gallery: null,
      childEventIds: [], // Initialize for all events, parent or child (child won't have children itself for now)
    };

    if (isChildEvent && parentEventData) {
      // Inherit specific fields from parent
      dataToSubmit.details.eventName = parentEventData.details.eventName; // Child uses parent's name
      dataToSubmit.details.date = parentEventData.details.date; // Child uses parent's date
      dataToSubmit.details.organizers = parentEventData.details.organizers; // Child uses parent's organizers
      dataToSubmit.details.parentId = formData.details.parentId; // Ensure parentId is set
    } else {
      // Parent event specific details setup
      dataToSubmit.details.parentId = null;
      if (dataToSubmit.details) {
        let organizersList = dataToSubmit.details.organizers;
        if (!Array.isArray(organizersList)) organizersList = [];
        if (!organizersList.includes(studentId)) organizersList.push(studentId);
        dataToSubmit.details.organizers = [...new Set(organizersList)];

        if (!dataToSubmit.details.eventName || dataToSubmit.details.eventName.trim() === '') {
            throw new Error('Event name cannot be empty for a parent event.');
        }
        dataToSubmit.details.rules = dataToSubmit.details.rules || null;
        dataToSubmit.details.prize = dataToSubmit.details.prize || null;
        
        if (startDateTime && endDateTime && dataToSubmit.details.date) {
          dataToSubmit.details.date = {
            start: Timestamp.fromDate(startDateTime.toJSDate()),
            end: Timestamp.fromDate(endDateTime.toJSDate())
          };
        }
      } else { // Should not happen if !isChildEvent due to earlier checks
         throw new Error('Event details are missing for a parent event.');
      }
    }
     // Common details setup
    if (!dataToSubmit.details.type || dataToSubmit.details.type.trim() === '') {
        throw new Error('Event type cannot be empty.');
    }
    dataToSubmit.details.coreParticipants = (dataToSubmit.details.format === EventFormat.Individual && Array.isArray(dataToSubmit.details.coreParticipants))
                                          ? dataToSubmit.details.coreParticipants.filter((uid: any) => typeof uid === 'string' && uid.trim() !== '').slice(0, 10)
                                          : [];


    dataToSubmit.criteria = dataToSubmit.criteria || [];
    dataToSubmit.teams = dataToSubmit.teams || [];

    // Transaction to create child and update parent
    await runTransaction(db, async (transaction) => {
      transaction.set(newEventRef, dataToSubmit);

      if (isChildEvent && formData.details.parentId) {
        const parentRef = doc(db, EVENTS_COLLECTION, formData.details.parentId);
        // Fetch parent again within transaction to get latest state
        const freshParentSnap = await transaction.get(parentRef);
        if (!freshParentSnap.exists()) {
          throw new Error(`Parent event with ID ${formData.details.parentId} not found during transaction.`);
        }
        const currentChildIds = freshParentSnap.data()?.childEventIds || [];
        const newChildIds = [...new Set([...currentChildIds, newEventId])];
        transaction.update(parentRef, { childEventIds: newChildIds, lastUpdatedAt: serverTimestamp() });
      }
    });
    
    return newEventId;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error during event creation.';
    console.error('Error creating event request:', message, error);
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
  studentId: string
): Promise<void> => {
  if (!eventId) throw new Error('Event ID is required for updates.');
  if (!studentId) throw new Error('Student ID is required for permission checks.');

  const eventRef = doc(db, EVENTS_COLLECTION, eventId);
  try {
    const eventSnap = await getDoc(eventRef);
    if (!eventSnap.exists()) throw new Error('Event request not found.');
    
    const currentEvent = mapFirestoreToEventData(eventSnap.id, eventSnap.data()) as EventBaseData | null;
    if (!currentEvent) throw new Error('Failed to map current event data.');

    if (currentEvent.requestedBy !== studentId) {
        throw new Error("Permission denied: You can only edit your own event requests.");
    }
    if (![EventStatus.Pending, EventStatus.Rejected].includes(currentEvent.status as EventStatus)) {
        throw new Error(`Cannot edit request with status: ${currentEvent.status}. Only Pending or Rejected requests are editable.`);
    }

    // Date validation for updates
    const startDateInput = formData.details.date.start;
    const endDateInput = formData.details.date.end;
    if (!startDateInput || !endDateInput) {
        throw new Error('Both start and end dates are required for update.');
    }
    
    let startDateTime: DateTime;
    let endDateTime: DateTime;
    try {
        if (typeof startDateInput === 'string') startDateTime = DateTime.fromISO(startDateInput);
        else throw new Error('Invalid start date format, expected ISO string.');

        if (typeof endDateInput === 'string') endDateTime = DateTime.fromISO(endDateInput);
        else throw new Error('Invalid end date format, expected ISO string.');
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error during date parsing.';
        throw new Error(`Invalid date format provided for validation: ${message}`);
    }

    if (!startDateTime.isValid || !endDateTime.isValid) {
        let invalidReasons = [];
        if (!startDateTime.isValid) invalidReasons.push(`Start date: ${startDateTime.invalidReason} (value: ${startDateInput})`);
        if (!endDateTime.isValid) invalidReasons.push(`End date: ${endDateTime.invalidReason} (value: ${endDateInput})`);
        throw new Error(`Invalid dates provided. ${invalidReasons.join(', ')}`);
    }

    if (endDateTime < startDateTime) {
        throw new Error('Event end date must be on or after the start date.');
    }
    
    const nowLuxon = DateTime.now().setZone('Asia/Kolkata').startOf('day');
    if (startDateTime.startOf('day') < nowLuxon) {
        throw new Error('Event start date cannot be in the past.');
    }

    const mappedUpdates = mapEventDataToFirestore(formData); // This will set lastUpdatedAt to serverTimestamp()
    const updatesToApply: any = { ...mappedUpdates };

    // Remove protected fields
    delete updatesToApply.status;
    delete updatesToApply.requestedBy;
    delete updatesToApply.lifecycleTimestamps;
    delete updatesToApply.votingOpen;
    delete updatesToApply.winners;
    delete updatesToApply.manuallySelectedBy;
    delete updatesToApply.organizerRatings;
    delete updatesToApply.submissions;
    delete updatesToApply.teamMemberFlatList;
    delete updatesToApply.participants;

    // lastUpdatedAt is already set by mapEventDataToFirestore in mappedUpdates
    // No need to explicitly set it again unless overriding that behavior.

    if (currentEvent.status === EventStatus.Rejected) {
        updatesToApply.status = EventStatus.Pending;
        (updatesToApply as any).rejectionReason = deleteField();
    }

    
    await updateDoc(eventRef, updatesToApply);

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error during event update.';
    console.error(`Error updating event request ${eventId}:`, message);
    throw new Error(`Failed to update event request ${eventId}: ${message}`);
  }
};

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
        
    try {
        const newEventRef = doc(collection(db, EVENTS_COLLECTION));
        const newEventId = newEventRef.id;
        const mappedData = mapEventDataToFirestore(eventData); // This will set lastUpdatedAt to serverTimestamp()

        const dataToSubmit: Partial<EventBaseData> = { // Changed Event to EventBaseData
            ...mappedData,
            requestedBy: userId,
            status: EventStatus.Approved,
            votingOpen: false, 
            organizerRatings: {},
            submissions: [],
            winners: {},
            bestPerformerSelections: {},
            lifecycleTimestamps: {
                createdAt: serverTimestamp(),
                approvedAt: serverTimestamp(),
            }
        };
        
        if (dataToSubmit.details) {
            if (!dataToSubmit.details.organizers || dataToSubmit.details.organizers.length === 0) {
                dataToSubmit.details.organizers = [userId];
            }
        }

        await setDoc(newEventRef, dataToSubmit);
        return newEventId;
    } catch (error: any) {
        console.error(`Error creating event request for user ${userId}:`, error);
        throw new Error(`Failed to create event request: ${error.message || 'Unknown error'}`);
    }
}
