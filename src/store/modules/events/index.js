// src/store/modules/events/index.js

import { db } from '../../../firebase';
// Remove the local _calculateWeightedAverageScore if it's defined here,
// as it's better placed in helpers.js or accessed via root getters if needed elsewhere.
// import { _calculateWeightedAverageScore } from './helpers'; // Assuming it's in helpers
import { eventActions } from './actions';
import { eventMutations } from './mutations';

const state = {
    events: [], // Single list for all event statuses
    currentEventDetails: null,
};

const getters = {
    allEvents: (state) => state.events,

    // --- REVIEWED GETTER ---
    // Remove admin event creation checks from upcomingEvents
    upcomingEvents: (state) =>
        state.events.filter(e => e.status === 'Approved')
            .sort((a, b) => (a.startDate?.seconds ?? 0) - (b.startDate?.seconds ?? 0)),

    activeEvents: (state) =>
        state.events.filter(e => e.status === 'InProgress') // Changed from 'In Progress' to match DB status value
            .sort((a, b) => (a.startDate?.seconds ?? 0) - (b.startDate?.seconds ?? 0)),

    completedEvents: (state) =>
        state.events.filter(e => e.status === 'Completed')
            .sort((a, b) => (b.completedAt?.seconds ?? b.endDate?.seconds ?? 0) - (a.completedAt?.seconds ?? a.endDate?.seconds ?? 0)),

    pendingEvents: (state) =>
        state.events.filter(e => e.status === 'Pending')
            .sort((a, b) => (a.createdAt?.seconds ?? 0) - (b.createdAt?.seconds ?? 0)), // Sort by creation time

    userRequests: (state, _getters, _rootState, rootGetters) => {
        const userId = rootGetters['user/getUser']?.uid;
        if (!userId) return [];
        // Shows user's own Pending or Rejected requests
        return state.events.filter(e =>
            e.requester === userId && ['Pending', 'Rejected'].includes(e.status)
        ).sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0)); // Newest first
    },

    currentEventDetails: (state) => state.currentEventDetails,

    // Getter for XP Allocation (already seems correct, uses xpAllocation field)
    getEventXPAllocation: (state) => (eventId) => {
        const event = state.events.find(e => e.id === eventId) || state.currentEventDetails?.id === eventId ? state.currentEventDetails : null;
        if (!event?.xpAllocation || !Array.isArray(event.xpAllocation)) {
            return []; // Return empty array if no allocation data
        }
        // Map and sort the allocation data
        return event.xpAllocation
            .map(allocation => ({
                constraintIndex: allocation.constraintIndex ?? 0, // Use nullish coalescing for defaults
                constraintLabel: allocation.constraintLabel || `Criteria ${ (allocation.constraintIndex ?? 0) + 1 }`, // Default label
                points: allocation.points || 0,
                role: allocation.role || 'general' // Default role
            }))
             .sort((a, b) => a.constraintIndex - b.constraintIndex); // Sort by index
    },

    // --- MODIFIED GETTER ---
    // Derive rating constraints *only* from xpAllocation
    getEventRatingConstraints: (state) => (eventId) => {
        const event = state.events.find(e => e.id === eventId) || 
                     (state.currentEventDetails?.id === eventId ? state.currentEventDetails : null);
        if (!event?.xpAllocation || !Array.isArray(event.xpAllocation) || event.xpAllocation.length === 0) {
             // If no xpAllocation, return empty array (no fallback to legacy ratingConstraints)
            return []; 
        }
        // Map xpAllocation to get the labels (constraints)
        return event.xpAllocation
            .sort((a, b) => (a.constraintIndex ?? 0) - (b.constraintIndex ?? 0)) // Sort by index first
            .map(allocation => allocation.constraintLabel || `Criteria ${ (allocation.constraintIndex ?? 0) + 1 }`); // Get label or default
    },

    // Getter for winners (already checks winnersPerRole, seems okay)
    eventWinners: (state) => (eventId) => {
        const event = state.events.find(e => e.id === eventId) || 
                     (state.currentEventDetails?.id === eventId ? state.currentEventDetails : null);
        if (!event) return []; // Return empty if event not found

        // Prioritize winnersPerRole if it exists and has entries
        if (event.winnersPerRole && typeof event.winnersPerRole === 'object' && Object.keys(event.winnersPerRole).length > 0) {
            // Flatten all winners from all roles into a single array (or adjust based on UI needs)
            // Using Set to avoid duplicates if a user wins multiple roles
            const allWinners = new Set(); // Removed TypeScript <string> annotation
            Object.values(event.winnersPerRole).forEach(roleWinners => {
                if (Array.isArray(roleWinners)) {
                    roleWinners.forEach(winnerId => allWinners.add(winnerId));
                }
            });
            return Array.from(allWinners);
        }
        // Fallback to legacy 'winners' array
        return Array.isArray(event.winners) ? event.winners : [];
    },

     getEventById: (state) => (eventId) => {
        return state.events.find(event => event.id === eventId);
    },
};

export default {
    namespaced: true,
    state,
    getters,
    actions: eventActions,
    mutations: eventMutations
};
