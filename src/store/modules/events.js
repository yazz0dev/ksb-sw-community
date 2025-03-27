// /src/store/modules/events.js

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
    writeBatch,
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

        const overallRating = (design + presentation + problemSolving + execution + technology) / 5.0;
        
        totalRatingSum += overallRating;
        ratingCount++;
    }

    return ratingCount > 0 ? Math.max(0, Math.min(5, totalRatingSum / ratingCount)) : 0;
};


const state = {
    events: [],
    eventRequests: [],
    currentEventDetails: null, // Cache for the currently viewed event details
};

const getters = {
    allEvents: (state) => state.events,
    getEventById: (state) => (id) => {
        // Prefer cached details if available and ID matches
        if (state.currentEventDetails?.id === id) {
             // console.log("Returning cached details for event:", id);
             return state.currentEventDetails;
        }
        // Fallback to list search
        // console.log("Searching event list for event:", id);
        return state.events.find(event => event.id === id) || null;
    },
    allEventRequests: (state) => state.eventRequests,
    currentEventDetails: (state) => state.currentEventDetails,
    // Make the internal helper accessible if needed by other modules via rootGetters
    _calculateWeightedAverageScore: () => _calculateWeightedAverageScore,
};

const actions = {
    // Check if a user has pending/active event requests
    async checkExistingRequests({ rootGetters }) {
        const currentUser = rootGetters['user/getUser'];
        if (!currentUser || !currentUser.uid) return false;
        const q = query(
            collection(db, 'eventRequests'),
            where('requester', '==', currentUser.uid),
            where('status', 'in', ['Pending', 'Approved'])
        );
        const querySnapshot = await getDocs(q);
        return !querySnapshot.empty;
    },

    // Check for date conflicts with existing events
    async checkDateConflict(_, { startDate, endDate }) {
        let checkStart, checkEnd;
        try {
            checkStart = startDate instanceof Date ? startDate : new Date(startDate);
            checkEnd = endDate instanceof Date ? endDate : new Date(endDate);
            if (isNaN(checkStart.getTime()) || isNaN(checkEnd.getTime())) { throw new Error("Invalid date format."); }
        } catch (e) { throw new Error("Invalid date format provided."); }

        const q = query( collection(db, 'events'), where('status', 'in', ['Upcoming', 'In Progress']) );
        const querySnapshot = await getDocs(q);
        let conflictingEvent = null;

        querySnapshot.forEach((doc) => {
            const event = doc.data();
            if (!event.startDate?.seconds || !event.endDate?.seconds) return;
            const eventStart = event.startDate.toDate();
            const eventEnd = event.endDate.toDate();
            if (isNaN(eventStart.getTime()) || isNaN(eventEnd.getTime())) return;
            // Simple overlap check: (StartA <= EndB) and (EndA >= StartB)
            if (checkStart <= eventEnd && checkEnd >= eventStart) {
                 conflictingEvent = { id: doc.id, ...event };
            }
        });
        return conflictingEvent;
    },

    // Create event directly (Admin)
    async createEvent({ rootState, dispatch, commit }, eventData) {
        try {
            const userRole = rootState.user?.role;
            if ( userRole !== 'Admin') { throw new Error('Unauthorized.'); }

            let startDateObj, endDateObj;
            try {
                startDateObj = new Date(eventData.startDate); endDateObj = new Date(eventData.endDate);
                if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) throw new Error("Invalid date format.");
                if (startDateObj >= endDateObj) throw new Error("End date must be after start date.");
            } catch(e) { throw new Error(e.message || "Invalid date format."); }

            const conflict = await dispatch('checkDateConflict', { startDate: startDateObj, endDate: endDateObj });
            if (conflict) { throw new Error(`Date conflict with: "${conflict.eventName}".`); }

            const newEventData = {
                eventName: eventData.eventName, eventType: eventData.eventType, description: eventData.description,
                startDate: Timestamp.fromDate(startDateObj), endDate: Timestamp.fromDate(endDateObj),
                organizer: rootState.user.uid, coOrganizers: eventData.coOrganizers || [],
                ratingConstraints: eventData.ratingConstraints, isTeamEvent: eventData.isTeamEvent,
                status: 'Upcoming', ratingsOpen: false, winners: [],
                teams: eventData.isTeamEvent ? (eventData.teams || []) : [],
                participants: [], // Will be populated below if individual
                submissions: [], ratings: [],
            };

            // Auto-add students if individual event
            if (!newEventData.isTeamEvent) {
                const studentUIDs = await dispatch('user/fetchAllStudentUIDs', null, { root: true });
                newEventData.participants = studentUIDs;
            }
            // Initialize nested arrays for teams
            if (newEventData.isTeamEvent && newEventData.teams) {
                newEventData.teams = newEventData.teams.map(team => ({ ...team, submissions: [], ratings: [] }));
            }

            const docRef = await addDoc(collection(db, 'events'), newEventData);
            commit('addOrUpdateEvent', { id: docRef.id, ...newEventData }); // Update local state
            return docRef.id;
        } catch (error) { console.error('Error creating event:', error); throw error; }
    },

    // Submit event request (Student)
    async requestEvent({ dispatch, rootGetters }, eventData) {
        try {
            const currentUser = rootGetters['user/getUser'];
            const userId = currentUser?.uid;
            if (!userId) { throw new Error("User not authenticated."); }
            if (currentUser.role !== 'Admin') {
                const hasActive = await dispatch('checkExistingRequests');
                if (hasActive) { throw new Error('Active/pending request exists.'); }
            }

            let startDateObj, endDateObj;
            try {
                startDateObj = new Date(eventData.desiredStartDate); endDateObj = new Date(eventData.desiredEndDate);
                if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) throw new Error("Invalid date format.");
                if (startDateObj >= endDateObj) throw new Error("End date must be after start date.");
            } catch(e) { throw new Error(e.message || "Invalid date format."); }

            const requestData = {
                eventName: eventData.eventName, eventType: eventData.eventType, description: eventData.description,
                requester: userId, status: 'Pending',
                desiredStartDate: Timestamp.fromDate(startDateObj), desiredEndDate: Timestamp.fromDate(endDateObj),
                isTeamEvent: eventData.isTeamEvent, coOrganizers: eventData.coOrganizers || [],
                ratingConstraints: eventData.ratingConstraints, createdAt: Timestamp.now(),
                teams: eventData.isTeamEvent ? (eventData.teams || []) : [], // Include teams in request
            };

            await addDoc(collection(db, 'eventRequests'), requestData);
        } catch (error) { console.error('Error requesting event:', error); throw error; }
    },

    // Fetch all events (for HomeView)
    async fetchEvents({ commit }) {
        try {
            const q = query(collection(db, 'events'), orderBy('startDate', 'desc'));
            const querySnapshot = await getDocs(q);
            const events = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            commit('setEvents', events);
        } catch (error) { console.error('Error fetching events:', error); commit('setEvents', []); }
    },

    // Fetch specific event details (for EventDetails view)
    async fetchEventDetails({ commit }, eventId) {
        try {
            const docRef = doc(db, "events", eventId);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const eventData = { id: docSnap.id, ...docSnap.data() };
                commit('addOrUpdateEvent', eventData); // Update list cache
                commit('setCurrentEventDetails', eventData); // Update detail cache
                return eventData;
            } else {
                commit('setCurrentEventDetails', null); return null;
            }
        } catch (error) { console.error("Error fetching event details:", error); commit('setCurrentEventDetails', null); return null; }
    },

    // Fetch pending event requests (for ManageRequests view)
    async fetchEventRequests({ commit }) {
        try {
            const q = query( collection(db, 'eventRequests'), where('status', '==', 'Pending'), orderBy('desiredStartDate', 'asc') );
            const querySnapshot = await getDocs(q);
            const eventRequests = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            commit('setEventRequests', eventRequests);
        } catch (error) { console.error('Error fetching event requests:', error); commit('setEventRequests', []); }
    },

    // Approve a pending event request
    async approveEventRequest({ dispatch, commit }, requestId) {
        const requestRef = doc(db, 'eventRequests', requestId);
        const eventCollectionRef = collection(db, 'events');
        try {
            const requestSnap = await getDoc(requestRef);
            if (!requestSnap.exists() || requestSnap.data().status !== 'Pending') { throw new Error('Request not found or not pending.'); }
            const requestData = requestSnap.data();

            let reqStartDate, reqEndDate;
             if (requestData.desiredStartDate?.seconds) { reqStartDate = requestData.desiredStartDate.toDate(); } else { throw new Error("Invalid start date."); }
             if (requestData.desiredEndDate?.seconds) { reqEndDate = requestData.desiredEndDate.toDate(); } else { throw new Error("Invalid end date."); }

            const conflictingEvent = await dispatch('checkDateConflict', { startDate: reqStartDate, endDate: reqEndDate });
            if (conflictingEvent) { throw new Error(`Date conflict with: "${conflictingEvent.eventName}".`); }

            const eventData = {
                eventName: requestData.eventName, eventType: requestData.eventType, description: requestData.description,
                startDate: requestData.desiredStartDate, endDate: requestData.desiredEndDate,
                organizer: requestData.requester, coOrganizers: requestData.coOrganizers || [],
                ratingConstraints: requestData.ratingConstraints, isTeamEvent: requestData.isTeamEvent,
                status: 'Upcoming', ratingsOpen: false, winners: [],
                teams: requestData.isTeamEvent ? (requestData.teams || []) : [],
                participants: [], submissions: [], ratings: [],
            };

            // Auto-add students if individual event
            if (!eventData.isTeamEvent) {
                const studentUIDs = await dispatch('user/fetchAllStudentUIDs', null, { root: true });
                eventData.participants = studentUIDs;
            }
            // Initialize nested arrays for teams
            if (eventData.isTeamEvent && eventData.teams) {
                eventData.teams = eventData.teams.map(team => ({ ...team, submissions: [], ratings: [] }));
            }

            const batch = writeBatch(db);
            const newEventRef = doc(eventCollectionRef);
            batch.set(newEventRef, eventData);
            batch.update(requestRef, { status: 'Approved' });
            await batch.commit();

            commit('removeEventRequest', requestId);
            commit('addOrUpdateEvent', { id: newEventRef.id, ...eventData });
        } catch (error) { console.error('Error approving event request:', error); throw error; }
    },

    // Reject a pending event request
    async rejectEventRequest({ commit }, requestId) {
        try {
            const requestRef = doc(db, 'eventRequests', requestId);
            // Consider adding a 'rejectionReason' field if needed in the future
            await updateDoc(requestRef, { status: 'Rejected' });
            commit('removeEventRequest', requestId);
        } catch (error) { console.error("Error rejecting event request: ", error); throw error; }
    },

    // Update the status of an event
    async updateEventStatus({ dispatch, getters }, { eventId, newStatus }) {
        const validStatuses = ['Upcoming', 'In Progress', 'Completed', 'Cancelled'];
        if (!validStatuses.includes(newStatus)) { throw new Error('Invalid event status.'); }

        try {
            // Fetch fresh data to ensure current status and dates are accurate
            const currentEvent = await dispatch('fetchEventDetails', eventId); // Use action to get fresh data & update cache
            if (!currentEvent) { throw new Error("Event not found to update status."); }

            const now = new Date();
            let eventStartDate = currentEvent.startDate?.toDate();
            let eventEndDate = currentEvent.endDate?.toDate();

            // --- Date/Time Checks for Status Change ---
            if (newStatus === 'In Progress') {
                if (currentEvent.status !== 'Upcoming') throw new Error("Can only start 'Upcoming' events.");
                if (!eventStartDate) throw new Error("Event start date is missing.");
                // Allow starting slightly before if needed, or exactly on/after? Let's allow on/after.
                if (now < eventStartDate) {
                     throw new Error(`Cannot start event before ${eventStartDate.toLocaleDateString()}.`);
                }
            }
            if (newStatus === 'Completed') {
                 if (currentEvent.status !== 'In Progress') throw new Error("Can only complete 'In Progress' events.");
                 if (!eventEndDate) throw new Error("Event end date is missing.");
                 // Allow completion on or after the end date (end of day)
                 let endOfDay = new Date(eventEndDate);
                 endOfDay.setHours(23, 59, 59, 999);
                 if (now < endOfDay) {
                     throw new Error(`Cannot complete event before end of ${endOfDay.toLocaleDateString()}.`);
                 }
            }
            // Allow 'Cancelled' from 'Upcoming' or 'In Progress'

            const eventRef = doc(db, 'events', eventId);
            const updates = { status: newStatus };
            if (newStatus !== 'Completed') { updates.ratingsOpen = false; } // Close ratings if not completed
            if (newStatus === 'Completed') { updates.completedAt = Timestamp.now(); }

            await updateDoc(eventRef, updates);
            dispatch('updateLocalEvent', { id: eventId, changes: updates }); // Update local state caches

            // Trigger XP calculation only when Completed
            if (newStatus === 'Completed') {
                console.log(`Event ${eventId} marked completed. Triggering XP calculation.`);
                 dispatch('user/calculateUserXP', null, { root: true }).catch(xpError => console.error("XP Calc Error:", xpError));
            }
        } catch (error) { console.error(`Error updating event status to ${newStatus}:`, error); throw error; }
    },

    // Toggle whether ratings are open for a completed event
    async toggleRatingsOpen({ dispatch }, { eventId, isOpen }) {
        try {
            const eventRef = doc(db, 'events', eventId);
            // Maybe add check: ensure event status is 'Completed'?
            // const eventData = await dispatch('fetchEventDetails', eventId);
            // if (eventData?.status !== 'Completed') throw new Error("Can only toggle ratings for completed events.");
            await updateDoc(eventRef, { ratingsOpen: !!isOpen });
            dispatch('updateLocalEvent', { id: eventId, changes: { ratingsOpen: !!isOpen } });
            // if (eventData?.status !== 'Completed') throw new Error("Can only toggle ratings for completed events.");
            await updateDoc(eventRef, { ratingsOpen: !!isOpen });
            dispatch('updateLocalEvent', { id: eventId, changes: { ratingsOpen: !!isOpen } });
        } catch (error) { console.error("Error toggling ratings:", error); throw error; }
    },

    // Set the winner(s) for an event
    async setWinners({ dispatch }, { eventId, winners }) {
        const winnerList = Array.isArray(winners) ? winners : (winners ? [winners] : []);
        try {
            const eventRef = doc(db, 'events', eventId);
            await updateDoc(eventRef, { winners: winnerList });
            dispatch('updateLocalEvent', { id: eventId, changes: { winners: winnerList } });
            // Trigger XP recalc in case of bonus changes
            dispatch('user/calculateUserXP', null, { root: true }).catch(xpError => console.error("XP Calc Error:", xpError));
        } catch (error) { console.error("Error setting winners:", error); throw error; }
    },

    // Delete an event
    async deleteEvent({ commit }, eventId) {
        try {
            const eventRef = doc(db, 'events', eventId);
            await deleteDoc(eventRef);
            commit('removeEvent', eventId); // Remove from list state
            commit('clearCurrentEventDetailsIfMatching', eventId); // Clear detail cache
        } catch (error) { console.error("Error deleting event:", error); throw error; }
    },

    // Calculate winner(s) automatically based on ratings
    async calculateWinners({ dispatch, getters }, eventId) { // Use rootGetters to access helper
        console.log(`Calculating winners for event: ${eventId}`);
        try {
            const event = await dispatch('fetchEventDetails', eventId);
            if (!event || event.status !== 'Completed') { throw new Error("Event not found or not completed."); }

            let scores = [];
            if (event.isTeamEvent) {
                const currentTeams = Array.isArray(event.teams) ? event.teams : [];
                if (currentTeams.length === 0) { console.log("No teams found."); }
                else { scores = currentTeams.map(team => ({ id: team.teamName, score: getters._calculateWeightedAverageScore(team.ratings || []) })); }
            } else {
                const currentParticipants = Array.isArray(event.participants) ? event.participants : [];
                const currentRatings = Array.isArray(event.ratings) ? event.ratings : [];
                if (currentParticipants.length === 0) { console.log("No participants found."); }
                else { scores = currentParticipants.map(pId => ({ id: pId, score: getters._calculateWeightedAverageScore(currentRatings.filter(r => r.ratedTo === pId)) })); }
            }
            console.log("Calculated scores:", scores);

            if (scores.length === 0) {
                 await dispatch('setWinners', { eventId, winners: [] });
                 alert('Winner calculation: No scores found.'); return;
            }
            scores.sort((a, b) => b.score - a.score || (a.id || '').localeCompare(b.id || '')); // Sort score DESC, then ID ASC
            const topScore = scores[0].score;
            const winners = topScore > 0 ? scores.filter(s => s.score === topScore).map(s => s.id) : [];

            await dispatch('setWinners', { eventId, winners });
            alert(winners.length > 0 ? `Winner(s): ${winners.join(', ')} (Score: ${topScore.toFixed(2)})` : 'Calculation complete. No winner determined (all scores zero or negative).');
        } catch (error) { console.error("Error calculating winners:", error); alert(`Error: ${error.message}`); }
    },

    // Update local event state caches
    updateLocalEvent({ commit }, { id, changes }) {
        commit('addOrUpdateEvent', { id, ...changes });
        commit('updateCurrentEventDetails', { id, changes });
    },

    // Submit a project to an event
    async submitProjectToEvent({ rootGetters, dispatch }, { eventId, submissionData }) {
        if (!submissionData || !submissionData.projectName || !submissionData.link) { throw new Error("Project Name and Link are required."); }
        if (!submissionData.link.startsWith('http')) { throw new Error("Provide valid URL (http/https)."); }

        const eventRef = doc(db, 'events', eventId);
        const eventSnap = await getDoc(eventRef);
        if (!eventSnap.exists()) throw new Error('Event not found.');
        const eventData = eventSnap.data();
        const userId = rootGetters['user/getUser']?.uid;
        if (!userId) throw new Error("User not authenticated.");
        if (eventData.status !== 'In Progress') { throw new Error("Submissions only allowed during 'In Progress'."); }

        try {
            let updatedEventData;
            if (eventData.isTeamEvent) {
                 const currentTeams = Array.isArray(eventData.teams) ? eventData.teams : [];
                 const userTeamIndex = currentTeams.findIndex(team => team.members?.includes(userId));
                 if (userTeamIndex === -1) throw new Error("You are not in a team for this event.");
                 if (currentTeams[userTeamIndex].submissions?.length > 0) { throw new Error("Team already submitted."); }

                 const updatedTeams = JSON.parse(JSON.stringify(currentTeams));
                 const submissionEntry = { ...submissionData, submittedAt: Timestamp.now(), submittedBy: userId };
                 if (!Array.isArray(updatedTeams[userTeamIndex].submissions)) { updatedTeams[userTeamIndex].submissions = []; }
                 updatedTeams[userTeamIndex].submissions.push(submissionEntry);
                 await updateDoc(eventRef, { teams: updatedTeams });
                 updatedEventData = { teams: updatedTeams };
            } else {
                 const currentParticipants = Array.isArray(eventData.participants) ? eventData.participants : [];
                 const currentSubmissions = Array.isArray(eventData.submissions) ? eventData.submissions : [];
                 if (!currentParticipants.includes(userId)) { throw new Error("You are not a participant."); }
                 if (currentSubmissions.some(sub => sub.participantId === userId)) { throw new Error("You already submitted."); }

                 const submissionEntry = { participantId: userId, ...submissionData, submittedAt: Timestamp.now() };
                 await updateDoc(eventRef, { submissions: arrayUnion(submissionEntry) });
                 const freshSnap = await getDoc(eventRef); // Refetch to get updated array
                 updatedEventData = { submissions: freshSnap.data()?.submissions || [] };
            }
             dispatch('updateLocalEvent', { id: eventId, changes: updatedEventData }); // Update caches
        } catch (error) { console.error("Error submitting project:", error); throw error; }
    },

    // Leave an event (only 'Upcoming')
    async leaveEvent({ rootGetters, dispatch }, eventId) {
        const eventRef = doc(db, 'events', eventId);
        const eventSnap = await getDoc(eventRef);
        if (!eventSnap.exists()) throw new Error('Event not found.');
        const eventData = eventSnap.data();
        const userId = rootGetters['user/getUser']?.uid;
        if (!userId) throw new Error("User not authenticated.");
        if (eventData.status !== 'Upcoming') { throw new Error("Can only leave 'Upcoming' events."); }

        try {
             let updatedEventData;
            if (eventData.isTeamEvent) {
                const currentTeams = Array.isArray(eventData.teams) ? eventData.teams : [];
                const userTeamIndex = currentTeams.findIndex(team => team.members?.includes(userId));
                if (userTeamIndex === -1) { console.log(`LeaveEvent: User ${userId} not in any team.`); return; } // Exit if not in team

                const updatedTeams = JSON.parse(JSON.stringify(currentTeams));
                updatedTeams[userTeamIndex].members = (updatedTeams[userTeamIndex].members || []).filter(memberId => memberId !== userId);
                await updateDoc(eventRef, { teams: updatedTeams });
                updatedEventData = { teams: updatedTeams };
            } else {
                const currentParticipants = Array.isArray(eventData.participants) ? eventData.participants : [];
                if (!currentParticipants.includes(userId)) { console.log(`LeaveEvent: User ${userId} not in participants.`); return; } // Exit if not participant

                await updateDoc(eventRef, { participants: arrayRemove(userId) });
                const freshSnap = await getDoc(eventRef); // Refetch
                updatedEventData = { participants: freshSnap.data()?.participants || [] };
            }
             dispatch('updateLocalEvent', { id: eventId, changes: updatedEventData }); // Update caches
        } catch (error) { console.error("Error leaving event:", error); throw error; }
    }
};

const mutations = {
    setEvents(state, events) { state.events = events; },
    addOrUpdateEvent(state, event) {
        const index = state.events.findIndex(e => e.id === event.id);
        if (index !== -1) { state.events[index] = { ...state.events[index], ...event }; }
        else { state.events.push(event); state.events.sort((a, b) => (b.startDate?.seconds ?? 0) - (a.startDate?.seconds ?? 0)); }
    },
    removeEvent(state, eventId) { state.events = state.events.filter(event => event.id !== eventId); },
    setEventRequests(state, eventRequests) { state.eventRequests = eventRequests; },
    removeEventRequest(state, requestId) { state.eventRequests = state.eventRequests.filter(req => req.id !== requestId); },
    setCurrentEventDetails(state, eventData) { state.currentEventDetails = eventData ? { ...eventData } : null; },
    updateCurrentEventDetails(state, { id, changes }) { if (state.currentEventDetails?.id === id) { state.currentEventDetails = { ...state.currentEventDetails, ...changes }; } },
    clearCurrentEventDetailsIfMatching(state, eventId) { if (state.currentEventDetails?.id === eventId) { state.currentEventDetails = null; } },
};

export default {
    namespaced: true,
    state,
    getters,
    actions,
    mutations,
};