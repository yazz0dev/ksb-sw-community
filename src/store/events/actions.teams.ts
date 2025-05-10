// src/store/events/actions.teams.ts
// Helper functions for team actions.
import { doc, getDoc, updateDoc, arrayUnion, Timestamp } from 'firebase/firestore';
import { db } from '@/firebase';
import { Team, Event, EventFormat } from '@/types/event'; // Event is imported

/**
 * Adds a new team to an event document in Firestore.
 * @param eventId - The ID of the event.
 * @param teamName - The name for the new team.
 * @param members - Array of member UIDs.
 * @param existingTeams - The current list of teams for the event.
 * @returns Promise<Team> - The newly created team object.
 * @throws Error if validation fails, event not found, permissions invalid, or Firestore fails.
 */
export async function addTeamToEventInFirestore(
    eventId: string,
    teamName: string,
    members: string[],
    existingTeams: Team[] = [] // Pass existing teams to calculate new teamMembersFlat
): Promise<Team> {
    if (!eventId) throw new Error('Event ID required.');
    const trimmedTeamName = teamName?.trim();
    if (!trimmedTeamName) throw new Error("Team name cannot be empty.");
    if (!Array.isArray(members)) throw new Error("Members must be an array.");
    const validMembers = members.filter(m => typeof m === 'string' && m.trim() !== '');
    if (validMembers.length === 0) throw new Error("Team must have at least one member.");

    const eventRef = doc(db, 'events', eventId);
    try {
        const eventSnap = await getDoc(eventRef);
        if (!eventSnap.exists()) throw new Error('Event not found.');
        const eventData = eventSnap.data() as Event;
        if (eventData.details.format !== EventFormat.Team) throw new Error("Teams can only be added to 'Team' format events.");

        const currentTeams = eventData.teams || []; // Use teams from fetched event data
        if (currentTeams.some(t => t.teamName.toLowerCase() === trimmedTeamName.toLowerCase())) {
            throw new Error(`Team name "${trimmedTeamName}" already exists.`);
        }

        const newTeam: Team = {
            teamName: trimmedTeamName,
            members: validMembers,
            teamLead: validMembers[0] || '',
        };

        const updatedTeams = [...currentTeams, newTeam];
        const newTeamMembersFlat = Array.from(new Set(updatedTeams.flatMap(team => team.members || []).filter(Boolean)));

        await updateDoc(eventRef, {
            teams: arrayUnion(newTeam), // Add the new team object
            teamMembersFlat: newTeamMembersFlat, // Update the flat list
            lastUpdatedAt: Timestamp.now()
        });
        console.log(`Firestore: Team "${trimmedTeamName}" added to event ${eventId}. teamMembersFlat updated.`);
        return newTeam;

    } catch (error: any) {
        console.error(`Firestore addTeam error for ${eventId}:`, error);
        throw new Error(`Failed to add team: ${error.message}`);
    }
}

/**
 * Updates the entire teams array for an event in Firestore.
 * Also updates teamMembersFlat.
 * @param eventId - The ID of the event.
 * @param teams - The complete new array of Team objects.
 * @returns Promise<void>
 * @throws Error if validation fails, event not found, permissions invalid, or Firestore fails.
 */
export async function updateEventTeamsInFirestore(eventId: string, teams: Team[]): Promise<void> {
    if (!eventId) throw new Error('Event ID required.');
    if (!Array.isArray(teams)) throw new Error('Teams data must be an array.');

    for (const team of teams) {
        if (!team.teamName?.trim()) throw new Error("All teams must have a name.");
        if (!Array.isArray(team.members)) throw new Error(`Team "${team.teamName}" has invalid members data.`);
        if (!team.teamLead || !team.members.includes(team.teamLead)) {
            throw new Error(`Team "${team.teamName}" must have a valid team lead selected from its members.`);
        }
        team.members = team.members.filter(m => typeof m === 'string');
    }

    const newTeamMembersFlat = Array.from(new Set(teams.flatMap(team => team.members || []).filter(Boolean)));

    const eventRef = doc(db, 'events', eventId);
    try {
        const eventSnap = await getDoc(eventRef);
        if (!eventSnap.exists()) throw new Error('Event not found.');
        const eventData = eventSnap.data() as Event;
        if (eventData.details.format !== EventFormat.Team) throw new Error("Cannot update teams for non-team events.");

        await updateDoc(eventRef, {
            teams: teams,
            teamMembersFlat: newTeamMembersFlat, // Update the flat list
            lastUpdatedAt: Timestamp.now()
        });
        console.log(`Firestore: Teams and teamMembersFlat updated for event ${eventId}.`);

    } catch (error: any) {
        console.error(`Firestore updateTeams error for ${eventId}:`, error);
        throw new Error(`Failed to update teams: ${error.message}`);
    }
}