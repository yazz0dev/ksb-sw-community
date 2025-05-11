// src/store/events/actions.voting.ts
// Helper functions for rating actions.
import { doc, getDoc, updateDoc, Timestamp, writeBatch } from 'firebase/firestore'; // Removed arrayUnion/Remove, added writeBatch
import { db } from '@/firebase';
import { Event, EventStatus, OrganizerRating, EventFormat, EventCriteria, Team } from '@/types/event'; // Added EventFormat, EventCriteria, Team
import { User } from '@/types/user'; // Assuming User type exists
// ADDED: Import constants
import { BEST_PERFORMER_LABEL } from '@/utils/constants';

/**
 * Toggle the voting open status of an event
 */
export async function togglevotingOpenInFirestore(
    eventId: string,
    open: boolean, // Parameter 'open' is a boolean
    userId: string
): Promise<void> {
    try {
        console.log(`Toggling voting status for ${eventId} to ${open ? 'open' : 'closed'}`);
        
        const eventRef = doc(db, 'events', eventId);
        
        // First fetch the current event to validate permissions and status
        const eventSnap = await getDoc(eventRef);
        if (!eventSnap.exists()) {
            throw new Error('Event not found.');
        }
        
        const eventData = eventSnap.data() as Event;
        console.log('Current event data:', {
            eventId,
            status: eventData.status,
            votingOpen: eventData.votingOpen,
            organizers: eventData.details?.organizers,
            requestedBy: eventData.requestedBy,
            userId
        });
        
        // Validate user is an organizer
        const isOrganizer = eventData.details?.organizers?.includes(userId) || eventData.requestedBy === userId;
        if (!isOrganizer) {
            throw new Error('Only event organizers can modify voting status.');
        }
        
        // Validate event status
        const validStatus = [EventStatus.Completed, EventStatus.InProgress].includes(eventData.status as EventStatus);
        if (!validStatus) {
            throw new Error(`Invalid event status: ${eventData.status}. Must be Completed or InProgress.`);
        }
        
        // Validate the voting state is changing (comparison with existing boolean value)
        if (eventData.votingOpen === open) {
            throw new Error(`Voting is already ${open ? 'open' : 'closed'}.`);
        }
        
        // Update with the boolean value 'open'
        await updateDoc(eventRef, {
            votingOpen: open
        });
        
        console.log(`Successfully set voting status for ${eventId} to ${open ? 'open' : 'closed'}`);
    } catch (error) {
        console.error(`Firestore togglevotingOpen error for ${eventId}:`, error);
        console.log("Firebase permission denied. Check Firestore rules and user authentication.");
        throw error;
    }
}

/**
 * Submits a user's vote/selection for team event criteria in Firestore.
 * Uses dot notation to update nested maps within the 'criteria' array elements and 'bestPerformerSelections' map.
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
        // Comparison eventData.votingOpen as a boolean
        if (eventData.status !== EventStatus.Completed || !eventData.votingOpen) {
            throw new Error("Selections can only be submitted for completed events with open voting.");
        }
        // Additional checks: is user a participant?
        const isParticipant = eventData.teams?.some(team => team.members?.includes(userId));
        if (!isParticipant) throw new Error("Only team participants can submit selections.");

        // Create a single object for all updates
        const updateData: Record<string, any> = {
            // Always include lastUpdatedAt with the same timestamp value
            lastUpdatedAt: Timestamp.now()
        };
        
        let hasActualVoteData = false;

        // Process criteria selections
        if (Array.isArray(eventData.criteria)) {
            eventData.criteria.forEach((criterion, index) => {
                const indexStr = String(criterion.constraintIndex);
                if (selections.criteria[indexStr] !== undefined) { // User made a selection (or cleared one) for this criterion
                    const path = `criteria.${index}.criteriaSelections.${userId}`;
                    updateData[path] = selections.criteria[indexStr] || null; // Set null to clear vote
                    hasActualVoteData = true; 
                }
            });
        }

        // Add best performer selection
        if (selections.bestPerformer !== undefined) { // Check if bestPerformer selection was made or cleared
            const bestPerformerPath = `bestPerformerSelections.${userId}`;
            updateData[bestPerformerPath] = selections.bestPerformer || null;
            hasActualVoteData = true;
        }
        
        // Only proceed with the update if there's actual vote data to submit
        // or if it's a scenario where just updating lastUpdatedAt is intended (though rules might prevent this alone).
        // The security rule `hasAny(['criteria', 'bestPerformerSelections'])` means we MUST affect one of those.
        if (!hasActualVoteData) {
            // If the user submitted no changes (e.g. an empty form), and there were no previous votes to clear,
            // we might not need to write to Firestore at all, or the rules will block it.
            // For now, let's log this and not proceed with the write if no actual vote changes.
            // This assumes clearing a vote is still a "vote".
            console.log(`Firestore: No actual vote changes to submit for event ${eventId} by user ${userId}. Skipping Firestore write.`);
            // Optionally, you could throw an error here if submitting an "empty" vote is not allowed by business logic.
            // Example: throw new Error("No selections made.");
            return; // Exit if no actual vote data, preventing an update with only lastUpdatedAt
        }

        // Single updateDoc call with all changes
        await updateDoc(eventRef, updateData);

        console.log(`Firestore: Team selections submitted by ${userId} for event ${eventId}.`);
    } catch (error: any) {
        console.error(`Firestore submitTeamCriteriaVote error for ${eventId}:`, error);
        throw new Error(`Failed to submit team selections: ${error.message}`);
    }
}

/**
 * Submits a user's vote/selection for individual event criteria winners in Firestore.
 * Uses dot notation to update nested maps within the 'criteria' array elements.
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
         // Comparison eventData.votingOpen as a boolean
         if (eventData.status !== EventStatus.Completed || !eventData.votingOpen) {
             throw new Error("Winner selection only available for completed events with open voting.");
         }
          // Additional checks: is user a participant?
         const isParticipant = eventData.participants?.includes(userId);
         if (!isParticipant) throw new Error("Only event participants can submit selections.");

         // Create a single object for all updates, always including lastUpdatedAt
         const updateData: Record<string, any> = {
             lastUpdatedAt: Timestamp.now()
         };
         let hasActualVoteData = false;

         // Update criteria selections within the criteria array
         if (Array.isArray(eventData.criteria)) {
             eventData.criteria.forEach((criterion, index) => {
                 const indexStr = String(criterion.constraintIndex);
                 if (winnerSelections[indexStr] !== undefined) { // User made a selection (or cleared one)
                     const selectedWinnerId = winnerSelections[indexStr];
                     
                     // Prevent voting for oneself
                     if (selectedWinnerId === userId) {
                         throw new Error("You cannot vote for yourself.");
                     }
                     
                     const path = `criteria.${index}.criteriaSelections.${userId}`;
                     updateData[path] = selectedWinnerId || null; // Set null to clear vote
                     hasActualVoteData = true;
                 }
             });
         }
         
         if (!hasActualVoteData) {
            console.log(`Firestore: No actual individual vote changes to submit for event ${eventId} by user ${userId}. Skipping Firestore write.`);
            return; 
        }

         // Single updateDoc call with all changes
         await updateDoc(eventRef, updateData);
         
         console.log(`Firestore: Individual selections submitted by ${userId} for event ${eventId}.`);
     } catch (error: any) {
         console.error(`Firestore submitIndividualWinnerVote error for ${eventId}:`, error);
         throw new Error(`Failed to submit individual selections: ${error.message}`);
     }
}

// Add a new function for manual winner selection by organizers
export async function submitManualWinnerSelectionInFirestore(eventId: string, organizerId: string, winnerSelections: Record<string, string[]>): Promise<void> {
    if (!eventId || !organizerId || typeof winnerSelections !== 'object') {
        throw new Error('Missing required parameters for manual winner selection.');
    }
    
    const eventRef = doc(db, 'events', eventId);
    try {
        // Fetch event to validate status and permissions
        const eventSnap = await getDoc(eventRef);
        if (!eventSnap.exists()) throw new Error('Event not found.');
        const eventData = eventSnap.data() as Event;
        
        // Only allow for completed events with closed voting
        if (eventData.status !== EventStatus.Completed) {
            throw new Error("Manual winner selection only available for completed events.");
        }
        
        // Check if user is an organizer
        const isOrganizer = eventData.details?.organizers?.includes(organizerId) || eventData.requestedBy === organizerId;
        if (!isOrganizer) throw new Error("Only event organizers can manually select winners.");
        
        // Update winners directly
        await updateDoc(eventRef, { 
            winners: winnerSelections,
            manuallySelectedBy: organizerId
        });
        
        console.log(`Firestore: Manual winner selection submitted by organizer ${organizerId} for event ${eventId}.`);
    } catch (error: any) {
        console.error(`Firestore submitManualWinnerSelection error for ${eventId}:`, error);
        throw new Error(`Failed to submit manual winner selection: ${error.message}`);
    }
}

/**
 * Adds or updates an organizer rating for a specific user in Firestore.
 * Reads the existing array, modifies it locally, and writes it back to ensure uniqueness.
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
        // Fetch event for validation and current voting
        const eventSnap = await getDoc(eventRef);
        if (!eventSnap.exists()) throw new Error('Event not found.');
        const eventData = eventSnap.data() as Event;

        // --- Validation ---
        if (eventData.status !== EventStatus.Completed) throw new Error("Can only rate completed events.");
        if (eventData.details?.organizers?.includes(userId)) throw new Error("Organizers cannot rate their own event.");
        // Check if user participated (individual or team)
        const isParticipant = (eventData.participants?.includes(userId) || eventData.teams?.some(t => t.members?.includes(userId)));
        if (!isParticipant) throw new Error("Only event participants can rate organizers.");
        // --- End Validation ---

        const newRating: OrganizerRating = { userId, rating: score };
        if (feedback?.trim()) newRating.feedback = feedback.trim(); // Add trimmed feedback if provided

        // Ensure organizerRating is always an array, even if it doesn't exist in Firestore yet
        const currentRatings = Array.isArray(eventData.organizerRating) ? [...eventData.organizerRating] : [];

        // Find index of existing rating by this user
        const existingRatingIndex = currentRatings.findIndex(r => r.userId === userId);

        if (existingRatingIndex !== -1) {
            // Update existing rating
            currentRatings[existingRatingIndex] = newRating;
        } else {
            // Add new rating
            currentRatings.push(newRating);
        }

        // Overwrite the entire array in Firestore
        await updateDoc(eventRef, {
            organizerRating: currentRatings
        });

        console.log(`Firestore: Organizer rating submitted/updated by ${userId} for event ${eventId}.`);
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
    const criteriaArray = Array.isArray(eventData.criteria) ? eventData.criteria : [];

    if (criteriaArray.length === 0) {
        console.warn(`Cannot calculate winners for event ${eventData.id}: No criteria defined.`);
        return {};
    }

    // Calculate winners for each standard criterion
    for (const criterion of criteriaArray) {
        // Skip the special 'Best Performer' if it exists in criteria array
        if (criterion.constraintLabel === BEST_PERFORMER_LABEL) continue;
         // Skip invalid criteria
        if (typeof criterion.constraintIndex !== 'number') {
            console.warn(`Skipping criterion due to invalid constraintIndex:`, criterion);
            continue;
        };

        // Ensure selections exist and is an object
        const selections = (criterion.criteriaSelections && typeof criterion.criteriaSelections === 'object') ? criterion.criteriaSelections : {};
        const voteCounts: Record<string, number> = {}; // ID (teamName or participantId) -> vote count

        Object.values(selections).forEach(selectedId => {
            if (selectedId) { // selectedId is the teamName or participantId voted for
                voteCounts[selectedId] = (voteCounts[selectedId] || 0) + 1;
            }
        });

        // Find winner(s) for this criterion
        let maxVotes = 0;
        let winnersForCriterion: string[] = [];
        for (const [id, count] of Object.entries(voteCounts)) {
            if (count > maxVotes) {
                maxVotes = count;
                winnersForCriterion = [id];
            } else if (count === maxVotes && maxVotes > 0) { // Handle ties
                winnersForCriterion.push(id);
            }
        }

        if (winnersForCriterion.length > 0) {
            finalWinners[criterion.constraintLabel || `criterion_${criterion.constraintIndex}`] = winnersForCriterion;
        }
    }

    // Calculate Best Performer winner (Team events only)
    const bestSelections = (eventData.bestPerformerSelections && typeof eventData.bestPerformerSelections === 'object') ? eventData.bestPerformerSelections : {};
    if (eventData.details.format === EventFormat.Team) { // Use imported EventFormat
        const bestPerformerCounts: Record<string, number> = {};
        Object.values(bestSelections).forEach(selectedUserId => { // selectedUserId is the user ID voted as best performer
            if (selectedUserId) {
                bestPerformerCounts[selectedUserId] = (bestPerformerCounts[selectedUserId] || 0) + 1;
            }
        });
        let maxVotes = 0;
        let bestPerformers: string[] = []; // Array of user IDs
        for (const [userId, count] of Object.entries(bestPerformerCounts)) {
            if (count > maxVotes) {
                maxVotes = count;
                bestPerformers = [userId];
            } else if (count === maxVotes && maxVotes > 0) { // Handle ties
                bestPerformers.push(userId);
            }
        }
        if (bestPerformers.length > 0) {
            finalWinners[BEST_PERFORMER_LABEL] = bestPerformers; // Store array of winner user IDs
        }
    }

    return finalWinners;
}

/**
 * Saves the calculated winners back to the event document in Firestore.
 * @param eventId - The ID of the event.
 * @param winners - The map of winners calculated by calculateWinnersFromVotes.
 * @returns Promise<void>
 * @throws Error if Firestore update fails or permissions invalid.
 */
export async function saveWinnersToFirestore(eventId: string, winners: Record<string, string[]>): Promise<void> {
    if (!eventId) throw new Error('Event ID required.');
    if (typeof winners !== 'object' || winners === null) throw new Error('Winners data is invalid.');

    const eventRef = doc(db, 'events', eventId);
    try {
        await updateDoc(eventRef, {
            winners: winners,
        });
        console.log(`Firestore: Winners saved for event ${eventId}.`);
    } catch (error: any) {
        console.error(`Firestore saveWinners error for ${eventId}:`, error);
        throw new Error(`Failed to save winners: ${error.message}`);
    }
}