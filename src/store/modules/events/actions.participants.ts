// src/store/modules/events/actions.participants.ts
import { ActionContext } from 'vuex';
import { EventState } from '@/types/event';
import { RootState } from '@/types/store';
import { doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/firebase';
import { Event, EventStatus } from '@/types/event';
import { User } from '@/types/user';

export async function joinEvent({ rootGetters, dispatch }: ActionContext<EventState, RootState>, eventId: string): Promise<void> {
    if (!eventId) throw new Error('Event ID required.');
    const eventRef = doc(db, 'events', eventId);
    try {
        const eventSnap = await getDoc(eventRef);
        if (!eventSnap.exists()) throw new Error('Event not found.');
        const eventData = eventSnap.data() as Event;

        const currentUser: User | null = rootGetters['user/getUser'];
        const userId = currentUser?.uid;
        if (!userId) throw new Error("User not authenticated.");
        if (eventData.status !== EventStatus.Approved) throw new Error(`Cannot join event with status '${eventData.status}'.`);

        // Check if already a participant or team member
        const alreadyParticipant = Array.isArray(eventData.participants) && eventData.participants.includes(userId);
        const alreadyTeamMember = Array.isArray(eventData.teams) && eventData.teams.some(team => team.members?.includes(userId));
        if (alreadyParticipant || alreadyTeamMember) throw new Error('Already joined this event.');

        // Add to participants array
        const updatedParticipants = Array.isArray(eventData.participants)
            ? [...eventData.participants, userId]
            : [userId];

        await updateDoc(eventRef, { participants: updatedParticipants, lastUpdatedAt: Timestamp.now() });
        dispatch('updateLocalEvent', { id: eventId, changes: { participants: updatedParticipants } });
        console.log(`User ${userId} joined event ${eventId}.`);
    } catch (error: any) {
        console.error(`Error joining event ${eventId}:`, error);
        throw error;
    }
}


export async function leaveEvent({ rootGetters, dispatch }: ActionContext<EventState, RootState>, eventId: string): Promise<void> {
    if (!eventId) throw new Error('Event ID required.');
    const eventRef = doc(db, 'events', eventId);
    try {
        const eventSnap = await getDoc(eventRef);
        if (!eventSnap.exists()) throw new Error('Event not found.');
        const eventData = eventSnap.data() as Event;

        const currentUser: User | null = rootGetters['user/getUser'];
        const userId = currentUser?.uid;
        if (!userId) throw new Error("User not authenticated.");
        if (eventData.status !== EventStatus.Approved) throw new Error(`Cannot leave event with status '${eventData.status}'.`);

        let updatedEventDataForState: Partial<Event> = { lastUpdatedAt: Timestamp.now() };
        let userFound = false;

        if (Array.isArray(eventData.teams)) {
            const updatedTeams = eventData.teams.map(team => {
                if (team.members?.includes(userId)) {
                    userFound = true;
                    return {
                        ...team,
                        members: team.members.filter((id: string) => id !== userId)
                    };
                }
                return team;
            });
            updatedEventDataForState.teams = updatedTeams;
        }

        if (Array.isArray(eventData.participants) && eventData.participants.includes(userId)) {
            userFound = true;
            updatedEventDataForState.participants = eventData.participants.filter((id: string) => id !== userId);
        }

        if (!userFound) throw new Error('You are not a participant or team member of this event.');

        await updateDoc(eventRef, updatedEventDataForState);
        dispatch('updateLocalEvent', { id: eventId, changes: updatedEventDataForState });
        console.log(`User ${userId} left event ${eventId}.`);
    } catch (error: any) {
        console.error(`Error leaving event ${eventId}:`, error);
        throw error;
    }
}

// If joinEvent exists, add here as well.
