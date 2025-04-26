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



// --- ACTION: Request Event (User) ---
export async function requestEvent({ commit, rootGetters, dispatch }: ActionContext<EventState, RootState>, initialData: Partial<Event>): Promise<string> {
    const currentUser: User | null = rootGetters['user/getUser'];
    if (!currentUser?.uid) throw new Error('User must be logged in.');
    if (!initialData.details?.date?.start || !initialData.details?.date?.end) {
        throw new Error('Event dates required.');
    }

    try {
        // --- ENFORCE STRUCTURE ---
        // Remove any top-level eventName/type/format fields
        const cleanInitialData = { ...initialData };
        delete (cleanInitialData as any).eventName;
        delete (cleanInitialData as any).type;
        delete (cleanInitialData as any).format;

        // Ensure all fields are inside details
        const details = {
            ...cleanInitialData.details,
            eventName: cleanInitialData.details?.eventName || '',
            type: cleanInitialData.details?.type || '',
            // Fix: Only allow EventFormat values
            format: cleanInitialData.details?.format === EventFormat.Team
                ? EventFormat.Team
                : EventFormat.Individual,
            description: cleanInitialData.details?.description || '',
            date: {
                start: cleanInitialData.details?.date?.start || null,
                end: cleanInitialData.details?.date?.end || null
            },
            organizers: Array.isArray(cleanInitialData.details?.organizers)
                ? cleanInitialData.details.organizers.filter(Boolean)
                : [currentUser.uid],
            allowProjectSubmission: typeof cleanInitialData.details?.allowProjectSubmission === 'boolean'
                ? cleanInitialData.details.allowProjectSubmission
                : true
        };

        // Ensure arrays
        const criteria = Array.isArray(cleanInitialData.criteria) ? cleanInitialData.criteria : [];
        const teams = Array.isArray(cleanInitialData.teams) ? cleanInitialData.teams : [];
        const participants = Array.isArray(cleanInitialData.participants) ? cleanInitialData.participants : [];

        const requestPayload: Partial<Event> = {
            ...cleanInitialData,
            details,
            criteria,
            teams,
            participants,
            requestedBy: currentUser.uid,
            ratingsOpen: false,
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
                const adminsQuery = query(collection(db, 'admin'));
                const adminsSnap = await getDocs(adminsQuery);
                const adminUids = adminsSnap.docs.map(doc => doc.id).filter(Boolean); // Filter out any falsy values
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

// --- ACTION: Update Event Details (Organizer, or Requester) ---
export async function updateEventDetails({ dispatch, rootGetters }: ActionContext<EventState, RootState>, { eventId, updates }: { eventId: string; updates: Partial<Event> }): Promise<void> {
    if (!eventId) throw new Error('Event ID required.');
    const eventRef = doc(db, 'events', eventId);
    let fetchedEventData: Event | null = null; // To store data for notification

    try {
        const eventSnap = await getDoc(eventRef);
        if (!eventSnap.exists()) throw new Error("Event not found.");
        fetchedEventData = { id: eventId, ...eventSnap.data() } as Event;

        const currentUser: User | null = rootGetters['user/getUser'];
        const isOrganizer = Array.isArray(fetchedEventData.details?.organizers) && fetchedEventData.details.organizers.includes(currentUser?.uid ?? '');
        if (!isOrganizer) throw new Error("Permission denied.");

        // --- ENFORCE STRUCTURE ON UPDATES ---
        // Remove any top-level eventName/type/format fields
        if ('eventName' in updates) delete (updates as any).eventName;
        if ('type' in updates) delete (updates as any).type;
        if ('format' in updates) delete (updates as any).format;

        // Ensure all fields are inside details
        if (updates.details) {
            updates.details = {
                ...fetchedEventData.details,
                ...updates.details,
                eventName: updates.details.eventName || fetchedEventData.details.eventName || '',
                type: updates.details.type || fetchedEventData.details.type || '',
                format: updates.details.format || fetchedEventData.details.format || '',
                description: updates.details.description || fetchedEventData.details.description || '',
                date: {
                    start: updates.details.date?.start || fetchedEventData.details.date.start,
                    end: updates.details.date?.end || fetchedEventData.details.date.end
                },
                organizers: Array.isArray(updates.details.organizers)
                    ? updates.details.organizers.filter(Boolean)
                    : fetchedEventData.details.organizers
            };
        }

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
                    .filter(id => id !== currentUser?.uid); // Don't notify the user who updated

                if (targetUserIds.length > 0) {
                    const functionPayload = {
                        notificationType: 'eventUpdated',
                        targetUserIds: targetUserIds,
                        eventId: eventId,
                        messageTitle: `Event Updated: ${fetchedEventData.details?.type || 'Event'}`,
                        messageBody: `The event "${fetchedEventData.details?.type || 'Event'}" has been updated.`,
                        eventUrl: `/event/${eventId}`,
                    };

                    console.log("Triggering Supabase Edge Function for event update:", functionPayload);

                    await invokePushNotification(functionPayload);

                    console.log(`Supabase Edge Function execution triggered for event update ${eventId}.`);
                }
            } catch (pushError) {
                console.error(`Failed to trigger Supabase function for event update ${eventId}:`, pushError);
                dispatch('notification/showNotification', {
                    message: 'Event updated, but failed to send notification.',
                    type: 'warning'
                }, { root: true });
            }
        }
        // --- Push Notification Trigger END ---

    } catch (error: any) {
        console.error(`Error updating event ${eventId}:`, error);
        dispatch('notification/showNotification', {
            message: `Failed to update event: ${error.message || 'Unknown error'}`,
            type: 'error'
        }, { root: true });
        throw error;
    }
}

// --- ACTION: Cancel Event ( Organizer) ---
export async function cancelEvent({ dispatch, rootGetters }: ActionContext<EventState, RootState>, eventId: string): Promise<void> {
    if (!eventId) throw new Error('Event ID required.');
    const eventRef = doc(db, 'events', eventId);
    let fetchedEventData: Event | null = null; // To store data for notification

    try {
        const eventSnap = await getDoc(eventRef);
        if (!eventSnap.exists()) throw new Error("Event not found.");
        fetchedEventData = { id: eventId, ...eventSnap.data() } as Event;

        const currentUser: User | null = rootGetters['user/getUser'];
        const isOrganizer = Array.isArray(fetchedEventData.details?.organizers) && fetchedEventData.details.organizers.includes(currentUser?.uid ?? '');
        if ( !isOrganizer) throw new Error("Permission denied.");

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

// --- ACTION: Update Event Status (Organizer) ---
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
        const isOrganizer = Array.isArray(currentEvent.details?.organizers) && currentEvent.details.organizers.includes(currentUser?.uid ?? '');
        if ( !isOrganizer) throw new Error("Permission denied.");

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