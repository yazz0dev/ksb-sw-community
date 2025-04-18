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
} from 'firebase/firestore';
import {
    Event,
    EventState,
    OrganizerRating,
    EventStatus
} from '@/types/event';
import { RootState } from '@/store/types';
import { User } from '@/types/user';
// --- Appwrite/SendPulse Integration START ---
import { functions, isAppwriteConfigured } from '@/appwrite';
import { Functions } from 'appwrite';
// --- Appwrite/SendPulse Integration END ---

// Assuming updateLocalEvent helper is defined in part2 or elsewhere
// If defined in part2, it should be imported or accessed via dispatch
declare function updateLocalEvent(context: ActionContext<EventState, RootState>, payload: { id: string; changes: Partial<Event> }): void;

// --- Private helper: Calculate XP earned for event participation ---
async function calculateEventXP(eventData: Event): Promise<Record<string, Record<string, number>>> {
    const xpAwardMap: Record<string, Record<string, number>> = {};
    const baseParticipationXP = 10;
    const submittedParticipationXP = 30;
    const organizerXP = 50;
    const winnerBonusXP = 100; // Bonus XP for being selected as a winner for a role/criterion
    const bestPerformerBonusXP = 10; // General XP bonus for the overall best performer in team events

    // --- Organizers ---
    (eventData.details.organizers || []).filter(Boolean).forEach(uid => {
        if (!xpAwardMap[uid]) xpAwardMap[uid] = {};
        // Use 'Organizer' key for this specific XP source
        xpAwardMap[uid]['Organizer'] = (xpAwardMap[uid]['Organizer'] || 0) + organizerXP;
    });

    // --- Role-Specific XP from Criteria (for Winners) ---
    const winners = eventData.winners || {};
    const allocations = eventData.criteria || [];

    // --- Apply XP based on event type ---
    if (eventData.details.format === 'Team' && eventData.teams && Array.isArray(eventData.teams)) {
        // --- Team Event XP Logic ---
        // Type assertion needed if teamCriteriaRatings is not standard in Event type
        const teamCriteriaRatings = (eventData as any).teamCriteriaRatings || [];

        eventData.teams.forEach(team => {
            const teamMembers = (team.members || []).filter(Boolean);
            const hasSubmission = Array.isArray(team.submissions) && team.submissions.length > 0;
            const participationXP = hasSubmission ? submittedParticipationXP : baseParticipationXP;

            teamMembers.forEach(memberId => {
                if (!xpAwardMap[memberId]) xpAwardMap[memberId] = {};

                // 1. Base Participation XP
                xpAwardMap[memberId]['Participation'] = (xpAwardMap[memberId]['Participation'] || 0) + participationXP;

                // 2. XP from winning criteria selections (awarded per team member)
                allocations.forEach(alloc => {
                    const constraintIdxStr = alloc.constraintIndex.toString();
                    // Check if *any* rating selected this team for this criterion
                    const wonThisCriterion = teamCriteriaRatings.some((rating: any) =>
                        rating.selections?.criteria?.[constraintIdxStr] === team.teamName
                    );
                    if (wonThisCriterion) {
                        const roleKey = alloc.targetRole || 'general'; // Use specified role or 'general'
                        xpAwardMap[memberId][roleKey] = (xpAwardMap[memberId][roleKey] || 0) + (alloc.points || 0);
                    }
                });

                // 3. Bonus XP if selected as Overall Best Performer
                const wasBestPerformer = teamCriteriaRatings.some((rating: any) =>
                    rating.selections?.bestPerformer === memberId
                );
                if (wasBestPerformer) {
                    xpAwardMap[memberId]['general'] = (xpAwardMap[memberId]['general'] || 0) + bestPerformerBonusXP;
                }
            });
        });
    } else {
        // --- Individual Event XP Logic ---
        const participants = (eventData.participants || []).filter(Boolean);
        participants.forEach(uid => {
            if (!xpAwardMap[uid]) xpAwardMap[uid] = {};

            // 1. Base Participation XP
            const hasSubmission = eventData.submissions?.some(sub => sub.submittedBy === uid || sub.participantId === uid);
            xpAwardMap[uid]['Participation'] = (xpAwardMap[uid]['Participation'] || 0) + (hasSubmission ? submittedParticipationXP : baseParticipationXP);

            // 2. XP from winning selections + Winner Bonus
            allocations.forEach(alloc => {
                const roleKey = alloc.targetRole || 'general';
                const isWinnerForRole = winners[roleKey]?.includes(uid);
                if (isWinnerForRole) {
                    // Award criterion points + flat winner bonus for the specific role
                    xpAwardMap[uid][roleKey] = (xpAwardMap[uid][roleKey] || 0) + (alloc.points || 0) + winnerBonusXP;
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
async function closeEventPermanentlyInternal(
    context: ActionContext<EventState, RootState>,
    eventId: string
): Promise<CloseEventResult> {
    const { dispatch } = context;
    const eventRef: DocumentReference<DocumentData> = doc(db, 'events', eventId);
    const batch: WriteBatch = writeBatch(db);
    let xpAwardMap: Record<string, Record<string, number>> = {};
    let fetchedEventData: Event | null = null;

    try {
        const eventSnap = await getDoc(eventRef);
        if (!eventSnap.exists()) return { success: false, message: "Event not found." };
        fetchedEventData = { id: eventId, ...eventSnap.data() } as Event;

        // Validation checks
        if (fetchedEventData.status !== EventStatus.Completed) {
            return { success: false, message: "Only completed events can be closed permanently." };
        }
        const orgRatings = fetchedEventData.ratings?.organizer;
        const teamCriteriaRatings = (fetchedEventData as any).teamCriteriaRatings;
        if (orgRatings || teamCriteriaRatings) {
            console.warn(`Closing event ${eventId} while rating data might exist. Ensure ratings were intended to be closed.`);
        }
        if (fetchedEventData.closedAt) {
            console.warn(`Event ${eventId} is already closed.`);
            return { success: true, message: "Event is already closed." };
        }

        xpAwardMap = await calculateEventXP(fetchedEventData);

        // Prepare batch updates for users' XP
        for (const [userId, roleXpMap] of Object.entries(xpAwardMap)) {
            if (!userId) continue;
            const userRef: DocumentReference<DocumentData> = doc(db, 'users', userId);
            for (const [role, amount] of Object.entries(roleXpMap)) {
                if (amount > 0 && role) {
                    batch.update(userRef, { [`xpByRole.${role}`]: increment(amount) });
                }
            }
        }
        await batch.commit();
        console.log(`XP batch committed for event ${eventId}.`);

        const closedTimestamp = Timestamp.now();
        const eventUpdates: Partial<Event> = {
            closedAt: closedTimestamp,
            lastUpdatedAt: closedTimestamp
        };
        await updateDoc(eventRef, eventUpdates);
        console.log(`Event ${eventId} marked as closed in Firestore.`);

        dispatch('updateLocalEvent', { id: eventId, changes: eventUpdates });

        // --- Appwrite/SendPulse Integration START ---
        if (isAppwriteConfigured() && fetchedEventData) {
            try {
                const organizers = fetchedEventData.details?.organizers || [];
                const participants = fetchedEventData.participants || [];
                const teamMembers = (fetchedEventData.teams || []).flatMap(t => t.members || []);
                const targetUserIds = [...new Set([...organizers, ...participants, ...teamMembers])].filter(Boolean);

                if (targetUserIds.length > 0) {
                    const totalAwardedXP = Object.values(xpAwardMap).reduce((sum, roles) => sum + Object.values(roles).reduce((s, xp) => s + xp, 0), 0);
                    const notificationPayload = {
                        notificationType: 'eventClosedXP',
                        targetUserIds: targetUserIds,
                        messageTitle: `Event Closed & XP Awarded: ${fetchedEventData.details?.type || 'Event'}`,
                        messageBody: `"${fetchedEventData.details?.type || 'Event'}" has been closed. XP has been awarded! (Total: ${totalAwardedXP} XP)`,
                        eventUrl: `/event/${eventId}`,
                        eventName: fetchedEventData.details?.type || 'Unnamed Event',
                    };
                    console.log("Triggering push notification for event closure:", notificationPayload);
                    await functions.createExecution('triggerSendPulsePush', JSON.stringify(notificationPayload), false);
                    console.log(`Push notification trigger attempted for event closure ${eventId}.`);
                }
            } catch (pushError) {
                console.error(`Failed to trigger push notification for event closure ${eventId}:`, pushError);
            }
        }
        // --- Appwrite/SendPulse Integration END ---

        return {
            success: true,
            message: "Event closed successfully and XP awarded.",
            xpAwarded: xpAwardMap
        };

    } catch (error: any) {
        console.error('Error closing event permanently:', error);
        const message = error instanceof Error ? error.message : "Failed to close event and award XP.";
        throw new Error(message);
    }
}

// --- ACTION: Toggle Ratings Open/Closed (Admin or Organizer) ---
export async function toggleRatingsOpen({ dispatch, rootGetters }: ActionContext<EventState, RootState>, { eventId, isOpen }: { eventId: string; isOpen: boolean }): Promise<{ status: 'success' | 'error'; message?: string }> {
    if (!eventId) throw new Error('Event ID required.');
    const eventRef = doc(db, 'events', eventId);
    try {
        const eventSnap = await getDoc(eventRef);
        if (!eventSnap.exists()) throw new Error("Event not found.");
        const currentEvent = eventSnap.data() as Event;

        const currentUser: User | null = rootGetters['user/getUser'];
        const isAdmin = currentUser?.role === 'Admin';
        const isOrganizer = currentEvent.details.organizers?.includes(currentUser?.uid ?? '') || false;
        if (!isAdmin && !isOrganizer) throw new Error("Permission denied.");

        if (currentEvent.status !== EventStatus.Completed) throw new Error("Ratings only toggle for completed events.");
        if (currentEvent.closedAt) throw new Error("Cannot toggle ratings for a closed event.");

        const updates: Partial<Event> = { lastUpdatedAt: Timestamp.now() };
        const now = Timestamp.now();

        await updateDoc(eventRef, updates);

        // --- Push Notification: Ratings Opened ---
        if (isOpen && currentEvent.status === EventStatus.Completed) {
            try {
                // Determine participants (team or individual)
                let participantIds: string[] = [];
                if (currentEvent.details.format === 'Team' && Array.isArray(currentEvent.teams)) {
                    participantIds = currentEvent.teams.flatMap(team => team.members || []);
                } else if (Array.isArray(currentEvent.participants)) {
                    participantIds = currentEvent.participants;
                }
                // Remove duplicates and exclude the user who triggered the action
                const currentUserId = currentUser?.uid;
                participantIds = [...new Set(participantIds)].filter(id => id && id !== currentUserId);

                if (participantIds.length > 0) {
                    // --- Appwrite Push Notification ---
                    const appwrite = new (require('appwrite').Client)()
                      .setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT)
                      .setProject(import.meta.env.VITE_APPWRITE_PROJECT_ID);
                    const functions = new Functions(appwrite);
                    const payload = {
                        notificationType: 'ratingOpen',
                        targetUserIds: participantIds,
                        messageTitle: 'Ratings are now open!',
                        messageBody: `You can now rate or select winners for "${currentEvent.details?.type || 'this event'}".`,
                        eventUrl: `/events/${eventId}/rate`,
                        eventName: currentEvent.details?.type || '',
                    };
                    await functions.createExecution(
                        import.meta.env.VITE_APPWRITE_FUNCTION_TRIGGER_PUSH_ID,
                        JSON.stringify(payload)
                    );
                }
            } catch (e) {
                console.error('Failed to trigger ratings open push notification:', e);
            }
        }

        const freshSnap = await getDoc(eventRef);
        const freshData = freshSnap.exists() ? freshSnap.data() as Event : null;
        const finalChanges = {
            completedAt: freshData?.completedAt ?? updates.completedAt,
            lastUpdatedAt: freshData?.lastUpdatedAt ?? updates.lastUpdatedAt, // Include lastUpdatedAt
        };
        dispatch('updateLocalEvent', { id: eventId, changes: finalChanges }); // Use helper
        return { status: 'success' };
    } catch (error: any) {
        console.error(`Error toggling ratings for ${eventId}:`, error);
        return { status: 'error', message: error.message || 'Unknown error.' };
    }
}

// --- ACTION: Fetch All Events ---
export async function fetchEvents({ commit, dispatch }: ActionContext<EventState, RootState>) {
    try {
        const q = query(collection(db, "events"), orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        const events: Event[] = querySnapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as Event));
        commit('setEvents', events);
    } catch (error: any) {
        console.error("Error fetching events:", error);
        commit('setEvents', []);
        if (error instanceof FirestoreError && (error.code === 'unavailable' || error.code === 'failed-precondition')) {
            console.warn("Firestore connection issue detected.");
            await dispatch('handleFirestoreError', error); // Calls helper below
        }
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
    if (currentUser?.role === 'Admin') throw new Error("Admins cannot rate.");

    const eventRef = doc(db, 'events', eventId);
    try {
        const eventSnap = await getDoc(eventRef);
        if (!eventSnap.exists()) throw new Error('Event not found.');
        const eventData = eventSnap.data() as Event;

        if (eventData.status !== EventStatus.Completed) throw new Error("Ratings only for completed.");
        if (eventData.ratings && eventData.ratings.organizer) throw new Error("Rating period closed.");
        if (eventData.closedAt) throw new Error("Cannot rate closed event.");
        if (eventData.details.format !== 'Team') throw new Error("Team rating only for team events.");

        const isParticipant = eventData.teams?.some(team => team.members?.includes(ratedBy));
        if (isParticipant) throw new Error("Participants cannot rate.");

        // Type assertion needed here as teamCriteriaRatings is not standard in Event type yet
        const teamCriteriaRatings = Array.isArray((eventData as any).teamCriteriaRatings) ? [...(eventData as any).teamCriteriaRatings] : [];
        const existingIndex = teamCriteriaRatings.findIndex(r => r.ratedBy === ratedBy);
        if (existingIndex !== -1) {
            console.log(`User ${ratedBy} updating previous rating for ${eventId}.`);
            teamCriteriaRatings.splice(existingIndex, 1);
        }
        teamCriteriaRatings.push({ ratedBy, ratedAt: Timestamp.fromDate(ratedAt), selections });

        const updates: Partial<Event> & { teamCriteriaRatings?: any[] } = { // Add field dynamically
            teamCriteriaRatings, lastUpdatedAt: Timestamp.now()
        };
        await updateDoc(eventRef, updates);

        dispatch('updateLocalEvent', { id: eventId, changes: updates }); // Use helper
        console.log(`Team criteria rating submitted for ${eventId} by ${ratedBy}.`);
    } catch (error: any) {
        console.error(`Error submitting team criteria rating for ${eventId}:`, error);
        throw error;
    }
}

// --- ACTION: Submit Individual Winners ---
export async function submitIndividualWinners({ rootGetters, dispatch }: ActionContext<EventState, RootState>, payload: {
    eventId: string; ratingType: 'individual_winners'; ratedBy: string; selections: Record<string, string[]>;
}): Promise<void> {
    const { eventId, ratedBy, selections } = payload;
    if (!eventId || !ratedBy || !selections || typeof selections !== 'object') throw new Error("Missing winner selection data.");

    const currentUser: User | null = rootGetters['user/getUser'];
    if (currentUser?.uid !== ratedBy) throw new Error("RatedBy ID mismatch.");

    const eventRef = doc(db, 'events', eventId);
    let fetchedEventData: Event | null = null;

    try {
        const eventSnap = await getDoc(eventRef);
        if (!eventSnap.exists()) throw new Error('Event not found.');
        fetchedEventData = { id: eventId, ...eventSnap.data() } as Event;

        // --- Allow Admin or Organizer to submit winners ---
        const isAdmin = currentUser?.role === 'Admin';
        const isOrganizer = Array.isArray(fetchedEventData.details?.organizers) && fetchedEventData.details.organizers.includes(currentUser?.uid ?? '');
        if (!isAdmin && !isOrganizer) throw new Error("Permission Denied: Only Admins or Organizers can select winners.");
        // --- End Permission Check ---

        if (fetchedEventData.status !== EventStatus.Completed) throw new Error("Selection only for completed.");
        if (fetchedEventData.closedAt) throw new Error("Cannot select winners for closed event.");
        if (fetchedEventData.details.format === 'Team') throw new Error("Individual selection only for individual events.");

        const updates: Partial<Event> = { winners: selections, lastUpdatedAt: Timestamp.now() };
        await updateDoc(eventRef, updates);
        dispatch('updateLocalEvent', { id: eventId, changes: updates });
        console.log(`Individual winners selected for ${eventId} by ${ratedBy}.`);

        // --- Appwrite/SendPulse Integration START ---
        if (isAppwriteConfigured() && fetchedEventData) {
            try {
                const allWinnerIds = [...new Set(Object.values(selections).flat())].filter(Boolean);

                if (allWinnerIds.length > 0) {
                    const notificationPayload = {
                        notificationType: 'eventWinnerSelected',
                        targetUserIds: allWinnerIds,
                        messageTitle: `You're a Winner! 🎉 (${fetchedEventData.details?.type || 'Event'})`,
                        messageBody: `Congratulations! You've been selected as a winner in the event: "${fetchedEventData.details?.type || 'Event'}". Check the event details!`,
                        eventUrl: `/event/${eventId}`,
                        eventName: fetchedEventData.details?.type || 'Unnamed Event',
                    };
                    console.log("Triggering push notification for winners:", notificationPayload);
                    await functions.createExecution('triggerSendPulsePush', JSON.stringify(notificationPayload), false);
                    console.log(`Push notification trigger attempted for winners of ${eventId}.`);
                }
            } catch (pushError) {
                console.error(`Failed to trigger push notification for winners of ${eventId}:`, pushError);
            }
        }
        // --- Appwrite/SendPulse Integration END ---

    } catch (error: any) {
        console.error(`Error submitting individual winners for ${eventId}:`, error);
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
    if (currentUser?.role === 'Admin') throw new Error('Admins cannot rate organization.');

    const eventRef = doc(db, 'events', eventId);
    try {
        const eventSnap = await getDoc(eventRef);
        if (!eventSnap.exists()) throw new Error('Event not found.');
        const eventData = eventSnap.data() as Event;

        if (eventData.status !== EventStatus.Completed) throw new Error('Organization only rated for completed.');

        let isParticipant = false;
        if (eventData.details.format === 'Team' && eventData.teams) isParticipant = eventData.teams?.some(team => team.members?.includes(userId)) || false;
        else isParticipant = eventData.participants?.includes(userId) || false;
        if (!isParticipant) throw new Error('Only participants can rate organization.');

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
        dispatch('updateLocalEvent', { id: eventId, changes: { ratings: { organizer: organizationRatings } } }); // Use helper
        console.log(`Organization rating (${numericScore}) submitted for ${eventId} by ${userId}.`);
    } catch (error: any) {
        console.error(`Error submitting organization rating for ${eventId}:`, error);
        throw error;
    }
}

export async function closeEventPermanently(context: ActionContext<EventState, RootState>, { eventId }: { eventId: string }): Promise<CloseEventResult> {
    const { rootGetters } = context;
    const currentUser: User | null = rootGetters['user/getUser'];
    if (currentUser?.role !== 'Admin') throw new Error("Unauthorized: Only Admins can permanently close events.");

    try {
         // Delegate to internal function which now handles notifications
         return await closeEventPermanentlyInternal(context, eventId);
    } catch (error: any) {
         console.error(`Caught error in closeEventPermanently action for ${eventId}:`, error);
         throw new Error(error.message || "Failed to close event.");
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
    // Add mutation commit if needed: commit('CLEAR_DATE_CONFLICT_STATE');
}