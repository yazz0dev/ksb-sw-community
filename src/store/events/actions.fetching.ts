<<<<<<< HEAD
// src/store/events/actions.fetching.ts (Conceptual Student Site Helpers)
import { collection, doc, getDoc, getDocs, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '@/firebase'; // Adjusted path
import type { Event, EventStatus } from '@/types/event'; // Common types
import { studentProfileStore } from '@/store/studentProfileStore'; // To get current student's UID

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
=======
// src/store/events/actions.fetching.ts
import {
    doc,
    getDoc,
    getDocs,
    collection,
    query,
    orderBy,
    limit,
    where,
    Timestamp,
    DocumentData
} from 'firebase/firestore';
import { db } from '@/firebase';
import { Event, EventStatus, EventFormat } from '@/types/event'; // Removed EventDetails
import { mapFirestoreToEventData } from '@/utils/eventDataMapper';

// --- Fetch all events ---
export async function fetchAllEventsFromFirestore(): Promise<Event[]> {
    try {
        const eventsCollection = collection(db, 'events');
        // Consider adding more specific ordering or filtering if needed, e.g., by status or date
        const q = query(eventsCollection, orderBy('details.date.start', 'desc')); // Order by start date
        const querySnapshot = await getDocs(q);
        const events: Event[] = [];
        querySnapshot.forEach((docSnap) => {
            // Use the mapper for each document
            const eventData = mapFirestoreToEventData(docSnap.id, docSnap.data());
            if eventData) {
                events.push(eventData);
            }
        });
        return events;
    } catch (error) {
        console.error("Error fetching all events from Firestore:", error);
        throw new Error("Failed to fetch events.");
    }
}

// --- Fetch a single event by ID ---
export async function fetchSingleEventFromFirestore(eventId: string): Promise<Event | null> {
    if (!eventId) {
        console.warn("fetchSingleEventFromFirestore called with no eventId");
        return null;
    }
    try {
        const eventRef = doc(db, 'events', eventId);
        const docSnap = await getDoc(eventRef);
        if (docSnap.exists()) {
            // Use the mapper for the single document
            return mapFirestoreToEventData(docSnap.id, docSnap.data());
        }
        return null;
    } catch (error) {
        console.error(`Error fetching event ${eventId} from Firestore:`, error);
        throw new Error(`Failed to fetch event details for ${eventId}.`);
    }
}

// --- Fetch events by status ---
export async function fetchEventsByStatusFromFirestore(status: EventStatus, count: number = 10): Promise<Event[]> {
    try {
        const eventsCollection = collection(db, 'events');
        const q = query(
            eventsCollection,
            where('status', '==', status),
            orderBy('details.date.start', 'desc'), // Order by start date, descending
            limit(count)
        );
        const querySnapshot = await getDocs(q);
        const events: Event[] = [];
        querySnapshot.forEach((docSnap) => {
            const eventData = mapFirestoreToEventData(docSnap.id, docSnap.data());
            if (eventData) {
                events.push(eventData);
            }
        });
        return events;
    } catch (error) {
        console.error(`Error fetching events with status ${status}:`, error);
        throw new Error(`Failed to fetch ${status} events.`);
>>>>>>> 18584e3e4cbfec6471edfa715168774adf7c20a5
    }
}