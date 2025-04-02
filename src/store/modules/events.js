mport { db } from '../../firebase';
import { _calculateWeightedAverageScore } from './events/helpers';
import { eventActions } from './events/actions';
import { eventMutations } from './events/mutations';

const state = {
    events: [], // Single list for all event statuses
    currentEventDetails: null,
};

const getters = {
    allEvents: (state) => state.events,
    // Update filtered getters for new status values
    upcomingEvents: (state) =>
        state.events.filter(e => e.status === 'Upcoming' || e.status === 'Approved')
            .sort((a, b) => (a.startDate?.seconds ?? 0) - (b.startDate?.seconds ?? 0)),
    activeEvents: (state) =>
        state.events.filter(e => e.status === 'In Progress')
            .sort((a, b) => (a.startDate?.seconds ?? 0) - (b.startDate?.seconds ?? 0)),
    completedEvents: (state) =>
        state.events.filter(e => e.status === 'Completed')
            .sort((a, b) => (b.completedAt?.seconds ?? b.endDate?.seconds ?? 0) - (a.completedAt?.seconds ?? a.endDate?.seconds ?? 0)),
    pendingEvents: (state) =>
        state.events.filter(e => e.status === 'Pending')
            .sort((a, b) => (a.createdAt?.seconds ?? 0) - (b.createdAt?.seconds ?? 0)),
    userRequests: (state, _getters, _rootState, rootGetters) => {
        const userId = rootGetters['user/getUser']?.uid;
        if (!userId) return [];
        return state.events.filter(e =>
            e.requester === userId && ['Pending', 'Rejected'].includes(e.status)
        ).sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
    },
    // ... keep other existing getters ...
    currentEventDetails: (state) => state.currentEventDetails, // Ensure this exists

    // Add new getters for XP allocation
    getEventXPAllocation: (state) => (eventId) => {
        const event = state.events.find(e => e.id === eventId) || state.currentEventDetails?.id === eventId ? state.currentEventDetails : null;
        
        // Ensure xpAllocation is properly formatted
        if (!event?.xpAllocation || !Array.isArray(event.xpAllocation)) {
            return [];
        }
        
        return event.xpAllocation
            .sort((a, b) => (a.constraintIndex || 0) - (b.constraintIndex || 0))
            .map(allocation => ({
                constraintIndex: allocation.constraintIndex || 0,
                constraintLabel: allocation.constraintLabel || '',
                points: allocation.points || 0,
                role: allocation.role || 'general'
            }));
    },
    getEventRatingConstraints: (state) => (eventId) => {
        const event = state.events.find(e => e.id === eventId) || 
                     (state.currentEventDetails?.id === eventId ? state.currentEventDetails : null);
        if (!event) return [];
        
        // Try to get constraints from xpAllocation first
        if (Array.isArray(event.xpAllocation) && event.xpAllocation.length > 0) {
            return event.xpAllocation
                .sort((a, b) => (a.constraintIndex || 0) - (b.constraintIndex || 0))
                .map(allocation => allocation.constraintLabel);
        }
        
        // Fallback to ratingConstraints
        return Array.isArray(event.ratingConstraints) ? event.ratingConstraints : [];
    },
    eventWinners: (state) => (eventId) => {
        const event = state.events.find(e => e.id === eventId) || 
                     (state.currentEventDetails?.id === eventId ? state.currentEventDetails : null);
        if (!event) return [];
        
        // Check both formats
        if (event.winnersPerRole?.default) {
            return event.winnersPerRole.default;
        }
        return event.winners || [];
    }
};

export default {
    namespaced: true,
    state,
    getters,
    actions: eventActions,
    mutations: eventMutations,
};