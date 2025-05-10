// src/store/events/actions.utils.ts
import { EventFormat, Event, Team, EventCriteria } from '@/types/event';
import { BEST_PERFORMER_LABEL, BEST_PERFORMER_POINTS } from '@/utils/constants'; // Import constant

// --- Utility: Calculate XP earned for event participation ---
export function calculateEventXP(eventData: Event): Record<string, Record<string, number>> { // Remove async
    const xpAwardMap: Record<string, Record<string, number>> = {};

    // --- Configuration ---
    // Base XP values (adjust as needed)
    const baseParticipationXP = 10;
    // const submittedParticipationXP = 30; // Requires checking submission status per participant/team
    const organizerXP = 50;
    const bestPerformerBonusXP = BEST_PERFORMER_POINTS; // Use constant

    // Helper function to add XP safely
    const addXP = (userId: string, role: string, amount: number) => {
        if (!userId || amount <= 0) return;
        if (!xpAwardMap[userId]) xpAwardMap[userId] = {};
        xpAwardMap[userId][role] = (xpAwardMap[userId][role] || 0) + amount;
    };

    // --- 1. Organizer XP ---
    (eventData.details.organizers || []).filter(Boolean).forEach(uid => {
        addXP(uid, 'organizer', organizerXP); // Use 'organizer' role key
    });

    // --- 2. Participation XP ---
    if (eventData.details.format === EventFormat.Team && Array.isArray(eventData.teams)) {
        eventData.teams.forEach(team => {
            const participationAmount = baseParticipationXP;
            (team.members || []).filter(Boolean).forEach(uid => {
                addXP(uid, 'participation', participationAmount);
            });
        });
    } else if (Array.isArray(eventData.participants)) { // Individual or Competition
        const participationAmount = baseParticipationXP;
        eventData.participants.filter(Boolean).forEach(uid => {
            addXP(uid, 'participation', participationAmount);
        });
    }

    // --- 3. Winner XP (Based on calculated winners) ---
    const winners = eventData.winners || {};
    const criteriaMap = new Map<string, EventCriteria>();
    if (Array.isArray(eventData.criteria)) {
        eventData.criteria.forEach(c => {
             // Use constraintLabel as the key for easier lookup from winners map
            if (c.constraintLabel) criteriaMap.set(c.constraintLabel, c);
        });
    }

    for (const [criterionLabel, winnerIds] of Object.entries(winners)) {
        // Skip Best Performer here, handle separately
        if (criterionLabel === BEST_PERFORMER_LABEL) continue;

        const criterion = criteriaMap.get(criterionLabel);
        if (!criterion || !criterion.points || !criterion.role) {
            console.warn(`Skipping XP for criterion "${criterionLabel}": Missing points or role.`);
            continue;
        }

        const points = criterion.points;
        const role = criterion.role;

        winnerIds.forEach(winnerId => {
            if (eventData.details.format === EventFormat.Team) {
                // winnerId could be a teamName
                const winningTeam = eventData.teams?.find(t => t.teamName === winnerId);
                if (winningTeam) {
                    (winningTeam.members || []).filter(Boolean).forEach(memberId => {
                        addXP(memberId, role, points);
                    });
                } else {
                    // It might be an individual winner even in team event (less likely for criteria)
                    addXP(winnerId, role, points);
                }
            } else {
                // Individual or Competition: winnerId is a participant UID
                addXP(winnerId, role, points);
            }
        });
    }

    // --- 4. Best Performer XP (Team events only) ---
    const bestPerformers = winners[BEST_PERFORMER_LABEL];
    if (eventData.details.format === EventFormat.Team && Array.isArray(bestPerformers)) {
        bestPerformers.forEach(uid => {
            // Best Performer XP might not have a specific role, or you might assign one
            // Using a generic 'BestPerformer' key for XP map
            addXP(uid, 'BestPerformer', bestPerformerBonusXP);
        });
    }

    console.log("Calculated XP Map:", JSON.parse(JSON.stringify(xpAwardMap))); // Log deep copy
    return xpAwardMap;
}

// handleFirestoreError remains the same
export function handleFirestoreError(error: any): string {
    // ... (implementation as before) ...
    if (error?.code === 'permission-denied') return 'You do not have permission to perform this action.';
    if (error?.code === 'not-found') return 'The requested resource was not found.';
    if (error?.code === 'unavailable') return 'The service is temporarily unavailable.';
    if (typeof error?.message === 'string') return error.message;
    return 'An unknown error occurred.';
}