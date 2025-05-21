// src/store/events/actions.voting.ts
// Helper functions for rating actions.
import { doc, getDoc, updateDoc, Timestamp, writeBatch, arrayUnion, runTransaction } from 'firebase/firestore'; // Removed arrayUnion/Remove, added writeBatch
import { db } from '@/firebase';
import { Event, EventCriteria, OrganizerRating, Team, Submission, EventStatus } from '@/types/event'; // Added Submission
import { User } from '@/types/user';
import { BEST_PERFORMER_LABEL } from '@/utils/constants';
import { mapFirestoreToEventData } from '@/utils/eventDataMapper'; // Import mapper

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
        
        const eventData = mapFirestoreToEventData(eventSnap.id, eventSnap.data());
        if (!eventData) throw new Error('Failed to map event data.');

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
            votingOpen: open,
            lastUpdatedAt: Timestamp.now() // ADDED
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
export async function submitTeamCriteriaVoteInFirestore(
    eventId: string,
    userId: string,
    selections: { criteria: Record<string, string>; bestPerformer?: string }
): Promise<void> {
    if (!eventId || !userId) throw new Error("Event ID and User ID are required.");
    if (!selections || typeof selections.criteria !== 'object' || Object.keys(selections.criteria).length === 0) {
        throw new Error("Criteria selections are required.");
    }

    const eventRef = doc(db, 'events', eventId);
    const batch = writeBatch(db);

    try {
        const eventSnap = await getDoc(eventRef);
        if (!eventSnap.exists()) throw new Error('Event not found.');
        const eventData = mapFirestoreToEventData(eventSnap.id, eventSnap.data());
        if (!eventData) throw new Error('Failed to map event data.');

        // Validation
        if (eventData.status !== EventStatus.Completed && eventData.status !== EventStatus.InProgress) {
            throw new Error("Voting is only allowed for 'Completed' or 'In Progress' events.");
        }
        if (!eventData.votingOpen) throw new Error("Voting is currently closed for this event.");
        if (eventData.details.format !== EventFormat.Team) throw new Error("Team criteria voting only for team events.");
        if (!eventData.participants?.includes(userId) && !eventData.teams?.some(t => t.members.includes(userId))) {
            throw new Error("Only event participants or team members can vote.");
        }

        // Prepare updates for criteria selections
        (eventData.criteria || []).forEach((criterion, index) => {
            const selectedTeamName = selections.criteria[criterion.constraintKey]; // Use constraintKey
            if (selectedTeamName) {
                // Ensure votes map exists for the criterion at this index
                // This check might be redundant if Firestore automatically creates nested maps, but good for clarity
                if (!eventData.criteria?.[index]?.votes) {
                    // This part is tricky with batch updates. 
                    // It's generally better to ensure the structure exists or handle it server-side with rules/functions.
                    // For client-side, if `criteria[index].votes` might not exist, it's safer to fetch, update locally, then set the whole criteria array.
                    // However, given the current structure, we assume `votes` can be an empty map and Firestore handles path creation.
                }
                const fieldPath = `criteria.${index}.votes.${userId}`;
                batch.update(eventRef, { [fieldPath]: selectedTeamName });
            }
        });

        // Prepare update for best performer selection if provided
        if (selections.bestPerformer) {
            // Similar to above, ensure `bestPerformerSelections` map exists or Firestore handles path creation.
            const bestPerformerFieldPath = `bestPerformerSelections.${userId}`;
            batch.update(eventRef, { [bestPerformerFieldPath]: selections.bestPerformer });
        }
        
        batch.update(eventRef, { lastUpdatedAt: Timestamp.now() });

        await batch.commit();
        console.log(`Firestore: Vote submitted by ${userId} for event ${eventId}.`);

    } catch (error: any) {
        console.error(`Firestore submitTeamCriteriaVote error for ${eventId}:`, error);
        throw new Error(`Failed to submit vote: ${error.message}`);
    }
}

/**
 * Submits a user's vote for an individual winner in Firestore.
 * @param eventId - The ID of the event.
 * @param userId - The UID of the user submitting the vote.
 * @param selectedWinnerId - The UID of the user selected as the winner.
 * @returns Promise<void>
 * @throws Error if Firestore update fails or permissions/state invalid.
 */
export async function submitIndividualWinnerVoteInFirestore(
    eventId: string,
    userId: string,
    selectedWinnerId: string 
): Promise<void> {
    if (!eventId || !userId || !selectedWinnerId) { // Check selectedWinnerId
        throw new Error("Event ID, User ID, and Selected Winner ID are required.");
    }

    const eventRef = doc(db, 'events', eventId);
    try {
        const eventSnap = await getDoc(eventRef);
        if (!eventSnap.exists()) throw new Error('Event not found.');
        const eventData = mapFirestoreToEventData(eventSnap.id, eventSnap.data());
        if (!eventData) throw new Error('Failed to map event data.');

        // Validation
        if (eventData.status !== EventStatus.Completed && eventData.status !== EventStatus.InProgress) {
            throw new Error("Voting is only allowed for 'Completed' or 'In Progress' events.");
        }
        if (!eventData.votingOpen) throw new Error("Voting is currently closed for this event.");
        if (eventData.details.format === EventFormat.Team) {
            throw new Error("Individual winner voting not applicable for team events. Use team criteria voting.");
        }
        if (!eventData.participants?.includes(userId)) {
            throw new Error("Only event participants can vote.");
        }
        if (!eventData.participants?.includes(selectedWinnerId)) {
            throw new Error("Selected winner must be a participant in the event.");
        }

        // Update using dot notation for the bestPerformerSelections map
        // For individual events, the winner is typically stored in a way that reflects a single overall winner.
        // Using `bestPerformerSelections` might be okay if the UI/logic treats it as the overall winner.
        // If a different field like `overallWinnerSelections` is intended, this path should change.
        const fieldPath = `bestPerformerSelections.${userId}`;
        await updateDoc(eventRef, {
            [fieldPath]: selectedWinnerId, // Store the selected winner ID
            lastUpdatedAt: Timestamp.now()
        });

        console.log(`Firestore: Individual winner vote by ${userId} for ${selectedWinnerId} in event ${eventId}.`);

    } catch (error: any) {
        console.error(`Firestore submitIndividualWinnerVote error for ${eventId}:`, error);
        throw new Error(`Failed to submit individual winner vote: ${error.message}`);
    }
}

/**
 * Submits an organizer rating for an event in Firestore.
 * @param eventId - The ID of the event.
 * @param userId - The UID of the user submitting the rating.
 * @param ratingData - The rating data (score, comment).
 * @returns Promise<void>
 * @throws Error if Firestore update fails or permissions/state invalid.
 */
export async function submitOrganizationRatingInFirestore(
    eventId: string,
    userId: string,
    ratingData: { score: number; comment?: string } 
): Promise<void> {
    if (!eventId || !userId) throw new Error("Event ID and User ID are required.");
    // Validate score from ratingData object
    if (!ratingData || typeof ratingData.score !== 'number' || ratingData.score < 1 || ratingData.score > 5) {
        throw new Error("Valid rating score (1-5) is required.");
    }

    const eventRef = doc(db, 'events', eventId);
    try {
        const eventSnap = await getDoc(eventRef);
        if (!eventSnap.exists()) throw new Error('Event not found.');
        const eventData = mapFirestoreToEventData(eventSnap.id, eventSnap.data());
        if (!eventData) throw new Error('Failed to map event data.');

        // Validation
        if (eventData.status !== EventStatus.Completed) {
            throw new Error("Ratings can only be submitted for 'Completed' events.");
        }
        if (!eventData.participants?.includes(userId) && !eventData.teams?.some(t => t.members.includes(userId))) {
            throw new Error("Only event participants or team members can submit ratings.");
        }
        const existingRating = eventData.organizerRating?.find(r => r.userId === userId);
        if (existingRating) throw new Error("You have already submitted a rating for this event.");

        const newRating: OrganizerRating = {
            userId,
            score: ratingData.score, // Use score from ratingData
            comment: ratingData.comment || null, // Use comment from ratingData
            ratedAt: Timestamp.now(),
        };

        // Firestore's arrayUnion correctly adds to the array or creates it if it doesn't exist.
        await updateDoc(eventRef, {
            organizerRating: arrayUnion(newRating),
            lastUpdatedAt: Timestamp.now()
        });

        console.log(`Firestore: Organizer rating submitted by ${userId} for event ${eventId}.`);

    } catch (error: any) {
        console.error(`Firestore submitOrganizationRating error for ${eventId}:`, error);
        throw new Error(`Failed to submit organization rating: ${error.message}`);
    }
}

/**
 * Calculates winners based on votes stored in Firestore.
 * This function reads vote data but does NOT write back to Firestore.
 * @param eventId - The ID of the event.
 * @returns Promise<Record<string, string | string[]>> - Object mapping criteria keys/best performer to winner(s).
 * @throws Error if event not found, not completed, or calculation fails.
 */
export async function calculateWinnersFromVotes(eventId: string): Promise<Record<string, string | string[]>> { // Parameter changed to eventId
    if (!eventId) throw new Error('Event ID required.');

    const eventRef = doc(db, 'events', eventId);
    try {
        const eventSnap = await getDoc(eventRef);
        if (!eventSnap.exists()) throw new Error('Event not found.');
        // Use the mapper to ensure data is in the correct structure
        const eventData = mapFirestoreToEventData(eventSnap.id, eventSnap.data());
        if (!eventData) throw new Error('Failed to map event data.');

        // Access eventData.details.format, eventData.criteria, eventData.bestPerformerSelections
        if (eventData.status !== EventStatus.Completed) {
            throw new Error("Winners can only be calculated for 'Completed' events.");
        }

        const results: Record<string, string | string[]> = {};

        // Calculate winners for each criterion (Team events)
        if (eventData.details.format === EventFormat.Team && eventData.criteria) {
            eventData.criteria.forEach(criterion => {
                if (!criterion.votes || Object.keys(criterion.votes).length === 0) return; // Skip if no votes for this criterion

                const voteCounts: Record<string, number> = {};
                Object.values(criterion.votes).forEach(teamName => {
                    voteCounts[teamName] = (voteCounts[teamName] || 0) + 1;
                });

                let maxVotes = 0;
                let winningTeams: string[] = [];
                for (const teamName in voteCounts) {
                    if (voteCounts[teamName] > maxVotes) {
                        maxVotes = voteCounts[teamName];
                        winningTeams = [teamName];
                    } else if (voteCounts[teamName] === maxVotes) {
                        winningTeams.push(teamName);
                    }
                }
                // Store single winner or array for ties
                results[criterion.constraintKey] = winningTeams.length === 1 ? winningTeams[0] : winningTeams;
            });
        }

        // Calculate Best Performer (Individual or Team events)
        if (eventData.bestPerformerSelections && Object.keys(eventData.bestPerformerSelections).length > 0) {
            const bestPerformerVotes: Record<string, number> = {};
            Object.values(eventData.bestPerformerSelections).forEach(selectedUserId => {
                // Ensure selectedUserId is a string before using as key
                if (typeof selectedUserId === 'string') {
                    bestPerformerVotes[selectedUserId] = (bestPerformerVotes[selectedUserId] || 0) + 1;
                }
            });

            let maxVotes = 0;
            let bestPerformers: string[] = [];
            for (const userId in bestPerformerVotes) {
                if (bestPerformerVotes[userId] > maxVotes) {
                    maxVotes = bestPerformerVotes[userId];
                    bestPerformers = [userId];
                } else if (bestPerformerVotes[userId] === maxVotes) {
                    bestPerformers.push(userId);
                }
            }
            results[BEST_PERFORMER_LABEL] = bestPerformers.length === 1 ? bestPerformers[0] : bestPerformers;
        }

        return results;

    } catch (error: any) {
        console.error(`Error calculating winners for event ${eventId}:`, error);
        throw new Error(`Failed to calculate winners: ${error.message}`);
    }
}

/**
 * Saves the calculated/manually selected winners to the event document in Firestore.
 * @param eventId - The ID of the event.
 * @param winners - An object mapping criteria keys/best performer to winner(s).
 * @param manuallySelectedBy - UID of admin/organizer if manually selected.
 * @returns Promise<void>
 * @throws Error if event not found or Firestore update fails.
 */
export async function saveWinnersToFirestore(
    eventId: string, 
    winners: Record<string, string | string[]>, 
    manuallySelectedBy?: string
): Promise<void> {
    if (!eventId) throw new Error('Event ID required.');
    if (!winners || Object.keys(winners).length === 0) throw new Error('Winners data is required.');

    const eventRef = doc(db, 'events', eventId);
    try {
        const updatePayload: Record<string, any> = {
            winners,
            lastUpdatedAt: Timestamp.now() // ADDED
        };
        if (manuallySelectedBy) {
            updatePayload.manuallySelectedBy = manuallySelectedBy;
        }
        await updateDoc(eventRef, updatePayload);
        console.log(`Firestore: Winners saved for event ${eventId}.`);

    } catch (error: any) {
        console.error(`Firestore saveWinners error for ${eventId}:`, error);
        throw new Error(`Failed to save winners: ${error.message}`);
    }
}

/**
 * Submits manually selected winners for an event by an organizer.
 * @param eventId The ID of the event.
 * @param userId The UID of the organizer submitting the selection.
 * @param selections Object mapping criteria keys (or 'bestPerformer') to selected team name or user ID.
 *                   Example: { "criterion_1_key": "TeamAlpha", "bestPerformer": "user123" }
 * @returns Promise<void>
 */
export async function submitManualWinnerSelectionInFirestore(
    eventId: string,
    userId: string, // Organizer's UID
    // Changed selections from Record<string, string[]> to Record<string, string>
    // This implies one winner per category/best performer, no ties in manual selection.
    selections: Record<string, string> 
): Promise<void> {
    if (!eventId || !userId) throw new Error("Event ID and User ID are required.");
    if (!selections || Object.keys(selections).length === 0) {
        throw new Error("Winner selections are required.");
    }

    const eventRef = doc(db, 'events', eventId);
    try {
        const eventSnap = await getDoc(eventRef);
        if (!eventSnap.exists()) throw new Error('Event not found.');
        const eventData = mapFirestoreToEventData(eventSnap.id, eventSnap.data());
        if (!eventData) throw new Error('Failed to map event data.');

        // Permission & State Validation
        const isOrganizer = eventData.details?.organizers?.includes(userId) || eventData.requestedBy === userId;
        if (!isOrganizer) {
            throw new Error("Only event organizers can manually select winners.");
        }
        if (eventData.status !== EventStatus.Completed) {
            throw new Error("Manual winner selection is only allowed for 'Completed' events.");
        }
        // Optional: Check if voting was open and if it should be closed first
        // if (eventData.votingOpen) {
        //     throw new Error("Voting must be closed before manually selecting winners.");
        // }

        // Validate selections against event criteria and participants/teams
        for (const key in selections) {
            const selectedValue = selections[key];
            if (key === BEST_PERFORMER_LABEL) {
                // Access format from eventData.details.format
                if (eventData.details.format === EventFormat.Team) {
                    // If team event, best performer should be a user from one of the teams
                    const allTeamMembers = eventData.teams?.flatMap(t => t.members.map(m => m.userId)) || []; // Assuming members is array of {userId: string}
                    if (!allTeamMembers.includes(selectedValue)) {
                        throw new Error(`Selected best performer (${selectedValue}) is not a member of any team in this event.`);
                    }
                } else {
                    // If individual event, best performer should be a participant
                    if (!eventData.participants?.includes(selectedValue)) {
                        throw new Error(`Selected best performer (${selectedValue}) is not a participant in this event.`);
                    }
                }
            } else {
                // This is a criteria-based selection, should be a team name
                // Access criteria from eventData.criteria
                const criterionExists = eventData.criteria?.some(c => c.constraintKey === key);
                if (!criterionExists) {
                    throw new Error(`Invalid criterion key provided: ${key}`);
                }
                // Access teams from eventData.teams
                const teamExists = eventData.teams?.some(t => t.teamName === selectedValue);
                if (!teamExists) {
                    throw new Error(`Selected team (${selectedValue}) for criterion ${key} does not exist in this event.`);
                }
            }
        }

        // Update Firestore with the manual selections
        // This will overwrite any existing winners from voting.
        await updateDoc(eventRef, {
            winners: selections, // Winners are now Record<string, string>
            manuallySelectedBy: userId,
            votingOpen: false, // Ensure voting is closed
            lastUpdatedAt: Timestamp.now()
        });

        console.log(`Firestore: Manual winner selection by ${userId} for event ${eventId} saved.`);

    } catch (error: any) {
        console.error(`Firestore submitManualWinnerSelection error for ${eventId}:`, error);
        throw new Error(`Failed to submit manual winner selection: ${error.message}`);
    }
}

/**
 * Records an organizer's rating for an event in Firestore.
 * @param eventId - The ID of the event.
 * @param userId - The UID of the user submitting the rating.
 * @param ratingData - The rating data (score, feedback).
 * @returns Promise<void>
 * @throws Error if Firestore update fails or permissions/state invalid.
 */
export async function recordOrganizerRatingInFirestore(
    eventId: string,
    userId: string,
    ratingData: { score: number; feedback?: string }
): Promise<void> {
    if (!eventId || !userId) throw new Error("Event ID and User ID are required.");
    if (ratingData.score === undefined || ratingData.score < 1 || ratingData.score > 5) {
        throw new Error("Rating score must be between 1 and 5.");
    }

    const eventRef = doc(db, 'events', eventId);
    try {
        await runTransaction(db, async (transaction) => {
            const eventSnap = await transaction.get(eventRef);
            if (!eventSnap.exists()) throw new Error("Event not found.");

            const eventData = mapFirestoreToEventData(eventSnap.id, eventSnap.data());
            if (!eventData) throw new Error("Could not map event data.");

            if (eventData.status !== EventStatus.Completed && eventData.status !== EventStatus.Closed) {
                throw new Error("Organizer ratings can only be submitted for completed or closed events.");
            }

            // Check if user is a participant or team member (if applicable)
            const isParticipant = eventData.participants?.includes(userId) || 
                                  eventData.teamMembersFlat?.includes(userId);
            if (!isParticipant) {
                throw new Error("Only event participants can rate organizers.");
            }

            let organizerRatings = eventData.organizerRating || [];
            const existingRatingIndex = organizerRatings.findIndex(r => r.userId === userId);

            const newRating: OrganizerRating = {
                userId,
                score: ratingData.score, // Use score
                feedback: ratingData.feedback || null,
            };

            if (existingRatingIndex > -1) {
                organizerRatings[existingRatingIndex] = newRating;
            } else {
                organizerRatings.push(newRating);
            }

            transaction.update(eventRef, { 
                organizerRating: organizerRatings,
                lastUpdatedAt: Timestamp.now()
            });
        });
        console.log(`Firestore: Organizer rating recorded for event ${eventId} by user ${userId}.`);
    } catch (error: any) {
        console.error(`Error recording organizer rating for event ${eventId}:`, error);
        throw new Error(`Failed to record organizer rating: ${error.message}`);
    }
}

/**
 * Casts a vote for a criterion in an event.
 * This function updates the votes for a specific criterion, identified by its constraint key.
 * @param eventId - The ID of the event.
 * @param userId - The UID of the user casting the vote.
 * @param criteriaConstraintKey - The constraint key of the criterion being voted on.
 * @param selectedValue - The value selected by the user (e.g., team name).
 * @returns Promise<void>
 * @throws Error if Firestore update fails or permissions/state invalid.
 */
export async function castVoteInFirestore(
    eventId: string,
    userId: string,
    criteriaConstraintKey: string,
    selectedValue: string
): Promise<void> {
    if (!eventId || !userId || !criteriaConstraintKey || !selectedValue) {
        throw new Error("Event ID, User ID, criteria key, and selected value are required.");
    }

    const eventRef = doc(db, 'events', eventId);
    try {
        await runTransaction(db, async (transaction) => {
            const eventSnap = await transaction.get(eventRef);
            if (!eventSnap.exists()) throw new Error("Event not found.");

            const eventData = mapFirestoreToEventData(eventSnap.id, eventSnap.data());
            if (!eventData) throw new Error("Could not map event data.");

            if (!eventData.votingOpen) throw new Error("Voting is not open for this event.");

            // Check if user is an organizer (organizers typically cannot vote)
            if (eventData.details.organizers?.includes(userId)) {
                throw new Error("Organizers cannot vote in their own event.");
            }

            // Check if user is a participant or team member (if applicable)
            const isParticipantOrTeamMember = eventData.participants?.includes(userId) || 
                                            eventData.teamMembersFlat?.includes(userId);
            if (!isParticipantOrTeamMember) {
                throw new Error("Only registered participants or team members can vote.");
            }

            const criteriaIndex = eventData.criteria?.findIndex(c => c.constraintKey === criteriaConstraintKey);
            if (criteriaIndex === undefined || criteriaIndex === -1 || !eventData.criteria) {
                throw new Error(`Criteria with key '${criteriaConstraintKey}' not found.`);
            }

            const criterion = eventData.criteria[criteriaIndex];
            if (!criterion.votes) {
                criterion.votes = {}; // Initialize if undefined
            }
            criterion.votes[userId] = selectedValue;

            // Create a new array for criteria to ensure Firestore detects the change in the nested object
            const updatedCriteria = [...eventData.criteria];
            updatedCriteria[criteriaIndex] = criterion;

            transaction.update(eventRef, { 
                criteria: updatedCriteria,
                lastUpdatedAt: Timestamp.now()
            });
        });
        console.log(`Firestore: Vote cast by ${userId} for criteria ${criteriaConstraintKey} in event ${eventId}.`);
    } catch (error: any) {
        console.error(`Error casting vote for event ${eventId}:`, error);
        throw new Error(`Failed to cast vote: ${error.message}`);
    }
}

/**
 * Selects the best performer for an event.
 * This function allows an organizer to select a user as the best performer, typically based on overall performance.
 * @param eventId - The ID of the event.
 * @param userId - The UID of the organizer casting the selection.
 * @param selectedUserId - The UID of the user selected as the best performer.
 * @returns Promise<void>
 * @throws Error if Firestore update fails or permissions/state invalid.
 */
export async function selectBestPerformerInFirestore(
    eventId: string,
    userId: string,
    selectedUserId: string
): Promise<void> {
    if (!eventId || !userId || !selectedUserId) {
        throw new Error("Event ID, voting User ID, and selected User ID are required.");
    }

    const eventRef = doc(db, 'events', eventId);
    try {
        await runTransaction(db, async (transaction) => {
            const eventSnap = await transaction.get(eventRef);
            if (!eventSnap.exists()) throw new Error("Event not found.");

            const eventData = mapFirestoreToEventData(eventSnap.id, eventSnap.data());
            if (!eventData) throw new Error("Could not map event data.");

            if (!eventData.votingOpen) throw new Error("Voting for best performer is not open.");

            // Check if the voting user is an organizer
            if (!eventData.details.organizers?.includes(userId)) {
                throw new Error("Only organizers can select the best performer.");
            }

            // Check if the selected user is a participant or team member
            const isParticipantOrTeamMember = eventData.participants?.includes(selectedUserId) || 
                                            eventData.teamMembersFlat?.includes(selectedUserId);
            if (!isParticipantOrTeamMember) {
                throw new Error("Selected user is not a participant or team member of this event.");
            }

            let selections = eventData.bestPerformerSelections || {};
            selections[userId] = selectedUserId; // Record which organizer selected whom

            transaction.update(eventRef, { 
                bestPerformerSelections: selections,
                lastUpdatedAt: Timestamp.now()
            });
        });
        console.log(`Firestore: Best performer selection by ${userId} for ${selectedUserId} in event ${eventId}.`);
    } catch (error: any) {
        console.error(`Error selecting best performer for event ${eventId}:`, error);
        throw new Error(`Failed to select best performer: ${error.message}`);
    }
}

/**
 * Toggles the voting status for an event in Firestore.
 * @param eventId - The ID of the event.
 * @param open - Boolean indicating whether to open or close voting.
 * @param currentUser - The user attempting the action.
 * @returns Promise<void>
 */
export async function toggleVotingStatusInFirestore(eventId: string, open: boolean, currentUser: User | null): Promise<void> {
    if (!eventId) throw new Error('Event ID is required.');
    if (!currentUser?.uid) throw new Error('User not authenticated.');

    const eventRef = doc(db, 'events', eventId);
    try {
        const eventSnap = await getDoc(eventRef);
        if (!eventSnap.exists()) throw new Error('Event not found.');
        const eventData = mapFirestoreToEventData(eventSnap.id, eventSnap.data());
        if (!eventData) throw new Error('Could not map event data.');

        // Permission Check: Only organizers can toggle voting
        const isOrganizer = eventData.details.organizers?.includes(currentUser.uid) || eventData.requestedBy === currentUser.uid;
        if (!isOrganizer) {
            throw new Error('Only organizers can change voting status.');
        }

        // State Check: Cannot open voting for events that are not InProgress or Completed.
        // Can close voting for InProgress or Completed.
        if (open && ![EventStatus.InProgress, EventStatus.Completed].includes(eventData.status)) {
            throw new Error(`Cannot open voting for event in status '${eventData.status}'. Event must be InProgress or Completed.`);
        }
        if (!open && ![EventStatus.InProgress, EventStatus.Completed].includes(eventData.status)) {
             console.warn(`Voting is being closed for an event not InProgress or Completed (Status: ${eventData.status}). This is allowed but might be unusual.`);
        }
        // Cannot toggle voting if event is Closed
        if (eventData.status === EventStatus.Closed) {
            throw new Error("Cannot change voting status for a closed event.");
        }

        await updateDoc(eventRef, {
            votingOpen: open,
            lastUpdatedAt: Timestamp.now(),
        });
        console.log(`Firestore: Voting for event ${eventId} has been ${open ? 'opened' : 'closed'}.`);

        // Trigger notification
        if (isSupabaseConfigured()) {
            const notificationType = open ? 'voting_opened' : 'voting_closed';
            // Notify all participants and team members
            const targetUserIds = [
                ...(eventData.participants || []),
                ...(eventData.teamMembersFlat || [])
            ].filter((id, index, self) => id && self.indexOf(id) === index); // Unique, non-null IDs

            if (targetUserIds.length > 0) {
                invokePushNotification({
                    type: notificationType,
                    eventId,
                    eventName: eventData.details.eventName || 'Event',
                    targetUserIds,
                }).catch(pushError => console.error("Push notification failed:", pushError));
            }
        }

    } catch (error: any) {
        console.error(`Error toggling voting status for event ${eventId}:`, error);
        throw new Error(`Failed to toggle voting status: ${error.message}`);
    }
}


/**
 * Finalizes winners for the event based on votes and selections.
 * This function reads votes and best performer selections, determines winners,
 * and updates the event document with this information.
 * @param eventId - The ID of the event.
 * @param currentUser - The user attempting the action (must be an organizer).
 * @returns Promise<WinnerInfo> - The determined winner information.
 */
export async function finalizeWinnersInFirestore(eventId: string, currentUser: User | null): Promise<WinnerInfo> {
    if (!eventId) throw new Error('Event ID is required.');
    if (!currentUser?.uid) throw new Error('User not authenticated.');

    const eventRef = doc(db, 'events', eventId);
    try {
        const eventSnap = await getDoc(eventRef);
        if (!eventSnap.exists()) throw new Error('Event not found.');
        const eventData = mapFirestoreToEventData(eventSnap.id, eventSnap.data());
        if (!eventData) throw new Error('Could not map event data.');

        // Permission Check: Only organizers can finalize winners
        const isOrganizer = eventData.details.organizers?.includes(currentUser.uid) || eventData.requestedBy === currentUser.uid;
        if (!isOrganizer) {
            throw new Error('Only organizers can finalize winners.');
        }

        // State Check: Event must be Completed, and voting should ideally be closed.
        if (eventData.status !== EventStatus.Completed) {
            throw new Error("Winners can only be finalized for 'Completed' events.");
        }
        if (eventData.votingOpen) {
            console.warn(`Finalizing winners for event ${eventId} while voting is still open.`);
            // Optionally, force voting to close here, or throw an error
            // await toggleVotingStatusInFirestore(eventId, false, currentUser); // Example: force close
        }

        const winners: WinnerInfo = {};

        // 1. Determine winners based on criteria votes
        if (eventData.criteria && eventData.criteria.length > 0) {
            eventData.criteria.forEach(criterion => {
                if (criterion.votes && Object.keys(criterion.votes).length > 0) {
                    const voteCounts: { [selectedValue: string]: number } = {};
                    Object.values(criterion.votes).forEach(voteValue => {
                        voteCounts[voteValue] = (voteCounts[voteValue] || 0) + 1;
                    });

                    let maxVotes = 0;
                    let winningValues: string[] = [];
                    for (const value in voteCounts) {
                        if (voteCounts[value] > maxVotes) {
                            maxVotes = voteCounts[value];
                            winningValues = [value];
                        } else if (voteCounts[value] === maxVotes) {
                            winningValues.push(value);
                        }
                    }
                    // For criteria, the 'value' is often a teamId or participantId
                    if (winningValues.length > 0) {
                        winners[criterion.constraintKey] = winningValues; // Store all winners in case of a tie
                    }
                }
            });
        }

        // 2. Determine best performer based on organizer selections (if any)
        if (eventData.bestPerformerSelections && Object.keys(eventData.bestPerformerSelections).length > 0) {
            const performerVoteCounts: { [userId: string]: number } = {};
            Object.values(eventData.bestPerformerSelections).forEach(selectedUserId => {
                if (selectedUserId) { // Ensure selectedUserId is not null/undefined
                    performerVoteCounts[selectedUserId] = (performerVoteCounts[selectedUserId] || 0) + 1;
                }
            });

            let maxVotes = 0;
            let bestPerformers: string[] = [];
            for (const userId in performerVoteCounts) {
                if (performerVoteCounts[userId] > maxVotes) {
                    maxVotes = performerVoteCounts[userId];
                    bestPerformers = [userId];
                } else if (performerVoteCounts[userId] === maxVotes) {
                    bestPerformers.push(userId);
                }
            }
            if (bestPerformers.length > 0) {
                winners['bestPerformer'] = bestPerformers; // Could be multiple if tie in organizer votes
            }
        }
        
        // 3. Handle manually selected winners (if any and if this feature is used)
        // This part depends on how `manuallySelectedBy` and a potential `manualWinners` field would work.
        // For now, we assume `winners` object is authoritative if populated by votes/selections.
        // If `eventData.manuallySelectedBy` exists, it implies manual override or addition.
        // This example doesn't implement manual winner logic beyond what `winners` captures.

        if (Object.keys(winners).length === 0) {
            console.warn(`No winners could be determined for event ${eventId}. Check votes and selections.`);
            // Depending on policy, either throw an error or proceed with empty winners
            // throw new Error("No winners could be determined.");
        }

        // Update Firestore with the determined winners
        await updateDoc(eventRef, {
            winners: winners,
            lastUpdatedAt: Timestamp.now(),
            // Optionally, ensure voting is closed if it wasn't already
            // votingOpen: false 
        });

        console.log(`Firestore: Winners finalized for event ${eventId}:`, winners);

        // Trigger notification for winners (if applicable)
        if (isSupabaseConfigured() && Object.keys(winners).length > 0) {
            // Collect all unique winner IDs
            const allWinnerIds = Object.values(winners).flat().filter((id, index, self) => id && self.indexOf(id) === index);
            
            if (allWinnerIds.length > 0) {
                invokePushNotification({
                    type: 'event_winners_announced',
                    eventId,
                    eventName: eventData.details.eventName || 'Event',
                    targetUserIds: allWinnerIds,
                    // You might want to include more details about what they won
                }).catch(pushError => console.error("Winner announcement notification failed:", pushError));
            }
        }

        return winners;

    } catch (error: any) {
        console.error(`Error finalizing winners for event ${eventId}:`, error);
        throw new Error(`Failed to finalize winners: ${error.message}`);
    }
}