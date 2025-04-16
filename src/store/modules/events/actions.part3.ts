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
    EventStatus,
    EventState,
    Event,
    OrganizationRating,
} from '@/types/event';
import { RootState } from '@/store/types';
import { User } from '@/types/user';

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
    (eventData.organizers || []).filter(Boolean).forEach(uid => {
        if (!xpAwardMap[uid]) xpAwardMap[uid] = {};
        // Use 'Organizer' key for this specific XP source
        xpAwardMap[uid]['Organizer'] = (xpAwardMap[uid]['Organizer'] || 0) + organizerXP;
    });

    // --- Role-Specific XP from Criteria (for Winners) ---
    const winners = eventData.winnersPerRole || {};
    const allocations = eventData.xpAllocation || [];

    // --- Apply XP based on event type ---
    if (eventData.isTeamEvent && Array.isArray(eventData.teams)) {
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
                        const roleKey = alloc.role || 'general'; // Use specified role or 'general'
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
                const roleKey = alloc.role || 'general';
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

// --- Internal function for closing event logic ---
async function closeEventPermanentlyInternal(
    context: ActionContext<EventState, RootState>,
    eventId: string
): Promise<CloseEventResult> {
    // No need for commit/rootGetters here, pass dispatch if needed for helpers
    const { dispatch } = context; // Get dispatch from context
    const eventRef: DocumentReference<DocumentData> = doc(db, 'events', eventId);
    const batch: WriteBatch = writeBatch(db);
    let xpAwardMap: Record<string, Record<string, number>> = {}; // Initialize outside try

    try {
        // Fetch & validate event
        const eventSnap = await getDoc(eventRef);
        if (!eventSnap.exists()) {
            return { success: false, message: "Event not found." };
        }
        const eventData = eventSnap.data() as Event;

        // Validation checks
        if (eventData.status !== EventStatus.Completed) {
            return { success: false, message: "Only completed events can be closed permanently." };
        }
        if (eventData.ratingsOpen) {
            return { success: false, message: "Ratings must be closed before the event can be closed permanently." };
        }
        if (eventData.closed) {
            console.warn(`Event ${eventId} is already closed.`);
            return { success: true, message: "Event is already closed." };
        }

        // Calculate XP awards
        xpAwardMap = await calculateEventXP(eventData);

        // Prepare batch updates for users' XP
        for (const [userId, roleXpMap] of Object.entries(xpAwardMap)) {
            if (!userId) continue; // Skip if userId is somehow invalid
            const userRef: DocumentReference<DocumentData> = doc(db, 'users', userId);
            for (const [role, amount] of Object.entries(roleXpMap)) {
                // Only update if there's XP to award and role is valid
                if (amount > 0 && role) {
                    // Firestore's increment handles non-existent fields gracefully (sets to amount)
                    batch.update(userRef, { [`xpByRole.${role}`]: increment(amount) });
                }
            }
        }
        // Commit XP updates
        await batch.commit();
        console.log(`XP batch committed for event ${eventId}.`);

        // Mark event as closed in Firestore (separate update after batch success)
        const closedTimestamp = Timestamp.now();
        const eventUpdates: Partial<Event> = {
            closed: true,
            closedAt: closedTimestamp,
            ratingsOpen: false, // Ensure ratings are marked closed
            lastUpdatedAt: closedTimestamp
        };
        await updateDoc(eventRef, eventUpdates);
        console.log(`Event ${eventId} marked as closed in Firestore.`);

        // Update local Vuex state using the helper action
        dispatch('updateLocalEvent', { id: eventId, changes: eventUpdates });

        return {
            success: true,
            message: "Event closed successfully and XP awarded.",
            xpAwarded: xpAwardMap
        };

    } catch (error: any) {
        console.error('Error closing event permanently:', error);
        const message = error instanceof Error ? error.message : "Failed to close event and award XP. Please try again.";
        throw new Error(message); // Rethrow standardized error
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
        const isOrganizer = Array.isArray(currentEvent.organizers) && currentEvent.organizers.includes(currentUser?.uid ?? '');
        if (!isAdmin && !isOrganizer) throw new Error("Permission denied.");

        if (currentEvent.status !== EventStatus.Completed) throw new Error("Ratings only toggle for completed events.");
        if (currentEvent.closed) throw new Error("Cannot toggle ratings for a closed event.");

        const updates: Partial<Event> = { lastUpdatedAt: Timestamp.now() };
        const now = Timestamp.now();
        const ratingsOpenCount = currentEvent.ratingsOpenCount ?? 0;

        if (isOpen) {
            if (currentEvent.ratingsOpen) return { status: 'success', message: 'Ratings already open.' };
            if (ratingsOpenCount >= 2) throw new Error("Rating period opened max 2 times.");
            if (!currentEvent.completedAt) updates.completedAt = now; // Set completion time if missing
            updates.ratingsOpen = true;
            updates.ratingsLastOpenedAt = now;
            const updatedCount = (increment(1) as any) as number;
            updates.ratingsOpenCount = updatedCount;
        } else {
            if (!currentEvent.ratingsOpen) return { status: 'success', message: 'Ratings already closed.' };
            updates.ratingsOpen = false;
        }

        await updateDoc(eventRef, updates);

        const freshSnap = await getDoc(eventRef);
        const freshData = freshSnap.exists() ? freshSnap.data() as Event : null;
        const finalChanges = {
            ratingsOpen: freshData?.ratingsOpen ?? updates.ratingsOpen,
            ratingsLastOpenedAt: freshData?.ratingsLastOpenedAt ?? updates.ratingsLastOpenedAt,
            ratingsOpenCount: freshData?.ratingsOpenCount ?? ratingsOpenCount + (isOpen ? 1 : 0),
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
        if (!eventData.ratingsOpen) throw new Error("Rating period closed.");
        if (eventData.closed) throw new Error("Cannot rate closed event.");
        if (!eventData.isTeamEvent) throw new Error("Team rating only for team events.");

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
    if (currentUser?.role === 'Admin') throw new Error("Admins cannot select winners."); // Policy decision

    const eventRef = doc(db, 'events', eventId);
    try {
        const eventSnap = await getDoc(eventRef);
        if (!eventSnap.exists()) throw new Error('Event not found.');
        const eventData = eventSnap.data() as Event;

        if (eventData.status !== EventStatus.Completed) throw new Error("Selection only for completed.");
        if (!eventData.ratingsOpen) throw new Error("Selection period closed.");
        if (eventData.closed) throw new Error("Cannot select winners for closed event.");
        if (eventData.isTeamEvent) throw new Error("Individual selection only for individual events.");

        const isParticipant = eventData.participants?.includes(ratedBy);
        if (isParticipant) throw new Error("Participants cannot select winners.");

        // Overwrite winnersPerRole with the new selections
        const updates: Partial<Event> = { winnersPerRole: selections, lastUpdatedAt: Timestamp.now() };
        await updateDoc(eventRef, updates);

        dispatch('updateLocalEvent', { id: eventId, changes: updates }); // Use helper
        console.log(`Individual winners selected for ${eventId} by ${ratedBy}.`);
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
        if (eventData.isTeamEvent) isParticipant = eventData.teams?.some(team => team.members?.includes(userId));
        else isParticipant = eventData.participants?.includes(userId);
        if (!isParticipant) throw new Error('Only participants can rate organization.');

        const organizationRatings = Array.isArray(eventData.organizationRatings) ? [...eventData.organizationRatings] : [];
        const existingRatingIndex = organizationRatings.findIndex((r: OrganizationRating) => r.ratedBy === userId);
        const newRatingEntry: OrganizationRating = { ratedBy: userId, score: numericScore, ratedAt: Timestamp.now() };

        if (existingRatingIndex > -1) {
            console.log(`User ${userId} updating organization rating for ${eventId}.`);
            organizationRatings[existingRatingIndex] = newRatingEntry;
        } else {
            organizationRatings.push(newRatingEntry);
        }

        await updateDoc(eventRef, { organizationRatings, lastUpdatedAt: Timestamp.now() });
        dispatch('updateLocalEvent', { id: eventId, changes: { organizationRatings } }); // Use helper
        console.log(`Organization rating (${numericScore}) submitted for ${eventId} by ${userId}.`);
    } catch (error: any) {
        console.error(`Error submitting organization rating for ${eventId}:`, error);
        throw error;
    }
}

// --- ACTION: Permanently Close Event and Award XP (Admin Only) ---
// This is the public action that performs checks and calls the internal logic
export async function closeEventPermanently(context: ActionContext<EventState, RootState>, { eventId }: { eventId: string }): Promise<CloseEventResult> {
    const { rootGetters } = context; // Get rootGetters from context
    const currentUser: User | null = rootGetters['user/getUser'];

    // Authorization check
    if (currentUser?.role !== 'Admin') {
        throw new Error("Unauthorized: Only Admins can permanently close events.");
    }

    // Delegate the actual logic to the internal function
    try {
         return await closeEventPermanentlyInternal(context, eventId);
    } catch (error: any) {
         console.error(`Caught error in closeEventPermanently action for ${eventId}:`, error);
         // Ensure a standard error format is thrown
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