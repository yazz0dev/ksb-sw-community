// src/store/events/actions.utils.ts
import { EventFormat, Event, EventCriteria, Team } from '@/types/event';
import { BEST_PERFORMER_LABEL, BEST_PERFORMER_POINTS } from '@/utils/constants';
// Import new XP types and helpers
import { XPData, XpCalculationRoleKey, xpCalculationRoleKeys, mapCalcRoleToFirestoreKey, XpFirestoreFieldKey } from '@/types/xp';

// --- Utility: Calculate XP earned for event participation ---
// This function now returns a map of userId to the *changes* in their XPData (increments).
export function calculateEventXP(eventData: Event): Record<string, Partial<Pick<XPData, XpFirestoreFieldKey | 'count_wins' | 'totalCalculatedXp'>>> {
    const xpChangesMap: Record<string, Partial<Pick<XPData, XpFirestoreFieldKey | 'count_wins' | 'totalCalculatedXp'>>> = {};

    // --- Configuration ---
    const baseParticipationXP = 10;
    const organizerXP = 50;
    // BEST_PERFORMER_POINTS is already imported

    // Helper function to add XP changes safely
    const addXPChange = (userId: string, calcRole: XpCalculationRoleKey, amount: number) => {
        if (!userId || amount <= 0) return;
        if (!xpChangesMap[userId]) {
            xpChangesMap[userId] = { totalCalculatedXp: 0 };
             // Initialize all specific xp_ fields to 0 if not present, to allow increment
            xpCalculationRoleKeys.forEach(rKey => {
                const firestoreKey = mapCalcRoleToFirestoreKey(rKey);
                (xpChangesMap[userId] as any)[firestoreKey] = 0;
            });
        }

        const firestoreKey = mapCalcRoleToFirestoreKey(calcRole);
        (xpChangesMap[userId] as any)[firestoreKey] = ((xpChangesMap[userId] as any)[firestoreKey] || 0) + amount;
        xpChangesMap[userId].totalCalculatedXp = (xpChangesMap[userId].totalCalculatedXp || 0) + amount;
    };

    const incrementWinCount = (userId: string) => {
        if (!userId) return;
        if (!xpChangesMap[userId]) {
            xpChangesMap[userId] = { totalCalculatedXp: 0, count_wins: 0 };
             // Initialize all specific xp_ fields to 0 if not present
            xpCalculationRoleKeys.forEach(rKey => {
                const firestoreKey = mapCalcRoleToFirestoreKey(rKey);
                (xpChangesMap[userId] as any)[firestoreKey] = 0;
            });
        }
        xpChangesMap[userId].count_wins = (xpChangesMap[userId].count_wins || 0) + 1;
    };

    // --- 1. Organizer XP ---
    (eventData.details.organizers || []).filter(Boolean).forEach(uid => {
        addXPChange(uid, 'organizer', organizerXP);
    });

    // --- 2. Participation XP ---
    if (eventData.details.format === EventFormat.Team && Array.isArray(eventData.teams)) {
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
    const winners = eventData.winners || {};
    const criteriaMap = new Map<string, EventCriteria>();
    if (Array.isArray(eventData.criteria)) {
        eventData.criteria.forEach(c => {
            if (c.constraintLabel) criteriaMap.set(c.constraintLabel, c);
        });
    }

    for (const [criterionLabel, winnerIds] of Object.entries(winners)) {
        if (criterionLabel === BEST_PERFORMER_LABEL) continue; // Handled separately

        const criterion = criteriaMap.get(criterionLabel);
        if (!criterion || !criterion.points || !criterion.role) {
            console.warn(`Skipping XP for criterion "${criterionLabel}": Missing points or role.`);
            continue;
        }

        // Assume criterion.role is one of XpCalculationRoleKey (e.g., 'developer', 'designer')
        const calcRoleForCriterion = criterion.role as XpCalculationRoleKey;
        if (!xpCalculationRoleKeys.includes(calcRoleForCriterion)) {
            console.warn(`Invalid role "${calcRoleForCriterion}" for criterion "${criterionLabel}". Skipping XP.`);
            continue;
        }

        const points = criterion.points;

        winnerIds.forEach(winnerIdOrTeamName => {
            if (eventData.details.format === EventFormat.Team) {
                const winningTeam = eventData.teams?.find(t => t.teamName === winnerIdOrTeamName);
                if (winningTeam) {
                    (winningTeam.members || []).filter(Boolean).forEach(memberId => {
                        addXPChange(memberId, calcRoleForCriterion, points);
                        incrementWinCount(memberId); // Increment win count for team members
                    });
                } else { // Should not happen if winnerIdOrTeamName is a team name from winners
                    console.warn(`Team ${winnerIdOrTeamName} not found for XP award.`);
                }
            } else { // Individual or Competition
                addXPChange(winnerIdOrTeamName, calcRoleForCriterion, points);
                incrementWinCount(winnerIdOrTeamName); // Increment win count for individual winner
            }
        });
    }

    // --- 4. Best Performer XP (Team events only) ---
    const bestPerformers = winners[BEST_PERFORMER_LABEL]; // This is an array of user UIDs
    if (eventData.details.format === EventFormat.Team && Array.isArray(bestPerformers)) {
        bestPerformers.forEach(uid => {
            addXPChange(uid, 'bestPerformer', BEST_PERFORMER_POINTS);
            // Note: Being a "best performer" might also count as a "win" depending on definition.
            // If so, call incrementWinCount(uid) here as well. For now, assuming it's separate.
        });
    }

    console.log("Calculated XP Changes Map:", JSON.parse(JSON.stringify(xpChangesMap)));
    return xpChangesMap;
}

// handleFirestoreError remains the same
export function handleFirestoreError(error: any): string {
    if (error?.code === 'permission-denied') return 'You do not have permission to perform this action.';
    if (error?.code === 'not-found') return 'The requested resource was not found.';
    if (error?.code === 'unavailable') return 'The service is temporarily unavailable.';
    if (typeof error?.message === 'string') return error.message;
    return 'An unknown error occurred.';
}