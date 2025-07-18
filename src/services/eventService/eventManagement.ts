import { 
  doc, 
  getDoc, 
  updateDoc,
  deleteDoc,
  serverTimestamp} from 'firebase/firestore';
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
import { applyXpAwardsBatch, type XpFieldUpdates } from '@/services/xpService';
import { type XPData, mapCalcRoleToFirestoreKey } from '@/types/xp';

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
    currentUser: UserData,
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

        const updatesToApply: Record<string, any> = {
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
        const { lastUpdatedAt, ...otherUpdates } = updatesToApply;
        const returnedUpdates: Partial<Event> = { ...otherUpdates };
        if (updatesToApply.lifecycleTimestamps) {
            returnedUpdates.lifecycleTimestamps = updatesToApply.lifecycleTimestamps as Partial<EventLifecycleTimestamps>;
        }
        if (updatesToApply.rejectionReason) {
            returnedUpdates.rejectionReason = updatesToApply.rejectionReason as string;
        }
         if (updatesToApply.status) {
            returnedUpdates.status = updatesToApply.status as EventStatus;
        }
        if (updatesToApply.votingOpen !== undefined) {
            returnedUpdates.votingOpen = updatesToApply.votingOpen as boolean;
        }
        return returnedUpdates; 

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : `Failed to update event status to ${newStatus}.`;
        throw new Error(message);
    }
}

/**
 * Closes an event, updates its status, and awards XP to participants in a single atomic transaction.
 * @param eventId The ID of the event to close.
 * @param closingUser The user profile performing the close operation.
 * @returns Promise resolving to an object with success status.
 */
export const finalizeEventClosure = async (
  eventId: string,
  closingUser: EnrichedStudentData | UserData
): Promise<{ success: boolean; message: string }> => {
  if (!eventId) throw new Error('Event ID is required.');
  if (!closingUser?.uid) throw new Error('Closing user and their UID are required.');

  const eventRef = doc(db, EVENTS_COLLECTION, eventId);

  try {
    const eventSnap = await getDoc(eventRef);
    if (!eventSnap.exists()) {
      throw new Error('Event not found.');
    }

    const eventData = mapFirestoreToEventData(eventSnap.id, eventSnap.data()) as Event;
    if (!eventData) {
      throw new Error('Failed to map event data for closing.');
    }

    // Permission check
    const isOrganizerOrRequester = eventData.details.organizers?.includes(closingUser.uid) || eventData.requestedBy === closingUser.uid;
    if (!isOrganizerOrRequester) {
      throw new Error('User does not have permission to close this event.');
    }

    // Status and condition checks
    if (eventData.status === EventStatus.Closed) {
      // Allow re-running if somehow event is closed but lifecycle timestamps not set.
      // Or, simply return success if already closed and correctly marked.
      if (eventData.lifecycleTimestamps?.closedAt && eventData.lifecycleTimestamps?.closedBy) {
        return { success: true, message: 'Event is already closed and finalized.'};
      }
      // If closed but missing lifecycle, proceed to update lifecycle.
    } else if (eventData.status !== EventStatus.Approved) {
      throw new Error("Event must be in 'Completed' status to be closed.");
    }

    if (eventData.xpAwardingStatus !== 'completed') {
      throw new Error("XP must be successfully awarded before closing the event.");
    }
    // Voting closed and winners selected checks are implicitly covered by conditions for awarding XP.

    // Update event status to Closed and set lifecycle timestamps
    const updatePayload: Record<string, any> = {
      status: EventStatus.Closed,
      lastUpdatedAt: serverTimestamp(),
      lifecycleTimestamps: {
        ...(eventData.lifecycleTimestamps || {}),
        closedAt: serverTimestamp(),
        closedBy: closingUser.uid,
      },
    };

    await updateDoc(eventRef, updatePayload);

    return {
      success: true,
      message: `Event "${eventData.details.eventName}" has been successfully closed.`,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred while closing the event.';
    console.error(`Error finalizing event closure for ${eventId}:`, error);
    throw new Error(`Failed to finalize event closure: ${errorMessage}`);
  }
};


/**
 * Processes and awards XP for a given event.
 * Updates the event document with XP awarding status.
 * Does NOT change the event's main status (e.g., to Closed).
 */
export const processAndAwardEventXP = async (
  eventId: string,
  awardingUserId: string
): Promise<{ success: boolean; message: string; awardedUserCount: number }> => {
  if (!eventId) throw new Error('Event ID is required for XP awarding.');
  if (!awardingUserId) throw new Error('Awarding user ID is required.');

  const eventRef = doc(db, EVENTS_COLLECTION, eventId);
  let awardedUserCount = 0;

  try {
    const eventSnap = await getDoc(eventRef);
    if (!eventSnap.exists()) {
      throw new Error('Event not found for XP awarding.');
    }

    const eventData = mapFirestoreToEventData(eventSnap.id, eventSnap.data()) as Event;
    if (!eventData) {
      throw new Error('Failed to map event data for XP awarding.');
    }
    if (!eventData.details.eventName) {
      throw new Error('Event name is missing and required for XP history.');
    }

    // Permission check: Ensure awardingUser is an organizer
    // (Assuming isEventOrganizer utility exists or similar logic)
    if (!eventData.details.organizers?.includes(awardingUserId)) {
      // A more robust check might involve fetching the user role if there's a specific admin/organizer role system
      // For now, direct check on organizers array.
      // This check might also live in the store action before calling the service.
      // Consider if eventData.requestedBy should also be allowed.
      // For now, strict to listed organizers.
      throw new Error('User does not have permission to award XP for this event.');
    }

    if (eventData.status !== EventStatus.Approved) {
      await updateDoc(eventRef, { xpAwardingStatus: 'failed', xpAwardError: 'Event not in Completed status.', lastUpdatedAt: serverTimestamp() });
      throw new Error("XP can only be awarded for events in 'Completed' status.");
    }
    if (eventData.votingOpen) {
      await updateDoc(eventRef, { xpAwardingStatus: 'failed', xpAwardError: 'Voting must be closed.', lastUpdatedAt: serverTimestamp() });
      throw new Error("Voting must be closed before awarding XP.");
    }
    if (!eventData.winners || Object.keys(eventData.winners).length === 0) {
      await updateDoc(eventRef, { xpAwardingStatus: 'failed', xpAwardError: 'Winners not determined.', lastUpdatedAt: serverTimestamp() });
      throw new Error("Winners must be determined before awarding XP.");
    }
    if (eventData.xpAwardingStatus === 'completed') {
      return { success: true, message: 'XP has already been awarded for this event.', awardedUserCount: 0 }; // Or fetch count from event if stored
    }
    if (eventData.xpAwardingStatus === 'in_progress') {
      throw new Error('XP awarding is already in progress for this event.');
    }

    // Mark as in_progress
    await updateDoc(eventRef, { xpAwardingStatus: 'in_progress', xpAwardError: null, lastUpdatedAt: serverTimestamp() });

    const xpAwards = calculateEventXP(eventData); // from eventUtils
    awardedUserCount = new Set(xpAwards.map(award => award.userId)).size;

    if (xpAwards.length === 0) {
      await updateDoc(eventRef, {
        xpAwardingStatus: 'completed',
        xpAwardedAt: serverTimestamp(),
        xpAwardError: null, // Clear any previous error
        lastUpdatedAt: serverTimestamp()
      });
      return { success: true, message: 'No XP awards to process for this event.', awardedUserCount: 0 };
    }

    const xpChangesMap: Record<string, XpFieldUpdates> = {};
    for (const award of xpAwards) {
      if (!xpChangesMap[award.userId]) {
        xpChangesMap[award.userId] = {};
      }
      const firestoreKey = mapCalcRoleToFirestoreKey(award.role);
      const userUpdates = xpChangesMap[award.userId];
      if (userUpdates) {
        userUpdates[firestoreKey] = (userUpdates[firestoreKey] || 0) + award.points;
        if (award.isWinner) {
          userUpdates.count_wins = (userUpdates.count_wins || 0) + 1;
        }
      }
    }

    const xpBatch = applyXpAwardsBatch(xpChangesMap, eventId, eventData.details.eventName); // from xpService
    await xpBatch.commit();

    // Mark as completed
    await updateDoc(eventRef, {
      xpAwardingStatus: 'completed',
      xpAwardedAt: serverTimestamp(),
      xpAwardError: null, // Clear any previous error
      lastUpdatedAt: serverTimestamp()
    });

    return {
      success: true,
      message: `XP successfully awarded to ${awardedUserCount} participants.`,
      awardedUserCount,
    };

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred during XP awarding.';
    try {
      await updateDoc(eventRef, { xpAwardingStatus: 'failed', xpAwardError: errorMessage, lastUpdatedAt: serverTimestamp() });
    } catch (updateError) {
      console.error("Failed to update event with XP award error state:", updateError);
    }
    console.error(`Error awarding XP for event ${eventId}:`, error);
    throw new Error(`Failed to award XP: ${errorMessage}`);
  }
};


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

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : `Failed to delete event request ${eventId}.`;
        throw new Error(message);
    }
}
