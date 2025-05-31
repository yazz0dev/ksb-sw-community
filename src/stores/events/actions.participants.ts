// src/stores/events/actions.participants.ts (Conceptual Student Site Helpers)
import { doc, getDoc, updateDoc, Timestamp, arrayUnion, arrayRemove, serverTimestamp } from 'firebase/firestore';
import { db } from '@/firebase';
import type { Event, Team } from '@/types/event'; // Removed EventStatus from here
import { EventFormat, EventStatus } from '@/types/event'; // Added EventStatus here

const now = () => Timestamp.now();

// Minimal fallback for mapFirestoreToEventData
function mapFirestoreToEventData(id: string, data: any) {
    if (!data) return null;
    return { id, ...data };
}

/**
 * Adds a student to an event's participants list in Firestore (for Individual/Competition).
 * For Team events, students join teams, not the event directly as a participant.
 * @param eventId - The ID of the event.
 * @param studentId - The UID of the student joining.
 */
export async function joinEventByStudentInFirestore(eventId: string, studentId: string): Promise<void> {
    if (!eventId || !studentId) throw new Error('Event ID and Student ID are required.');

    const eventRef = doc(db, 'events', eventId);
    try {
        const eventSnap = await getDoc(eventRef);
        if (!eventSnap.exists()) throw new Error('Event not found.');
        
        const eventData = mapFirestoreToEventData(eventSnap.id, eventSnap.data());
        if (!eventData) throw new Error('Failed to map event data.');

        if (![EventStatus.Approved, EventStatus.InProgress].includes(eventData.status as EventStatus)) {
            throw new Error(`Cannot join event with status: ${eventData.status}`);
        }
        if (eventData.details.format === EventFormat.Team) {
            throw new Error("To join a team event, please find and join a specific team.");
        }
        if (eventData.participants?.includes(studentId)) {
            console.warn(`Student ${studentId} already a participant in event ${eventId}.`);
            return; // Already joined
        }
        if (eventData.details.organizers?.includes(studentId)) {
            throw new Error("Organizers are automatically part of the event.");
        }


        await updateDoc(eventRef, {
            participants: arrayUnion(studentId),
            lastUpdatedAt: serverTimestamp()
        });
    } catch (error: any) {
        throw new Error(`Failed to join event: ${error.message}`);
    }
}

/**
 * Removes a student from an event's participants list or their team in Firestore.
 * @param eventId - The ID of the event.
 * @param studentId - The UID of the student leaving.
 */
export async function leaveEventByStudentInFirestore(eventId: string, studentId: string): Promise<void> {
    if (!eventId || !studentId) throw new Error('Event ID and Student ID are required.');

    const eventRef = doc(db, 'events', eventId);
    try {
        const eventSnap = await getDoc(eventRef);
        if (!eventSnap.exists()) throw new Error('Event not found.');
        const eventData = mapFirestoreToEventData(eventSnap.id, eventSnap.data());
        if (!eventData) throw new Error('Failed to map event data.');

        if ([EventStatus.Completed, EventStatus.Cancelled, EventStatus.Closed].includes(eventData.status as EventStatus)) {
            throw new Error(`Cannot leave event with status: ${eventData.status}`);
        }
        if (eventData.details.organizers?.includes(studentId)) {
            throw new Error("Organizers cannot leave the event via this student action.");
        }

        const updates: Partial<Event> = { lastUpdatedAt: serverTimestamp() }; // Changed MappedEventForFirestore to Event
        let userFoundAndRemoved = false;

        if (eventData.details.format !== EventFormat.Team && eventData.participants?.includes(studentId)) {
            updates.participants = arrayRemove(studentId) as any; // Keep as any for arrayRemove with complex types if needed
            userFoundAndRemoved = true;
        } else if (eventData.details.format === EventFormat.Team && eventData.teams) {
            // Use JSON deep clone instead of deepClone helper
            const newTeams = JSON.parse(JSON.stringify(eventData.teams)).map((team: Team) => { // Explicitly type team
                if (team.members.includes(studentId)) {
                    userFoundAndRemoved = true;
                    team.members = team.members.filter(m => m !== studentId);
                    if (team.teamLead === studentId) { // If lead leaves
                        team.teamLead = team.members.length > 0 ? team.members[0] : ''; // Assign new lead or clear
                    }
                }
                return team;
            }).filter((team: Team) => team.members.length > 0); // Remove empty teams

            if (userFoundAndRemoved) {
                updates.teams = newTeams;
                // Ensure team.members is treated as string[] for flatMap
                updates.teamMemberFlatList = [...new Set(newTeams.flatMap((team: Team) => team.members).filter(Boolean))] as string[];
            }
        }

        // Fix the type conversion for team members - this variable seems unused, consider removing if not needed later
        const allTeamMembers: string[] = eventData.teams 
            ? eventData.teams.flatMap((team: Team) => team.members).filter(Boolean)
            : [];

        if (!userFoundAndRemoved) throw new Error('You are not currently registered for this event or team.');

        await updateDoc(eventRef, updates);
    } catch (error: any) {
        throw new Error(`Failed to leave event: ${error.message}`);
    }
}