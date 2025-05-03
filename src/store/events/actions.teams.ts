// src/store/events/actions.teams.ts
// Helper functions for team actions.
import { doc, getDoc, updateDoc, arrayUnion, Timestamp } from 'firebase/firestore';
import { db } from '@/firebase';
import { Team, Event, EventFormat } from '@/types/event';

/**
 * Adds a new team to an event document in Firestore.
 * @param eventId - The ID of the event.
 * @param teamName - The name for the new team.
 * @param members - Array of member UIDs.
 * @returns Promise<Team> - The newly created team object.
 * @throws Error if validation fails, event not found, permissions invalid, or Firestore fails.
 */
export async function addTeamToEventInFirestore(eventId: string, teamName: string, members: string[]): Promise<Team> {
    if (!eventId) throw new Error('Event ID required.');
    const trimmedTeamName = teamName?.trim();
    if (!trimmedTeamName) throw new Error("Team name cannot be empty.");
    if (!Array.isArray(members)) throw new Error("Members must be an array.");
    const validMembers = members.filter(m => typeof m === 'string' && m.trim() !== '');
    if (validMembers.length === 0) throw new Error("Team must have at least one member."); // Adjust minimum if needed

    const eventRef = doc(db, 'events', eventId);
    try {
        // TODO: Add permission check (organizer only?)
        const eventSnap = await getDoc(eventRef);
        if (!eventSnap.exists()) throw new Error('Event not found.');
        const eventData = eventSnap.data() as Event;
        if (eventData.details.format !== EventFormat.Team) throw new Error("Teams can only be added to 'Team' format events.");
        if (eventData.teams?.some(t => t.teamName.toLowerCase() === trimmedTeamName.toLowerCase())) {
            throw new Error(`Team name "${trimmedTeamName}" already exists.`);
        }

        const newTeam: Team = {
            teamName: trimmedTeamName,
            members: validMembers,
            teamLead: validMembers[0] || '', // Default lead to first member
            submissions: [],
            ratings: []
        };

        await updateDoc(eventRef, {
            teams: arrayUnion(newTeam), // Add the new team object
            lastUpdatedAt: Timestamp.now()
        });
        console.log(`Firestore: Team "${trimmedTeamName}" added to event ${eventId}.`);
        return newTeam; // Return the created team

    } catch (error: any) {
        console.error(`Firestore addTeam error for ${eventId}:`, error);
        throw new Error(`Failed to add team: ${error.message}`);
    }
}

/**
 * Updates the entire teams array for an event in Firestore.
 * Use with caution - overwrites existing teams.
 * @param eventId - The ID of the event.
 * @param teams - The complete new array of Team objects.
 * @returns Promise<void>
 * @throws Error if validation fails, event not found, permissions invalid, or Firestore fails.
 */
export async function updateEventTeamsInFirestore(eventId: string, teams: Team[]): Promise<void> {
    if (!eventId) throw new Error('Event ID required.');
    if (!Array.isArray(teams)) throw new Error('Teams data must be an array.');

    // Basic validation on teams structure
    for (const team of teams) {
        if (!team.teamName?.trim()) throw new Error("All teams must have a name.");
        if (!Array.isArray(team.members)) throw new Error(`Team "${team.teamName}" has invalid members data.`);
        if (!team.teamLead || !team.members.includes(team.teamLead)) {
            throw new Error(`Team "${team.teamName}" must have a valid team lead selected from its members.`);
        }
        // Ensure members are strings
        team.members = team.members.filter(m => typeof m === 'string');
        // Ensure submissions/ratings are arrays if they exist
        team.submissions = Array.isArray(team.submissions) ? team.submissions : [];
        team.ratings = Array.isArray(team.ratings) ? team.ratings : [];
    }


    const eventRef = doc(db, 'events', eventId);
    try {
        // TODO: Add permission check (organizer only?)
        const eventSnap = await getDoc(eventRef);
        if (!eventSnap.exists()) throw new Error('Event not found.');
        const eventData = eventSnap.data() as Event;
        if (eventData.details.format !== EventFormat.Team) throw new Error("Cannot update teams for non-team events.");

        await updateDoc(eventRef, {
            teams: teams, // Overwrite the entire teams array
            lastUpdatedAt: Timestamp.now()
        });
        console.log(`Firestore: Teams updated for event ${eventId}.`);

    } catch (error: any) {
        console.error(`Firestore updateTeams error for ${eventId}:`, error);
        throw new Error(`Failed to update teams: ${error.message}`);
    }
}