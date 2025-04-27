// src/store/modules/events/actions.lifecycle.ts
import { ActionContext } from 'vuex';
import { db } from '@/firebase';
import { doc, getDoc, updateDoc, addDoc, collection, Timestamp } from 'firebase/firestore';
import { Event, EventStatus, EventState } from '@/types/event';
import { User } from '@/types/user';
import { RootState } from '@/types/store';

import { invokePushNotification, isSupabaseConfigured } from '@/notifications';

export async function requestEvent({ rootGetters, dispatch }: ActionContext<EventState, RootState>, initialData: Partial<Event>): Promise<string> {
    const currentUser: User | null = rootGetters['user/getUser'];
    if (!currentUser?.uid) throw new Error('User must be logged in.');
    if (!initialData.details?.date?.start || !initialData.details?.date?.end) {
        throw new Error('Event dates required.');
    }

    try {
        // --- ENFORCE STRUCTURE ---
        // Remove any top-level eventName/type/format fields
        if ('eventName' in initialData) delete (initialData as any).eventName;
        if ('type' in initialData) delete (initialData as any).type;
        if ('format' in initialData) delete (initialData as any).format;

        const eventData = {
            ...initialData,
            requestedBy: currentUser.uid,
            status: EventStatus.Pending,
            createdAt: Timestamp.now(),
        };

        const docRef = await addDoc(collection(db, 'events'), eventData);
        dispatch('updateLocalEvent', { id: docRef.id, changes: eventData });

        // --- Trigger Push Notification to Admins START ---
        if (isSupabaseConfigured()) {
            try {
                await invokePushNotification({
                    type: 'event_request',
                    eventId: docRef.id,
                    requestedBy: currentUser.uid,
                });
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


export async function updateEventDetails({ dispatch, rootGetters }: ActionContext<EventState, RootState>, { eventId, updates }: { eventId: string; updates: Partial<Event> }): Promise<void> {
    if (!eventId) throw new Error('Event ID is required.');
    if (typeof updates !== 'object' || updates === null || Object.keys(updates).length === 0) return;

    const eventRef = doc(db, 'events', eventId);
    try {
        const eventSnap = await getDoc(eventRef);
        if (!eventSnap.exists()) throw new Error('Event not found.');
        const eventData = eventSnap.data() as Event;

        const currentUser: User | null = rootGetters['user/getUser'];
        const isOrganizer = Array.isArray(eventData.details?.organizers) && eventData.details.organizers.includes(currentUser?.uid ?? '');
        const isRequester = eventData.requestedBy === currentUser?.uid;
        const currentStatus = eventData.status as EventStatus;
        const editableStatuses: EventStatus[] = [EventStatus.Pending, EventStatus.Approved, EventStatus.InProgress];

        let canEdit = false;
        if (isOrganizer && editableStatuses.includes(currentStatus)) canEdit = true;
        // Allow requester to edit in Pending OR Approved
        else if (isRequester && [EventStatus.Pending, EventStatus.Approved].includes(currentStatus)) canEdit = true;
        if (!canEdit) throw new Error(`Permission denied: Cannot edit status '${currentStatus}'.`);

        // Remove any top-level eventName/type/format fields
        if ('eventName' in updates) delete (updates as any).eventName;
        if ('type' in updates) delete (updates as any).type;
        if ('format' in updates) delete (updates as any).format;

        // Prepare update payload
        const updatePayload: Partial<Event> = { ...updates };
        if ('participants' in updates) updatePayload.participants = updates.participants;
        // Prevent accidental status change
        delete updatePayload.status;

        // Remove id, createdAt, status, requestedBy, etc. from Firestore update
        // (status/requestedBy should only be changed by status actions)

        // Remove undefined values from updatePayload
        const filteredUpdatePayload = Object.fromEntries(
            Object.entries(updatePayload).filter(([_, v]) => v !== undefined)
        );

        await updateDoc(eventRef, filteredUpdatePayload);
        dispatch('updateLocalEvent', { id: eventId, changes: { ...updatePayload } });
        console.log(`Event ${eventId} details updated.`);
    } catch (error: any) {
        console.error(`Error updating event ${eventId}:`, error);
        throw error;
    }
}


export async function updateEventStatus({ dispatch, rootGetters }: ActionContext<EventState, RootState>, { eventId, newStatus }: { eventId: string; newStatus: EventStatus }): Promise<void> {
    const validStatuses = Object.values(EventStatus);
    if (!validStatuses.includes(newStatus)) throw new Error(`Invalid status: ${newStatus}.`);
    if (!eventId) throw new Error('Event ID required.');

    const eventRef = doc(db, 'events', eventId);
    let fetchedEventData: Event | null = null; // To store data for notification

    try {
        const eventSnap = await getDoc(eventRef);
        if (!eventSnap.exists()) throw new Error('Event not found.');
        fetchedEventData = { id: eventId, ...eventSnap.data() } as Event;
        const currentEvent = fetchedEventData;
        let updates: Partial<Event> = { status: newStatus };
        let notificationType = '';
        let targetUserIds: string[] = [];
        switch (newStatus) {
            case EventStatus.Approved:
                notificationType = 'event_approved';
                targetUserIds = currentEvent.requestedBy ? [currentEvent.requestedBy] : [];
                break;
            case EventStatus.InProgress:
                notificationType = 'event_in_progress';
                targetUserIds = currentEvent.details?.organizers || [];
                break;
            case EventStatus.Completed:
                notificationType = 'event_completed';
                targetUserIds = currentEvent.details?.organizers || [];
                break;
            case EventStatus.Cancelled:
                notificationType = 'event_cancelled';
                targetUserIds = currentEvent.requestedBy ? [currentEvent.requestedBy] : [];
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
                await invokePushNotification({
                    type: notificationType,
                    eventId,
                    targetUserIds,
                });
            } catch (pushError) {
                dispatch('notification/showNotification', {
                    message: 'Event status updated, but failed to send notification.',
                    type: 'warning'
                }, { root: true });
            }
        }
        // --- Trigger Push Notification END ---

    } catch (error: any) {
        console.error(`Error updating status for event ${eventId}:`, error);
        dispatch('notification/showNotification', {
            message: `Failed to update event status: ${error.message || 'Unknown error'}`,
            type: 'error'
        }, { root: true });
        throw error;
    }
}


export async function cancelEvent({ dispatch, rootGetters }: ActionContext<EventState, RootState>, eventId: string): Promise<void> {
    if (!eventId) throw new Error('Event ID required.');
    const eventRef = doc(db, 'events', eventId);
    let fetchedEventData: Event | null = null; // To store data for notification

    try {
        const eventSnap = await getDoc(eventRef);
        if (!eventSnap.exists()) throw new Error("Event not found.");
        fetchedEventData = { id: eventId, ...eventSnap.data() } as Event;

        await updateDoc(eventRef, { status: EventStatus.Cancelled });
        dispatch('updateLocalEvent', { id: eventId, changes: { status: EventStatus.Cancelled } });

        // --- Push Notification Trigger START ---
        if (isSupabaseConfigured()) {
            try {
                await invokePushNotification({
                    type: 'event_cancelled',
                    eventId,
                    requestedBy: fetchedEventData.requestedBy,
                });
            } catch (pushError) {
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


// --- ACTION: Close Event Permanently (Organizer only) ---
export async function closeEventPermanently(context: ActionContext<EventState, RootState>, { eventId }: { eventId: string }): Promise<any> {
    const { rootGetters } = context;
    const currentUser: User | null = rootGetters['user/getUser'];
    // Only organizers can close
    // Fetch event to check organizers
    const eventRef = doc(db, 'events', eventId);
    const eventSnap = await getDoc(eventRef);
    if (!eventSnap.exists()) throw new Error('Event not found.');
    const eventData = eventSnap.data() as Event;
    const isOrganizer = eventData.details.organizers?.includes(currentUser?.uid ?? '') || false;
    if (!isOrganizer) throw new Error("Unauthorized: Only organizers can permanently close events.");
    try {
        return await closeEventPermanently(context, { eventId });
    } catch (error: any) {
        console.error(`Caught error in closeEventPermanently action wrapper for ${eventId}:`, error);
        throw error;
    }
}
