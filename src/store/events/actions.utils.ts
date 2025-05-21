// src/store/events/actions.utils.ts (Conceptual Student Site Helpers)
import type { Event, EventCriterion, EventStatus, Team } from '@/types/event';
import { EventFormat } from '@/types/event';

/**
 * Checks if the student has already submitted selections/votes for a given event.
 * @param event - The event object.
 * @param studentId - The UID of the student.
 * @returns boolean - True if the student has made selections.
 */
export function hasStudentSubmittedSelections(event: Event | null, studentId: string | null): boolean {
    if (!event || !studentId || !event.criteria) return false;

    // Check regular criteria selections
    const hasCriteriaVote = event.criteria.some(criterion =>
        criterion.selections && criterion.selections[studentId] !== undefined
    );
    if (hasCriteriaVote) return true;

    // Check best performer selection for team events
    if (event.details.format === EventFormat.Team) {
        return event.bestPerformerSelections && event.bestPerformerSelections[studentId] !== undefined;
    }
    return false;
}

/**
 * Checks if the student has already rated the organizers for a given event.
 * @param event - The event object.
 * @param studentId - The UID of the student.
 * @returns boolean - True if the student has rated.
 */
export function hasStudentRatedOrganizers(event: Event | null, studentId: string | null): boolean {
    if (!event || !studentId || !Array.isArray(event.organizerRatings)) return false;
    return event.organizerRatings.some(rating => rating.userId === studentId);
}

/**
 * Gets the team a student belongs to in a specific event.
 * @param event - The event object.
 * @param studentId - The UID of the student.
 * @returns Team | undefined - The team object if found, otherwise undefined.
 */
export function getStudentTeamInEvent(event: Event | null, studentId: string | null): Team | undefined {
    if (!event || !studentId || event.details.format !== EventFormat.Team || !Array.isArray(event.teams)) {
        return undefined;
    }
    return event.teams.find(team => team.members.includes(studentId));
}

/**
 * Checks if a student can submit a project for the event.
 * @param event - The event object.
 * @param studentId - The UID of the student.
 * @param studentTeam - The student's team (if applicable, pass from getStudentTeamInEvent).
 * @returns boolean
 */
export function canStudentSubmitProject(event: Event | null, studentId: string | null, studentTeam?: Team): boolean {
    if (!event || !studentId || event.status !== EventStatus.InProgress || !event.details.allowProjectSubmission) {
        return false;
    }
    // Organizers usually don't submit to their own events through this flow
    if (event.details.organizers?.includes(studentId)) {
        return false;
    }

    if (event.details.format === EventFormat.Team) {
        if (!studentTeam) return false; // Must be in a team
        // Optional: Enforce only team lead can submit
        // return studentTeam.teamLead === studentId;
        return true; // Any team member can submit by default (adjust if needed)
    } else { // Individual / Competition
        return event.participants?.includes(studentId) || false;
    }
}

/**
 * Checks if a student can make selections/vote in an event.
 * @param event - The event object.
 * @param studentId - The UID of the student.
 * @returns boolean
 */
export function canStudentMakeSelections(event: Event | null, studentId: string | null): boolean {
    if (!event || !studentId || event.status !== EventStatus.Completed || event.votingOpen !== true) {
        return false;
    }
    const isTeamMember = event.details.format === EventFormat.Team && event.teams?.some(t => t.members.includes(studentId));
    const isIndividualParticipant = event.details.format !== EventFormat.Team && event.participants?.includes(studentId);
    return isTeamMember || isIndividualParticipant;
}