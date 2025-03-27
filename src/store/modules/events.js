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

    // Add new getters for XP allocation
    getEventXPAllocation: (state) => (eventId) => {
        const event = state.events.find(e => e.id === eventId);
        return event?.xpAllocation || [];
    },
    getEventRatingConstraints: (state) => (eventId) => {
        const event = state.events.find(e => e.id === eventId);
        return event?.ratingConstraints || [];
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
        // ... (keep existing logic, but query 'events' with 'Approved' or 'InProgress')
         let checkStart, checkEnd;
        try {
            checkStart = startDate instanceof Date ? startDate : new Date(startDate);
            checkEnd = endDate instanceof Date ? endDate : new Date(endDate);
            if (isNaN(checkStart.getTime()) || isNaN(checkEnd.getTime())) { throw new Error("Invalid date format."); }
        } catch (e) { throw new Error("Invalid date format provided."); }

        const q = query( collection(db, 'events'), where('status', 'in', ['Approved', 'InProgress']) ); // Check against Approved/InProgress
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

    // Admin Creates Event Directly -> Status 'Approved'
    async createEvent({ rootState, dispatch, commit }, eventData) {
        try {
            const userRole = rootState.user?.role;
            if (userRole !== 'Admin') { throw new Error('Unauthorized.'); }

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
                requester: rootState.user.uid, // Admin is the requester here
                organizer: rootState.user.uid, // Admin is also the organizer
                coOrganizers: eventData.coOrganizers || [],
                ratingCriteria: eventData.ratingCriteria || [], // { constraint: 'Name', role: 'xpRoleKey' }
                xpDistribution: eventData.xpDistribution || {}, // { xpRoleKey: points }
                isTeamEvent: eventData.isTeamEvent,
                status: 'Approved', // Directly approved
                ratingsOpen: false, winnersPerRole: {}, // Changed from winners array
                teams: eventData.teams || [], // Teams structure { teamName: '...', members: [...], submissions: [], ratings: [] }
                participants: [], // Handled below
                submissions: [], ratings: [], // Individual event fields
                createdAt: Timestamp.now(), // Track creation
            };

            if (!newEventData.isTeamEvent) {
                const studentUIDs = await dispatch('user/fetchAllStudentUIDs', null, { root: true });
                newEventData.participants = studentUIDs;
            }
             // Ensure teams have submissions/ratings arrays if created directly
            if (newEventData.isTeamEvent && newEventData.teams) {
                newEventData.teams = newEventData.teams.map(team => ({
                     teamName: team.teamName,
                     members: team.members || [],
                     submissions: [],
                     ratings: []
                }));
            }

            const docRef = await addDoc(collection(db, 'events'), newEventData);
            commit('addOrUpdateEvent', { id: docRef.id, ...newEventData });
            return docRef.id;
        } catch (error) { console.error('Error creating event:', error); throw error; }
    },

    // Student Requests Event -> Status 'Pending'
    async requestEvent({ dispatch, rootGetters }, eventData) {
        try {
            const currentUser = rootGetters['user/getUser'];
            const userId = currentUser?.uid;
            if (!userId) { throw new Error("User not authenticated."); }
            if (currentUser.role !== 'Admin') { // Check only needed for students
                 const hasActive = await dispatch('checkExistingRequests');
                 if (hasActive) { throw new Error('You already have an active or pending event request.'); }
            }

            let startDateObj, endDateObj;
             try {
                // Using desiredStartDate/desiredEndDate from form
                startDateObj = new Date(eventData.desiredStartDate); endDateObj = new Date(eventData.desiredEndDate);
                if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) throw new Error("Invalid date format.");
                if (startDateObj >= endDateObj) throw new Error("End date must be after start date.");
             } catch(e) { throw new Error(e.message || "Invalid date format."); }

            // Store desired dates, but actual dates will be set on approval
            const requestData = {
                eventName: eventData.eventName, eventType: eventData.eventType, description: eventData.description,
                requester: userId,
                organizer: userId, // Requester is the default organizer
                coOrganizers: eventData.coOrganizers || [],
                ratingCriteria: eventData.ratingCriteria || [],
                xpDistribution: eventData.xpDistribution || {},
                isTeamEvent: eventData.isTeamEvent,
                teams: eventData.teams || [], // Store proposed teams
                participants: [], // Not populated yet
                submissions: [], ratings: [], // Not populated yet
                status: 'Pending', // Initial status
                ratingsOpen: false, winnersPerRole: {},
                // Store desired dates separately for admin review
                desiredStartDate: Timestamp.fromDate(startDateObj), desiredEndDate: Timestamp.fromDate(endDateObj),
                createdAt: Timestamp.now(),
                // Actual startDate/endDate are null until approved
                startDate: null,
                endDate: null,
            };

             // Ensure teams have submissions/ratings arrays if requested
            if (requestData.isTeamEvent && requestData.teams) {
                requestData.teams = requestData.teams.map(team => ({
                     teamName: team.teamName,
                     members: team.members || [],
                     submissions: [],
                     ratings: []
                }));
            }

            const docRef = await addDoc(collection(db, 'events'), requestData);
            commit('addOrUpdateEvent', { id: docRef.id, ...requestData });
        } catch (error) { console.error('Error requesting event:', error); throw error; }
    },

    // Fetch all events (no status filter needed here, handled by getters)
    async fetchEvents({ commit }) {
        try {
            const q = query(collection(db, 'events'), orderBy('createdAt', 'desc')); // Order by creation potentially
            const querySnapshot = await getDocs(q);
            const events = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            commit('setEvents', events);
        } catch (error) { console.error('Error fetching events:', error); commit('setEvents', []); }
    },

    // Fetch specific event details (no change needed)
    async fetchEventDetails({ commit }, eventId) { /* ... keep existing logic ... */ },

    // REMOVED: fetchEventRequests (use pendingEvents getter)

    // Approve a pending event request (updates status and sets actual dates)
    async approveEventRequest({ dispatch, commit, rootGetters }, eventId) {
        const eventRef = doc(db, 'events', eventId);
        try {
            const eventSnap = await getDoc(eventRef);
            if (!eventSnap.exists() || eventSnap.data().status !== 'Pending') { throw new Error('Event not found or not pending.'); }
            const eventData = eventSnap.data();

            // Use desired dates from the request
            let reqStartDate, reqEndDate;
            if (eventData.desiredStartDate?.seconds) { reqStartDate = eventData.desiredStartDate.toDate(); } else { throw new Error("Invalid desired start date in request."); }
            if (eventData.desiredEndDate?.seconds) { reqEndDate = eventData.desiredEndDate.toDate(); } else { throw new Error("Invalid desired end date in request."); }

            // Check for conflict with *Approved* or *InProgress* events using the *desired* dates
            const conflictingEvent = await dispatch('checkDateConflict', { startDate: reqStartDate, endDate: reqEndDate });
            if (conflictingEvent) { throw new Error(`Approval failed: Date conflict with "${conflictingEvent.eventName}". Please adjust dates or reject.`); }

            const updates = {
                status: 'Approved',
                startDate: eventData.desiredStartDate, // Set actual dates
                endDate: eventData.desiredEndDate,
                participants: [], // Reset participants, populate below if individual
            };

            // Auto-add all students if individual event upon approval
            if (!eventData.isTeamEvent) {
                const studentUIDs = await dispatch('user/fetchAllStudentUIDs', null, { root: true });
                updates.participants = studentUIDs;
            }

            await updateDoc(eventRef, updates);
            commit('addOrUpdateEvent', { id: eventId, ...updates }); // Update local state

        } catch (error) { console.error('Error approving event request:', error); throw error; }
    },

    // Reject a pending event request (updates status to 'Rejected')
    async rejectEventRequest({ commit }, eventId) {
        try {
            const eventRef = doc(db, 'events', eventId);
            // Could add a 'rejectionReason' field if needed
            await updateDoc(eventRef, { status: 'Rejected' });
            commit('addOrUpdateEvent', { id: eventId, status: 'Rejected' }); // Update local state
        } catch (error) { console.error("Error rejecting event request: ", error); throw error; }
    },

    // Cancel an Approved/InProgress event (updates status to 'Cancelled')
    async cancelEvent({ dispatch, commit }, eventId) {
         try {
             const eventRef = doc(db, 'events', eventId);
             const eventSnap = await getDoc(eventRef);
             if (!eventSnap.exists()) throw new Error("Event not found.");
             const currentStatus = eventSnap.data().status;
             if (!['Approved', 'InProgress'].includes(currentStatus)) {
                 throw new Error(`Cannot cancel an event with status '${currentStatus}'.`);
             }

             const updates = { status: 'Cancelled', ratingsOpen: false };
             await updateDoc(eventRef, updates);
             dispatch('updateLocalEvent', { id: eventId, changes: updates }); // Use helper
         } catch (error) { console.error(`Error cancelling event ${eventId}:`, error); throw error; }
     },

    // Update the status of an event (includes state transitions)
    async updateEventStatus({ dispatch, commit, rootGetters }, { eventId, newStatus }) {
        const validStatuses = ['InProgress', 'Completed', 'Cancelled', 'Approved']; // Added Approved for potential future edits
        if (!validStatuses.includes(newStatus)) { throw new Error('Invalid event status.'); }

        try {
            const eventRef = doc(db, 'events', eventId);
            const eventSnap = await getDoc(eventRef);
            if (!eventSnap.exists()) throw new Error("Event not found.");
            const currentEvent = { id: eventSnap.id, ...eventSnap.data() };

            const now = new Date();
            let eventStartDate = currentEvent.startDate?.toDate();
            let eventEndDate = currentEvent.endDate?.toDate();

            // Permissions (Simplified - Admins can do anything, Organizers specific actions)
            const currentUser = rootGetters['user/getUser'];
            const isAdmin = currentUser?.role === 'Admin';
            const isOrganizer = currentEvent.organizer === currentUser?.uid || (currentEvent.coOrganizers || []).includes(currentUser?.uid);
            if (!isAdmin && !isOrganizer) { throw new Error("Permission denied to update status."); }

            // State Transition Logic
            const updates = { status: newStatus };

            if (newStatus === 'InProgress') {
                if (currentEvent.status !== 'Approved') throw new Error("Can only start 'Approved' events.");
                if (!eventStartDate) throw new Error("Event start date is missing.");
                if (now < eventStartDate) { throw new Error(`Cannot start event before ${eventStartDate.toLocaleDateString()}.`); }
                updates.ratingsOpen = false; // Ensure ratings are closed when starting
            } else if (newStatus === 'Completed') {
                if (currentEvent.status !== 'InProgress') throw new Error("Can only complete 'InProgress' events.");
                if (!eventEndDate) throw new Error("Event end date is missing.");
                let endOfDay = new Date(eventEndDate); endOfDay.setHours(23, 59, 59, 999);
                // Allow completion *after* end date starts
                if (now < eventEndDate) { throw new Error(`Cannot complete event before ${eventEndDate.toLocaleDateString()}.`); }
                updates.ratingsOpen = false; // Default to closed on completion
                updates.completedAt = Timestamp.now();
            } else if (newStatus === 'Cancelled') {
                 if (!isAdmin && !['Approved', 'InProgress'].includes(currentEvent.status)) {
                     throw new Error("Organizers can only cancel 'Approved' or 'In Progress' events.");
                 }
                 // Admins might be allowed to cancel from other states if needed, but generally not
                 if (!['Pending', 'Approved', 'InProgress'].includes(currentEvent.status)) {
                     throw new Error(`Cannot cancel an event with status '${currentEvent.status}'.`);
                 }
                updates.ratingsOpen = false;
            } else if (newStatus === 'Approved') {
                // Potentially allow reverting from 'Cancelled' back to 'Approved' by Admin?
                if (!isAdmin || currentEvent.status !== 'Cancelled') {
                    throw new Error("Only Admins can potentially re-approve a cancelled event.");
                }
                // Re-check date conflict if re-approving? Important!
                const conflict = await dispatch('checkDateConflict', { startDate: eventStartDate, endDate: eventEndDate });
                if (conflict) { throw new Error(`Cannot re-approve: Date conflict with "${conflict.eventName}".`); }
            }


            await updateDoc(eventRef, updates);
            dispatch('updateLocalEvent', { id: eventId, changes: updates }); // Update local state

            // Trigger XP calculation ONLY when moving to Completed
            if (newStatus === 'Completed' && currentEvent.status !== 'Completed') {
                console.log(`Event ${eventId} marked completed. Triggering XP calculation.`);
                dispatch('user/calculateUserXP', null, { root: true }).catch(xpError => console.error("XP Calc Error:", xpError));
            }
        } catch (error) { console.error(`Error updating event status to ${newStatus}:`, error); throw error; }
    },

    // Toggle whether ratings are open for a completed event
    async toggleRatingsOpen({ dispatch, rootGetters }, { eventId, isOpen }) {
         try {
             // Permission check
             const eventRef = doc(db, 'events', eventId);
             const eventSnap = await getDoc(eventRef);
             if (!eventSnap.exists()) throw new Error("Event not found.");
             const currentEvent = eventSnap.data();
             const currentUser = rootGetters['user/getUser'];
             const isAdmin = currentUser?.role === 'Admin';
             const isOrganizer = currentEvent.organizer === currentUser?.uid || (currentEvent.coOrganizers || []).includes(currentUser?.uid);

             if (currentEvent.status !== 'Completed') throw new Error("Can only toggle ratings for completed events.");
             if (!isAdmin && !isOrganizer) throw new Error("Permission denied to toggle ratings.");

             await updateDoc(eventRef, { ratingsOpen: !!isOpen });
             dispatch('updateLocalEvent', { id: eventId, changes: { ratingsOpen: !!isOpen } });
         } catch (error) { console.error("Error toggling ratings:", error); throw error; }
     },

    // Set the winners PER ROLE for an event
    async setWinnersPerRole({ dispatch, rootGetters }, { eventId, winnersMap }) {
         // winnersMap = { xpRoleKey: [winnerId1, winnerId2], ... }
         if (typeof winnersMap !== 'object' || winnersMap === null) {
             throw new Error("Invalid winners map provided.");
         }
         try {
             // Permission check
             const eventRef = doc(db, 'events', eventId);
             const eventSnap = await getDoc(eventRef);
             if (!eventSnap.exists()) throw new Error("Event not found.");
             const currentEvent = eventSnap.data();
             const currentUser = rootGetters['user/getUser'];
             const isAdmin = currentUser?.role === 'Admin';
             const isOrganizer = currentEvent.organizer === currentUser?.uid || (currentEvent.coOrganizers || []).includes(currentUser?.uid);

             if (currentEvent.status !== 'Completed') throw new Error("Can only set winners for completed events.");
             if (!isAdmin && !isOrganizer) throw new Error("Permission denied to set winners.");


             await updateDoc(eventRef, { winnersPerRole: winnersMap });
             dispatch('updateLocalEvent', { id: eventId, changes: { winnersPerRole: winnersMap } });
             // Trigger XP recalc as winners affect XP
             dispatch('user/calculateUserXP', null, { root: true }).catch(xpError => console.error("XP Calc Error:", xpError));
         } catch (error) { console.error("Error setting winners:", error); throw error; }
     },

    // Delete an event (including Pending/Rejected)
    async deleteEvent({ commit, rootGetters }, eventId) {
         try {
            // Permission Check: Admin can delete any. User can delete their OWN 'Pending' request.
            const eventRef = doc(db, 'events', eventId);
            const eventSnap = await getDoc(eventRef);
            if (!eventSnap.exists()) { console.warn("Event already deleted?"); return; } // Already gone
            const eventData = eventSnap.data();
            const currentUser = rootGetters['user/getUser'];
            const isAdmin = currentUser?.role === 'Admin';
            const isRequester = eventData.requester === currentUser?.uid;

            let canDelete = false;
            if (isAdmin) {
                canDelete = true;
                // Remove restriction on deleting 'Approved' for admins for now, based on structure simplification
                // if (eventData.status === 'Approved') {
                //     throw new Error("Admins cannot delete 'Approved' events. Cancel it first if needed.");
                // }
            } else if (isRequester && eventData.status === 'Pending') {
                canDelete = true;
            }

            if (!canDelete) {
                throw new Error("You do not have permission to delete this event/request.");
            }

            await deleteDoc(eventRef);
            commit('removeEvent', eventId); // Remove from list state
            commit('clearCurrentEventDetailsIfMatching', eventId); // Clear detail cache
         } catch (error) { console.error("Error deleting event:", error); throw error; }
     },

    // Calculate winners (AUTO) - Repurpose to calculate winners PER ROLE
     async calculateWinnersAuto({ dispatch, getters }, eventId) {
         console.log(`Calculating winners per role for event: ${eventId}`);
         try {
             const event = await dispatch('fetchEventDetails', eventId);
             if (!event || event.status !== 'Completed') { throw new Error("Event not found or not completed."); }
             if (!event.xpDistribution || Object.keys(event.xpDistribution).length === 0) { throw new Error("Event has no XP distribution defined."); }
             if (!event.ratingCriteria || event.ratingCriteria.length === 0) { throw new Error("Event has no rating criteria defined."); }

             const winnersMap = {}; // { xpRoleKey: [winnerId1, winnerId2] }
             const scoresPerRolePerParticipant = {}; // { participantId: { xpRoleKey: score, ... }, ... }

             const participants = event.isTeamEvent
                 ? (event.teams || []).map(t => ({ id: t.teamName, type: 'team', data: t }))
                 : (event.participants || []).map(pId => ({ id: pId, type: 'individual' }));

             if (participants.length === 0) {
                 alert('Winner calculation: No participants or teams found.');
                 await dispatch('setWinnersPerRole', { eventId, winnersMap: {} });
                 return;
             }

             // 1. Calculate score for each participant/team for each XP role
             for (const p of participants) {
                 scoresPerRolePerParticipant[p.id] = {};
                 const participantRatings = event.isTeamEvent
                     ? (p.data.ratings || [])
                     : (event.ratings || []).filter(r => r.ratedTo === p.id);

                 for (const roleKey in event.xpDistribution) {
                      if (event.xpDistribution[roleKey] > 0) { // Only calculate for roles with points assigned
                          // Find constraints linked to this role
                          const relevantCriteriaIndices = event.ratingCriteria
                                .map((crit, index) => (crit.role === roleKey ? index : -1))
                                .filter(index => index !== -1);

                          if (relevantCriteriaIndices.length === 0) {
                              scoresPerRolePerParticipant[p.id][roleKey] = 0; // No criteria for this role
                              continue;
                          }

                          // Calculate average score *only* from relevant constraints
                          let totalRoleScoreSum = 0;
                          let ratingCountForRole = 0;

                          for (const ratingEntry of participantRatings) {
                              if (!ratingEntry?.rating) continue;
                              let criteriaSum = 0;
                              let criteriaCount = 0;
                              relevantCriteriaIndices.forEach(index => {
                                   const constraintKey = `constraint${index}`; // e.g., constraint0, constraint1
                                   const ratingValue = Number(ratingEntry.rating[constraintKey] ?? 0);
                                   if (ratingValue >= 0) { // Allow 0 rating? Let's assume 1-5 are valid scores
                                        criteriaSum += ratingValue;
                                        criteriaCount++;
                                   }
                              });
                              if (criteriaCount > 0) {
                                  totalRoleScoreSum += (criteriaSum / criteriaCount); // Average score for this rater for this role's criteria
                                  ratingCountForRole++;
                              }
                          }
                          // Final average score for this participant for this role
                          scoresPerRolePerParticipant[p.id][roleKey] = ratingCountForRole > 0 ? (totalRoleScoreSum / ratingCountForRole) : 0;
                      } else {
                           scoresPerRolePerParticipant[p.id][roleKey] = 0; // No points assigned
                      }
                 }
             }
            // console.log("Scores per role:", scoresPerRolePerParticipant);

             // 2. Determine winner(s) for each role
             let winnersFound = false;
             for (const roleKey in event.xpDistribution) {
                 if (event.xpDistribution[roleKey] <= 0) continue; // Skip roles with no points

                 let topScoreForRole = -1;
                 let currentWinnersForRole = [];

                 participants.forEach(p => {
                      const score = scoresPerRolePerParticipant[p.id]?.[roleKey] ?? 0;
                     if (score > topScoreForRole) {
                         topScoreForRole = score;
                         currentWinnersForRole = [p.id];
                     } else if (score === topScoreForRole && topScoreForRole > 0) { // Add ties if score > 0
                         currentWinnersForRole.push(p.id);
                     }
                 });

                 if (topScoreForRole > 0) {
                     winnersMap[roleKey] = currentWinnersForRole.sort(); // Store sorted winners
                     winnersFound = true;
                 } else {
                      winnersMap[roleKey] = []; // No winner for this role
                 }
             }

             // 3. Save winners map
             await dispatch('setWinnersPerRole', { eventId, winnersMap });
             alert(winnersFound ? 'Winner calculation per role complete. Check event details.' : 'Winner calculation complete. No winners determined (scores might be zero or roles unassigned).');

         } catch (error) { console.error("Error calculating winners per role:", error); alert(`Error: ${error.message}`); }
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
    },

   // --- NEW: Add Team to Event ---
    async addTeamToEvent({ dispatch, commit, rootGetters }, { eventId, teamName, members }) {
        const eventRef = doc(db, 'events', eventId);
        try {
            const eventSnap = await getDoc(eventRef);
            if (!eventSnap.exists()) throw new Error('Event not found.');
            const eventData = eventSnap.data();

            // Permission Check
            const currentUser = rootGetters['user/getUser'];
            const isAdmin = currentUser?.role === 'Admin';
            const isOrganizer = eventData.organizer === currentUser?.uid || (eventData.coOrganizers || []).includes(currentUser?.uid);
             // Allow managing teams in Pending or Approved state
            if (!['Pending', 'Approved', 'InProgress'].includes(eventData.status)) {
                throw new Error(`Cannot manage teams for events with status '${eventData.status}'.`);
            }
            if (!isAdmin && !isOrganizer) { throw new Error("Permission denied to manage teams."); }
            if (!eventData.isTeamEvent) throw new Error("This is not a team event.");

            const currentTeams = eventData.teams || [];

            // Validation
            if (!teamName || !teamName.trim()) throw new Error("Team name is required.");
            if (currentTeams.some(t => t.teamName.toLowerCase() === teamName.trim().toLowerCase())) throw new Error(`Team name "${teamName}" already exists.`);
            if (!Array.isArray(members) || members.length === 0) throw new Error("At least one member must be selected.");

            const assignedStudents = new Set(currentTeams.flatMap(t => t.members || []));
            const newTeamMembersValid = members.every(m => !assignedStudents.has(m));
            if (!newTeamMembersValid) throw new Error("One or more selected students are already assigned to another team.");

            // Prepare new team object
            const newTeam = {
                teamName: teamName.trim(),
                members: members,
                submissions: [],
                ratings: []
            };

            const updatedTeams = [...currentTeams, newTeam];
            await updateDoc(eventRef, { teams: updatedTeams });
            dispatch('updateLocalEvent', { id: eventId, changes: { teams: updatedTeams } }); // Update local cache

        } catch (error) {
            console.error("Error adding team:", error);
            throw error; // Re-throw for component
        }
    },

     // --- NEW: Update Event (for Pending/Approved states by Organizer/Admin) ---
    async updateEventDetails({ dispatch, commit, rootGetters }, { eventId, updates }) {
        const eventRef = doc(db, 'events', eventId);
        try {
            const eventSnap = await getDoc(eventRef);
            if (!eventSnap.exists()) throw new Error('Event not found.');
            const eventData = eventSnap.data();

            // Permission Check
            const currentUser = rootGetters['user/getUser'];
            const isAdmin = currentUser?.role === 'Admin';
            const isOrganizer = eventData.organizer === currentUser?.uid || (eventData.coOrganizers || []).includes(currentUser?.uid);

            // Allow editing specific fields only in Pending or Approved state
            if (!['Pending', 'Approved'].includes(eventData.status)) {
                 throw new Error(`Cannot edit event details in status '${eventData.status}'.`);
            }
            if (!isAdmin && !isOrganizer) {
                 throw new Error("Permission denied to edit event details.");
            }
             // Allow user who requested to edit their OWN pending request
             if (!isAdmin && !isOrganizer && !(eventData.requester === currentUser?.uid && eventData.status === 'Pending')) {
                  throw new Error("Permission denied to edit event details.");
             }


             // Filter allowed updates (e.g., description, dates(if pending), teams, constraints, xpDistribution)
             const allowedUpdates = {};
             const editableFields = ['description', 'coOrganizers', 'ratingCriteria', 'xpDistribution', 'isTeamEvent', 'teams'];
             const pendingEditableFields = ['eventName', 'eventType', 'desiredStartDate', 'desiredEndDate']; // Dates only editable if Pending

             for (const key in updates) {
                if (editableFields.includes(key)) {
                    allowedUpdates[key] = updates[key];
                } else if (eventData.status === 'Pending' && pendingEditableFields.includes(key)) {
                     // Special handling for dates if needed (convert to Timestamp)
                     if (key === 'desiredStartDate' || key === 'desiredEndDate') {
                         try { allowedUpdates[key] = Timestamp.fromDate(new Date(updates[key])); }
                         catch (e) { throw new Error(`Invalid format for ${key}`); }
                     } else {
                         allowedUpdates[key] = updates[key];
                     }
                }
             }

             // Add validation if needed (e.g., date checks if dates are updated)
              if (allowedUpdates.desiredStartDate || allowedUpdates.desiredEndDate) {
                  const newStart = allowedUpdates.desiredStartDate || eventData.desiredStartDate;
                  const newEnd = allowedUpdates.desiredEndDate || eventData.desiredEndDate;
                  if (newStart && newEnd && newStart.toDate() >= newEnd.toDate()) {
                      throw new Error("End date must be after start date.");
                  }
              }

              if (Object.keys(allowedUpdates).length > 0) {
                 await updateDoc(eventRef, allowedUpdates);
                 dispatch('updateLocalEvent', { id: eventId, changes: allowedUpdates }); // Update local cache
                 console.log(`Event ${eventId} details updated:`, allowedUpdates);
              } else {
                 console.log("No valid fields to update or no changes detected.");
              }

        } catch (error) {
            console.error("Error updating event details:", error);
            throw error; // Re-throw for component
        }
    }
};
const mutations = {
    setEvents(state, events) { state.events = events; },
    addOrUpdateEvent(state, event) {
        const index = state.events.findIndex(e => e.id === event.id);
        if (index !== -1) {
            // Preserve existing fields not present in the 'event' update object
            state.events[index] = { ...state.events[index], ...event };
        } else {
            state.events.push(event);
        }
        // Sort whenever events are updated/added
        state.events.sort((a, b) => {
             // Simple sort: Pending first, then Approved/InProgress by start date, then Completed/Cancelled/Rejected by end/creation date
             const statusOrder = { Pending: 0, Approved: 1, InProgress: 2, Completed: 3, Cancelled: 4, Rejected: 5 };
             const orderA = statusOrder[a.status] ?? 9;
             const orderB = statusOrder[b.status] ?? 9;
             if (orderA !== orderB) return orderA - orderB;
             // Secondary sort by date
             const dateA = a.startDate?.seconds ?? a.createdAt?.seconds ?? 0;
             const dateB = b.startDate?.seconds ?? b.createdAt?.seconds ?? 0;
             return dateB - dateA; // Descending date within status groups (newest first)
         });
    },
    removeEvent(state, eventId) { state.events = state.events.filter(event => event.id !== eventId); },
    // REMOVED: setEventRequests, removeEventRequest
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