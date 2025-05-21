// src/store/events/actions.lifecycle.ts (Conceptual Student Site Helpers)
import { doc, getDoc, updateDoc, addDoc, collection, Timestamp } from 'firebase/firestore';
import { db } from '@/firebase';
import type { Event, EventStatus, EventFormData } from '@/types/event';
import { mapEventDataToFirestore, type MappedEventForFirestore } from '@/utils/eventDataMapper'; // Assuming updated mapper

const now = () => Timestamp.now();

/**
 * Creates a new event request document in Firestore submitted by a student.
 * @param formData - The event form data.
 * @param studentId - The UID of the student making the request.
 * @returns Promise<string> - The ID of the newly created event document.
 */
export async function createEventRequestByStudentInFirestore(formData: EventFormData, studentId: string): Promise<string> {
    if (!studentId) throw new Error('Student ID is required to request an event.');
    if (!formData.details?.eventName?.trim()) throw new Error('Event name is required.');
    // Add more formData validation as needed

    try {
        const dataToSubmit: Partial<Event> = {
            ...mapEventDataToFirestore(formData, true), // isNew = true
            requestedBy: studentId,
            status: EventStatus.Pending,
            votingOpen: false,
            organizerRatings: [],
            submissions: [],
            winners: {},
            bestPerformerSelections: {},
            // createdAt & lastUpdatedAt are handled by mapEventDataToFirestore or set below
        };
        // Ensure organizers array includes the requester if not already
        if (dataToSubmit.details && !dataToSubmit.details.organizers?.includes(studentId)) {
            dataToSubmit.details.organizers = [studentId, ...(dataToSubmit.details.organizers || [])];
        }
        if (!dataToSubmit.createdAt) dataToSubmit.createdAt = now(); // Ensure createdAt if mapper doesn't set
        if (!dataToSubmit.lastUpdatedAt) dataToSubmit.lastUpdatedAt = now();


        const docRef = await addDoc(collection(db, "events"), dataToSubmit);
        return docRef.id;
    } catch (error: any) {
        console.error('Firestore createEventRequestByStudent error:', error);
        throw new Error(`Failed to submit event request: ${error.message}`);
    }
}

/**
 * Updates an existing event request document in Firestore by a student.
 * Only for their own PENDING requests.
 * @param eventId - The ID of the event to update.
 * @param formData - The partial event form data containing updates.
 * @param studentId - The UID of the student making the update.
 */
export async function updateMyEventRequestInFirestore(eventId: string, formData: EventFormData, studentId: string): Promise<void> {
    if (!eventId) throw new Error('Event ID is required for updates.');
    if (!studentId) throw new Error('Student ID is required.');

    const eventRef = doc(db, 'events', eventId);
    try {
        const eventSnap = await getDoc(eventRef);
        if (!eventSnap.exists()) throw new Error('Event request not found.');
        const currentEvent = eventSnap.data() as Event;

        if (currentEvent.requestedBy !== studentId) {
            throw new Error("Permission denied: You can only edit your own event requests.");
        }
        if (currentEvent.status !== EventStatus.Pending) {
            throw new Error(`Cannot edit request with status: ${currentEvent.status}. Contact an admin.`);
        }

        const updates: Partial<MappedEventForFirestore> = {
            ...mapEventDataToFirestore(formData, false), // isNew = false
            lastUpdatedAt: now()
        };
        // Ensure student cannot change status, requester, or critical system-managed fields
        delete updates.status;
        delete updates.requestedBy;
        delete updates.createdAt; // Should not be changed
        delete updates.closedAt;
        delete updates.lifecycleTimestamps; // Admins manage these
        delete updates.votingOpen;
        delete updates.winners;
        delete updates.manuallySelectedBy;
        delete updates.organizerRatings;
        // `submissions` might be editable if you allow pre-adding submission links, but usually not.

        await updateDoc(eventRef, updates);
    } catch (error: any) {
        console.error(`Firestore updateMyEventRequest error for ${eventId}:`, error);
        throw new Error(`Failed to update event request: ${error.message}`);
    }
}