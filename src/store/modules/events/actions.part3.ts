// src/store/modules/events/actions.part3.ts

import { ActionContext } from 'vuex';
import { db } from '@/firebase';
import {
    collection,
    getDocs,
    doc,
    getDoc,
    Timestamp,
    updateDoc,
    query,
    orderBy,
    enableNetwork,
    disableNetwork,
    increment,
    writeBatch,
    DocumentReference,
    DocumentData,
    WriteBatch,
    FirestoreError,
    where,
} from 'firebase/firestore';
import {
    Event,
    EventState,
    EventStatus,
    OrganizerRating,
    EventFormat // Import EventFormat from event.ts
} from '@/types/event';
import { RootState } from '@/types/store';
import { User } from '@/types/user';
import { invokePushNotification, isSupabaseConfigured } from '@/notifications';
import { DateTime } from 'luxon';

// Assuming updateLocalEvent helper is defined in part2 or elsewhere
declare function updateLocalEvent(context: ActionContext<EventState, RootState>, payload: { id: string; changes: Partial<Event> }): void;

// --- Private helper: Calculate XP earned for event participation ---
async function calculateEventXP(eventData: Event): Promise<Record<string, Record<string, number>>> {
    const xpAwardMap: Record<string, Record<string, number>> = {};
    const baseParticipationXP = 10;
    const submittedParticipationXP = 30;
    const organizerXP = 50;
    const winnerBonusXP = 100;
    const bestPerformerBonusXP = 10;

    (eventData.details.organizers || []).filter(Boolean).forEach(uid => {
        if (!xpAwardMap[uid]) xpAwardMap[uid] = {};
        xpAwardMap[uid]['Organizer'] = (xpAwardMap[uid]['Organizer'] || 0) + organizerXP;
    });

    const winners = eventData.winners || {};
    const allocations = eventData.criteria || [];

    if (eventData.details.format === EventFormat.Team && eventData.teams && Array.isArray(eventData.teams)) {
        const teamCriteriaRatings = eventData.teamCriteriaRatings || [];

        eventData.teams.forEach(team => {
            const teamMembers = (team.members || []).filter(Boolean);
            const hasSubmission = Array.isArray(team.submissions) && team.submissions.length > 0;
            const participationXP = hasSubmission ? submittedParticipationXP : baseParticipationXP;

            teamMembers.forEach(memberId => {
                if (!xpAwardMap[memberId]) xpAwardMap[memberId] = {};

                xpAwardMap[memberId]['Participation'] = (xpAwardMap[memberId]['Participation'] || 0) + participationXP;

                allocations.forEach(alloc => {
                    // Only assign if targetRole is defined
                    if (alloc.targetRole) {
                        const roleKey = alloc.targetRole;
                        const wonThisCriterion = teamCriteriaRatings.some((rating: any) =>
                            rating.selections?.criteria?.[alloc.constraintIndex.toString()] === team.teamName
                        );
                        if (wonThisCriterion) {
                            xpAwardMap[memberId][roleKey] = (xpAwardMap[memberId][roleKey] || 0) + (alloc.points || 0);
                        }
                    }
                });

                const wasBestPerformer = teamCriteriaRatings.some((rating: any) =>
                    rating.selections?.bestPerformer === memberId
                );
                if (wasBestPerformer) {
                    xpAwardMap[memberId]['Participation'] = (xpAwardMap[memberId]['Participation'] || 0) + bestPerformerBonusXP;
                }
            });
        });
    } else {
        const participants = (eventData.participants || []).filter(Boolean);
        participants.forEach(uid => {
            if (!xpAwardMap[uid]) xpAwardMap[uid] = {};

            const hasSubmission = eventData.submissions?.some(sub => sub.submittedBy === uid || sub.participantId === uid);
            xpAwardMap[uid]['Participation'] = (xpAwardMap[uid]['Participation'] || 0) + (hasSubmission ? submittedParticipationXP : baseParticipationXP);

            allocations.forEach(alloc => {
                if (alloc.targetRole) {
                    const roleKey = alloc.targetRole;
                    const isWinnerForRole = winners[roleKey]?.includes(uid);
                    if (isWinnerForRole) {
                        xpAwardMap[uid][roleKey] = (xpAwardMap[uid][roleKey] || 0) + (alloc.points || 0) + winnerBonusXP;
                    }
                }
            });
        });
    }

    return xpAwardMap;
}

interface CloseEventResult {
    success: boolean;
    message: string;
    xpAwarded?: Record<string, Record<string, number>>;
}

// --- Internal function for closing event logic (with notification) ---
async function _internalCloseEventPermanently(
    context: ActionContext<EventState, RootState>,
    eventId: string
): Promise<CloseEventResult> {
    const { dispatch, rootGetters } = context;
    const eventRef: DocumentReference<DocumentData> = doc(db, 'events', eventId);
    const batch: WriteBatch = writeBatch(db);
    let xpAwardMap: Record<string, Record<string, number>> = {};
    let fetchedEventData: Event | null = null;
    const currentUser: User | null = rootGetters['user/getUser'];

    try {
        const eventSnap = await getDoc(eventRef);
        if (!eventSnap.exists()) return { success: false, message: "Event not found." };
        fetchedEventData = { id: eventId, ...eventSnap.data() } as Event;

        if (fetchedEventData.status !== EventStatus.Completed) {
            return { success: false, message: "Only completed events can be closed permanently." };
        }
        if (fetchedEventData.closedAt) {
            console.warn(`Event ${eventId} is already closed.`);
            return { success: true, message: "Event is already closed." };
        }

        xpAwardMap = await calculateEventXP(fetchedEventData);

        for (const [userId, roleXpMap] of Object.entries(xpAwardMap)) {
            if (!userId) continue;
            const userRef: DocumentReference<DocumentData> = doc(db, 'users', userId);
            for (const [role, amount] of Object.entries(roleXpMap)) {
                if (amount > 0 && role) {
                    batch.update(userRef, { [`xpByRole.${role}`]: increment(amount) });
                }
            }
        }

        const closedTimestamp = Timestamp.now();
        batch.update(eventRef, {
            closedAt: closedTimestamp,
            lastUpdatedAt: closedTimestamp
        });

        await batch.commit();
        console.log(`Firestore batch committed for closing event ${eventId}.`);

        dispatch('updateLocalEvent', { id: eventId, changes: { closedAt: closedTimestamp, lastUpdatedAt: closedTimestamp } });

        if (isSupabaseConfigured() && fetchedEventData) {
            try {
                const organizers = fetchedEventData.details?.organizers || [];
                const participants = fetchedEventData.participants || [];
                const teamMembers = (fetchedEventData.teams || []).flatMap(t => t.members || []);
                const targetUserIds = [...new Set([...organizers, ...participants, ...teamMembers])]
                    .filter(Boolean)
                    .filter(id => id !== currentUser?.uid);

                if (targetUserIds.length > 0) {
                    const totalAwardedXP = Object.values(xpAwardMap).reduce((sum, roles) => sum + Object.values(roles).reduce((s, xp) => s + xp, 0), 0);
                    const functionPayload = {
                        notificationType: 'eventClosed',
                        targetUserIds: targetUserIds,
                        eventId: eventId,
                        messageTitle: `Event Closed & XP Awarded: ${fetchedEventData.details?.type || 'Event'}`,
                        messageBody: `"${fetchedEventData.details?.type || 'Event'}" has been closed. XP has been awarded! (Total: ${totalAwardedXP} XP)`,
                        eventUrl: `/event/${eventId}`,
                        eventName: fetchedEventData.details?.type || 'Unnamed Event',
                    };
                    console.log("Triggering Supabase Edge Function for event closure:", functionPayload);

                    await invokePushNotification(functionPayload);

                    console.log(`Supabase Edge Function execution triggered for event closure ${eventId}.`);
                }
            } catch (pushError) {
                console.error(`Failed to trigger Supabase function for event closure ${eventId}:`, pushError);
                dispatch('notification/showNotification', {
                    message: 'Event closed, but failed to send notification.',
                    type: 'warning'
                }, { root: true });
            }
        }

        return {
            success: true,
            message: "Event closed successfully and XP awarded.",
            xpAwarded: xpAwardMap
        };

    } catch (error: any) {
        console.error('Error closing event permanently:', error);
        const message = error instanceof Error ? error.message : "Failed to close event and award XP.";
        dispatch('notification/showNotification', {
            message: `Failed to close event: ${message}`,
            type: 'error'
        }, { root: true });
        throw new Error(message);
    }
}

// --- ACTION: Toggle Ratings Open/Closed (Organizer only) ---
export async function toggleRatingsOpen({ dispatch, rootGetters }: ActionContext<EventState, RootState>, { eventId, isOpen }: { eventId: string; isOpen: boolean }): Promise<{ status: 'success' | 'error'; message?: string }> {
    if (!eventId) throw new Error('Event ID required.');
    const eventRef = doc(db, 'events', eventId);
    try {
        const eventSnap = await getDoc(eventRef);
        if (!eventSnap.exists()) throw new Error("Event not found.");
        const currentEvent = eventSnap.data() as Event;

        const currentUser: User | null = rootGetters['user/getUser'];
        // Only organizers can toggle
        const isOrganizer = currentEvent.details.organizers?.includes(currentUser?.uid ?? '') || false;
        if (!isOrganizer) throw new Error("Permission denied.");

        if (currentEvent.status !== EventStatus.Completed) throw new Error("Ratings only toggle for completed events.");
        if (currentEvent.closedAt) throw new Error("Cannot toggle ratings for a closed event.");

        // --- MAIN FIX: Actually update ratingsOpen in Firestore ---
        const updates: Partial<Event> = { ratingsOpen: isOpen, lastUpdatedAt: Timestamp.now() };
        await updateDoc(eventRef, updates);

        // --- Update local event state ---
        dispatch('updateLocalEvent', { id: eventId, changes: updates });

        // ...existing notification logic...
        if (isOpen && isSupabaseConfigured()) {
            try {
                let participantIds: string[] = [];
                if (currentEvent.details.format === EventFormat.Team && Array.isArray(currentEvent.teams)) {
                    participantIds = currentEvent.teams.flatMap(team => team.members || []);
                } else if (Array.isArray(currentEvent.participants)) {
                    participantIds = currentEvent.participants;
                }
                const organizerIds = new Set(currentEvent.details.organizers || []);
                const targetUserIds = [...new Set(participantIds)]
                    .filter(id => id && !organizerIds.has(id) && id !== currentUser?.uid);

                if (targetUserIds.length > 0) {
                    const functionPayload = {
                        notificationType: 'ratingOpen',
                        targetUserIds: targetUserIds,
                        eventId: eventId,
                        messageTitle: 'Ratings are now open!',
                        messageBody: `You can now rate participants/teams for "${currentEvent.details?.type || 'this event'}".`,
                        eventUrl: `/event/${eventId}`,
                    };

                    console.log("Triggering Supabase Edge Function for ratings open:", functionPayload);

                    await invokePushNotification(functionPayload);

                    console.log(`Supabase Edge Function execution triggered for ratings open ${eventId}.`);
                }
            } catch (pushError) {
                console.error('Failed to trigger ratings open push notification:', pushError);
                dispatch('notification/showNotification', {
                    message: 'Ratings toggled, but failed to send notification.',
                    type: 'warning'
                }, { root: true });
            }
        }

        return { status: 'success' };
    } catch (error: any) {
        console.error(`Error toggling ratings for ${eventId}:`, error);
        dispatch('notification/showNotification', {
            message: `Failed to toggle ratings: ${error.message || 'Unknown error'}`,
            type: 'error'
        }, { root: true });
        return { status: 'error', message: error.message || 'Unknown error.' };
    }
}

// --- ACTION: Fetch All Events ---
export async function fetchEvents({ commit, dispatch }: ActionContext<EventState, RootState>): Promise<Event[]> {
    try {
        const q = query(collection(db, "events"), orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        const events: Event[] = querySnapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as Event));
        commit('setEvents', events);
        return events;
    } catch (error: any) {
        console.error("Error fetching events:", error);
        commit('setEvents', []);
        await dispatch('handleFirestoreError', error);
        throw new Error(`Failed to fetch events: ${error.message || 'Unknown error'}`);
    }
}

// --- ACTION: Fetch Detailed Information for a Single Event ---
export async function fetchEventDetails({ commit }: ActionContext<EventState, RootState>, eventId: string): Promise<Event | null> {
    try {
        if (!eventId) { commit('setCurrentEventDetails', null); return null; }
        const eventRef = doc(db, 'events', eventId);
        const docSnap = await getDoc(eventRef);
        if (docSnap.exists()) {
            const eventData = { id: docSnap.id, ...docSnap.data() } as Event;
            commit('setCurrentEventDetails', eventData);
            return eventData;
        } else {
            console.warn(`Event ${eventId} not found.`);
            commit('setCurrentEventDetails', null);
            return null;
        }
    } catch (error: any) {
        console.error(`Error fetching details for ${eventId}:`, error);
        commit('setCurrentEventDetails', null);
        throw error;
    }
}

// --- ACTION: Submit Team Criteria Rating (including best performer) ---
export async function submitTeamCriteriaRating({ rootGetters, dispatch }: ActionContext<EventState, RootState>, payload: {
    eventId: string; ratingType: 'team_criteria'; ratedBy: string; ratedAt: Date;
    selections: { criteria: Record<string, string>; bestPerformer: string; };
}): Promise<void> {
    const { eventId, ratedBy, ratedAt, selections } = payload;
    if (!eventId || !ratedBy || !selections?.criteria || typeof selections.bestPerformer !== 'string') throw new Error("Missing required rating data.");

    const currentUser: User | null = rootGetters['user/getUser'];
    if (currentUser?.uid !== ratedBy) throw new Error("RatedBy ID mismatch.");

    const eventRef = doc(db, 'events', eventId);
    try {
        const eventSnap = await getDoc(eventRef);
        if (!eventSnap.exists()) throw new Error('Event not found.');
        const eventData = eventSnap.data() as Event;

        if (eventData.status !== EventStatus.Completed) throw new Error("Ratings only for completed.");
        if (eventData.ratings && eventData.ratings.organizer) throw new Error("Rating period closed.");
        if (eventData.closedAt) throw new Error("Cannot rate closed event.");
        if (eventData.details.format !== EventFormat.Team) throw new Error("Team rating only for team events.");

        // --- Permission: Only organizers (including requester) can submit ---
        const organizers = eventData.details.organizers || [];
        const requester = eventData.requestedBy;
        const isOrganizer = organizers.includes(ratedBy) || requester === ratedBy;
        if (!isOrganizer) throw new Error("Only event organizers can submit team ratings.");

        // ...existing participant check and logic...
        const isParticipant = eventData.teams?.some(team => team.members?.includes(ratedBy)) || false;
        if (isParticipant) throw new Error("Participants cannot rate.");

        const teamCriteriaRatings = Array.isArray(eventData.teamCriteriaRatings) ? [...eventData.teamCriteriaRatings] : [];
        const existingIndex = teamCriteriaRatings.findIndex(r => r.ratedBy === ratedBy);
        if (existingIndex !== -1) {
            console.log(`User ${ratedBy} updating previous rating for ${eventId}.`);
            teamCriteriaRatings.splice(existingIndex, 1);
        }
        teamCriteriaRatings.push({ ratedBy, ratedAt: Timestamp.fromDate(ratedAt), selections });

        const updates: Partial<Event> & { teamCriteriaRatings?: any[] } = {
            teamCriteriaRatings, lastUpdatedAt: Timestamp.now()
        };
        await updateDoc(eventRef, updates);

        dispatch('updateLocalEvent', { id: eventId, changes: updates });
        console.log(`Team criteria rating submitted for ${eventId} by ${ratedBy}.`);
    } catch (error: any) {
        console.error(`Error submitting team criteria rating for ${eventId}:`, error);
        throw error;
    }
}

// --- ACTION: Submit Individual Winners (organizer only) ---
export async function submitIndividualWinners({ rootGetters, dispatch }: ActionContext<EventState, RootState>, payload: {
    eventId: string; ratingType: 'individual_winners'; ratedBy: string; selections: Record<string, string[]>;
}): Promise<void> {
    const { eventId, ratedBy } = payload;
    if (!eventId || !ratedBy) throw new Error("Missing required winner selection data.");

    const currentUser: User | null = rootGetters['user/getUser'];
    if (currentUser?.uid !== ratedBy) throw new Error("RatedBy ID mismatch.");

    const eventRef = doc(db, 'events', eventId);
    try {
        const eventSnap = await getDoc(eventRef);
        if (!eventSnap.exists()) throw new Error('Event not found.');
        const eventData = eventSnap.data() as Event;

        if (eventData.status !== EventStatus.Completed) throw new Error("Winner selection only for completed.");
        if (eventData.ratings && eventData.ratings.organizer) throw new Error("Winner selection period closed.");
        if (eventData.closedAt) throw new Error("Cannot select winners for closed event.");
        if (eventData.details.format !== EventFormat.Individual) throw new Error("Winner selection only for individual events.");

        // --- Permission: Only organizers (including requester) can submit ---
        const organizers = eventData.details.organizers || [];
        const requester = eventData.requestedBy;
        const isOrganizer = organizers.includes(ratedBy) || requester === ratedBy;
        if (!isOrganizer) throw new Error("Only event organizers can select winners.");

        const updates: Partial<Event> = { winners: payload.selections, lastUpdatedAt: Timestamp.now() };
        await updateDoc(eventRef, updates);
        dispatch('updateLocalEvent', { id: eventId, changes: updates });
        console.log(`Individual winners selected for ${eventId} by ${ratedBy}.`);

        if (isSupabaseConfigured() && eventData) {
            try {
                const allWinnerIds = [...new Set(Object.values(payload.selections).flat())]
                    .filter(Boolean);

                if (allWinnerIds.length > 0) {
                    const functionPayload = {
                        notificationType: 'winnerSelected',
                        targetUserIds: allWinnerIds,
                        eventId: eventId,
                        messageTitle: `You're a Winner! 🎉 (${eventData.details?.type || 'Event'})`,
                        messageBody: `Congratulations! You've been selected as a winner in the event: "${eventData.details?.type || 'Event'}". Check the event details!`,
                        eventUrl: `/event/${eventId}`,
                        eventName: eventData.details?.type || 'Unnamed Event',
                    };
                    console.log("Triggering Supabase Edge Function for winners:", functionPayload);

                    await invokePushNotification(functionPayload);

                    console.log(`Supabase Edge Function execution triggered for winners of ${eventId}.`);
                }
            } catch (pushError) {
                console.error(`Failed to trigger Supabase function for winners of ${eventId}:`, pushError);
                dispatch('notification/showNotification', {
                    message: 'Winners selected, but failed to send notification.',
                    type: 'warning'
                }, { root: true });
            }
        }

    } catch (error: any) {
        console.error(`Error submitting individual winners for ${eventId}:`, error);
        dispatch('notification/showNotification', {
            message: `Failed to select winners: ${error.message || 'Unknown error'}`,
            type: 'error'
        }, { root: true });
        throw error;
    }
}

// --- ACTION: Submit Rating for Event Organization ---
export async function submitOrganizationRating({ rootGetters, dispatch }: ActionContext<EventState, RootState>, { eventId, score }: { eventId: string; score: number | string }): Promise<void> {
    if (!eventId) throw new Error('Event ID required.');
    const numericScore = Number(score);
    if (isNaN(numericScore) || numericScore < 1 || numericScore > 5) throw new Error(`Invalid score (${score}). Must be 1-5.`);

    const currentUser: User | null = rootGetters['user/getUser'];
    const userId = currentUser?.uid;
    if (!userId) throw new Error('User must be logged in.');

    const eventRef = doc(db, 'events', eventId);
    try {
        const eventSnap = await getDoc(eventRef);
        if (!eventSnap.exists()) throw new Error('Event not found.');
        const eventData = eventSnap.data() as Event;
        if (eventData.status !== EventStatus.Completed) throw new Error('Organization only rated for completed.');

        // --- Permission: Only participants (not organizers) can rate organization ---
        let isParticipant = false;
        if (eventData.details.format === EventFormat.Team && eventData.teams) isParticipant = eventData.teams?.some(team => team.members?.includes(userId)) || false;
        else isParticipant = eventData.participants?.includes(userId) || false;

        const organizers = eventData.details.organizers || [];
        const requester = eventData.requestedBy;
        const isOrganizer = organizers.includes(userId) || requester === userId;
        if (!isParticipant || isOrganizer ) throw new Error('Only participants (not organizers) can rate organization.');

        const organizationRatings = Array.isArray(eventData.ratings?.organizer) ? [...eventData.ratings.organizer] : [];
        const existingRatingIndex = organizationRatings.findIndex((r: OrganizerRating) => r.userId === userId);
        const newRatingEntry: OrganizerRating = { userId: userId, rating: numericScore, feedback: "" };

        if (existingRatingIndex > -1) {
            console.log(`User ${userId} updating organization rating for ${eventId}.`);
            organizationRatings[existingRatingIndex] = newRatingEntry;
        } else {
            organizationRatings.push(newRatingEntry);
        }

        await updateDoc(eventRef, { "ratings.organizer": organizationRatings, lastUpdatedAt: Timestamp.now() });
        dispatch('updateLocalEvent', { id: eventId, changes: { ratings: { organizer: organizationRatings } } });
        console.log(`Organization rating (${numericScore}) submitted for ${eventId} by ${userId}.`);
    } catch (error: any) {
        console.error(`Error submitting organization rating for ${eventId}:`, error);
        throw error;
    }
}

// --- ACTION: Close Event Permanently (Organizer only) ---
export async function closeEventPermanently(context: ActionContext<EventState, RootState>, { eventId }: { eventId: string }): Promise<CloseEventResult> {
    const { rootGetters } = context;
    const currentUser: User | null = rootGetters['user/getUser'];
    // Only organizers can close
    // Fetch event to check organizers
    const eventRef = doc(db, 'events', eventId);
    const eventSnap = await getDoc(eventRef);
    if (!eventSnap.exists()) throw new Error('Event not found.');
    const eventData = eventSnap.data() as Event;
    const isOrganizer = eventData.details.organizers?.includes(currentUser?.uid ?? '') || false;
    if (!isOrganizer) throw new Error("Unauthorized: Only organizers can permanently close events.");
    try {
        return await _internalCloseEventPermanently(context, eventId);
    } catch (error: any) {
        console.error(`Caught error in closeEventPermanently action wrapper for ${eventId}:`, error);
        throw error;
    }
}

// --- ACTION: Centralized Firestore Error Handling ---
export async function handleFirestoreError({ commit, dispatch }: ActionContext<EventState, RootState>, error: any): Promise<void> {
    console.error('Firestore operation failed:', error);
    let userMessage = 'An unexpected error occurred.';
    if (error instanceof FirestoreError) {
        switch (error.code) {
            case 'permission-denied': userMessage = 'Permission Denied.'; break;
            case 'unavailable': case 'failed-precondition':
                userMessage = 'Connection Issue. Check internet.';
                console.warn('Attempting Firestore network reset...');
                try { await disableNetwork(db); await enableNetwork(db); userMessage += ' Network reset attempted.'; }
                catch (reconnectError: any) { console.error('Firestore reset failed:', reconnectError); }
                break;
            case 'not-found': userMessage = 'Item not found.'; break;
            case 'already-exists': userMessage = 'Item already exists.'; break;
            default: userMessage = `Error (${error.code}). Try again.`;
        }
    } else if (error instanceof Error) { userMessage = error.message; }

    dispatch('notification/showNotification', { message: userMessage, type: 'error' }, { root: true });
}

// --- ACTION: Clear Date Check State (Placeholder) ---
export async function clearDateCheck({ commit }: ActionContext<EventState, RootState>) {
    console.log("Date check state cleared (if applicable).");
}

// --- ACTION: Check Date Conflict ---
export async function checkDateConflict(_: ActionContext<EventState, RootState>, { startDate, endDate, excludeEventId = null }: {
    startDate: Date | string | Timestamp;
    endDate: Date | string | Timestamp;
    excludeEventId?: string | null;
}): Promise<{ hasConflict: boolean; nextAvailableDate: Date | null; conflictingEvent: Event | null }> {
    const q = query(collection(db, 'events'), 
        where('status', 'in', [EventStatus.Approved, EventStatus.InProgress]));
    const querySnapshot = await getDocs(q);
    // ...rest of existing function code...
    return { hasConflict: false, nextAvailableDate: null, conflictingEvent: null };
}

// --- ACTION: Submit Selection (for both team and individual) ---
export async function submitSelection({ rootGetters, dispatch }: ActionContext<EventState, RootState>, payload: {
    eventId: string;
    selectionType: 'team' | 'individual';
    selectedBy: string;
    selections: Record<string, string>; // constraintIndex -> teamName or participantId
    bestPerformer?: string;
}): Promise<void> {
    const { eventId, selectionType, selectedBy, selections, bestPerformer } = payload;
    const currentUser: User | null = rootGetters['user/getUser'];
    if (currentUser?.uid !== selectedBy) throw new Error("SelectedBy ID mismatch.");

    const eventRef = doc(db, 'events', eventId);
    const eventSnap = await getDoc(eventRef);
    if (!eventSnap.exists()) throw new Error('Event not found.');
    const eventData = eventSnap.data() as Event;

    // Only participants (including organizers if they are participants) can select
    let isParticipant = false;
    if (eventData.details.format === EventFormat.Team && eventData.teams) {
      isParticipant = !!eventData.teams.some(team => team.members?.includes(selectedBy));
    } else {
      isParticipant = !!eventData.participants?.includes(selectedBy);
    }
    if (!isParticipant) throw new Error("Only participants can submit selections.");

    // Prevent self/team selection (enforced in UI, but double-check here)
    if (selectionType === 'team') {
      const userTeam = eventData.teams?.find(team => team.members?.includes(selectedBy));
      for (const teamName of Object.values(selections)) {
        if (userTeam && teamName === userTeam.teamName) throw new Error("Cannot select your own team.");
      }
      if (bestPerformer && userTeam?.members?.includes(bestPerformer)) {
        if (bestPerformer === selectedBy) throw new Error("Cannot select yourself as best performer.");
      }
    } else {
      for (const participantId of Object.values(selections)) {
        if (participantId === selectedBy) throw new Error("Cannot select yourself as winner.");
      }
    }
}

// --- ACTION: Find Winner (organizer only) ---
export async function findWinner({ rootGetters, dispatch }: ActionContext<EventState, RootState>, { eventId }: { eventId: string }): Promise<void> {
    const currentUser: User | null = rootGetters['user/getUser'];
    const eventRef = doc(db, 'events', eventId);
    const eventSnap = await getDoc(eventRef);
    if (!eventSnap.exists()) throw new Error('Event not found.');
    const eventData = eventSnap.data() as Event;
    // Only organizers can find winners
    const organizers = eventData.details.organizers || [];
    const requester = eventData.requestedBy;
    const isOrganizer = organizers.includes(currentUser?.uid ?? '') || requester === (currentUser?.uid ?? '');
    if (!isOrganizer) throw new Error("Only organizers can find winners.");
}