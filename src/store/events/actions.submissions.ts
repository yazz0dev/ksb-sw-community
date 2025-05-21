// src/store/events/actions.submissions.ts (Conceptual Student Site Helpers)
import { doc, getDoc, updateDoc, arrayUnion, Timestamp } from 'firebase/firestore';
import { db } from '@/firebase';
import type { Event, Submission, EventStatus } from '@/types/event';
import { EventFormat } from '@/types/event';

const now = () => Timestamp.now();

/**
 * Adds a project submission to an event document in Firestore by a student.
 * @param eventId - The ID of the event.
 * @param studentId - The UID of the student submitting.
 * @param submissionData - The submission details (projectName, link, description).
 */
export async function submitProjectByStudentInFirestore(
    eventId: string,
    studentId: string,
    submissionData: Omit<Submission, 'submittedBy' | 'submittedAt' | 'teamName' | 'participantId'>
): Promise<void> {
    if (!eventId || !studentId) throw new Error("Event ID and Student ID are required.");
    if (!submissionData?.projectName?.trim()) throw new Error("Project Name is required.");
    if (!submissionData?.link?.trim()) throw new Error("Project Link is required.");
    try { new URL(submissionData.link); } catch (_) { throw new Error("Invalid Project Link URL."); }

    const eventRef = doc(db, 'events', eventId);
    try {
        const eventSnap = await getDoc(eventRef);
        if (!eventSnap.exists()) throw new Error('Event not found.');
        const eventData = eventSnap.data() as Event;

        if (eventData.status !== EventStatus.InProgress) throw new Error("Submissions only allowed for 'In Progress' events.");
        if (eventData.details.allowProjectSubmission === false) throw new Error("Project submissions are not allowed for this event.");

        const newSubmission: Submission = {
            projectName: submissionData.projectName.trim(),
            link: submissionData.link.trim(),
            description: submissionData.description?.trim() || undefined,
            submittedBy: studentId,
            submittedAt: now(),
        };

        if (eventData.details.format === EventFormat.Team) {
            const userTeam = eventData.teams?.find(t => t.members.includes(studentId));
            if (!userTeam) throw new Error("You are not part of a team in this event.");
            // Optional: Enforce team lead submission
            // if (userTeam.teamLead !== studentId) throw new Error("Only the team lead can submit for the team.");
            newSubmission.teamName = userTeam.teamName;
        } else { // Individual or Competition
            if (!eventData.participants?.includes(studentId)) throw new Error("You are not a participant in this event.");
            newSubmission.participantId = studentId;
        }

        // Prevent duplicate submissions (simple check by name and submitter/team)
        const existingSubmissions = eventData.submissions || [];
        const isDuplicate = existingSubmissions.some(s =>
            s.projectName.toLowerCase() === newSubmission.projectName.toLowerCase() &&
            ((s.teamName && s.teamName === newSubmission.teamName) || (s.participantId && s.participantId === newSubmission.participantId))
        );
        if (isDuplicate) throw new Error(`Project "${newSubmission.projectName}" has already been submitted for your ${newSubmission.teamName ? 'team' : 'entry'}.`);


        await updateDoc(eventRef, {
            submissions: arrayUnion(newSubmission),
            lastUpdatedAt: now()
        });
    } catch (error: any) {
        console.error(`Firestore submitProjectByStudent error for ${eventId}:`, error);
        throw new Error(`Failed to submit project: ${error.message}`);
    }
}