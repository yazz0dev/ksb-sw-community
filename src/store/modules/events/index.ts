// src/store/modules/events/index.ts
import { Module } from 'vuex';
import { EventState, Event, EventStatus, XPAllocation } from '@/types/event'; // Import needed types
import { RootState } from '@/store/types';
import { eventActions } from './actions';
import * as eventActionsPart2 from './actions.part2';
import { eventMutations } from './mutations';
import { DateTime } from 'luxon'; // For date comparisons

const state: EventState = {
    events: [],
    currentEventDetails: null,
};

const getters = {
    allEvents: (state: EventState): Event[] => state.events,

    // Filter events by status and sort appropriately
    getEventsByStatus: (state: EventState) => (status: EventStatus | EventStatus[]): Event[] => {
        const statuses = Array.isArray(status) ? status : [status];
        return state.events
            .filter(e => statuses.includes(e.status))
            .sort((a, b) => {
                // Sort logic based on status (similar to mutation sort)
                let dateA = 0, dateB = 0;
                if ([EventStatus.Pending, EventStatus.Approved, EventStatus.InProgress].includes(a.status)) {
                    dateA = a.startDate?.toMillis() ?? a.desiredStartDate?.toMillis() ?? a.createdAt?.toMillis() ?? 0;
                    dateB = b.startDate?.toMillis() ?? b.desiredStartDate?.toMillis() ?? b.createdAt?.toMillis() ?? 0;
                    return dateA - dateB; // Ascending for upcoming/active
                } else { // Completed, Cancelled, Rejected
                    dateA = a.completedAt?.toMillis() ?? a.endDate?.toMillis() ?? a.createdAt?.toMillis() ?? 0;
                    dateB = b.completedAt?.toMillis() ?? b.endDate?.toMillis() ?? b.createdAt?.toMillis() ?? 0;
                    return dateB - dateA; // Descending for past events
                }
            });
    },

    // Specific status getters using the generalized one
    upcomingEvents: (state: EventState, getters: any): Event[] => getters.getEventsByStatus(EventStatus.Approved),
    activeEvents: (state: EventState, getters: any): Event[] => getters.getEventsByStatus(EventStatus.InProgress),
    completedEvents: (state: EventState, getters: any): Event[] => getters.getEventsByStatus(EventStatus.Completed),
    pendingEvents: (state: EventState, getters: any): Event[] => getters.getEventsByStatus(EventStatus.Pending),
    cancelledEvents: (state: EventState, getters: any): Event[] => getters.getEventsByStatus(EventStatus.Cancelled),
    rejectedEvents: (state: EventState, getters: any): Event[] => getters.getEventsByStatus(EventStatus.Rejected),

    // User's pending/rejected requests
    userRequests: (state: EventState, _getters: any, _rootState: RootState, rootGetters: any): Event[] => {
        const userId = rootGetters['user/userId']; // Use namespaced getter
        if (!userId) return [];
        return state.events
            .filter(e => e.requester === userId && [EventStatus.Pending, EventStatus.Rejected].includes(e.status))
            .sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0)); // Newest first
    },

    currentEventDetails: (state: EventState): Event | null => state.currentEventDetails,

    // Get event by ID from the list or current details
    getEventById: (state: EventState) => (eventId: string): Event | undefined => {
        if (state.currentEventDetails?.id === eventId) {
            return state.currentEventDetails;
        }
        return state.events.find(event => event.id === eventId);
    },

    // Get sorted XP Allocation for an event
    getEventXPAllocation: (state: EventState, getters: any) => (eventId: string): XPAllocation[] => {
        const event = getters.getEventById(eventId);
        if (!event?.xpAllocation || !Array.isArray(event.xpAllocation)) {
            return [];
        }
        // Ensure constraintIndex is a number before sorting
        return [...event.xpAllocation] // Create shallow copy before sorting
            .filter(alloc => typeof alloc.constraintIndex === 'number')
            .sort((a, b) => a.constraintIndex - b.constraintIndex);
    },

    // Get just the constraint labels in order
    getEventRatingConstraints: (state: EventState, getters: any) => (eventId: string): string[] => {
        const allocations = getters.getEventXPAllocation(eventId) as XPAllocation[];
        return allocations.map(allocation => allocation.constraintLabel || `Criteria ${allocation.constraintIndex + 1}`);
    },

    // Get all unique winner IDs for an event
    eventWinnerIds: (state: EventState, getters: any) => (eventId: string): string[] => {
        const event = getters.getEventById(eventId);
        if (!event?.winnersPerRole) return [];

        const allWinners = new Set<string>();
        Object.values(event.winnersPerRole).forEach(roleWinners => {
            if (Array.isArray(roleWinners)) {
                roleWinners.forEach(winnerId => { if(winnerId) allWinners.add(winnerId) });
            }
        });
        return Array.from(allWinners);
    },
};

export default {
    namespaced: true,
    state,
    getters,
    actions: {
        ...eventActions,
        ...eventActionsPart2, // <-- Add this line to merge in the new actions (including requestEvent)
    },
    mutations: eventMutations
} as Module<EventState, RootState>;