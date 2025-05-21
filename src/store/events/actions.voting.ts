// src/store/events/actions.voting.ts (Conceptual Student Site Helpers)
import { doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/firebase';
import type { Event, EventStatus, OrganizerRating, EventCriterion } from '@/types/event';
import { EventFormat } from '@/types/event';
import { deepClone, isEmpty } from '@/utils/helpers';

const now = () => Timestamp.now();

/**
 * Submits a student's selections for event criteria and/or best performer.
 * @param eventId - The ID of the event.
 * @param studentId - The UID of the student submitting selections.
 * @param selections - Object containing criteria selections and/or best performer.
 *                     `criteria`: { constraintIndexString: selectedEntityId }
 *                     `bestPerformer`: selectedStudentUid (for team events)
 */
export async function submitEventSelectionsByStudentInFirestore(
    eventId: string,
    studentId: string,
    selections: { criteria?: Record<string, string>; bestPerformer?: string }
): Promise<void> {
    if (!eventId || !studentId) throw new Error('Event ID and Student ID are required.');
    if (isEmpty(selections.criteria) && selections.bestPerformer === undefined) {
        throw new Error("No selections provided.");
    }

    const eventRef = doc(db, 'events', eventId);
    try {
        const eventSnap = await getDoc(eventRef);
        if (!eventSnap.exists()) throw new Error('Event not found.');
        const eventData = eventSnap.data() as Event;

        if (eventData.status !== EventStatus.Completed || eventData.votingOpen !== true) {
            throw new Error("Selections/Voting is not currently open for this event.");
        }

        // Validate participation
        const isTeamMember = eventData.details.format === EventFormat.Team && eventData.teams?.some(t => t.members.includes(studentId));
        const isIndividualParticipant = eventData.details.format !== EventFormat.Team && eventData.participants?.includes(studentId);
        if (!isTeamMember && !isIndividualParticipant) {
            throw new Error("Only event participants can submit selections.");
        }

        const updates: Partial<MappedEventForFirestore> = { lastUpdatedAt: now() };
        let hasChanges = false;

        // Process criteria selections
        if (selections.criteria && Array.isArray(eventData.criteria)) {
            const updatedCriteria = deepClone(eventData.criteria); // Clone to modify
            let criterionChanged = false;
            updatedCriteria.forEach(criterion => {
                const selectionKey = String(criterion.constraintIndex);
                if (selections.criteria!.hasOwnProperty(selectionKey)) {
                    const selectedValue = selections.criteria![selectionKey];
                    // Prevent self-vote in individual events for regular criteria
                    if (eventData.details.format !== EventFormat.Team && selectedValue === studentId) {
                        throw new Error(`You cannot vote for yourself for criterion: "${criterion.constraintLabel}".`);
                    }
                    if (!criterion.selections) criterion.selections = {};
                    criterion.selections[studentId] = selectedValue;
                    criterionChanged = true;
                }
            });
            if (criterionChanged) {
                updates.criteria = updatedCriteria;
                hasChanges = true;
            }
        }

        // Process best performer selection (Team events only)
        if (eventData.details.format === EventFormat.Team && selections.hasOwnProperty('bestPerformer')) {
            const bestPerformerSelection = selections.bestPerformer;
            if (bestPerformerSelection === studentId) {
                throw new Error("You cannot select yourself as Best Performer.");
            }
            // Optional: Prevent voting for own team member as best performer
            // const voterTeam = eventData.teams?.find(t => t.members.includes(studentId));
            // const selectedTeam = eventData.teams?.find(t => t.members.includes(bestPerformerSelection!));
            // if (voterTeam && selectedTeam && voterTeam.teamName === selectedTeam.teamName) {
            //     throw new Error("You cannot select a member of your own team as Best Performer.");
            // }

            if (!updates.bestPerformerSelections) updates.bestPerformerSelections = { ...(eventData.bestPerformerSelections || {}) };
            updates.bestPerformerSelections[studentId] = bestPerformerSelection!;
            hasChanges = true;
        }

        if (!hasChanges) {
            console.warn("No actual changes to submit for event selections.");
            return; // Or throw an error: "No changes to submit."
        }

        await updateDoc(eventRef, updates);
    } catch (error: any) {
        console.error(`Firestore submitEventSelectionsByStudent error for ${eventId}:`, error);
        throw new Error(`Failed to submit selections: ${error.message}`);
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
        const eventSnap = await getDoc(eventRef);
        if (!eventSnap.exists()) throw new Error('Event not found.');
        const eventData = eventSnap.data() as Event;

        if (eventData.status !== EventStatus.Completed && eventData.status !== EventStatus.Closed) {
            throw new Error("You can only rate organizers for completed or closed events.");
        }
        const isOrganizer = eventData.details.organizers?.includes(studentId);
        if(isOrganizer) throw new Error("Organizers cannot rate their own event.");

        const newRatingEntry: OrganizerRating = {
            userId: studentId,
            rating: ratingScore,
            feedback: feedbackText?.trim() || undefined,
            ratedAt: now()
        };

        const existingRatings = eventData.organizerRatings || [];
        const userOldRatingIndex = existingRatings.findIndex(r => r.userId === studentId);
        let updatedRatings: OrganizerRating[];

        if (userOldRatingIndex !== -1) { // Update existing rating
            updatedRatings = [...existingRatings];
            updatedRatings[userOldRatingIndex] = newRatingEntry;
        } else { // Add new rating
            updatedRatings = [...existingRatings, newRatingEntry];
        }

        await updateDoc(eventRef, {
            organizerRatings: updatedRatings,
            lastUpdatedAt: now()
        });
    } catch (error: any) {
        console.error(`Firestore submitOrganizerRatingByStudent error for ${eventId}:`, error);
        throw new Error(`Failed to submit organizer rating: ${error.message}`);
    }
}