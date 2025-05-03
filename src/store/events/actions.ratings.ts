// src/store/events/actions.ratings.ts
// Helper functions for rating actions.
import { doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/firebase';
import { Event, EventStatus, OrganizerRating } from '@/types/event'; // Add OrganizerRating
import { User } from '@/types/user'; // Assuming User type exists

/**
 * Updates the ratingsOpen status for an event in Firestore.
 * @param eventId - The ID of the event.
 * @param open - Boolean indicating whether ratings should be open.
 * @returns Promise<void>
 * @throws Error if Firestore update fails.
 */
export async function toggleRatingsOpenInFirestore(eventId: string, open: boolean): Promise<void> {
    if (!eventId) throw new Error('Event ID required.');
    const eventRef = doc(db, 'events', eventId);
    try {
        // TODO: Add permission checks (organizer only?)
        await updateDoc(eventRef, { ratingsOpen: open, lastUpdatedAt: Timestamp.now() });
        console.log(`Firestore: Event ${eventId} ratings set to ${open ? 'Open' : 'Closed'}.`);
    } catch (error: any) {
        console.error(`Firestore toggleRatingsOpen error for ${eventId}:`, error);
        throw new Error(`Failed to toggle ratings status: ${error.message}`);
    }
}

/**
 * Submits a user's vote/selection for team event criteria in Firestore.
 * Uses dot notation to update nested maps.
 * @param eventId - The ID of the event.
 * @param userId - The UID of the user submitting the vote.
 * @param selections - Object containing criteria selections { criteria: { constraintIndex: teamName }, bestPerformer: userId }
 * @returns Promise<void>
 * @throws Error if Firestore update fails or permissions/state invalid.
 */
export async function submitTeamCriteriaVoteInFirestore(eventId: string, userId: string, selections: { criteria: Record<string, string>, bestPerformer?: string }): Promise<void> {
    if (!eventId || !userId || !selections || typeof selections.criteria !== 'object') {
        throw new Error('Missing required parameters for team vote.');
    }
    const eventRef = doc(db, 'events', eventId);
    try {
        // Fetch event to validate status and permissions
        const eventSnap = await getDoc(eventRef);
        if (!eventSnap.exists()) throw new Error('Event not found.');
        const eventData = eventSnap.data() as Event;
        if (eventData.status !== EventStatus.Completed || !eventData.ratingsOpen) {
            throw new Error("Selections can only be submitted for completed events with open ratings.");
        }
        // Add more checks: is user a participant?

        const updateObj: Record<string, any> = { lastUpdatedAt: Timestamp.now() };
        // Update criteria selections
        for (const [constraintIndex, teamId] of Object.entries(selections.criteria)) {
             // Use actual constraintIndex in the path
            updateObj[`criteria.${constraintIndex}.criteriaSelections.${userId}`] = teamId || null; // Set null to clear vote
        }
        // Update best performer selection
        updateObj[`bestPerformerSelections.${userId}`] = selections.bestPerformer || null; // Set null to clear vote

        await updateDoc(eventRef, updateObj);
        console.log(`Firestore: Team selections submitted by ${userId} for event ${eventId}.`);
    } catch (error: any) {
        console.error(`Firestore submitTeamCriteriaVote error for ${eventId}:`, error);
        throw new Error(`Failed to submit team selections: ${error.message}`);
    }
}

/**
 * Submits a user's vote/selection for individual event criteria winners in Firestore.
 * Uses dot notation to update nested maps.
 * @param eventId - The ID of the event.
 * @param userId - The UID of the user submitting the vote.
 * @param winnerSelections - Object mapping { constraintIndex: winnerId }.
 * @returns Promise<void>
 * @throws Error if Firestore update fails or permissions/state invalid.
 */
export async function submitIndividualWinnerVoteInFirestore(eventId: string, userId: string, winnerSelections: Record<string, string>): Promise<void> {
     if (!eventId || !userId || typeof winnerSelections !== 'object') {
         throw new Error('Missing required parameters for individual vote.');
     }
     const eventRef = doc(db, 'events', eventId);
     try {
         // Fetch event to validate status and permissions
         const eventSnap = await getDoc(eventRef);
         if (!eventSnap.exists()) throw new Error('Event not found.');
         const eventData = eventSnap.data() as Event;
         if (eventData.status !== EventStatus.Completed || !eventData.ratingsOpen) {
             throw new Error("Winner selection only available for completed events with open ratings.");
         }
          // Add more checks: is user a participant?

         const updateObj: Record<string, any> = { lastUpdatedAt: Timestamp.now() };
         for (const [constraintIndex, winnerId] of Object.entries(winnerSelections)) {
              // Use actual constraintIndex in the path
             updateObj[`criteria.${constraintIndex}.criteriaSelections.${userId}`] = winnerId || null; // Set null to clear vote
         }

         await updateDoc(eventRef, updateObj);
         console.log(`Firestore: Individual selections submitted by ${userId} for event ${eventId}.`);
     } catch (error: any) {
         console.error(`Firestore submitIndividualWinnerVote error for ${eventId}:`, error);
         throw new Error(`Failed to submit individual selections: ${error.message}`);
     }
}

/**
 * Adds or updates an organizer rating for a specific user in Firestore.
 * Uses arrayUnion/arrayRemove to manage the ratings array.
 * @param eventId - The ID of the event.
 * @param userId - The UID of the user submitting the rating.
 * @param score - The rating score (1-5).
 * @param feedback - Optional feedback text.
 * @returns Promise<void>
 * @throws Error if Firestore update fails or permissions/state invalid.
 */
export async function submitOrganizationRatingInFirestore(eventId: string, userId: string, score: number, feedback?: string): Promise<void> {
    if (!eventId || !userId) throw new Error('Event ID and User ID required.');
    if (typeof score !== 'number' || score < 1 || score > 5) throw new Error("Invalid rating score.");

    const eventRef = doc(db, 'events', eventId);
    try {
        // Fetch event for validation
        const eventSnap = await getDoc(eventRef);
        if (!eventSnap.exists()) throw new Error('Event not found.');
        const eventData = eventSnap.data() as Event;
        if (eventData.status !== EventStatus.Completed) throw new Error("Can only rate completed events.");
        if (eventData.details?.organizers?.includes(userId)) throw new Error("Organizers cannot rate their own event.");
        // Add check: is user a participant?

        const ratingData: OrganizerRating = { userId, rating: score };
        if (feedback) ratingData.feedback = feedback;

        // Atomically remove existing rating (if any) and add the new one
        // Note: This requires knowing the *exact* previous object structure if feedback changed.
        // A safer approach might be reading the array, filtering, adding, and writing back.
        // Simpler approach for now: Assume we overwrite/add. Firestore handles arrayUnion smartly.
        // To ensure only one rating per user, we might need a Cloud Function trigger or
        // structure ratings as a map: { [userId]: { rating: number, feedback?: string } }

        // Using arrayUnion/Remove (simpler, but might allow duplicates if exact object match fails)
        // 1. Try removing any previous rating with the same userId (best effort)
        await updateDoc(eventRef, {
            organizerRating: arrayRemove({ userId }) // This only works if score/feedback haven't changed
        }).catch(e => console.warn("Could not remove previous rating object, might not exist or structure differs:", e)); // Ignore remove error

         // 2. Add the new rating
         await updateDoc(eventRef, {
             organizerRating: arrayUnion(ratingData),
             lastUpdatedAt: Timestamp.now()
         });

        console.log(`Firestore: Organizer rating submitted by ${userId} for event ${eventId}.`);
    } catch (error: any) {
        console.error(`Firestore submitOrganizationRating error for ${eventId}:`, error);
        throw new Error(`Failed to submit organizer rating: ${error.message}`);
    }
}

/**
 * Calculates winners based on vote counts stored in criteriaSelections/bestPerformerSelections.
 * This function ONLY calculates, it does NOT write back to Firestore.
 * @param eventData - The full event data object.
 * @returns Promise<Record<string, string[]>> - A map where keys are criterion labels (or 'Best Performer') and values are arrays of winner IDs (user or team).
 * @throws Error if calculation is not possible (e.g., no criteria).
 */
export async function calculateWinnersFromVotes(eventData: Event): Promise<Record<string, string[]>> {
    const finalWinners: Record<string, string[]> = {};

    if (!eventData.criteria || eventData.criteria.length === 0) {
        console.warn(`Cannot calculate winners for event ${eventData.id}: No criteria defined.`);
        return {}; // Return empty if no criteria
    }

    // Calculate winners for each standard criterion
    for (const criterion of eventData.criteria) {
        // Skip the special 'Best Performer' if it exists in criteria array (it's handled separately)
        if (criterion.constraintLabel === BEST_PERFORMER_LABEL) continue;

        const selections = criterion.criteriaSelections || {};
        const voteCounts: Record<string, number> = {}; // ID (team or user) -> vote count

        Object.values(selections).forEach(selectedId => {
            if (selectedId) {
                voteCounts[selectedId] = (voteCounts[selectedId] || 0) + 1;
            }
        });

        // Find winner(s) for this criterion (handle ties)
        let maxVotes = 0;
        let winnersForCriterion: string[] = [];
        for (const [id, count] of Object.entries(voteCounts)) {
            if (count > maxVotes) {
                maxVotes = count;
                winnersForCriterion = [id];
            } else if (count === maxVotes && maxVotes > 0) {
                winnersForCriterion.push(id);
            }
        }

        if (winnersForCriterion.length > 0) {
            finalWinners[criterion.constraintLabel || `criterion_${criterion.constraintIndex}`] = winnersForCriterion;
        }
    }

    // Calculate Best Performer winner (Team events only)
    if (eventData.details.format === EventFormat.Team && eventData.bestPerformerSelections) {
        const bestPerformerCounts: Record<string, number> = {};
        Object.values(eventData.bestPerformerSelections).forEach(selectedId => {
            if (selectedId) {
                bestPerformerCounts[selectedId] = (bestPerformerCounts[selectedId] || 0) + 1;
            }
        });
        let maxVotes = 0;
        let bestPerformers: string[] = [];
        for (const [id, count] of Object.entries(bestPerformerCounts)) {
            if (count > maxVotes) {
                maxVotes = count;
                bestPerformers = [id];
            } else if (count === maxVotes && maxVotes > 0) {
                bestPerformers.push(id);
            }
        }
        if (bestPerformers.length > 0) {
            finalWinners[BEST_PERFORMER_LABEL] = bestPerformers;
        }
    }

    return finalWinners;
}

/**
 * Saves the calculated winners back to the event document in Firestore.
 * @param eventId - The ID of the event.
 * @param winners - The map of winners calculated by calculateWinnersFromVotes.
 * @returns Promise<void>
 * @throws Error if Firestore update fails.
 */
export async function saveWinnersToFirestore(eventId: string, winners: Record<string, string[]>): Promise<void> {
    if (!eventId) throw new Error('Event ID required.');
    if (typeof winners !== 'object' || winners === null) throw new Error('Winners data is invalid.');

    const eventRef = doc(db, 'events', eventId);
    try {
        // TODO: Add permission check (organizer only?)
        await updateDoc(eventRef, {
            winners: winners,
            lastUpdatedAt: Timestamp.now()
        });
        console.log(`Firestore: Winners saved for event ${eventId}.`);
    } catch (error: any) {
        console.error(`Firestore saveWinners error for ${eventId}:`, error);
        throw new Error(`Failed to save winners: ${error.message}`);
    }
}