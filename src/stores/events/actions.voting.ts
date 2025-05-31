// src/stores/events/actions.voting.ts
// Helper functions for rating actions.
import { doc, getDoc, updateDoc, Timestamp, arrayUnion, writeBatch, runTransaction, type Transaction, serverTimestamp } from 'firebase/firestore'; // Added serverTimestamp
import { db } from '@/firebase';
import { type Event, EventStatus, type EventCriterion, type Team, type Submission, type OrganizerRating, EventFormat } from '@/types/event'; // EventStatus and EventFormat are enums
import type { EnrichedStudentData } from '@/types/student'; // Changed from Student to EnrichedStudentData
// If User is from firebase/auth and local User type is not defined:
import type { User as FirebaseUser } from 'firebase/auth'; // Example if it's FirebaseUser

import { mapFirestoreToEventData, mapEventDataToFirestore } from '@/utils/eventDataMapper';
import { XPData, XpCalculationRoleKey, mapCalcRoleToFirestoreKey } from '@/types/xp'; // Added XP types
import { deepClone, isEmpty } from '@/utils/helpers'; // Corrected path to use alias

// Placeholder: Assume these are imported from a utility file like '@/utils/notifications'
const isSupabaseConfigured = () => true; // or false, depending on setup
const invokePushNotification = async (params: any) => { console.log('Push notification triggered:', params); };

const BEST_PERFORMER_LABEL = 'best_performer'; // Global constant for best performer key


/**
 * Submits a user's vote/selection for team event criteria in Firestore.
 * Uses dot notation to update nested maps within the 'criteria' array elements and 'bestPerformerSelections' map.
 * @param eventId - The ID of the event.
 * @param studentId - The UID of the student submitting selections.
 * @param selections - Object containing criteria selections and/or best performer.
 *                     `criteria`: { constraintIndexString: selectedEntityId }
 *                     `bestPerformer`: selectedStudentUid (for team events)
 */
export async function submitTeamCriteriaVoteInFirestore(
    eventId: string,
    userId: string,
    selections: { criteria: Record<string, string>; bestPerformer?: string }
): Promise<void> {
    if (!eventId || !userId) throw new Error("Event ID and User ID are required.");
    // Ensure selections.criteria is not empty
    if (!selections || typeof selections.criteria !== 'object' || isEmpty(selections.criteria)) {
        throw new Error("Criteria selections are required and cannot be empty.");
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
        if (eventData.details.format !== EventFormat.Team) throw new Error("Team criteria voting only for team events.");
        if (!eventData.participants?.includes(userId) && !eventData.teams?.some(t => t.members.includes(userId))) {
            throw new Error("Only event participants or team members can vote.");
        }

        // Use transaction instead of batch for better error handling
        await runTransaction(db, async (transaction) => {
            const eventSnap = await transaction.get(eventRef);
            if (!eventSnap.exists()) throw new Error('Event not found in transaction.');
            
            const currentEventData = mapFirestoreToEventData(eventSnap.id, eventSnap.data());
            if (!currentEventData) throw new Error('Failed to map event data in transaction.');

            // Prepare updated criteria array
            let updatedCriteria = [...(currentEventData.criteria || [])];
            
            // Update votes for each criterion
            Object.entries(selections.criteria).forEach(([constraintIndexStr, selectedTeamName]) => {
                const constraintIndex = parseInt(constraintIndexStr);
                const criterionIndex = updatedCriteria.findIndex(c => 
                    typeof c.constraintIndex === 'number' && c.constraintIndex === constraintIndex
                );
                
                if (criterionIndex !== -1) {
                    // Initialize votes object if it doesn't exist - ensure it's always an object, never null
                    if (!updatedCriteria[criterionIndex].votes || typeof updatedCriteria[criterionIndex].votes !== 'object') {
                        updatedCriteria[criterionIndex].votes = {};
                    }
                    // Add/update the user's vote
                    updatedCriteria[criterionIndex].votes![userId] = selectedTeamName;
                }
            });

            // Prepare update object
            const updateData: any = {
                criteria: updatedCriteria,
                lastUpdatedAt: serverTimestamp()
            };

            // Handle best performer selection if provided
            if (selections.bestPerformer) {
                const currentBestPerformerSelections = currentEventData.bestPerformerSelections || {};
                updateData.bestPerformerSelections = {
                    ...currentBestPerformerSelections,
                    [userId]: selections.bestPerformer
                };
            }

            transaction.update(eventRef, updateData);
        });

    } catch (error: any) {
        throw new Error(`Failed to submit vote: ${error.message}`);
    }
}

/**
 * Submits or updates an organizer rating for an event by a student.
 * @param eventId - The ID of the event.
 * @param studentId - The UID of the student submitting the rating.
 * @param ratingScore - The numerical rating (e.g., 1-5).
 * @param feedbackText - Optional textual feedback.
 */
export async function submitOrganizerRatingByStudentInFirestore(
    eventId: string,
    studentId: string,
    ratingScore: number,
    feedbackText?: string
): Promise<void> {
    if (!eventId || !studentId) throw new Error('Event ID and Student ID required.');
    if (typeof ratingScore !== 'number' || ratingScore < 1 || ratingScore > 5) throw new Error("Invalid rating score. Must be between 1 and 5.");

    const eventRef = doc(db, 'events', eventId);
    try {
        await runTransaction(db, async (transaction: Transaction) => {
            const eventSnap = await transaction.get(eventRef);
            if (!eventSnap.exists()) throw new Error('Event not found.');
            const eventData = mapFirestoreToEventData(eventSnap.id, eventSnap.data());
            if (!eventData) throw new Error('Failed to map event data.');

            if (eventData.status !== EventStatus.Completed || eventData.votingOpen !== true) {
                throw new Error("Ratings can only be submitted for 'Completed' events with open voting/selections.");
            }

            // Validate participation
            const isTeamMember = eventData.details.format === EventFormat.Team && eventData.teams?.some(t => t.members.includes(studentId));
            const isIndividualParticipant = eventData.details.format !== EventFormat.Team && eventData.participants?.includes(studentId);
            if (!isTeamMember && !isIndividualParticipant) {
                throw new Error("Only event participants can submit ratings.");
            }

            let organizerRatings = deepClone(eventData.organizerRatings || []);
            const existingRatingIndex = organizerRatings.findIndex((r: OrganizerRating) => r.userId === studentId);

            const newRating: OrganizerRating = {
                userId: studentId,
                rating: ratingScore,
                feedback: feedbackText || undefined, // Use undefined for optional fields
                ratedAt: serverTimestamp(),
            };

            if (existingRatingIndex > -1) {
                organizerRatings[existingRatingIndex] = newRating;
            } else {
                organizerRatings.push(newRating);
            }

            transaction.update(eventRef, {
                organizerRatings: organizerRatings,
                lastUpdatedAt: serverTimestamp() // CHANGED from Timestamp.now()
            });
        });
    } catch (error: any) {
        throw new Error(`Failed to submit organizer rating: ${error.message}`);
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
            lastUpdatedAt: serverTimestamp() // CHANGED from Timestamp.now()
        });

    } catch (error: any) {
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
    ratingData: { score: number; comment?: string | null } // Explicitly allow null for comment
): Promise<void> {
    if (!eventId || !userId) throw new Error("Event ID and User ID are required.");
    if (!ratingData || typeof ratingData.score !== 'number' || ratingData.score < 1 || ratingData.score > 5) {
        throw new Error("Valid rating score (1-5) is required.");
    }

    const eventRef = doc(db, 'events', eventId);
    try {
        await runTransaction(db, async (transaction) => {
            const eventSnap = await transaction.get(eventRef);
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
            
            // Check if user already rated
            const existingRating = eventData.organizerRatings?.find((r: OrganizerRating) => r.userId === userId);
            if (existingRating) throw new Error("You have already submitted a rating for this event.");

            // Create new rating object
            const newRating: OrganizerRating = {
                userId,
                rating: ratingData.score,
                ratedAt: serverTimestamp(),
            };

            // Conditionally add feedback if provided and non-empty
            if (typeof ratingData.comment === 'string' && ratingData.comment.trim() !== '') {
                newRating.feedback = ratingData.comment;
            }

            // Update ratings array
            const updatedRatings = [...(eventData.organizerRatings || []), newRating];

            transaction.update(eventRef, {
                organizerRatings: updatedRatings,
                lastUpdatedAt: serverTimestamp()
            });
        });

    } catch (error: any) {
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
export async function calculateWinnersFromVotes(eventId: string): Promise<Record<string, string[]>> {
    const eventRef = doc(db, 'events', eventId);
    const eventSnap = await getDoc(eventRef);
    if (!eventSnap.exists()) throw new Error('Event not found for calculating winners.');
    
    const eventData = mapFirestoreToEventData(eventSnap.id, eventSnap.data());
    if (!eventData) throw new Error('Failed to map event data for winner calculation.');

    const calculatedWinners: Record<string, string[]> = {};

    if (eventData.criteria && Array.isArray(eventData.criteria)) {
        eventData.criteria.forEach(criterion => {
            if (!criterion.selections || Object.keys(criterion.selections).length === 0) return;
            if (!criterion.constraintKey) { // Check if constraintKey is defined
                return;
            }

            const voteCounts: Record<string, number> = {};
            Object.values(criterion.selections).forEach(selectedEntityId => {
                voteCounts[selectedEntityId] = (voteCounts[selectedEntityId] || 0) + 1;
            });

            let maxVotes = 0;
            let currentWinners: string[] = [];
            for (const entityId in voteCounts) {
                if (voteCounts[entityId] > maxVotes) {
                    maxVotes = voteCounts[entityId];
                    currentWinners = [entityId];
                } else if (voteCounts[entityId] === maxVotes) {
                    currentWinners.push(entityId);
                }
            }
            if (currentWinners.length > 0) {
                calculatedWinners[criterion.constraintKey] = currentWinners; // Use checked constraintKey
            }
        });
    }

    // Calculate Best Performer (Individual or Team events)
    // BEST_PERFORMER_LABEL is now a global constant

    if (eventData.details.format === EventFormat.Team && eventData.bestPerformerSelections) {
        const performerVoteCounts: Record<string, number> = {};
        Object.values(eventData.bestPerformerSelections).forEach(selectedUserId => {
            performerVoteCounts[selectedUserId] = (performerVoteCounts[selectedUserId] || 0) + 1;
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
            // Ensure calculatedWinners[BEST_PERFORMER_LABEL] is always string[]
            calculatedWinners[BEST_PERFORMER_LABEL] = bestPerformers;
        }
    }

    return calculatedWinners;
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
            lastUpdatedAt: serverTimestamp() // CHANGED from Timestamp.now()
        };
        if (manuallySelectedBy) {
            updatePayload.manuallySelectedBy = manuallySelectedBy;
        }
        await updateDoc(eventRef, updatePayload);

    } catch (error: any) {
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
            if (key === BEST_PERFORMER_LABEL) { // Uses global constant
                // Access format from eventData.details.format
                if (eventData.details.format === EventFormat.Team) {
                    // If team event, best performer should be a user from one of the teams
                    const allTeamMembers = eventData.teams?.flatMap(t => t.members) || []; // Assuming members is string[]
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
                const criterionExists = eventData.criteria?.some(c => (c as any).constraintKey === key); // Type assertion
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
            lastUpdatedAt: serverTimestamp() // CHANGED from Timestamp.now()
        });

    } catch (error: any) {
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
        await runTransaction(db, async (transaction: Transaction) => {
            const eventSnap = await transaction.get(eventRef);
            if (!eventSnap.exists()) throw new Error("Event not found.");

            const eventData = mapFirestoreToEventData(eventSnap.id, eventSnap.data());
            if (!eventData) throw new Error("Could not map event data.");

            if (eventData.status !== EventStatus.Completed && eventData.status !== EventStatus.Closed) {
                throw new Error("Organizer ratings can only be submitted for completed or closed events.");
            }

            // Check if user is a participant or team member (if applicable)
            const isParticipant = eventData.participants?.includes(userId) || 
                                  eventData.teamMemberFlatList?.includes(userId); // Changed to teamMemberFlatList
            if (!isParticipant) {
                throw new Error("Only event participants can rate organizers.");
            }

            let organizerRatings = eventData.organizerRatings || []; // Changed to organizerRatings
            const existingRatingIndex = organizerRatings.findIndex((r: OrganizerRating) => r.userId === userId);

            const newRating: OrganizerRating = {
                userId,
                rating: ratingData.score, // Changed from score to rating
                feedback: ratingData.feedback || undefined, // Changed null to undefined
                ratedAt: serverTimestamp(), // ADDED ratedAt
            };

            if (existingRatingIndex > -1) {
                organizerRatings[existingRatingIndex] = newRating;
            } else {
                organizerRatings.push(newRating);
            }

            transaction.update(eventRef, { 
                organizerRatings: organizerRatings,
                lastUpdatedAt: serverTimestamp() // CHANGED from Timestamp.now()
            });
        });
    } catch (error: any) {
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
        await runTransaction(db, async (transaction: Transaction) => {
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
                                            eventData.teamMemberFlatList?.includes(userId); // Changed to teamMemberFlatList
            if (!isParticipantOrTeamMember) {
                throw new Error("Only registered participants or team members can vote.");
            }

            const criteriaIndex = eventData.criteria?.findIndex(c => 
                (c as EventCriterion & { constraintKey?: string }).constraintKey === criteriaConstraintKey
            );
            if (criteriaIndex === undefined || criteriaIndex === -1 || !eventData.criteria) {
                throw new Error(`Criteria with key '${criteriaConstraintKey}' not found.`);
            }

            const criterion = eventData.criteria[criteriaIndex];
            // Initialize votes object if it doesn't exist - ensure it's always an object, never null
            if (!(criterion as any).votes || typeof (criterion as any).votes !== 'object') {
                (criterion as any).votes = {};
            }
            (criterion as any).votes[userId] = selectedValue;

            // Create a new array for criteria to ensure Firestore detects the change in the nested object
            const updatedCriteria = [...eventData.criteria];
            updatedCriteria[criteriaIndex] = criterion;

            transaction.update(eventRef, { 
                criteria: updatedCriteria,
                lastUpdatedAt: serverTimestamp() // CHANGED from Timestamp.now()
            });
        });
    } catch (error: any) {
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
        await runTransaction(db, async (transaction: Transaction) => {
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
                                            eventData.teamMemberFlatList?.includes(selectedUserId); // Changed to teamMemberFlatList
            if (!isParticipantOrTeamMember) {
                throw new Error("Selected user is not a participant or team member of this event.");
            }

            let selections = eventData.bestPerformerSelections || {};
            selections[userId] = selectedUserId; // Record which organizer selected whom

            transaction.update(eventRef, { 
                bestPerformerSelections: selections,
                lastUpdatedAt: serverTimestamp() // CHANGED from Timestamp.now()
            });
        });
    } catch (error: any) {
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
export async function toggleVotingStatusInFirestore(eventId: string, open: boolean, currentUser: EnrichedStudentData | null): Promise<void> {
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

        // Check if the voting state is actually changing
        if (eventData.votingOpen === open) {
            throw new Error(`Voting is already ${open ? 'open' : 'closed'}.`);
        }

        // State Check: Cannot open voting for events that are not InProgress or Completed.
        // Can close voting for InProgress or Completed.
        if (open && ![EventStatus.InProgress, EventStatus.Completed].includes(eventData.status as EventStatus)) {
            throw new Error(`Cannot open voting for event in status '${eventData.status}'. Event must be InProgress or Completed.`);
        }
        // Note: The original warning for closing voting on non-InProgress/Completed events was removed in previous steps.
        // This is acceptable as the primary concern is preventing premature opening.

        // Cannot toggle voting if event is Closed
        if (eventData.status === EventStatus.Closed) {
            throw new Error("Cannot change voting status for a closed event.");
        }

        await updateDoc(eventRef, {
            votingOpen: open,
            lastUpdatedAt: serverTimestamp(), // CHANGED from Timestamp.now()
        });

        // Trigger notification
        // Ensure isSupabaseConfigured and invokePushNotification are correctly imported or defined
        // Example: import { isSupabaseConfigured, invokePushNotification } from '@/services/notificationService';
        if (typeof isSupabaseConfigured === 'function' && isSupabaseConfigured()) {
            const notificationType = open ? 'voting_opened' : 'voting_closed';
            // Notify all participants and team members
            const targetUserIds = [
                ...(eventData.participants || []),
                ...(eventData.teamMemberFlatList || []) // Changed to teamMemberFlatList
            ].filter((id, index, self) => id && self.indexOf(id) === index); // Unique, non-null IDs

            if (targetUserIds.length > 0) {
                if (typeof invokePushNotification === 'function') {
                    await invokePushNotification({ // Added await if invokePushNotification is async
                        type: notificationType,
                        eventId,
                        eventName: eventData.details.eventName || 'Event',
                        targetUserIds,
                    }).catch((pushError: any) => {});
                } else {
                }
            }
        } else if (typeof isSupabaseConfigured !== 'function') {
        }

    } catch (error: any) {
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
export async function finalizeWinnersInFirestore(eventId: string, currentUser: EnrichedStudentData | null): Promise<Record<string, string | string[]>> {
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
            // Optionally, force voting to close here, or throw an error
            // await toggleVotingStatusInFirestore(eventId, false, currentUser); // Example: force close
        }

        const winners: Record<string, string | string[]> = {}; // Changed WinnerInfo

        // 1. Determine winners based on criteria votes
        if (eventData.criteria && eventData.criteria.length > 0) {
            eventData.criteria.forEach(criterion => {
                const votesMap = (criterion as any).votes as Record<string, string> | undefined; // Type assertion for votes
                if (votesMap && Object.keys(votesMap).length > 0) {
                    const voteCounts: { [selectedValue: string]: number } = {};
                    Object.values(votesMap).forEach((voteValue: string) => { // voteValue is now correctly string
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
                        winners[(criterion as any).constraintKey] = winningValues; // Store all winners in case of a tie // Type assertion
                    }
                }
            });
        }

        // 2. Determine best performer based on organizer selections (if any)
        // BEST_PERFORMER_LABEL is already defined globally.
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
                winners[BEST_PERFORMER_LABEL] = bestPerformers; // Could be multiple if tie in organizer votes
            }
        }
        
        // 3. Handle manually selected winners (if any and if this feature is used)
        // This part depends on how `manuallySelectedBy` and a potential `manualWinners` field would work.
        // For now, we assume `winners` object is authoritative if populated by votes/selections.
        // If `eventData.manuallySelectedBy` exists, it implies manual override or addition.
        // This example doesn't implement manual winner logic beyond what `winners` captures.

        if (Object.keys(winners).length === 0) {
            // Depending on policy, either throw an error or proceed with empty winners
            // throw new Error("No winners could be determined.");
        }

        // Update Firestore with the determined winners
        await updateDoc(eventRef, {
            winners: winners,
            lastUpdatedAt: serverTimestamp(), // CHANGED from Timestamp.now()
            // Optionally, ensure voting is closed if it wasn't already
            // votingOpen: false 
        });


        // Trigger notification for winners (if applicable)
        // Ensure isSupabaseConfigured and invokePushNotification are correctly imported or defined
        if (typeof isSupabaseConfigured === 'function' && isSupabaseConfigured() && Object.keys(winners).length > 0) {
            // Collect all unique winner IDs
            const allWinnerIds = Object.values(winners).flat().filter((id, index, self) => id && self.indexOf(id) === index) as string[];
            
            if (allWinnerIds.length > 0) {
                 if (typeof invokePushNotification === 'function') {
                    await invokePushNotification({ // Added await if invokePushNotification is async
                        type: 'event_winners_announced',
                        eventId,
                        eventName: eventData.details.eventName || 'Event',
                        targetUserIds: allWinnerIds,
                        // You might want to include more details about what they won
                    }).catch((pushError: any) => {});
                } else {
                }
            }
        } else if (typeof isSupabaseConfigured !== 'function' && Object.keys(winners).length > 0) {
        }


        return winners;

    } catch (error: any) {
        throw new Error(`Failed to finalize winners: ${error.message}`);
    }
}