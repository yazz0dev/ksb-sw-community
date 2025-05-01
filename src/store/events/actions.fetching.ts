// src/store/modules/events/actions.fetching.ts
import { ActionContext } from 'vuex';
import { EventState } from '@/types/event';
import { RootState } from '@/types/store';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/firebase';
import { Event } from '@/types/event';

export async function fetchEvents({ commit }: ActionContext<EventState, RootState>): Promise<Event[]> {
    const eventsCol = collection(db, 'events');
    try {
        const snap = await getDocs(eventsCol);
        const events: Event[] = [];
        snap.forEach(docSnap => {
            events.push({ id: docSnap.id, ...docSnap.data() } as Event);
        });
        commit('setEvents', events);
        return events;
    } catch (error: any) {
        throw error;
    }
}

export async function fetchEventDetails({ commit }: ActionContext<EventState, RootState>, eventId: string): Promise<Event | null> {
    if (!eventId) throw new Error('Event ID required.');
    const eventRef = doc(db, 'events', eventId);
    try {
        const eventSnap = await getDoc(eventRef);
        if (!eventSnap.exists()) throw new Error('Event not found.');
        const event = { id: eventSnap.id, ...eventSnap.data() } as Event;
        commit('setCurrentEventDetails', event);
        return event;
    } catch (error: any) {
        console.error(`Error fetching event details for ${eventId}:`, error);
        throw error;
    }
}
