// src/store/events/actions.fetching.ts
// These are now helper functions
// They operate on data and interact with Firestore directly.
// They might need the Pinia store instance passed if they need to commit mutations (modify state directly in Pinia actions).

import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/firebase';
import { Event } from '@/types/event';

/**
 * Fetches all events from Firestore.
 * @returns Promise<Event[]> - An array of event objects.
 * @throws Error if Firestore query fails.
 */
export async function fetchAllEventsFromFirestore(): Promise<Event[]> {
    const eventsCol = collection(db, 'events');
    try {
        const snap = await getDocs(eventsCol);
        const events: Event[] = [];
        snap.forEach(docSnap => {
            // Basic validation or default values can be added here
            const data = docSnap.data();
            events.push({
                id: docSnap.id,
                status: data.status || 'Pending', // Example default
                requestedBy: data.requestedBy || '',
                details: data.details || {}, // Ensure details exists
                createdAt: data.createdAt,
                lastUpdatedAt: data.lastUpdatedAt,
                votingOpen: typeof data.votingOpen === 'boolean' ? data.votingOpen : false, // Default
                // Add other necessary fields with defaults if needed
            } as Event); // Cast carefully
        });
        return events;
    } catch (error: any) {
        console.error("Firestore fetchAllEvents error:", error);
        throw new Error(`Failed to fetch events: ${error.message}`);
    }
}

/**
 * Fetches details for a single event from Firestore.
 * @param eventId - The ID of the event to fetch.
 * @returns Promise<Event | null> - The event object or null if not found.
 * @throws Error if eventId is missing or Firestore query fails.
 */
export async function fetchSingleEventFromFirestore(eventId: string): Promise<Event | null> {
    if (!eventId) throw new Error('Event ID required for fetching details.');
    const eventRef = doc(db, 'events', eventId);
    try {
        const eventSnap = await getDoc(eventRef);
        if (!eventSnap.exists()) {
            console.warn(`Event with ID ${eventId} not found in Firestore.`);
            return null; // Return null instead of throwing for "not found"
        }
        // Add validation/defaults here too if necessary
        return { id: eventSnap.id, ...eventSnap.data() } as Event;
    } catch (error: any) {
        console.error(`Firestore fetchEventDetails error for ${eventId}:`, error);
        throw new Error(`Failed to fetch event details: ${error.message}`);
    }
}