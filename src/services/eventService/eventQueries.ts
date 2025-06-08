import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy
} from 'firebase/firestore';
import { db } from '@/firebase';
import { 
  type Event as EventData, 
  EventStatus
} from '@/types/event';
import { mapFirestoreToEventData } from '@/utils/eventDataUtils';
import { EVENTS_COLLECTION } from '@/utils/constants';

/**
 * Fetches event requests made by a specific student.
 * @param studentId - The UID of the student.
 * @returns Promise<EventData[]> - An array of the student's event requests.
 */
export async function fetchMyEventRequests(studentId: string): Promise<EventData[]> {
    if (!studentId) return [];
    try {
        const q = query(
            collection(db, EVENTS_COLLECTION),
            where('requestedBy', '==', studentId),
            where('status', 'in', [EventStatus.Pending, EventStatus.Rejected]),
            orderBy('createdAt', 'desc')
        );
        const snapshot = await getDocs(q);
        return snapshot.docs
            .map(docSnap => mapFirestoreToEventData(docSnap.id, docSnap.data()) as EventData | null) // Add type assertion
            .filter((event): event is EventData => event !== null);
    } catch (error: any) {
        console.error(`Error in fetchMyEventRequests for ${studentId}:`, error);
        throw new Error(`Failed to fetch your event requests: ${error.message}`);
    }
}

/**
 * Fetches details for a single event from Firestore.
 * @param eventId - The ID of the event to fetch.
 * @param currentStudentId - The UID of the currently logged-in student.
 * @returns Promise<EventData | null> - The event object or null if not found/accessible.
 */
export async function fetchSingleEventForStudent(eventId: string, currentStudentId: string | null): Promise<EventData | null> {
    if (!eventId) throw new Error('Event ID required for fetching details.');
    const eventRef = doc(db, EVENTS_COLLECTION, eventId);
    try {
        const eventSnap = await getDoc(eventRef);
        if (!eventSnap.exists()) {
            console.log(`No event found with ID: ${eventId}`);
            return null;
        }
        const eventData = mapFirestoreToEventData(eventSnap.id, eventSnap.data()) as EventData | null; // Add type assertion

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
 * Fetches events that are generally viewable by unauthenticated users.
 */
export async function fetchPubliclyViewableEvents(): Promise<EventData[]> {
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
    const events: EventData[] = [];
    querySnapshot.forEach((docSnap) => {
      const eventData = mapFirestoreToEventData(docSnap.id, docSnap.data()) as EventData | null; // Add type assertion
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
 * Checks if a student has an existing event request with 'Pending' status.
 * @param studentId - The UID of the student to check.
 * @returns Promise<boolean> - True if a pending request exists, false otherwise.
 */
export async function hasPendingRequest(studentId: string): Promise<boolean> {
  if (!studentId) {
    console.warn("hasPendingRequest called without a studentId.");
    return false;
  }
  try {
    const q = query(
      collection(db, EVENTS_COLLECTION),
      where('requestedBy', '==', studentId),
      where('status', '==', EventStatus.Pending)
    );
    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty;
  } catch (error: any) {
    console.error(`Error checking for pending requests for student ${studentId}:`, error);
    throw new Error(`Failed to check for pending requests: ${error.message}`);
  }
}
