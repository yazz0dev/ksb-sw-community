// src/store/events/actions.participants.ts
// Helper functions for participant actions.
import { doc, getDoc, updateDoc, Timestamp, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '@/firebase';
import { Event, EventStatus } from '@/types/event';

/**
 * Adds a user to an event's participants list in Firestore.
 * @param eventId - The ID of the event.
 * @param userId - The UID of the user joining.
 * @returns Promise<void>
 * @throws Error if user/event invalid, status wrong, already joined, or Firestore fails.
 */
export async function joinEventInFirestore(eventId: string, userId: string): Promise<void> {
    if (!eventId) throw new Error('Event ID required.');
    if (!userId) throw new Error("User ID required to join.");

    const eventRef = doc(db, 'events', eventId);
    try {
        const eventSnap = await getDoc(eventRef);
        if (!eventSnap.exists()) throw new Error('Event not found.');
        const eventData = eventSnap.data() as Event;

        // Validation
        if (![EventStatus.Approved, EventStatus.InProgress].includes(eventData.status as EventStatus)) {
            throw new Error(`Cannot join event with status '${eventData.status}'.`);
        }
        const alreadyParticipant = eventData.participants?.includes(userId);
        const alreadyTeamMember = eventData.teams?.some(team => team.members?.includes(userId));
        if (alreadyParticipant || alreadyTeamMember) throw new Error('Already joined this event.');
        const isOrganizer = eventData.details?.organizers?.includes(userId);
        if (isOrganizer) throw new Error('Organizers cannot explicitly join.');

        await updateDoc(eventRef, {
            participants: arrayUnion(userId)
        });
        console.log(`Firestore: User ${userId} joined event ${eventId}.`);

    } catch (error: any) {
        console.error(`Firestore joinEvent error for ${eventId}:`, error);
        throw new Error(`Failed to join event: ${error.message}`);
    }
}

/**
 * Removes a user from an event's participants list or team in Firestore.
 * @param eventId - The ID of the event.
 * @param userId - The UID of the user leaving.
 * @returns Promise<void>
 * @throws Error if user/event invalid, status wrong, not part of event, or Firestore fails.
 */
export async function leaveEventInFirestore(eventId: string, userId: string): Promise<void> {
    if (!eventId) throw new Error('Event ID required.');
    if (!userId) throw new Error("User ID required to leave.");

    const eventRef = doc(db, 'events', eventId);
    try {
        const eventSnap = await getDoc(eventRef);
        if (!eventSnap.exists()) throw new Error('Event not found.');
        const eventData = eventSnap.data() as Event;

        // Validation
        if ([EventStatus.Completed, EventStatus.Cancelled, EventStatus.Closed].includes(eventData.status as EventStatus)) {
            throw new Error(`Cannot leave event with status '${eventData.status}'.`);
        }
        const isOrganizer = eventData.details?.organizers?.includes(userId);
        if (isOrganizer) throw new Error('Organizers cannot leave the event.');

        let updates: Record<string, any> = {};
        let userFound = false;

        // Remove from participants list
        if (eventData.participants?.includes(userId)) {
            updates.participants = arrayRemove(userId);
            userFound = true;
        }

        // Remove from teams (read-modify-write needed for safety)
        if (eventData.teams?.some(team => team.members?.includes(userId))) {
            const updatedTeams = eventData.teams.map(team => {
                if (team.members?.includes(userId)) {
                    return { ...team, members: team.members.filter(m => m !== userId) };
                }
                return team;
            });
            // Filter out teams that might become empty if needed
            // const validTeams = updatedTeams.filter(team => team.members.length > 0);
            updates.teams = updatedTeams;
            userFound = true;
        }

        if (!userFound) throw new Error('You are not currently part of this event.');

        await updateDoc(eventRef, updates);
        console.log(`Firestore: User ${userId} left event ${eventId}.`);

    } catch (error: any) {
        console.error(`Firestore leaveEvent error for ${eventId}:`, error);
        throw new Error(`Failed to leave event: ${error.message}`);
    }
}