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
    deleteField,
    serverTimestamp,
    FieldValue
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
import { DateTime, Interval } from 'luxon';

// --- Helper: Validate Organizers ---
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
            return dt.startOf('day');
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

    const timeSlot = Interval.fromDateTimes(checkStartLuxon, checkEndLuxon);

    const isInterval = (date: Interval | DateTime): date is Interval => {
        return 'overlaps' in date;
    };

    for (const docSnap of querySnapshot.docs) {
        const event = { id: docSnap.id, ...docSnap.data() } as Event;
        if (excludeEventId && docSnap.id === excludeEventId) continue;
        if (!event.startDate || !event.endDate) continue;

        try {
            const eventStartLuxon = DateTime.fromJSDate(event.startDate.toDate()).startOf('day');
            const eventEndLuxon = DateTime.fromJSDate(event.endDate.toDate()).startOf('day');
            if (!eventStartLuxon.isValid || !eventEndLuxon.isValid) continue;

            const eventInterval = eventStartLuxon.until(eventEndLuxon.endOf('day'));
            if (isInterval(eventInterval) && isInterval(timeSlot) && eventInterval.overlaps(timeSlot)) {
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

    const finalData: Partial<Event> = {
        ...eventData,
        eventName: eventData.eventName.trim(),
        organizers,
        startDate,
        endDate,
        requester: currentUser.uid,
        status: EventStatus.Approved,
        eventFormat,
        isTeamEvent,
        createdAt: Timestamp.now(),
        lastUpdatedAt: Timestamp.now(),
        ratingsOpen: false,
        closed: false,
        ratingsOpenCount: 0,
        ratingsLastOpenedAt: null,
        completedAt: null,
        closedAt: null,
        winnersPerRole: {},
        xpAllocation: Array.isArray(eventData.xpAllocation) ? eventData.xpAllocation : [],
        organizationRatings: [],
        submissions: [],
        participants: [],
        teams: [],
        desiredStartDate: undefined,
        desiredEndDate: undefined,
        rejectionReason: undefined,
    };

    if (isTeamEvent) {
        finalData.teams = Array.isArray(eventData.teams) ? eventData.teams.map(t => ({
            teamName: t.teamName?.trim() || 'Unnamed Team', members: Array.isArray(t.members) ? t.members.filter(Boolean) : [], submissions: [], ratings: []
        })) : [];
        finalData.participants = [];
    } else {
        const allStudentUIDs: string[] = await dispatch('user/fetchAllStudentUIDs', null, { root: true }) || [];
        const organizerSet = new Set(organizers);
        finalData.participants = allStudentUIDs.filter(uid => uid !== currentUser.uid && !organizerSet.has(uid));
        finalData.teams = [];
    }

    try {
        const docRef = await addDoc(collection(db, 'events'), finalData);
        commit('addOrUpdateEvent', { id: docRef.id, ...finalData });
        return docRef.id;
    } catch (error: any) {
        console.error('Error creating event:', error);
        throw new Error(`Failed to create event: ${error.message || 'Unknown error'}`);
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

        const updates: Partial<Event> = {
            status: EventStatus.Approved,
            startDate: eventData.desiredStartDate,
            endDate: eventData.desiredEndDate,
            desiredStartDate: deleteField(),
            desiredEndDate: deleteField(),
            lastUpdatedAt: serverTimestamp() as unknown as Timestamp,
            participants: [],
            teams: [],
            ratingsOpen: false,
            closed: false,
            completedAt: null,
            closedAt: null,
            rejectionReason: deleteField(),
            organizers: [],
        };

        if (!eventData.isTeamEvent) {
            const allStudentUIDs: string[] = await dispatch('user/fetchAllStudentUIDs', null, { root: true }) || [];
            const requesterUid = eventData.requester;
            updates.participants = allStudentUIDs.filter(uid => uid !== requesterUid && uid !== currentUser?.uid);
            updates.teams = [];
        } else {
            updates.teams = (Array.isArray(eventData.teams) ? eventData.teams : []).map(team => ({
                teamName: team.teamName?.trim() || 'Unnamed Team', members: Array.isArray(team.members) ? team.members.filter(Boolean) : [], submissions: [], ratings: []
            }));
            if (updates.teams.length === 0) console.warn(`Approving team event ${eventId} with no teams defined.`);
            updates.participants = [];
        }

        await updateDoc(eventRef, updates);
        const freshSnap = await getDoc(eventRef);
        if (freshSnap.exists()) {
            dispatch('updateLocalEvent', { id: eventId, changes: freshSnap.data() });
        }
    } catch (error: any) {
        console.error(`Error approving request ${eventId}:`, error);
        throw error;
    }
}