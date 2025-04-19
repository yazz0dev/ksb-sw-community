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
    Event,
    EventFormat // Import EventFormat from event.ts
} from '@/types/event';
import { RootState } from '@/types/store';
import { User } from '@/types/user';
import { DateTime } from 'luxon'; // For date comparisons
import { invokePushNotification, isSupabaseConfigured } from '@/notifications';

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
        if (!event.details?.date?.start || !event.details?.date?.end) continue;

        try {
            const eventStartLuxon = DateTime.fromJSDate(event.details.date.start.toDate()).startOf('day');
            const eventEndLuxon = DateTime.fromJSDate(event.details.date.end.toDate()).startOf('day');
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

    const nextAvailableDate = conflictingEvent?.details?.date?.end
        ? DateTime.fromJSDate(conflictingEvent.details.date.end.toDate()).plus({ days: 1 }).toJSDate()
        : null;

    return { hasConflict: !!conflictingEvent, nextAvailableDate, conflictingEvent };
}



// --- ACTION: Request Event (Non-Admin User) ---
export async function requestEvent({ commit, rootGetters, dispatch }: ActionContext<EventState, RootState>, initialData: Partial<Event>): Promise<string> {
    const currentUser: User | null = rootGetters['user/getUser'];
    if (!currentUser?.uid) throw new Error('User must be logged in.');
    if (!initialData.details?.date?.start || !initialData.details?.date?.end) {
        throw new Error('Event dates required.');
    }

    try {
        const startDate = initialData.details.date.start;
        const endDate = initialData.details.date.end;
        if (!(startDate instanceof Timestamp) || !(endDate instanceof Timestamp)) {
            throw new Error("Invalid date format.");
        }
        if (startDate.toMillis() > endDate.toMillis()) {
            throw new Error("End date must be after start date.");
        }

        const eventFormat = initialData.details.format;
        let organizers: string[] = Array.isArray(initialData.details.organizers) 
            ? initialData.details.organizers.filter(Boolean) 
            : [];
        if (!organizers.includes(currentUser.uid)) {
            organizers.unshift(currentUser.uid);
        }

        const requestPayload: Partial<Event> = {
            ...initialData, // Spread all form fields first (should not include top-level eventName/type anymore)
            details: {
                ...initialData.details,
                organizers,
                eventName: initialData.details?.eventName || '',
                description: initialData.details?.description || '',
                type: initialData.details?.type || '',
                format: eventFormat,
                date: {
                    start: initialData.details?.date?.start || null,
                    end: initialData.details?.date?.end || null
                }
            },
            criteria: Array.isArray(initialData.criteria) ? initialData.criteria : [],
            teams: Array.isArray(initialData.teams) ? initialData.teams : [],
            participants: Array.isArray(initialData.participants) ? initialData.participants : [],
            requestedBy: currentUser.uid,
            ratingsOpen: false, // Always include ratingsOpen
            status: EventStatus.Pending,
            createdAt: Timestamp.now(),
            lastUpdatedAt: Timestamp.now(),
        };

        const docRef = await addDoc(collection(db, 'events'), requestPayload);
        // Ensure 'id' is not present in requestPayload to avoid duplicate assignment
        const { id: _discardedId, ...payloadWithoutId } = requestPayload as any;
        const eventData = { id: docRef.id, ...payloadWithoutId };

        commit('addOrUpdateEvent', eventData);

        // --- Trigger Push Notification to Admins START ---
        if (isSupabaseConfigured()) {
            try {
                // Fetch all admins (assumes 'users' collection has role field)
                const adminsQuery = query(collection(db, 'users'), where('role', '==', 'Admin'));
                const adminsSnap = await getDocs(adminsQuery);
                const adminUids = adminsSnap.docs.map(doc => doc.id).filter(id => id !== currentUser.uid);
                if (adminUids.length > 0) {
                    const functionPayload = {
                        notificationType: 'eventRequested',
                        targetUserIds: adminUids,
                        eventId: docRef.id,
                        messageTitle: `New Event Request: ${initialData.details?.type || 'Event'}`,
                        messageBody: `${currentUser.name || 'A user'} has requested a new event: "${initialData.details?.type || 'Event'}".`,
                        eventUrl: `/event/${docRef.id}`,
                    };
                    console.log("Triggering Supabase Edge Function for event request:", functionPayload);
                    await invokePushNotification(functionPayload);
                    console.log(`Supabase Edge Function execution triggered for event request ${docRef.id}.`);
                }
            } catch (pushError) {
                console.error(`Failed to trigger Supabase function for event request:`, pushError);
                dispatch('notification/showNotification', {
                    message: 'Event requested, but failed to notify admins.',
                    type: 'warning'
                }, { root: true });
            }
        }
        // --- Trigger Push Notification to Admins END ---

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
        fetchedEventData = { id: eventId, ...eventSnap.data() } as Event; // Get data before update

        if (fetchedEventData.status !== EventStatus.Pending) throw new Error('Only pending events approved.');
        if (!fetchedEventData.details?.date?.start || !fetchedEventData.details?.date?.end) {
            throw new Error("Missing event dates.");
        }

        const conflictResult = await dispatch('checkDateConflict', { 
            startDate: fetchedEventData.details.date.start, 
            endDate: fetchedEventData.details.date.end, 
            excludeEventId: eventId 
        });

        if (conflictResult.hasConflict) {
            throw new Error(`Approval failed: Date conflict with "${conflictResult.conflictingEvent?.details?.type || 'another event'}".`);
        }

        // --- Perform Firestore Update ---
        const updates: Partial<Event> = {
            status: EventStatus.Approved,
            lastUpdatedAt: Timestamp.now(),
            details: {
                ...fetchedEventData.details,
                date: {
                    start: fetchedEventData.details.date.start,
                    end: fetchedEventData.details.date.end
                }
            }
        };
        await updateDoc(eventRef, updates);
        // --- End Firestore Update ---

        // Update local state
        dispatch('updateLocalEvent', { id: eventId, changes: updates });

        // --- Trigger Push Notification START ---
        if (isSupabaseConfigured() && fetchedEventData?.requestedBy) {
            try {
                const targetUserIds = [fetchedEventData.requestedBy];

                if (targetUserIds.length > 0) {
                    const functionPayload = {
                        notificationType: 'eventApproved',
                        targetUserIds: targetUserIds,
                        eventId: eventId,
                        messageTitle: `Event Approved: ${fetchedEventData.details?.type || 'Event'}`,
                        messageBody: `Your event request "${fetchedEventData.details?.type || 'Event'}" has been approved!`,
                        eventUrl: `/event/${eventId}`,
                    };

                    console.log("Triggering Supabase Edge Function for event approval:", functionPayload);

                    await invokePushNotification(functionPayload);

                    console.log(`Supabase Edge Function execution triggered for event approval ${eventId}.`);
                } else {
                    console.log("No target user ID found for approval notification.");
                }

            } catch (pushError) {
                console.error(`Failed to trigger Supabase function for event approval ${eventId}:`, pushError);
                dispatch('notification/showNotification', {
                    message: 'Event approved, but notification failed to send.',
                    type: 'warning'
                }, { root: true });
            }
        }
        // --- Trigger Push Notification END ---

    } catch (error: any) {
        console.error(`Error approving request ${eventId}:`, error);
         dispatch('notification/showNotification', {
             message: `Failed to approve request: ${error.message || 'Unknown error'}`,
             type: 'error'
         }, { root: true });
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

        // --- Trigger Push Notification to requester START ---
        if (isSupabaseConfigured()) {
            try {
                const eventData = eventSnap.data() as Event;
                const requesterUid = eventData.requestedBy;
                if (requesterUid && requesterUid !== currentUser.uid) {
                    const functionPayload = {
                        notificationType: 'eventRejected',
                        targetUserIds: [requesterUid],
                        eventId: eventId,
                        messageTitle: `Event Request Rejected: ${eventData.details?.type || 'Event'}`,
                        messageBody: `Your event request "${eventData.details?.type || 'Event'}" was rejected.${reason ? ' Reason: ' + reason : ''}`,
                        eventUrl: `/event/${eventId}`,
                    };
                    console.log("Triggering Supabase Edge Function for event rejection:", functionPayload);
                    await invokePushNotification(functionPayload);
                    console.log(`Supabase Edge Function execution triggered for event rejection ${eventId}.`);
                }
            } catch (pushError) {
                console.error(`Failed to trigger Supabase function for event rejection ${eventId}:`, pushError);
                dispatch('notification/showNotification', {
                    message: 'Event rejected, but failed to notify requester.',
                    type: 'warning'
                }, { root: true });
            }
        }
        // --- Trigger Push Notification to requester END ---

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

        // --- Push Notification Trigger START ---
        if (isSupabaseConfigured() && fetchedEventData) {
            try {
                // Determine target users
                const organizers = fetchedEventData.details?.organizers || [];
                const participants = fetchedEventData.participants || [];
                const teamMembers = (fetchedEventData.teams || []).flatMap(t => t.members || []);
                const targetUserIds = [...new Set([...organizers, ...participants, ...teamMembers])]
                    .filter(Boolean)
                    .filter(id => id !== currentUser?.uid); // Don't notify the user who cancelled

                if (targetUserIds.length > 0) {
                    const functionPayload = {
                        notificationType: 'eventCancelled',
                        targetUserIds: targetUserIds,
                        eventId: eventId,
                        messageTitle: `Event Cancelled: ${fetchedEventData.details?.type || 'Event'}`,
                        messageBody: `The event "${fetchedEventData.details?.type || 'Event'}" has been cancelled.`,
                        eventUrl: `/event/${eventId}`,
                    };

                    console.log("Triggering Supabase Edge Function for event cancellation:", functionPayload);

                    await invokePushNotification(functionPayload);

                    console.log(`Supabase Edge Function execution triggered for event cancellation ${eventId}.`);
                }
            } catch (pushError) {
                console.error(`Failed to trigger Supabase function for event cancellation ${eventId}:`, pushError);
                 dispatch('notification/showNotification', {
                     message: 'Event cancelled, but failed to send notification.',
                     type: 'warning'
                 }, { root: true });
            }
        }
        // --- Push Notification Trigger END ---

    } catch (error: any) {
        console.error(`Error cancelling event ${eventId}:`, error);
         dispatch('notification/showNotification', {
             message: `Failed to cancel event: ${error.message || 'Unknown error'}`,
             type: 'error'
         }, { root: true });
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
        // Prevent duplicate 'id' assignment
        const { id: _discardedId, ...eventWithoutId } = currentEvent as any;
        fetchedEventData = { id: eventId, ...eventWithoutId }; // Store data before update

        const currentUser: User | null = rootGetters['user/getUser'];
        const isAdmin = currentUser?.role === 'Admin';
        const isOrganizer = Array.isArray(currentEvent.details?.organizers) && currentEvent.details.organizers.includes(currentUser?.uid ?? '');
        if (!isAdmin && !isOrganizer) throw new Error("Permission denied.");

        const updates: Partial<Event> = { status: newStatus, lastUpdatedAt: Timestamp.now() };
        let notificationType: string | null = null;
        let notificationTitle: string = '';
        let notificationBody: string = '';
        let targetUserIds: string[] = [];

        // Define participants/organizers early
        const organizers = currentEvent.details?.organizers || [];
        const participants = currentEvent.participants || [];
        const teamMembers = (currentEvent.teams || []).flatMap(t => t.members || []);
        const allInvolved = [...new Set([...organizers, ...participants, ...teamMembers])]
                            .filter(Boolean)
                            .filter(id => id !== currentUser?.uid); // Exclude self


        switch (newStatus) {
            case EventStatus.InProgress:
                if (currentEvent.status !== EventStatus.Approved) throw new Error("Must be 'Approved' to start.");
                notificationType = 'eventStarted';
                notificationTitle = `Event Started: ${currentEvent.details?.type || 'Event'}`;
                notificationBody = `The event "${currentEvent.details?.type || 'Event'}" is now in progress!`;
                targetUserIds = allInvolved;
                break;
            case EventStatus.Completed:
                if (currentEvent.status !== EventStatus.InProgress) throw new Error("Must be 'In Progress' to complete.");
                updates.completedAt = Timestamp.now();
                notificationType = 'eventCompleted';
                notificationTitle = `Event Completed: ${currentEvent.details?.type || 'Event'}`;
                notificationBody = `"${currentEvent.details?.type || 'Event'}" has finished. Ratings may be open soon.`;
                targetUserIds = allInvolved;
                break;
            case EventStatus.Cancelled:
                // Use the dedicated cancelEvent action which handles its own notification
                await dispatch('cancelEvent', eventId);
                return; // Exit early as cancelEvent handles everything
            case EventStatus.Approved: // Re-approving
                if (!isAdmin) throw new Error("Only Admins can re-approve.");
                if (currentEvent.status !== EventStatus.Cancelled) throw new Error(`Can only re-approve 'Cancelled' events.`);
                if (!currentEvent.details?.date?.start || !currentEvent.details?.date?.end) throw new Error("Missing dates.");
                const conflictResult = await dispatch('checkDateConflict', { startDate: currentEvent.details.date.start, endDate: currentEvent.details.date.end, excludeEventId: eventId });
                if (conflictResult.hasConflict) throw new Error(`Re-approve failed: Date conflict with "${(conflictResult.conflictingEvent?.details?.type as string) || 'another event'}".`);
                notificationType = 'eventReApproved';
                notificationTitle = `Event Re-Approved: ${currentEvent.details?.type || 'Event'}`;
                notificationBody = `The cancelled event "${currentEvent.details?.type || 'Event'}" has been re-approved.`;
                targetUserIds = currentEvent.requestedBy ? [currentEvent.requestedBy] : []; // Only notify requester
                break;
            case EventStatus.Pending: case EventStatus.Rejected:
                throw new Error(`Changing status to '${newStatus}' not supported here.`);
        }

        // --- Perform Firestore Update ---
        await updateDoc(eventRef, updates);
        dispatch('updateLocalEvent', { id: eventId, changes: updates });
        // --- End Firestore Update ---

        // --- Trigger Push Notification START ---
        if (isSupabaseConfigured() && notificationType && targetUserIds.length > 0) {
             try {
                const functionPayload = {
                    notificationType: notificationType,
                    targetUserIds: targetUserIds,
                    eventId: eventId,
                    messageTitle: notificationTitle,
                    messageBody: notificationBody,
                    eventUrl: `/event/${eventId}`,
                };
                console.log(`Triggering Supabase Edge Function for status update (${newStatus}):`, functionPayload);

                await invokePushNotification(functionPayload);

                console.log(`Supabase Edge Function execution triggered for status update ${eventId}.`);
            } catch (pushError) {
                console.error(`Failed to trigger Supabase function for status update ${eventId}:`, pushError);
                 dispatch('notification/showNotification', {
                     message: `Event status updated, but failed to send notification.`,
                     type: 'warning'
                 }, { root: true });
            }
        }
        // --- Trigger Push Notification END ---

    } catch (error: any) {
        console.error(`Error updating status to ${newStatus}:`, error);
        dispatch('notification/showNotification', {
            message: `Failed to update status: ${error.message || 'Unknown error'}`,
            type: 'error'
        }, { root: true });
        throw error;
    }
}