// src/stores/events/actions.fetching.ts (Conceptual Student Site Helpers)
import { collection, doc, getDoc, getDocs, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '@/firebase'; // Adjusted path
import { Event } from '@/types/event'; // Import Event as a type
import { EventStatus } from '@/types/event'; // Import EventStatus as a value
import { useStudentProfileStore } from '@/stores/studentProfileStore'; // Fixed import name

/**
 * Fetches publicly viewable events (Approved, InProgress, Completed, Closed).
 * @returns Promise<Event[]> - An array of event objects.
 */
export async function fetchPubliclyViewableEventsFromFirestore(): Promise<Event[]> {
    try {
        const q = query(
            collection(db, "events"),
            where('status', 'in', [EventStatus.Approved, EventStatus.InProgress, EventStatus.Completed, EventStatus.Closed]),
            orderBy('details.date.start', 'desc') // Example sort
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as Event));
    } catch (error: any) {
        console.error("Firestore fetchPubliclyViewableEvents error:", error);
        throw new Error(`Failed to fetch public events: ${error.message}`);
    }
}

/**
 * Fetches event requests made by a specific student.
 * @param studentId - The UID of the student.
 * @returns Promise<Event[]> - An array of the student's event requests (Pending, Rejected).
 */
export async function fetchMyEventRequestsFromFirestore(studentId: string): Promise<Event[]> {
    if (!studentId) return [];
    try {
        const q = query(
            collection(db, "events"),
            where('requestedBy', '==', studentId),
            where('status', 'in', [EventStatus.Pending, EventStatus.Rejected]),
            orderBy('createdAt', 'desc')
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as Event));
    } catch (error: any) {
        console.error(`Firestore fetchMyEventRequests error for ${studentId}:`, error);
        throw new Error(`Failed to fetch your event requests: ${error.message}`);
    }
}

/**
 * Fetches details for a single event from Firestore, with student-specific access checks.
 * @param eventId - The ID of the event to fetch.
 * @param currentStudentId - The UID of the currently logged-in student (for permission checks).
 * @returns Promise<Event | null> - The event object or null if not found/accessible.
 */
export async function fetchSingleEventForStudentFromFirestore(eventId: string, currentStudentId: string | null): Promise<Event | null> {
    if (!eventId) throw new Error('Event ID required for fetching details.');
    const eventRef = doc(db, 'events', eventId);
    try {
        const eventSnap = await getDoc(eventRef);
        if (!eventSnap.exists()) {
            return null;
        }
        const eventData = { id: eventSnap.id, ...eventSnap.data() } as Event;

        // Student-specific access logic:
        // Allow if public, or if it's their own pending/rejected request.
        const isPubliclyViewable = [EventStatus.Approved, EventStatus.InProgress, EventStatus.Completed, EventStatus.Closed].includes(eventData.status);
        const isMyRequest = eventData.requestedBy === currentStudentId && [EventStatus.Pending, EventStatus.Rejected].includes(eventData.status);

        if (isPubliclyViewable || isMyRequest) {
            return eventData;
        } else {
            // Student doesn't have permission to view this specific event state
            throw new Error("You do not have permission to view this event's details.");
        }
    } catch (error: any) {
        console.error(`Firestore fetchSingleEventForStudent error for ${eventId}:`, error);
        throw new Error(`Failed to fetch event details: ${error.message}`);
    }
}

export class EventFetchingActions {
  static async fetchSingleEventFromFirestore(eventId: string): Promise<Event | null> { // Ensure this returns Promise<Event | null>
    try {
      const eventDocRef = doc(db, "events", eventId);
      const eventDocSnap = await getDoc(eventDocRef);
      if (eventDocSnap.exists()) {
        // Assuming an eventDataToEvent function or similar to map Firestore data to Event type
        return { id: eventDocSnap.id, ...eventDocSnap.data() } as Event; // Or your specific mapping
      } else {
        console.log("No such event document!");
        return null;
      }
    } catch (error) {
      console.error("Error fetching single event:", error);
      return null;
    }
  }
}

/**
 * Checks if a student already has a pending event request.
 * @param studentId - The UID of the student.
 * @returns Promise<boolean> - True if the student has a pending request.
 */
export function checkExistingPendingRequestForStudent(studentId: string): boolean | PromiseLike<boolean> {
  throw new Error('Function not implemented.');
}

export function fetchSingleEventFromFirestore(eventId: string): Event | null {
  throw new Error('Function not implemented.');
}

