<<<<<<< HEAD
// src/store/events/actions.utils.ts (Conceptual Student Site Helpers)
import type { Event, EventCriterion, EventStatus, Team } from '@/types/event';
import { EventFormat } from '@/types/event';
=======
// src/store/events/actions.utils.ts
import { Event, EventFormat, EventCriteria, EventStatus } from '@/types/event'; // Added EventStatus
import { XPData, XpFirestoreFieldKey, mapCalcRoleToFirestoreKey, XpCalculationRoleKey } from '@/types/xp';
import { BEST_PERFORMER_LABEL, BEST_PERFORMER_POINTS } from '@/utils/constants'; // BEST_PERFORMER_POINTS was missing
>>>>>>> 18584e3e4cbfec6471edfa715168774adf7c20a5

/**
 * Checks if the student has already submitted selections/votes for a given event.
 * @param event - The event object.
 * @param studentId - The UID of the student.
 * @returns boolean - True if the student has made selections.
 */
export function hasStudentSubmittedSelections(event: Event | null, studentId: string | null): boolean {
    if (!event || !studentId || !event.criteria) return false;

<<<<<<< HEAD
    // Check regular criteria selections
    const hasCriteriaVote = event.criteria.some(criterion =>
        criterion.selections && criterion.selections[studentId] !== undefined
    );
    if (hasCriteriaVote) return true;

    // Check best performer selection for team events
    if (event.details.format === EventFormat.Team) {
        return event.bestPerformerSelections && event.bestPerformerSelections[studentId] !== undefined;
    }
    return false;
}

/**
 * Checks if the student has already rated the organizers for a given event.
 * @param event - The event object.
 * @param studentId - The UID of the student.
 * @returns boolean - True if the student has rated.
 */
export function hasStudentRatedOrganizers(event: Event | null, studentId: string | null): boolean {
    if (!event || !studentId || !Array.isArray(event.organizerRatings)) return false;
    return event.organizerRatings.some(rating => rating.userId === studentId);
}

/**
 * Gets the team a student belongs to in a specific event.
 * @param event - The event object.
 * @param studentId - The UID of the student.
 * @returns Team | undefined - The team object if found, otherwise undefined.
 */
export function getStudentTeamInEvent(event: Event | null, studentId: string | null): Team | undefined {
    if (!event || !studentId || event.details.format !== EventFormat.Team || !Array.isArray(event.teams)) {
        return undefined;
    }
    return event.teams.find(team => team.members.includes(studentId));
}

/**
 * Checks if a student can submit a project for the event.
 * @param event - The event object.
 * @param studentId - The UID of the student.
 * @param studentTeam - The student's team (if applicable, pass from getStudentTeamInEvent).
 * @returns boolean
 */
export function canStudentSubmitProject(event: Event | null, studentId: string | null, studentTeam?: Team): boolean {
    if (!event || !studentId || event.status !== EventStatus.InProgress || !event.details.allowProjectSubmission) {
        return false;
    }
    // Organizers usually don't submit to their own events through this flow
    if (event.details.organizers?.includes(studentId)) {
        return false;
    }

    if (event.details.format === EventFormat.Team) {
        if (!studentTeam) return false; // Must be in a team
        // Optional: Enforce only team lead can submit
        // return studentTeam.teamLead === studentId;
        return true; // Any team member can submit by default (adjust if needed)
    } else { // Individual / Competition
        return event.participants?.includes(studentId) || false;
    }
}

/**
 * Checks if a student can make selections/vote in an event.
 * @param event - The event object.
 * @param studentId - The UID of the student.
 * @returns boolean
 */
export function canStudentMakeSelections(event: Event | null, studentId: string | null): boolean {
    if (!event || !studentId || event.status !== EventStatus.Completed || event.votingOpen !== true) {
        return false;
    }
    const isTeamMember = event.details.format === EventFormat.Team && event.teams?.some(t => t.members.includes(studentId));
    const isIndividualParticipant = event.details.format !== EventFormat.Team && event.participants?.includes(studentId);
    return isTeamMember || isIndividualParticipant;
=======
    // --- Configuration ---
    const baseParticipationXP = 10; // XP for any participation
    const organizerXP = 50;         // XP for organizing
    // BEST_PERFORMER_POINTS is now imported from constants

    // Helper function to add XP changes safely
    const addXPChange = (userId: string, calcRole: XpCalculationRoleKey, amount: number) => {
        if (!userId || amount <= 0) return; // Do nothing if no user or no XP

        if (!xpChangesMap[userId]) {
            xpChangesMap[userId] = { totalCalculatedXp: 0 }; // Initialize if not present
        }

        const firestoreKey = mapCalcRoleToFirestoreKey(calcRole);
        // Ensure the specific XP field is initialized before incrementing
        (xpChangesMap[userId] as any)[firestoreKey] = ((xpChangesMap[userId] as any)[firestoreKey] || 0) + amount;
        // Increment totalCalculatedXp for the user
        xpChangesMap[userId].totalCalculatedXp = (xpChangesMap[userId].totalCalculatedXp || 0) + amount;
    };

    const incrementWinCount = (userId: string) => {
        if (!userId) return;
        if (!xpChangesMap[userId]) {
            xpChangesMap[userId] = { totalCalculatedXp: 0 }; // Initialize if not present
        }
        xpChangesMap[userId].count_wins = (xpChangesMap[userId].count_wins || 0) + 1;
    };

    // --- 1. Organizer XP ---
    // Access organizers from eventData.details.organizers
    (eventData.details?.organizers || []).filter(Boolean).forEach(uid => {
        addXPChange(uid, 'organizer', organizerXP);
    });

    // --- 2. Participation XP ---
    // Access format from eventData.details.format
    if (eventData.details?.format === EventFormat.Team && Array.isArray(eventData.teams)) {
        eventData.teams.forEach(team => {
            (team.members || []).filter(Boolean).forEach(uid => {
                addXPChange(uid, 'participation', baseParticipationXP);
            });
        });
    } else if (Array.isArray(eventData.participants)) { // Individual or Competition
        eventData.participants.filter(Boolean).forEach(uid => {
            addXPChange(uid, 'participation', baseParticipationXP);
        });
    }

    // --- 3. Winner XP (Based on calculated winners) ---
    const winners = eventData.winners || {}; // winners should be top-level on Event
    const criteriaMap = new Map<string, EventCriteria>();
    if (Array.isArray(eventData.criteria)) { // criteria should be top-level on Event
        eventData.criteria.forEach(c => {
            if (c?.constraintKey && c?.xpValue) { // Ensure criterion has key and xpValue
                criteriaMap.set(c.constraintKey, c);
            }
        });
    }

    for (const [criterionOrLabel, winnerIdOrIds] of Object.entries(winners)) {
        const criterionConfig = criteriaMap.get(criterionOrLabel);
        const xpValue = criterionConfig?.xpValue || 0; // Default to 0 if no specific XP for this criterion

        if (Array.isArray(winnerIdOrIds)) { // Tie for this criterion
            winnerIdOrIds.filter(Boolean).forEach(winnerId => {
                if (xpValue > 0) addXPChange(winnerId, (criterionConfig?.roleKey || 'problemSolver'), xpValue); // Use roleKey from criteria or a default
                incrementWinCount(winnerId);
            });
        } else if (typeof winnerIdOrIds === 'string' && winnerIdOrIds) { // Single winner
            if (criterionOrLabel !== BEST_PERFORMER_LABEL) { // Don't double count best performer here
                 if (xpValue > 0) addXPChange(winnerIdOrIds, (criterionConfig?.roleKey || 'problemSolver'), xpValue);
                 incrementWinCount(winnerIdOrIds);
            }
        }
    }
    
    // --- 4. Best Performer XP (Team events or individual competitions) ---
    // Best performer is handled within the loop above if BEST_PERFORMER_LABEL is a key in winners
    // This section specifically awards BEST_PERFORMER_POINTS if there's a winner for BEST_PERFORMER_LABEL
    const bestPerformerWinner = winners[BEST_PERFORMER_LABEL];
    if (bestPerformerWinner) {
        if (Array.isArray(bestPerformerWinner)) { // Tie for best performer
            bestPerformerWinner.filter(Boolean).forEach(bpUid => {
                addXPChange(bpUid, 'bestPerformer', BEST_PERFORMER_POINTS);
                // incrementWinCount(bpUid); // Win count already handled in the main winners loop
            });
        } else if (typeof bestPerformerWinner === 'string' && bestPerformerWinner) { // Single best performer
            addXPChange(bestPerformerWinner, 'bestPerformer', BEST_PERFORMER_POINTS);
            // incrementWinCount(bestPerformerWinner); // Win count already handled
        }
    }


    console.log("Calculated XP Changes Map:", JSON.parse(JSON.stringify(xpChangesMap))); // Deep copy for logging
    return xpChangesMap;
}

// handleFirestoreError remains the same
export function handleFirestoreError(error: any): string {
    if (error?.code === 'permission-denied') return 'Permission denied. You might not have access to this resource.';
    if (error?.code === 'not-found') return 'The requested document or resource was not found.';
    if (error?.code === 'unavailable') return 'The service is currently unavailable. Please try again later.';
    if (typeof error?.message === 'string') return error.message;
    return 'An unknown error occurred.';
>>>>>>> 18584e3e4cbfec6471edfa715168774adf7c20a5
}