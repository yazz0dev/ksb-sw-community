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
    }
}