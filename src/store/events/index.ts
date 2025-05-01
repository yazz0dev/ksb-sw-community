// src/store/modules/events/index.ts
import { Module } from 'vuex';
import { Event, EventState, EventStatus, EventCriteria } from '@/types/event';
import { RootState } from '@/types/store';
import { eventActions } from './actions';
import { eventMutations } from './mutations';

const state: EventState = {
    events: [],
    currentEventDetails: null,
};

const getters = {
    /**
     * Get events by an array of event IDs
     * @param state
     * @returns (ids: string[]) => Event[]
     */
    getEventsByIds: (state: EventState) => (ids: string[]): Event[] => {
        if (!Array.isArray(ids) || ids.length === 0) return [];
        return state.events.filter((e: Event) => ids.includes(e.id));
    },
    allEvents: (state: EventState): Event[] => state.events,

    // Filter events by status and sort appropriately
    getEventsByStatus: (state: EventState) => (status: EventStatus | EventStatus[]): Event[] => {
        const statuses = Array.isArray(status) ? status : [status];
        return state.events
            .filter((e: Event) => statuses.includes(e.status as EventStatus))
            .sort((a: Event, b: Event) => {
                // Sort logic based on status (similar to mutation sort)
                let dateA = 0, dateB = 0;
                if (
                  [EventStatus.Pending, EventStatus.Approved, EventStatus.InProgress].includes(a.status as EventStatus)
                ) {
                    dateA = a.details.date.start?.toMillis() ?? a.details.date.start?.toMillis() ?? a.createdAt?.toMillis() ?? 0;
                    dateB = b.details.date.start?.toMillis() ?? b.details.date.start?.toMillis() ?? b.createdAt?.toMillis() ?? 0;
                    return dateA - dateB; // Ascending for upcoming/active
                } else { // Completed, Cancelled, Rejected
                    dateA = a.completedAt?.toMillis() ?? a.details.date.end?.toMillis() ?? a.createdAt?.toMillis() ?? 0;
                    dateB = b.completedAt?.toMillis() ?? b.details.date.end?.toMillis() ?? b.createdAt?.toMillis() ?? 0;
                    return dateB - dateA; // Descending for past events
                }
            });
    },

    // Specific status getters using the generalized one
    upcomingEvents: (state: EventState, getters: { getEventsByStatus: (status: EventStatus) => Event[] }): Event[] => getters.getEventsByStatus(EventStatus.Approved),
    activeEvents: (state: EventState, getters: { getEventsByStatus: (status: EventStatus) => Event[] }): Event[] => getters.getEventsByStatus(EventStatus.InProgress),
    completedEvents: (state: EventState, getters: { getEventsByStatus: (status: EventStatus) => Event[] }): Event[] => getters.getEventsByStatus(EventStatus.Completed),
    pendingEvents: (state: EventState, getters: { getEventsByStatus: (status: EventStatus) => Event[] }): Event[] => getters.getEventsByStatus(EventStatus.Pending),
    cancelledEvents: (state: EventState, getters: { getEventsByStatus: (status: EventStatus) => Event[] }): Event[] => getters.getEventsByStatus(EventStatus.Cancelled),
    rejectedEvents: (state: EventState, getters: { getEventsByStatus: (status: EventStatus) => Event[] }): Event[] => getters.getEventsByStatus(EventStatus.Rejected),

    // User's pending/rejected requests
    userRequests: (state: EventState, _getters: unknown, _rootState: RootState, rootGetters: { [key: string]: unknown }): Event[] => {
        const userId = rootGetters['user/userId']; // Use namespaced getter
        if (!userId) return [];
        return state.events
            .filter(e => e.requestedBy === userId && [EventStatus.Pending, EventStatus.Rejected].includes(e.status as EventStatus))
            .sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0)); // Newest first
    },

    currentEventDetails: (state: EventState): Event | null => state.currentEventDetails,

    // Get event by ID from the list or current details
    getEventById: (state: EventState) => (eventId: string): Event | undefined => {
        if (state.currentEventDetails?.id === eventId) {
            return state.currentEventDetails;
        }
        return state.events.find((event: Event) => event.id === eventId);
    },

    // Get sorted XP Allocation for an event
    getEventXPAllocation: (state: EventState, getters: { getEventById: (id: string) => Event | undefined }) => (eventId: string): EventCriteria[] => {
        const event = getters.getEventById(eventId);
        if (!event?.criteria || !Array.isArray(event.criteria)) {
            return [];
        }
        // Ensure constraintIndex is a number before sorting
        return [...event.criteria] // Create shallow copy before sorting
            .filter(alloc => typeof alloc.constraintIndex === 'number')
            .sort((a, b) => a.constraintIndex - b.constraintIndex);
    },

    // Get just the constraint labels in order
    getEventRatingConstraints: (state: EventState, getters: { getEventById: (id: string) => Event | undefined; getEventXPAllocation: (eventId: string) => EventCriteria[] }) => (eventId: string): string[] => {
        const allocations = getters.getEventXPAllocation(eventId) as any[];
        return allocations.map(allocation => allocation.constraintLabel || `Criteria ${allocation.constraintIndex + 1}`);
    },

    // Get all unique winner IDs for an event
    eventWinnerIds: (state: EventState, getters: any) => (eventId: string): string[] => {
        const event = getters.getEventById(eventId);
        if (!event?.winners) return [];

        const allWinners = new Set<string>();
        Object.values(event.winners).forEach(roleWinners => {
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
        ...eventActions
    },
    mutations: eventMutations
} as Module<EventState, RootState>;