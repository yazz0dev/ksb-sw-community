// src/stores/events/actions.utils.ts
import { Timestamp } from 'firebase/firestore'; // Added import
import { Event, EventFormat, EventCriterion, EventStatus } from '@/types/event'; // Fixed EventCriteria to EventCriterion
import { XPData, XpFirestoreFieldKey, mapCalcRoleToFirestoreKey, XpCalculationRoleKey } from '@/types/xp';
import { BEST_PERFORMER_LABEL, BEST_PERFORMER_POINTS } from '@/utils/constants'; // BEST_PERFORMER_POINTS was missing
import { handleFirestoreError } from '@/utils/errorHandlers'; // Import instead of duplicating

// Re-export for use by eventStore
export { handleFirestoreError };

/**
 * Create a new XPData object with default values for all required properties.
 * @param userId - The user ID to associate with this XP data
 * @returns A properly initialized XPData object
 */
function createDefaultXpData(userId?: string): XPData {
  return {
    uid: userId || '',
    totalCalculatedXp: 0,
    xp_developer: 0,
    xp_presenter: 0, 
    xp_designer: 0,
    xp_organizer: 0,
    xp_problemSolver: 0,
    xp_bestPerformer: 0,
    xp_participation: 0,
    count_wins: 0,
    lastUpdatedAt: Timestamp.now() // Added lastUpdatedAt
  };
}

// Extended interface for EventCriterion with the additional properties we need
interface EventCriterionWithXP extends EventCriterion {
  xpValue?: number;
  roleKey?: XpCalculationRoleKey;
}

/**
 * Checks if the student has already submitted selections/votes for a given event.
 * @param event - The event object.
 * @param studentId - The UID of the student.
 * @returns boolean - True if the student has made selections.
 */
export function hasStudentSubmittedSelections(event: Event | null, studentId: string | null): boolean {
    if (!event || !studentId || !event.criteria) return false;
    
    // Check if the student has submitted selections for any criteria
    // This is the actual implementation that matches the function name
    return event.criteria.some(criterion => 
        criterion.selections && 
        criterion.selections[studentId] !== undefined
    );
}

/**
 * Calculates XP changes for an event based on participation, organization, and winning.
 * @param eventData - The event data.
 * @returns Record<string, XPData> - Map of user IDs to their XP changes.
 */
export function calculateEventXP(eventData: Event): Record<string, XPData> {
    // Initialize XP changes map
    const xpChangesMap: Record<string, XPData> = {};

    // --- Configuration ---
    const baseParticipationXP = 10; // XP for any participation
    const organizerXP = 50;         // XP for organizing
    // BEST_PERFORMER_POINTS is imported from constants

    // Helper function to add XP changes safely
    const addXPChange = (userId: string, calcRole: XpCalculationRoleKey, amount: number) => {
        if (!userId || amount <= 0) return; // Do nothing if no user or no XP

        if (!xpChangesMap[userId]) {
            xpChangesMap[userId] = createDefaultXpData(userId); // Use helper function
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
            xpChangesMap[userId] = createDefaultXpData(userId); // Use helper function
        }
        xpChangesMap[userId].count_wins = (xpChangesMap[userId].count_wins || 0) + 1;
    };

    // --- 1. Organizer XP ---
    // Access organizers from eventData.details.organizers
    (eventData.details?.organizers || []).filter(Boolean).forEach((uid: string) => {
        addXPChange(uid, 'organizer', organizerXP);
    });

    // --- 2. Participation XP ---
    // Access format from eventData.details.format
    if (eventData.details?.format === EventFormat.Team && Array.isArray(eventData.teams)) {
        eventData.teams.forEach((team: any) => {
            (team.members || []).filter(Boolean).forEach((uid: string) => {
                addXPChange(uid, 'participation', baseParticipationXP);
            });
        });
    } else if (Array.isArray(eventData.participants)) { // Individual or Competition
        eventData.participants.filter(Boolean).forEach((uid: string) => {
            addXPChange(uid, 'participation', baseParticipationXP);
        });
    }

    // --- 3. Winner XP (Based on calculated winners) ---
    const winners = eventData.winners || {}; // winners should be top-level on Event
    const criteriaMap = new Map<string, EventCriterionWithXP>();
    if (Array.isArray(eventData.criteria)) { // criteria should be top-level on Event
        eventData.criteria.forEach((c: EventCriterion) => {
            // Use type assertion to treat c as EventCriterionWithXP
            const criterionWithXP = c as EventCriterionWithXP;
            if (criterionWithXP?.constraintKey && criterionWithXP?.xpValue) {
                criteriaMap.set(criterionWithXP.constraintKey, criterionWithXP);
            }
        });
    }

    for (const [criterionOrLabel, winnerIdOrIds] of Object.entries(winners)) {
        const criterionConfig = criteriaMap.get(criterionOrLabel);
        const xpValue = criterionConfig?.xpValue || 0; // Now TypeScript knows xpValue might exist

        if (Array.isArray(winnerIdOrIds)) { // Tie for this criterion
            winnerIdOrIds.filter(Boolean).forEach(winnerId => {
                if (xpValue > 0) addXPChange(winnerId, (criterionConfig?.roleKey || 'problemSolver'), xpValue);
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


    return xpChangesMap;
}
