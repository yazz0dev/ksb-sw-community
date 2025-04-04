// src/store/modules/events/actions.js

import { db } from '../../../firebase';
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
    orderBy,
    arrayUnion,
    arrayRemove,
    enableNetwork,
    disableNetwork,
    increment,
    deleteField
} from 'firebase/firestore';
import { mapEventDataToFirestore } from '@/utils/eventDataMapper'; // Corrected import path

// --- MODIFIED HELPER: Check if ANY provided UID belongs to an Admin --- 
// Accepts a single array of organizer UIDs
async function validateOrganizersNotAdmin(organizerIds = []) {
    const userIdsToCheck = new Set(organizerIds.filter(Boolean));
    if (userIdsToCheck.size === 0) return; // No organizers to check

    const fetchPromises = Array.from(userIdsToCheck).map(async (uid) => {
        try {
            const userDocRef = doc(db, 'users', uid);
            const docSnap = await getDoc(userDocRef);
            if (docSnap.exists() && docSnap.data().role === 'Admin') {
                const adminName = docSnap.data().name || uid;
                // Updated error message slightly
                throw new Error(`User '${adminName}' (Admin) cannot be assigned as an organizer.`);
            }
        } catch (error) {
            if (error.message.includes('cannot be assigned')) throw error;
            console.error(`Error fetching user role for ${uid}:`, error);
            throw new Error(`Failed to verify role for user ${uid}.`);
        }
    });
    await Promise.all(fetchPromises);
}


export const eventActions = {
    async checkExistingRequests({ rootGetters }) {
        const currentUser = rootGetters['user/getUser'];
        if (!currentUser || !currentUser.uid) return false;
        const q = query(
            collection(db, 'events'),
            where('requester', '==', currentUser.uid),
            where('status', 'in', ['Pending', 'Approved', 'InProgress'])
        );
        const querySnapshot = await getDocs(q);
        return !querySnapshot.empty;
    },

    async checkDateConflict(_, { startDate, endDate, excludeEventId = null }) {
        let checkStart, checkEnd;
        try {
            checkStart = startDate instanceof Date ? startDate : new Date(startDate);
            checkEnd = endDate instanceof Date ? endDate : new Date(endDate);
            if (isNaN(checkStart.getTime()) || isNaN(checkEnd.getTime())) {
                throw new Error("Invalid date format.");
            }
            checkStart.setHours(0, 0, 0, 0);
            checkEnd.setHours(23, 59, 59, 999);
        } catch (e) {
            console.error("Date parsing error in checkDateConflict:", e);
            throw new Error("Invalid date format provided.");
        }

        // Query events that could potentially conflict (Approved, InProgress)
        const q = query( collection(db, 'events'), where('status', 'in', ['Approved', 'InProgress']) );
        const querySnapshot = await getDocs(q);
        let conflictingEvent = null;

        querySnapshot.forEach((doc) => {
            const event = doc.data();

            // Skip the event being edited
            if (excludeEventId && doc.id === excludeEventId) {
                return;
            }

            // Skip if event doesn't have valid start/end dates stored as Timestamps
            if (!event.startDate?.seconds || !event.endDate?.seconds) return;

            try {
                const eventStart = event.startDate.toDate();
                const eventEnd = event.endDate.toDate();
                if (isNaN(eventStart.getTime()) || isNaN(eventEnd.getTime())) return; // Skip invalid stored dates

                eventStart.setHours(0, 0, 0, 0);
                eventEnd.setHours(23, 59, 59, 999);

                // Standard overlap check
                if (checkStart <= eventEnd && checkEnd >= eventStart) {
                     conflictingEvent = { id: doc.id, ...event };
                     // Found a conflict, can stop checking (though forEach continues)
                }
            } catch (dateError) {
                console.warn(`Skipping event ${doc.id} in conflict check due to date issue:`, dateError);
            }
        });
        return conflictingEvent; // Returns null or the first conflicting event found
    },

    // --- REVERTED: createEvent ACTION (Admin only) ---
    async createEvent({ rootGetters, commit, dispatch }, eventData) {
        try {
            const currentUser = rootGetters['user/getUser'];
            if (currentUser?.role !== 'Admin') {
                throw new Error('Unauthorized: Only Admins can create events directly.');
            }

            // Validate organizers
            const organizers = Array.isArray(eventData.organizers) ? eventData.organizers : [];
            if (organizers.length === 0) {
                throw new Error("At least one organizer is required when an Admin creates an event.");
            }
             if (organizers.length > 5) { // Limit total organizers
                 throw new Error("Cannot have more than 5 organizers.");
             }
            await validateOrganizersNotAdmin(organizers);

            // Mapper handles date conversion from Date objects or strings
            const mappedData = mapEventDataToFirestore({
                ...eventData,
                // Pass dates as received (should be Date objects from component)
                startDate: eventData.startDate,
                endDate: eventData.endDate,
                organizers: organizers,      // Pass the combined array
                requester: currentUser.uid,    // Admin is the requester
            });

            mappedData.status = 'Approved';

            if (!mappedData.startDate || !mappedData.endDate) {
                throw new Error("Admin event creation requires valid start and end dates.");
            }
            if (mappedData.startDate.toMillis() > mappedData.endDate.toMillis()) {
               throw new Error("End date cannot be earlier than the start date.");
            }

            const conflictingEvent = await dispatch('checkDateConflict', {
                startDate: mappedData.startDate.toDate(),
                endDate: mappedData.endDate.toDate(),
                excludeEventId: null
            });
            if (conflictingEvent) {
                throw new Error(
                    `Creation failed: Date conflict with event "${conflictingEvent.eventName}". Please choose different dates.`
                );
            }

            // Initialize Arrays and Participants/Teams
            mappedData.ratingsOpen = false;
            mappedData.winnersPerRole = {};
            mappedData.submissions = Array.isArray(mappedData.submissions) ? mappedData.submissions : [];
            mappedData.ratings = Array.isArray(mappedData.ratings) ? mappedData.ratings : [];
            mappedData.xpAllocation = Array.isArray(mappedData.xpAllocation) ? mappedData.xpAllocation : [];
            mappedData.organizationRatings = [];
            mappedData.completedAt = null;
            mappedData.ratingsLastOpenedAt = null;
            mappedData.ratingsOpenCount = 0;

            if (mappedData.isTeamEvent) {
                mappedData.teams = Array.isArray(mappedData.teams) ? mappedData.teams.map(t => ({
                    teamName: t.teamName || 'Unnamed Team',
                    members: Array.isArray(t.members) ? t.members : [],
                    submissions: [],
                    ratings: []
                })) : [];
                mappedData.participants = [];
            } else {
                const studentUIDs = await dispatch('user/fetchAllStudentUIDs', null, { root: true });
                mappedData.participants = studentUIDs || [];
                delete mappedData.teams;
            }

            const docRef = await addDoc(collection(db, 'events'), mappedData);
            commit('addOrUpdateEvent', { id: docRef.id, ...mappedData });
            return docRef.id;
        } catch (error) {
            console.error('Error creating event:', error);
            if (error.message.startsWith('Creation failed: Date conflict')) {
                throw error;
            }
            throw new Error(`Failed to create event: ${error.message || 'Unknown error'}`);
        }
    },

    // --- REVERTED requestEvent ACTION (Non-Admin only) ---
    async requestEvent({ dispatch, rootGetters, commit }, eventData) {
        try {
            const currentUser = rootGetters['user/getUser'];
            const userId = currentUser?.uid;
            if (!userId) { throw new Error("User not authenticated."); }
            if (currentUser.role === 'Admin') { throw new Error("Admins should use the Create Event form."); }

            const hasActive = await dispatch('checkExistingRequests');
            if (hasActive) { throw new Error('You already have an active or pending event request.'); }

            // Validate desired dates
            let desiredStartDateObj, desiredEndDateObj;
            try {
                // Ensure we handle both Date objects and string representations (YYYY-MM-DD)
                desiredStartDateObj = eventData.desiredStartDate instanceof Date ? eventData.desiredStartDate : new Date(eventData.desiredStartDate + 'T00:00:00Z');
                desiredEndDateObj = eventData.desiredEndDate instanceof Date ? eventData.desiredEndDate : new Date(eventData.desiredEndDate + 'T23:59:59Z');
                if (isNaN(desiredStartDateObj.getTime()) || isNaN(desiredEndDateObj.getTime())) throw new Error("Invalid desired date format.");
                if (desiredStartDateObj > desiredEndDateObj) throw new Error("Desired end date cannot be earlier than desired start date.");
            } catch (e) { throw new Error(e.message || "Invalid date format."); }

             // Validate organizers
            const organizers = Array.isArray(eventData.organizers) ? [...new Set([userId, ...eventData.organizers])] : [userId]; // Ensure requester is always an organizer
             if (organizers.length > 5) { // Limit total organizers
                 throw new Error("Cannot have more than 5 organizers (including yourself).");
             }
            await validateOrganizersNotAdmin(organizers); // Validate all organizers

            // Mapper handles date conversion from Date objects or strings
            const requestData = mapEventDataToFirestore({
                eventName: eventData.eventName || 'Unnamed Request',
                eventType: eventData.eventType || 'Other',
                description: eventData.description || '',
                isTeamEvent: !!eventData.isTeamEvent,
                requester: userId,
                organizers: organizers, // Use the combined array
                xpAllocation: Array.isArray(eventData.xpAllocation) ? eventData.xpAllocation : [],
                status: 'Pending',
                // Pass desired dates as received (should be Date objects)
                desiredStartDate: eventData.desiredStartDate,
                desiredEndDate: eventData.desiredEndDate,
                createdAt: Timestamp.now(), // Keep this specific timestamp here
            });

            // Add/Override fields specifically for a new request
            requestData.status = 'Pending';
            requestData.organizationRatings = [];

            if (requestData.isTeamEvent) {
                requestData.teams = (Array.isArray(eventData.teams) ? eventData.teams : []).map(team => ({
                    teamName: team.teamName || 'Unnamed Team',
                    members: Array.isArray(team.members) ? team.members : [],
                    submissions: [],
                    ratings: []
                }));
            }

            const docRef = await addDoc(collection(db, 'events'), requestData);
            commit('addOrUpdateEvent', { id: docRef.id, ...requestData });

            return docRef.id;
        } catch (error) {
            console.error('Error requesting event:', error);
            throw error;
        }
    },

    // --- approveEventRequest --- (Unchanged)
    async approveEventRequest({ dispatch, commit, rootGetters }, eventId) {
        const currentUser = rootGetters['user/getUser'];
        if (currentUser?.role !== 'Admin') { throw new Error('Unauthorized: Only Admins can approve requests.'); }

        const eventRef = doc(db, 'events', eventId);
        try {
            const eventSnap = await getDoc(eventRef);
            if (!eventSnap.exists()) throw new Error('Event not found.');
            const eventData = eventSnap.data();
            if (eventData.status !== 'Pending') throw new Error('Only pending events can be approved.');

            if (!eventData.desiredStartDate || !eventData.desiredEndDate) {
                throw new Error("Event request is missing required desired dates.");
            }

            let reqStartDate, reqEndDate;
            try {
                reqStartDate = eventData.desiredStartDate.toDate();
                reqEndDate = eventData.desiredEndDate.toDate();
                if (isNaN(reqStartDate.getTime()) || isNaN(reqEndDate.getTime())) {
                    throw new Error("Invalid date format in event request.");
                }
                 if (reqStartDate > reqEndDate) { throw new Error("End date cannot be earlier than start date in request."); }

            } catch (dateError) {
                throw new Error(`Failed to process event dates: ${dateError.message}`);
            }

            const conflictingEvent = await dispatch('checkDateConflict', {
                startDate: reqStartDate,
                endDate: reqEndDate,
                excludeEventId: eventId
            });
            if (conflictingEvent) {
                throw new Error(
                    `Approval failed: Date conflict with "${conflictingEvent.eventName}". Adjust dates via edit or reject.`
                );
            }

            const updates = {
                status: 'Approved',
                startDate: eventData.desiredStartDate,
                endDate: eventData.desiredEndDate,
                participants: [],
                teams: [],
                organizationRatings: Array.isArray(eventData.organizationRatings) ? eventData.organizationRatings : []
            };

            if (!eventData.isTeamEvent) {
                const studentUIDs = await dispatch('user/fetchAllStudentUIDs', null, { root: true });
                updates.participants = studentUIDs || [];
            } else {
                updates.teams = (Array.isArray(eventData.teams) ? eventData.teams : []).map(team => ({
                    teamName: team.teamName || 'Unnamed Team',
                    members: Array.isArray(team.members) ? team.members : [],
                    submissions: [],
                    ratings: []
                }));
                 if (updates.teams.length === 0) {
                     console.warn(`Approving team event ${eventId} with no teams defined in the request.`);
                 }
            }

            await updateDoc(eventRef, updates);
            dispatch('updateLocalEvent', { id: eventId, changes: { ...eventData, ...updates } });

        } catch (error) {
            console.error(`Error approving event request ${eventId}:`, error);
            throw error;
        }
    },

    // --- rejectEventRequest --- (Unchanged)
    async rejectEventRequest({ commit, rootGetters, dispatch }, { eventId, reason }) {
        const currentUser = rootGetters['user/getUser'];
        if (currentUser?.role !== 'Admin') { throw new Error('Unauthorized: Only Admins can reject requests.'); }

        try {
            const eventRef = doc(db, 'events', eventId);
            const updates = {
                status: 'Rejected',
                rejectionReason: reason || null
            };

            await updateDoc(eventRef, updates);
            dispatch('updateLocalEvent', { id: eventId, changes: updates });

        } catch (error) {
            console.error(`Error rejecting event request ${eventId}: `, error);
            throw error;
        }
    },

     // --- REVERTED cancelEvent ---
     async cancelEvent({ dispatch, rootGetters }, eventId) {
         const eventRef = doc(db, 'events', eventId);
         try {
             const eventSnap = await getDoc(eventRef);
             if (!eventSnap.exists()) throw new Error("Event not found.");
             const currentEvent = eventSnap.data();

             // Permission Check: Admin OR any Organizer
             const currentUser = rootGetters['user/getUser'];
             const isAdmin = currentUser?.role === 'Admin';
             const isOrganizer = (currentEvent.organizers || []).includes(currentUser?.uid);
             if (!isAdmin && !isOrganizer) throw new Error("Permission denied to cancel this event.");

             if (!['Approved', 'InProgress'].includes(currentEvent.status)) {
                 throw new Error(`Cannot cancel an event with status '${currentEvent.status}'. Consider deleting if Pending/Rejected.`);
             }

             const updates = { status: 'Cancelled', ratingsOpen: false };
             await updateDoc(eventRef, updates);
             dispatch('updateLocalEvent', { id: eventId, changes: updates });
         } catch (error) { console.error(`Error cancelling event ${eventId}:`, error); throw error; }
     },

    // --- REVERTED updateEventStatus ---
    async updateEventStatus({ dispatch, rootGetters }, { eventId, newStatus }) {
        const validStatuses = ['Approved', 'In Progress', 'Completed', 'Cancelled'];
        if (!validStatuses.includes(newStatus)) {
            throw new Error(`Invalid status: ${newStatus}. Valid statuses are: ${validStatuses.join(', ')}`);
        }
        const statusToSet = newStatus === 'In Progress' ? 'InProgress' : newStatus;

        const eventRef = doc(db, 'events', eventId);
        try {
            const eventSnap = await getDoc(eventRef);
            if (!eventSnap.exists()) throw new Error("Event not found.");
            const currentEvent = { id: eventSnap.id, ...eventSnap.data() };

            let eventStartDate = currentEvent.startDate?.toDate();
            let eventEndDate = currentEvent.endDate?.toDate();

            // Permissions Check: Admin OR any Organizer
            const currentUser = rootGetters['user/getUser'];
            const isAdmin = currentUser?.role === 'Admin';
            const isOrganizer = (currentEvent.organizers || []).includes(currentUser?.uid);
            if (!isAdmin && !isOrganizer) { throw new Error("Permission denied to update event status."); }

            const updates = { status: statusToSet };
            switch (newStatus) {
                case 'In Progress':
                    if (currentEvent.status !== 'Approved') throw new Error("Event must be 'Approved' to be marked 'In Progress'.");
                    updates.ratingsOpen = false;
                    break;
                case 'Completed':
                    if (currentEvent.status !== 'InProgress') throw new Error("Event must be 'In Progress' to be marked 'Completed'.");
                    updates.ratingsOpen = false;
                    updates.completedAt = Timestamp.now();
                    break;
                case 'Cancelled':
                     return await dispatch('cancelEvent', eventId);
                case 'Approved':
                    if (!isAdmin) throw new Error("Only Admins can change status to 'Approved'.");
                    if (currentEvent.status !== 'Cancelled') throw new Error("Can only re-approve events that are 'Cancelled'.");
                    if (!eventStartDate || !eventEndDate) throw new Error("Event dates missing, cannot re-approve.");
                    const conflict = await dispatch('checkDateConflict', { startDate: eventStartDate, endDate: eventEndDate, excludeEventId: eventId });
                    if (conflict) throw new Error(`Cannot re-approve: Date conflict with "${conflict.eventName}".`);
                    updates.completedAt = null;
                    break;
            }
            await updateDoc(eventRef, updates);
            dispatch('updateLocalEvent', { id: eventId, changes: updates });
            if (newStatus === 'Completed' && currentEvent.status !== 'Completed') {
                console.log(`Event ${eventId} marked completed. Triggering XP calculation.`);
                dispatch('user/calculateUserXP', null, { root: true })
                    .catch(xpError => console.error(`XP Calculation trigger failed for event ${eventId}:`, xpError));
            }
        } catch (error) {
            console.error(`Error updating event ${eventId} status to ${newStatus}:`, error);
            throw error;
        }
    },

    // --- REVERTED toggleRatingsOpen ---
    async toggleRatingsOpen({ dispatch, rootGetters }, { eventId, isOpen }) {
        const eventRef = doc(db, 'events', eventId);
        try {
            const eventSnap = await getDoc(eventRef);
            if (!eventSnap.exists()) throw new Error("Event not found.");
            const currentEvent = eventSnap.data();

            // Permission Check: Admin OR any Organizer
            const currentUser = rootGetters['user/getUser'];
            const isAdmin = currentUser?.role === 'Admin';
            const isOrganizer = (currentEvent.organizers || []).includes(currentUser?.uid);
            if (!isAdmin && !isOrganizer) throw new Error("Permission denied to toggle ratings.");

            if (currentEvent.status !== 'Completed') {
                throw new Error("Ratings can only be toggled for completed events.");
            }
            const updates = {};
            const now = Timestamp.now();
            const ratingsOpenCount = currentEvent.ratingsOpenCount || 0;
            if (isOpen) {
                if (ratingsOpenCount >= 2) {
                    throw new Error("Rating period can only be opened a maximum of two times.");
                }
                let eventCompletedAt = currentEvent.completedAt;
                if (!eventCompletedAt && currentEvent.status === 'Completed') {
                    console.warn(`Event ${eventId} marked as Completed but missing completedAt timestamp. Setting it now.`);
                    updates.completedAt = now;
                } else if (!eventCompletedAt) {
                    console.warn(`Proceeding to open ratings for completed event ${eventId} despite missing completedAt timestamp.`);
                }
                updates.ratingsOpen = true;
                updates.ratingsLastOpenedAt = now;
                updates.ratingsOpenCount = increment(1);
            } else {
                updates.ratingsOpen = false;
            }
            await updateDoc(eventRef, updates);
            dispatch('updateLocalEvent', { id: eventId, changes: updates });
            return { status: 'success' };
        } catch (error) {
            console.error(`Error toggling ratings for event ${eventId}:`, error);
            return { status: 'error', message: error.message || 'Unknown error' };
        }
    },

    // --- REVERTED setWinnersPerRole ---
    async setWinnersPerRole({ dispatch, rootGetters }, { eventId, winnersMap }) {
         if (typeof winnersMap !== 'object' || winnersMap === null) {
             throw new Error("Invalid winners map provided. Must be an object.");
         }
         const eventRef = doc(db, 'events', eventId);
         try {
             const eventSnap = await getDoc(eventRef);
             if (!eventSnap.exists()) throw new Error("Event not found.");
             const currentEvent = eventSnap.data();

             // Permission Check: Admin OR any Organizer
             const currentUser = rootGetters['user/getUser'];
             const isAdmin = currentUser?.role === 'Admin';
             const isOrganizer = (currentEvent.organizers || []).includes(currentUser?.uid);
             if (!isAdmin && !isOrganizer) throw new Error("Permission denied to set winners.");

             if (currentEvent.status !== 'Completed') throw new Error("Winners can only be set for completed events.");

             await updateDoc(eventRef, { winnersPerRole: winnersMap });
             dispatch('updateLocalEvent', { id: eventId, changes: { winnersPerRole: winnersMap } });
             console.log(`Winners set for ${eventId}. Triggering XP calculation.`);
             dispatch('user/calculateUserXP', null, { root: true })
                 .catch(xpError => console.error(`XP Calculation trigger failed after setting winners for ${eventId}:`, xpError));
         } catch (error) { console.error(`Error setting winners for event ${eventId}:`, error); throw error; }
     },

    // --- deleteEvent --- (Permission logic updated)
    async deleteEvent({ commit, rootGetters }, eventId) {
        const eventRef = doc(db, 'events', eventId);
        try {
           const eventSnap = await getDoc(eventRef);
           if (!eventSnap.exists()) { console.warn(`Event ${eventId} already deleted or never existed.`); return; }
           const eventData = eventSnap.data();
           const currentUser = rootGetters['user/getUser'];
           const isAdmin = currentUser?.role === 'Admin';
           const isRequester = eventData.requester === currentUser?.uid;

           let canDelete = false;
            if (isAdmin) {
                 if (eventData.status === 'In Progress') {
                     throw new Error("Cannot delete 'In Progress' event. Cancel it first.");
                 }
                 canDelete = true;
            }
            // Requester can delete their *own* pending/rejected requests
            else if (isRequester && ['Pending', 'Rejected'].includes(eventData.status)) {
                canDelete = true;
            }

           if (!canDelete) {
               throw new Error(`Permission denied to delete this event (Status: ${eventData.status}). Admins can delete most events, requesters can delete their pending/rejected ones.`);
           }

           await deleteDoc(eventRef);
           commit('removeEvent', eventId);
           commit('clearCurrentEventDetailsIfMatching', eventId);
           console.log(`Event ${eventId} deleted successfully.`);
        } catch (error) { console.error(`Error deleting event ${eventId}:`, error); throw error; }
    },

    // --- calculateWinnersAuto --- (Unchanged)
    async calculateWinnersAuto({ dispatch, state, getters }, eventId) {
        console.log(`Attempting auto-calculation of winners per role for event: ${eventId}`);
        try {
            const event = getters.getEventById(eventId) || await dispatch('fetchEventDetails', eventId);
            if (!event) { throw new Error("Event not found."); }
            if (event.status !== 'Completed') { throw new Error("Winner calculation only allowed for 'Completed' events."); }
            const xpAlloc = getters.getEventXPAllocation(eventId);
            if (!Array.isArray(xpAlloc) || xpAlloc.length === 0) {
                throw new Error("Event has no XP allocation defined or allocation is empty.");
            }
            const scoresPerRolePerEntity = {};
            const roleToCriteriaIndices = {};
            xpAlloc.forEach(alloc => {
               if (alloc.role && alloc.points > 0) {
                   if (!roleToCriteriaIndices[alloc.role]) {
                       roleToCriteriaIndices[alloc.role] = [];
                   }
                   roleToCriteriaIndices[alloc.role].push(alloc.constraintIndex);
               }
            });
            const participantsOrTeams = event.isTeamEvent
                ? (event.teams || []).map(t => ({
                    id: t.teamName,
                    type: 'team',
                    ratings: t.ratings || []
                  }))
                : (event.participants || []).map(pId => ({
                    id: pId,
                    type: 'individual',
                    ratings: (event.ratings || []).filter(r => r.ratedTo === pId)
                  }));
            if (participantsOrTeams.length === 0) {
                alert('Winner calculation: No participants or teams found for this event.');
                await dispatch('setWinnersPerRole', { eventId, winnersMap: {} });
                return;
            }
            for (const entity of participantsOrTeams) {
                scoresPerRolePerEntity[entity.id] = {};
                xpAlloc.forEach(alloc => {
                     if (alloc.role && alloc.points > 0) {
                         scoresPerRolePerEntity[entity.id][alloc.role] = { totalScoreSum: 0, ratingCount: 0 };
                     }
                });
                for (const ratingEntry of entity.ratings) {
                    if (!ratingEntry?.rating || typeof ratingEntry.rating !== 'object' || !ratingEntry.ratedBy) continue;
                    for (const roleKey of Object.keys(roleToCriteriaIndices)) {
                        const relevantIndices = roleToCriteriaIndices[roleKey];
                        if (!relevantIndices || relevantIndices.length === 0) continue;
                        let criteriaSumForThisRater = 0;
                        let criteriaCountForThisRater = 0;
                        relevantIndices.forEach(index => {
                            const constraintKey = `constraint${index}`;
                            const ratingValue = Number(ratingEntry.rating[constraintKey]);
                            if (!isNaN(ratingValue) && ratingValue >= 0) {
                                criteriaSumForThisRater += ratingValue;
                                criteriaCountForThisRater++;
                            }
                        });
                        if (criteriaCountForThisRater > 0) {
                            const averageScoreFromThisRaterForRole = criteriaSumForThisRater / criteriaCountForThisRater;
                            scoresPerRolePerEntity[entity.id][roleKey].totalScoreSum += averageScoreFromThisRaterForRole;
                            scoresPerRolePerEntity[entity.id][roleKey].ratingCount++;
                        }
                    }
                }
            }
            const winnersMap = {};
            let winnersFound = false;
            xpAlloc.forEach(alloc => {
               const roleKey = alloc.role;
               if (!roleKey || alloc.points <= 0) return;
               let topAverageScoreForRole = -1;
               let currentWinnersForRole = [];
               participantsOrTeams.forEach(entity => {
                    const roleScoreData = scoresPerRolePerEntity[entity.id]?.[roleKey];
                    let averageScore = 0;
                    if (roleScoreData && roleScoreData.ratingCount > 0) {
                         averageScore = roleScoreData.totalScoreSum / roleScoreData.ratingCount;
                    }
                    if (averageScore > topAverageScoreForRole) {
                        topAverageScoreForRole = averageScore;
                        currentWinnersForRole = [entity.id];
                    } else if (averageScore === topAverageScoreForRole && topAverageScoreForRole >= 0) {
                         if (topAverageScoreForRole > 0 || (topAverageScoreForRole === 0 && currentWinnersForRole.length > 0)) {
                             currentWinnersForRole.push(entity.id);
                         }
                    }
               });
               if (topAverageScoreForRole >= 0 && currentWinnersForRole.length > 0) {
                   winnersMap[roleKey] = currentWinnersForRole.sort();
                   winnersFound = true;
               } else {
                   winnersMap[roleKey] = [];
               }
            });
            await dispatch('setWinnersPerRole', { eventId, winnersMap });
            alert(winnersFound
                ? 'Automatic winner calculation per role complete. Check event details.'
                : 'Winner calculation complete, but no definitive winners determined (scores might be zero, criteria unassigned to roles, or no ratings submitted).'
            );
        } catch (error) {
            console.error(`Error auto-calculating winners for event ${eventId}:`, error);
            alert(`Winner Calculation Error: ${error.message}`);
        }
    },

    // Fetch all events (consider pagination for large datasets)
    async fetchEvents({ commit }) {
        try {
            // Optional: Re-enable network if previously disabled
            // await enableNetwork(db);
            const querySnapshot = await getDocs(collection(db, "events"));
            const events = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                // Convert Timestamps to ISO strings for consistency, handle potential nulls
                const startDateISO = data.startDate?.toDate ? data.startDate.toDate().toISOString() : null;
                const endDateISO = data.endDate?.toDate ? data.endDate.toDate().toISOString() : null;
                const desiredStartDateISO = data.desiredStartDate?.toDate ? data.desiredStartDate.toDate().toISOString() : null;
                const desiredEndDateISO = data.desiredEndDate?.toDate ? data.desiredEndDate.toDate().toISOString() : null;

                events.push({
                    id: doc.id,
                    ...data, // Spread original data first
                    // Overwrite dates with converted ISO strings
                    startDate: startDateISO, 
                    endDate: endDateISO,
                    desiredStartDate: desiredStartDateISO,
                    desiredEndDate: desiredEndDateISO
                });
            });
            commit('setEvents', events);
            // console.log(`Fetched ${events.length} events.`);
        } catch (error) {
            console.error("Error fetching events:", error);
            // Optional: Disable network on specific errors
            // if (error.code === 'unavailable') { 
            //     await disableNetwork(db);
            //     console.warn("Firestore network disabled due to unavailability.");
            // }
            commit('setEvents', []); // Set empty array on error
            // Rethrow or handle error appropriately
            throw new Error(`Failed to fetch events: ${error.message}`);
        }
    },

    // --- fetchEventDetails --- (Unchanged)
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
                 commit('setCurrentEventDetails', null);
                 return null;
             }
         } catch (error) {
             console.error(`Error fetching event details for ${eventId}:`, error);
             commit('setCurrentEventDetails', null);
             throw error;
         }
     },

    // --- submitProjectToEvent --- (Unchanged)
    async submitProjectToEvent({ rootGetters, dispatch }, { eventId, submissionData }) {
        if (!submissionData || !submissionData.projectName || !submissionData.link) { throw new Error("Project Name and Link are required for submission."); }
        if (!submissionData.link.startsWith('http://') && !submissionData.link.startsWith('https://')) { throw new Error("Please provide a valid URL starting with http:// or https://."); }

        const eventRef = doc(db, 'events', eventId);
        try {
            const eventSnap = await getDoc(eventRef);
            if (!eventSnap.exists()) throw new Error('Event not found.');
            const eventData = eventSnap.data();
            const userId = rootGetters['user/getUser']?.uid;
            if (!userId) throw new Error("User not authenticated.");
            if (eventData.status !== 'InProgress') {
                throw new Error("Project submissions are only allowed while the event is 'In Progress'.");
            }
            let updatedEventData;
            const submissionEntry = {
                ...submissionData,
                submittedAt: Timestamp.now(),
                submittedBy: userId
            };
            if (eventData.isTeamEvent) {
                 const currentTeams = Array.isArray(eventData.teams) ? eventData.teams : [];
                 const userTeamIndex = currentTeams.findIndex(team => Array.isArray(team.members) && team.members.includes(userId));
                 if (userTeamIndex === -1) throw new Error("You are not currently assigned to a team for this event.");
                 const teamSubmissions = currentTeams[userTeamIndex]?.submissions || [];
                 if (teamSubmissions.length > 0) throw new Error("Your team has already submitted a project for this event.");
                 const updatedTeams = JSON.parse(JSON.stringify(currentTeams));
                 if (!Array.isArray(updatedTeams[userTeamIndex].submissions)) { updatedTeams[userTeamIndex].submissions = []; }
                 updatedTeams[userTeamIndex].submissions.push(submissionEntry);
                 await updateDoc(eventRef, { teams: updatedTeams });
                 updatedEventData = { teams: updatedTeams };
            } else {
                 const currentParticipants = Array.isArray(eventData.participants) ? eventData.participants : [];
                 if (!currentParticipants.includes(userId)) throw new Error("You are not registered as a participant for this event.");
                 const currentSubmissions = Array.isArray(eventData.submissions) ? eventData.submissions : [];
                 if (currentSubmissions.some(sub => sub.participantId === userId)) throw new Error("You have already submitted a project for this event.");
                 submissionEntry.participantId = userId;
                 await updateDoc(eventRef, { submissions: arrayUnion(submissionEntry) });
                 const freshSnap = await getDoc(eventRef);
                 updatedEventData = { submissions: freshSnap.data()?.submissions || [] };
            }
             dispatch('updateLocalEvent', { id: eventId, changes: updatedEventData });
             console.log(`Project submitted successfully for event ${eventId} by user ${userId}`);
        } catch (error) { console.error(`Error submitting project for event ${eventId}:`, error); throw error; }
    },

    // --- leaveEvent --- (Unchanged)
    async leaveEvent({ rootGetters, dispatch }, eventId) {
        const eventRef = doc(db, 'events', eventId);
        try {
            const eventSnap = await getDoc(eventRef);
            if (!eventSnap.exists()) throw new Error('Event not found.');
            const eventData = eventSnap.data();
            const userId = rootGetters['user/getUser']?.uid;
            if (!userId) throw new Error("User not authenticated.");
            if (eventData.status !== 'Approved') {
                throw new Error(`Cannot leave event with status '${eventData.status}'. Only 'Approved' events can be left before they start.`);
            }
             let updatedEventData;
            if (eventData.isTeamEvent) {
                const currentTeams = Array.isArray(eventData.teams) ? eventData.teams : [];
                let userTeamIndex = -1;
                for(let i = 0; i < currentTeams.length; i++) {
                    if (Array.isArray(currentTeams[i].members) && currentTeams[i].members.includes(userId)) {
                        userTeamIndex = i;
                        break;
                    }
                }
                if (userTeamIndex === -1) { console.log(`LeaveEvent: User ${userId} is not in any team for event ${eventId}. No action taken.`); return; }
                const updatedTeams = JSON.parse(JSON.stringify(currentTeams));
                updatedTeams[userTeamIndex].members = updatedTeams[userTeamIndex].members.filter(memberId => memberId !== userId);
                await updateDoc(eventRef, { teams: updatedTeams });
                updatedEventData = { teams: updatedTeams };
            } else {
                const currentParticipants = Array.isArray(eventData.participants) ? eventData.participants : [];
                if (!currentParticipants.includes(userId)) { console.log(`LeaveEvent: User ${userId} is not a participant in event ${eventId}. No action taken.`); return; }
                await updateDoc(eventRef, { participants: arrayRemove(userId) });
                const freshSnap = await getDoc(eventRef);
                updatedEventData = { participants: freshSnap.data()?.participants || [] };
            }
             dispatch('updateLocalEvent', { id: eventId, changes: updatedEventData });
             console.log(`User ${userId} successfully left event ${eventId}.`);
        } catch (error) { console.error(`Error leaving event ${eventId}:`, error); throw error; }
    },

    // --- REVERTED addTeamToEvent ---
    async addTeamToEvent({ dispatch, rootGetters }, { eventId, teamName, members }) {
        const eventRef = doc(db, 'events', eventId);
        try {
            const eventSnap = await getDoc(eventRef);
            if (!eventSnap.exists()) throw new Error('Event not found.');
            const eventData = eventSnap.data();

            // Permission Check: Admin OR any Organizer
            const currentUser = rootGetters['user/getUser'];
            const isAdmin = currentUser?.role === 'Admin';
            const isOrganizer = (eventData.organizers || []).includes(currentUser?.uid);
            if (!isAdmin && !isOrganizer) throw new Error("Permission denied to manage teams for this event.");

            if (!['Pending', 'Approved'].includes(eventData.status)) {
                throw new Error(`Cannot add teams to event with status '${eventData.status}'. Allowed only for 'Pending' or 'Approved'.`);
            }
            if (!eventData.isTeamEvent) throw new Error("Cannot add teams: This is not a team event.");
            // Validation ...
            const trimmedTeamName = teamName?.trim();
            if (!trimmedTeamName) throw new Error("Team name cannot be empty.");
            const currentTeams = eventData.teams || [];
            if (currentTeams.some(t => t.teamName.toLowerCase() === trimmedTeamName.toLowerCase())) throw new Error(`A team named "${trimmedTeamName}" already exists.`);
            if (!Array.isArray(members) || members.length === 0) throw new Error("A team must have at least one member.");
            const assignedStudents = new Set(currentTeams.flatMap(t => t.members || []));
            const alreadyAssigned = members.filter(m => assignedStudents.has(m));
            if (alreadyAssigned.length > 0) {
                throw new Error(`Cannot add team: The following students are already in other teams: ${alreadyAssigned.join(', ')}`);
            }
            const newTeam = {
                teamName: trimmedTeamName,
                members: members,
                submissions: [],
                ratings: []
            };
            await updateDoc(eventRef, { teams: arrayUnion(newTeam) });
            const freshSnap = await getDoc(eventRef);
            const updatedTeamsArray = freshSnap.data()?.teams || [];
            dispatch('updateLocalEvent', { id: eventId, changes: { teams: updatedTeamsArray } });
            console.log(`Team "${trimmedTeamName}" added successfully to event ${eventId}.`);
            return newTeam;
        } catch (error) {
            console.error(`Error adding team to event ${eventId}:`, error);
            throw error;
        }
    },

    // --- REVERTED updateEventDetails ---
    async updateEventDetails({ dispatch, rootGetters }, { eventId, updates }) {
        const eventRef = doc(db, 'events', eventId);
        try {
            const eventSnap = await getDoc(eventRef);
            if (!eventSnap.exists()) throw new Error('Event not found.');
            const eventData = eventSnap.data();

            // Permission Check: Admin, any Organizer, OR Requester if Pending
            const currentUser = rootGetters['user/getUser'];
            const isAdmin = currentUser?.role === 'Admin';
            const isOrganizer = Array.isArray(eventData.organizers) && eventData.organizers.includes(currentUser?.uid);
            const isRequester = eventData.requester === currentUser?.uid;

            let canEdit = false;
            // Admins can edit pending/approved
            if (isAdmin && ['Pending', 'Approved'].includes(eventData.status)) {
                canEdit = true;
            }
            // Organizers can edit pending/approved (but not change organizers field itself unless Admin)
            else if (isOrganizer && ['Pending', 'Approved'].includes(eventData.status)) {
                 if (!isAdmin && updates.hasOwnProperty('organizers')) {
                    throw new Error("Only Admins can change the list of organizers.");
                 }
                canEdit = true;
            }
            // Requester can edit their own pending request (but not organizers field unless Admin)
            else if (isRequester && eventData.status === 'Pending') {
                 if (updates.hasOwnProperty('organizers')) {
                     if(!isAdmin) throw new Error("Cannot change organizers on a pending request.");
                 }
                 canEdit = true;
            }

            if (!canEdit) {
                 throw new Error(`Permission denied to edit event details (Status: ${eventData.status}).`);
            }

             // Filter and Validate Updates
             const allowedUpdates = {};
             const generallyEditableFields = ['description', /*'ratingCriteria', REMOVED */ 'xpAllocation', 'isTeamEvent'];
             const pendingOnlyEditableFields = ['eventName', 'eventType', 'desiredStartDate', 'desiredEndDate'];
             const adminOnlyEditableFields = ['startDate', 'endDate', 'organizers']; // Admins can manage all organizers

             for (const key in updates) {
                 if (generallyEditableFields.includes(key)) {
                    // if (key === 'ratingCriteria' && !Array.isArray(updates[key])) continue; // Removed
                    if (key === 'xpAllocation' && !Array.isArray(updates[key])) continue;
                    allowedUpdates[key] = updates[key];
                 } else if (eventData.status === 'Pending' && pendingOnlyEditableFields.includes(key)) {
                      // ... (pending field handling remains the same) ...
                      allowedUpdates[key] = updates[key]; // Simplified example
                 } else if (isAdmin && adminOnlyEditableFields.includes(key) && ['Pending', 'Approved'].includes(eventData.status)) {
                     if (key === 'startDate' || key === 'endDate') {
                         // ... (date handling remains the same) ...
                         allowedUpdates[key] = Timestamp.fromDate(dateVal);
                     } else if (key === 'organizers') {
                         const newOrganizers = Array.isArray(updates[key]) ? updates[key] : [];
                         if (newOrganizers.length === 0) {
                             throw new Error("Organizers list cannot be empty.");
                         }
                         if (newOrganizers.length > 5) {
                              throw new Error("Cannot have more than 5 organizers.");
                         }
                         await validateOrganizersNotAdmin(newOrganizers);
                         allowedUpdates[key] = newOrganizers;
                     }
                 }
                 else if (key === 'teams' && eventData.isTeamEvent && Array.isArray(updates.teams)) {
                      // ... (team update handling remains the same) ...
                 }
             }

             // ... (date validation remains the same) ...

             // Perform update
             if (Object.keys(allowedUpdates).length > 0) {
                allowedUpdates.lastUpdatedAt = Timestamp.now();
                await updateDoc(eventRef, allowedUpdates);
                dispatch('updateLocalEvent', { id: eventId, changes: allowedUpdates });
                console.log(`Event ${eventId} details updated successfully:`, Object.keys(allowedUpdates));
             } else {
                console.log(`No valid or changed fields provided for updating event ${eventId}.`);
             }

        } catch (error) {
            console.error(`Error updating event details for ${eventId}:`, error);
            throw error;
        }
     },

    // --- REVERTED autoGenerateTeams ---
    async autoGenerateTeams({ dispatch, rootGetters }, { eventId, generationType, value }) {
        const eventRef = doc(db, 'events', eventId);
        try {
            const eventSnap = await getDoc(eventRef);
            if (!eventSnap.exists()) throw new Error('Event not found.');
            const eventData = eventSnap.data();

            // Permission Check: Admin OR any Organizer
            const currentUser = rootGetters['user/getUser'];
            const isAdmin = currentUser?.role === 'Admin';
            const isOrganizer = (eventData.organizers || []).includes(currentUser?.uid);
            if (!isAdmin && !isOrganizer) throw new Error("Permission denied to manage teams for this event.");

            if (!['Pending', 'Approved'].includes(eventData.status)) {
                throw new Error(`Cannot generate teams for event with status '${eventData.status}'. Allowed only for 'Pending' or 'Approved'.`);
            }
            if (!eventData.isTeamEvent) throw new Error("Cannot generate teams: This is not a team event.");
            // ... (rest of generation logic remains unchanged) ...
            const allStudents = await dispatch('user/fetchAllStudents', null, { root: true });
            // ... check students, shuffle, divide ...
            const newTeams = [ /* ... */ ];
            await updateDoc(eventRef, { teams: newTeams });
            dispatch('updateLocalEvent', { id: eventId, changes: { teams: newTeams } });
            console.log(`Teams auto-generated successfully for event ${eventId}. ${newTeams.length} teams created.`);
            return newTeams;
        } catch (error) {
            console.error(`Error auto-generating teams for event ${eventId}:`, error);
            throw error;
        }
    },

    // --- updateLocalEvent --- (Unchanged)
    updateLocalEvent({ commit }, { id, changes }) {
        commit('addOrUpdateEvent', { id, ...changes });
        commit('updateCurrentEventDetails', { id, changes });
    },

    // --- handleFirestoreError --- (Unchanged)
    async handleFirestoreError({ commit }, error) {
        console.error('Firestore operation failed:', error);
        if (error.code === 'permission-denied') {
            throw new Error('You do not have permission to perform this operation.');
        }
        if (error.code === 'unavailable' || error.code === 'failed-precondition') {
            try {
                await disableNetwork(db);
                await enableNetwork(db);
            } catch (reconnectError) {
                console.error('Reconnection attempt failed:', reconnectError);
            }
            throw new Error('Connection issue detected. Please check your internet connection.');
        }
        throw error;
    },

    // Submit rating scores (for teams) or winner selections (for individuals)
    // Removed participantId from destructuring as it's not needed for winner selection payload
    async submitRating({ rootGetters, dispatch }, { eventId, ratingType, selections, teamId }) {
        // Correctly get the user ID from the 'getUser' getter
        const userId = rootGetters['user/getUser']?.uid; // Use optional chaining for safety
        if (!userId) throw new Error('User must be logged in to submit ratings.');

        const eventRef = doc(db, 'events', eventId);

        try {
            const eventSnap = await getDoc(eventRef);
            if (!eventSnap.exists()) throw new Error('Event not found.');
            const eventData = eventSnap.data();

            if (eventData.status !== 'Completed') throw new Error('Ratings can only be submitted for completed events.');
            if (!eventData.ratingsOpen) throw new Error('Ratings are currently closed for this event.');

            // Validate selections format (basic check)
            if (!selections || typeof selections !== 'object' || Object.keys(selections).length === 0) {
                throw new Error('Invalid rating/selection data provided.');
            }

            const updates = {};
            const now = Timestamp.now();

            if (ratingType === 'team') {
                if (!teamId) throw new Error('Team ID is missing for team rating.');
                
                const teams = Array.isArray(eventData.teams) ? [...eventData.teams] : [];
                // Find team by name (adjust if using unique IDs later)
                const teamIndex = teams.findIndex(t => t.teamName === teamId); 
                if (teamIndex === -1) throw new Error(`Team with ID/Name '${teamId}' not found in this event.`);

                // Ensure ratings array exists and filter previous ratings by this user
                const existingTeamRatings = Array.isArray(teams[teamIndex].ratings) ? teams[teamIndex].ratings : [];
                const updatedTeamRatings = existingTeamRatings.filter(r => r.ratedBy !== userId);

                // Add the new rating scores
                const newRatingScores = {};
                for (const key in selections) {
                    if (selections[key]?.score !== undefined) {
                        newRatingScores[key] = Number(selections[key].score);
                    }
                }

                updatedTeamRatings.push({
                    ratedBy: userId,
                    ratedAt: now,
                    scores: newRatingScores // Use the processed scores
                });

                teams[teamIndex].ratings = updatedTeamRatings;
                updates.teams = teams;

            } else if (ratingType === 'individual') {
                // Removed the check for participantId as it's no longer passed or needed for winner selection logic
                // if (!participantId) {
                //     console.warn('Participant ID missing for individual rating submission, proceeding without it for winner selection.');
                // }
                
                // Process selections to update winnersPerRole
                const newWinnersPerRole = { ...(eventData.winnersPerRole || {}) };
                const criteria = eventData.xpAllocation || [];
                let changesMade = false;
                
                for (const constraintKey in selections) {
                    const winnerId = selections[constraintKey]?.winnerId;
                    if (winnerId && typeof winnerId === 'string' && winnerId.trim() !== '') {
                        const constraintIndex = parseInt(constraintKey.replace('constraint', ''), 10);
                        const criterion = criteria.find(c => c.constraintIndex === constraintIndex);
                        if (criterion) {
                            const role = criterion.role || 'general'; 
                            // Overwrite or set the winner for this role/criterion
                            if (!newWinnersPerRole[role] || newWinnersPerRole[role][0] !== winnerId) {
                                newWinnersPerRole[role] = [winnerId]; // Store as an array
                                changesMade = true;
                            }
                        }
                    } else {
                         // Handle cases where a winner might be removed/unselected (if applicable)
                         // For now, we only add/overwrite based on valid selections.
                    }
                }
                 if (changesMade) {
                     updates.winnersPerRole = newWinnersPerRole;
                 }

                // Record the submission act itself
                const existingEventRatings = Array.isArray(eventData.ratings) ? eventData.ratings : [];
                const updatedEventRatings = existingEventRatings.filter(r => r.ratedBy !== userId || r.type !== 'winner_selection'); // Remove previous selection by this user
                updatedEventRatings.push({
                    ratedBy: userId,
                    ratedAt: now,
                    type: 'winner_selection' 
                });
                updates.ratings = updatedEventRatings;

            } else {
                throw new Error(`Invalid rating type: ${ratingType}`);
            }

             // Only update if there are actual changes
             if (Object.keys(updates).length > 0) {
                await updateDoc(eventRef, updates);
                dispatch('updateLocalEvent', { id: eventId, changes: updates });
             } else {
                 console.log("No changes detected in rating submission.");
             }

        } catch (error) {
            console.error('Error submitting rating:', error);
            throw error; 
        }
    },

    // --- NEW: Submit a rating for the event organization ---
    async submitOrganizationRating({ rootGetters, dispatch }, { eventId, score }) {
        const userId = rootGetters['user/getUser']?.uid;
        if (!userId) throw new Error('User must be logged in to rate organization.');

        const numericScore = Number(score);
        if (isNaN(numericScore) || numericScore < 0 || numericScore > 5) { // Assuming 0-5 or 1-5 scale
            throw new Error('Invalid rating score provided. Must be a number between 0 and 5.');
        }

        const eventRef = doc(db, 'events', eventId);
        try {
            const eventSnap = await getDoc(eventRef);
            if (!eventSnap.exists()) throw new Error('Event not found.');
            const eventData = eventSnap.data();

            if (eventData.status !== 'Completed') throw new Error('Organization can only be rated for completed events.');

            // **Permission Check (Example: Allow only participants to rate organization)**
            let isParticipant = false;
            if (eventData.isTeamEvent && Array.isArray(eventData.teams)) {
                isParticipant = eventData.teams.some(team => team.members?.includes(userId));
            } else if (!eventData.isTeamEvent && Array.isArray(eventData.participants)) {
                isParticipant = eventData.participants.includes(userId);
            }
            if (!isParticipant) {
                // Alternatively, could allow admins too, or check if already rated by this user
                throw new Error('Only event participants can rate the organization.');
            }
            // ** End Permission Check Example **

            // We'll store simple scores in the array. Add checks if user can rate multiple times?
            // For simplicity now, we just add the score using arrayUnion.
            // A more robust approach might store objects { ratedBy: userId, score: numericScore, ratedAt: now }
            // and filter before adding, similar to other ratings.
            await updateDoc(eventRef, {
                organizationRatings: arrayUnion(numericScore)
            });

            // Fetch updated data to update local state
            const freshSnap = await getDoc(eventRef);
            const updatedRatings = freshSnap.data()?.organizationRatings || [];
            dispatch('updateLocalEvent', { id: eventId, changes: { organizationRatings: updatedRatings } });

            console.log(`Organization rating (${numericScore}) submitted for event ${eventId} by user ${userId}.`);

        } catch (error) {
            console.error(`Error submitting organization rating for event ${eventId}:`, error);
            throw error;
        }
    },
};
