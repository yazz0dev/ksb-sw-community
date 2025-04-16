// src/store/modules/events/actions.part2.ts
import { ActionContext } from 'vuex';
import { db } from '@/firebase';
import {
    doc,
    getDoc,
    Timestamp,
    updateDoc,
    arrayUnion,
    arrayRemove,
    DocumentReference,
    DocumentData,
} from 'firebase/firestore';
import {
    EventStatus,
    EventState,
    Event,
    Team,
    Submission,
} from '@/types/event';
import { RootState } from '@/store/types';
import { User } from '@/types/user';

// --- Helper: Validate Organizers ---
// Defined in part1, assuming availability via module context or direct import if needed
declare function validateOrganizersNotAdmin(organizerIds: string[]): Promise<void>;

// --- Helper: Update Local State ---
// Defined here for use within this part and potentially called by other parts
export function updateLocalEvent({ commit }: ActionContext<EventState, RootState>, { id, changes }: { id: string; changes: Partial<Event> }) {
    commit('addOrUpdateEvent', { id, ...changes });
    commit('updateCurrentEventDetails', { id, changes });
}

// --- ACTION: Update Event Details (Admin, Organizer, or Requester) ---
export async function updateEventDetails({ dispatch, rootGetters }: ActionContext<EventState, RootState>, { eventId, updates }: { eventId: string; updates: Partial<Event> }): Promise<void> {
    if (!eventId) throw new Error('Event ID is required.');
    if (typeof updates !== 'object' || updates === null || Object.keys(updates).length === 0) return;

    const eventRef = doc(db, 'events', eventId);
    try {
        const eventSnap = await getDoc(eventRef);
        if (!eventSnap.exists()) throw new Error('Event not found.');
        const eventData = eventSnap.data() as Event;

        const currentUser: User | null = rootGetters['user/getUser'];
        const isAdmin = currentUser?.role === 'Admin';
        const isOrganizer = Array.isArray(eventData.organizers) && eventData.organizers.includes(currentUser?.uid ?? '');
        const isRequester = eventData.requester === currentUser?.uid;
        const currentStatus = eventData.status;
        const editableStatuses: EventStatus[] = [EventStatus.Pending, EventStatus.Approved];

        let canEdit = false;
        if (isAdmin && editableStatuses.includes(currentStatus)) canEdit = true;
        else if (isOrganizer && editableStatuses.includes(currentStatus)) canEdit = true;
        else if (isRequester && currentStatus === EventStatus.Pending) canEdit = true;
        if (!canEdit) throw new Error(`Permission denied: Cannot edit status '${currentStatus}'.`);

        const allowedUpdates: Partial<Event> = {};
        const generallyEditableFields: Array<keyof Event> = ['description', 'xpAllocation', 'eventFormat', 'isTeamEvent'];
        const pendingOnlyEditableFields: Array<keyof Event> = ['eventName', 'eventType', 'desiredStartDate', 'desiredEndDate'];
        const adminOnlyEditableFields: Array<keyof Event> = ['startDate', 'endDate', 'organizers'];
        const teamEditField: keyof Event = 'teams';

        for (const key in updates) {
            const fieldKey = key as keyof Event;
            const value = updates[fieldKey];

            if (generallyEditableFields.includes(fieldKey)) {
                allowedUpdates[fieldKey] = value;
            } else if (currentStatus === EventStatus.Pending && pendingOnlyEditableFields.includes(fieldKey)) {
                allowedUpdates[fieldKey] = value;
            } else if (isAdmin && adminOnlyEditableFields.includes(fieldKey)) {
                if (fieldKey === 'organizers') {
                    const newOrganizers = Array.isArray(value) ? (value as string[]).filter(Boolean) : [];
                    if (newOrganizers.length === 0) throw new Error("Organizers list cannot be empty.");
                    if (newOrganizers.length > 5) throw new Error("Max 5 organizers.");
                    // await validateOrganizersNotAdmin(newOrganizers); // Assuming defined in part1
                    allowedUpdates[fieldKey] = newOrganizers;
                } else {
                    allowedUpdates[fieldKey] = value;
                }
            } else if (fieldKey === teamEditField && eventData.isTeamEvent && Array.isArray(value) && (isAdmin || isOrganizer)) {
                const newTeams = (value as Partial<Team>[]).map((team, index) => {
                    const teamName = team.teamName?.trim();
                    if (!teamName) throw new Error(`Team name empty (index ${index}).`);
                    const members = Array.isArray(team.members) ? team.members.filter(Boolean) : [];
                    const existingTeam = eventData.teams?.find(et => et.teamName === teamName);
                    return { teamName, members, submissions: existingTeam?.submissions || [], ratings: existingTeam?.ratings || [] };
                });
                allowedUpdates[fieldKey] = newTeams;
            } else {
                console.warn(`Skipping update for field '${fieldKey}'.`);
            }
        }

        let finalStartDate = eventData.startDate, finalEndDate = eventData.endDate;
        let finalDesiredStart = eventData.desiredStartDate, finalDesiredEnd = eventData.desiredEndDate;
        const convertDate = (d: any): Timestamp | null => {
            if (!d) return null; if (d instanceof Timestamp) return d; if (d instanceof Date) return Timestamp.fromDate(d);
            try { return Timestamp.fromDate(new Date(d)); } catch { return null; }
        };
        if ('startDate' in allowedUpdates) finalStartDate = convertDate(allowedUpdates.startDate);
        if ('endDate' in allowedUpdates) finalEndDate = convertDate(allowedUpdates.endDate);
        if ('desiredStartDate' in allowedUpdates) finalDesiredStart = convertDate(allowedUpdates.desiredStartDate);
        if ('desiredEndDate' in allowedUpdates) finalDesiredEnd = convertDate(allowedUpdates.desiredEndDate);

        if ('startDate' in allowedUpdates) allowedUpdates.startDate = finalStartDate;
        if ('endDate' in allowedUpdates) allowedUpdates.endDate = finalEndDate;
        if ('desiredStartDate' in allowedUpdates) allowedUpdates.desiredStartDate = finalDesiredStart;
        if ('desiredEndDate' in allowedUpdates) allowedUpdates.desiredEndDate = finalDesiredEnd;

        if (finalStartDate && finalEndDate && finalStartDate.toMillis() >= finalEndDate.toMillis()) throw new Error("Start date >= end date.");
        if (finalDesiredStart && finalDesiredEnd && finalDesiredStart.toMillis() >= finalDesiredEnd.toMillis()) throw new Error("Desired start >= desired end.");

        if ((allowedUpdates.startDate || allowedUpdates.endDate) && currentStatus === EventStatus.Approved && finalStartDate && finalEndDate) {
            const conflictResult = await dispatch('checkDateConflict', { startDate: finalStartDate, endDate: finalEndDate, excludeEventId: eventId });
            if (conflictResult.hasConflict) throw new Error(`Update failed: Date conflict with ${conflictResult.conflictingEvent?.eventName || 'another event'}.`);
        }

        if (Object.keys(allowedUpdates).length > 0) {
            allowedUpdates.lastUpdatedAt = Timestamp.now();
            await updateDoc(eventRef, allowedUpdates);
            dispatch('updateLocalEvent', { id: eventId, changes: allowedUpdates }); // Use helper
            console.log(`Event ${eventId} details updated.`);
        } else {
            console.log(`No valid updates for event ${eventId}.`);
        }
    } catch (error: any) {
        console.error(`Error updating event ${eventId}:`, error);
        throw error;
    }
}

// --- ACTION: Auto-Generate Teams (Admin or Organizer) - SIMPLIFIED ---
export async function autoGenerateTeams({ dispatch, rootGetters }: ActionContext<EventState, RootState>, { eventId, numberOfTeams, maxTeams = 8 }: {
    eventId: string;
    numberOfTeams: number;
    maxTeams?: number;
}): Promise<Team[]> {
    if (!eventId) throw new Error('Event ID required.');
    if (typeof numberOfTeams !== 'number' || numberOfTeams <= 0) throw new Error("Invalid number of teams.");
    const effectiveMaxTeams = Math.max(1, maxTeams); const minTeamSize = 2;

    const eventRef = doc(db, 'events', eventId);
    try {
        const eventSnap = await getDoc(eventRef);
        if (!eventSnap.exists()) throw new Error('Event not found.');
        const eventData = eventSnap.data() as Event;

        const currentUser: User | null = rootGetters['user/getUser'];
        const isAdmin = currentUser?.role === 'Admin';
        const isOrganizer = Array.isArray(eventData.organizers) && eventData.organizers.includes(currentUser?.uid ?? '');
        if (!isAdmin && !isOrganizer) throw new Error("Permission denied.");

        if (![EventStatus.Pending, EventStatus.Approved].includes(eventData.status)) throw new Error(`Cannot generate teams for status '${eventData.status}'.`);
        if (!eventData.isTeamEvent) throw new Error("Not a team event.");

        const allStudents: User[] = await dispatch('user/fetchAllStudents', null, { root: true }) || [];
        if (allStudents.length === 0) throw new Error("No students found.");
        const allStudentUids = allStudents.map(s => s.uid).filter(Boolean);

        const existingTeams = Array.isArray(eventData.teams) ? eventData.teams : [];
        if (existingTeams.length >= effectiveMaxTeams) throw new Error(`Max teams (${effectiveMaxTeams}) reached.`);
        const assignedStudents = new Set<string>(existingTeams.flatMap(t => t.members || []).filter(Boolean));
        const availableStudentUids = allStudentUids.filter(uid => !assignedStudents.has(uid));

        if (availableStudentUids.length < minTeamSize) throw new Error(`Not enough available students (${availableStudentUids.length}).`);

        const maxPossibleNewTeams = Math.floor(availableStudentUids.length / minTeamSize);
        const remainingTeamSlots = effectiveMaxTeams - existingTeams.length;
        const teamsToCreateCount = Math.min(numberOfTeams, maxPossibleNewTeams, remainingTeamSlots);
        if (teamsToCreateCount <= 0) throw new Error(`Cannot create ${numberOfTeams} teams. Available slots: ${remainingTeamSlots}, Max possible: ${maxPossibleNewTeams}.`);

        const shuffledStudents = [...availableStudentUids].sort(() => Math.random() - 0.5);
        const generatedTeams: Team[] = [];
        const baseSize = Math.floor(shuffledStudents.length / teamsToCreateCount);
        const teamsWithExtraMember = shuffledStudents.length % teamsToCreateCount;
        let currentIndex = 0;

        for (let i = 0; i < teamsToCreateCount; i++) {
            const currentTeamSize = baseSize + (i < teamsWithExtraMember ? 1 : 0);
            if (currentIndex + currentTeamSize > shuffledStudents.length || currentTeamSize < minTeamSize) break;
            const teamMembers = shuffledStudents.slice(currentIndex, currentIndex + currentTeamSize);
            generatedTeams.push({ teamName: `Generated Team ${existingTeams.length + generatedTeams.length + 1}`, members: teamMembers, submissions: [], ratings: [] });
            currentIndex += currentTeamSize;
        }
        if (generatedTeams.length === 0) throw new Error("Failed to generate valid teams.");

        const finalTeams = [...existingTeams, ...generatedTeams];
        await updateDoc(eventRef, { teams: finalTeams, lastUpdatedAt: Timestamp.now() });
        dispatch('updateLocalEvent', { id: eventId, changes: { teams: finalTeams } }); // Use helper
        console.log(`Teams auto-generated for ${eventId}.`);
        return finalTeams;
    } catch (error: any) {
        console.error(`Error auto-generating teams for ${eventId}:`, error);
        throw error;
    }
}

// --- ACTION: Leave Event (Participant) ---
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

        if (eventData.isTeamEvent) {
            const currentTeams = Array.isArray(eventData.teams) ? eventData.teams : [];
            let userTeamIndex = currentTeams.findIndex(team => team.members?.includes(userId));
            if (userTeamIndex === -1) { console.log(`LeaveEvent: User ${userId} not in any team.`); return; }
            userFound = true;
            const updatedTeams = JSON.parse(JSON.stringify(currentTeams));
            updatedTeams[userTeamIndex].members = (updatedTeams[userTeamIndex].members || []).filter((m: string) => m !== userId);
            if (updatedTeams[userTeamIndex].members.length === 0) {
                console.log(`Team ${updatedTeams[userTeamIndex].teamName} empty, removing.`);
                updatedTeams.splice(userTeamIndex, 1);
            }
            await updateDoc(eventRef, { teams: updatedTeams, lastUpdatedAt: Timestamp.now() });
            updatedEventDataForState.teams = updatedTeams;
        } else {
            const currentParticipants = Array.isArray(eventData.participants) ? eventData.participants : [];
            if (!currentParticipants.includes(userId)) { console.log(`LeaveEvent: User ${userId} not participant.`); return; }
            userFound = true;
            await updateDoc(eventRef, { participants: arrayRemove(userId), lastUpdatedAt: Timestamp.now() });
            const freshSnap = await getDoc(eventRef);
            updatedEventDataForState.participants = freshSnap.exists() ? (freshSnap.data() as Event).participants : [];
        }

        if (userFound) {
            dispatch('updateLocalEvent', { id: eventId, changes: updatedEventDataForState }); // Use helper
            console.log(`User ${userId} left event ${eventId}.`);
        }
    } catch (error: any) {
        console.error(`Error leaving event ${eventId}:`, error);
        throw error;
    }
}

// --- ACTION: Add Team to Event (Admin or Organizer) ---
export async function addTeamToEvent({ dispatch, rootGetters }: ActionContext<EventState, RootState>, { eventId, teamName, members }: { eventId: string; teamName: string; members: string[] }): Promise<Team> {
    if (!eventId) throw new Error('Event ID required.');
    const trimmedTeamName = teamName?.trim();
    if (!trimmedTeamName) throw new Error("Team name empty.");
    if (!Array.isArray(members)) throw new Error("Members must be array.");
    const validMembers = members.filter(m => typeof m === 'string' && m.trim() !== '');
    if (validMembers.length === 0) throw new Error("Team needs >= 1 member.");

    const eventRef = doc(db, 'events', eventId);
    try {
        const eventSnap = await getDoc(eventRef);
        if (!eventSnap.exists()) throw new Error('Event not found.');
        const eventData = eventSnap.data() as Event;

        const currentUser: User | null = rootGetters['user/getUser'];
        const isAdmin = currentUser?.role === 'Admin';
        const isOrganizer = Array.isArray(eventData.organizers) && eventData.organizers.includes(currentUser?.uid ?? '');
        if (!isAdmin && !isOrganizer) throw new Error("Permission denied.");

        if (![EventStatus.Pending, EventStatus.Approved].includes(eventData.status)) throw new Error(`Cannot add teams to status '${eventData.status}'.`);
        if (!eventData.isTeamEvent) throw new Error("Not a team event.");

        const currentTeams = Array.isArray(eventData.teams) ? eventData.teams : [];
        if (currentTeams.some(t => t.teamName.toLowerCase() === trimmedTeamName.toLowerCase())) throw new Error(`Team "${trimmedTeamName}" exists.`);

        const allAssignedMembers = new Set<string>(currentTeams.flatMap(t => t.members || []).filter(Boolean));
        const alreadyAssigned = validMembers.filter(m => allAssignedMembers.has(m));
        if (alreadyAssigned.length > 0) throw new Error(`Students already assigned: ${alreadyAssigned.join(', ')}`);

        const newTeam: Team = { teamName: trimmedTeamName, members: validMembers, submissions: [], ratings: [] };
        await updateDoc(eventRef, { teams: arrayUnion(newTeam), lastUpdatedAt: Timestamp.now() });

        const freshSnap = await getDoc(eventRef);
        dispatch('updateLocalEvent', { id: eventId, changes: { teams: freshSnap.exists() ? (freshSnap.data() as Event).teams : [] } }); // Use helper
        console.log(`Team "${trimmedTeamName}" added to ${eventId}.`);
        return newTeam;
    } catch (error: any) {
        console.error(`Error adding team to ${eventId}:`, error);
        throw error;
    }
}

// --- ACTION: Submit Project (Individual or Team) ---
export async function submitProjectToEvent({ rootGetters, dispatch }: ActionContext<EventState, RootState>, { eventId, submissionData }: { eventId: string; submissionData: Partial<Submission> }): Promise<void> {
    if (!submissionData?.projectName?.trim()) throw new Error("Project Name required.");
    if (!submissionData?.link?.trim()) throw new Error("Project Link required.");
    if (!submissionData.link.startsWith('http://') && !submissionData.link.startsWith('https://')) throw new Error("Invalid URL.");
    if (!eventId) throw new Error('Event ID required.');

    const eventRef = doc(db, 'events', eventId);
    try {
        const eventSnap = await getDoc(eventRef);
        if (!eventSnap.exists()) throw new Error('Event not found.');
        const eventData = eventSnap.data() as Event;

        const currentUser: User | null = rootGetters['user/getUser'];
        const userId = currentUser?.uid;
        if (!userId) throw new Error("User not authenticated.");
        if (eventData.status !== EventStatus.InProgress) throw new Error("Submissions only allowed while 'In Progress'.");

        const submissionEntry: Submission = {
            projectName: submissionData.projectName.trim(),
            link: submissionData.link.trim(),
            description: submissionData.description?.trim() || null,
            submittedAt: Timestamp.now(),
            submittedBy: userId,
        };

        let updatedEventDataForState: Partial<Event> = { lastUpdatedAt: Timestamp.now() };

        if (eventData.isTeamEvent) {
            const currentTeams = Array.isArray(eventData.teams) ? eventData.teams : [];
            const userTeamIndex = currentTeams.findIndex(team => team.members?.includes(userId));
            if (userTeamIndex === -1) throw new Error("You are not assigned to a team.");
            const teamToUpdate = { ...currentTeams[userTeamIndex] };
            teamToUpdate.submissions = Array.isArray(teamToUpdate.submissions) ? teamToUpdate.submissions : [];
            if (teamToUpdate.submissions.length > 0) throw new Error("Team already submitted.");
            teamToUpdate.submissions.push(submissionEntry);
            const updatedTeams = [...currentTeams]; updatedTeams[userTeamIndex] = teamToUpdate;
            await updateDoc(eventRef, { teams: updatedTeams, lastUpdatedAt: Timestamp.now() });
            updatedEventDataForState.teams = updatedTeams;
        } else {
            const currentParticipants = Array.isArray(eventData.participants) ? eventData.participants : [];
            if (!currentParticipants.includes(userId)) throw new Error("Not registered participant.");
            const currentSubmissions = Array.isArray(eventData.submissions) ? eventData.submissions : [];
            if (currentSubmissions.some(sub => sub.submittedBy === userId)) throw new Error("Already submitted.");
            submissionEntry.participantId = userId;
            await updateDoc(eventRef, { submissions: arrayUnion(submissionEntry), lastUpdatedAt: Timestamp.now() });
            const freshSnap = await getDoc(eventRef);
            updatedEventDataForState.submissions = freshSnap.exists() ? (freshSnap.data() as Event).submissions : [];
        }

        dispatch('updateLocalEvent', { id: eventId, changes: updatedEventDataForState }); // Use helper
        console.log(`Project submitted for ${eventId} by ${userId}`);
    } catch (error: any) {
        console.error(`Error submitting project for ${eventId}:`, error);
        throw error;
    }
}