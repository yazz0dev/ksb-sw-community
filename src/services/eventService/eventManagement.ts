import { 
  doc, 
  getDoc, 
  updateDoc,
  deleteDoc,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from '@/firebase';
import { 
  type Event, 
  EventStatus, 
  type EventLifecycleTimestamps
} from '@/types/event';
import { type EnrichedStudentData, type UserData } from '@/types/student';
import { mapFirestoreToEventData } from '@/utils/eventDataUtils';
import { calculateEventXP } from '@/utils/eventUtils';
import { EVENTS_COLLECTION } from '@/utils/constants';
import { applyXpAwardsBatch } from '@/services/xpService';

/**
 * Updates the status of an event document in Firestore.
 * @param eventId - The ID of the event.
 * @param newStatus - The new EventStatus.
 * @param currentUser - The user attempting to update the status.
 * @param rejectionReason - Optional reason for rejection.
 * @returns Promise<Partial<Event>> - Returns the specific fields that were updated.
 */
export async function updateEventStatusInFirestore(
    eventId: string,
    newStatus: EventStatus,
    currentUser: UserData | null, 
    rejectionReason?: string
): Promise<Partial<Event>> {
    const validStatuses = Object.values(EventStatus);
    if (!validStatuses.includes(newStatus)) throw new Error(`Invalid status: ${newStatus}.`);
    if (!eventId) throw new Error('Event ID required for status update.');
    if (!currentUser?.uid) throw new Error('User not authenticated for status update.');

    const eventRef = doc(db, EVENTS_COLLECTION, eventId);
    try {
        const eventSnap = await getDoc(eventRef);
        if (!eventSnap.exists()) throw new Error('Event not found.');
        const currentEvent = mapFirestoreToEventData(eventSnap.id, eventSnap.data());
        if (!currentEvent) throw new Error('Failed to map current event data.');

        const updatesToApply: any = {
            status: newStatus,
            lastUpdatedAt: serverTimestamp(),
        };
        
        if (newStatus === EventStatus.Rejected && rejectionReason) {
            updatesToApply.rejectionReason = rejectionReason;
        }
        
        const currentLifecycleTimestamps = currentEvent.lifecycleTimestamps || {};
        let updatedLifecycleTimestamps: Partial<EventLifecycleTimestamps> = {};

        switch (newStatus) {
            case EventStatus.Approved:
                (updatedLifecycleTimestamps as any).approvedAt = serverTimestamp();
                break;
            case EventStatus.InProgress:
                updatesToApply.votingOpen = true; 
                (updatedLifecycleTimestamps as any).startedAt = serverTimestamp();
                break;
            case EventStatus.Completed:
                updatesToApply.votingOpen = true; 
                (updatedLifecycleTimestamps as any).completedAt = serverTimestamp();
                break;
            case EventStatus.Cancelled:
                updatesToApply.votingOpen = false; 
                (updatedLifecycleTimestamps as any).cancelledAt = serverTimestamp();
                break;
            case EventStatus.Rejected:
                updatesToApply.votingOpen = false;
                (updatedLifecycleTimestamps as any).rejectedAt = serverTimestamp();
                break;
            case EventStatus.Closed:
                throw new Error(`Use 'closeEventAndAwardXP' service function to close an event.`);
            case EventStatus.Pending:
                throw new Error(`Changing status back to '${newStatus}' is not supported here.`);
        }
        
        if (Object.keys(updatedLifecycleTimestamps).length > 0) {
            updatesToApply.lifecycleTimestamps = {
                ...currentLifecycleTimestamps,
                ...updatedLifecycleTimestamps
            };
        }

        await updateDoc(eventRef, updatesToApply);
        const { lastUpdatedAt, ...returnedUpdates } = updatesToApply;
        return returnedUpdates; 

    } catch (error: any) {
        throw new Error(error.message || `Failed to update event status to ${newStatus}.`);
    }
}

/**
 * Closes an event, updates its status, and awards XP to participants.
 * @param eventId The ID of the event to close.
 * @param closingUser The user profile performing the close operation.
 * @returns Promise resolving to an object with success status and XP changes map.
 */
export const closeEventAndAwardXP = async (
  eventId: string,
  closingUser: EnrichedStudentData | UserData
): Promise<{ success: boolean; message: string; xpAwarded?: any }> => {
  if (!eventId) throw new Error('Event ID is required.');
  if (!closingUser?.uid) throw new Error('Closing user and their UID are required.');

  const eventRef = doc(db, EVENTS_COLLECTION, eventId);
  const batch = writeBatch(db);

  try {
    const eventSnap = await getDoc(eventRef);
    if (!eventSnap.exists()) {
      throw new Error('Event not found.');
    }

    const eventData = mapFirestoreToEventData(eventSnap.id, eventSnap.data()) as Event;
    if (!eventData) {
      throw new Error('Failed to map event data for closing.');
    }

    const isOrganizerOrRequester = eventData.details.organizers?.includes(closingUser.uid) || eventData.requestedBy === closingUser.uid;
    if (!isOrganizerOrRequester) {
      throw new Error('User does not have permission to close this event.');
    }

    if (eventData.status === EventStatus.Closed) {
      throw new Error('Event is already closed.');
    }
    if (eventData.status !== EventStatus.Completed) {
      throw new Error("Event must be in 'Completed' status to be closed.");
    }
    if (eventData.votingOpen) {
      throw new Error("Voting must be closed before closing the event.");
    }
    if (!eventData.winners || Object.keys(eventData.winners).length === 0) {
      throw new Error("Winners must be determined and saved before closing the event.");
    }

    const xpAwards = calculateEventXP(eventData);
    const studentIdsWithXP = Object.keys(xpAwards);

    if (studentIdsWithXP.length > 0) {
      await applyXpAwardsBatch(xpAwards);
    }

    const updatePayload = {
      status: EventStatus.Closed,
      lastUpdatedAt: serverTimestamp(),
      lifecycleTimestamps: {
        ...(eventData.lifecycleTimestamps || {}),
        closedAt: serverTimestamp(),
      },
    };
    batch.update(eventRef, updatePayload as any);

    await batch.commit();

    return {
      success: true,
      message: `Event "${eventData.details.eventName}" closed successfully. XP awarded to ${studentIdsWithXP.length} participants.`,
      xpAwarded: xpAwards,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error during event closure.';
    console.error(`Error closing event ${eventId}:`, message, error);
    throw new Error(`Failed to close event ${eventId}: ${message}`);
  }
};

/**
 * Records a request for event deletion in Firestore.
 * @param eventId - The ID of the event to request deletion for.
 * @param userId - The UID of the user making the request.
 * @param reason - The reason for requesting deletion.
 */
export async function requestEventDeletionInFirestore(eventId: string, userId: string, reason: string): Promise<void> {
    if (!eventId) throw new Error('Event ID is required to request deletion.');
    if (!userId) throw new Error('User ID is required to request deletion.');
    if (!reason || reason.trim().length === 0) throw new Error('A reason for deletion is required.');

    const eventRef = doc(db, EVENTS_COLLECTION, eventId);
    try {
        const eventSnap = await getDoc(eventRef);
        if (!eventSnap.exists()) {
            throw new Error('Event not found.');
        }

        const deletionRequest = {
            requestedBy: userId,
            requestedAt: serverTimestamp(),
            reason: reason.trim(),
            status: 'PendingReview'
        };

        await updateDoc(eventRef, {
            deletionRequested: deletionRequest,
            lastUpdatedAt: serverTimestamp()
        });
        
    } catch (error: any) {
        throw new Error(error.message || `Failed to request deletion for event ${eventId}.`);
    }
}

/**
 * Deletes a pending event request from Firestore.
 * @param eventId - The ID of the event to delete.
 * @param userId - The UID of the user making the request.
 */
export async function deleteEventRequestInFirestore(eventId: string, userId: string): Promise<void> {
    if (!eventId) throw new Error('Event ID is required to delete the request.');
    if (!userId) throw new Error('User ID is required for validation.');

    const eventRef = doc(db, EVENTS_COLLECTION, eventId);
    try {
        const eventSnap = await getDoc(eventRef);
        if (!eventSnap.exists()) {
            throw new Error('Event request not found or already deleted.');
        }
        const eventData = mapFirestoreToEventData(eventSnap.id, eventSnap.data());
        if (!eventData) {
            throw new Error('Failed to map event data.');
        }
        if (eventData.requestedBy !== userId) {
            throw new Error('You do not have permission to delete this event request.');
        }
        if (![EventStatus.Pending, EventStatus.Rejected].includes(eventData.status)) {
            throw new Error(`Only events with 'Pending' or 'Rejected' status can be deleted. Current status: ${eventData.status}`);
        }

        await deleteDoc(eventRef);

    } catch (error: any) {
        throw new Error(error.message || `Failed to delete event request ${eventId}.`);
    }
}
