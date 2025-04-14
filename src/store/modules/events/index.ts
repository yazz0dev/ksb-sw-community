// src/store/modules/events/index.js

import { Module } from 'vuex';
import { EventState, Event } from '@/types/event';
import { RootState } from '@/store/types';
import { eventActions } from './actions';
import { eventMutations } from './mutations';

const state: EventState = {
    events: [],
    currentEventDetails: null,
};

const getters = {
    allEvents: (state: EventState): Event[] => state.events,
    
    upcomingEvents: (state: EventState): Event[] =>
        state.events.filter(e => e.status === 'Approved')
            .sort((a, b) => (a.startDate?.seconds ?? 0) - (b.startDate?.seconds ?? 0)),

    activeEvents: (state: EventState): Event[] =>
        state.events.filter(e => e.status === 'InProgress')
            .sort((a, b) => (a.startDate?.seconds ?? 0) - (b.startDate?.seconds ?? 0)),

    completedEvents: (state: EventState): Event[] =>
        state.events.filter(e => e.status === 'Completed')
            .sort((a, b) => (b.completedAt?.seconds ?? b.endDate?.seconds ?? 0) - (a.completedAt?.seconds ?? a.endDate?.seconds ?? 0)),

    pendingEvents: (state: EventState): Event[] =>
        state.events.filter(e => e.status === 'Pending')
            .sort((a, b) => (a.createdAt?.seconds ?? 0) - (b.createdAt?.seconds ?? 0)),

    userRequests: (state: EventState, _getters, _rootState, rootGetters): Event[] => {
        const userId = rootGetters['user/getUser']?.uid;
        if (!userId) return [];
        return state.events.filter(e =>
            e.requester === userId && ['Pending', 'Rejected'].includes(e.status)
        ).sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
    },

    currentEventDetails: (state: EventState): Event | null => state.currentEventDetails,

    getEventXPAllocation: (state: EventState) => (eventId: string): any[] => {
        const event = state.events.find(e => e.id === eventId) || state.currentEventDetails?.id === eventId ? state.currentEventDetails : null;
        if (!event?.xpAllocation || !Array.isArray(event.xpAllocation)) {
            return [];
        }
        return event.xpAllocation
            .map(allocation => ({
                constraintIndex: allocation.constraintIndex ?? 0,
                constraintLabel: allocation.constraintLabel || `Criteria ${ (allocation.constraintIndex ?? 0) + 1 }`,
                points: allocation.points || 0,
                role: allocation.role || 'general'
            }))
            .sort((a, b) => a.constraintIndex - b.constraintIndex);
    },

    getEventRatingConstraints: (state: EventState) => (eventId: string): string[] => {
        const event = state.events.find(e => e.id === eventId) || 
                     (state.currentEventDetails?.id === eventId ? state.currentEventDetails : null);
        if (!event?.xpAllocation || !Array.isArray(event.xpAllocation) || event.xpAllocation.length === 0) {
            return [];
        }
        return event.xpAllocation
            .sort((a, b) => (a.constraintIndex ?? 0) - (b.constraintIndex ?? 0))
            .map(allocation => allocation.constraintLabel || `Criteria ${ (allocation.constraintIndex ?? 0) + 1 }`);
    },

    eventWinners: (state: EventState) => (eventId: string): string[] => {
        const event = state.events.find(e => e.id === eventId) || 
                     (state.currentEventDetails?.id === eventId ? state.currentEventDetails : null);
        if (!event) return [];

        if (event.winnersPerRole && typeof event.winnersPerRole === 'object' && Object.keys(event.winnersPerRole).length > 0) {
            const allWinners = new Set();
            Object.values(event.winnersPerRole).forEach(roleWinners => {
                if (Array.isArray(roleWinners)) {
                    roleWinners.forEach(winnerId => allWinners.add(winnerId));
                }
            });
            return Array.from(allWinners);
        }
        return Array.isArray(event.winners) ? event.winners : [];
    },

    getEventById: (state: EventState) => (eventId: string): Event | undefined => {
        return state.events.find(event => event.id === eventId);
    },
};

export default {
    namespaced: true,
    state,
    getters,
    actions: eventActions,
    mutations: eventMutations
} as Module<EventState, RootState>;
