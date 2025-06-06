import { 
  doc, 
  getDoc, 
  serverTimestamp,
  runTransaction,
  type Transaction
} from 'firebase/firestore';
import { db } from '@/firebase';
import { 
  EventStatus, 
  EventFormat,
  type EventCriteria,
  type OrganizerRating
} from '@/types/event';
import { type EnrichedStudentData, type UserData } from '@/types/student';
import { mapFirestoreToEventData } from '@/utils/eventDataUtils';
import { deepClone, isEmpty } from '@/utils/eventUtils';
import { BEST_PERFORMER_LABEL, EVENTS_COLLECTION } from '@/utils/constants';

/**
 * Submits a user's vote/selection for team event criteria in Firestore.
 * @param eventId - The ID of the event.
 * @param userId - The UID of the student submitting votes.
 * @param votes - Object containing criteria votes and/or best performer.
 */
export async function submitTeamCriteriaVoteInFirestore(
    eventId: string,
    userId: string,
    votes: { criteria: Record<string, string>; bestPerformer?: string }
): Promise<void> {
    if (!eventId || !userId) throw new Error("Event ID and User ID are required.");
    if (!votes || typeof votes.criteria !== 'object' || isEmpty(votes.criteria)) {
        throw new Error("Criteria votes are required and cannot be empty.");
    }

    const eventRef = doc(db, EVENTS_COLLECTION, eventId);
    try {
        await runTransaction(db, async (transaction: Transaction) => {
            const eventSnap = await transaction.get(eventRef);
            if (!eventSnap.exists()) throw new Error('Event not found in transaction.');
            
            const currentEventData = mapFirestoreToEventData(eventSnap.id, eventSnap.data());
            if (!currentEventData) throw new Error('Failed to map event data in transaction.');

            if (currentEventData.status !== EventStatus.Completed && currentEventData.status !== EventStatus.InProgress) {
                throw new Error("Voting is only allowed for 'Completed' or 'In Progress' events.");
            }
            if (!currentEventData.votingOpen) throw new Error("Voting is currently closed for this event.");
            if (currentEventData.details.format !== EventFormat.Team) throw new Error("Team criteria voting only for team events.");
            if (!currentEventData.participants?.includes(userId) && 
                !currentEventData.teamMemberFlatList?.includes(userId)) {
                throw new Error("Only event participants or team members can vote.");
            }

            let updatedCriteria = deepClone(currentEventData.criteria || []);
            
            Object.entries(votes.criteria).forEach(([constraintKey, selectedTeamName]) => {
                const constraintIndex = parseInt(constraintKey.replace('constraint', ''));
                if (isNaN(constraintIndex)) {
                    console.warn(`Could not parse a valid index from key: ${constraintKey}. Vote not recorded.`);
                    return;
                }

                const criterionIndex = updatedCriteria.findIndex(c => 
                    typeof c.constraintIndex === 'number' && c.constraintIndex === constraintIndex
                );
                
                if (criterionIndex !== -1) {
                    const criterion = updatedCriteria[criterionIndex];
                    if (!criterion) return;

                    if (!criterion.votes || typeof criterion.votes !== 'object') {
                        criterion.votes = {};
                    }
                    criterion.votes[userId] = selectedTeamName;
                } else {
                    console.warn(`Criterion with constraintIndex ${constraintIndex} not found for event ${eventId}. Vote not recorded.`);
                }
            });

            const updateData: any = {
                criteria: updatedCriteria,
                lastUpdatedAt: serverTimestamp()
            };

            if (votes.bestPerformer) {
                const currentBestPerformerSelections = currentEventData.bestPerformerSelections || {};
                updateData.bestPerformerSelections = {
                    ...currentBestPerformerSelections,
                    [userId]: votes.bestPerformer
                };
            }
            transaction.update(eventRef, updateData);
        });
    } catch (error: any) {
        throw new Error(error.message || `Failed to submit team criteria vote for event ${eventId}.`);
    }
}

/**
 * Submits a user's vote for the winner in an individual format event.
 * @param eventId - The ID of the event.
 * @param userId - The UID of the student submitting the vote.
 * @param selectedWinnerId - The UID of the selected winner.
 */
export async function submitIndividualWinnerVoteInFirestore(
    eventId: string,
    userId: string,
    selectedWinnerId: string
): Promise<void> {
    if (!eventId || !userId) throw new Error("Event ID and User ID are required.");
    if (!selectedWinnerId) throw new Error("Selected winner ID is required.");

    const eventRef = doc(db, EVENTS_COLLECTION, eventId);
    try {
        await runTransaction(db, async (transaction: Transaction) => {
            const eventSnap = await transaction.get(eventRef);
            if (!eventSnap.exists()) throw new Error('Event not found in transaction.');
            
            const currentEventData = mapFirestoreToEventData(eventSnap.id, eventSnap.data());
            if (!currentEventData) throw new Error('Failed to map event data in transaction.');

            if (currentEventData.status !== EventStatus.Completed && currentEventData.status !== EventStatus.InProgress) {
                throw new Error("Voting is only allowed for 'Completed' or 'In Progress' events.");
            }
            if (!currentEventData.votingOpen) throw new Error("Voting is currently closed for this event.");
            if (currentEventData.details.format !== EventFormat.Individual) {
                throw new Error("Individual winner voting only for individual format events.");
            }
            if (!currentEventData.participants?.includes(userId)) {
                throw new Error("Only event participants can vote for winners.");
            }
            if (!currentEventData.participants?.includes(selectedWinnerId)) {
                throw new Error("Selected winner must be a participant in the event.");
            }

            const currentBestPerformerSelections = currentEventData.bestPerformerSelections || {};
            transaction.update(eventRef, {
                bestPerformerSelections: {
                    ...currentBestPerformerSelections,
                    [userId]: selectedWinnerId
                },
                lastUpdatedAt: serverTimestamp()
            });
        });
    } catch (error: any) {
        throw new Error(error.message || `Failed to submit individual winner vote for event ${eventId}.`);
    }
}

/**
 * Records an organizer rating for an event using a Map structure.
 * @param payload - The data for the rating submission.
 */
export async function submitOrganizationRatingInFirestore(payload: {
    eventId: string;
    userId: string;
    score: number;
    feedback?: string | null;
}): Promise<void> {
    const { eventId, userId, score, feedback } = payload;
    if (!eventId || !userId) throw new Error("Event ID and User ID are required.");
    if (score < 1 || score > 5) throw new Error("Rating score must be between 1 and 5.");

    const eventRef = doc(db, EVENTS_COLLECTION, eventId);

    try {
        await runTransaction(db, async (transaction) => {
            const eventSnap = await transaction.get(eventRef);
            if (!eventSnap.exists()) throw new Error("Event not found.");
            
            const eventData = eventSnap.data();
            if (eventData.status !== EventStatus.Completed) {
                throw new Error("You can only rate organizers for completed events.");
            }

            const isParticipant = (eventData.participants || []).includes(userId) || 
                                  (eventData.teamMemberFlatList || []).includes(userId);

            if (!isParticipant) {
                throw new Error("Only event participants can rate organizers.");
            }

            const newRating: OrganizerRating = {
                userId: userId,
                rating: score,
                ratedAt: serverTimestamp() as any,
            };
            if (feedback) {
                newRating.feedback = feedback;
            }

            transaction.update(eventRef, {
                [`organizerRatings.${userId}`]: newRating,
                lastUpdatedAt: serverTimestamp()
            });
        });
    } catch (error: any) {
        console.error(`Error submitting rating for event ${eventId}:`, error);
        throw new Error(error.message || 'Failed to submit rating.');
    }
}

/**
 * Toggles the voting status (open/closed) for an event.
 * @param eventId - The ID of the event.
 * @param open - Boolean indicating whether to open or close voting.
 * @param currentUser - The user performing the action.
 */
export async function toggleVotingStatusInFirestore(eventId: string, open: boolean, currentUser: EnrichedStudentData | UserData | null): Promise<void> {
    if (!currentUser) throw new Error("Authentication required to change voting status.");
    if (!eventId) throw new Error("Event ID is required.");
    if (!currentUser?.uid) throw new Error("User performing action is required for permission check.");

    const eventRef = doc(db, EVENTS_COLLECTION, eventId);
    try {
        await runTransaction(db, async (transaction: Transaction) => {
            const eventSnap = await transaction.get(eventRef);
            if (!eventSnap.exists()) throw new Error("Event not found.");
            const eventData = mapFirestoreToEventData(eventSnap.id, eventSnap.data());
            if (!eventData) throw new Error("Failed to map event data.");

            const isOrganizer = eventData.details.organizers.includes(currentUser!.uid);

            if (!isOrganizer) {
                throw new Error("Permission denied. Only event organizers or admins can toggle voting status.");
            }

            if (open === true && (eventData.status === EventStatus.Closed || eventData.status === EventStatus.Cancelled)) {
                throw new Error(`Cannot open voting for an event that is already ${eventData.status}.`);
            }

            if (eventData.status !== EventStatus.InProgress && eventData.status !== EventStatus.Completed) {
                throw new Error(`Voting can only be toggled for 'In Progress' or 'Completed' events. Current status: ${eventData.status}`);
            }

            let statusUpdate = {};
            if (open === false && eventData.status === EventStatus.InProgress) {
                console.warn(`Voting closed for event ${eventId} while it was 'In Progress'. Consider updating event status to 'Completed'.`);
            }
            
            transaction.update(eventRef, {
                votingOpen: open,
                lastUpdatedAt: serverTimestamp(),
                ...statusUpdate
            });
        });
    } catch (error: any) {
        throw new Error(error.message || `Failed to toggle voting status for event ${eventId}.`);
    }
}

/**
 * Calculates winners from votes.
 * @param eventId - The ID of the event.
 * @returns A record where keys are criteria titles and values are winner IDs/names.
 */
export async function calculateWinnersFromVotes(eventId: string): Promise<Record<string, string | string[]>> {
    if (!eventId) throw new Error("Event ID is required.");

    const eventRef = doc(db, EVENTS_COLLECTION, eventId);
    const eventSnap = await getDoc(eventRef);
    if (!eventSnap.exists()) throw new Error("Event not found for calculating winners.");

    const eventData = mapFirestoreToEventData(eventSnap.id, eventSnap.data());
    if (!eventData) {
        throw new Error("Failed to map event data for calculating winners.");
    }

    const winners: Record<string, string | string[]> = {};

    // Calculate winners from criteria votes
    if (eventData.criteria && Array.isArray(eventData.criteria)) {
        eventData.criteria.forEach((criterion: EventCriteria) => {
            if (criterion.votes && !isEmpty(criterion.votes)) {
                const voteCounts: Record<string, number> = {};
                Object.values(criterion.votes).forEach((selectedEntityId: string) => {
                    voteCounts[selectedEntityId] = (voteCounts[selectedEntityId] || 0) + 1;
                });

                if (!isEmpty(voteCounts)) {
                    const maxVotes = Math.max(...Object.values(voteCounts));
                    const criterionWinners = Object.keys(voteCounts).filter(id => voteCounts[id] === maxVotes);
                    
                    const criterionKey = criterion.title?.trim() || `criterion_${criterion.constraintIndex || 'unknown'}`;
                    const winnerValue = criterionWinners.length === 1 ? criterionWinners[0] : criterionWinners;
                    if (winnerValue) {
                        winners[criterionKey] = winnerValue;
                    }
                }
            }
        });
    }

    // Calculate winner from bestPerformerSelections
    if (eventData.bestPerformerSelections && !isEmpty(eventData.bestPerformerSelections)) {
        const bestPerformerVoteCounts: Record<string, number> = {};
        Object.values(eventData.bestPerformerSelections).forEach((selectedUserId: string) => {
            bestPerformerVoteCounts[selectedUserId] = (bestPerformerVoteCounts[selectedUserId] || 0) + 1;
        });

        if (!isEmpty(bestPerformerVoteCounts)) {
            const maxVotes = Math.max(...Object.values(bestPerformerVoteCounts));
            const bestPerformers = Object.keys(bestPerformerVoteCounts).filter(id => bestPerformerVoteCounts[id] === maxVotes);
            const bestPerformerValue = bestPerformers.length === 1 ? bestPerformers[0] : bestPerformers;
            if (bestPerformerValue) {
                winners[BEST_PERFORMER_LABEL] = bestPerformerValue;
            }
        }
    }
    return winners;
}

/**
 * Allows an organizer to manually select/override winners for an event.
 * @param eventId - The ID of the event.
 * @param userId - The UID of the organizer performing the action.
 * @param votes - Record where key is criterion title, value is the selected winner's ID.
 */
export async function submitManualWinnerSelectionInFirestore(
    eventId: string,
    userId: string, 
    votes: Record<string, string> 
): Promise<void> {

    const eventRef = doc(db, EVENTS_COLLECTION, eventId);
    try {
        await runTransaction(db, async (transaction: Transaction) => {
            const eventSnap = await transaction.get(eventRef);
            if (!eventSnap.exists()) throw new Error('Event not found.');
            const eventData = mapFirestoreToEventData(eventSnap.id, eventSnap.data());
            if (!eventData) throw new Error('Failed to map event data.');

            const isOrganizer = eventData.details.organizers.includes(userId);
            if (!isOrganizer) throw new Error("Permission denied. Only event organizers or admins can manually select winners.");

            const newWinnersData: Record<string, string> = {};
            for (const [key, value] of Object.entries(votes)) { 
                if (typeof value === 'string') {
                    newWinnersData[key] = value;
                }
            }
            if (Object.keys(newWinnersData).length === 0 && Object.keys(votes).length > 0) { 
                throw new Error("Failed to populate winners data from selections."); 
            }

            transaction.update(eventRef, {
                winners: newWinnersData,
                manuallySelectedBy: userId,
                lastUpdatedAt: serverTimestamp()
            });
        });
    } catch (error: any) {
        throw new Error(error.message || `Failed to submit manual winner selection for event ${eventId}.`);
    }
}

/**
 * Finalizes winners for an event.
 * @param eventId - The ID of the event.
 * @param currentUser - The user performing the action.
 * @returns Promise<Record<string, string | string[]>> - The determined winners.
 */
export async function finalizeWinnersInFirestore(
    eventId: string, 
    currentUser: EnrichedStudentData | UserData | null
): Promise<Record<string, string | string[]>> {
    if (!eventId) throw new Error("Event ID required.");
    if (!currentUser?.uid) throw new Error("User performing action is required for permission check.");

    const eventRef = doc(db, EVENTS_COLLECTION, eventId);
    let finalWinners: Record<string, string | string[]> = {};

    try {
        await runTransaction(db, async (transaction: Transaction) => {
            const eventSnap = await transaction.get(eventRef);
            if (!eventSnap.exists()) throw new Error("Event not found.");
            const eventData = mapFirestoreToEventData(eventSnap.id, eventSnap.data());
            if (!eventData) throw new Error("Failed to map event data.");

            const isOrganizer = eventData.details.organizers.includes(currentUser.uid);
            if (!isOrganizer ) {
                throw new Error("Permission denied. Only event organizers or admins can finalize winners.");
            }

            if (eventData.status !== EventStatus.Completed) {
                throw new Error("Winners can only be finalized for 'Completed' events.");
            }
            if (eventData.votingOpen === true) {
                throw new Error("Voting must be closed before finalizing winners. Please close voting first.");
            }

            if (!isEmpty(eventData.winners)) {
                finalWinners = eventData.winners!;
                console.log(`Using pre-existing winners for event ${eventId}.`);
            } else {
                console.log(`No pre-existing winners found for event ${eventId}. Attempting to calculate from votes...`);
                finalWinners = await calculateWinnersFromVotes(eventId);
                if (isEmpty(finalWinners)) {
                    throw new Error("No winners could be determined from votes. Manual selection might be required.");
                }
            }
            
            const updatePayload: any = {
                winners: finalWinners,
                lastUpdatedAt: serverTimestamp()
            };

            transaction.update(eventRef, updatePayload);
        });
        
        return finalWinners;

    } catch (error: any) {
        throw new Error(error.message || `Failed to finalize winners for event ${eventId}.`);
    }
}
