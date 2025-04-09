export const eventMutations = {
    setEvents(state, events) {
        // Ensure events is always an array
        state.events = Array.isArray(events) ? events : [];
        // Perform initial sort after setting
        state.events.sort((a, b) => {
            const statusOrder = { Pending: 0, Approved: 1, InProgress: 2, Completed: 3, Cancelled: 4, Rejected: 5 };
            const orderA = statusOrder[a.status] ?? 9;
            const orderB = statusOrder[b.status] ?? 9;
            if (orderA !== orderB) return orderA - orderB;
            const dateA = a.startDate?.seconds ?? a.createdAt?.seconds ?? 0;
            const dateB = b.startDate?.seconds ?? b.createdAt?.seconds ?? 0;
            return dateB - dateA; // Newest first within status group
        });
    },

    addOrUpdateEvent(state, event) {
        if (!event || !event.id) return; // Ignore invalid event data
        const index = state.events.findIndex(e => e.id === event.id);
        if (index !== -1) {
            // Merge changes into the existing event object
            state.events[index] = { ...state.events[index], ...event };
        } else {
            state.events.push(event);
        }
        // Re-sort the array whenever an event is added or updated
        state.events.sort((a, b) => {
            // Simple sort: Pending first, then Approved/InProgress by start date, then Completed/Cancelled/Rejected by end/creation date
             const statusOrder = { Pending: 0, Approved: 1, InProgress: 2, Completed: 3, Cancelled: 4, Rejected: 5 }; // *** SYNTAX FIX: Removed semicolon from inside object ***
             const orderA = statusOrder[a.status] ?? 9; // Default for unknown status
             const orderB = statusOrder[b.status] ?? 9;
             if (orderA !== orderB) return orderA - orderB; // Sort by status first

             // Secondary sort by date (use relevant date based on status group)
             let dateA, dateB;
             if (['Pending', 'Approved', 'InProgress'].includes(a.status)) {
                 dateA = a.startDate?.seconds ?? a.desiredStartDate?.seconds ?? a.createdAt?.seconds ?? 0;
                 dateB = b.startDate?.seconds ?? b.desiredStartDate?.seconds ?? b.createdAt?.seconds ?? 0;
             } else { // Completed, Cancelled, Rejected
                 dateA = a.completedAt?.seconds ?? a.endDate?.seconds ?? a.createdAt?.seconds ?? 0;
                 dateB = b.completedAt?.seconds ?? b.endDate?.seconds ?? b.createdAt?.seconds ?? 0;
             }
             return dateB - dateA; // Descending date (newest first) within status groups
         });
    },

    removeEvent(state, eventId) {
        state.events = state.events.filter(event => event.id !== eventId);
    },

    setCurrentEventDetails(state, eventData) {
        // Ensure storing a deep copy if needed, or null
        state.currentEventDetails = eventData ? { ...eventData } : null;
    },

    updateCurrentEventDetails(state, { id, changes }) {
        if (state.currentEventDetails?.id === id) {
            // Track individual rating counts per user
            if (changes.ratings || changes.teams) {
                const currentUser = rootState.user.uid;
                if (currentUser) {
                    const userRatingCount = changes.isTeamEvent ?
                        changes.teams?.reduce((count, team) => 
                            count + (team.ratings?.filter(r => r.ratedBy === currentUser).length || 0), 0) :
                        changes.ratings?.filter(r => r.ratedBy === currentUser).length || 0;

                    state.currentEventDetails.userRatingCount = userRatingCount;
                }
            }
            state.currentEventDetails = { ...state.currentEventDetails, ...changes };
        }
    },

    clearCurrentEventDetailsIfMatching(state, eventId) {
        // Clear details cache if the deleted/modified event was being viewed
        if (state.currentEventDetails?.id === eventId) {
            state.currentEventDetails = null;
        }
    },

    clearCurrentEventDetails(state) {
        state.currentEventDetails = null;
    },

    // Update organization ratings locally (can be used by the action)
    addOrganizationRating(state, { eventId, score }) {
        const event = state.events.find(e => e.id === eventId);
        if (event) {
            if (!Array.isArray(event.organizationRatings)) {
                event.organizationRatings = [];
            }
            // Simple push for now, matching the action's arrayUnion
            event.organizationRatings.push(Number(score));
        }
        if (state.currentEventDetails && state.currentEventDetails.id === eventId) {
             if (!Array.isArray(state.currentEventDetails.organizationRatings)) {
                 state.currentEventDetails.organizationRatings = [];
             }
             state.currentEventDetails.organizationRatings.push(Number(score));
        }
    },
};