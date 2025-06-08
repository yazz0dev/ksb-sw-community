import { 
  collection, 
  doc, 
  getDoc, 
  setDoc,
  updateDoc,
  deleteField,
  serverTimestamp,
  Timestamp
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
  if (!formData.details?.eventName?.trim()) throw new Error('Event name is required.');

  // Date validation
  const startDateInput = formData.details.date.start;
  const endDateInput = formData.details.date.end;
  if (!startDateInput || !endDateInput) {
      throw new Error('Both start and end dates are required.');
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

  try {
    const newEventRef = doc(collection(db, EVENTS_COLLECTION));
    const newEventId = newEventRef.id;

    const mappedData = mapEventDataToFirestore(formData);
    
    // Ensure the data structure exactly matches what Firestore rules expect
    const dataToSubmit: any = {
      ...mappedData,
      requestedBy: studentId,
      status: EventStatus.Pending,
      votingOpen: false,
      // Initialize all required fields that rules validate
      organizerRatings: {},
      submissions: [],
      winners: {},
      bestPerformerSelections: {},
      criteriaVotes: {},
      participants: [],
      teamMemberFlatList: [],
      lifecycleTimestamps: {
        createdAt: serverTimestamp(), // Use serverTimestamp
      },
      // lastUpdatedAt is now set by mapEventDataToFirestore to serverTimestamp()
      // Ensure optional fields are explicitly null if not provided
      rejectionReason: null,
      manuallySelectedBy: null,
      gallery: null
    };
    
    // Ensure organizers array includes the requestor and is properly formatted
    // This needs to happen *before* setDoc and *after* mappedData spread
    if (dataToSubmit.details) {
      // If organizers are coming from formData and are valid, use them, ensuring studentId is present.
      // Otherwise, initialize with studentId.
      let organizersList = dataToSubmit.details.organizers;
      if (!Array.isArray(organizersList)) {
        organizersList = []; // Initialize if not an array
      }

      if (!organizersList.includes(studentId)) {
        organizersList.push(studentId); // Add studentId if not already present
      }
      dataToSubmit.details.organizers = [...new Set(organizersList)]; // Ensure uniqueness and assign back

      // Ensure eventName is not empty. This should be caught by initial validation too.
      if (!dataToSubmit.details.eventName || dataToSubmit.details.eventName.trim() === '') {
          throw new Error('Event name cannot be empty.');
      }

      // Ensure all detail fields match rules expectations
      dataToSubmit.details.rules = dataToSubmit.details.rules || null;
      dataToSubmit.details.prize = dataToSubmit.details.prize || null; // Ensure all detail fields match rules expectations
      
      // Ensure date fields are proper Firestore Timestamps 
      if (dataToSubmit.details.date && dataToSubmit.details.date.start) {
        const startDate = startDateTime.toJSDate();
        const endDate = endDateTime.toJSDate();
        dataToSubmit.details.date = {
          start: Timestamp.fromDate(startDate),
          end: Timestamp.fromDate(endDate)
        };
      }
    } else {
      // If details object itself is missing, create it with the studentId as organizer
      dataToSubmit.details = {
        // formData.details would be undefined here if it was undefined in the input
        // So, we need to ensure all required fields for EventDetails are initialized
        eventName: formData.details?.eventName?.trim() || 'Untitled Event', // Default if not provided
        description: formData.details?.description || '', // Default if not provided
        format: formData.details?.format || EventFormat.Individual, // Use imported EventFormat
        type: formData.details?.type || 'General', // Default if not provided
        organizers: [studentId], 
        date: {
            // Create proper Firestore Timestamps here too
            start: startDateTime ? Timestamp.fromDate(startDateTime.toJSDate()) : null,
            end: endDateTime ? Timestamp.fromDate(endDateTime.toJSDate()) : null
        },
        allowProjectSubmission: formData.details?.allowProjectSubmission !== undefined ? formData.details.allowProjectSubmission : true,
        rules: formData.details?.rules || null,
        prize: formData.details?.prize || null,
      };
      // Ensure eventName is not empty after defaulting in the else block
      if (!dataToSubmit.details.eventName || dataToSubmit.details.eventName.trim() === '') {
          throw new Error('Event name cannot be empty.');
      }
    }

    // Ensure arrays are properly initialized (rules expect arrays, not undefined)
    dataToSubmit.criteria = dataToSubmit.criteria || [];
    dataToSubmit.teams = dataToSubmit.teams || [];

    console.log('Submitting to Firestore (createEventRequest):', dataToSubmit); // Added log
    await setDoc(newEventRef, dataToSubmit);
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
    
    const currentEvent = mapFirestoreToEventData(eventSnap.id, eventSnap.data()) as EventBaseData | null; // Added type assertion
    if (!currentEvent) throw new Error('Failed to map current event data.');

    if (currentEvent.requestedBy !== studentId) {
        throw new Error("Permission denied: You can only edit your own event requests.");
    }
    if (![EventStatus.Pending, EventStatus.Rejected].includes(currentEvent.status as EventStatus)) { // Added 'as EventStatus' for clarity if status is a union
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

    console.log('Updating Firestore document (updateEventRequestInService):', updatesToApply); // Added log
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
        
    // ...existing date validation logic...

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

        console.log('Submitting to Firestore (createEventInFirestore):', dataToSubmit); // Added log
        await setDoc(newEventRef, dataToSubmit);
        return newEventId;
    } catch (error: any) {
        throw new Error(error.message || 'Failed to create event directly.');
    }
}
