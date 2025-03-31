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
    increment // Import increment for ratingsOpenCount
} from 'firebase/firestore';
import { mapEventDataToFirestore } from '@/utils/eventDataMapper'; // Corrected import path

// Helper function to check if any provided UID belongs to an Admin
async function validateOrganizersNotAdmin(organizerId, coOrganizerIds = []) {
    const userIdsToCheck = new Set([organizerId, ...coOrganizerIds].filter(Boolean)); // Filter out null/undefined/empty IDs
    if (userIdsToCheck.size === 0) return; // No organizers to check

    const fetchPromises = Array.from(userIdsToCheck).map(async (uid) => {
        try {
            const userDocRef = doc(db, 'users', uid);
            const docSnap = await getDoc(userDocRef);
            if (docSnap.exists() && docSnap.data().role === 'Admin') {
                // Fetch the admin's name for a more informative error message if possible
                const adminName = docSnap.data().name || uid;
                throw new Error(`User '${adminName}' (Admin) cannot be assigned as an organizer or co-organizer.`);
            }
            // Optional: Check if user exists? Or let Firestore handle it?
            // if (!docSnap.exists()) {
            //     throw new Error(`User with ID ${uid} not found.`);
            // }
        } catch (error) {
            // Re-throw specific admin error or a general fetch error
            if (error.message.includes('cannot be assigned')) throw error;
            console.error(`Error fetching user role for ${uid}:`, error);
            throw new Error(`Failed to verify role for user ${uid}.`);
        }
    });

    await Promise.all(fetchPromises); // Will throw if any promise rejects
}


export const eventActions = {
    async checkExistingRequests({ rootGetters }) {
        const currentUser = rootGetters['user/getUser'];
        if (!currentUser || !currentUser.uid) return false;
        const q = query(
            collection(db, 'events'),
            where('requester', '==', currentUser.uid),
            where('status', 'in', ['Pending', 'Approved', 'InProgress']) // Check active/pending
        );
        const querySnapshot = await getDocs(q);
        return !querySnapshot.empty;
    },

    async checkDateConflict(_, { startDate, endDate }) {
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

    // --- UPDATED createEvent ACTION ---
    async createEvent({ rootGetters, commit, dispatch }, eventData) {
        try {
            const currentUser = rootGetters['user/getUser'];
            // 1. Authorization Check
            if (currentUser?.role !== 'Admin') { // Correct check
                throw new Error('Unauthorized: Only Admins can create events directly.');
            }

            // 2. Prepare Base Data (Assume eventData comes from RequestEvent.vue)
             // Ensure dates are Date objects before mapping
             let startDateObj, endDateObj;
             try {
                 startDateObj = eventData.startDate instanceof Date ? eventData.startDate : new Date(eventData.startDate);
                 endDateObj = eventData.endDate instanceof Date ? eventData.endDate : new Date(eventData.endDate);
                 if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) throw new Error("Invalid date objects.");
             } catch (e) { throw new Error("Invalid date format for creation."); }

             // Map base data using the mapper (handles Timestamp conversion etc.)
            const mappedData = mapEventDataToFirestore({
                ...eventData,
                 startDate: startDateObj, // Pass Date objects to mapper
                 endDate: endDateObj,
                 organizer: currentUser.uid, // Admin is the organizer
                 requester: currentUser.uid, // Admin is also the requester
            });

            // 3. Explicitly Set Status to Approved for Admin creation
            mappedData.status = 'Approved';

            // 4. Date Validation (Range Check - Mapper handles format)
            if (!mappedData.startDate || !mappedData.endDate) {
                 throw new Error("Admin event creation requires valid start and end dates.");
            }
             // Allow same day, check if start is strictly after end
             if (mappedData.startDate.toMillis() > mappedData.endDate.toMillis()) {
                throw new Error("End date cannot be earlier than the start date.");
             }

            // 5. *** DATE CONFLICT CHECK ***
            const conflictingEvent = await dispatch('checkDateConflict', {
                startDate: mappedData.startDate.toDate(), // Pass Date objects
                endDate: mappedData.endDate.toDate()
            });
            if (conflictingEvent) {
                // Provide specific error message for the UI
                throw new Error(
                    `Creation failed: Date conflict with event "${conflictingEvent.eventName}" . Please choose different dates.`
                );
            }

            // 6. Initialize Arrays and Participants/Teams
            mappedData.ratingsOpen = false; // Ensure ratings start closed
            mappedData.winnersPerRole = {}; // Initialize empty winners map
            mappedData.submissions = Array.isArray(mappedData.submissions) ? mappedData.submissions : [];
            mappedData.ratings = Array.isArray(mappedData.ratings) ? mappedData.ratings : [];
            mappedData.coOrganizers = Array.isArray(mappedData.coOrganizers) ? mappedData.coOrganizers : [];
            mappedData.xpAllocation = Array.isArray(mappedData.xpAllocation) ? mappedData.xpAllocation : [];
            mappedData.ratingCriteria = Array.isArray(mappedData.ratingCriteria) ? mappedData.ratingCriteria : []; // Use ratingCriteria
            // Initialize new fields for rating control
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
                mappedData.participants = []; // Clear participants if team event
            } else {
                // Individual Event: Auto-add all students
                 const studentUIDs = await dispatch('user/fetchAllStudentUIDs', null, { root: true });
                 mappedData.participants = studentUIDs || [];
                 delete mappedData.teams; // Remove teams field
            }

            // *** Validate Co-organizer Limit & Roles ***
            if (mappedData.coOrganizers.length > 5) {
                throw new Error("Cannot have more than 5 co-organizers.");
            }
            // Ensure organizer and co-organizers are not Admins
            await validateOrganizersNotAdmin(mappedData.organizer, mappedData.coOrganizers);

            // 7. Add to Firestore
            const docRef = await addDoc(collection(db, 'events'), mappedData);

            // 8. Update Vuex State
            commit('addOrUpdateEvent', { id: docRef.id, ...mappedData });

            return docRef.id;
        } catch (error) {
            console.error('Error creating event:', error);
            // Re-throw specific conflict error or a general one
            if (error.message.startsWith('Creation failed: Date conflict')) {
                 throw error; // Pass the specific message up
            }
            throw new Error(`Failed to create event: ${error.message || 'Unknown error'}`);
        }
    },

    // --- UPDATED requestEvent ACTION ---
    async requestEvent({ dispatch, rootGetters, commit }, eventData) {
        try {
            const currentUser = rootGetters['user/getUser'];
            const userId = currentUser?.uid;
            if (!userId) { throw new Error("User not authenticated."); }

            // Prevent non-admins from submitting multiple active/pending requests
            if (currentUser.role !== 'Admin') {
                 const hasActive = await dispatch('checkExistingRequests');
                 if (hasActive) { throw new Error('You already have an active or pending event request.'); }
            }

             // Validate desired dates
             let desiredStartDateObj, desiredEndDateObj;
             try {
                 desiredStartDateObj = eventData.desiredStartDate instanceof Date ? eventData.desiredStartDate : new Date(eventData.desiredStartDate);
                 desiredEndDateObj = eventData.desiredEndDate instanceof Date ? eventData.desiredEndDate : new Date(eventData.desiredEndDate);
                 if (isNaN(desiredStartDateObj.getTime()) || isNaN(desiredEndDateObj.getTime())) throw new Error("Invalid desired date format.");
                 // Allow same day
                 if (desiredStartDateObj > desiredEndDateObj) throw new Error("Desired end date cannot be earlier than desired start date.");
             } catch (e) { throw new Error(e.message || "Invalid date format."); }

            // Prepare data specifically for a REQUEST
            const requestData = {
                eventName: eventData.eventName || 'Unnamed Request',
                eventType: eventData.eventType || 'Other',
                description: eventData.description || '',
                isTeamEvent: !!eventData.isTeamEvent,
                requester: userId, // User making the request
                organizer: userId, // Default organizer is the requester initially
                coOrganizers: Array.isArray(eventData.coOrganizers) ? eventData.coOrganizers : [],
                ratingCriteria: Array.isArray(eventData.ratingCriteria) ? eventData.ratingCriteria : [], // Use ratingCriteria
                xpAllocation: Array.isArray(eventData.xpAllocation) ? eventData.xpAllocation : [],
                // --- Request Specific Fields ---
                status: 'Pending', // *** Explicitly Pending ***
                desiredStartDate: Timestamp.fromDate(desiredStartDateObj),
                desiredEndDate: Timestamp.fromDate(desiredEndDateObj),
                startDate: null, // Actual dates are null until approved
                endDate: null,
                // --- Initial empty/default fields ---
                ratingsOpen: false,
                winnersPerRole: {},
                participants: [],
                submissions: [],
                ratings: [],
                createdAt: Timestamp.now(),
                teams: [], // Initialize empty, populate below if team event
                // Initialize new fields for rating control
                completedAt: null,
                ratingsLastOpenedAt: null,
                ratingsOpenCount: 0,
            };

            // If team event, structure the requested teams
            if (requestData.isTeamEvent) {
                 requestData.teams = (Array.isArray(eventData.teams) ? eventData.teams : []).map(team => ({
                     teamName: team.teamName || 'Unnamed Team',
                     members: Array.isArray(team.members) ? team.members : [],
                     submissions: [], // Initialize empty
                     ratings: []      // Initialize empty
                 }));
            }

            // *** Validate Co-organizer Limit & Roles ***
            if (requestData.coOrganizers.length > 5) {
                throw new Error("Cannot have more than 5 co-organizers.");
            }
            // Ensure organizer (requester initially) and co-organizers are not Admins
            await validateOrganizersNotAdmin(requestData.organizer, requestData.coOrganizers);

            // Add to Firestore
            const docRef = await addDoc(collection(db, 'events'), requestData);

            // Update Vuex State
            commit('addOrUpdateEvent', { id: docRef.id, ...requestData });

            return docRef.id;
        } catch (error) {
            console.error('Error requesting event:', error);
            throw error; // Re-throw for component handling
        }
    },

    // --- VERIFY approveEventRequest ---
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
                 // Allow same day check
                 if (reqStartDate > reqEndDate) { throw new Error("End date cannot be earlier than start date in request."); }

            } catch (dateError) {
                throw new Error(`Failed to process event dates: ${dateError.message}`);
            }

            // *** RE-CHECK FOR CONFLICT ON APPROVAL *** (Crucial)
            const conflictingEvent = await dispatch('checkDateConflict', {
                startDate: reqStartDate,
                endDate: reqEndDate
            });
            if (conflictingEvent) {
                throw new Error(
                    `Approval failed: Date conflict with "${conflictingEvent.eventName}". Adjust dates via edit or reject.`
                );
            }

            // Prepare updates
            const updates = {
                status: 'Approved',
                startDate: eventData.desiredStartDate, // Set actual dates from desired
                endDate: eventData.desiredEndDate,
                participants: [], // Reset participants, populate below if needed
                teams: [] // Reset teams, populate below if needed
            };

            // Handle participants/teams on approval
            if (!eventData.isTeamEvent) {
                // Add all students for individual events upon approval
                const studentUIDs = await dispatch('user/fetchAllStudentUIDs', null, { root: true });
                updates.participants = studentUIDs || [];
            } else {
                // Ensure teams from request are carried over and structured correctly
                updates.teams = (Array.isArray(eventData.teams) ? eventData.teams : []).map(team => ({
                    teamName: team.teamName || 'Unnamed Team',
                    members: Array.isArray(team.members) ? team.members : [],
                    submissions: [], // Ensure initialized
                    ratings: []      // Ensure initialized
                }));
                 if (updates.teams.length === 0) {
                     console.warn(`Approving team event ${eventId} with no teams defined in the request.`);
                 }
            }

            await updateDoc(eventRef, updates);
            // Update local state with all changes
            dispatch('updateLocalEvent', { id: eventId, changes: { ...eventData, ...updates } }); // Merge original data + updates

        } catch (error) {
            console.error(`Error approving event request ${eventId}:`, error);
            throw error;
        }
    },

    // Modified to accept and store rejection reason
    async rejectEventRequest({ commit, rootGetters, dispatch }, { eventId, reason }) {
        // Permission check: Only Admins
        const currentUser = rootGetters['user/getUser'];
        if (currentUser?.role !== 'Admin') { throw new Error('Unauthorized: Only Admins can reject requests.'); }

        try {
            const eventRef = doc(db, 'events', eventId);
            const updates = {
                status: 'Rejected',
                rejectionReason: reason || null // Store the reason, or null if not provided
            };

            await updateDoc(eventRef, updates);

            // Use the helper to update local state consistently
            dispatch('updateLocalEvent', { id: eventId, changes: updates });

        } catch (error) {
            console.error(`Error rejecting event request ${eventId}: `, error);
            throw error; // Re-throw for component handling
        }
    },

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

    async updateEventStatus({ dispatch, rootGetters }, { eventId, newStatus }) {
        // Update valid statuses to match the actual status values used
        const validStatuses = ['Approved', 'In Progress', 'Completed', 'Cancelled'];
        if (!validStatuses.includes(newStatus)) {
            throw new Error(`Invalid status: ${newStatus}. Valid statuses are: ${validStatuses.join(', ')}`);
        }

        // Fix status value for 'In Progress' to match the database format
        const statusToSet = newStatus === 'In Progress' ? 'InProgress' : newStatus;

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
            const updates = { status: statusToSet };

            switch (newStatus) {
                case 'In Progress':
                    if (currentEvent.status !== 'Approved') throw new Error("Event must be 'Approved' to be marked 'In Progress'.");
                    updates.ratingsOpen = false; // Ensure ratings are closed when starting/re-starting
                    break;

                case 'Completed':
                    if (currentEvent.status !== 'InProgress') throw new Error("Event must be 'In Progress' to be marked 'Completed'.");
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

    // --- NEW: toggleRatingsOpen with time/count limits ---
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
            if (currentEvent.status !== 'Completed') {
                throw new Error("Ratings can only be toggled for completed events.");
            }

            const updates = {};
            const now = Timestamp.now();
            const ratingsOpenCount = currentEvent.ratingsOpenCount || 0;

            if (isOpen) { // Trying to OPEN ratings
                // Check count limit
                if (ratingsOpenCount >= 2) {
                    throw new Error("Rating period can only be opened a maximum of two times.");
                }
                // Check if completedAt exists
                if (!currentEvent.completedAt) {
                    throw new Error("Cannot open ratings: Event completion time is missing.");
                }
                // Check 30-minute delay
                const completedTime = currentEvent.completedAt.toMillis();
                const thirtyMinutesInMillis = 30 * 60 * 1000;
                if (now.toMillis() < completedTime + thirtyMinutesInMillis) {
                    const waitTime = Math.ceil((completedTime + thirtyMinutesInMillis - now.toMillis()) / (60 * 1000));
                    throw new Error(`Ratings can be opened 30 minutes after completion. Please wait approximately ${waitTime} more minutes.`);
                }
                // All checks passed, prepare updates for opening
                updates.ratingsOpen = true;
                updates.ratingsLastOpenedAt = now;
                updates.ratingsOpenCount = increment(1); // Use Firestore increment

            } else { // Trying to CLOSE ratings
                updates.ratingsOpen = false;
                // No need to update count or last opened time when closing
            }

            await updateDoc(eventRef, updates);
            dispatch('updateLocalEvent', { id: eventId, changes: updates }); // Update local cache

        } catch (error) {
            console.error(`Error toggling ratings for event ${eventId}:`, error);
            throw error; // Re-throw for component handling
        }
    },


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

     async calculateWinnersAuto({ dispatch, state, getters }, eventId) { // Added getters
        console.log(`Attempting auto-calculation of winners per role for event: ${eventId}`);
        try {
            // Ensure we have the latest event data
            // Prefer using getters to ensure reactivity and consistent data source
            const event = getters.getEventById(eventId) || await dispatch('fetchEventDetails', eventId);

            if (!event) { throw new Error("Event not found."); }
            if (event.status !== 'Completed') { throw new Error("Winner calculation only allowed for 'Completed' events."); }

            // Use xpAllocation from the fetched/current event data
            // Use the getter to ensure consistent formatting and defaults
            const xpAlloc = getters.getEventXPAllocation(eventId); // Use the getter

            if (!Array.isArray(xpAlloc) || xpAlloc.length === 0) {
                throw new Error("Event has no XP allocation defined or allocation is empty.");
            }

            // --- Data Structures ---
            // scoresPerRolePerEntity: { entityId: { roleKey: { totalScore: number, count: number }, ... }, ... }
            // We'll store sum and count to calculate average accurately at the end
            const scoresPerRolePerEntity = {};
            // roleToCriteriaIndices: { roleKey: [index1, index2], ... } - Maps roles to relevant criteria indices
            const roleToCriteriaIndices = {};
            xpAlloc.forEach(alloc => {
               if (alloc.role && alloc.points > 0) { // Only consider roles with points
                   if (!roleToCriteriaIndices[alloc.role]) {
                       roleToCriteriaIndices[alloc.role] = [];
                   }
                   // Store the *constraintIndex* associated with this role
                   roleToCriteriaIndices[alloc.role].push(alloc.constraintIndex);
               }
            });

            // --- Determine Participants or Teams ---
            const participantsOrTeams = event.isTeamEvent
                ? (event.teams || []).map(t => ({
                    id: t.teamName, // Use teamName as the unique entity ID for teams
                    type: 'team',
                    ratings: t.ratings || []
                  }))
                : (event.participants || []).map(pId => ({
                    id: pId, // Use participant UID as the entity ID
                    type: 'individual',
                    // Get ratings specifically for this participant
                    ratings: (event.ratings || []).filter(r => r.ratedTo === pId)
                  }));

            if (participantsOrTeams.length === 0) {
                alert('Winner calculation: No participants or teams found for this event.');
                await dispatch('setWinnersPerRole', { eventId, winnersMap: {} }); // Set empty winners
                return;
            }

            // --- 1. Aggregate Scores Per Role ---
            for (const entity of participantsOrTeams) {
                scoresPerRolePerEntity[entity.id] = {}; // Initialize entity's role scores map

                // Initialize score objects for all roles defined in xpAllocation
                xpAlloc.forEach(alloc => {
                     if (alloc.role && alloc.points > 0) { // Consider only roles with points
                         scoresPerRolePerEntity[entity.id][alloc.role] = { totalScoreSum: 0, ratingCount: 0 };
                     }
                });

                // Iterate through ratings received by this entity
                for (const ratingEntry of entity.ratings) {
                    // Basic validation of the rating structure
                    if (!ratingEntry?.rating || typeof ratingEntry.rating !== 'object' || !ratingEntry.ratedBy) continue;

                    // Iterate through each role defined in xpAllocation
                    for (const roleKey of Object.keys(roleToCriteriaIndices)) {
                        const relevantIndices = roleToCriteriaIndices[roleKey];
                        if (!relevantIndices || relevantIndices.length === 0) continue; // Skip if no criteria for this role

                        let criteriaSumForThisRater = 0;
                        let criteriaCountForThisRater = 0;

                        // Calculate the average score given by *this specific rater* for the criteria linked to the *current role*
                        relevantIndices.forEach(index => {
                            // Rating keys expected as constraint0, constraint1, etc.
                            const constraintKey = `constraint${index}`;
                            const ratingValue = Number(ratingEntry.rating[constraintKey]);

                            if (!isNaN(ratingValue) && ratingValue >= 0) { // Allow 0 as valid? Yes.
                                criteriaSumForThisRater += ratingValue;
                                criteriaCountForThisRater++;
                            }
                        });

                        // If this rater provided scores for at least one relevant criterion for this role
                        if (criteriaCountForThisRater > 0) {
                            const averageScoreFromThisRaterForRole = criteriaSumForThisRater / criteriaCountForThisRater;
                            // Add this rater's average score for the role to the entity's total for that role
                            scoresPerRolePerEntity[entity.id][roleKey].totalScoreSum += averageScoreFromThisRaterForRole;
                            scoresPerRolePerEntity[entity.id][roleKey].ratingCount++;
                        }
                    }
                }
            }
            // console.log("Aggregated Scores Per Role:", JSON.stringify(scoresPerRolePerEntity, null, 2));

            // --- 2. Calculate Average Scores and Determine Winners Per Role ---
            const winnersMap = {}; // { roleKey: [winnerId1, winnerId2], ... }
            let winnersFound = false;

            // Iterate through the roles defined in the allocation again
            xpAlloc.forEach(alloc => {
               const roleKey = alloc.role;
               if (!roleKey || alloc.points <= 0) return; // Skip if no role or no points

               let topAverageScoreForRole = -1;
               let currentWinnersForRole = [];

               participantsOrTeams.forEach(entity => {
                    const roleScoreData = scoresPerRolePerEntity[entity.id]?.[roleKey];
                    let averageScore = 0;
                    if (roleScoreData && roleScoreData.ratingCount > 0) {
                         // Calculate the final average score for this entity for this role
                         averageScore = roleScoreData.totalScoreSum / roleScoreData.ratingCount;
                    }

                    // Determine winner(s) based on average score
                    if (averageScore > topAverageScoreForRole) {
                        topAverageScoreForRole = averageScore;
                        currentWinnersForRole = [entity.id]; // New top score, reset winners
                    } else if (averageScore === topAverageScoreForRole && topAverageScoreForRole >= 0) { // Tie for top score (allow 0?)
                        // Ensure we don't add if the top score is effectively zero or negative
                         if (topAverageScoreForRole > 0 || (topAverageScoreForRole === 0 && currentWinnersForRole.length > 0)) {
                             currentWinnersForRole.push(entity.id);
                         }
                    }
               });

               // Store the winners for this role if a positive top score was found
               if (topAverageScoreForRole >= 0 && currentWinnersForRole.length > 0) { // Allow 0 score winners if tied? Yes.
                   winnersMap[roleKey] = currentWinnersForRole.sort(); // Store sorted list of winner IDs (participant UID or team name)
                   if (topAverageScoreForRole > 0) winnersFound = true; // Only set true if score > 0? Or if any winner found? Let's say if any found.
                   winnersFound = true;
               } else {
                   winnersMap[roleKey] = []; // No winner found (or all scores were effectively negative/NaN)
               }
            });
            // console.log("Determined Winners Map:", JSON.stringify(winnersMap, null, 2));

            // --- 3. Save the Winners Map ---
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

    async fetchEvents({ commit, dispatch }) {
        try {
            // Consider adding status filters or pagination if list grows very large
            const q = query(collection(db, 'events'), orderBy('createdAt', 'desc'));
            const querySnapshot = await getDocs(q);
            const events = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            commit('setEvents', events);
        } catch (error) {
            await dispatch('handleFirestoreError', error);
            commit('setEvents', []); // Set empty on error
            // Potentially throw error for UI feedback
        }
    },

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
            if (eventData.status !== 'InProgress') { // Corrected status check
                throw new Error("Project submissions are only allowed while the event is 'In Progress'.");
            }

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

    async leaveEvent({ rootGetters, dispatch }, eventId) {
        const eventRef = doc(db, 'events', eventId);
        try {
            const eventSnap = await getDoc(eventRef);
            if (!eventSnap.exists()) throw new Error('Event not found.');
            const eventData = eventSnap.data();
            const userId = rootGetters['user/getUser']?.uid;
            if (!userId) throw new Error("User not authenticated.");

            // State Check: Only allow leaving 'Approved' events (Upcoming is not a standard status here)
            if (eventData.status !== 'Approved') {
                throw new Error(`Cannot leave event with status '${eventData.status}'. Only 'Approved' events can be left before they start.`);
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

            // State & Type Check: Allow adding teams in Pending or Approved
            if (!['Pending', 'Approved'].includes(eventData.status)) {
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
             // Define fields editable ONLY by Admin in Approved state
             const adminOnlyEditableFields = ['startDate', 'endDate']; // Admins can adjust actual dates

             for (const key in updates) {
                 if (generallyEditableFields.includes(key)) {
                     // Add basic validation if necessary (e.g., array type checks)
                     if (key === 'coOrganizers') {
                         if (!Array.isArray(updates[key])) continue; // Skip if not an array
                         // *** Validate Co-organizer Limit & Roles on Update ***
                         if (updates[key].length > 5) {
                             throw new Error("Cannot update to have more than 5 co-organizers.");
                         }
                         // Check roles of the *new* list of co-organizers.
                         // Note: We don't need to re-check the main organizer here as it's not typically updated via this action.
                         await validateOrganizersNotAdmin(null, updates[key]); // Pass null for organizerId as it's not being updated here
                     }
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
                 } else if (isAdmin && adminOnlyEditableFields.includes(key) && ['Pending', 'Approved'].includes(eventData.status)) {
                     // Handle date conversion and validation for actual dates (Admin only)
                     if (key === 'startDate' || key === 'endDate') {
                         try {
                             const dateVal = new Date(updates[key]);
                             if (isNaN(dateVal.getTime())) throw new Error(`Invalid date format for ${key}`);
                             allowedUpdates[key] = Timestamp.fromDate(dateVal);
                         } catch (e) { throw new Error(e.message || `Invalid format for ${key}`); }
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
              let finalStartDate, finalEndDate;
              const startUpdate = allowedUpdates.startDate || (eventData.status === 'Pending' ? allowedUpdates.desiredStartDate : null);
              const endUpdate = allowedUpdates.endDate || (eventData.status === 'Pending' ? allowedUpdates.desiredEndDate : null);

              finalStartDate = startUpdate || eventData.startDate || eventData.desiredStartDate;
              finalEndDate = endUpdate || eventData.endDate || eventData.desiredEndDate;

              if (finalStartDate && finalEndDate) {
                   try {
                       // Convert Timestamps back to Dates for comparison
                       const newStartDate = finalStartDate.toDate ? finalStartDate.toDate() : new Date(finalStartDate);
                       const newEndDate = finalEndDate.toDate ? finalEndDate.toDate() : new Date(finalEndDate);
                       if (isNaN(newStartDate.getTime()) || isNaN(newEndDate.getTime())) throw new Error("Invalid date objects for comparison.");
                       // Allow same day
                       if (newStartDate > newEndDate) {
                           throw new Error("End date cannot be earlier than the start date.");
                       }

                       // Check for date conflict if actual dates of an Approved event are changed
                       if (eventData.status === 'Approved' && (allowedUpdates.startDate || allowedUpdates.endDate)) {
                            const conflict = await dispatch('checkDateConflict', { startDate: newStartDate, endDate: newEndDate });
                            // IMPORTANT: Exclude the current event being edited!
                            if (conflict && conflict.id !== eventId) {
                                throw new Error(`Update failed: Date conflict with event "${conflict.eventName}" (ID: ${conflict.id}).`);
                            }
                       }
                   } catch(dateError) {
                        throw new Error(`Date validation failed: ${dateError.message}`);
                   }
              }

              // Perform update if there are valid changes
              if (Object.keys(allowedUpdates).length > 0) {
                 allowedUpdates.lastUpdatedAt = Timestamp.now(); // Add last updated timestamp
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
     },

    async autoGenerateTeams({ dispatch, rootGetters }, { eventId, generationType, value }) {
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

            // State & Type Check: Allow generation in Pending or Approved
            if (!['Pending', 'Approved'].includes(eventData.status)) {
                throw new Error(`Cannot generate teams for event with status '${eventData.status}'. Allowed only for 'Pending' or 'Approved'.`);
            }
            if (!eventData.isTeamEvent) throw new Error("Cannot generate teams: This is not a team event.");

            // Fetch all students (ensure the user module action exists and returns array of {uid: string, ...})
            const allStudents = await dispatch('user/fetchAllStudents', null, { root: true });
            if (!Array.isArray(allStudents) || allStudents.length === 0) {
                throw new Error("No students found to generate teams from.");
            }

            // Filter students (e.g., exclude non-students if needed, for now use all)
            // const participatingStudents = allStudents.filter(s => s.role === 'Student'); // Example filter
            const studentPool = [...allStudents]; // Use a copy

            if (studentPool.length === 0) {
                 throw new Error("Student pool is empty after filtering.");
            }

            // Shuffle the student pool (Fisher-Yates shuffle)
            for (let i = studentPool.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [studentPool[i], studentPool[j]] = [studentPool[j], studentPool[i]];
            }

            // Divide into teams
            const newTeams = [];
            let teamCounter = 1;

            if (generationType === 'numberOfTeams') {
                if (value < 2 || value > studentPool.length) {
                    throw new Error(`Invalid number of teams requested (${value}). Must be between 2 and ${studentPool.length}.`);
                }
                const baseTeamSize = Math.floor(studentPool.length / value);
                let remainder = studentPool.length % value;
                let currentIndex = 0;

                for (let i = 0; i < value; i++) {
                    const teamSize = baseTeamSize + (remainder > 0 ? 1 : 0);
                    const teamMembers = studentPool.slice(currentIndex, currentIndex + teamSize).map(s => s.uid);
                    newTeams.push({
                        teamName: `Team ${teamCounter++}`,
                        members: teamMembers,
                        submissions: [],
                        ratings: []
                    });
                    currentIndex += teamSize;
                    if (remainder > 0) remainder--;
                }

            } else if (generationType === 'maxMembers') {
                if (value < 1) throw new Error("Max members per team must be at least 1.");
                 // Ensure at least 2 teams are created if possible
                 if (studentPool.length > 1 && Math.ceil(studentPool.length / value) < 2) {
                     throw new Error(`Max members (${value}) results in only 1 team for ${studentPool.length} students. Adjust to create at least 2 teams.`);
                 }

                for (let i = 0; i < studentPool.length; i += value) {
                    const teamMembers = studentPool.slice(i, i + value).map(s => s.uid);
                    newTeams.push({
                        teamName: `Team ${teamCounter++}`,
                        members: teamMembers,
                        submissions: [],
                        ratings: []
                    });
                }
            } else {
                throw new Error("Invalid team generation type specified.");
            }

            // Update Firestore - Replace the entire teams array
            await updateDoc(eventRef, { teams: newTeams });

            // Update local state
            dispatch('updateLocalEvent', { id: eventId, changes: { teams: newTeams } });
            console.log(`Teams auto-generated successfully for event ${eventId}. ${newTeams.length} teams created.`);
            return newTeams; // Return the generated teams

        } catch (error) {
            console.error(`Error auto-generating teams for event ${eventId}:`, error);
            throw error; // Re-throw for component handling
        }
    },

    // Helper action to update local state consistently
    updateLocalEvent({ commit }, { id, changes }) {
        commit('addOrUpdateEvent', { id, ...changes }); // Update the main list
        commit('updateCurrentEventDetails', { id, changes }); // Update the detailed view cache if matching
    },

    async handleFirestoreError({ commit }, error) {
        console.error('Firestore operation failed:', error);

        if (error.code === 'permission-denied') {
            throw new Error('You do not have permission to perform this operation.');
        }

        if (error.code === 'unavailable' || error.code === 'failed-precondition') {
            // Try to reconnect
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

    // Make sure fetchAllStudentUIDs action exists in the user module
    // Example placeholder (should be in user module):
    // async fetchAllStudentUIDs() {
    //     console.warn("fetchAllStudentUIDs should be implemented in the user module");
    //     return []; // Placeholder
    // },
};
