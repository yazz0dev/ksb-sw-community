import { 
  doc, 
  getDoc, 
  updateDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '@/firebase';
import { 
  type Event as EventData, // Alias Event to EventData
  EventStatus, 
  EventFormat,
  type Team
} from '@/types/event';
import { mapFirestoreToEventData } from '@/utils/eventDataUtils';
import { deepClone } from '@/utils/eventUtils';
import { EVENTS_COLLECTION, MIN_TEAM_MEMBERS, MAX_TEAM_MEMBERS } from '@/utils/constants';

/**
 * Allows a student to request to join an existing team in an event.
 * @param eventId - The ID of the event.
 * @param studentId - The UID of the student requesting to join.
 * @param targetTeamName - The name of the team the student wants to join.
 */
export async function requestToJoinTeamInFirestore(
    eventId: string,
    studentId: string,
    targetTeamName: string
): Promise<void> {
    if (!eventId || !studentId || !targetTeamName.trim()) throw new Error('Event ID, Student ID, and Target Team Name are required.');

    const eventRef = doc(db, EVENTS_COLLECTION, eventId);
    // const MAX_TEAM_MEMBERS = 5; // This was a local constant, will use the imported one if appropriate or clarify. Assuming the global MAX_TEAM_MEMBERS is intended.

    try {
        const eventSnap = await getDoc(eventRef);
        if (!eventSnap.exists()) throw new Error('Event not found.');
        const eventData = mapFirestoreToEventData(eventSnap.id, eventSnap.data()) as EventData | null; // Use EventData type with assertion
        if (!eventData) throw new Error('Failed to map event data.');

        if (eventData.details.format !== EventFormat.Team) throw new Error("This action is only for team events.");
        if (![EventStatus.Approved, EventStatus.InProgress].includes(eventData.status as EventStatus)) {
             throw new Error("Can only join teams for Approved or InProgress events.");
        }
        if (eventData.teams?.some((t: Team) => t.members.includes(studentId))) { // Explicitly type 't' as Team
            throw new Error("You are already in a team for this event.");
        }

        const teams = deepClone(eventData.teams || []);
        const teamIndex = teams.findIndex((t: Team) => t.teamName.toLowerCase() === targetTeamName.trim().toLowerCase()); // Explicitly type 't' as Team

        if (teamIndex === -1) throw new Error(`Team "${targetTeamName.trim()}" not found.`);
        const targetTeam = teams[teamIndex];
        if (!targetTeam) throw new Error("Team data is corrupted.");
        
        if (targetTeam.members.length >= MAX_TEAM_MEMBERS) throw new Error(`Team "${targetTeamName.trim()}" is full.`); // Using imported MAX_TEAM_MEMBERS
        if (targetTeam.members.includes(studentId)) {
             throw new Error(`You are already a member of team "${targetTeamName.trim()}".`);
        }

        targetTeam.members.push(studentId);
        const newTeamMemberFlatList = [...new Set(teams.flatMap((team: Team) => team.members).filter(Boolean))]; // Explicitly type 'team' as Team

        await updateDoc(eventRef, {
            teams: teams,
            teamMemberFlatList: newTeamMemberFlatList,
            lastUpdatedAt: serverTimestamp()
        });
    } catch (error: any) {
        throw new Error(error.message || `Failed to join team "${targetTeamName.trim()}".`);
    }
}

/**
 * Allows a student to leave their current team in an event.
 * @param eventId - The ID of the event.
 * @param studentId - The UID of the student leaving.
 */
export async function leaveMyTeamInFirestore(eventId: string, studentId: string): Promise<void> {
     if (!eventId || !studentId ) throw new Error('Event ID and Student ID are required.');

    const eventRef = doc(db, EVENTS_COLLECTION, eventId);
    try {
        const eventSnap = await getDoc(eventRef);
        if (!eventSnap.exists()) throw new Error('Event not found.');
        const eventData = mapFirestoreToEventData(eventSnap.id, eventSnap.data()) as EventData | null; // Use EventData type with assertion
        if (!eventData) throw new Error('Failed to map event data.');

        if (eventData.details.format !== EventFormat.Team) throw new Error("This action is only for team events.");
        if (![EventStatus.Approved, EventStatus.InProgress].includes(eventData.status as EventStatus)) {
            throw new Error("Can only leave teams for Approved or InProgress events.");
        }

        const teams = deepClone(eventData.teams || []);
        let teamModified = false;
        let studentFoundInTeam = false;
        const studentTeamIndex = teams.findIndex((t: Team) => t.members.includes(studentId)); // Explicitly type 't' as Team

        if (studentTeamIndex === -1) throw new Error("You are not currently in any team for this event.");
        
        studentFoundInTeam = true;
        const teamToLeave = teams[studentTeamIndex];
        if (!teamToLeave) throw new Error("Team data is corrupted.");
        
        const originalMemberCount = teamToLeave.members.length;
        teamToLeave.members = teamToLeave.members.filter(m => m !== studentId); // 'm' is string, fine

        if (teamToLeave.members.length < originalMemberCount) {
            teamModified = true;
            if (teamToLeave.teamLead === studentId) {
                teamToLeave.teamLead = teamToLeave.members.length > 0 ? teamToLeave.members[0] : '';
            }
        }

        const updatedTeams = teams.filter(t => t.members.length > 0); // 't' is Team, fine
        const newTeamMemberFlatList = [...new Set(updatedTeams.flatMap((team: Team) => team.members).filter(Boolean))]; // Explicitly type 'team' as Team

        if (!studentFoundInTeam) {
            throw new Error("You were not found in any team for this event.");
        }

        if (teamModified) { 
            await updateDoc(eventRef, {
                teams: updatedTeams,
                teamMemberFlatList: newTeamMemberFlatList,
                lastUpdatedAt: serverTimestamp()
            });
        }

    } catch (error: any) {
        console.error(`Firestore leaveMyTeam error for ${eventId}:`, error);
        throw new Error(error.message || 'Failed to leave team.');
    }
}

/**
 * Adds a new team to an event in Firestore.
 * @param eventId - The ID of the event.
 * @param teamName - The name for the new team.
 * @param members - Optional array of student UIDs to add as initial members.
 * @param teamLead - Optional UID of the team lead.
 * @returns Promise<Team> - The newly created team object.
 */
export async function addTeamToEventInFirestore(
    eventId: string,
    teamName: string,
    members: string[] = [],
    teamLead?: string
): Promise<Team> {
    if (!eventId || !teamName.trim()) throw new Error("Event ID and a valid team name are required.");

    const eventRef = doc(db, EVENTS_COLLECTION, eventId);
    try {
        const eventSnap = await getDoc(eventRef);
        if (!eventSnap.exists()) throw new Error("Event not found.");
        const eventData = mapFirestoreToEventData(eventSnap.id, eventSnap.data()) as EventData | null; // Use EventData type with assertion
        if (!eventData) throw new Error('Failed to map event data.');

        if (eventData.details.format !== EventFormat.Team) throw new Error("Teams can only be added to 'Team' format events.");
        if (eventData.teams?.some((t: Team) => t.teamName.toLowerCase() === teamName.trim().toLowerCase())) { // Explicitly type 't' as Team
            throw new Error(`A team with the name "${teamName.trim()}" already exists in this event.`);
        }

        const newTeam: Team = {
            id: `team_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            teamName: teamName.trim(),
            members: Array.isArray(members) ? [...new Set(members)] : [],
            teamLead: teamLead || (members && members.length > 0 ? members[0] : '')
        };

        const updatedTeams = [...(eventData.teams || []), newTeam];
        const newTeamMemberFlatList = [...new Set(updatedTeams.flatMap((team: Team) => team.members).filter(Boolean))]; // Explicitly type 'team' as Team

        await updateDoc(eventRef, {
            teams: updatedTeams,
            teamMemberFlatList: newTeamMemberFlatList,
            lastUpdatedAt: serverTimestamp()
        });
        return newTeam;
    } catch (error: any) {
        throw new Error(error.message || `Failed to add team "${teamName.trim()}" to event ${eventId}.`);
    }
}

/**
 * Updates the entire list of teams for an event in Firestore.
 * @param eventId - The ID of the event.
 * @param teams - The new array of Team objects.
 * @returns Promise<Team[]> - The updated array of teams.
 */
export async function updateEventTeamsInFirestore(eventId: string, teams: Team[]): Promise<Team[]> {
    if (!eventId) throw new Error("Event ID is required.");
    if (!Array.isArray(teams)) throw new Error("Teams must be an array.");

    const eventRef = doc(db, EVENTS_COLLECTION, eventId);
    try {
        const eventSnap = await getDoc(eventRef);
        if (!eventSnap.exists()) throw new Error("Event not found.");
        const eventData = mapFirestoreToEventData(eventSnap.id, eventSnap.data()) as EventData | null; // Use EventData type with assertion
        if (!eventData) throw new Error('Failed to map event data.');
        if (eventData.details.format !== EventFormat.Team) {
            throw new Error("Can only update teams for 'Team' format events.");
        }

        const newTeamMemberFlatList = [...new Set(teams.flatMap((team: Team) => team.members).filter(Boolean))]; // Explicitly type 'team' as Team

        await updateDoc(eventRef, {
            teams: teams,
            teamMemberFlatList: newTeamMemberFlatList,
            lastUpdatedAt: serverTimestamp()
        });
        return teams;
    } catch (error: any) {
        throw new Error(error.message || `Failed to update teams for event ${eventId}.`);
    }
}

/**
 * Auto-generates teams for an event by distributing students among pre-defined team shells.
 * @param eventId - The ID of the event.
 * @param students - Array of student objects.
 * @param minMembersPerTeam - Minimum members required for a team.
 * @param maxMembersPerTeam - Maximum members a team can have.
 * @returns Promise<Team[]> - The array of generated teams.
 */
export async function autoGenerateEventTeamsInFirestore(
  eventId: string,
  students: Array<{ uid: string; [key: string]: any }>, 
  minMembersPerTeam: number = 2, // Default will be clamped by MIN_TEAM_MEMBERS
  maxMembersPerTeam: number = 8  // Default will be clamped by MAX_TEAM_MEMBERS
): Promise<Team[]> {
  if (!eventId) throw new Error("Event ID is required.");
  if (!Array.isArray(students)) throw new Error("Students input must be an array.");
  
  // Enforce min/max constraints from constants (this part is from the original file structure)
  if (minMembersPerTeam < MIN_TEAM_MEMBERS) minMembersPerTeam = MIN_TEAM_MEMBERS;
  if (maxMembersPerTeam > MAX_TEAM_MEMBERS) maxMembersPerTeam = MAX_TEAM_MEMBERS;
  if (minMembersPerTeam > maxMembersPerTeam) throw new Error("Maximum members per team cannot be less than minimum.");

  const eventRef = doc(db, EVENTS_COLLECTION, eventId);
  try {
    const eventSnapshot = await getDoc(eventRef);
    if (!eventSnapshot.exists()) throw new Error("Event not found.");
    
    const eventData = mapFirestoreToEventData(eventSnapshot.id, eventSnapshot.data()) as EventData | null;
    if (!eventData) throw new Error('Failed to map event data.');

    if (eventData.details.format !== EventFormat.Team) {
      throw new Error("Auto-generation of teams is only applicable to 'Team' format events.");
    }
    if (!eventData.teams || eventData.teams.length === 0) { 
      throw new Error("Auto-generation requires at least one team shell (name) to be pre-defined in the event details.");
    }
    
    // Prepare team shells: clone existing teams and clear members/leads
    const populatedTeams: Team[] = deepClone(eventData.teams).map((team: Team) => ({
      ...team, // Preserves id, teamName from the shell
      members: [],
      teamLead: '', // Initialize teamLead as empty string
    }));

    if (populatedTeams.length === 0) {
        // This case should ideally be caught by the eventData.teams.length check earlier
        throw new Error("No team shells available to populate.");
    }

    // Extract student UIDs and shuffle them
    const studentUids = students.map(s => s.uid).filter(uid => typeof uid === 'string' && uid.trim() !== '');
    const shuffledStudentUids = [...studentUids].sort(() => 0.5 - Math.random());

    let currentStudentIndex = 0;
    
    // Distribute students in a round-robin fashion
    // Continue as long as there are students to assign and capacity in the last pass
    let studentAssignedInLastPass = true; 
    while (currentStudentIndex < shuffledStudentUids.length && studentAssignedInLastPass) {
        studentAssignedInLastPass = false; // Reset for the current pass
        for (let i = 0; i < populatedTeams.length; i++) {
            if (currentStudentIndex >= shuffledStudentUids.length) break; // All students assigned

            const team = populatedTeams[i];
            // Add a check for team to satisfy TypeScript, though it should theoretically not be undefined
            if (team) {
                // Use the clamped maxMembersPerTeam (parameter adjusted by constants)
                if (team.members.length < maxMembersPerTeam) { 
                    const studentUidToAdd = shuffledStudentUids[currentStudentIndex];
                    // Ensure studentUidToAdd is valid before using it
                    if (studentUidToAdd) {
                        team.members.push(studentUidToAdd);
                        if (team.members.length === 1) { // Set first member as lead
                            team.teamLead = studentUidToAdd;
                        }
                        currentStudentIndex++;
                        studentAssignedInLastPass = true; // A student was assigned in this pass
                    }
                }
            }
        }
    }
    
    // Note: Teams might have fewer than `minMembersPerTeam` if not enough students are available.
    // The function's primary goal is distribution. Validity of team sizes post-distribution
    // (e.g., against MIN_TEAM_MEMBERS) might be handled by other validation logic or UI.

    const newTeamMemberFlatList = [...new Set(populatedTeams.flatMap(team => team.members).filter(Boolean))];

    await updateDoc(eventRef, {
        teams: populatedTeams,
        teamMemberFlatList: newTeamMemberFlatList,
        lastUpdatedAt: serverTimestamp()
    });

    return populatedTeams;
  } catch (error: any) {
    console.error(`Error auto-generating teams for event ${eventId}:`, error);
    throw new Error(error.message || `Failed to auto-generate teams for event ${eventId}.`);
  }
}
