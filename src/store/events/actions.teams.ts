// src/store/modules/events/actions.teams.ts
import { ActionContext } from 'vuex';
import { EventState } from '@/types/event';
import { RootState } from '@/types/store';
import { db } from '@/firebase';
import { doc, getDoc, updateDoc, arrayUnion, Timestamp } from 'firebase/firestore';
import { Team, Event } from '@/types/event';

export async function addTeamToEvent({ dispatch }: ActionContext<EventState, RootState>, { eventId, teamName, members }: { eventId: string; teamName: string; members: string[] }): Promise<Team> {
    if (!eventId) throw new Error('Event ID required.');
    const trimmedTeamName = teamName?.trim();
    if (!trimmedTeamName) throw new Error("Team name empty.");
    if (!Array.isArray(members)) throw new Error("Members must be array.");
    const validMembers = members.filter(m => typeof m === 'string' && m.trim() !== '');
    const eventRef = doc(db, 'events', eventId);
    try {
        const eventSnap = await getDoc(eventRef);
        if (!eventSnap.exists()) throw new Error('Event not found.');
        const eventData = eventSnap.data() as Event;
        const existingTeams = Array.isArray(eventData.teams) ? eventData.teams : [];
        const newTeam: Team = {
            teamName: trimmedTeamName,
        teamLead: '',
            members: validMembers,
            submissions: [],
            ratings: []
        };
        await updateDoc(eventRef, { teams: arrayUnion(newTeam), lastUpdatedAt: Timestamp.now() });
        const freshSnap = await getDoc(eventRef);
        dispatch('updateLocalEvent', { id: eventId, changes: { teams: freshSnap.exists() ? (freshSnap.data() as Event).teams : [] } });
        return newTeam;
    } catch (error: any) {
        throw error;
    }
}


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
        const participants = Array.isArray(eventData.participants) ? [...eventData.participants] : [];
        if (participants.length < numberOfTeams * minTeamSize) throw new Error("Not enough participants for requested teams.");
        // Shuffle participants randomly for fair distribution
        const shuffled = [...participants];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        let generatedTeams: Team[] = [];
        for (let i = 0; i < numberOfTeams && i < effectiveMaxTeams; i++) {
            generatedTeams.push({
                teamName: `Team ${i + 1}`,
                teamLead: '',
                members: [],
                submissions: [],
                ratings: []
            });
        }
        shuffled.forEach((uid, idx) => {
            generatedTeams[idx % generatedTeams.length].members.push(uid);
        });
        // ...team generation logic (random or balanced split)...
        // For simplicity, split participants evenly
        for (let i = 0; i < numberOfTeams; i++) {
            generatedTeams.push({
                teamName: `Team ${i + 1}`,
                teamLead: '',
                members: [],
                submissions: [],
                ratings: []
            });
        }
        participants.forEach((uid, idx) => {
            generatedTeams[idx % numberOfTeams].members.push(uid);
        });
        const existingTeams = Array.isArray(eventData.teams) ? eventData.teams : [];
        const finalTeams = [...existingTeams, ...generatedTeams];
        await updateDoc(eventRef, { teams: finalTeams, lastUpdatedAt: Timestamp.now() });
        dispatch('updateLocalEvent', { id: eventId, changes: { teams: finalTeams } });
        return finalTeams;
    } catch (error: any) {
        throw error;
    }
}

