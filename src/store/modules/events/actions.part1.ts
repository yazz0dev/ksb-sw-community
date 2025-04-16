// src/store/modules/events/actions.part1.ts
import { ActionContext } from 'vuex';
import { db } from '@/firebase';
import {
    collection,
    addDoc,
    getDocs,
    doc,
    getDoc,
    Timestamp,
    updateDoc,
    query,
    where,
    orderBy,
    DocumentReference,
    DocumentData,
    deleteField, // Keep if clearing fields is needed
} from 'firebase/firestore';
import {
    EventFormat,
    EventStatus,
    EventState,
    Event,
    Team
} from '@/types/event';
import { RootState } from '@/store/types';
import { User } from '@/types/user';
import { DateTime } from 'luxon'; // For date comparisons

// --- Helper: Validate Organizers ---
// Keep this helper here as it's used by createEvent and approveEventRequest
async function validateOrganizersNotAdmin(organizerIds: string[] = []): Promise<void> {
    const userIdsToCheck = new Set(organizerIds.filter(Boolean));
    if (userIdsToCheck.size === 0) return;

    const fetchPromises = Array.from(userIdsToCheck).map(async (uid) => {
        try {
            const userDocRef = doc(db, 'users', uid);
            const docSnap = await getDoc(userDocRef);
            if (docSnap.exists() && docSnap.data()?.role === 'Admin') {
                const adminName = docSnap.data()?.name || uid;
                throw new Error(`User '${adminName}' (Admin) cannot be assigned as an organizer.`);
            }
        } catch (error: any) {
            if (error.message.includes('cannot be assigned')) throw error;
            console.error(`Error fetching user role for ${uid}:`, error);
            throw new Error(`Failed to verify role for user ${uid}.`);
        }
    });
    await Promise.all(fetchPromises);
}

// --- Helper: Update Local State (defined in part2, but needed here) ---
// We'll call dispatch('updateLocalEvent', ...) assuming it's defined in another part
// Or, define it here if preferred, but keep it consistent. Let's assume it's in part2.


// --- ACTION: Check if current user has existing pending/active requests ---
export async function checkExistingRequests({ rootGetters }: ActionContext<EventState, RootState>): Promise<boolean> {
    const currentUser: User | null = rootGetters['user/getUser'];
    if (!currentUser?.uid) return false;

    const q = query(
        collection(db, 'events'),
        where('requester', '==', currentUser.uid),
        where('status', 'in', [EventStatus.Pending, EventStatus.Approved, EventStatus.InProgress])
    );
    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty;
}

// --- ACTION: Check for date conflicts with existing events ---
export async function checkDateConflict(_: ActionContext<EventState, RootState>, { startDate, endDate, excludeEventId = null }: {
    startDate: Date | string | Timestamp;
    endDate: Date | string | Timestamp;
    excludeEventId?: string | null;
}): Promise<{ hasConflict: boolean; nextAvailableDate: Date | null; conflictingEvent: Event | null }> {
    let checkStartLuxon: DateTime, checkEndLuxon: DateTime;
    try {
        const convertToLuxon = (d: Date | string | Timestamp): DateTime => {
            let dt: DateTime;
            if (d instanceof Timestamp) dt = DateTime.fromJSDate(d.toDate());
            else if (d instanceof Date) dt = DateTime.fromJSDate(d);
            else dt = DateTime.fromISO(d);

            if (!dt.isValid) throw new Error(`Invalid date value: ${d}`);
            return dt.startOf('day'); // Normalize to start of day UTC
        };
        checkStartLuxon = convertToLuxon(startDate);
        checkEndLuxon = convertToLuxon(endDate);

    } catch (e: any) {
        console.error("Date parsing error in checkDateConflict:", e);
        throw new Error(`Invalid date format provided: ${e.message}`);
    }

    const q = query(collection(db, 'events'), where('status', 'in', [EventStatus.Approved, EventStatus.InProgress]));
    const querySnapshot = await getDocs(q);
    let conflictingEvent: Event | null = null;

    for (const docSnap of querySnapshot.docs) {
        const event = { id: docSnap.id, ...docSnap.data() } as Event;
        if (excludeEventId && docSnap.id === excludeEventId) continue;
        if (!event.startDate || !event.endDate) continue;

        try {
            const eventStartLuxon = DateTime.fromJSDate(event.startDate.toDate()).startOf('day');
            const eventEndLuxon = DateTime.fromJSDate(event.endDate.toDate()).startOf('day');
            if (!eventStartLuxon.isValid || !eventEndLuxon.isValid) continue;

            const checkInterval = checkStartLuxon.until(checkEndLuxon.endOf('day'));
            const eventInterval = eventStartLuxon.until(eventEndLuxon.endOf('day'));
            if (checkInterval.overlaps(eventInterval)) {
                conflictingEvent = event;
                break;
            }
        } catch (dateError: any) {
            console.warn(`Skipping event ${docSnap.id} in conflict check (date issue):`, dateError.message);
        }
    }

    const nextAvailableDate = conflictingEvent?.endDate
        ? DateTime.fromJSDate(conflictingEvent.endDate.toDate()).plus({ days: 1 }).toJSDate()
        : null;

    return { hasConflict: !!conflictingEvent, nextAvailableDate, conflictingEvent };
}

// --- ACTION: Create Event (Admin Only - Request Flow Preferred) ---
export async function createEvent({ rootGetters, commit, dispatch }: ActionContext<EventState, RootState>, eventData: Partial<Event>): Promise<string> {
    const currentUser: User | null = rootGetters['user/getUser'];
    if (currentUser?.role !== 'Admin') throw new Error('Unauthorized: Only Admins can create events directly.');
    if (!currentUser?.uid) throw new Error('Admin user UID is missing.');

    if (!eventData.eventName?.trim()) throw new Error('Event Name is required.');
    if (!eventData.startDate || !eventData.endDate) throw new Error("Admin event creation requires valid start and end dates.");

    const organizers: string[] = Array.isArray(eventData.organizers) ? eventData.organizers.filter(Boolean) : [];
    if (organizers.length === 0) throw new Error("At least one organizer is required.");
    if (organizers.length > 5) throw new Error("Max 5 organizers.");
    await validateOrganizersNotAdmin(organizers);

    const startDate = eventData.startDate instanceof Date ? Timestamp.fromDate(eventData.startDate) : eventData.startDate;
    const endDate = eventData.endDate instanceof Date ? Timestamp.fromDate(eventData.endDate) : eventData.endDate;
    if (!(startDate instanceof Timestamp) || !(endDate instanceof Timestamp)) throw new Error("Invalid date format.");
    if (startDate.toMillis() >= endDate.toMillis()) throw new Error("End date must be after start date.");
    if (startDate.toMillis() <= Timestamp.now().toMillis()) console.warn("Admin creating event starting in past/present.");

    const conflictResult = await dispatch('checkDateConflict', { startDate, endDate, excludeEventId: null });
    if (conflictResult.hasConflict) throw new Error(`Creation failed: Date conflict with ${conflictResult.conflictingEvent?.eventName || 'another event'}.`);

    const eventFormat = eventData.eventFormat ?? (eventData.isTeamEvent ? EventFormat.Team : EventFormat.Individual);
    const isTeamEvent = eventFormat === EventFormat.Team;

    // **Placeholder Replacement Start: finalData**
    const finalData: Partial<Event> = {
        ...eventData, // Spread incoming data first
        eventName: eventData.eventName.trim(), // Use validated/trimmed name
        organizers, // Use validated organizers
        startDate, // Use converted Timestamp
        endDate,   // Use converted Timestamp
        requester: currentUser.uid, // Admin is the requester
        status: EventStatus.Approved, // Directly approved
        eventFormat, // Set based on logic
        isTeamEvent, // Set based on logic
        createdAt: Timestamp.now(),
        lastUpdatedAt: Timestamp.now(), // Set initial update timestamp
        // Initialize fields for a new approved event
        ratingsOpen: false,
        closed: false,
        ratingsOpenCount: 0,
        ratingsLastOpenedAt: null,
        completedAt: null,
        closedAt: null,
        winnersPerRole: {}, // Initialize as empty object
        xpAllocation: Array.isArray(eventData.xpAllocation) ? eventData.xpAllocation : [], // Ensure array
        organizationRatings: [], // Initialize as empty array
        submissions: [], // Initialize as empty array (for individual events)
        participants: [], // Initialize as empty array
        teams: [], // Initialize as empty array
        // Clear desired dates if they were somehow passed
        desiredStartDate: undefined, // Use undefined which gets removed by Firestore
        desiredEndDate: undefined,
        rejectionReason: undefined,
    };
    // **Placeholder Replacement End: finalData**

    if (isTeamEvent) {
        finalData.teams = Array.isArray(eventData.teams) ? eventData.teams.map(t => ({
            teamName: t.teamName?.trim() || 'Unnamed Team', members: Array.isArray(t.members) ? t.members.filter(Boolean) : [], submissions: [], ratings: []
        })) : [];
        finalData.participants = []; // Ensure participants is empty for team events
    } else {
        const allStudentUIDs: string[] = await dispatch('user/fetchAllStudentUIDs', null, { root: true }) || [];
        const organizerSet = new Set(organizers);
        // Assign all students except admin and organizers as participants
        finalData.participants = allStudentUIDs.filter(uid => uid !== currentUser.uid && !organizerSet.has(uid));
        finalData.teams = []; // Ensure teams is empty for individual events
    }

    try {
        // Firestore doesn't store undefined fields, cleaning is usually automatic
        const docRef = await addDoc(collection(db, 'events'), finalData);
        commit('addOrUpdateEvent', { id: docRef.id, ...finalData }); // Add complete data to local state
        return docRef.id;
    } catch (error: any) {
        console.error('Error creating event:', error);
        throw new Error(`Failed to create event: ${error.message || 'Unknown error'}`);
    }
}

// --- ACTION: Request Event (Non-Admin User) ---
export async function requestEvent({ commit, rootGetters }: ActionContext<EventState, RootState>, eventData: Partial<Event>): Promise<string> {
    if (!eventData.eventName?.trim()) throw new Error('Event Name required.');
    if (!eventData.desiredStartDate || !eventData.desiredEndDate) throw new Error('Desired dates required.');

    const currentUser: User | null = rootGetters['user/getUser'];
    if (!currentUser?.uid) throw new Error('User must be logged in.');

    try {
        const desiredStartDate = eventData.desiredStartDate instanceof Date ? Timestamp.fromDate(eventData.desiredStartDate) : eventData.desiredStartDate;
        const desiredEndDate = eventData.desiredEndDate instanceof Date ? Timestamp.fromDate(eventData.desiredEndDate) : eventData.desiredEndDate;
        if (!(desiredStartDate instanceof Timestamp) || !(desiredEndDate instanceof Timestamp)) throw new Error("Invalid desired dates.");
        if (desiredStartDate.toMillis() >= desiredEndDate.toMillis()) throw new Error("Desired end date must be after start.");

        const eventFormat = eventData.eventFormat ?? (eventData.isTeamEvent ? EventFormat.Team : EventFormat.Individual);
        const isTeamEvent = eventFormat === EventFormat.Team;

        // **Placeholder Replacement Start: requestPayload**
        const requestPayload: Partial<Event> = {
            // Core request data
            eventName: eventData.eventName.trim(),
            description: eventData.description || '', // Ensure description is present
            eventType: eventData.eventType || '', // Ensure eventType is present
            desiredStartDate,
            desiredEndDate,
            eventFormat,
            isTeamEvent, // Include isTeamEvent for clarity if needed downstream
            xpAllocation: Array.isArray(eventData.xpAllocation) ? eventData.xpAllocation : [], // Keep if provided
            teamSize: eventData.teamSize, // Keep if provided

            // System set fields for a request
            requester: currentUser.uid,
            status: EventStatus.Pending,
            createdAt: Timestamp.now(),
            lastUpdatedAt: Timestamp.now(), // Set initial update timestamp

            // Fields to explicitly initialize as empty/null for a request
            startDate: null,
            endDate: null,
            organizers: [],
            participants: [],
            teams: [], // Initialize teams array even for requests (can be modified if approved)
            submissions: [],
            ratings: [],
            organizationRatings: [],
            winnersPerRole: {},
            ratingsOpen: false,
            ratingsOpenCount: 0,
            ratingsLastOpenedAt: null,
            completedAt: null,
            closed: false,
            closedAt: null,
            rejectionReason: null,
        };
        // **Placeholder Replacement End: requestPayload**


        const docRef = await addDoc(collection(db, 'events'), requestPayload);
        commit('addOrUpdateEvent', { id: docRef.id, ...requestPayload });
        return docRef.id;
    } catch (error: any) {
        console.error('Error requesting event:', error);
        throw new Error(`Failed to submit request: ${error.message || 'Unknown error'}`);
    }
}

// --- ACTION: Approve Event Request (Admin Only) ---
export async function approveEventRequest({ dispatch, commit, rootGetters }: ActionContext<EventState, RootState>, eventId: string): Promise<void> {
    const currentUser: User | null = rootGetters['user/getUser'];
    if (currentUser?.role !== 'Admin') throw new Error('Unauthorized.');
    if (!eventId) throw new Error('Event ID required.');

    const eventRef = doc(db, 'events', eventId);
    try {
        const eventSnap = await getDoc(eventRef);
        if (!eventSnap.exists()) throw new Error('Request not found.');
        const eventData = eventSnap.data() as Event;

        if (eventData.status !== EventStatus.Pending) throw new Error('Only pending events approved.');
        if (!eventData.desiredStartDate || !eventData.desiredEndDate) throw new Error("Missing desired dates.");

        const conflictResult = await dispatch('checkDateConflict', { startDate: eventData.desiredStartDate, endDate: eventData.desiredEndDate, excludeEventId: eventId });
        if (conflictResult.hasConflict) throw new Error(`Approval failed: Date conflict with "${conflictResult.conflictingEvent?.eventName || 'another event'}".`);

        // **Placeholder Replacement Start: updates**
        const updates: Partial<Event> = {
            status: EventStatus.Approved,
            // Promote desired dates to actual dates
            startDate: eventData.desiredStartDate,
            endDate: eventData.desiredEndDate,
            // Clear desired dates using deleteField sentinel
            desiredStartDate: deleteField(),
            desiredEndDate: deleteField(),
            // Set last updated time
            lastUpdatedAt: Timestamp.now(),participants: [],
            teams: [],
            // Ensure other relevant fields are set for an approved event
            ratingsOpen: false, // Ratings start closed
            closed: false,      // Event is not closed
            completedAt: null,  // Not completed yet
            closedAt: null,     // Not closed yet
            rejectionReason: deleteField(), // Clear rejection reason if any
            organizers: [],
        };


        if (!eventData.isTeamEvent) {
            const allStudentUIDs: string[] = await dispatch('user/fetchAllStudentUIDs', null, { root: true }) || [];
            const requesterUid = eventData.requester;
            // Assign all students except requester and approving admin
            updates.participants = allStudentUIDs.filter(uid => uid !== requesterUid && uid !== currentUser?.uid);
            updates.teams = []; // Ensure teams is empty
        } else {
            // Initialize teams array based on request data, or empty if none provided
            updates.teams = (Array.isArray(eventData.teams) ? eventData.teams : []).map(team => ({
                teamName: team.teamName?.trim() || 'Unnamed Team', members: Array.isArray(team.members) ? team.members.filter(Boolean) : [], submissions: [], ratings: []
            }));
            if (updates.teams.length === 0) console.warn(`Approving team event ${eventId} with no teams defined.`);
            updates.participants = []; // Ensure participants is empty
        }

        await updateDoc(eventRef, updates);
        // Fetch fresh data to ensure local state reflects the cleared desired dates
        const freshSnap = await getDoc(eventRef);
        if(freshSnap.exists()) {
            // Use dispatch to the helper function defined in part2
            dispatch('updateLocalEvent', { id: eventId, changes: freshSnap.data() });
        }
    } catch (error: any) {
        console.error(`Error approving request ${eventId}:`, error);
        throw error;
    }
}

// --- ACTION: Reject Event Request (Admin Only) ---
export async function rejectEventRequest({ dispatch, rootGetters }: ActionContext<EventState, RootState>, { eventId, reason }: { eventId: string; reason?: string }): Promise<void> {
    const currentUser: User | null = rootGetters['user/getUser'];
    if (currentUser?.role !== 'Admin') throw new Error('Unauthorized.');
    if (!eventId) throw new Error('Event ID required.');

    try {
        const eventRef = doc(db, 'events', eventId);
        const eventSnap = await getDoc(eventRef);
        if (!eventSnap.exists()) throw new Error('Request not found.');
        if (eventSnap.data()?.status !== EventStatus.Pending) console.warn(`Rejecting non-pending event ${eventId}.`);

        const updates: Partial<Event> = {
            status: EventStatus.Rejected, rejectionReason: reason?.trim() || null, lastUpdatedAt: Timestamp.now(),
        };
        await updateDoc(eventRef, updates);
        // Use dispatch to the helper function defined in part2
        dispatch('updateLocalEvent', { id: eventId, changes: updates });
    } catch (error: any) {
        console.error(`Error rejecting request ${eventId}:`, error);
        throw error;
    }
}

// --- ACTION: Cancel Event (Admin or Organizer) ---
export async function cancelEvent({ dispatch, rootGetters }: ActionContext<EventState, RootState>, eventId: string): Promise<void> {
    if (!eventId) throw new Error('Event ID required.');
    const eventRef = doc(db, 'events', eventId);
    try {
        const eventSnap = await getDoc(eventRef);
        if (!eventSnap.exists()) throw new Error("Event not found.");
        const currentEvent = eventSnap.data() as Event;

        const currentUser: User | null = rootGetters['user/getUser'];
        const isAdmin = currentUser?.role === 'Admin';
        const isOrganizer = Array.isArray(currentEvent.organizers) && currentEvent.organizers.includes(currentUser?.uid ?? '');
        if (!isAdmin && !isOrganizer) throw new Error("Permission denied.");

        if (![EventStatus.Approved, EventStatus.InProgress].includes(currentEvent.status)) throw new Error(`Cannot cancel event with status '${currentEvent.status}'.`);

        const updates: Partial<Event> = { status: EventStatus.Cancelled, ratingsOpen: false, lastUpdatedAt: Timestamp.now() };
        await updateDoc(eventRef, updates);
        // Use dispatch to the helper function defined in part2
        dispatch('updateLocalEvent', { id: eventId, changes: updates });
    } catch (error: any) {
        console.error(`Error cancelling event ${eventId}:`, error);
        throw error;
    }
}

// --- ACTION: Update Event Status (Admin or Organizer) ---
export async function updateEventStatus({ dispatch, rootGetters }: ActionContext<EventState, RootState>, { eventId, newStatus }: { eventId: string; newStatus: EventStatus }): Promise<void> {
    const validStatuses = Object.values(EventStatus);
    if (!validStatuses.includes(newStatus)) throw new Error(`Invalid status: ${newStatus}.`);
    if (!eventId) throw new Error('Event ID required.');

    const eventRef = doc(db, 'events', eventId);
    try {
        const eventSnap = await getDoc(eventRef);
        if (!eventSnap.exists()) throw new Error("Event not found.");
        const currentEvent = eventSnap.data() as Event;

        const currentUser: User | null = rootGetters['user/getUser'];
        const isAdmin = currentUser?.role === 'Admin';
        const isOrganizer = Array.isArray(currentEvent.organizers) && currentEvent.organizers.includes(currentUser?.uid ?? '');
        if (!isAdmin && !isOrganizer) throw new Error("Permission denied.");

        const updates: Partial<Event> = { status: newStatus, lastUpdatedAt: Timestamp.now() };

        switch (newStatus) {
            case EventStatus.InProgress:
                if (currentEvent.status !== EventStatus.Approved) throw new Error("Must be 'Approved' to start.");
                updates.ratingsOpen = false;
                break;
            case EventStatus.Completed:
                if (currentEvent.status !== EventStatus.InProgress) throw new Error("Must be 'In Progress' to complete.");
                updates.ratingsOpen = false;
                updates.completedAt = Timestamp.now();
                break;
            case EventStatus.Cancelled:
                await dispatch('cancelEvent', eventId); return; // Use specific action
            case EventStatus.Approved: // Re-approving
                if (!isAdmin) throw new Error("Only Admins can re-approve.");
                if (currentEvent.status !== EventStatus.Cancelled) throw new Error(`Can only re-approve 'Cancelled' events.`);
                if (!currentEvent.startDate || !currentEvent.endDate) throw new Error("Missing dates.");
                const conflictResult = await dispatch('checkDateConflict', { startDate: currentEvent.startDate, endDate: currentEvent.endDate, excludeEventId: eventId });
                if (conflictResult.hasConflict) throw new Error(`Re-approve failed: Date conflict with "${conflictResult.conflictingEvent?.eventName || 'another event'}".`);
                updates.completedAt = null; updates.closed = false; updates.closedAt = null; updates.rejectionReason = null;
                break;
            case EventStatus.Pending: case EventStatus.Rejected:
                throw new Error(`Changing status to '${newStatus}' not supported here.`);
        }

        await updateDoc(eventRef, updates);
        // Use dispatch to the helper function defined in part2
        dispatch('updateLocalEvent', { id: eventId, changes: updates });
    } catch (error: any) {
        console.error(`Error updating status to ${newStatus}:`, error);
        throw error;
    }
}