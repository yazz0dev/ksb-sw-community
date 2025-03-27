import { db } from '../../firebase';
import {
    collection,
    addDoc,
    getDocs,
    doc,
    getDoc,
    Timestamp,
    updateDoc,
    deleteDoc,
    query,
    where,
    writeBatch, // Keep import, might be useful later
    orderBy,
    arrayUnion,
    arrayRemove
} from 'firebase/firestore';
// Importing the fetch function from user module is not standard practice.
// Instead, call the user module action via dispatch with { root: true }.

// Helper function to calculate the average score (0-5 scale) from ratings
// Kept internal to this module but accessible via rootGetter if needed elsewhere
const _calculateWeightedAverageScore = (ratings = []) => {
    if (!Array.isArray(ratings) || ratings.length === 0) return 0;

    let totalRatingSum = 0;
    let ratingCount = 0;

    for (const ratingEntry of ratings) {
        if (!ratingEntry || typeof ratingEntry !== 'object' || !ratingEntry.rating || typeof ratingEntry.rating !== 'object') continue;

        const rating = ratingEntry.rating;
        const design = Number(rating.design) || 0;
        const presentation = Number(rating.presentation) || 0;
        const problemSolving = Number(rating.problemSolving) || 0;
        const execution = Number(rating.execution) || 0;
        const technology = Number(rating.technology) || 0;

        // Assuming rating values are 0-5 or similar, adjust divisor if needed
        const overallRating = (design + presentation + problemSolving + execution + technology) / 5.0;

        totalRatingSum += overallRating;
        ratingCount++;
    }

    // Return average score, capped between 0 and 5 (or relevant scale)
    return ratingCount > 0 ? Math.max(0, Math.min(5, totalRatingSum / ratingCount)) : 0;
};


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

const actions = {
    // Check if a user has pending event requests (checks events collection now)
    async checkExistingRequests({ rootGetters }) {
        const currentUser = rootGetters['user/getUser'];
        if (!currentUser || !currentUser.uid) return false;
        const q = query(
            collection(db, 'events'), // Query 'events' collection
            where('requester', '==', currentUser.uid),
            where('status', '==', 'Pending') // Check for 'Pending' status
        );
        const querySnapshot = await getDocs(q);
        return !querySnapshot.empty;
    },

    // Check for date conflicts with existing APPROVED/INPROGRESS events
    async checkDateConflict(_, { startDate, endDate }) {
         let checkStart, checkEnd;
        try {
            // Ensure dates are valid Date objects
            checkStart = startDate instanceof Date ? startDate : new Date(startDate);
            checkEnd = endDate instanceof Date ? endDate : new Date(endDate);
            if (isNaN(checkStart.getTime()) || isNaN(checkEnd.getTime())) {
                throw new Error("Invalid date format.");
            }
            // Set time to avoid time-based overlap issues if only comparing dates
            checkStart.setHours(0, 0, 0, 0);
            checkEnd.setHours(23, 59, 59, 999);

        } catch (e) {
            console.error("Date parsing error in checkDateConflict:", e);
            throw new Error("Invalid date format provided.");
        }

        const q = query( collection(db, 'events'), where('status', 'in', ['Approved', 'InProgress']) ); // Check against Approved/InProgress
        const querySnapshot = await getDocs(q);
        let conflictingEvent = null;

        querySnapshot.forEach((doc) => {
            const event = doc.data();
            if (!event.startDate?.seconds || !event.endDate?.seconds) return; // Skip events without valid dates

            try {
                const eventStart = event.startDate.toDate();
                const eventEnd = event.endDate.toDate();
                if (isNaN(eventStart.getTime()) || isNaN(eventEnd.getTime())) return; // Skip invalid stored dates

                // Set time for comparison to ensure full day coverage
                eventStart.setHours(0, 0, 0, 0);
                eventEnd.setHours(23, 59, 59, 999);

                // Overlap check: (StartA <= EndB) and (EndA >= StartB)
                if (checkStart <= eventEnd && checkEnd >= eventStart) {
                     conflictingEvent = { id: doc.id, ...event };
                     // Can break early if only one conflict is needed: return true in forEach doesn't work, might need a flag
                }
            } catch (dateError) {
                console.warn(`Skipping event ${doc.id} in conflict check due to date issue:`, dateError);
            }
        });
        return conflictingEvent; // Returns null if no conflict, or the first conflicting event found
    },

    // Admin Creates Event Directly -> Status 'Approved'
    async createEvent({ rootGetters, dispatch, commit }, eventData) {
        try {
            // Change how we check admin status and get current user
            const currentUser = rootGetters['user/getUser'];
            const isAdmin = rootGetters['user/isAdmin'];
            if (!isAdmin) {
                throw new Error('Unauthorized: Only Admins can create events directly.');
            }

            let startDateObj, endDateObj;
            try {
                startDateObj = new Date(eventData.startDate);
                endDateObj = new Date(eventData.endDate);
                if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) throw new Error("Invalid date format.");
                // *** CHANGE: Allow start and end date to be the same ***
                if (startDateObj > endDateObj) throw new Error("End date must be strictly after start date.");
            } catch(e) { throw new Error(e.message || "Invalid date format."); }

            // Check for conflicts before proceeding
            const conflict = await dispatch('checkDateConflict', { startDate: startDateObj, endDate: endDateObj });
            if (conflict) { throw new Error(`Date conflict with existing event: "${conflict.eventName}".`); }

            const newEventData = {
                eventName: eventData.eventName || 'Unnamed Event',
                eventType: eventData.eventType || 'Other',
                description: eventData.description || '',
                startDate: Timestamp.fromDate(startDateObj),
                endDate: Timestamp.fromDate(endDateObj),
                requester: currentUser.uid, // Admin is the requester here
                organizer: currentUser.uid, // Admin is also the organizer
                coOrganizers: Array.isArray(eventData.coOrganizers) ? eventData.coOrganizers : [],
                // Use ratingCriteria and xpAllocation from the form data
                ratingCriteria: Array.isArray(eventData.ratingCriteria) ? eventData.ratingCriteria : [],
                xpAllocation: Array.isArray(eventData.xpAllocation) ? eventData.xpAllocation : [], // Make sure this matches form prep
                isTeamEvent: !!eventData.isTeamEvent,
                status: 'Approved', // Directly approved
                ratingsOpen: false,
                winnersPerRole: {}, // Use the new structure
                teams: [], // Initialize, populated below if team event
                participants: [], // Initialize, populated below if individual event
                submissions: [], // For individual events
                ratings: [], // For individual events
                createdAt: Timestamp.now(),
            };

            // Populate participants or teams
            if (newEventData.isTeamEvent) {
                // Ensure teams passed from form have the correct structure
                 newEventData.teams = (Array.isArray(eventData.teams) ? eventData.teams : []).map(team => ({
                     teamName: team.teamName || 'Unnamed Team',
                     members: Array.isArray(team.members) ? team.members : [],
                     submissions: [], // Initialize submissions array for the team
                     ratings: []      // Initialize ratings array for the team
                 }));
            } else {
                // Add all students automatically for individual events
                const studentUIDs = await dispatch('user/fetchAllStudentUIDs', null, { root: true });
                newEventData.participants = studentUIDs;
            }

            const docRef = await addDoc(collection(db, 'events'), newEventData);
            commit('addOrUpdateEvent', { id: docRef.id, ...newEventData }); // Update local state
            return docRef.id;
        } catch (error) {
            console.error('Error creating event:', error);
            throw error; // Re-throw for component to handle
        }
    },

    // Student Requests Event -> Status 'Pending'
    async requestEvent({ dispatch, rootGetters }, eventData) {
        try {
            const currentUser = rootGetters['user/getUser'];
            const userId = currentUser?.uid;
            if (!userId) { throw new Error("User not authenticated."); }

            // Prevent non-admins from submitting multiple pending requests
            if (currentUser.role !== 'Admin') {
                 const hasActive = await dispatch('checkExistingRequests');
                 if (hasActive) { throw new Error('You already have an active or pending event request.'); }
            }

            let startDateObj, endDateObj;
             try {
                // Using desiredStartDate/desiredEndDate from form
                startDateObj = new Date(eventData.desiredStartDate);
                endDateObj = new Date(eventData.desiredEndDate);
                if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) throw new Error("Invalid date format.");
                 // *** CHANGE: Allow start and end date to be the same ***
                if (startDateObj > endDateObj) throw new Error("Desired end date must be strictly after desired start date.");
             } catch(e) { throw new Error(e.message || "Invalid date format."); }

            // Prepare request data
            const requestData = {
                eventName: eventData.eventName || 'Unnamed Request',
                eventType: eventData.eventType || 'Other',
                description: eventData.description || '',
                requester: userId,
                organizer: userId, // Requester is the default organizer
                coOrganizers: Array.isArray(eventData.coOrganizers) ? eventData.coOrganizers : [],
                ratingCriteria: Array.isArray(eventData.ratingCriteria) ? eventData.ratingCriteria : [],
                xpAllocation: Array.isArray(eventData.xpAllocation) ? eventData.xpAllocation : [], // Check naming
                isTeamEvent: !!eventData.isTeamEvent,
                status: 'Pending', // Initial status
                ratingsOpen: false,
                winnersPerRole: {},
                // Store desired dates separately for admin review
                desiredStartDate: Timestamp.fromDate(startDateObj),
                desiredEndDate: Timestamp.fromDate(endDateObj),
                // Actual dates are null until approved
                startDate: null,
                endDate: null,
                // Initialize teams/participants/submissions/ratings as empty
                teams: [],
                participants: [],
                submissions: [],
                ratings: [],
                createdAt: Timestamp.now(),
            };

            // If team event, store proposed teams structure
            if (requestData.isTeamEvent) {
                 requestData.teams = (Array.isArray(eventData.teams) ? eventData.teams : []).map(team => ({
                     teamName: team.teamName || 'Unnamed Team',
                     members: Array.isArray(team.members) ? team.members : [],
                     submissions: [],
                     ratings: []
                 }));
            }

            const docRef = await addDoc(collection(db, 'events'), requestData);
            commit('addOrUpdateEvent', { id: docRef.id, ...requestData }); // Update local state
            return docRef.id; // Return ID for potential immediate use
        } catch (error) {
            console.error('Error requesting event:', error);
            throw error; // Re-throw for component
        }
    },

    // Fetch all events
    async fetchEvents({ commit }) {
        try {
            // Consider adding status filters or pagination if list grows very large
            const q = query(collection(db, 'events'), orderBy('createdAt', 'desc'));
            const querySnapshot = await getDocs(q);
            const events = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            commit('setEvents', events);
        } catch (error) {
            console.error('Error fetching events:', error);
            commit('setEvents', []); // Set empty on error
            // Potentially throw error for UI feedback
        }
    },

    // Fetch specific event details
    async fetchEventDetails({ commit }, eventId) {
         try {
             if (!eventId) {
                 commit('setCurrentEventDetails', null);
                 return null;
             }
             const eventRef = doc(db, 'events', eventId);
             const docSnap = await getDoc(eventRef);

             if (docSnap.exists()) {
                 const eventData = { id: docSnap.id, ...docSnap.data() };
                 commit('setCurrentEventDetails', eventData);
                 return eventData;
             } else {
                 console.warn(`Event with ID ${eventId} not found.`);
                 commit('setCurrentEventDetails', null); // Clear details if not found
                 return null; // Indicate not found
             }
         } catch (error) {
             console.error(`Error fetching event details for ${eventId}:`, error);
             commit('setCurrentEventDetails', null); // Clear on error
             throw error; // Re-throw for UI handling
         }
     },

    // Approve a pending event request
    async approveEventRequest({ dispatch, commit, rootGetters }, eventId) {
        // Permission check: Only Admins
        const currentUser = rootGetters['user/getUser'];
        if (currentUser?.role !== 'Admin') { throw new Error('Unauthorized: Only Admins can approve requests.'); }

        const eventRef = doc(db, 'events', eventId);
        try {
            const eventSnap = await getDoc(eventRef);
            if (!eventSnap.exists() || eventSnap.data().status !== 'Pending') { throw new Error('Event not found or is not in pending state.'); }
            const eventData = eventSnap.data();

            // Use desired dates from the request
            let reqStartDate, reqEndDate;
            if (eventData.desiredStartDate?.seconds) { reqStartDate = eventData.desiredStartDate.toDate(); } else { throw new Error("Request is missing a valid desired start date."); }
            if (eventData.desiredEndDate?.seconds) { reqEndDate = eventData.desiredEndDate.toDate(); } else { throw new Error("Request is missing a valid desired end date."); }

            // Re-check for conflict with Approved/InProgress events using the desired dates before approving
            const conflictingEvent = await dispatch('checkDateConflict', { startDate: reqStartDate, endDate: reqEndDate });
            if (conflictingEvent) { throw new Error(`Approval failed: Date conflict with "${conflictingEvent.eventName}". Please adjust dates via edit or reject.`); }

            // Prepare updates
            const updates = {
                status: 'Approved',
                startDate: eventData.desiredStartDate, // Set actual dates from desired
                endDate: eventData.desiredEndDate,
                participants: [], // Reset participants, populate below if individual
            };

            // Auto-add all students if individual event upon approval
            if (!eventData.isTeamEvent) {
                const studentUIDs = await dispatch('user/fetchAllStudentUIDs', null, { root: true });
                updates.participants = studentUIDs;
            }
            // Ensure teams exist if it's a team event (should have been set during request)
            else if (!Array.isArray(eventData.teams) || eventData.teams.length === 0) {
                // This case might indicate an issue, maybe warn or default?
                console.warn(`Approving team event ${eventId} with no teams defined.`);
                updates.teams = []; // Ensure it's an empty array
            } else {
                 // Ensure existing teams have the required sub-arrays (belt-and-braces)
                 updates.teams = eventData.teams.map(team => ({
                    ...team,
                    submissions: Array.isArray(team.submissions) ? team.submissions : [],
                    ratings: Array.isArray(team.ratings) ? team.ratings : [],
                 }));
            }

            await updateDoc(eventRef, updates);
            dispatch('updateLocalEvent', { id: eventId, changes: updates }); // Update local state caches

        } catch (error) {
            console.error(`Error approving event request ${eventId}:`, error);
            throw error; // Re-throw for UI feedback
        }
    },

    // Reject a pending event request
    async rejectEventRequest({ commit, rootGetters }, eventId) {
        // Permission check: Only Admins
        const currentUser = rootGetters['user/getUser'];
        if (currentUser?.role !== 'Admin') { throw new Error('Unauthorized: Only Admins can reject requests.'); }

        try {
            const eventRef = doc(db, 'events', eventId);
            // Optional: Add a check if event is actually 'Pending'
            // const eventSnap = await getDoc(eventRef);
            // if (!eventSnap.exists() || eventSnap.data().status !== 'Pending') { throw new Error('Event not found or not pending.'); }

            // Consider adding a 'rejectionReason' field if needed in UI
            await updateDoc(eventRef, { status: 'Rejected' });
            commit('addOrUpdateEvent', { id: eventId, status: 'Rejected' }); // Update list state
            commit('updateCurrentEventDetails', { id: eventId, changes: { status: 'Rejected' } }); // Update detail cache if loaded
        } catch (error) {
            console.error(`Error rejecting event request ${eventId}: `, error);
            throw error;
        }
    },

     // Cancel an Approved/InProgress event -> 'Cancelled'
     async cancelEvent({ dispatch, rootGetters }, eventId) {
         const eventRef = doc(db, 'events', eventId);
         try {
             const eventSnap = await getDoc(eventRef);
             if (!eventSnap.exists()) throw new Error("Event not found.");
             const currentEvent = eventSnap.data();

             // Permission Check: Admin or Organizer/CoOrganizer
             const currentUser = rootGetters['user/getUser'];
             const isAdmin = currentUser?.role === 'Admin';
             const isOrganizer = currentEvent.organizer === currentUser?.uid || (currentEvent.coOrganizers || []).includes(currentUser?.uid);
             if (!isAdmin && !isOrganizer) throw new Error("Permission denied to cancel this event.");

             // State Check: Only cancel Approved or In Progress
             if (!['Approved', 'InProgress'].includes(currentEvent.status)) {
                 throw new Error(`Cannot cancel an event with status '${currentEvent.status}'. Consider deleting if Pending/Rejected.`);
             }

             const updates = { status: 'Cancelled', ratingsOpen: false }; // Ensure ratings close on cancel
             await updateDoc(eventRef, updates);
             dispatch('updateLocalEvent', { id: eventId, changes: updates }); // Use helper to update caches
         } catch (error) { console.error(`Error cancelling event ${eventId}:`, error); throw error; }
     },

    // Update the status of an event (Handles main state transitions)
    async updateEventStatus({ dispatch, rootGetters }, { eventId, newStatus }) {
        const validStatuses = ['InProgress', 'Completed', 'Cancelled', 'Approved']; // Approved might be for reverting Cancelled by Admin
        if (!validStatuses.includes(newStatus)) { throw new Error('Invalid target event status provided.'); }

        const eventRef = doc(db, 'events', eventId);
        try {
            const eventSnap = await getDoc(eventRef);
            if (!eventSnap.exists()) throw new Error("Event not found.");
            const currentEvent = { id: eventSnap.id, ...eventSnap.data() };

            const now = new Date();
            let eventStartDate = currentEvent.startDate?.toDate();
            let eventEndDate = currentEvent.endDate?.toDate();

            // Permissions Check: Admin or Organizer/Co-Organizer
            const currentUser = rootGetters['user/getUser'];
            const isAdmin = currentUser?.role === 'Admin';
            const isOrganizer = currentEvent.organizer === currentUser?.uid || (currentEvent.coOrganizers || []).includes(currentUser?.uid);
             if (!isAdmin && !isOrganizer) { throw new Error("Permission denied to update event status."); }

            // State Transition Logic & Validation
            const updates = { status: newStatus };

            switch (newStatus) {
                case 'InProgress':
                    if (currentEvent.status !== 'Approved') throw new Error("Event must be 'Approved' to be marked 'In Progress'.");
                    if (!eventStartDate) throw new Error("Event start date is missing, cannot mark in progress.");
                    // Allow marking in progress on or after the start date (start of day)
                    eventStartDate.setHours(0, 0, 0, 0);
                    if (now < eventStartDate) throw new Error(`Cannot start event before ${eventStartDate.toLocaleDateString()}.`);
                    updates.ratingsOpen = false; // Ensure ratings are closed when starting/re-starting
                    break;

                case 'Completed':
                    if (currentEvent.status !== 'InProgress') throw new Error("Event must be 'In Progress' to be marked 'Completed'.");
                    if (!eventEndDate) throw new Error("Event end date is missing, cannot mark completed.");
                    // Allow completion on or after the end date (end of day)
                    let endOfDay = eventEndDate ? new Date(eventEndDate) : new Date();
                    endOfDay.setHours(23, 59, 59, 999);
                    if (now < endOfDay) throw new Error(`Cannot complete event before the end of ${endOfDay.toLocaleDateString()}.`);
                    updates.ratingsOpen = false; // Default to closed on completion
                    updates.completedAt = Timestamp.now(); // Record completion time
                    break;

                case 'Cancelled': // Logic moved to separate cancelEvent action for clarity
                     return await dispatch('cancelEvent', eventId); // Delegate to specific action

                case 'Approved': // Primarily for Admin potentially reverting a 'Cancelled' event
                    if (!isAdmin) throw new Error("Only Admins can change status to 'Approved'.");
                    if (currentEvent.status !== 'Cancelled') throw new Error("Can only re-approve events that are 'Cancelled'.");
                    // IMPORTANT: Re-check date conflict before re-approving
                    if (!eventStartDate || !eventEndDate) throw new Error("Event dates missing, cannot re-approve.");
                    const conflict = await dispatch('checkDateConflict', { startDate: eventStartDate, endDate: eventEndDate });
                    if (conflict) throw new Error(`Cannot re-approve: Date conflict with "${conflict.eventName}".`);
                    // Reset completedAt if it exists?
                    updates.completedAt = null; // Or use deleteField() if necessary
                    break;
            }

            // Perform the update if not handled by delegation
            await updateDoc(eventRef, updates);
            dispatch('updateLocalEvent', { id: eventId, changes: updates }); // Update local state caches

            // Trigger XP calculation ONLY when moving TO Completed FROM a different state
            if (newStatus === 'Completed' && currentEvent.status !== 'Completed') {
                console.log(`Event ${eventId} marked completed. Triggering XP calculation.`);
                // Ensure user module is loaded or handle potential errors
                 dispatch('user/calculateUserXP', null, { root: true })
                    .catch(xpError => console.error(`XP Calculation trigger failed for event ${eventId}:`, xpError));
            }
        } catch (error) {
            console.error(`Error updating event ${eventId} status to ${newStatus}:`, error);
            throw error;
        }
    },

    // Toggle whether ratings are open for a completed event
    async toggleRatingsOpen({ dispatch, rootGetters }, { eventId, isOpen }) {
         const eventRef = doc(db, 'events', eventId);
         try {
             const eventSnap = await getDoc(eventRef);
             if (!eventSnap.exists()) throw new Error("Event not found.");
             const currentEvent = eventSnap.data();

             // Permission Check: Admin or Organizer/CoOrganizer
             const currentUser = rootGetters['user/getUser'];
             const isAdmin = currentUser?.role === 'Admin';
             const isOrganizer = currentEvent.organizer === currentUser?.uid || (currentEvent.coOrganizers || []).includes(currentUser?.uid);
             if (!isAdmin && !isOrganizer) throw new Error("Permission denied to toggle ratings.");

             // State Check: Only for Completed events
             if (currentEvent.status !== 'Completed') throw new Error("Ratings can only be toggled for completed events.");

             const newRatingsOpenState = !!isOpen; // Ensure boolean
             await updateDoc(eventRef, { ratingsOpen: newRatingsOpenState });
             dispatch('updateLocalEvent', { id: eventId, changes: { ratingsOpen: newRatingsOpenState } });
         } catch (error) { console.error(`Error toggling ratings for event ${eventId}:`, error); throw error; }
     },

    // Set the winners PER ROLE for an event
    async setWinnersPerRole({ dispatch, rootGetters }, { eventId, winnersMap }) {
         if (typeof winnersMap !== 'object' || winnersMap === null) {
             throw new Error("Invalid winners map provided. Must be an object.");
         }
         // Optional: Validate structure of winnersMap further if needed

         const eventRef = doc(db, 'events', eventId);
         try {
             const eventSnap = await getDoc(eventRef);
             if (!eventSnap.exists()) throw new Error("Event not found.");
             const currentEvent = eventSnap.data();

             // Permission Check: Admin or Organizer/CoOrganizer
             const currentUser = rootGetters['user/getUser'];
             const isAdmin = currentUser?.role === 'Admin';
             const isOrganizer = currentEvent.organizer === currentUser?.uid || (currentEvent.coOrganizers || []).includes(currentUser?.uid);
             if (!isAdmin && !isOrganizer) throw new Error("Permission denied to set winners.");

             // State Check: Only for Completed events
             if (currentEvent.status !== 'Completed') throw new Error("Winners can only be set for completed events.");


             await updateDoc(eventRef, { winnersPerRole: winnersMap });
             dispatch('updateLocalEvent', { id: eventId, changes: { winnersPerRole: winnersMap } });
             // Winners changing *definitely* affects XP, trigger recalc
             console.log(`Winners set for ${eventId}. Triggering XP calculation.`);
             dispatch('user/calculateUserXP', null, { root: true })
                 .catch(xpError => console.error(`XP Calculation trigger failed after setting winners for ${eventId}:`, xpError));
         } catch (error) { console.error(`Error setting winners for event ${eventId}:`, error); throw error; }
     },

    // Delete an event
    async deleteEvent({ commit, rootGetters }, eventId) {
         const eventRef = doc(db, 'events', eventId);
         try {
            const eventSnap = await getDoc(eventRef);
            if (!eventSnap.exists()) { console.warn(`Event ${eventId} already deleted or never existed.`); return; } // Exit gracefully if already gone
            const eventData = eventSnap.data();
            const currentUser = rootGetters['user/getUser'];
            const isAdmin = currentUser?.role === 'Admin';
            const isRequester = eventData.requester === currentUser?.uid;

            let canDelete = false;
             // Admin can delete any event EXCEPT maybe 'In Progress' (force cancel first?)
             if (isAdmin) {
                  if (eventData.status === 'In Progress') {
                      throw new Error("Cannot delete 'In Progress' event. Cancel it first.");
                  }
                  canDelete = true;
             }
             // User can delete their OWN 'Pending' or 'Rejected' request
             else if (isRequester && ['Pending', 'Rejected'].includes(eventData.status)) {
                 canDelete = true;
             }

            if (!canDelete) {
                throw new Error(`Permission denied to delete this event (Status: ${eventData.status}).`);
            }

            await deleteDoc(eventRef);
            commit('removeEvent', eventId); // Remove from list state
            commit('clearCurrentEventDetailsIfMatching', eventId); // Clear detail cache if it was the one being viewed
            console.log(`Event ${eventId} deleted successfully.`);
         } catch (error) { console.error(`Error deleting event ${eventId}:`, error); throw error; }
     },

    // Calculate winners automatically based on ratings per role
     async calculateWinnersAuto({ dispatch, state }, eventId) { // Use state directly or fetchEventDetails
         console.log(`Attempting auto-calculation of winners per role for event: ${eventId}`);
         try {
             // Ensure we have the latest event data
             const event = state.currentEventDetails?.id === eventId ? state.currentEventDetails : await dispatch('fetchEventDetails', eventId);

             if (!event || event.status !== 'Completed') { throw new Error("Event not found or is not completed."); }
             // Use xpAllocation and ratingCriteria from the fetched/current event data
             const xpAlloc = event.xpAllocation || [];
             const criteria = event.ratingCriteria || [];

             if (xpAlloc.length === 0) { throw new Error("Event has no XP allocation defined (xpAllocation array is empty)."); }
             if (criteria.length === 0) { throw new Error("Event has no rating criteria defined (ratingCriteria array is empty)."); }

             // Map roles to the criteria indices that define them
             const roleToCriteriaIndices = {};
             criteria.forEach((crit, index) => {
                if (crit.role) {
                    if (!roleToCriteriaIndices[crit.role]) {
                        roleToCriteriaIndices[crit.role] = [];
                    }
                    roleToCriteriaIndices[crit.role].push(index); // Store index of the criterion
                }
             });

             const scoresPerRolePerParticipant = {}; // { participantId: { roleKey: averageScore, ... }, ... }

             // Determine if individual or team and get participants/teams
             const participantsOrTeams = event.isTeamEvent
                 ? (event.teams || []).map(t => ({ id: t.teamName, type: 'team', ratings: t.ratings || [] })) // Use teamName as ID
                 : (event.participants || []).map(pId => ({ id: pId, type: 'individual', ratings: (event.ratings || []).filter(r => r.ratedTo === pId) }));

             if (participantsOrTeams.length === 0) {
                 alert('Winner calculation: No participants or teams found for this event.');
                 await dispatch('setWinnersPerRole', { eventId, winnersMap: {} }); // Set empty winners
                 return;
             }

             // --- 1. Calculate average score for each participant/team for each ROLE based on relevant criteria ---
             for (const p of participantsOrTeams) {
                 scoresPerRolePerParticipant[p.id] = {};
                 const participantRatings = p.ratings; // Ratings specific to this participant/team

                 // Iterate through roles defined in xpAllocation
                 for (const allocation of xpAlloc) {
                     const roleKey = allocation.role;
                     const pointsForRole = allocation.points || 0;

                     if (!roleKey || pointsForRole <= 0) {
                          scoresPerRolePerParticipant[p.id][roleKey || 'unassigned'] = 0; // Assign 0 if no role or no points
                          continue;
                     }

                      // Find the criteria indices relevant to this role
                      const relevantCriteriaIndices = roleToCriteriaIndices[roleKey] || [];

                      if (relevantCriteriaIndices.length === 0) {
                          scoresPerRolePerParticipant[p.id][roleKey] = 0; // No criteria defined for this role
                          continue;
                      }

                      // Calculate average score *across all raters* for this participant *for this role*
                      let totalRoleScoreSum = 0; // Sum of average scores from each rater for this role
                      let ratingCountForRole = 0; // Number of raters who provided ratings for relevant criteria

                      for (const ratingEntry of participantRatings) {
                          if (!ratingEntry?.rating) continue; // Skip if rating object is missing

                          let criteriaSumForThisRater = 0;
                          let criteriaCountForThisRater = 0;

                          // Average the relevant criteria for *this specific rater*
                          relevantCriteriaIndices.forEach(index => {
                               // Assume rating keys match the structure used in RatingForm (e.g., 'constraint0', 'constraint1'...)
                               const constraintKey = `constraint${index}`;
                               const ratingValue = Number(ratingEntry.rating[constraintKey]); // Use ratingEntry.rating

                               if (!isNaN(ratingValue) && ratingValue >= 0) { // Consider 0 a valid rating? Adjust if needed (e.g., ratingValue > 0)
                                    criteriaSumForThisRater += ratingValue;
                                    criteriaCountForThisRater++;
                               }
                          });

                          // If this rater provided scores for at least one relevant criterion
                          if (criteriaCountForThisRater > 0) {
                              const averageScoreFromThisRater = criteriaSumForThisRater / criteriaCountForThisRater;
                              totalRoleScoreSum += averageScoreFromThisRater;
                              ratingCountForRole++;
                          }
                      }

                      // Final average score for this participant for this role (average of averages from raters)
                      scoresPerRolePerParticipant[p.id][roleKey] = ratingCountForRole > 0 ? (totalRoleScoreSum / ratingCountForRole) : 0;
                 }
             }
            // console.log("Calculated Scores Per Role:", JSON.stringify(scoresPerRolePerParticipant, null, 2));

             // --- 2. Determine winner(s) for each role based on calculated scores ---
             const winnersMap = {}; // { roleKey: [winnerId1, winnerId2], ... }
             let winnersFound = false;

             // Iterate through roles defined in xpAllocation again to find winners
             for (const allocation of xpAlloc) {
                 const roleKey = allocation.role;
                 const pointsForRole = allocation.points || 0;

                 if (!roleKey || pointsForRole <= 0) continue; // Skip roles with no points or no key

                 let topScoreForRole = -1;
                 let currentWinnersForRole = [];

                 participantsOrTeams.forEach(p => {
                     const score = scoresPerRolePerParticipant[p.id]?.[roleKey] ?? 0;
                     if (score > topScoreForRole) {
                         topScoreForRole = score;
                         currentWinnersForRole = [p.id]; // New top score, reset winners
                     } else if (score === topScoreForRole && topScoreForRole > 0) { // Tie for top score (and score > 0)
                         currentWinnersForRole.push(p.id);
                     }
                 });

                 if (topScoreForRole > 0) {
                     winnersMap[roleKey] = currentWinnersForRole.sort(); // Store sorted list of winner IDs (participant or team name)
                     winnersFound = true;
                 } else {
                     winnersMap[roleKey] = []; // No winner found for this role (or all scores were 0)
                 }
             }
            // console.log("Determined Winners Map:", JSON.stringify(winnersMap, null, 2));

             // --- 3. Save the winners map ---
             await dispatch('setWinnersPerRole', { eventId, winnersMap });
             alert(winnersFound
                 ? 'Automatic winner calculation per role complete. Check event details for winners.'
                 : 'Winner calculation complete, but no winners determined (scores might be zero, criteria unassigned, or no ratings submitted).'
             );

         } catch (error) {
             console.error(`Error auto-calculating winners for event ${eventId}:`, error);
             alert(`Winner Calculation Error: ${error.message}`); // Provide feedback to user
         }
     },

    // Helper action to update local state caches consistently
    updateLocalEvent({ commit }, { id, changes }) {
        commit('addOrUpdateEvent', { id, ...changes }); // Update the main list
        commit('updateCurrentEventDetails', { id, changes }); // Update the detailed view cache if matching
    },

    // Submit a project to an event
    async submitProjectToEvent({ rootGetters, dispatch }, { eventId, submissionData }) {
        // Basic validation
        if (!submissionData || !submissionData.projectName || !submissionData.link) { throw new Error("Project Name and Link are required for submission."); }
        if (!submissionData.link.startsWith('http://') && !submissionData.link.startsWith('https://')) { throw new Error("Please provide a valid URL starting with http:// or https://."); }

        const eventRef = doc(db, 'events', eventId);
        try {
            const eventSnap = await getDoc(eventRef);
            if (!eventSnap.exists()) throw new Error('Event not found.');
            const eventData = eventSnap.data();
            const userId = rootGetters['user/getUser']?.uid;
            if (!userId) throw new Error("User not authenticated.");

            // State Check: Only allow during 'In Progress'
            if (eventData.status !== 'In Progress') { throw new Error("Project submissions are only allowed while the event is 'In Progress'."); }

            let updatedEventData; // To hold changes for local cache update
            const submissionEntry = {
                ...submissionData,
                submittedAt: Timestamp.now(),
                submittedBy: userId // Track who submitted, even for teams
            };

            if (eventData.isTeamEvent) {
                 const currentTeams = Array.isArray(eventData.teams) ? eventData.teams : [];
                 const userTeamIndex = currentTeams.findIndex(team => Array.isArray(team.members) && team.members.includes(userId));
                 if (userTeamIndex === -1) throw new Error("You are not currently assigned to a team for this event.");

                 // Check if team already submitted
                 const teamSubmissions = currentTeams[userTeamIndex]?.submissions || [];
                 if (teamSubmissions.length > 0) throw new Error("Your team has already submitted a project for this event.");

                 // Create a deep copy to modify safely
                 const updatedTeams = JSON.parse(JSON.stringify(currentTeams));
                 if (!Array.isArray(updatedTeams[userTeamIndex].submissions)) { updatedTeams[userTeamIndex].submissions = []; } // Ensure array exists
                 updatedTeams[userTeamIndex].submissions.push(submissionEntry);

                 await updateDoc(eventRef, { teams: updatedTeams });
                 updatedEventData = { teams: updatedTeams }; // Changes for local update
            } else {
                 // Individual event
                 const currentParticipants = Array.isArray(eventData.participants) ? eventData.participants : [];
                 if (!currentParticipants.includes(userId)) throw new Error("You are not registered as a participant for this event.");

                 const currentSubmissions = Array.isArray(eventData.submissions) ? eventData.submissions : [];
                 if (currentSubmissions.some(sub => sub.participantId === userId)) throw new Error("You have already submitted a project for this event.");

                 // Add participantId specifically for individual submissions
                 submissionEntry.participantId = userId;

                 // Use arrayUnion for atomic update
                 await updateDoc(eventRef, { submissions: arrayUnion(submissionEntry) });

                 // Refetch to get the accurate updated array for local state
                 const freshSnap = await getDoc(eventRef);
                 updatedEventData = { submissions: freshSnap.data()?.submissions || [] };
            }

             dispatch('updateLocalEvent', { id: eventId, changes: updatedEventData }); // Update local caches
             console.log(`Project submitted successfully for event ${eventId} by user ${userId}`);
        } catch (error) { console.error(`Error submitting project for event ${eventId}:`, error); throw error; }
    },

    // Leave an event (only 'Upcoming')
    async leaveEvent({ rootGetters, dispatch }, eventId) {
        const eventRef = doc(db, 'events', eventId);
        try {
            const eventSnap = await getDoc(eventRef);
            if (!eventSnap.exists()) throw new Error('Event not found.');
            const eventData = eventSnap.data();
            const userId = rootGetters['user/getUser']?.uid;
            if (!userId) throw new Error("User not authenticated.");

            // State Check: Only allow leaving 'Upcoming' or 'Approved' events
            if (!['Upcoming', 'Approved'].includes(eventData.status)) {
                throw new Error(`Cannot leave event with status '${eventData.status}'. Only 'Upcoming' or 'Approved' events can be left.`);
            }

             let updatedEventData; // To hold changes for local cache update

            if (eventData.isTeamEvent) {
                const currentTeams = Array.isArray(eventData.teams) ? eventData.teams : [];
                let userTeamIndex = -1;
                let userTeamName = '';

                // Find the team the user is in
                for(let i = 0; i < currentTeams.length; i++) {
                    if (Array.isArray(currentTeams[i].members) && currentTeams[i].members.includes(userId)) {
                        userTeamIndex = i;
                        userTeamName = currentTeams[i].teamName;
                        break;
                    }
                }

                if (userTeamIndex === -1) { console.log(`LeaveEvent: User ${userId} is not in any team for event ${eventId}. No action taken.`); return; } // Exit silently if not in a team

                // Create a deep copy to modify
                const updatedTeams = JSON.parse(JSON.stringify(currentTeams));
                // Filter out the user from the team members array
                updatedTeams[userTeamIndex].members = updatedTeams[userTeamIndex].members.filter(memberId => memberId !== userId);

                // Optional: Handle empty teams? Delete team if last member leaves? Discuss requirements.
                 // if (updatedTeams[userTeamIndex].members.length === 0) {
                 //    console.log(`Team "${userTeamName}" is now empty after user ${userId} left.`);
                 //    // updatedTeams.splice(userTeamIndex, 1); // Option to remove empty team
                 // }

                await updateDoc(eventRef, { teams: updatedTeams });
                updatedEventData = { teams: updatedTeams };
            } else {
                // Individual event
                const currentParticipants = Array.isArray(eventData.participants) ? eventData.participants : [];
                if (!currentParticipants.includes(userId)) { console.log(`LeaveEvent: User ${userId} is not a participant in event ${eventId}. No action taken.`); return; } // Exit silently if not participating

                // Use arrayRemove for atomic update
                await updateDoc(eventRef, { participants: arrayRemove(userId) });

                // Refetch to get the accurate updated array for local state
                const freshSnap = await getDoc(eventRef);
                updatedEventData = { participants: freshSnap.data()?.participants || [] };
            }

             dispatch('updateLocalEvent', { id: eventId, changes: updatedEventData }); // Update local caches
             console.log(`User ${userId} successfully left event ${eventId}.`);
        } catch (error) { console.error(`Error leaving event ${eventId}:`, error); throw error; }
    },

   // Add a new Team to an existing Team Event
    async addTeamToEvent({ dispatch, rootGetters }, { eventId, teamName, members }) {
        const eventRef = doc(db, 'events', eventId);
        try {
            const eventSnap = await getDoc(eventRef);
            if (!eventSnap.exists()) throw new Error('Event not found.');
            const eventData = eventSnap.data();

            // Permission Check: Admin or Organizer/CoOrganizer
            const currentUser = rootGetters['user/getUser'];
            const isAdmin = currentUser?.role === 'Admin';
            const isOrganizer = eventData.organizer === currentUser?.uid || (eventData.coOrganizers || []).includes(currentUser?.uid);
            if (!isAdmin && !isOrganizer) throw new Error("Permission denied to manage teams for this event.");

            // State & Type Check: Allow adding teams in Pending, Approved, or InProgress? (Discuss - limiting to Pending/Approved might be safer)
            if (!['Pending', 'Approved'].includes(eventData.status)) { // Restricting modification post-start
                throw new Error(`Cannot add teams to event with status '${eventData.status}'. Allowed only for 'Pending' or 'Approved'.`);
            }
            if (!eventData.isTeamEvent) throw new Error("Cannot add teams: This is not a team event.");

            // Validation
            const trimmedTeamName = teamName?.trim();
            if (!trimmedTeamName) throw new Error("Team name cannot be empty.");
            const currentTeams = eventData.teams || [];
            if (currentTeams.some(t => t.teamName.toLowerCase() === trimmedTeamName.toLowerCase())) throw new Error(`A team named "${trimmedTeamName}" already exists.`);
            if (!Array.isArray(members) || members.length === 0) throw new Error("A team must have at least one member.");

            // Check if selected members are already assigned elsewhere
            const assignedStudents = new Set(currentTeams.flatMap(t => t.members || []));
            const alreadyAssigned = members.filter(m => assignedStudents.has(m));
            if (alreadyAssigned.length > 0) {
                 // Improve error message: fetch names if possible?
                 // For now, just list IDs
                throw new Error(`Cannot add team: The following students are already in other teams: ${alreadyAssigned.join(', ')}`);
            }

            // Prepare new team object
            const newTeam = {
                teamName: trimmedTeamName,
                members: members,
                submissions: [], // Initialize empty
                ratings: []      // Initialize empty
            };

            // Use arrayUnion for adding the new team object
            await updateDoc(eventRef, { teams: arrayUnion(newTeam) });

            // Refetch to get the updated array for local state
            const freshSnap = await getDoc(eventRef);
            const updatedTeamsArray = freshSnap.data()?.teams || [];
            dispatch('updateLocalEvent', { id: eventId, changes: { teams: updatedTeamsArray } }); // Update local cache
            console.log(`Team "${trimmedTeamName}" added successfully to event ${eventId}.`);
            return newTeam; // Return the added team data

        } catch (error) {
            console.error(`Error adding team to event ${eventId}:`, error);
            throw error; // Re-throw for component
        }
    },

    // Update Event Details (e.g., description, dates for Pending, teams, criteria)
    async updateEventDetails({ dispatch, rootGetters }, { eventId, updates }) {
        const eventRef = doc(db, 'events', eventId);
        try {
            const eventSnap = await getDoc(eventRef);
            if (!eventSnap.exists()) throw new Error('Event not found.');
            const eventData = eventSnap.data();

            // Permission Check: Admin, Organizer/CoOrganizer, OR Requester if Pending
            const currentUser = rootGetters['user/getUser'];
            const isAdmin = currentUser?.role === 'Admin';
            const isOrganizer = eventData.organizer === currentUser?.uid || (eventData.coOrganizers || []).includes(currentUser?.uid);
            const isRequester = eventData.requester === currentUser?.uid;

            let canEdit = false;
            // Admins can edit Pending or Approved
            if (isAdmin && ['Pending', 'Approved'].includes(eventData.status)) {
                canEdit = true;
            }
            // Organizers/CoOrganizers can edit Pending or Approved
            else if (isOrganizer && ['Pending', 'Approved'].includes(eventData.status)) {
                canEdit = true;
            }
            // Requester can edit their OWN Pending request
            else if (isRequester && eventData.status === 'Pending') {
                 canEdit = true;
            }

            if (!canEdit) {
                 throw new Error(`Permission denied to edit event details (Status: ${eventData.status}).`);
            }

             // Filter and Validate Updates
             const allowedUpdates = {};
             // Define fields editable in both Pending & Approved states
             const generallyEditableFields = ['description', 'coOrganizers', 'ratingCriteria', 'xpAllocation', 'isTeamEvent', /* 'teams' handled separately below */];
             // Define fields editable ONLY in Pending state
             const pendingOnlyEditableFields = ['eventName', 'eventType', 'desiredStartDate', 'desiredEndDate'];

             for (const key in updates) {
                 if (generallyEditableFields.includes(key)) {
                     // Add basic validation if necessary (e.g., array type checks)
                     if (key === 'coOrganizers' && !Array.isArray(updates[key])) continue;
                     if (key === 'ratingCriteria' && !Array.isArray(updates[key])) continue;
                     if (key === 'xpAllocation' && !Array.isArray(updates[key])) continue;
                     allowedUpdates[key] = updates[key];
                 } else if (eventData.status === 'Pending' && pendingOnlyEditableFields.includes(key)) {
                     // Handle date conversion and validation for desired dates
                     if (key === 'desiredStartDate' || key === 'desiredEndDate') {
                         try {
                             const dateVal = new Date(updates[key]);
                             if (isNaN(dateVal.getTime())) throw new Error(`Invalid date format for ${key}`);
                             allowedUpdates[key] = Timestamp.fromDate(dateVal);
                         } catch (e) { throw new Error(e.message || `Invalid format for ${key}`); }
                     } else {
                         allowedUpdates[key] = updates[key]; // For eventName, eventType
                     }
                 }
                 // Special handling for 'teams' update (replace entire array)
                 else if (key === 'teams' && eventData.isTeamEvent && Array.isArray(updates.teams)) {
                      // Add validation: Ensure team structure is correct, members unique etc.
                      // This is a full replacement, might need more granular updates (add/remove member) in future
                      allowedUpdates.teams = updates.teams.map(t => ({
                         teamName: t.teamName || 'Unnamed Team',
                         members: Array.isArray(t.members) ? t.members : [],
                         submissions: Array.isArray(t.submissions) ? t.submissions : [],
                         ratings: Array.isArray(t.ratings) ? t.ratings : [],
                      }));
                 }
             }

             // Date Validation: Ensure end date is not before start date if dates were updated
              if (allowedUpdates.desiredStartDate || allowedUpdates.desiredEndDate || allowedUpdates.startDate || allowedUpdates.endDate) {
                  const newStart = allowedUpdates.desiredStartDate || allowedUpdates.startDate || eventData.desiredStartDate || eventData.startDate;
                  const newEnd = allowedUpdates.desiredEndDate || allowedUpdates.endDate || eventData.desiredEndDate || eventData.endDate;
                   if (newStart && newEnd) {
                        try {
                            // Convert Timestamps back to Dates for comparison
                            const newStartDate = newStart.toDate ? newStart.toDate() : new Date(newStart);
                            const newEndDate = newEnd.toDate ? newEnd.toDate() : new Date(newEnd);
                            if (isNaN(newStartDate.getTime()) || isNaN(newEndDate.getTime())) throw new Error("Invalid date objects for comparison.");
                            // *** CHANGE: Allow start and end date to be the same ***
                            if (newStartDate > newEndDate) {
                                throw new Error("End date cannot be earlier than the start date.");
                            }
                        } catch(dateError) {
                             throw new Error(`Date validation failed: ${dateError.message}`);
                        }
                   }
              }

              // Perform update if there are valid changes
              if (Object.keys(allowedUpdates).length > 0) {
                 // Add lastUpdatedAt timestamp?
                 // allowedUpdates.lastUpdatedAt = Timestamp.now();
                 await updateDoc(eventRef, allowedUpdates);
                 dispatch('updateLocalEvent', { id: eventId, changes: allowedUpdates }); // Update local cache
                 console.log(`Event ${eventId} details updated successfully:`, Object.keys(allowedUpdates));
              } else {
                 console.log(`No valid or changed fields provided for updating event ${eventId}.`);
                 // Optionally throw an error or return a specific status
                 // throw new Error("No valid updates provided.");
              }

        } catch (error) {
            console.error(`Error updating event details for ${eventId}:`, error);
            throw error; // Re-throw for component
        }
    }
};

const mutations = {
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
        // Only update if the currently viewed details match the ID
        if (state.currentEventDetails?.id === id) {
            state.currentEventDetails = { ...state.currentEventDetails, ...changes };
        }
    },
    clearCurrentEventDetailsIfMatching(state, eventId) {
        // Clear details cache if the deleted/modified event was being viewed
        if (state.currentEventDetails?.id === eventId) {
            state.currentEventDetails = null;
        }
    },
};

export default {
    namespaced: true,
    state,
    getters,
    actions,
    mutations,
};