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
    getDocsFromServer,
    orderBy 
} from 'firebase/firestore';

// Helper function to calculate the weighted average score (0-5 scale) from ratings
// This is kept internal to this module
const _calculateWeightedAverageScore = (ratings = []) => {
    if (!ratings || ratings.length === 0) return 0;

    let totalTeacherRatingSum = 0;
    let teacherRatingCount = 0;
    let totalStudentRatingSum = 0;
    let studentRatingCount = 0;

    for (const ratingEntry of ratings) {
        if (!ratingEntry.rating) continue; // Skip if rating data is missing

        const rating = ratingEntry.rating;
        // Use fixed constraint keys, default to 0 if a constraint wasn't rated
        const overallRating = (
            (rating.design || 0) +
            (rating.presentation || 0) +
            (rating.problemSolving || 0) +
            (rating.execution || 0) +
            (rating.technology || 0)
        ) / 5.0; // Average of the 5 criteria

        if (ratingEntry.isTeacherRating) {
            totalTeacherRatingSum += overallRating;
            teacherRatingCount++;
        } else {
            totalStudentRatingSum += overallRating;
            studentRatingCount++;
        }
    }

    const averageTeacherRating = teacherRatingCount > 0 ? totalTeacherRatingSum / teacherRatingCount : 0;
    const averageStudentRating = studentRatingCount > 0 ? totalStudentRatingSum / studentRatingCount : 0;

    // Apply weighting (e.g., 70% Teacher, 30% Student)
    const weightedAverage = 0.7 * averageTeacherRating + 0.3 * averageStudentRating;

    return Math.max(0, Math.min(5, weightedAverage)); // Ensure score is between 0 and 5
};


const state = {
    events: [],
    eventRequests: [],
};

const getters = {
    allEvents: (state) => state.events,
    getEventById: (state) => (id) => {
        return state.events.find(event => event.id === id) || null;
    },
    allEventRequests: (state) => state.eventRequests,
};

const actions = {
    // Action to check if a user has pending/active event requests
    async checkExistingRequests({ rootState }) {
        if (!rootState.user || !rootState.user.uid) return false;
        const q = query(
            collection(db, 'eventRequests'),
            where('requester', '==', rootState.user.uid),
            where('status', 'in', ['Pending', 'Approved'])
        );
        const querySnapshot = await getDocsFromServer(q);
        return !querySnapshot.empty;
    },

    // Action to check for date conflicts
    async checkDateConflict(_, { startDate, endDate }) {
        const q = query(collection(db, 'events'), where('status', 'in', ['Upcoming', 'In Progress', 'Approved']));
        const querySnapshot = await getDocs(q);
        let conflictingEvent = null;
        const checkStart = startDate instanceof Date ? startDate : new Date(startDate);
        const checkEnd = endDate instanceof Date ? endDate : new Date(endDate);


        querySnapshot.forEach((doc) => {
            const event = doc.data();
            if (!event.startDate || !event.endDate) return; // Skip if event has no dates

            const eventStart = event.startDate.toDate();
            const eventEnd = event.endDate.toDate();

            // Basic overlap check
            if (
                (checkStart >= eventStart && checkStart <= eventEnd) || // New start is within existing event
                (checkEnd >= eventStart && checkEnd <= eventEnd) ||     // New end is within existing event
                (checkStart <= eventStart && checkEnd >= eventEnd)      // New event envelops existing event
            ) {
                conflictingEvent = { id: doc.id, ...event };
            }
        });
        return conflictingEvent;
    },


    async createEvent({ rootState, dispatch }, eventData) {
        // Direct event creation (for Admin/Teacher auto-approval)
        try {
            const userRole = rootState.user?.role;
            if (userRole !== 'Teacher' && userRole !== 'Admin') {
                throw new Error('Only teachers or admins can create events directly.');
            }

            const conflict = await dispatch('checkDateConflict', {
                startDate: eventData.startDate,
                endDate: eventData.endDate
            });
            if (conflict) {
                throw new Error(`Date conflict detected with event: "${conflict.eventName}". Please choose different dates.`);
            }

            const docRef = await addDoc(collection(db, 'events'), {
                eventName: eventData.eventName,
                eventType: eventData.eventType,
                description: eventData.description,
                startDate: Timestamp.fromDate(new Date(eventData.startDate)),
                endDate: Timestamp.fromDate(new Date(eventData.endDate)),
                organizer: rootState.user.uid,
                coOrganizers: eventData.coOrganizers || [],
                ratingConstraints: eventData.ratingConstraints || ['Design', 'Presentation', 'Problem Solving', 'Execution', 'Technology'],
                isTeamEvent: eventData.isTeamEvent,
                status: 'Upcoming',
                ratingsOpen: false,
                teams: [],
                participants: [],
                ratings: [],
                winners: []
            });

            await dispatch('fetchEvents');
            return docRef.id;
        } catch (error) {
            console.error('Error creating event directly:', error);
            throw error;
        }
    },

    async requestEvent({ dispatch, rootState }, eventData) {
        try {
            const userRole = rootState.user?.role;
            if (userRole !== 'Admin' && userRole !== 'Teacher') { // Check if NOT admin/teacher
                const hasActiveRequest = await dispatch('checkExistingRequests');
                if (hasActiveRequest) {
                    throw new Error('You already have an active or pending event request. Please wait for it to be resolved.');
                }
            }

            const requestData = {
                eventName: eventData.eventName,
                eventType: eventData.eventType,
                description: eventData.description,
                requester: rootState.user.uid,
                status: 'Pending',
                desiredStartDate: eventData.desiredStartDate,
                desiredEndDate: eventData.desiredEndDate,
                isTeamEvent: eventData.isTeamEvent,
                coOrganizers: eventData.coOrganizers || [],
                ratingConstraints: eventData.ratingConstraints || ['Design', 'Presentation', 'Problem Solving', 'Execution', 'Technology'],
                createdAt: Timestamp.now(),
            };

            await addDoc(collection(db, 'eventRequests'), requestData);
            // No need to fetch all requests here
        } catch (error) {
            console.error('Error requesting event:', error);
            throw error;
        }
    },

    async fetchEvents({ commit }) {
        try {
            const q = query(collection(db, 'events'), orderBy('startDate', 'desc'));
            const querySnapshot = await getDocs(q);
            const events = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            commit('setEvents', events);
        } catch (error) {
            console.error('Error fetching events:', error);
        }
    },

    async fetchEventDetails({ commit, state }, eventId) {
        try {
            const localEvent = state.events.find(e => e.id === eventId);
            if (localEvent) {
                return localEvent;
            }

            const docRef = doc(db, "events", eventId);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const eventData = { id: docSnap.id, ...docSnap.data() };
                commit('addOrUpdateEvent', eventData);
                return eventData;
            } else {
                console.log("No such event document!");
                return null;
            }
        } catch (error) {
            console.error("Error fetching event details:", error);
            return null;
        }
    },

    async addTeamToEvent({ dispatch, rootState }, { eventId, teamName, members }) {
        try {
            const eventRef = doc(db, 'events', eventId);
            const eventSnap = await getDoc(eventRef);

            if (!eventSnap.exists()) throw new Error('Event not found.');
            const eventData = eventSnap.data();

            const canManage = eventData.organizer === rootState.user.uid ||
                (eventData.coOrganizers && eventData.coOrganizers.includes(rootState.user.uid)) ||
                rootState.user.role === 'Admin';

            if (!canManage) throw new Error('Only the event organizer, co-organizers, or an admin can add teams.');
            if (!eventData.isTeamEvent) throw new Error('Cannot add teams to a non-team event.');

            const teamNameLower = teamName.toLowerCase();
            if (eventData.teams && eventData.teams.some(team => team.teamName.toLowerCase() === teamNameLower)) {
                throw new Error(`Team name "${teamName}" already exists.`);
            }

            if (eventData.teams) {
                const allMembers = eventData.teams.flatMap(team => team.members || []);
                const newMemberConflicts = members.filter(memberId => allMembers.includes(memberId));
                if (newMemberConflicts.length > 0) {
                    throw new Error(`User(s) ${newMemberConflicts.join(', ')} are already in another team for this event.`);
                }
            }

            const newTeam = { teamName, members, ratings: [] };
            const updatedTeams = [...(eventData.teams || []), newTeam];

            await updateDoc(eventRef, { teams: updatedTeams });
            dispatch('updateLocalEvent', { id: eventId, changes: { teams: updatedTeams } });
        } catch (error) {
            console.error('Error adding team:', error);
            throw error;
        }
    },

    async fetchEventRequests({ commit }) { // Fetch pending requests sorted by desired date
        try {
            const q = query(
                collection(db, 'eventRequests'),
                where('status', '==', 'Pending'),
                orderBy('desiredStartDate', 'asc') // Requires Index
            );
            const querySnapshot = await getDocs(q);
            const eventRequests = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            commit('setEventRequests', eventRequests);
        } catch (error) {
            console.error('Error fetching event requests:', error);
            // Remember to check console for index creation link if this fails!
        }
    },

    async approveEventRequest({ dispatch }, requestId) {
        const requestRef = doc(db, 'eventRequests', requestId);
        const eventCollectionRef = collection(db, 'events');

        try {
            const requestSnap = await getDoc(requestRef);
            if (!requestSnap.exists()) throw new Error('Event request not found');

            const requestData = requestSnap.data();
            if (requestData.status !== 'Pending') throw new Error('Request is not pending approval.');

            const reqStartDate = new Date(requestData.desiredStartDate);
            const reqEndDate = new Date(requestData.desiredEndDate);

            const conflictingEvent = await dispatch('checkDateConflict', { startDate: reqStartDate, endDate: reqEndDate });
            if (conflictingEvent) {
                throw new Error(`Date conflict with event: "${conflictingEvent.eventName}" (${conflictingEvent.startDate.toDate().toLocaleDateString()} - ${conflictingEvent.endDate.toDate().toLocaleDateString()}). Please reject or ask requester to change dates.`);
            }

            const eventData = {
                eventName: requestData.eventName,
                eventType: requestData.eventType,
                description: requestData.description,
                startDate: Timestamp.fromDate(reqStartDate),
                endDate: Timestamp.fromDate(reqEndDate),
                organizer: requestData.requester,
                coOrganizers: requestData.coOrganizers || [],
                ratingConstraints: requestData.ratingConstraints || ['Design', 'Presentation', 'Problem Solving', 'Execution', 'Technology'],
                isTeamEvent: requestData.isTeamEvent,
                status: 'Upcoming',
                ratingsOpen: false,
                teams: [],
                participants: [],
                ratings: [],
                winners: []
            };

            const batch = writeBatch(db);
            const newEventRef = doc(eventCollectionRef);
            batch.set(newEventRef, eventData);
            batch.update(requestRef, { status: 'Approved' });
            await batch.commit();

            await dispatch('fetchEvents');
            commit('removeEventRequest', requestId); // Update local state immediately

        } catch (error) {
            console.error('Error approving event request:', error);
            throw error;
        }
    },

    async rejectEventRequest({ dispatch, commit }, requestId) { // Added commit
        try {
            const requestRef = doc(db, 'eventRequests', requestId);
            await updateDoc(requestRef, { status: 'Rejected' });
            commit('removeEventRequest', requestId); // Update local state
        } catch (error) {
            console.error("Error rejecting event request: ", error);
            throw error;
        }
    },

    async updateEventStatus({ dispatch, commit }, { eventId, newStatus }) { // Added commit
        const validStatuses = ['Upcoming', 'In Progress', 'Completed', 'Cancelled'];
        if (!validStatuses.includes(newStatus)) throw new Error('Invalid event status.');

        try {
            const eventRef = doc(db, 'events', eventId);
            const updates = { status: newStatus };

            // Ensure ratings are closed if not 'Completed'
            if (newStatus !== 'Completed') {
                updates.ratingsOpen = false;
            }

            await updateDoc(eventRef, updates);
            dispatch('updateLocalEvent', { id: eventId, changes: updates }); // Update local

            // Recalculate XP when event is marked Completed
            if (newStatus === 'Completed') {
                // Use { root: true } to dispatch action in different module
                await dispatch('user/calculateUserXP', null, { root: true });
            }
        } catch (error) {
            console.error(`Error updating event status to ${newStatus}:`, error);
            throw error;
        }
    },

    async toggleRatingsOpen({ dispatch }, { eventId, isOpen }) {
        try {
            const eventRef = doc(db, 'events', eventId);
            await updateDoc(eventRef, { ratingsOpen: isOpen });
            dispatch('updateLocalEvent', { id: eventId, changes: { ratingsOpen: isOpen } });
        } catch (error) {
            console.error("Error toggling ratings open/closed:", error);
            throw error;
        }
    },

    async setWinners({ dispatch }, { eventId, winners }) {
        try {
            const eventRef = doc(db, 'events', eventId);
            await updateDoc(eventRef, { winners: winners });
            dispatch('updateLocalEvent', { id: eventId, changes: { winners: winners } });
            // Recalculate XP if winners changed (might give bonus)
            await dispatch('user/calculateUserXP', null, { root: true });
        } catch (error) {
            console.error("Error setting winners:", error);
            throw error;
        }
    },

    async deleteEvent({ dispatch, commit }, eventId) { // Added commit
        try {
            const eventRef = doc(db, 'events', eventId);
            await deleteDoc(eventRef);
            commit('removeEvent', eventId); // Remove from local state
        } catch (error) {
            console.error("Error deleting event:", error);
            throw error;
        }
    },

    // --- Implemented calculateWinners ---
    async calculateWinners({ dispatch, state }, eventId) {
        console.log(`Calculating winners for event: ${eventId}`);
        try {
            // 1. Fetch fresh event details to ensure data consistency
            const event = await dispatch('fetchEventDetails', eventId);

            // 2. Validate Event Status
            if (!event) {
                throw new Error("Event not found.");
            }
            if (event.status !== 'Completed') {
                throw new Error("Winners can only be calculated for completed events.");
            }

            // 3. Calculate Scores
            let scores = [];
            if (event.isTeamEvent) {
                if (!event.teams || event.teams.length === 0) {
                    console.log("No teams found for this team event.");
                    scores = [];
                } else {
                    scores = event.teams.map(team => ({
                        id: team.teamName, // Winner ID is the team name
                        score: _calculateWeightedAverageScore(team.ratings || [])
                    }));
                }
            } else { // Individual Event
                if (!event.participants || event.participants.length === 0) {
                    console.log("No participants found for this individual event.");
                    scores = [];
                } else {
                     scores = event.participants.map(participantId => {
                         // Filter ratings for this specific participant
                        const participantRatings = (event.ratings || []).filter(r => r.ratedTo === participantId);
                        return {
                            id: participantId, // Winner ID is the user UID
                            score: _calculateWeightedAverageScore(participantRatings)
                        };
                     });
                }
            }

            console.log("Calculated scores:", scores);

            // 4. Determine Winners (Top 1 score, handles ties by including all tied at top)
            if (scores.length === 0) {
                 console.log("No scores calculated, cannot determine winners.");
                 await dispatch('setWinners', { eventId, winners: [] }); // Clear winners if no scores
                 return; // Exit early
            }

            scores.sort((a, b) => b.score - a.score); // Sort descending by score

            const topScore = scores[0].score;
            const winners = scores.filter(s => s.score === topScore && s.score > 0).map(s => s.id); // Get all IDs with the top score (if score > 0)

            console.log("Determined winners:", winners);

            // 5. Update Event with Winners
            await dispatch('setWinners', { eventId, winners });

            alert(`Winner calculation complete. Winner(s): ${winners.join(', ')} with a score of ${topScore.toFixed(2)}`);


        } catch (error) {
            console.error("Error calculating winners:", error);
            alert(`Error calculating winners: ${error.message}`); // Show error to user
            // Don't re-throw here, alert is sufficient feedback for this action
        }
    },


    // Action to update local event state without full refetch
    updateLocalEvent({ commit }, { id, changes }) {
        commit('addOrUpdateEvent', { id, ...changes });
    },

     // --- NEW ACTION: Submit Project ---
     async submitProjectToEvent({ rootState, dispatch }, { eventId, submissionData }) {
        // submissionData expected: { projectName, link, description }
        if (!submissionData || !submissionData.projectName || !submissionData.link) {
            throw new Error("Project Name and Link are required for submission.");
        }

        const eventRef = doc(db, 'events', eventId);
        const eventSnap = await getDoc(eventRef);
        if (!eventSnap.exists()) throw new Error('Event not found.');

        const eventData = eventSnap.data();
        const userId = rootState.user.uid;

        if (eventData.status !== 'In Progress') {
            throw new Error("Project submissions are only allowed while the event is 'In Progress'.");
        }

        try {
            if (eventData.isTeamEvent) {
                // Find the user's team
                const userTeamIndex = eventData.teams.findIndex(team => team.members?.includes(userId));
                if (userTeamIndex === -1) throw new Error("You are not part of a team in this event.");

                // Check if team already submitted (simple check: assumes one submission per team)
                if (eventData.teams[userTeamIndex].submissions?.length > 0) {
                    throw new Error("Your team has already submitted a project for this event.");
                }

                // Prepare update for the specific team's submissions array
                const updatedTeams = [...eventData.teams];
                const submissionEntry = { ...submissionData }; // Copy data
                // Initialize submissions array if it doesn't exist
                if (!updatedTeams[userTeamIndex].submissions) {
                    updatedTeams[userTeamIndex].submissions = [];
                }
                updatedTeams[userTeamIndex].submissions.push(submissionEntry);

                await updateDoc(eventRef, { teams: updatedTeams });

            } else { // Individual Event
                // Check if user is a participant
                if (!eventData.participants?.includes(userId)) {
                    throw new Error("You are not a participant in this event.");
                }
                // Check if user already submitted
                if (eventData.submissions?.some(sub => sub.participantId === userId)) {
                    throw new Error("You have already submitted a project for this event.");
                }

                // Prepare update for the top-level submissions array
                const submissionEntry = {
                    participantId: userId,
                    ...submissionData // Copy data
                };
                await updateDoc(eventRef, {
                    submissions: arrayUnion(submissionEntry) // Use arrayUnion to add
                });
            }
             // Refresh local state
             dispatch('updateLocalEvent', { id: eventId, changes: (await getDoc(eventRef)).data() });

        } catch (error) {
            console.error("Error submitting project:", error);
            throw error; // Re-throw for the component to catch
        }
    },

    // --- NEW ACTION: Leave Event ---
    async leaveEvent({ rootState, dispatch }, eventId) {
        const eventRef = doc(db, 'events', eventId);
        const eventSnap = await getDoc(eventRef);

        if (!eventSnap.exists()) throw new Error('Event not found.');
        const eventData = eventSnap.data();
        const userId = rootState.user.uid;

        if (eventData.status !== 'Upcoming') {
            throw new Error("You can only leave an event before it starts ('Upcoming').");
        }

        try {
            if (eventData.isTeamEvent) {
                const userTeamIndex = eventData.teams.findIndex(team => team.members?.includes(userId));
                if (userTeamIndex === -1) throw new Error("You are not part of a team in this event.");

                // Remove user from the specific team's members array
                const updatedTeams = [...eventData.teams];
                const currentMembers = updatedTeams[userTeamIndex].members || [];
                updatedTeams[userTeamIndex].members = currentMembers.filter(memberId => memberId !== userId);

                await updateDoc(eventRef, { teams: updatedTeams });

            } else { // Individual Event
                if (!eventData.participants?.includes(userId)) {
                    throw new Error("You are not a participant in this event.");
                }
                // Use arrayRemove to remove user from participants
                await updateDoc(eventRef, {
                    participants: arrayRemove(userId)
                });
            }
             // Refresh local state
             dispatch('updateLocalEvent', { id: eventId, changes: (await getDoc(eventRef)).data() });

        } catch (error) {
            console.error("Error leaving event:", error);
            throw error;
        }
    }
};

const mutations = {
    setEvents(state, events) {
        state.events = events;
    },
    addOrUpdateEvent(state, event) {
        const index = state.events.findIndex(e => e.id === event.id);
        if (index !== -1) {
            // Merge changes carefully
            state.events[index] = { ...state.events[index], ...event };
        } else {
            state.events.push(event);
            state.events.sort((a, b) => (b.startDate?.seconds ?? 0) - (a.startDate?.seconds ?? 0)); // Sort descending
        }
    },
    removeEvent(state, eventId) {
        state.events = state.events.filter(event => event.id !== eventId);
    },
    setEventRequests(state, eventRequests) {
        state.eventRequests = eventRequests;
    },
    removeEventRequest(state, requestId) {
        state.eventRequests = state.eventRequests.filter(req => req.id !== requestId);
    },
};

export default {
    namespaced: true,
    state,
    getters,
    actions,
    mutations,
};