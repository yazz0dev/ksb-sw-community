// src/store/modules/events/actions.ratings.ts
import { ActionContext } from 'vuex';
import { EventState } from '@/types/event';
import { RootState } from '@/types/store';
import { doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/firebase';
import { User } from '@/types/user';

export async function toggleRatingsOpen({ dispatch }: ActionContext<EventState, RootState>, { eventId, open }: { eventId: string; open: boolean }): Promise<void> {
    if (!eventId) throw new Error('Event ID required.');
    const eventRef = doc(db, 'events', eventId);
    try {
        await updateDoc(eventRef, { ratingsOpen: open, lastUpdatedAt: Timestamp.now() });
        dispatch('updateLocalEvent', { id: eventId, changes: { ratingsOpen: open } });
    } catch (error: any) {
        throw error;
    }
}

// submitTeamCriteriaRating removed as teamCriteriaRatings is deprecated. Use submitTeamCriteriaVote for all XP/selection logic.

export async function submitIndividualWinnerVote({ rootGetters, dispatch }: ActionContext<EventState, RootState>, { eventId, winnerId, vote }: { eventId: string; winnerId: string; vote: boolean }): Promise<void> {
    if (!eventId || !winnerId) throw new Error('Missing required parameters.');
    const eventRef = doc(db, 'events', eventId);
    const currentUser: User | null = rootGetters['user/getUser'];
    const userId = currentUser?.uid;
    if (!userId) throw new Error("User not authenticated.");
    try {
        // For simplicity, just append vote; deduplication logic can be added as needed
        await updateDoc(eventRef, {
            [`individualWinnerVotes.${winnerId}.${userId}`]: vote,
            lastUpdatedAt: Timestamp.now()
        });
        dispatch('updateLocalEvent', { id: eventId, changes: { /* structure may vary */ } });
    } catch (error: any) {
        throw error;
    }
}

export async function submitTeamCriteriaVote(
  { rootGetters, dispatch }: ActionContext<EventState, RootState>,
  { eventId, selections }: { eventId: string; selections: { criteria: Record<string, string>, bestPerformer?: string } }
): Promise<void> {
  if (!eventId || !selections || !selections.criteria) throw new Error('Missing required parameters.');
  const eventRef = doc(db, 'events', eventId);
  const currentUser: User | null = rootGetters['user/getUser'];
  const userId = currentUser?.uid;
  if (!userId) throw new Error("User not authenticated.");
  try {
    // Build update object for all criteria votes
    const updateObj: Record<string, any> = { lastUpdatedAt: Timestamp.now() };
    for (const [constraintIndex, teamId] of Object.entries(selections.criteria)) {
      if (teamId) {
        updateObj[`criteria.${constraintIndex}.criteriaSelections.${userId}`] = teamId;
      }
    }
    // Optionally handle bestPerformer selection
    if (selections.bestPerformer) {
      updateObj[`bestPerformerSelections.${userId}`] = selections.bestPerformer;
    }
    await updateDoc(eventRef, updateObj);
    dispatch('updateLocalEvent', { id: eventId, changes: { /* structure may vary */ } });
  } catch (error: any) {
    throw error;
  }
}


export async function submitOrganizationRating({ rootGetters, dispatch }: ActionContext<EventState, RootState>, { eventId, score }: { eventId: string; score: number | string }): Promise<void> {
    if (!eventId) throw new Error('Event ID required.');
    const eventRef = doc(db, 'events', eventId);
    const currentUser: User | null = rootGetters['user/getUser'];
    const userId = currentUser?.uid;
    if (!userId) throw new Error("User not authenticated.");
    try {
        // Write both per-user and single field for compatibility
        await updateDoc(eventRef, {
            [`organizationRatings.${userId}`]: score,
            organizerRating: score,
            lastUpdatedAt: Timestamp.now()
        });
        dispatch('updateLocalEvent', { id: eventId, changes: { /* structure may vary */ } });
    } catch (error: any) {
        throw error;
    }
}


export async function findWinner({ }: ActionContext<EventState, RootState>, eventId: string): Promise<string | null> {
    if (!eventId) throw new Error('Event ID required.');
    const eventRef = doc(db, 'events', eventId);
    try {
        const eventSnap = await getDoc(eventRef);
        if (!eventSnap.exists()) throw new Error('Event not found.');
        const eventData = eventSnap.data() as any;
        // Winner finding logic (example: most votes in individualWinnerVotes)
        if (!eventData.individualWinnerVotes) return null;
        const votes = eventData.individualWinnerVotes;
        let maxVotes = 0;
        let winnerId: string | null = null;
        for (const candidateId in votes) {
            const totalVotes = Object.values(votes[candidateId] || {}).reduce((sum: number, v: any) => sum + (typeof v === 'number' ? v : 0), 0);
            if (totalVotes > maxVotes) {
                maxVotes = totalVotes;
                winnerId = candidateId;
            }
        }
        return winnerId;
    } catch (error: any) {
        throw error;
    }
}

export async function submitIndividualWinners({ rootGetters, dispatch }: ActionContext<EventState, RootState>, { eventId, winners }: { eventId: string; winners: string[] }): Promise<void> {
    if (!eventId) throw new Error('Event ID required.');
    const eventRef = doc(db, 'events', eventId);
    try {
        await updateDoc(eventRef, {
            individualWinners: winners,
            lastUpdatedAt: Timestamp.now()
        });
        dispatch('updateLocalEvent', { id: eventId, changes: { individualWinners: winners } });
    } catch (error: any) {
        throw error;
    }
}
