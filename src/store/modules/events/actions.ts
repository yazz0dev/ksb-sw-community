// src/store/modules/events/actions.ts

import { ActionContext, ActionTree } from 'vuex';
import { db } from '@/firebase';
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
    writeBatch,
    DocumentReference,
    DocumentData,
    WriteBatch,
    FirestoreError, // Import FirestoreError for better error handling
} from 'firebase/firestore';
import { mapEventDataToFirestore } from '@/utils/eventDataMapper';
import {
    EventFormat,
    EventStatus,
    EventState,
    Event,
    EventData,
    Team,
    Submission,
    Rating,
    OrganizationRating,
    XPAllocation
} from '@/types/event';
import { RootState } from '@/store/types';
import { User } from '@/types/user';
// validateEventDates, isEventInProgress, canStartEvent, getISTTimestamp were imported but not used
// Let's keep relevant imports if needed elsewhere or potentially used by called functions
// import { validateEventDates, isEventInProgress, canStartEvent, getISTTimestamp } from '@/utils/dateTime';


// --- MODIFIED HELPER: Check if ANY provided UID belongs to an Admin ---
async function validateOrganizersNotAdmin(organizerIds: string[] = []): Promise<void> {
    const userIdsToCheck = new Set(organizerIds.filter(Boolean));
    if (userIdsToCheck.size === 0) return;

    const fetchPromises = Array.from(userIdsToCheck).map(async (uid) => {
        try {
            const userDocRef: DocumentReference<DocumentData> = doc(db, 'users', uid);
            const docSnap = await getDoc(userDocRef);
            if (docSnap.exists() && docSnap.data()?.role === 'Admin') {
                const adminName = docSnap.data()?.name || uid;
                throw new Error(`User '${adminName}' (Admin) cannot be assigned as an organizer.`);
            }
        } catch (error: any) {
            // Rethrow specific validation error
            if (error.message.includes('cannot be assigned')) throw error;
            // Log other errors and throw a generic one
            console.error(`Error fetching user role for ${uid}:`, error);
            throw new Error(`Failed to verify role for user ${uid}.`);
        }
    });
    // Wait for all role checks to complete
    await Promise.all(fetchPromises);
}

// --- Private helper: Calculate XP earned for event participation ---
async function calculateEventXP(eventData: Event): Promise<Record<string, Record<string, number>>> {
    // Type for the XP map: { userId: { roleOrAction: xpAmount } }
    const xpAwardMap: Record<string, Record<string, number>> = {};

    // Initialize XP map for all participants/teams
    const allParticipants = new Set<string>();
    if (eventData.isTeamEvent && Array.isArray(eventData.teams)) {
        eventData.teams.forEach(team => {
            // Ensure members array exists and filter out any falsy values
            (team.members || []).filter(Boolean).forEach(uid => allParticipants.add(uid));
        });
    } else if (Array.isArray(eventData.participants)) {
        // Filter out any falsy values from participants array
        eventData.participants.filter(Boolean).forEach(uid => allParticipants.add(uid));
    }

    // Initialize organizers (they get base XP even if not participating/winning)
    (eventData.organizers || []).filter(Boolean).forEach(uid => {
        // Ensure the user entry exists before adding the role
        if (!xpAwardMap[uid]) xpAwardMap[uid] = {};
        xpAwardMap[uid]['Organizer'] = 50; // Base organizer XP
    });

    // Process winner selections (from winnersPerRole)
    const winners = eventData.winnersPerRole || {};
    for (const [role, winnerIds] of Object.entries(winners)) {
        // Ensure winnerIds is an array before iterating
        if (Array.isArray(winnerIds)) {
            winnerIds.filter(Boolean).forEach(winnerId => {
                if (!xpAwardMap[winnerId]) xpAwardMap[winnerId] = {};
                // Add winner XP to any existing XP for that role (e.g., if also organizer)
                xpAwardMap[winnerId][role] = (xpAwardMap[winnerId][role] || 0) + 100; // Winner XP
            });
        }
    }

    // Process team-based XP (if team event)
    if (eventData.isTeamEvent && Array.isArray(eventData.teams)) {
        eventData.teams.forEach(team => {
            const hasSubmission = Array.isArray(team.submissions) && team.submissions.length > 0;
            // Calculate average rating safely, handling empty scores or ratings array
            const avgTeamRating = (Array.isArray(team.ratings) && team.ratings.length > 0) ?
                team.ratings.reduce((sum, r) => {
                    const scores = r.scores || {};
                    const scoreValues = Object.values(scores).filter(s => typeof s === 'number');
                    const ratingSum = scoreValues.reduce((a, b) => a + b, 0);
                    const ratingCount = scoreValues.length;
                    // Add average score for this rating to the total sum
                    return sum + (ratingCount > 0 ? ratingSum / ratingCount : 0);
                }, 0) / team.ratings.length // Divide total sum by number of ratings
                : 0;

            (team.members || []).filter(Boolean).forEach(memberId => {
                if (!xpAwardMap[memberId]) xpAwardMap[memberId] = {};
                // Grant participation XP based on submission status
                xpAwardMap[memberId]['Participation'] = (xpAwardMap[memberId]['Participation'] || 0) + (hasSubmission ? 30 : 10);
                // Grant team performance XP if average rating is positive
                if (avgTeamRating > 0) {
                    // Ensure TeamPerformance doesn't overwrite existing value if user is in multiple roles
                    xpAwardMap[memberId]['TeamPerformance'] = (xpAwardMap[memberId]['TeamPerformance'] || 0) + Math.round(avgTeamRating * 5);
                }
            });
        });
    } else {
        // Process individual XP (excluding organizers already handled)
        allParticipants.forEach(uid => {
            // Let's simplify: give participation XP regardless, organizer XP is separate bonus
            if (!xpAwardMap[uid]) xpAwardMap[uid] = {};
            xpAwardMap[uid]['Participation'] = (xpAwardMap[uid]['Participation'] || 0) + 20;
        });
    }

    return xpAwardMap;
}


// Interface for the result of the close event action
interface CloseEventResult {
    success: boolean;
    message: string;
    xpAwarded?: Record<string, Record<string, number>>;
}

// --- Internal function for closing event logic ---
async function closeEventPermanentlyInternal(
    context: ActionContext<EventState, RootState>,
    eventId: string
): Promise<CloseEventResult> {
    const { commit, rootGetters } = context;
    const currentUser: User | null = rootGetters['user/getUser'];

    // Authorization check
    if (currentUser?.role !== 'Admin') {
        return { success: false, message: "Unauthorized: Only Admins can permanently close events." };
    }

    if (!eventId) {
        return { success: false, message: "Event ID is required." };
    }

    const eventRef: DocumentReference<DocumentData> = doc(db, 'events', eventId);
    const batch: WriteBatch = writeBatch(db);

    try {
        // Fetch & validate event
        const eventSnap = await getDoc(eventRef);
        if (!eventSnap.exists()) {
            return { success: false, message: "Event not found." };
        }

        // Cast to Event type for type safety
        const eventData = eventSnap.data() as Event;

        // Validation checks
        if (eventData.status !== EventStatus.Completed) {
            return { success: false, message: "Only completed events can be closed permanently." };
        }
        if (eventData.ratingsOpen) {
            return { success: false, message: "Ratings must be closed before the event can be closed permanently." };
        }
        if (eventData.closed) {
            console.warn(`Event ${eventId} is already closed.`);
            return { success: true, message: "Event is already closed." };
        }

        // Calculate XP awards
        const xpAwardMap = await calculateEventXP(eventData);

        // Prepare batch updates for users' XP
        for (const [userId, roleXpMap] of Object.entries(xpAwardMap)) {
            // Ensure user ID is valid before creating ref
            if (!userId) continue;
            const userRef: DocumentReference<DocumentData> = doc(db, 'users', userId);
            for (const [role, amount] of Object.entries(roleXpMap)) {
                // Only update if there's XP to award and role is valid
                if (amount > 0 && role) {
                    batch.update(userRef, {
                        // Use FieldPath notation for potentially nested fields if needed,
                        // but dot notation works for simple cases like xpByRole.RoleName
                        [`xpByRole.${role}`]: increment(amount)
                    });
                }
            }
        }

        // Execute batch update for XP first
        await batch.commit();

        // Mark event as closed in Firestore (only after XP batch succeeds)
        const closedTimestamp = Timestamp.now();
        const eventUpdates: Partial<Event> = {
            closed: true,
            closedAt: closedTimestamp,
            ratingsOpen: false, // Ensure ratings are marked closed
        };
        await updateDoc(eventRef, eventUpdates);

        // Update local Vuex state
        commit('addOrUpdateEvent', { id: eventId, ...eventUpdates });
        // Also update current event details if it's the one being viewed
        commit('updateCurrentEventDetails', { id: eventId, changes: eventUpdates });

        return {
            success: true,
            message: "Event closed successfully and XP awarded.",
            xpAwarded: xpAwardMap
        };

    } catch (error: any) {
        console.error('Error closing event permanently:', error);
        // Provide a more specific error message if available
        const message = error instanceof Error ? error.message : "Failed to close event and award XP. Please try again.";
        // We throw here so the calling component can catch it if needed
        throw new Error(message);
    }
}


// --- Main Vuex Action Definitions ---
export const eventActions: ActionTree<EventState, RootState> = {

    // --- ACTION: Check if current user has existing pending/active requests ---
    async checkExistingRequests({ rootGetters }): Promise<boolean> {
        const currentUser: User | null = rootGetters['user/getUser'];
        if (!currentUser?.uid) return false; // Not logged in or no UID

        const q = query(
            collection(db, 'events'),
            where('requester', '==', currentUser.uid),
            // Check relevant statuses
            where('status', 'in', [EventStatus.Pending, EventStatus.Approved, EventStatus.InProgress])
        );
        const querySnapshot = await getDocs(q);
        return !querySnapshot.empty; // Return true if any matching requests exist
    },

    // --- ACTION: Check for date conflicts with existing events ---
    async checkDateConflict(_, { startDate, endDate, excludeEventId = null }: {
        startDate: Date | string | Timestamp;
        endDate: Date | string | Timestamp;
        excludeEventId?: string | null;
    }): Promise<{ hasConflict: boolean; nextAvailableDate: Date | null; conflictingEvent: Event | null }> {
        let checkStart: Date, checkEnd: Date;
        try {
            // Helper to safely convert input to Date object
            const convertToDate = (d: Date | string | Timestamp): Date => {
                if (d instanceof Timestamp) return d.toDate();
                if (d instanceof Date) return d;
                // Attempt to parse string, will throw error if invalid
                const parsedDate = new Date(d);
                if (isNaN(parsedDate.getTime())) throw new Error(`Invalid date string: ${d}`);
                return parsedDate;
            };
            checkStart = convertToDate(startDate);
            checkEnd = convertToDate(endDate);

            // Use UTC boundaries for day-based comparison
            checkStart.setUTCHours(0, 0, 0, 0);
            checkEnd.setUTCHours(23, 59, 59, 999);

        } catch (e: any) {
            console.error("Date parsing error in checkDateConflict:", e);
            throw new Error(`Invalid date format provided: ${e.message}`);
        }

        // Query events that could potentially conflict (Approved, InProgress)
        const q = query(collection(db, 'events'), where('status', 'in', [EventStatus.Approved, EventStatus.InProgress]));
        const querySnapshot = await getDocs(q);
        let conflictingEvent: Event | null = null;

        for (const docSnap of querySnapshot.docs) {
            // Cast data to Event type
            const event = { id: docSnap.id, ...docSnap.data() } as Event;

            // Skip the event being edited/checked itself
            if (excludeEventId && docSnap.id === excludeEventId) {
                continue;
            }

            // Skip if event doesn't have valid start/end Timestamps
            if (!event.startDate?.seconds || !event.endDate?.seconds) {
                console.warn(`Skipping event ${docSnap.id} in conflict check due to missing dates.`);
                continue;
            }

            try {
                const eventStart = event.startDate.toDate();
                const eventEnd = event.endDate.toDate();
                // Skip if stored dates are somehow invalid
                if (isNaN(eventStart.getTime()) || isNaN(eventEnd.getTime())) {
                    console.warn(`Skipping event ${docSnap.id} in conflict check due to invalid stored dates.`);
                    continue;
                }

                // Use UTC boundaries for comparison consistency
                eventStart.setUTCHours(0, 0, 0, 0);
                eventEnd.setUTCHours(23, 59, 59, 999);

                // Standard overlap check
                if (checkStart <= eventEnd && checkEnd >= eventStart) {
                    conflictingEvent = event;
                    break; // Found a conflict, no need to check further
                }
            } catch (dateError: any) {
                console.warn(`Skipping event ${docSnap.id} in conflict check due to date processing issue:`, dateError.message);
            }
        }

        // Calculate the next available date if a conflict was found
        const nextAvailableDate = conflictingEvent?.endDate
            ? new Date(conflictingEvent.endDate.toDate().getTime() + 24 * 60 * 60 * 1000) // Day after conflict ends
            : null;

        return {
            hasConflict: !!conflictingEvent,
            nextAvailableDate: nextAvailableDate,
            conflictingEvent: conflictingEvent
        };
    },

    // --- ACTION: Create Event (Admin Only) ---
    async createEvent({ rootGetters, commit, dispatch }, eventData: Partial<EventData>): Promise<string> {
        const currentUser: User | null = rootGetters['user/getUser'];
        if (currentUser?.role !== 'Admin') {
            throw new Error('Unauthorized: Only Admins can create events directly.');
        }
        if (!currentUser?.uid) {
            throw new Error('Admin user UID is missing.');
        }

        // Validate and normalize organizers
        const organizers: string[] = Array.isArray(eventData.organizers)
            ? eventData.organizers.filter(Boolean) as string[] // Filter out null/undefined/empty strings
            : [];

        if (organizers.length === 0) {
            throw new Error("At least one organizer is required when an Admin creates an event.");
        }
        if (organizers.length > 5) { // Consistent limit
            throw new Error("Cannot have more than 5 organizers.");
        }
        // Ensure Admin themselves cannot be an organizer
        await validateOrganizersNotAdmin(organizers);

        // Use mapper, ensuring essential fields for Admin creation are present
        const mappedData: EventData = mapEventDataToFirestore({
            ...eventData,
            organizers: organizers,
            requester: currentUser.uid,    // Admin is the requester
            status: EventStatus.Approved, // Directly approved
            createdAt: Timestamp.now(),
            // Determine format based on isTeamEvent flag
            eventFormat: eventData.isTeamEvent ? EventFormat.Team : EventFormat.Individual,
            // Ensure dates are passed correctly (mapper expects Date or Timestamp)
            startDate: eventData.startDate,
            endDate: eventData.endDate,
        });

        // Date validation after mapping (mapper converts to Timestamp)
        if (!mappedData.startDate || !mappedData.endDate) {
            throw new Error("Admin event creation requires valid start and end dates.");
        }
        if (mappedData.startDate.toMillis() >= mappedData.endDate.toMillis()) {
            throw new Error("End date must be on or after the start date.");
        }
        // Optional: Warn if start date is in the past
        if (mappedData.startDate.toMillis() <= Timestamp.now().toMillis()) {
            console.warn("Admin creating event with start date in the past or present.");
        }

        // Check for date conflicts before proceeding
        const conflictResult = await dispatch('checkDateConflict', {
            startDate: mappedData.startDate,
            endDate: mappedData.endDate,
            excludeEventId: null // No event exists yet to exclude
        });
        if (conflictResult.hasConflict) {
            const conflictEventName = conflictResult.conflictingEvent?.eventName || 'another event';
            throw new Error(
                `Creation failed: Date conflict with ${conflictEventName}. Please choose different dates.`
            );
        }

        // Initialize fields for a new approved event
        mappedData.ratingsOpen = false;
        mappedData.closed = false;
        mappedData.winnersPerRole = {};
        mappedData.xpAllocation = Array.isArray(mappedData.xpAllocation) ? mappedData.xpAllocation : [];


        // Setup Participants/Teams
        if (mappedData.isTeamEvent) {
            // Initialize teams array, ensuring structure
            mappedData.teams = Array.isArray(mappedData.teams) ? mappedData.teams.map((t: Partial<Team>) => ({
                teamName: t.teamName?.trim() || 'Unnamed Team',
                members: Array.isArray(t.members) ? t.members.filter(Boolean) as string[] : [],
                submissions: [], // Initialize submissions
                ratings: []      // Initialize ratings
            })) : [];
            mappedData.participants = []; // Clear participants for team events
        } else {
             // Fetch all non-admin, non-organizer student UIDs
             const allStudentUIDs: string[] = await dispatch('user/fetchAllStudentUIDs', null, { root: true }) || [];
             const organizerSet = new Set(organizers);
             // Admins cannot participate, remove them and organizers
             mappedData.participants = allStudentUIDs.filter(uid => uid !== currentUser.uid && !organizerSet.has(uid));
             // Ensure teams field is removed for individual events
             delete mappedData.teams;
        }

        try {
            // Add the event document to Firestore
            const docRef = await addDoc(collection(db, 'events'), mappedData);

            // Update local Vuex state
            commit('addOrUpdateEvent', { id: docRef.id, ...mappedData });

            return docRef.id; // Return the new event ID

        } catch (error: any) {
            console.error('Error creating event in Firestore:', error);
            // Rethrow a user-friendly error
            throw new Error(`Failed to create event: ${error.message || 'Unknown Firestore error'}`);
        }
    },

    // --- ACTION: Request Event (Non-Admin User) ---
    async requestEvent({ commit, rootGetters }, eventData: Partial<EventData>): Promise<string> {
        // Validation for required fields in a request
        if (!eventData.eventName?.trim()) throw new Error('Event Name is required.');
        if (!eventData.desiredStartDate || !eventData.desiredEndDate) {
            throw new Error('Desired start and end dates are required for event requests.');
        }

        const currentUser: User | null = rootGetters['user/getUser'];
        if (!currentUser?.uid) throw new Error('User must be logged in to request events.');
        // Optional: Prevent Admins from using the request flow?
        // if (currentUser.role === 'Admin') throw new Error('Admins should use the Create Event function.');

        try {
            // Prepare data for the request document
            // Use mapper to ensure consistency, then override/add request-specific fields
            const mappedRequestData = mapEventDataToFirestore({
                ...eventData,
                // Dates should be handled by mapper (expecting Date objects)
                desiredStartDate: eventData.desiredStartDate,
                desiredEndDate: eventData.desiredEndDate,
                // Ensure fields irrelevant to requests are not included or are null/empty
                startDate: null,
                endDate: null,
                organizers: [], // Organizers assigned upon approval
                participants: [],
                teams: [],
                status: EventStatus.Pending, // Set status to Pending
                requester: currentUser.uid, // Record who requested it
                createdAt: Timestamp.now(),
                 // Set default format based on isTeamEvent, default to Individual if not provided
                 eventFormat: eventData.isTeamEvent ? EventFormat.Team : EventFormat.Individual,
                 // Initialize other fields to null/default for requests
                 ratingsOpen: false,
                 closed: false,
                 winnersPerRole: {},
                 submissions: [],
                 ratings: [],
                 xpAllocation: Array.isArray(eventData.xpAllocation) ? eventData.xpAllocation : [], // Keep if provided
                 organizationRatings: [],
                 completedAt: null,
                 closedAt: null,
                 ratingsLastOpenedAt: null,
                 ratingsOpenCount: 0,
            });

             // Validate desired dates after mapping
             if (!mappedRequestData.desiredStartDate || !mappedRequestData.desiredEndDate) {
                 throw new Error("Internal error: Desired dates missing after mapping."); // Should not happen if initial validation passes
             }
             if (mappedRequestData.desiredStartDate.toMillis() >= mappedRequestData.desiredEndDate.toMillis()) {
                 throw new Error("Desired end date must be on or after the desired start date.");
             }

            // Add the event request document to Firestore
            const docRef = await addDoc(collection(db, 'events'), mappedRequestData);

            // Update local Vuex state with the new request
            commit('addOrUpdateEvent', { id: docRef.id, ...mappedRequestData });

            return docRef.id; // Return the new request ID

        } catch (error: any) {
            console.error('Error requesting event:', error);
            throw new Error(`Failed to submit event request: ${error.message || 'Unknown error'}`);
        }
    },

    // --- ACTION: Approve Event Request (Admin Only) ---
    async approveEventRequest({ dispatch, commit, rootGetters }, eventId: string): Promise<void> {
        const currentUser: User | null = rootGetters['user/getUser'];
        if (currentUser?.role !== 'Admin') {
            throw new Error('Unauthorized: Only Admins can approve requests.');
        }

        if (!eventId) throw new Error('Event ID is required.');

        const eventRef: DocumentReference<DocumentData> = doc(db, 'events', eventId);

        try {
            const eventSnap = await getDoc(eventRef);
            if (!eventSnap.exists()) throw new Error('Event request not found.');

            const eventData = eventSnap.data() as Event; // Cast to Event

            // Validation checks
            if (eventData.status !== EventStatus.Pending) {
                throw new Error('Only pending events can be approved.');
            }
            if (!eventData.desiredStartDate || !eventData.desiredEndDate) {
                throw new Error("Event request is missing required desired dates for approval.");
            }

            // Convert desired Timestamps to Dates for conflict check
            let reqStartDate: Date, reqEndDate: Date;
            try {
                reqStartDate = eventData.desiredStartDate.toDate();
                reqEndDate = eventData.desiredEndDate.toDate();
                if (isNaN(reqStartDate.getTime()) || isNaN(reqEndDate.getTime())) {
                    throw new Error("Invalid date format stored in event request.");
                }
                 if (reqStartDate > reqEndDate) { // Should be caught on request, but double-check
                     throw new Error("End date cannot be earlier than start date in the request.");
                 }
            } catch (dateError: any) {
                throw new Error(`Failed to process event request dates: ${dateError.message}`);
            }

            // Check for date conflicts using the desired dates
            const conflictResult = await dispatch('checkDateConflict', {
                startDate: reqStartDate,
                endDate: reqEndDate,
                excludeEventId: eventId // Exclude the request itself from the check
            });
            if (conflictResult.hasConflict) {
                const conflictEventName = conflictResult.conflictingEvent?.eventName || 'another event';
                throw new Error(
                    `Approval failed: Date conflict with "${conflictEventName}". Adjust dates via edit or reject.`
                );
            }

            // Prepare updates for approving the event
            const updates: Partial<Event> = {
                status: EventStatus.Approved,
                // Promote desired dates to actual start/end dates
                startDate: eventData.desiredStartDate,
                endDate: eventData.desiredEndDate,
                // Clear desired dates upon approval (optional, but good practice)
                // desiredStartDate: deleteField(), // Requires importing deleteField
                // desiredEndDate: deleteField(),
                // Initialize participants/teams based on event type
                participants: [], // Reset/initialize
                teams: [],        // Reset/initialize
                // Initialize other relevant fields if needed
                organizationRatings: Array.isArray(eventData.organizationRatings) ? eventData.organizationRatings : [], // Keep if set during request
                // Ensure other fields are appropriate for an Approved event
                ratingsOpen: false,
                closed: false,
                completedAt: null,
                closedAt: null,
                 // Assign default organizer(s) if none specified? Or require edit?
                 // For now, let's assume organizers must be added via edit after approval if needed.
                 // organizers: eventData.organizers || [], // Keep if already set? Unlikely for requests.
            };

            // Populate participants or initialize teams based on event type
            if (!eventData.isTeamEvent) {
                // Fetch all student UIDs (excluding admin/requester?)
                 const allStudentUIDs: string[] = await dispatch('user/fetchAllStudentUIDs', null, { root: true }) || [];
                 const requesterUid = eventData.requester; // Requester shouldn't auto-participate
                 // Filter out the requester and potentially the approving admin
                 updates.participants = allStudentUIDs.filter(uid => uid !== requesterUid && uid !== currentUser?.uid);
                 updates.teams = []; // Ensure teams is empty
            } else {
                // For team events, initialize teams array. Teams are usually added/edited after approval.
                 updates.teams = (Array.isArray(eventData.teams) ? eventData.teams : []).map((team: Partial<Team>) => ({
                     teamName: team.teamName?.trim() || 'Unnamed Team',
                     members: Array.isArray(team.members) ? team.members.filter(Boolean) as string[] : [],
                     submissions: [],
                     ratings: []
                 }));
                 // Warn if approving a team event with no predefined teams (common scenario)
                 if (updates.teams.length === 0) {
                     console.warn(`Approving team event ${eventId} with no teams defined in the request. Teams should be added/edited.`);
                 }
                 updates.participants = []; // Ensure participants is empty
            }

            // Apply the updates to Firestore
            await updateDoc(eventRef, updates);

            // Update local state by dispatching to the local update action
            // Construct the full updated event object for the local state
            const updatedEventDataForState = { ...eventData, ...updates };
            dispatch('updateLocalEvent', { id: eventId, changes: updatedEventDataForState });

        } catch (error: any) {
            console.error(`Error approving event request ${eventId}:`, error);
            // Rethrow the error for the UI component to handle
            throw error;
        }
    },

    // --- ACTION: Reject Event Request (Admin Only) ---
    async rejectEventRequest({ commit, rootGetters, dispatch }, { eventId, reason }: { eventId: string; reason?: string }): Promise<void> {
        const currentUser: User | null = rootGetters['user/getUser'];
        if (currentUser?.role !== 'Admin') {
            throw new Error('Unauthorized: Only Admins can reject requests.');
        }

        if (!eventId) throw new Error('Event ID is required.');

        try {
            const eventRef: DocumentReference<DocumentData> = doc(db, 'events', eventId);

            // Fetch to ensure it exists and is pending (optional but safer)
            const eventSnap = await getDoc(eventRef);
            if (!eventSnap.exists()) throw new Error('Event request not found.');
            if (eventSnap.data()?.status !== EventStatus.Pending) {
                 console.warn(`Attempted to reject event ${eventId} which is not in Pending status.`);
                 // Optionally throw error or just proceed if rejection is allowed on other statuses
                 // throw new Error('Only pending events can be rejected.');
            }

            // Prepare updates for rejection
            const updates: Partial<Event> = {
                status: EventStatus.Rejected,
                // Store the rejection reason if provided
                rejectionReason: reason?.trim() || null // Store null if reason is empty/whitespace
            };

            // Apply the updates to Firestore
            await updateDoc(eventRef, updates);

            // Update local state
            dispatch('updateLocalEvent', { id: eventId, changes: updates });

        } catch (error: any) {
            console.error(`Error rejecting event request ${eventId}: `, error);
            throw error; // Rethrow for UI handling
        }
    },

    // --- ACTION: Cancel Event (Admin or Organizer) ---
    async cancelEvent({ dispatch, rootGetters }, eventId: string): Promise<void> {
        if (!eventId) throw new Error('Event ID is required.');

        const eventRef: DocumentReference<DocumentData> = doc(db, 'events', eventId);
        try {
            const eventSnap = await getDoc(eventRef);
            if (!eventSnap.exists()) throw new Error("Event not found.");
            const currentEvent = eventSnap.data() as Event; // Cast to Event

            // Permission Check: Admin OR any listed Organizer
            const currentUser: User | null = rootGetters['user/getUser'];
            const isAdmin = currentUser?.role === 'Admin';
            // Ensure organizers array exists and check for current user's UID
            const isOrganizer = Array.isArray(currentEvent.organizers) && currentEvent.organizers.includes(currentUser?.uid ?? '');

            if (!isAdmin && !isOrganizer) {
                throw new Error("Permission denied: Only Admins or event organizers can cancel this event.");
            }

            // Status Check: Only allow cancelling Approved or InProgress events
            // Use EventStatus enum for comparison
            if (![EventStatus.Approved, EventStatus.InProgress].includes(currentEvent.status)) {
                throw new Error(`Cannot cancel an event with status '${currentEvent.status}'. Consider deleting if Pending/Rejected, or completing/closing if finished.`);
            }

            // Prepare updates for cancellation
            const updates: Partial<Event> = {
                status: EventStatus.Cancelled,
                ratingsOpen: false // Ensure ratings are closed upon cancellation
            };
            await updateDoc(eventRef, updates);

            // Update local state
            dispatch('updateLocalEvent', { id: eventId, changes: updates });

        } catch (error: any) {
            console.error(`Error cancelling event ${eventId}:`, error);
            throw error; // Rethrow for UI handling
        }
    },

     // --- ACTION: Update Event Status (Admin or Organizer) ---
     async updateEventStatus({ dispatch, rootGetters }, { eventId, newStatus }: { eventId: string; newStatus: EventStatus }): Promise<void> {
        // Validate the new status against the EventStatus enum
        const validStatuses = Object.values(EventStatus);
        if (!validStatuses.includes(newStatus)) {
            throw new Error(`Invalid status provided: ${newStatus}.`);
        }
        if (!eventId) throw new Error('Event ID is required.');

        const eventRef: DocumentReference<DocumentData> = doc(db, 'events', eventId);
        try {
            const eventSnap = await getDoc(eventRef);
            if (!eventSnap.exists()) throw new Error("Event not found.");
            const currentEvent = { id: eventSnap.id, ...eventSnap.data() } as Event; // Cast to Event

            // Safely get event dates as Date objects
            let eventStartDate: Date | null = currentEvent.startDate?.toDate() ?? null;
            let eventEndDate: Date | null = currentEvent.endDate?.toDate() ?? null;

            // Permissions Check: Admin OR any listed Organizer
            const currentUser: User | null = rootGetters['user/getUser'];
            const isAdmin = currentUser?.role === 'Admin';
            const isOrganizer = Array.isArray(currentEvent.organizers) && currentEvent.organizers.includes(currentUser?.uid ?? '');

            if (!isAdmin && !isOrganizer) {
                throw new Error("Permission denied: Only Admins or event organizers can update event status.");
            }

            // Prepare updates object
            const updates: Partial<Event> = { status: newStatus };

            // --- Status Transition Logic ---
            switch (newStatus) {
                case EventStatus.InProgress:
                    if (currentEvent.status !== EventStatus.Approved) {
                        throw new Error("Event must be 'Approved' to be marked 'In Progress'.");
                    }
                    // Optional: Check if current time is after start date?
                    updates.ratingsOpen = false; // Ensure ratings are closed when starting
                    break;

                case EventStatus.Completed:
                    if (currentEvent.status !== EventStatus.InProgress) {
                        throw new Error("Event must be 'In Progress' to be marked 'Completed'.");
                    }
                     // Optional: Check if current time is after end date?
                    updates.ratingsOpen = false; // Ensure ratings are closed initially upon completion
                    updates.completedAt = Timestamp.now(); // Record completion time
                    break;

                case EventStatus.Cancelled:
                    // Delegate to the specific cancelEvent action for clarity and permission checks
                    // Note: cancelEvent already handles status checks and updates.
                    // We might need to return early here to avoid duplicate updates.
                    console.log(`Status update to 'Cancelled' requested for ${eventId}, dispatching to cancelEvent.`);
                    // Await the cancel action to ensure it completes before this function potentially continues
                    await dispatch('cancelEvent', eventId);
                    // Return here to prevent the updateDoc call below for cancellation
                    return;

                case EventStatus.Approved:
                    // Re-approving (e.g., after cancellation) should likely be Admin-only
                    if (!isAdmin) {
                        throw new Error("Permission denied: Only Admins can change status back to 'Approved'.");
                    }
                    // Only allow re-approval from 'Cancelled' status? Or maybe 'Rejected'?
                    if (currentEvent.status !== EventStatus.Cancelled) {
                        throw new Error(`Can only re-approve events that are 'Cancelled'. Current status: ${currentEvent.status}.`);
                    }
                    // Ensure dates exist for re-approval
                    if (!eventStartDate || !eventEndDate) {
                        throw new Error("Event start and end dates are missing, cannot re-approve.");
                    }
                    // Check for date conflicts again before re-approving
                    const conflictResult = await dispatch('checkDateConflict', {
                        startDate: eventStartDate,
                        endDate: eventEndDate,
                        excludeEventId: eventId
                    });
                    if (conflictResult.hasConflict) {
                        const conflictEventName = conflictResult.conflictingEvent?.eventName || 'another event';
                        throw new Error(`Cannot re-approve: Date conflict with "${conflictEventName}".`);
                    }
                    // Reset fields that indicate completion/closure
                    updates.completedAt = null;
                    updates.closed = false;
                    updates.closedAt = null;
                    updates.rejectionReason = null; // Clear rejection reason if re-approving
                    break;

                case EventStatus.Pending:
                case EventStatus.Rejected:
                     // Should changing status *to* Pending or Rejected be allowed here?
                     // Probably not, these are usually initial states or set by specific actions.
                     throw new Error(`Changing status directly to '${newStatus}' is not supported via this action.`);
            }

            // Apply the updates to Firestore
            await updateDoc(eventRef, updates);

            // Update local state
            dispatch('updateLocalEvent', { id: eventId, changes: updates });

            // Optional: Trigger dependent actions, like XP calculation on completion
            if (newStatus === EventStatus.Completed && currentEvent.status !== EventStatus.Completed) {
                console.log(`Event ${eventId} marked completed. XP will be awarded upon permanent closure.`);
            }

        } catch (error: any) {
            console.error(`Error updating event ${eventId} status to ${newStatus}:`, error);
            throw error; // Rethrow for UI handling
        }
    },

    // --- ACTION: Toggle Ratings Open/Closed (Admin or Organizer) ---
    async toggleRatingsOpen({ dispatch, rootGetters }, { eventId, isOpen }: { eventId: string; isOpen: boolean }): Promise<{ status: 'success' | 'error'; message?: string }> {
        if (!eventId) throw new Error('Event ID is required.');

        const eventRef: DocumentReference<DocumentData> = doc(db, 'events', eventId);
        try {
            const eventSnap = await getDoc(eventRef);
            if (!eventSnap.exists()) throw new Error("Event not found.");
            const currentEvent = eventSnap.data() as Event; // Cast to Event

            // Permission Check: Admin OR any listed Organizer
            const currentUser: User | null = rootGetters['user/getUser'];
            const isAdmin = currentUser?.role === 'Admin';
            const isOrganizer = Array.isArray(currentEvent.organizers) && currentEvent.organizers.includes(currentUser?.uid ?? '');

            if (!isAdmin && !isOrganizer) {
                throw new Error("Permission denied: Only Admins or event organizers can toggle ratings.");
            }

            // Status Check: Ratings can only be toggled for completed events that are not permanently closed
            if (currentEvent.status !== EventStatus.Completed) {
                throw new Error("Ratings can only be toggled for completed events.");
            }
            if (currentEvent.closed) {
                 throw new Error("Cannot toggle ratings for a permanently closed event.");
            }

            // Prepare updates object
            const updates: Partial<Event> = {};
            const now = Timestamp.now();
            // Safely get current count, default to 0 if undefined/null
            const ratingsOpenCount = currentEvent.ratingsOpenCount ?? 0;

            if (isOpen) {
                // Logic for OPENING ratings
                if (currentEvent.ratingsOpen) {
                    console.warn(`Ratings for event ${eventId} are already open.`);
                    return { status: 'success', message: 'Ratings already open.' };
                }
                // Limit how many times ratings can be opened (e.g., max 2 times)
                if (ratingsOpenCount >= 2) {
                    throw new Error("Rating period can only be opened a maximum of two times for this event.");
                }
                // Ensure completedAt timestamp exists (should be set when status becomes Completed)
                let eventCompletedAt = currentEvent.completedAt;
                if (!eventCompletedAt) {
                     // This shouldn't happen if status transitions are correct, but handle defensively
                    console.warn(`Event ${eventId} is Completed but missing completedAt timestamp. Setting it now.`);
                    updates.completedAt = now; // Set completion time if missing
                }

                updates.ratingsOpen = true;
                updates.ratingsLastOpenedAt = now; // Record when ratings were last opened
                // Increment the counter using Firestore's increment operator
                updates.ratingsOpenCount = increment(1);

            } else {
                // Logic for CLOSING ratings
                if (!currentEvent.ratingsOpen) {
                     console.warn(`Ratings for event ${eventId} are already closed.`);
                     return { status: 'success', message: 'Ratings already closed.' };
                }
                updates.ratingsOpen = false;
                // Do not reset ratingsLastOpenedAt or ratingsOpenCount when closing
            }

            // Apply the updates to Firestore
            await updateDoc(eventRef, updates);

            // Update local state - fetch fresh count after increment if needed, or pass increment(1) marker?
            // For simplicity, pass the intended state change, Vuex doesn't run increments.
            // We need the actual count after increment for local state. Let's fetch fresh data.
             const freshSnap = await getDoc(eventRef);
             const freshData = freshSnap.data() as Event;
             const finalChanges = {
                 ratingsOpen: freshData.ratingsOpen,
                 ratingsLastOpenedAt: freshData.ratingsLastOpenedAt,
                 ratingsOpenCount: freshData.ratingsOpenCount,
                 completedAt: freshData.completedAt // Include if it might have been updated
             };
             dispatch('updateLocalEvent', { id: eventId, changes: finalChanges });

            return { status: 'success' };

        } catch (error: any) {
            console.error(`Error toggling ratings for event ${eventId}:`, error);
            // Return error status and message
            return { status: 'error', message: error.message || 'Unknown error occurred.' };
        }
    },

    // --- ACTION: Set Winners Per Role (Admin or Organizer) ---
    async setWinnersPerRole({ dispatch, rootGetters }, { eventId, winnersMap }: { eventId: string; winnersMap: Record<string, string[]> }): Promise<void> {
        // Basic validation of the input map
        if (typeof winnersMap !== 'object' || winnersMap === null) {
            throw new Error("Invalid winners map provided. Must be an object (e.g., { 'RoleName': ['winnerId1', 'winnerId2'] }).");
        }
        // Optional: Further validation? Ensure values are arrays of strings?
        for (const key in winnersMap) {
             if (!Array.isArray(winnersMap[key]) || !winnersMap[key].every(id => typeof id === 'string' && id.trim() !== '')) {
                 throw new Error(`Invalid format for winners of role '${key}'. Must be an array of non-empty strings.`);
             }
        }

        if (!eventId) throw new Error('Event ID is required.');

        const eventRef: DocumentReference<DocumentData> = doc(db, 'events', eventId);
        try {
            const eventSnap = await getDoc(eventRef);
            if (!eventSnap.exists()) throw new Error("Event not found.");
            const currentEvent = eventSnap.data() as Event; // Cast to Event

            // Permission Check: Admin OR any listed Organizer
            const currentUser: User | null = rootGetters['user/getUser'];
            const isAdmin = currentUser?.role === 'Admin';
            const isOrganizer = Array.isArray(currentEvent.organizers) && currentEvent.organizers.includes(currentUser?.uid ?? '');

            if (!isAdmin && !isOrganizer) {
                throw new Error("Permission denied: Only Admins or event organizers can set winners.");
            }

            // Status Check: Winners usually set after completion
            if (currentEvent.status !== EventStatus.Completed) {
                throw new Error("Winners can typically only be set for completed events.");
            }
            // Optional: Check if ratings are open/closed? Maybe allow setting winners anytime after completion.

            // Prepare the update
            const updates: Partial<Event> = { winnersPerRole: winnersMap };

            // Apply the update to Firestore
            await updateDoc(eventRef, updates);

            // Update local state
            dispatch('updateLocalEvent', { id: eventId, changes: updates });

            console.log(`Winners set for event ${eventId}. XP based on winners will be awarded upon permanent closure.`);
            // XP is handled during closeEventPermanently, no need to trigger calculation here.

        } catch (error: any) {
            console.error(`Error setting winners for event ${eventId}:`, error);
            throw error; // Rethrow for UI handling
        }
    },

    // --- ACTION: Auto-Generate Teams (Admin or Organizer) - SIMPLIFIED ---
    async autoGenerateTeams({ dispatch, rootGetters }, { eventId, numberOfTeams, maxTeams = 8 }: {
        eventId: string;
        numberOfTeams: number; // Number of teams to attempt to generate
        maxTeams?: number;
    }): Promise<Team[]> { // Return the FINAL teams array for the event
        if (!eventId) throw new Error('Event ID is required.');
        if (typeof numberOfTeams !== 'number' || numberOfTeams <= 0) {
            throw new Error("Invalid number of teams requested. Must be a positive number.");
        }
        const effectiveMaxTeams = Math.max(1, maxTeams); // Ensure maxTeams is at least 1
        const minTeamSize = 2; // Minimum members per team

        const eventRef: DocumentReference<DocumentData> = doc(db, 'events', eventId);
        try {
            const eventSnap = await getDoc(eventRef);
            if (!eventSnap.exists()) throw new Error('Event not found.');
            const eventData = eventSnap.data() as Event; // Cast to Event

            // Permission Check: Admin OR any listed Organizer
            const currentUser: User | null = rootGetters['user/getUser'];
            const isAdmin = currentUser?.role === 'Admin';
            const isOrganizer = Array.isArray(eventData.organizers) && eventData.organizers.includes(currentUser?.uid ?? '');

            if (!isAdmin && !isOrganizer) {
                throw new Error("Permission denied: Only Admins or event organizers can manage teams for this event.");
            }

            // Status Check: Allow team generation only before the event starts
            if (![EventStatus.Pending, EventStatus.Approved].includes(eventData.status)) {
                throw new Error(`Cannot generate teams for event with status '${eventData.status}'. Allowed only for 'Pending' or 'Approved'.`);
            }
            // Ensure it's a team event
            if (!eventData.isTeamEvent) {
                throw new Error("Cannot generate teams: This is not designated as a team event.");
            }

            // Fetch all available student UIDs
            // Assuming fetchAllStudents returns User objects with uid. Adjust if structure is different.
            const allStudents: User[] = await dispatch('user/fetchAllStudents', null, { root: true }) || [];
            if (allStudents.length === 0) {
                // No students in the system at all.
                throw new Error("No students found in the system to generate teams from.");
            }
            const allStudentUids = allStudents.map(s => s.uid).filter(Boolean);

            // Identify students already assigned to existing teams in this event
            const existingTeams = Array.isArray(eventData.teams) ? eventData.teams : [];
            if (existingTeams.length >= effectiveMaxTeams) {
                 throw new Error(`Cannot generate new teams: Maximum number of teams (${effectiveMaxTeams}) already reached.`);
            }
            const assignedStudents = new Set<string>(existingTeams.flatMap(t => t.members || []).filter(Boolean));

            // Get UIDs of students available for new teams
            const availableStudentUids = allStudentUids.filter(uid => !assignedStudents.has(uid));

            // Need at least `minTeamSize` students to form *any* new team
            if (availableStudentUids.length < minTeamSize) {
                throw new Error(`Not enough available students (${availableStudentUids.length}) who aren't already in teams to generate new teams (minimum ${minTeamSize} required).`);
            }

             // Determine the actual number of teams we can create based on available students and limits
             const maxPossibleNewTeams = Math.floor(availableStudentUids.length / minTeamSize);
             const remainingTeamSlots = effectiveMaxTeams - existingTeams.length;
             const teamsToCreateCount = Math.min(numberOfTeams, maxPossibleNewTeams, remainingTeamSlots);

             if (teamsToCreateCount <= 0) {
                 throw new Error(`Cannot create the requested ${numberOfTeams} teams. Available slots: ${remainingTeamSlots}, Max possible from students: ${maxPossibleNewTeams}.`);
             }

             console.log(`Attempting to generate ${teamsToCreateCount} new teams from ${availableStudentUids.length} available students.`);

            // Shuffle the available students randomly
            const shuffledStudents = [...availableStudentUids].sort(() => Math.random() - 0.5);

            // Distribute shuffled students into the calculated number of teams
            const generatedTeams: Team[] = [];
            const baseSize = Math.floor(shuffledStudents.length / teamsToCreateCount);
            const teamsWithExtraMember = shuffledStudents.length % teamsToCreateCount;
            let currentIndex = 0;

            for (let i = 0; i < teamsToCreateCount; i++) {
                const currentTeamSize = baseSize + (i < teamsWithExtraMember ? 1 : 0);
                // This check should be redundant because of how teamsToCreateCount is calculated, but safety first.
                if (currentIndex + currentTeamSize > shuffledStudents.length || currentTeamSize < minTeamSize) {
                    console.warn(`Stopping team generation early due to unexpected size calculation. Index: ${currentIndex}, Size: ${currentTeamSize}, Available: ${shuffledStudents.length}`);
                    break;
                }

                const teamMembers = shuffledStudents.slice(currentIndex, currentIndex + currentTeamSize);
                generatedTeams.push({
                    // Generate unique team names relative to existing and newly generated ones
                    teamName: `Generated Team ${existingTeams.length + generatedTeams.length + 1}`,
                    members: teamMembers,
                    submissions: [], // Initialize
                    ratings: []      // Initialize
                });
                currentIndex += currentTeamSize;
            }

            if (generatedTeams.length === 0) {
                // This case should ideally be caught by earlier checks
                throw new Error("Failed to generate any valid teams with the specified parameters and available students.");
            }

            // Combine existing teams with newly generated teams
            const finalTeams = [...existingTeams, ...generatedTeams];

            // Update Firestore with the new combined list of teams
            await updateDoc(eventRef, { teams: finalTeams });

            // Update local state
            dispatch('updateLocalEvent', { id: eventId, changes: { teams: finalTeams } });

            console.log(`Teams auto-generated successfully for event ${eventId}. ${generatedTeams.length} new teams created. Total teams: ${finalTeams.length}.`);
            return finalTeams; // Return the full updated list of teams

        } catch (error: any) {
            console.error(`Error auto-generating teams for event ${eventId}:`, error);
            throw error; // Rethrow for UI handling
        }
    },

    // --- ACTION: Fetch All Events ---
    async fetchEvents({ commit }) {
        try {
            // Consider adding orderBy('startDate', 'desc') or similar for sorted results
            const q = query(collection(db, "events"), orderBy('createdAt', 'desc')); // Example order
            const querySnapshot = await getDocs(q);
            const events: Event[] = [];

            querySnapshot.forEach((docSnap) => {
                const data = docSnap.data();
                // Directly push data cast as Event. Assumes Event type matches Firestore structure.
                // Timestamps should remain Timestamps in the state for Date objects usage.
                events.push({ id: docSnap.id, ...data } as Event);
            });

            commit('setEvents', events);
            // console.log(`Fetched ${events.length} events.`);

        } catch (error: any) {
            console.error("Error fetching events:", error);
            commit('setEvents', []); // Set empty array on error
             // Handle specific errors like network issues if needed
             if (error instanceof FirestoreError && (error.code === 'unavailable' || error.code === 'failed-precondition')) {
                  console.warn("Firestore connection issue detected while fetching events.");
                 // Optional: Attempt network reset?
                 // await dispatch('handleFirestoreError', error); // If handleFirestoreError manages network reset
             }
            throw new Error(`Failed to fetch events: ${error.message || 'Unknown error'}`);
        }
    },

    // --- ACTION: Fetch Detailed Information for a Single Event ---
    async fetchEventDetails({ commit }, eventId: string): Promise<Event | null> {
         try {
             if (!eventId) {
                 commit('setCurrentEventDetails', null); // Clear details if no ID provided
                 return null;
             }
             const eventRef: DocumentReference<DocumentData> = doc(db, 'events', eventId);
             const docSnap = await getDoc(eventRef);

             if (docSnap.exists()) {
                 const eventData = { id: docSnap.id, ...docSnap.data() } as Event; // Cast to Event
                 commit('setCurrentEventDetails', eventData); // Update state with fetched details
                 return eventData; // Return the fetched data
             } else {
                 console.warn(`Event with ID ${eventId} not found.`);
                 commit('setCurrentEventDetails', null); // Clear details if not found
                 return null;
             }
         } catch (error: any) {
             console.error(`Error fetching event details for ${eventId}:`, error);
             commit('setCurrentEventDetails', null); // Clear details on error
             throw error; // Rethrow for UI handling
         }
     },

    // --- ACTION: Submit Project (Individual or Team) ---
    async submitProjectToEvent({ rootGetters, dispatch }, { eventId, submissionData }: { eventId: string; submissionData: Partial<Submission> }): Promise<void> {
        // Validate required submission data
        if (!submissionData?.projectName?.trim()) throw new Error("Project Name is required.");
        if (!submissionData?.link?.trim()) throw new Error("Project Link/URL is required.");
        // Basic URL validation
        if (!submissionData.link.startsWith('http://') && !submissionData.link.startsWith('https://')) {
             throw new Error("Please provide a valid URL starting with http:// or https://.");
        }

        if (!eventId) throw new Error('Event ID is required.');

        const eventRef: DocumentReference<DocumentData> = doc(db, 'events', eventId);
        try {
            const eventSnap = await getDoc(eventRef);
            if (!eventSnap.exists()) throw new Error('Event not found.');
            const eventData = eventSnap.data() as Event; // Cast to Event

            // Check user authentication
            const currentUser: User | null = rootGetters['user/getUser'];
            const userId = currentUser?.uid;
            if (!userId) throw new Error("User not authenticated.");

            // Status Check: Submissions only allowed when 'In Progress'
            if (eventData.status !== EventStatus.InProgress) {
                throw new Error("Project submissions are only allowed while the event is 'In Progress'.");
            }

            // Construct the submission entry
            const submissionEntry: Submission = {
                // Spread provided data, ensuring required fields are present
                projectName: submissionData.projectName.trim(),
                link: submissionData.link.trim(),
                description: submissionData.description?.trim() || null, // Optional description
                // System-added fields
                submittedAt: Timestamp.now(),
                submittedBy: userId,
                // participantId will be added for individual events below
                participantId: null,
            };

            let updatedEventDataForState: Partial<Event> = {};

            if (eventData.isTeamEvent) {
                // --- Team Submission Logic ---
                const currentTeams = Array.isArray(eventData.teams) ? eventData.teams : [];
                // Find the index of the team the current user belongs to
                const userTeamIndex = currentTeams.findIndex(team =>
                    Array.isArray(team.members) && team.members.includes(userId)
                );

                if (userTeamIndex === -1) {
                    throw new Error("You are not currently assigned to a team for this event.");
                }

                // Deep copy the team to modify its submissions
                const teamToUpdate = { ...currentTeams[userTeamIndex] };
                // Ensure submissions array exists
                teamToUpdate.submissions = Array.isArray(teamToUpdate.submissions) ? teamToUpdate.submissions : [];

                // Check if the team has already submitted
                if (teamToUpdate.submissions.length > 0) {
                    // Allow re-submission? Or throw error? Let's throw for now.
                    throw new Error("Your team has already submitted a project for this event.");
                    // To allow re-submission, you might replace the existing entry or add a new one.
                }

                // Add the new submission to the team's submissions array
                teamToUpdate.submissions.push(submissionEntry);

                // Create the updated teams array
                const updatedTeams = [...currentTeams];
                updatedTeams[userTeamIndex] = teamToUpdate;

                // Update Firestore with the modified teams array
                await updateDoc(eventRef, { teams: updatedTeams });
                updatedEventDataForState = { teams: updatedTeams }; // For local state update

            } else {
                // --- Individual Submission Logic ---
                const currentParticipants = Array.isArray(eventData.participants) ? eventData.participants : [];
                // Check if the user is registered as a participant
                if (!currentParticipants.includes(userId)) {
                    throw new Error("You are not registered as a participant for this individual event.");
                }

                const currentSubmissions = Array.isArray(eventData.submissions) ? eventData.submissions : [];
                // Check if the user has already submitted
                if (currentSubmissions.some(sub => sub.submittedBy === userId || sub.participantId === userId)) {
                    throw new Error("You have already submitted a project for this event.");
                    // Allow re-submission? Could filter existing and add new, or update existing.
                }

                // Add participantId for individual submissions
                submissionEntry.participantId = userId;

                // Update Firestore using arrayUnion to add the submission
                await updateDoc(eventRef, { submissions: arrayUnion(submissionEntry) });

                // Fetch fresh data to get the updated submissions array for local state
                const freshSnap = await getDoc(eventRef);
                updatedEventDataForState = { submissions: freshSnap.exists() ? (freshSnap.data() as Event).submissions : [] };
            }

            // Update local state
            dispatch('updateLocalEvent', { id: eventId, changes: updatedEventDataForState });
            console.log(`Project submitted successfully for event ${eventId} by user ${userId}`);

        } catch (error: any) {
            console.error(`Error submitting project for event ${eventId}:`, error);
            throw error; // Rethrow for UI handling
        }
    },

    // --- ACTION: Leave Event (Participant) ---
    async leaveEvent({ rootGetters, dispatch }, eventId: string): Promise<void> {
        if (!eventId) throw new Error('Event ID is required.');

        const eventRef: DocumentReference<DocumentData> = doc(db, 'events', eventId);
        try {
            const eventSnap = await getDoc(eventRef);
            if (!eventSnap.exists()) throw new Error('Event not found.');
            const eventData = eventSnap.data() as Event; // Cast to Event

            // Check user authentication
            const currentUser: User | null = rootGetters['user/getUser'];
            const userId = currentUser?.uid;
            if (!userId) throw new Error("User not authenticated.");

            // Status Check: Allow leaving only before the event starts ('Approved')
            if (eventData.status !== EventStatus.Approved) {
                throw new Error(`Cannot leave event with status '${eventData.status}'. Only 'Approved' events can be left before they start.`);
            }

            let updatedEventDataForState: Partial<Event> = {};
            let userFound = false; // Flag to track if user was actually removed

            if (eventData.isTeamEvent) {
                // --- Leave Team Logic ---
                const currentTeams = Array.isArray(eventData.teams) ? eventData.teams : [];
                let userTeamIndex = -1;
                // Find the team the user is in
                for(let i = 0; i < currentTeams.length; i++) {
                    if (Array.isArray(currentTeams[i].members) && currentTeams[i].members.includes(userId)) {
                        userTeamIndex = i;
                        userFound = true;
                        break;
                    }
                }

                if (userTeamIndex === -1) {
                    console.log(`LeaveEvent: User ${userId} is not in any team for event ${eventId}. No action taken.`);
                    return; // User not found in any team
                }

                // Create a deep copy of teams to modify
                const updatedTeams = JSON.parse(JSON.stringify(currentTeams));
                // Filter the user out of the specific team's members array
                updatedTeams[userTeamIndex].members = (updatedTeams[userTeamIndex].members || []).filter((memberId: string) => memberId !== userId);

                // Optional: Handle empty teams? Delete team if last member leaves?
                 if (updatedTeams[userTeamIndex].members.length === 0) {
                     console.log(`Team ${updatedTeams[userTeamIndex].teamName} is now empty after user ${userId} left. Removing team.`);
                     updatedTeams.splice(userTeamIndex, 1); // Remove the empty team
                 }

                // Update Firestore with the modified teams array
                await updateDoc(eventRef, { teams: updatedTeams });
                updatedEventDataForState = { teams: updatedTeams }; // For local state

            } else {
                // --- Leave Individual Event Logic ---
                const currentParticipants = Array.isArray(eventData.participants) ? eventData.participants : [];
                if (!currentParticipants.includes(userId)) {
                    console.log(`LeaveEvent: User ${userId} is not a participant in event ${eventId}. No action taken.`);
                    return; // User not found
                }

                userFound = true; // Mark user as found

                // Update Firestore using arrayRemove to remove the participant
                await updateDoc(eventRef, { participants: arrayRemove(userId) });

                // Fetch fresh data for local state update
                const freshSnap = await getDoc(eventRef);
                updatedEventDataForState = { participants: freshSnap.exists() ? (freshSnap.data() as Event).participants : [] };
            }

             // Update local state only if the user was actually found and removed
             if (userFound) {
                 dispatch('updateLocalEvent', { id: eventId, changes: updatedEventDataForState });
                 console.log(`User ${userId} successfully left event ${eventId}.`);
             }

        } catch (error: any) {
            console.error(`Error leaving event ${eventId}:`, error);
            throw error; // Rethrow for UI handling
        }
    },

     // --- ACTION: Add Team to Event (Admin or Organizer) ---
     async addTeamToEvent({ dispatch, rootGetters }, { eventId, teamName, members }: { eventId: string; teamName: string; members: string[] }): Promise<Team> {
        if (!eventId) throw new Error('Event ID is required.');

        // Validate inputs
        const trimmedTeamName = teamName?.trim();
        if (!trimmedTeamName) throw new Error("Team name cannot be empty.");
        if (!Array.isArray(members)) throw new Error("Members must be provided as an array.");
        // Filter out empty/falsy member IDs and ensure at least one member
        const validMembers = members.filter(m => typeof m === 'string' && m.trim() !== '');
        if (validMembers.length === 0) throw new Error("A team must have at least one valid member UID.");

        const eventRef: DocumentReference<DocumentData> = doc(db, 'events', eventId);
        try {
            const eventSnap = await getDoc(eventRef);
            if (!eventSnap.exists()) throw new Error('Event not found.');
            const eventData = eventSnap.data() as Event; // Cast to Event

            // Permission Check: Admin OR any listed Organizer
            const currentUser: User | null = rootGetters['user/getUser'];
            const isAdmin = currentUser?.role === 'Admin';
            const isOrganizer = Array.isArray(eventData.organizers) && eventData.organizers.includes(currentUser?.uid ?? '');

            if (!isAdmin && !isOrganizer) {
                throw new Error("Permission denied: Only Admins or event organizers can manage teams for this event.");
            }

            // Status Check: Allow adding teams only before the event starts
            if (![EventStatus.Pending, EventStatus.Approved].includes(eventData.status)) {
                throw new Error(`Cannot add teams to event with status '${eventData.status}'. Allowed only for 'Pending' or 'Approved'.`);
            }
            // Ensure it's a team event
            if (!eventData.isTeamEvent) {
                throw new Error("Cannot add teams: This is not designated as a team event.");
            }

            // --- Validation Checks ---
            const currentTeams = Array.isArray(eventData.teams) ? eventData.teams : [];

            // Check for duplicate team name (case-insensitive)
            if (currentTeams.some(t => t.teamName.toLowerCase() === trimmedTeamName.toLowerCase())) {
                throw new Error(`A team named "${trimmedTeamName}" already exists in this event.`);
            }

            // Check if any proposed members are already in other teams for this event
            const allAssignedMembers = new Set<string>(currentTeams.flatMap(t => t.members || []).filter(Boolean));
            const alreadyAssigned = validMembers.filter(m => allAssignedMembers.has(m));
            if (alreadyAssigned.length > 0) {
                 // Fetch names for better error message? (Requires extra reads)
                // const userNames = await Promise.all(alreadyAssigned.map(uid => dispatch('user/fetchUserName', uid, { root: true })));
                throw new Error(`Cannot add team: The following students are already assigned to other teams in this event: ${alreadyAssigned.join(', ')}`);
            }

            // Construct the new team object
            const newTeam: Team = {
                teamName: trimmedTeamName,
                members: validMembers,
                submissions: [], // Initialize empty
                ratings: []      // Initialize empty
            };

            // Update Firestore using arrayUnion to add the new team
            await updateDoc(eventRef, { teams: arrayUnion(newTeam) });

            // Fetch fresh data to get the complete teams array for local state
            const freshSnap = await getDoc(eventRef);
            const updatedTeamsArray = freshSnap.exists() ? (freshSnap.data() as Event).teams : [];

            // Update local state
            dispatch('updateLocalEvent', { id: eventId, changes: { teams: updatedTeamsArray } });
            console.log(`Team "${trimmedTeamName}" added successfully to event ${eventId}.`);

            return newTeam; // Return the newly created team object

        } catch (error: any) {
            console.error(`Error adding team to event ${eventId}:`, error);
            throw error; // Rethrow for UI handling
        }
    },

    // --- ACTION: Update Event Details (Admin, Organizer, or Requester) ---
    async updateEventDetails({ dispatch, rootGetters }, { eventId, updates }: { eventId: string; updates: Partial<EventData> }): Promise<void> {
        if (!eventId) throw new Error('Event ID is required.');
        if (typeof updates !== 'object' || updates === null || Object.keys(updates).length === 0) {
             console.log(`No updates provided for event ${eventId}.`);
             return; // Nothing to update
        }

        const eventRef: DocumentReference<DocumentData> = doc(db, 'events', eventId);
        try {
            const eventSnap = await getDoc(eventRef);
            if (!eventSnap.exists()) throw new Error('Event not found.');
            const eventData = eventSnap.data() as Event; // Cast to Event

            // --- Permission Check ---
            const currentUser: User | null = rootGetters['user/getUser'];
            const isAdmin = currentUser?.role === 'Admin';
            const isOrganizer = Array.isArray(eventData.organizers) && eventData.organizers.includes(currentUser?.uid ?? '');
            const isRequester = eventData.requester === currentUser?.uid;

            let canEdit = false;
            const editableStatuses: EventStatus[] = [EventStatus.Pending, EventStatus.Approved];
            const currentStatus = eventData.status;

            if (isAdmin && editableStatuses.includes(currentStatus)) {
                canEdit = true; // Admins can edit Pending/Approved events fully
            } else if (isOrganizer && editableStatuses.includes(currentStatus)) {
                canEdit = true; // Organizers can edit Pending/Approved events (with field restrictions)
            } else if (isRequester && currentStatus === EventStatus.Pending) {
                canEdit = true; // Requester can edit their own Pending request (with field restrictions)
            }

            if (!canEdit) {
                 throw new Error(`Permission denied: Cannot edit event details for event with status '${currentStatus}'.`);
            }

            // --- Filter and Validate Updates based on Permissions and Status ---
            const allowedUpdates: Partial<EventData> = {};
            // Fields generally editable by authorized users on Pending/Approved events
            const generallyEditableFields: Array<keyof EventData> = [
                'description', 'xpAllocation', 'isTeamEvent' // Removed 'ratingCriteria'
            ];
            // Fields editable only when the event is Pending (usually by Requester or Admin)
            const pendingOnlyEditableFields: Array<keyof EventData> = [
                'eventName', 'eventType', 'desiredStartDate', 'desiredEndDate'
            ];
             // Fields editable only by Admins on Pending/Approved events
             const adminOnlyEditableFields: Array<keyof EventData> = [
                 'startDate', 'endDate', 'organizers'
             ];
             // Team list is special case - editable by Admin/Organizer on Pending/Approved team events
             const teamEditField: keyof EventData = 'teams';

             // Iterate through the provided updates
             for (const key in updates) {
                 // Skip if the key is not a valid EventData property (basic safety)
                 if (!Object.prototype.hasOwnProperty.call(updates, key)) continue;

                 const fieldKey = key as keyof EventData;
                 const value = updates[fieldKey];

                 // Generally Editable Fields
                 if (generallyEditableFields.includes(fieldKey)) {
                     // Specific validation for fields if needed
                     if (fieldKey === 'xpAllocation' && !Array.isArray(value)) {
                         console.warn(`Skipping update for '${fieldKey}': Invalid format (expected array).`);
                         continue;
                     }
                     if (fieldKey === 'isTeamEvent' && typeof value !== 'boolean') {
                          console.warn(`Skipping update for '${fieldKey}': Invalid format (expected boolean).`);
                          continue;
                     }
                     allowedUpdates[fieldKey] = value;
                 }
                 // Pending Only Editable Fields
                 else if (currentStatus === EventStatus.Pending && pendingOnlyEditableFields.includes(fieldKey)) {
                      // Validation for dates (expecting Date objects or Timestamps from input?)
                      if ((fieldKey === 'desiredStartDate' || fieldKey === 'desiredEndDate')) {
                          // Use mapper later to handle conversion/validation
                          allowedUpdates[fieldKey] = value;
                      } else {
                          allowedUpdates[fieldKey] = value;
                      }
                 }
                 // Admin Only Editable Fields
                 else if (isAdmin && adminOnlyEditableFields.includes(fieldKey)) {
                      if (fieldKey === 'organizers') {
                          const newOrganizers = Array.isArray(value) ? (value as string[]).filter(Boolean) : [];
                          if (newOrganizers.length === 0) {
                              throw new Error("Organizers list cannot be empty when updated by Admin.");
                          }
                          if (newOrganizers.length > 5) {
                               throw new Error("Cannot have more than 5 organizers.");
                          }
                          // Validate that new organizers are not Admins
                          await validateOrganizersNotAdmin(newOrganizers);
                          allowedUpdates[fieldKey] = newOrganizers;
                      } else if (fieldKey === 'startDate' || fieldKey === 'endDate') {
                          // Expecting Date/Timestamp/String - Mapper will handle
                           allowedUpdates[fieldKey] = value;
                      }
                 }
                 // Team Editing (Admin/Organizer, Pending/Approved, Team Event)
                 else if (fieldKey === teamEditField && eventData.isTeamEvent && Array.isArray(value) && (isAdmin || isOrganizer)) {
                     // Validate the structure of the teams array
                      const newTeams = (value as Partial<Team>[]).map((team, index) => {
                          const teamName = team.teamName?.trim();
                          if (!teamName) {
                              throw new Error(`Team name cannot be empty (check team at index ${index}).`);
                          }
                          const members = Array.isArray(team.members) ? team.members.filter(Boolean) as string[] : [];
                          // Retain existing submissions/ratings if modifying, otherwise initialize
                          const existingTeam = eventData.teams?.find(et => et.teamName === teamName);
                          return {
                              teamName: teamName,
                              members: members,
                              // Preserve submissions/ratings if team existed, else initialize
                              submissions: existingTeam?.submissions || [],
                              ratings: existingTeam?.ratings || []
                          };
                      });
                      // Optional: Check for duplicate team names within the new array?
                      allowedUpdates[fieldKey] = newTeams;
                 }
                 // Restrictions for non-admins trying to edit restricted fields
                 else if (!isAdmin && (adminOnlyEditableFields.includes(fieldKey) || (fieldKey === teamEditField && isOrganizer))) {
                      console.warn(`Skipping update for field '${fieldKey}': Permission denied for non-Admin/Organizer.`);
                 }
                 // If field wasn't handled, it might be disallowed or status doesn't permit
                 else {
                      console.warn(`Skipping update for field '${fieldKey}': Field not editable or condition not met (Status: ${currentStatus}).`);
                 }
             }

             // --- Date Conflict Check and Mapping ---
             if (Object.keys(allowedUpdates).length > 0) {
                // Map the allowed updates to Firestore format (handles date conversions)
                // Pass existing data to mapper if needed for context, but here we only map the `allowedUpdates` part.
                const mappedUpdates = mapEventDataToFirestore(allowedUpdates);

                 // Check for date conflicts if start/end dates are being changed
                 const finalStartDate = mappedUpdates.startDate || eventData.startDate;
                 const finalEndDate = mappedUpdates.endDate || eventData.endDate;
                 const finalDesiredStart = mappedUpdates.desiredStartDate || eventData.desiredStartDate;
                 const finalDesiredEnd = mappedUpdates.desiredEndDate || eventData.desiredEndDate;

                 // Validate date order after potential updates
                 if (finalStartDate && finalEndDate && finalStartDate.toMillis() >= finalEndDate.toMillis()) {
                     throw new Error("Update failed: Start date cannot be on or after the end date.");
                 }
                 if (finalDesiredStart && finalDesiredEnd && finalDesiredStart.toMillis() >= finalDesiredEnd.toMillis()) {
                     throw new Error("Update failed: Desired start date cannot be on or after the desired end date.");
                 }

                 // Perform conflict check only if actual approved dates are changing
                 if ((mappedUpdates.startDate || mappedUpdates.endDate) && currentStatus === EventStatus.Approved) {
                     const conflictResult = await dispatch('checkDateConflict', {
                         startDate: finalStartDate!, // Non-null assertion as we checked existence
                         endDate: finalEndDate!,
                         excludeEventId: eventId
                     });
                     if (conflictResult.hasConflict) {
                         const conflictEventName = conflictResult.conflictingEvent?.eventName || 'another event';
                         throw new Error(
                             `Update failed: Date conflict with ${conflictEventName}. Please choose different dates.`
                         );
                     }
                 }

                 // Add timestamp for last update
                 mappedUpdates.lastUpdatedAt = Timestamp.now();

                 // Perform the update in Firestore
                 await updateDoc(eventRef, mappedUpdates);

                 // Update local state
                 dispatch('updateLocalEvent', { id: eventId, changes: mappedUpdates });
                 console.log(`Event ${eventId} details updated successfully. Fields:`, Object.keys(mappedUpdates).join(', '));

             } else {
                 console.log(`No valid or permitted fields provided for updating event ${eventId}.`);
             }

        } catch (error: any) {
            console.error(`Error updating event details for ${eventId}:`, error);
            throw error; // Rethrow for UI handling
        }
     },

    // --- ACTION: Helper to Update Local State Consistently ---
    updateLocalEvent({ commit }, { id, changes }: { id: string; changes: Partial<Event> }) {
        // Update the event in the main list/cache
        commit('addOrUpdateEvent', { id, ...changes });
        // If the updated event is the currently viewed one, update its details too
        commit('updateCurrentEventDetails', { id, changes });
    },

    // --- ACTION: Centralized Firestore Error Handling (Example) ---
    async handleFirestoreError({ commit, dispatch }, error: any): Promise<void> {
        console.error('Firestore operation failed:', error);
        let userMessage = 'An unexpected error occurred.';

        // Handle specific Firestore error codes
        if (error instanceof FirestoreError) {
             switch (error.code) {
                 case 'permission-denied':
                     userMessage = 'Permission Denied: You do not have permission for this operation.';
                     break;
                 case 'unavailable':
                 case 'failed-precondition': // Often indicates network issues
                     userMessage = 'Connection Issue: Could not reach the server. Please check your internet connection.';
                     // Optional: Attempt network reconnection logic
                     console.warn('Attempting to reset Firestore network connection...');
                     try {
                         // Disable and re-enable network might help sometimes
                         await disableNetwork(db);
                         await enableNetwork(db);
                         console.log('Firestore network reset attempted.');
                         userMessage += ' Connection reset attempted, please try again.';
                     } catch (reconnectError: any) {
                         console.error('Firestore network reset failed:', reconnectError);
                         userMessage = 'Connection Issue: Failed to reconnect. Please check network and refresh.';
                     }
                     break;
                 case 'not-found':
                      userMessage = 'Not Found: The requested item could not be found.';
                      break;
                 case 'already-exists':
                      userMessage = 'Conflict: An item with this identifier already exists.';
                      break;
                 // Add more specific error codes as needed
                 default:
                      userMessage = `An error occurred (${error.code}). Please try again.`;
             }
        } else if (error instanceof Error) {
             // Use message from standard Error object
             userMessage = error.message;
        }

        // Optional: Commit an error state to Vuex for UI display
        // commit('setGlobalError', userMessage);

        // Rethrow a standardized error for consistent handling in components
        throw new Error(userMessage);
    },


     // --- ACTION: Submit Rating (Team Scores or Individual Winner Selection) ---
     async submitRating({ rootGetters, dispatch }, { eventId, ratingType, selections, teamId }: {
        eventId: string;
        // Use union type for clarity
        ratingType: 'team' | 'individual';
        // Type selections more accurately: Keys are strings (e.g., 'criterionKey' or 'constraint0'),
        // values are objects containing score or winnerId.
        selections: Record<string, { score?: number | string; winnerId?: string }>; // Allow string score initially
        // teamId is only relevant for 'team' ratingType
        teamId?: string; // Changed from teamName to teamId assuming unique ID is better
    }): Promise<void> {
        if (!eventId) throw new Error('Event ID is required.');

        // Get current user and perform checks
        const currentUser: User | null = rootGetters['user/getUser'];
        const userId = currentUser?.uid;
        if (!userId) throw new Error('User must be logged in to submit ratings.');
        // Prevent Admins from submitting ratings/selections
        if (currentUser?.role === 'Admin') {
            throw new Error('Administrators cannot submit ratings or select winners.');
        }

        const eventRef: DocumentReference<DocumentData> = doc(db, 'events', eventId);
        try {
            const eventSnap = await getDoc(eventRef);
            if (!eventSnap.exists()) throw new Error('Event not found.');
            const eventData = eventSnap.data() as Event; // Cast to Event

            // Status and Rating Window Checks
            if (eventData.status !== EventStatus.Completed) {
                throw new Error('Ratings/Selections can only be submitted for completed events.');
            }
            if (!eventData.ratingsOpen) {
                throw new Error('The rating/selection period is currently closed for this event.');
            }
            if (eventData.closed) {
                throw new Error('Cannot submit ratings/selections for a permanently closed event.');
            }

            // Validate selections format (basic check)
            if (!selections || typeof selections !== 'object' || Object.keys(selections).length === 0) {
                throw new Error('Invalid rating/selection data provided. No selections found.');
            }

            const updates: Partial<Event> = {};
            const now = Timestamp.now();

            if (ratingType === 'team') {
                // --- Team Rating Logic ---
                if (!teamId) throw new Error('Team ID is missing for team rating submission.');

                const teams = Array.isArray(eventData.teams) ? [...eventData.teams] : [];
                // Find team by ID (assuming team objects have a unique 'id' or use teamName if that's the identifier)
                // Let's assume teamName is the identifier for now, as used in the JS version. Adjust if IDs are used.
                const teamIndex = teams.findIndex(t => t.teamName === teamId); // FINDING BY NAME HERE, ensure consistency
                if (teamIndex === -1) throw new Error(`Team with Name '${teamId}' not found in this event.`);

                // Ensure the user isn't rating their own team? (Add check if needed)
                 if (teams[teamIndex].members?.includes(userId)) {
                     throw new Error("You cannot rate your own team.");
                 }

                // Get existing ratings for the team, ensuring it's an array
                const existingTeamRatings = Array.isArray(teams[teamIndex].ratings) ? teams[teamIndex].ratings : [];

                // Filter out any previous rating by the *same user* for *this team*
                const updatedTeamRatings = existingTeamRatings.filter(r => r.ratedBy !== userId);

                // Process the new rating scores from selections
                const newRatingScores: Record<string, number> = {};
                let validScoreFound = false;
                for (const key in selections) {
                    // Ensure score exists and is a valid number (or coercible string)
                    const scoreValue = selections[key]?.score;
                    if (scoreValue !== undefined && scoreValue !== null && scoreValue !== '') {
                         const numericScore = Number(scoreValue);
                         if (!isNaN(numericScore)) {
                              // Optional: Add range validation for scores (e.g., 1-5)
                              // if (numericScore < 1 || numericScore > 5) throw new Error(`Invalid score for ${key}: ${numericScore}. Must be between 1 and 5.`);
                              newRatingScores[key] = numericScore;
                              validScoreFound = true;
                         } else {
                             console.warn(`Invalid score value ignored for criterion '${key}': ${scoreValue}`);
                         }
                    }
                }

                 if (!validScoreFound) {
                     throw new Error("No valid rating scores provided in the submission.");
                 }

                // Add the new rating entry
                updatedTeamRatings.push({
                    ratedBy: userId,
                    ratedAt: now,
                    scores: newRatingScores // Store the validated numeric scores
                });

                // Update the specific team's ratings in the copied teams array
                teams[teamIndex].ratings = updatedTeamRatings;
                // Assign the updated teams array to the updates object
                updates.teams = teams;

            } else if (ratingType === 'individual') {
                // Process selections to potentially update winnersPerRole
                // Use a temporary object to build the changes
                const proposedWinnersPerRole = { ...(eventData.winnersPerRole || {}) };
                const criteria: XPAllocation[] = Array.isArray(eventData.xpAllocation) ? eventData.xpAllocation : [];
                let changesMadeToWinners = false;

                for (const constraintKey in selections) { // e.g., constraintKey = "constraint0"
                    const winnerId = selections[constraintKey]?.winnerId;
                    // Ensure winnerId is a non-empty string
                    if (winnerId && typeof winnerId === 'string' && winnerId.trim() !== '') {
                        // Extract the index from the key (e.g., 0 from "constraint0")
                        const constraintIndex = parseInt(constraintKey.replace('constraint', ''), 10);
                        if (!isNaN(constraintIndex)) {
                            // Find the corresponding XP allocation criterion
                            const criterion = criteria.find(c => c.constraintIndex === constraintIndex);
                            if (criterion) {
                                const role = criterion.role || 'general_winner'; // Default role if not specified
                                // Update the winner for this role. Assuming single winner per role for now.
                                // If multiple winners per role allowed, adjust logic (e.g., push to array).
                                if (!proposedWinnersPerRole[role] || !proposedWinnersPerRole[role].includes(winnerId.trim())) {
                                    // Store winners as an array, replace if different
                                    proposedWinnersPerRole[role] = [winnerId.trim()];
                                    changesMadeToWinners = true;
                                }
                            } else {
                                console.warn(`No XP allocation criterion found for constraint index ${constraintIndex}. Skipping selection.`);
                            }
                        } else {
                             console.warn(`Could not parse constraint index from key '${constraintKey}'. Skipping selection.`);
                        }
                    }
                }

                // Only update winnersPerRole if changes were actually made
                if (changesMadeToWinners) {
                    updates.winnersPerRole = proposedWinnersPerRole;
                }

                // Record the act of this user submitting their selections in the general 'ratings' array
                const existingEventRatings = Array.isArray(eventData.ratings) ? eventData.ratings : [];
                // Remove previous 'winner_selection' rating by this user to prevent duplicates
                const updatedEventRatings = existingEventRatings.filter(r => !(r.ratedBy === userId && r.type === 'winner_selection'));

                // Add a record indicating this user submitted selections
                updatedEventRatings.push({
                    ratedBy: userId,
                    ratedAt: now,
                    type: 'winner_selection', // Use a specific type marker
                    // Optionally store the actual selections made by this user?
                    // selections: selections // Be mindful of data size if storing raw selections
                });
                updates.ratings = updatedEventRatings;

            } else {
                // Should not happen with TypeScript union type, but safeguard anyway
                throw new Error(`Invalid rating type specified: ${ratingType}`);
            }

             // Only update Firestore if there are actual changes to apply
             if (Object.keys(updates).length > 0) {
                await updateDoc(eventRef, updates);
                // Fetch fresh data for consistent local state update
                const freshSnap = await getDoc(eventRef);
                 if (freshSnap.exists()) {
                     const freshData = freshSnap.data() as Event;
                     const finalChanges = {
                         teams: freshData.teams, // Update teams if changed
                         ratings: freshData.ratings, // Update general ratings
                         winnersPerRole: freshData.winnersPerRole // Update winners
                     };
                     dispatch('updateLocalEvent', { id: eventId, changes: finalChanges });
                 }
                 console.log(`Rating/Selection of type '${ratingType}' submitted successfully for event ${eventId} by user ${userId}.`);
             } else {
                 console.log(`No effective changes detected in rating/selection submission for event ${eventId}. No update performed.`);
             }

        } catch (error: any) {
            console.error(`Error submitting rating/selection for event ${eventId}:`, error);
            throw error; // Rethrow for UI handling
        }
    },

    // --- ACTION: Submit Rating for Event Organization ---
    async submitOrganizationRating({ rootGetters, dispatch }, { eventId, score }: { eventId: string; score: number | string }): Promise<void> {
        if (!eventId) throw new Error('Event ID is required.');

        // Validate score
        const numericScore = Number(score);
        // Define valid score range (e.g., 1 to 5 stars)
        const minScore = 1;
        const maxScore = 5;
        if (isNaN(numericScore) || numericScore < minScore || numericScore > maxScore) {
            throw new Error(`Invalid rating score provided (${score}). Must be a number between ${minScore} and ${maxScore}.`);
        }

        // Get current user and perform checks
        const currentUser: User | null = rootGetters['user/getUser'];
        const userId = currentUser?.uid;
        if (!userId) throw new Error('User must be logged in to rate organization.');
        // Prevent Admins from rating organization
        if (currentUser?.role === 'Admin') {
            throw new Error('Administrators cannot submit organization ratings.');
        }

        const eventRef: DocumentReference<DocumentData> = doc(db, 'events', eventId);
        try {
            const eventSnap = await getDoc(eventRef);
            if (!eventSnap.exists()) throw new Error('Event not found.');
            const eventData = eventSnap.data() as Event; // Cast to Event

            // Status Check: Allow rating only after completion?
            if (eventData.status !== EventStatus.Completed) {
                throw new Error('Organization can only be rated for completed events.');
            }

            // --- Permission Check (Example: Allow only Participants) ---
            // Determine if the current user was a participant in the event
            let isParticipant = false;
            if (eventData.isTeamEvent && Array.isArray(eventData.teams)) {
                isParticipant = eventData.teams.some(team => Array.isArray(team.members) && team.members.includes(userId));
            } else if (!eventData.isTeamEvent && Array.isArray(eventData.participants)) {
                isParticipant = eventData.participants.includes(userId);
            }
            // Enforce participation requirement
            if (!isParticipant) {
                 // Decide if non-participants (e.g., organizers) can rate. For now, restrict to participants.
                throw new Error('Only event participants can rate the organization.');
            }
            // --- End Permission Check Example ---


            // Store ratings as objects including user ID to prevent multiple ratings
            const organizationRatings = Array.isArray(eventData.organizationRatings) ? eventData.organizationRatings : [];

            // Check if user has already rated
            const existingRatingIndex = organizationRatings.findIndex((r: OrganizationRating) => r.ratedBy === userId);

            const newRatingEntry: OrganizationRating = {
                ratedBy: userId,
                score: numericScore,
                ratedAt: Timestamp.now()
            };

            let updatedRatings: OrganizationRating[];
            if (existingRatingIndex > -1) {
                // User has rated before, update their score
                console.log(`User ${userId} is updating their previous organization rating for event ${eventId}.`);
                updatedRatings = [...organizationRatings];
                updatedRatings[existingRatingIndex] = newRatingEntry;
            } else {
                // First time rating for this user
                updatedRatings = [...organizationRatings, newRatingEntry];
            }

            // Update Firestore with the new/updated array
            await updateDoc(eventRef, {
                organizationRatings: updatedRatings
            });

            // Update local state
            dispatch('updateLocalEvent', { id: eventId, changes: { organizationRatings: updatedRatings } });

            console.log(`Organization rating (${numericScore}) submitted for event ${eventId} by user ${userId}.`);

        } catch (error: any) {
            console.error(`Error submitting organization rating for event ${eventId}:`, error);
            throw error; // Rethrow for UI handling
        }
    },

    // --- ACTION: Permanently Close Event and Award XP (Admin Only) ---
    async closeEventPermanently(context: ActionContext<EventState, RootState>, { eventId }: { eventId: string }): Promise<CloseEventResult> {
         // Delegate the actual logic to the internal function
         // This keeps the exported action clean and consistent with Vuex patterns.
        try {
             // Pass the full context and eventId
             return await closeEventPermanentlyInternal(context, eventId);
        } catch (error: any) {
             // Catch errors thrown by the internal function and format them if necessary
             console.error(`Caught error in closeEventPermanently action for ${eventId}:`, error);
             // Return a structured error result or rethrow
             // Rethrowing allows components using the action to handle it via try/catch
             throw error;
            
        }
    },
};