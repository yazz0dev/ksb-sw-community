// src/store/modules/events/actions.utils.ts
import { ActionContext } from 'vuex';
import { EventFormat, EventState } from '@/types/event';
import { RootState } from '@/types/store';
import { Event } from '@/types/event';

export function updateLocalEvent({ commit, state }: ActionContext<EventState, RootState>, { id, changes }: { id: string; changes: Partial<Event> }) {
    // Find the existing event and merge changes for addOrUpdateEvent
    const existing = state.events.find((e: Event) => e.id === id);
    if (existing) {
        commit('addOrUpdateEvent', { ...existing, ...changes, id });
    } else {
        commit('addOrUpdateEvent', { id, ...changes });
    }
    // Also update current details if it's the one being viewed
    commit('updateCurrentEventDetails', { id, changes });
}

// --- Utility: Calculate XP earned for event participation ---
export async function calculateEventXP(eventData: Event): Promise<Record<string, Record<string, number>>> {
    const xpAwardMap: Record<string, Record<string, number>> = {};
    const baseParticipationXP = 10;
    const submittedParticipationXP = 30;
    const organizerXP = 50;
    const winnerBonusXP = 100;
    const bestPerformerBonusXP = 10;

    (eventData.details.organizers || []).filter(Boolean).forEach(uid => {
        if (!xpAwardMap[uid]) xpAwardMap[uid] = {};
        xpAwardMap[uid]['Organizer'] = (xpAwardMap[uid]['Organizer'] || 0) + organizerXP;
    });

    const winners = eventData.winners || {};
    const allocations = eventData.criteria || [];

    if (eventData.details.format === EventFormat.Team && eventData.teams && Array.isArray(eventData.teams)) {
        eventData.teams.forEach(team => {
            const teamMembers = (team.members || []).filter(Boolean);
            const hasSubmission = Array.isArray(team.submissions) && team.submissions.length > 0;
            teamMembers.forEach(uid => {
                if (!xpAwardMap[uid]) xpAwardMap[uid] = {};
                xpAwardMap[uid]['Participation'] = (xpAwardMap[uid]['Participation'] || 0) + (hasSubmission ? submittedParticipationXP : baseParticipationXP);
            });
        });
        // XP for criteriaSelections (per cirea)
        (eventData.criteria || []).forEach(criterion => {
            if (criterion.criteriaSelections) {
                Object.entries(criterion.criteriaSelections).forEach(([userId, teamName]) => {
                    if (userId && teamName) {
                        if (!xpAwardMap[userId]) xpAwardMap[userId] = {};
                        xpAwardMap[userId][`Criterion:${criterion.constraintLabel}`] = (xpAwardMap[userId][`Criterion:${criterion.constraintLabel}`] || 0) + (criterion.points || 0);
                    }
                });
            }
        });
        // XP for best performer (team only)
        if (eventData.bestPerformerSelections) {
            Object.values(eventData.bestPerformerSelections).forEach(uid => {
                if (uid) {
                    if (!xpAwardMap[uid]) xpAwardMap[uid] = {};
                    xpAwardMap[uid]['BestPerformer'] = (xpAwardMap[uid]['BestPerformer'] || 0) + bestPerformerBonusXP;
                }
            });
        }
    } else if (eventData.details.format === EventFormat.Individual && Array.isArray(eventData.participants)) {
        eventData.participants.filter(Boolean).forEach(uid => {
            if (!xpAwardMap[uid]) xpAwardMap[uid] = {};
            xpAwardMap[uid]['Participation'] = (xpAwardMap[uid]['Participation'] || 0) + baseParticipationXP;
        });
    }
    // Additional XP logic for winners, best performers, etc.
    return xpAwardMap;
}

export function handleFirestoreError(error: any): string {
    if (error?.code === 'permission-denied') return 'You do not have permission to perform this action.';
    if (error?.code === 'not-found') return 'The requested resource was not found.';
    if (error?.code === 'unavailable') return 'The service is temporarily unavailable.';
    if (typeof error?.message === 'string') return error.message;
    return 'An unknown error occurred.';
}
