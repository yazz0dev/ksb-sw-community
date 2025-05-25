// src/stores/events/actions.teams.ts (Conceptual Student Site Helpers - limited scope)
import { doc, getDoc, updateDoc, Timestamp, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '@/firebase';
import type { Event, EventStatus, Team } from '@/types/event';
import { EventFormat } from '@/types/event';
import { deepClone } from '../../utils/helpers';

const now = () => Timestamp.now();

// THIS IS A COMPLEX ACTION and needs careful consideration of rules and flow.
// For simplicity, direct team joining by students might be better handled by organizers.
// This is a conceptual placeholder.
/**
 * Allows a student to request to join an existing team in an event.
 * This might require organizer approval or be automatic based on event settings.
 * For this example, we'll assume it's an automatic join if team is not full.
 * @param eventId - The ID of the event.
 * @param studentId - The UID of the student requesting to join.
 * @param targetTeamName - The name of the team the student wants to join.
 */
export async function requestToJoinTeamInFirestore(
    eventId: string,
    studentId: string,
    targetTeamName: string
): Promise<void> {
    if (!eventId || !studentId || !targetTeamName) throw new Error('Missing required parameters.');

    const eventRef = doc(db, 'events', eventId);
    const MAX_TEAM_MEMBERS = 5; // Example limit

    try {
        const eventSnap = await getDoc(eventRef);
        if (!eventSnap.exists()) throw new Error('Event not found.');
        const eventData = eventSnap.data() as Event;

        if (eventData.details.format !== EventFormat.Team) throw new Error("This action is only for team events.");
        if (eventData.status !== EventStatus.Approved) throw new Error("Can only join teams for approved events before they start.");
        if (eventData.teams?.some(t => t.members.includes(studentId))) throw new Error("You are already in a team for this event.");

        const teams = deepClone(eventData.teams || []);
        const teamIndex = teams.findIndex(t => t.teamName === targetTeamName);

        if (teamIndex === -1) throw new Error(`Team "${targetTeamName}" not found.`);
        if (teams[teamIndex].members.length >= MAX_TEAM_MEMBERS) throw new Error(`Team "${targetTeamName}" is full.`);

        teams[teamIndex].members.push(studentId);
        const newTeamMemberFlatList = [...new Set(teams.flatMap(team => team.members).filter(Boolean))];

        await updateDoc(eventRef, {
            teams: teams,
            teamMemberFlatList: newTeamMemberFlatList,
            lastUpdatedAt: now()
        });
    } catch (error: any) {
        console.error(`Firestore requestToJoinTeam error for ${eventId}:`, error);
        throw new Error(`Failed to join team: ${error.message}`);
    }
}

/**
 * Allows a student to leave their current team in an event.
 * @param eventId - The ID of the event.
 * @param studentId - The UID of the student leaving.
 */
export async function leaveMyTeamInFirestore(eventId: string, studentId: string): Promise<void> {
     if (!eventId || !studentId ) throw new Error('Event ID and Student ID are required.');

    const eventRef = doc(db, 'events', eventId);
    try {
        const eventSnap = await getDoc(eventRef);
        if (!eventSnap.exists()) throw new Error('Event not found.');
        const eventData = eventSnap.data() as Event;

        if (eventData.details.format !== EventFormat.Team) throw new Error("This action is only for team events.");
        if (eventData.status !== EventStatus.Approved) throw new Error("Can only leave teams for approved events before they start.");
        // Add more checks: e.g., cannot leave if event is too close to starting.

        const teams = deepClone(eventData.teams || []);
        let teamModified = false;
        const studentTeamIndex = teams.findIndex(t => t.members.includes(studentId));

        if (studentTeamIndex === -1) throw new Error("You are not currently in a team for this event.");

        const teamToLeave = teams[studentTeamIndex];
        teamToLeave.members = teamToLeave.members.filter(m => m !== studentId);
        teamModified = true;

        // Handle team lead leaving
        if (teamToLeave.teamLead === studentId) {
            teamToLeave.teamLead = teamToLeave.members.length > 0 ? teamToLeave.members[0] : ''; // Assign new lead or clear
        }

        // Option: remove team if it becomes empty (or below min size)
        const updatedTeams = teams.filter(t => t.members.length > 0);
        const newTeamMemberFlatList = [...new Set(updatedTeams.flatMap(team => team.members).filter(Boolean))];


        if (teamModified) {
            await updateDoc(eventRef, {
                teams: updatedTeams,
                teamMemberFlatList: newTeamMemberFlatList,
                lastUpdatedAt: now()
            });
        } else {
            // This case should not be reached if studentTeamIndex was found.
            throw new Error("Could not find your team to leave.");
        }
    } catch (error: any) {
        console.error(`Firestore leaveMyTeam error for ${eventId}:`, error);
        throw new Error(`Failed to leave team: ${error.message}`);
    }
}

export function autoGenerateEventTeamsInFirestore(eventId: string, students: any, minMembersPerTeam: number, maxMembersPerTeam: number) {
  throw new Error('Function not implemented.');
}
