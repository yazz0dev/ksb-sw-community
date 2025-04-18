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
    where
} from 'firebase/firestore';
import {
    EventStatus,
    EventState,
    Event
} from '@/types/event';
import { RootState } from '@/store/types';
import { User } from '@/types/user';
import { DateTime } from 'luxon'; // For date comparisons
import { Functions } from 'appwrite';

// --- Appwrite/SendPulse Integration START ---
import { functions, isAppwriteConfigured } from '@/appwrite';
// --- Appwrite/SendPulse Integration END ---

// Define EventFormat enum if not globally available/imported
enum EventFormat { Individual = 'Individual', Team = 'Team' }

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

// --- Helper: Update Local State (defined in part2, but needed here) ---
// We'll call dispatch('updateLocalEvent', ...) assuming it's defined in another part
// Or, define it here if preferred, but keep it consistent. Let's assume it's in part2.


// --- ACTION: Check if current user has existing pending/active requests ---
export async function checkExistingRequests({ rootGetters }: ActionContext<EventState, RootState>): Promise<boolean> {
    const currentUser: User | null = rootGetters['user/getUser'];
    if (!currentUser?.uid) return false;

    const q = query(
        collection(db, 'events'),
        where('requestedBy', '==', currentUser.uid),
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
        if (!event.details?.date?.final?.start || !event.details?.date?.final?.end) continue;

        try {
            const eventStartLuxon = DateTime.fromJSDate(event.details.date.final.start.toDate()).startOf('day');
            const eventEndLuxon = DateTime.fromJSDate(event.details.date.final.end.toDate()).startOf('day');
            if (!eventStartLuxon.isValid || !eventEndLuxon.isValid) continue;

            // Use Interval for overlap check
            const { Interval } = require('luxon');
            const checkInterval = Interval.fromDateTimes(checkStartLuxon, checkEndLuxon.endOf('day'));
            const eventInterval = Interval.fromDateTimes(eventStartLuxon, eventEndLuxon.endOf('day'));
            if (checkInterval.overlaps(eventInterval)) {
                conflictingEvent = event;
                break;
            }
        } catch (dateError: any) {
            console.warn(`Skipping event ${docSnap.id} in conflict check (date issue):`, dateError.message);
        }
    }

    const nextAvailableDate = conflictingEvent?.details?.date?.final?.end
        ? DateTime.fromJSDate(conflictingEvent.details.date.final.end.toDate()).plus({ days: 1 }).toJSDate()
        : null;

    return { hasConflict: !!conflictingEvent, nextAvailableDate, conflictingEvent };
}

// --- ACTION: Create Event (Admin Only - Request Flow Preferred) ---
export async function createEvent({ rootGetters, commit, dispatch }: ActionContext<EventState, RootState>, eventData: Partial<Event>): Promise<string> {
    const currentUser: User | null = rootGetters['user/getUser'];
    if (currentUser?.role !== 'Admin') throw new Error('Unauthorized: Only Admins can create events directly.');
    if (!currentUser?.uid) throw new Error('Admin user UID is missing.');

    if (!eventData.details?.date?.final?.start || !eventData.details?.date?.final?.end) throw new Error("Admin event creation requires valid start and end dates.");

    // --- Always include the requesting user as organizer ---
    let organizers: string[] = Array.isArray(eventData.details?.organizers) ? eventData.details.organizers.filter(Boolean) : [];
    if (!organizers.includes(currentUser.uid)) organizers.unshift(currentUser.uid);
    if (organizers.length === 0) throw new Error("At least one organizer is required.");
    if (organizers.length > 5) throw new Error("Max 5 organizers.");
    await validateOrganizersNotAdmin(organizers);

    const startDate = eventData.details.date.final.start;
    const endDate = eventData.details.date.final.end;
    if (!(startDate instanceof Timestamp) || !(endDate instanceof Timestamp)) throw new Error("Invalid date format.");
    if (startDate.toMillis() >= endDate.toMillis()) throw new Error("End date must be after start date.");
    if (startDate.toMillis() <= Timestamp.now().toMillis()) console.warn("Admin creating event starting in past/present.");

    const conflictResult = await dispatch('checkDateConflict', { startDate, endDate, excludeEventId: null });
    if (conflictResult.hasConflict) throw new Error(`Creation failed: Date conflict with ${conflictResult.conflictingEvent?.details?.type || 'another event'}.`);

    const eventFormat = eventData.details.format;

    const finalData: Partial<Event> = {
        ...eventData,
        details: {
            ...eventData.details,
            organizers,
        },
        requestedBy: currentUser.uid,
        status: EventStatus.Approved,
        createdAt: Timestamp.now(),
        lastUpdatedAt: Timestamp.now(),
    };

    try {
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
    if (!eventData.details?.date?.desired?.start || !eventData.details?.date?.desired?.end) throw new Error('Desired dates required.');

    const currentUser: User | null = rootGetters['user/getUser'];
    if (!currentUser?.uid) throw new Error('User must be logged in.');

    try {
        const desiredStartDate = eventData.details.date.desired.start;
        const desiredEndDate = eventData.details.date.desired.end;
        if (!(desiredStartDate instanceof Timestamp) || !(desiredEndDate instanceof Timestamp)) throw new Error("Invalid desired dates.");
        if (desiredStartDate.toMillis() >= desiredEndDate.toMillis()) throw new Error("Desired end date must be after start.");

        const eventFormat = eventData.details.format;

        // --- Always include the requesting user as organizer ---
        let organizers: string[] = Array.isArray(eventData.details.organizers) ? eventData.details.organizers.filter(Boolean) : [];
        if (!organizers.includes(currentUser.uid)) organizers.unshift(currentUser.uid);

        const requestPayload: Partial<Event> = {
            details: {
                organizers,
                description: eventData.details.description || '',
                type: eventData.details.type || '',
                format: eventFormat,
                date: {
                    desired: {
                        start: desiredStartDate,
                        end: desiredEndDate
                    },
                    final: {
                        start: null,
                        end: null
                    }
                }
            },
            requestedBy: currentUser.uid,
            status: EventStatus.Pending,
            createdAt: Timestamp.now(),
            lastUpdatedAt: Timestamp.now(),
        };

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
    let fetchedEventData: Event | null = null; // To store data for notification

    try {
        const eventSnap = await getDoc(eventRef);
        if (!eventSnap.exists()) throw new Error('Request not found.');
        const eventData = eventSnap.data() as Event;

        if (eventData.status !== EventStatus.Pending) throw new Error('Only pending events approved.');
        if (!eventData.details?.date?.desired?.start || !eventData.details?.date?.desired?.end) throw new Error("Missing desired dates.");

        const conflictResult = await dispatch('checkDateConflict', { startDate: eventData.details.date.desired.start, endDate: eventData.details.date.desired.end, excludeEventId: eventId });
        if (conflictResult.hasConflict) throw new Error(`Approval failed: Date conflict with "${conflictResult.conflictingEvent?.details?.type || 'another event'}".`);

        const updates: Partial<Event> = {
            status: EventStatus.Approved,
            lastUpdatedAt: Timestamp.now(),
            details: {
                ...eventData.details,
                date: {
                    ...eventData.details.date,
                    final: { // Set final dates from desired on approval
                        start: eventData.details.date.desired.start,
                        end: eventData.details.date.desired.end,
                    }
                }
            }
        };

        await updateDoc(eventRef, updates);

        // Fetch fresh data for local state update and notification payload
        const freshSnap = await getDoc(eventRef);
        if (freshSnap.exists()) {
            fetchedEventData = { ...freshSnap.data() } as Event;
            if (!('id' in fetchedEventData)) {
                (fetchedEventData as any).id = eventId;
            }
            dispatch('updateLocalEvent', { id: eventId, changes: fetchedEventData }); // Update local store with full fresh data
        }

        // --- Appwrite/SendPulse Integration START ---
        if (isAppwriteConfigured() && fetchedEventData && fetchedEventData.requestedBy) {
            try {
                const targetUserIds = [fetchedEventData.requestedBy]; // Notify only the requester
                const notificationPayload = {
                    notificationType: 'eventApproved',
                    targetUserIds: targetUserIds,
                    messageTitle: `Event Approved: ${fetchedEventData.details?.type || 'Event'}`,
                    messageBody: `Your event request "${fetchedEventData.details?.type || 'Event'}" has been approved! Check the event details.`,
                    eventUrl: `/event/${eventId}`, // Relative URL for frontend link
                    eventName: fetchedEventData.details?.type || 'Unnamed Event',
                };

                console.log("Triggering push notification for event approval:", notificationPayload);
                await functions.createExecution(
                    'triggerSendPulsePush', // Ensure this matches your function name/ID
                    JSON.stringify(notificationPayload),
                    false // Async execution
                );
                console.log(`Push notification trigger attempted for event approval ${eventId}.`);

            } catch (pushError) {
                console.error(`Failed to trigger push notification for event approval ${eventId}:`, pushError);
                // Log error but don't fail the main action
            }
        }
        // --- Appwrite/SendPulse Integration END ---

    } catch (error: any) {
        console.error(`Error approving request ${eventId}:`, error);
        throw error; // Re-throw original error
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
    let fetchedEventData: Event | null = null; // To store data for notification

    try {
        const eventSnap = await getDoc(eventRef);
        if (!eventSnap.exists()) throw new Error("Event not found.");
        fetchedEventData = { id: eventId, ...eventSnap.data() } as Event;

        const currentUser: User | null = rootGetters['user/getUser'];
        const isAdmin = currentUser?.role === 'Admin';
        const isOrganizer = Array.isArray(fetchedEventData.details?.organizers) && fetchedEventData.details.organizers.includes(currentUser?.uid ?? '');
        if (!isAdmin && !isOrganizer) throw new Error("Permission denied.");

        if (![EventStatus.Approved, EventStatus.InProgress].includes(fetchedEventData.status as EventStatus)) throw new Error(`Cannot cancel event with status '${fetchedEventData.status}'.`);

        const updates: Partial<Event> = { status: EventStatus.Cancelled, lastUpdatedAt: Timestamp.now() };
        await updateDoc(eventRef, updates);
        dispatch('updateLocalEvent', { id: eventId, changes: updates });

        // --- Appwrite/SendPulse Integration START ---
        if (isAppwriteConfigured() && fetchedEventData) {
            try {
                // Notify organizers and participants/team members
                const organizers = fetchedEventData.details?.organizers || [];
                const participants = fetchedEventData.participants || [];
                const teamMembers = (fetchedEventData.teams || []).flatMap(t => t.members || []);
                const targetUserIds = [...new Set([...organizers, ...participants, ...teamMembers])].filter(Boolean); // Unique, non-empty IDs

                if (targetUserIds.length > 0) {
                    const notificationPayload = {
                        notificationType: 'eventCancelled',
                        targetUserIds: targetUserIds,
                        messageTitle: `Event Cancelled: ${fetchedEventData.details?.type || 'Event'}`,
                        messageBody: `The event "${fetchedEventData.details?.type || 'Event'}" has been cancelled.`,
                        eventUrl: `/event/${eventId}`,
                        eventName: fetchedEventData.details?.type || 'Unnamed Event',
                    };

                    console.log("Triggering push notification for event cancellation:", notificationPayload);
                    await functions.createExecution(
                        'triggerSendPulsePush',
                        JSON.stringify(notificationPayload),
                        false
                    );
                    console.log(`Push notification trigger attempted for event cancellation ${eventId}.`);
                }
            } catch (pushError) {
                console.error(`Failed to trigger push notification for event cancellation ${eventId}:`, pushError);
            }
        }
        // --- Appwrite/SendPulse Integration END ---

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
    let fetchedEventData: Event | null = null; // To store data for notification

    try {
        const eventSnap = await getDoc(eventRef);
        if (!eventSnap.exists()) throw new Error("Event not found.");
        const currentEvent = eventSnap.data() as Event;
        fetchedEventData = { ...currentEvent };
        if (!('id' in fetchedEventData)) {
            (fetchedEventData as any).id = eventId;
        }

        const currentUser: User | null = rootGetters['user/getUser'];
        const isAdmin = currentUser?.role === 'Admin';
        const isOrganizer = Array.isArray(currentEvent.details?.organizers) && currentEvent.details.organizers.includes(currentUser?.uid ?? '');
        if (!isAdmin && !isOrganizer) throw new Error("Permission denied.");

        const updates: Partial<Event> = { status: newStatus, lastUpdatedAt: Timestamp.now() };
        let notificationType: string | null = null;
        let notificationTitle: string = '';
        let notificationBody: string = '';
        let targetUserIds: string[] = [];

        switch (newStatus) {
            case EventStatus.InProgress:
                if (currentEvent.status !== EventStatus.Approved) throw new Error("Must be 'Approved' to start.");
                // Optional: Notify participants that event started
                notificationType = 'eventStarted';
                notificationTitle = `Event Started: ${currentEvent.details?.type || 'Event'}`;
                notificationBody = `The event "${currentEvent.details?.type || 'Event'}" is now in progress!`;
                break;
            case EventStatus.Completed:
                if (currentEvent.status !== EventStatus.InProgress) throw new Error("Must be 'In Progress' to complete.");
                updates.completedAt = Timestamp.now();
                 // Notify participants that event is completed and ratings might be open
                notificationType = 'eventCompleted';
                notificationTitle = `Event Completed: ${currentEvent.details?.type || 'Event'}`;
                notificationBody = `"${currentEvent.details?.type || 'Event'}" has finished. Ratings may be open soon.`;
                break;
            case EventStatus.Cancelled:
                await dispatch('cancelEvent', eventId); return; // Use specific action (handles notification)
            case EventStatus.Approved: // Re-approving
                if (!isAdmin) throw new Error("Only Admins can re-approve.");
                if (currentEvent.status !== EventStatus.Cancelled) throw new Error(`Can only re-approve 'Cancelled' events.`);
                if (!currentEvent.details?.date?.final?.start || !currentEvent.details?.date?.final?.end) throw new Error("Missing dates.");
                const conflictResult = await dispatch('checkDateConflict', { startDate: currentEvent.details.date.final.start, endDate: currentEvent.details.date.final.end, excludeEventId: eventId });
                if (conflictResult.hasConflict) throw new Error(`Re-approve failed: Date conflict with "${(conflictResult.conflictingEvent?.details?.type as string) || 'another event'}".`);
                 // Notify requester about re-approval
                 notificationType = 'eventReApproved';
                 notificationTitle = `Event Re-Approved: ${currentEvent.details?.type || 'Event'}`;
                 notificationBody = `The cancelled event "${currentEvent.details?.type || 'Event'}" has been re-approved.`;
                break;
            case EventStatus.Pending: case EventStatus.Rejected:
                throw new Error(`Changing status to '${newStatus}' not supported here.`);
        }

        await updateDoc(eventRef, updates);
        // Update local state with the specific changes applied
        dispatch('updateLocalEvent', { id: eventId, changes: updates });

        // --- Appwrite/SendPulse Integration START ---
        if (isAppwriteConfigured() && notificationType && fetchedEventData) {
             try {
                // Determine targets based on notification type
                const organizers = fetchedEventData.details?.organizers || [];
                const participants = fetchedEventData.participants || [];
                const teamMembers = (fetchedEventData.teams || []).flatMap(t => t.members || []);

                if (notificationType === 'eventReApproved' && fetchedEventData.requestedBy) {
                    targetUserIds = [fetchedEventData.requestedBy];
                } else if (notificationType === 'eventStarted' || notificationType === 'eventCompleted') {
                     targetUserIds = [...new Set([...organizers, ...participants, ...teamMembers])].filter(Boolean);
                }

                if (targetUserIds.length > 0) {
                    const notificationPayload = {
                        notificationType: notificationType,
                        targetUserIds: targetUserIds,
                        messageTitle: notificationTitle,
                        messageBody: notificationBody,
                        eventUrl: `/event/${eventId}`,
                        eventName: fetchedEventData.details?.type || 'Unnamed Event',
                    };
                    console.log(`Triggering push notification for status update (${newStatus}):`, notificationPayload);
                    await functions.createExecution(
                        'triggerSendPulsePush',
                        JSON.stringify(notificationPayload),
                        false
                    );
                    console.log(`Push notification trigger attempted for status update ${eventId}.`);
                }
            } catch (pushError) {
                console.error(`Failed to trigger push notification for status update ${eventId}:`, pushError);
            }
        }
        // --- Appwrite/SendPulse Integration END ---

    } catch (error: any) {
        console.error(`Error updating status to ${newStatus}:`, error);
        throw error;
    }
}