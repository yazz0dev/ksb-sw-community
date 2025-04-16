// src/store/modules/events/actions.part2.ts
import { ActionContext, ActionTree } from 'vuex';
import { db } from '@/firebase';
import {
    doc,
    getDoc,
    Timestamp,
    updateDoc,
    arrayUnion,
    arrayRemove,
    DocumentReference,
    DocumentData,
    collection,
    addDoc,
} from 'firebase/firestore';
import {
    EventStatus,
    EventState,
    Event,
    Team,
    Submission,
    Rating,
    OrganizationRating,
    XPAllocation,
} from '@/types/event';
import { RootState } from '@/store/types';
import { User } from '@/types/user';
import { DateTime, Interval } from 'luxon';
import { mapEventDataToFirestore } from '@/utils/eventDataMapper';

// Helper to convert Firestore doc data to Event (minimal, for this module)
function convertEventDocumentData(id: string, data: any): Event {
    return { id, ...data } as Event;
}

// --- Helper: Validate Organizers ---
declare function validateOrganizersNotAdmin(organizerIds: string[]): Promise<void>;

// --- Helper: Update Local State ---
export function updateLocalEvent({ commit }: ActionContext<EventState, RootState>, { id, changes }: { id: string; changes: Partial<Event> }) {
    commit('addOrUpdateEvent', { id, ...changes });
    commit('updateCurrentEventDetails', { id, changes });
}

// --- ACTION: Update Event Details (Admin, Organizer, or Requester) ---
export async function updateEventDetails({ dispatch, rootGetters }: ActionContext<EventState, RootState>, { eventId, updates }: { eventId: string; updates: Partial<Event> }): Promise<void> {
    if (!eventId) throw new Error('Event ID is required.');
    if (typeof updates !== 'object' || updates === null || Object.keys(updates).length === 0) return;

    const eventRef = doc(db, 'events', eventId);
    try {
        const eventSnap = await getDoc(eventRef);
        if (!eventSnap.exists()) throw new Error('Event not found.');
        const eventData = eventSnap.data() as Event;

        const currentUser: User | null = rootGetters['user/getUser'];
        const isAdmin = currentUser?.role === 'Admin';
        const isOrganizer = Array.isArray(eventData.organizers) && eventData.organizers.includes(currentUser?.uid ?? '');
        const isRequester = eventData.requester === currentUser?.uid;
        const currentStatus = eventData.status;
        const editableStatuses: EventStatus[] = [EventStatus.Pending, EventStatus.Approved];

        let canEdit = false;
        if (isAdmin && editableStatuses.includes(currentStatus)) canEdit = true;
        else if (isOrganizer && editableStatuses.includes(currentStatus)) canEdit = true;
        else if (isRequester && currentStatus === EventStatus.Pending) canEdit = true;
        if (!canEdit) throw new Error(`Permission denied: Cannot edit status '${currentStatus}'.`);

        const allowedUpdates: Partial<Event> = {};
        const generallyEditableFields: Array<keyof Event> = ['description', 'xpAllocation', 'eventFormat', 'isTeamEvent'];
        const pendingOnlyEditableFields: Array<keyof Event> = ['eventName', 'eventType', 'desiredStartDate', 'desiredEndDate'];
        const adminOnlyEditableFields: Array<keyof Event> = ['startDate', 'endDate', 'organizers'];
        const teamEditField: keyof Event = 'teams';

        for (const key in updates) {
            const fieldKey = key as keyof Event;
            const value = updates[fieldKey];

            if (generallyEditableFields.includes(fieldKey)) {
                // Only assign if value is not undefined and not null
                if (value !== undefined && value !== null) {
                    allowedUpdates[fieldKey] = value;
                }
            } else if (currentStatus === EventStatus.Pending && pendingOnlyEditableFields.includes(fieldKey)) {
                if (value !== undefined && value !== null) {
                    allowedUpdates[fieldKey] = value;
                }
            } else if (isAdmin && adminOnlyEditableFields.includes(fieldKey)) {
                if (fieldKey === 'organizers') {
                    const newOrganizers = Array.isArray(value) ? (value as string[]).filter(Boolean) : [];
                    if (newOrganizers.length === 0) throw new Error("Organizers list cannot be empty.");
                    if (newOrganizers.length > 5) throw new Error("Max 5 organizers.");
                    allowedUpdates[fieldKey] = newOrganizers;
                } else {
                    if (value !== undefined && value !== null) {
                        allowedUpdates[fieldKey] = value;
                    }
                }
            } else if (fieldKey === teamEditField && eventData.isTeamEvent && Array.isArray(value) && (isAdmin || isOrganizer)) {
                const newTeams = (value as Partial<Team>[]).map((team, index) => {
                    const teamName = team.teamName?.trim();
                    if (!teamName) throw new Error(`Team name empty (index ${index}).`);
                    const members = Array.isArray(team.members) ? team.members.filter(Boolean) : [];
                    const existingTeam = eventData.teams?.find(et => et.teamName === teamName);
                    return { teamName, members, submissions: existingTeam?.submissions || [], ratings: existingTeam?.ratings || [] };
                });
                allowedUpdates[fieldKey] = newTeams;
            } else {
                console.warn(`Skipping update for field '${fieldKey}'.`);
            }
        }

        let finalStartDate = eventData.startDate, finalEndDate = eventData.endDate;
        let finalDesiredStart = eventData.desiredStartDate, finalDesiredEnd = eventData.desiredEndDate;
        const convertDate = (d: any): Timestamp | undefined => {
            if (!d) return undefined; 
            if (d instanceof Timestamp) return d; 
            if (d instanceof Date) return Timestamp.fromDate(d);
            try { return Timestamp.fromDate(new Date(d)); } 
            catch { return undefined; }
        };

        // Use ?? null for nullable fields, and ?? undefined for optional fields
        if ('startDate' in allowedUpdates) finalStartDate = convertDate(allowedUpdates.startDate) ?? null;
        if ('endDate' in allowedUpdates) finalEndDate = convertDate(allowedUpdates.endDate) ?? null;
        if ('desiredStartDate' in allowedUpdates) finalDesiredStart = convertDate(allowedUpdates.desiredStartDate) ?? null;
        if ('desiredEndDate' in allowedUpdates) finalDesiredEnd = convertDate(allowedUpdates.desiredEndDate) ?? null;

        // Only remove undefined, not null
        const cleanUpdates = (obj: Partial<Event>): Partial<Event> => {
            const cleaned: Partial<Event> = {};
            for (const key in obj) {
                if (Object.prototype.hasOwnProperty.call(obj, key)) {
                    const value = obj[key as keyof Event];
                    if (value !== undefined) {
                        (cleaned as any)[key] = value;
                    }
                }
            }
            return cleaned;
        };

        const updatesForFirestore = cleanUpdates({
            ...allowedUpdates,
            startDate: finalStartDate,
            endDate: finalEndDate,
            desiredStartDate: finalDesiredStart,
            desiredEndDate: finalDesiredEnd,
        });

        if (Object.keys(updatesForFirestore).length > 0) {
            updatesForFirestore.lastUpdatedAt = Timestamp.now();
            await updateDoc(eventRef, updatesForFirestore);
            dispatch('updateLocalEvent', { id: eventId, changes: updatesForFirestore });
            console.log(`Event ${eventId} details updated.`);
        } else {
            console.log(`No valid updates for event ${eventId}.`);
        }
    } catch (error: any) {
        console.error(`Error updating event ${eventId}:`, error);
        throw error;
    }
}

// --- ACTION: Update Event ---
export const updateEvent: ActionTree<EventState, RootState>['updateEvent'] = async ({ commit, dispatch, rootGetters }, payload: { id: string; changes: Partial<Event> }) => {
    try {
        const eventRef = doc(db, 'events', payload.id);
        const eventSnap = await getDoc(eventRef);

        if (!eventSnap.exists()) {
            throw new Error(`Event with ID ${payload.id} not found.`);
        }

        const existingEvent = convertEventDocumentData(eventSnap.id, eventSnap.data());
        const updateData: Partial<Event> = {};
        let needsOverlapCheck = false;

        for (const key in payload.changes) {
            if (Object.prototype.hasOwnProperty.call(payload.changes, key)) {
                const newValue = payload.changes[key as keyof Event];
                const existingValue = existingEvent[key as keyof Event];

                if (newValue !== existingValue) {
                    (updateData as any)[key] = newValue;

                    if (['startDate', 'endDate', 'desiredStartDate', 'desiredEndDate'].includes(key) && newValue !== undefined) {
                        needsOverlapCheck = true;
                    }
                }
            }
        }

        if (Object.keys(updateData).length === 0) {
            console.log("No actual changes detected for event:", payload.id);
            return;
        }

        if (needsOverlapCheck) {
            const eventToCheck = {
                startDate: updateData.startDate !== undefined ? updateData.startDate : existingEvent.startDate,
                endDate: updateData.endDate !== undefined ? updateData.endDate : existingEvent.endDate,
                desiredStartDate: updateData.desiredStartDate !== undefined ? updateData.desiredStartDate : existingEvent.desiredStartDate,
                desiredEndDate: updateData.desiredEndDate !== undefined ? updateData.desiredEndDate : existingEvent.desiredEndDate,
            };
            const overlap = await dispatch('checkEventOverlap', { eventData: eventToCheck, eventId: payload.id });
            if (overlap) {
                throw new Error("Proposed event time overlaps with an existing event.");
            }
        }

        updateData.lastUpdatedAt = Timestamp.now();

        await updateDoc(eventRef, updateData);

        commit('addOrUpdateEvent', { id: payload.id, ...updateData });
        commit('updateCurrentEventDetails', { id: payload.id, changes: updateData });

        console.log(`Event ${payload.id} updated successfully.`);
    } catch (error: any) {
        console.error(`Error updating event ${payload.id}:`, error);
        throw error;
    }
};

// --- ACTION: Update Event Status ---
export const updateEventStatus: ActionTree<EventState, RootState>['updateEventStatus'] = async ({ commit, state }, { eventId, status, reason }: { eventId: string; status: EventStatus; reason?: string }) => {
    const eventRef = doc(db, 'events', eventId);
    const event = state.events.find(e => e.id === eventId) || state.currentEventDetails;

    if (!event) {
        console.error(`Event ${eventId} not found in local state for status update.`);
        throw new Error(`Event ${eventId} not found locally.`);
    }

    const updateData: Partial<Event> & {
        status: EventStatus;
        lastUpdatedAt: Timestamp;
        rejectionReason?: string | null;
        completedAt?: Timestamp | null;
        startDate?: Timestamp | null;
        endDate?: Timestamp | null;
    } = {
        status: status,
        lastUpdatedAt: Timestamp.now(),
        rejectionReason: status === EventStatus.Rejected ? reason ?? null : null,
        completedAt: status === EventStatus.Completed ? Timestamp.now() : null,
        startDate: event.startDate ?? null,
        endDate: event.endDate ?? null,
    };

    if (status === EventStatus.Approved) {
        updateData.startDate = event.desiredStartDate ?? event.startDate ?? null;
        updateData.endDate = event.desiredEndDate ?? event.endDate ?? null;
    }

    try {
        await updateDoc(eventRef, updateData);
        commit('addOrUpdateEvent', { id: eventId, ...updateData });
        commit('updateCurrentEventDetails', { id: eventId, changes: updateData });
        console.log(`Event ${eventId} status updated to ${status}.`);
    } catch (error: any) {
        console.error(`Error updating status for event ${eventId}:`, error);
        throw error;
    }
};

// --- ACTION: Request Event (User submits event request, status: Pending) ---
export const requestEvent: ActionTree<EventState, RootState>['requestEvent'] = async ({ rootGetters, commit }, eventData: any) => {
    // eventData: FormData from EventForm.vue
    try {
        // Get current user info
        const currentUser = rootGetters['user/getUser'];
        if (!currentUser || !currentUser.uid) {
            throw new Error('You must be logged in to request an event.');
        }

        // Prepare event object for Firestore
        const dataToStore = {
            ...mapEventDataToFirestore(eventData),
            status: 'Pending',
            requester: currentUser.uid,
            organizers: Array.isArray(eventData.organizers) ? eventData.organizers : [],
            participants: [],
            teams: [],
            xpAllocation: Array.isArray(eventData.xpAllocation) ? eventData.xpAllocation : [],
            submissions: [],
            ratings: [],
            organizationRatings: [],
            createdAt: Timestamp.now(),
            lastUpdatedAt: Timestamp.now(),
            ratingsOpen: false,
            ratingsOpenCount: 0,
            ratingsLastOpenedAt: null,
            completedAt: null,
            closed: false,
            closedAt: null,
            rejectionReason: null,
        };

        // Add the request to Firestore
        const eventsCol = collection(db, 'events');
        const docRef = await addDoc(eventsCol, dataToStore);

        // Add to local state immediately (optional, for responsiveness)
        commit('addOrUpdateEvent', { id: docRef.id, ...dataToStore });

        // Optionally show notification here if needed

    } catch (error: any) {
        console.error("Error submitting event request:", error);
        throw error;
    }
};