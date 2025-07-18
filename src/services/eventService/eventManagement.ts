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
 * @returns Promise resolving to an object with success status and XP changes map.
 */
export const closeEventAndAwardXP = async (
  eventId: string,
  closingUser: EnrichedStudentData | UserData
): Promise<{ success: boolean; message: string; xpAwarded?: Record<string, Partial<XPData>> }> => {
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
    if (!eventData.details.eventName) {
        throw new Error('Event name is missing and required for XP history.');
    }

    const isOrganizerOrRequester = eventData.details.organizers?.includes(closingUser.uid) || eventData.requestedBy === closingUser.uid;
    if (!isOrganizerOrRequester) {
      throw new Error('User does not have permission to close this event.');
    }

    if (eventData.status === EventStatus.Closed) {
      throw new Error('Event is already closed.');
    }
    if (eventData.status !== EventStatus.Approved) {
      throw new Error("Event must be in 'Approved' status to be closed.");
    }
    if (eventData.votingOpen) {
      throw new Error("Voting must be closed before closing the event.");
    }
    if (!eventData.winners || Object.keys(eventData.winners).length === 0) {
      throw new Error("Winners must be determined and saved before closing the event.");
    }

    const xpAwards = calculateEventXP(eventData);
    const studentIdsWithXP = Object.keys(xpAwards);

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

    const batch = applyXpAwardsBatch(xpChangesMap, eventId, eventData.details.eventName);

    const updatePayload: Record<string, any> = {
      status: EventStatus.Closed,
      lastUpdatedAt: serverTimestamp(),
      lifecycleTimestamps: {
        ...(eventData.lifecycleTimestamps || {}),
        closedAt: serverTimestamp(),
        closedBy: closingUser.uid
      },
    };
    batch.update(eventRef, updatePayload);

    await batch.commit();

    const aggregatedXpChanges: Record<string, Partial<XPData>> = {};
    for (const award of xpAwards) {
      if (!aggregatedXpChanges[award.userId]) {
        aggregatedXpChanges[award.userId] = { totalCalculatedXp: 0, count_wins: 0 };
      }
      const firestoreKey = mapCalcRoleToFirestoreKey(award.role);
      const userChanges = aggregatedXpChanges[award.userId];
      if (userChanges) {
        (userChanges as any)[firestoreKey] = ((userChanges as any)[firestoreKey] || 0) + award.points;
        userChanges.totalCalculatedXp = (userChanges.totalCalculatedXp || 0) + award.points;

        if (award.isWinner) {
          userChanges.count_wins = (userChanges.count_wins || 0) + 1;
        }
      }
    }

    return {
      success: true,
      message: `Event "${eventData.details.eventName}" closed successfully. XP awarded to ${studentIdsWithXP.length} participants.`,
      xpAwarded: aggregatedXpChanges,
    };
  } catch (error: unknown) {
    let operationPhase = "general processing";
    if (error instanceof Error) {
        if (error.message.includes("Event name is missing")) operationPhase = "data validation";
        else if (error.message.includes("permission denied")) operationPhase = "permission check";
        else if (error.message.includes("Event is already closed")) operationPhase = "status check (already closed)";
        else if (error.message.includes("must be in 'Completed' status")) operationPhase = "status check (not completed)";
        else if (error.message.includes("Voting must be closed")) operationPhase = "voting status check";
        else if (error.message.includes("Winners must be determined")) operationPhase = "winner determination check";
        else if (error.message.includes("Cannot create valid XP history")) operationPhase = "XP batch preparation (missing eventId/name)";
    }

    const baseMessage = `Error during ${operationPhase} for closing event ${eventId} by user ${closingUser.uid}.`;
    const finalMessage = error instanceof Error ? `${baseMessage} Details: ${error.message}` : `${baseMessage} An unknown error occurred.`;

    console.error(finalMessage, error);

    if (error instanceof Error && typeof (error as any).code === 'string') {
        throw new Error(`Failed to close event (${operationPhase}): ${error.message} (Code: ${(error as any).code})`);
    }
    throw new Error(`Failed to close event ${eventId} during ${operationPhase}: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
