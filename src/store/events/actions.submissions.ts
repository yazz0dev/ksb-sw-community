// src/store/events/actions.submissions.ts
// Helper functions for submission actions.
import { doc, getDoc, updateDoc, arrayUnion, Timestamp } from 'firebase/firestore';
import { db } from '@/firebase';
import { Event, Submission, EventStatus, EventFormat } from '@/types/event';

/**
 * Adds a project submission to an event document in Firestore.
 * Submissions are added to the top-level `event.submissions` array.
 * @param eventId - The ID of the event.
 * @param userId - The UID of the user submitting.
 * @param submissionData - The submission details (projectName, link, description).
 * @returns Promise<void>
 * @throws Error if validation fails, event not found, permissions invalid, or Firestore fails.
 */
export async function submitProjectToEventInFirestore(eventId: string, userId: string, submissionData: Partial<Submission>): Promise<void> {
    // Basic Validation
    if (!eventId || !userId) throw new Error("Event ID and User ID are required.");
    if (!submissionData?.projectName?.trim()) throw new Error("Project Name required.");
    if (!submissionData?.link?.trim()) throw new Error("Project Link required.");
    try { new URL(submissionData.link); } catch (_) { throw new Error("Invalid Project Link URL."); }

    const eventRef = doc(db, 'events', eventId);
    try {
        const eventSnap = await getDoc(eventRef);
        if (!eventSnap.exists()) throw new Error('Event not found.');
        const eventData = eventSnap.data() as Event;

        // Permission checks
        if (eventData.status !== EventStatus.InProgress) throw new Error("Submissions only allowed for 'In Progress' events.");
        if (eventData.details.allowProjectSubmission === false) throw new Error("Project submissions are not allowed for this event.");

        const submissionEntry: Submission = {
            projectName: submissionData.projectName.trim(),
            link: submissionData.link.trim(),
            submittedBy: userId,
            submittedAt: Timestamp.now(),
            description: submissionData.description?.trim() || null,
        };

        // Associate with team or participant based on format
        if (eventData.details.format === EventFormat.Team) {
            const userTeam = eventData.teams?.find(t => t.members?.includes(userId));
            if (!userTeam) throw new Error("Submitter is not part of any team in this event.");
            // Optional: Enforce only team lead can submit
             if (userTeam.teamLead !== userId) throw new Error("Only the team lead can submit for the team.");
            submissionEntry.teamId = userTeam.teamName; // Store teamName as teamId
        } else { // Individual or Competition
            if (!eventData.participants?.includes(userId)) throw new Error("Submitter is not a participant in this event.");
            submissionEntry.participantId = userId;
        }

        // Add submission using arrayUnion to the top-level submissions array
        await updateDoc(eventRef, {
            submissions: arrayUnion(submissionEntry),
        });
        console.log(`Firestore: Submission added by ${userId} to event ${eventId}.`);

    } catch (error: any) {
        console.error(`Firestore submitProject error for ${eventId}:`, error);
        throw new Error(`Failed to submit project: ${error.message}`);
    }
}