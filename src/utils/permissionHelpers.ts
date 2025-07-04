import { type Event, EventStatus } from '@/types/event';
import type { UserData } from '@/types/student';
import {  EVENT_MANAGER_ROLES } from './constants';
import { useProfileStore } from '@/stores/profileStore'; // Import the user store


/**
 * This function now checks `(currentUser as any).role` against EVENT_MANAGER_ROLES.
 * Checks if the current user has a role that allows general event management.
 * Note: The `currentUser` (of type `EnrichedStudentData`) from `useProfileStore` does not typically have a `.role` property.
 * This function will usually return `false` for standard student users because `(currentUser as any).role` will be `undefined`,
 * and `EVENT_MANAGER_ROLES` (e.g., `['eventManager', 'moderator']`) does not include `undefined`.
 * This implies that this permission is intended for users with specific administrative roles,
 * potentially loaded via a different mechanism or on an admin-specific interface where user objects might include a `role`.
 * @returns boolean - True if the user has a recognized event management role, false otherwise.
 */
export function canManageEvents( ): boolean {
  const studentStore = useProfileStore();
  const currentUser = studentStore.currentStudent;

  if (!currentUser) { // If no user is logged in, they cannot manage events.
    return false;
  }

  // Accessing .role via `as any` because EnrichedStudentData doesn't define it.
  // This check will be true if `EVENT_MANAGER_ROLES` includes the value of `currentUser.role`.
  // For standard students, `currentUser.role` will be undefined, leading to a false result.
  return EVENT_MANAGER_ROLES.includes((currentUser as any).role as typeof EVENT_MANAGER_ROLES[number]);
}

/**
 * Checks if a user is a participant in a specific event
 * @param event The event object
 * @param userId The user's ID
 * @returns boolean
 */
export function isEventParticipant(event: Event | null, userId?: string | null): boolean {
  if (!event || !userId) return false;
  
  // Check team events
  const isInTeam = event.teams?.some(team => 
    Array.isArray(team.members) && team.members.includes(userId)
  );
  
  if (isInTeam) return true;
  
  // Check individual events
  return Array.isArray(event.participants) && event.participants.includes(userId);
}

/**
 * Determines if an event can be edited
 * @param eventStatus The event's current status
 * @returns boolean
 */
export function isEventEditable(eventStatus?: EventStatus | null): boolean {
  if (!eventStatus) return false;
  const editableStatuses = [EventStatus.Pending, EventStatus.Approved, EventStatus.InProgress];
  return editableStatuses.includes(eventStatus);
}

/**
 * Comprehensive check if a user can modify an event
 * @param event The event object
 * @param user The user object
 * @returns boolean
 */
export function canModifyEvent(event: Event | null, user: UserData | null): boolean {
  if (!event || !user) return false;
  
  // Check if organizer and editable status
  return isEventOrganizer(event, user.uid) && isEventEditable(event.status);
}

/**
 * Check if user can rate/vote in the event
 * Comprehensive implementation that checks:
 * - Event status (must be Completed)
 * - Voting status (must be open)
 * - User participation status
 * 
 * @param event The event object
 * @param userId The user's ID (optional, but required for actual validation)
 * @returns boolean indicating if the user can vote
 */
export function canVoteInEvent(event: Event | null, userId?: string | null): boolean {
  if (!event || !userId) return false;
  
  // Event must be completed and voting must be open
  if (event.status !== EventStatus.Completed || event.votingOpen !== true) {
    return false;
  }
  
  // Use existing helper to check participant status
  return isEventParticipant(event, userId);
}

/**
 * Check if user can manually select winners (organizers only)
 * @param event The event object
 * @param userId The user's ID
 * @returns boolean
 */
export function canManuallySelectWinners(event: Event | null, userId?: string | null): boolean {
  if (!event || !userId) return false;
  
  // Only completed events
  if (event.status !== EventStatus.Completed) return false;
  
  // Only organizers
  return isEventOrganizer(event, userId);
}

/**
 * Check if voting results can be calculated for an event
 * 
 * @param event The event to check
 * @param userId The user ID of the potential calculator (organizer)
 * @returns boolean indicating if winners can be calculated
 */
export function canCalculateWinners(event: Event | null, userId: string | null): boolean {
  if (!event || !userId) return false;
  
  // Event must be completed with voting closed
  if (event.status !== EventStatus.Completed || event.votingOpen === true) {
    return false;
  }
  
  // User must be an organizer
  const isOrganizer = 
    (Array.isArray(event.details?.organizers) && event.details.organizers.includes(userId)) ||
    event.requestedBy === userId;
    
  return isOrganizer;
}

/**
 * Checks if a user is an organizer of an event.
 * An organizer can be the user who requested the event or anyone listed in the event's organizers array.
 */
export function isEventOrganizer(event: Event | null, userId: string | null | undefined): boolean {
  if (!event || !userId) return false;
  const isRequester = event.requestedBy === userId;
  const isListedOrganizer = event.details?.organizers?.includes(userId) ?? false;
  return isRequester || isListedOrganizer;
}

/**
 * Checks if the current user can edit a specific event.
 * Note: This replaces the previous canModifyEvent and canUserEditEvent functions
 */
export function canUserEditEvent(event: Event | null, user: UserData | null): boolean {
  if (!event || !user) return false;
  // User must be an organizer and the event must be in an editable state.
  return isEventOrganizer(event, user.uid) && isEventEditable(event.status);
}

/**
 * Checks if the current user can vote in a specific event.
 */
export function canUserVoteInEvent(event: Event | null, user: UserData | null): boolean {
  if (!event || !user || !user.uid) return false;

  // Voting is only allowed if the event is Completed and voting is open.
  if (event.status !== EventStatus.Completed || event.votingOpen !== true) {
    return false;
  }
  // User must be a participant to vote.
  return isEventParticipant(event, user.uid);
}

/**
 * Checks if the current user can submit a project to a specific event.
 */
export function canUserSubmitToEvent(event: Event | null, user: UserData | null): boolean {
  if (!event || !user || !user.uid) return false;

  // Submissions are typically allowed when the event is InProgress.
  if (event.status !== EventStatus.InProgress) return false;
  // Check if project submissions are allowed for this event.
  if (event.details.allowProjectSubmission === false) return false;
  // Organizers typically cannot submit projects to their own events.
  if (isEventOrganizer(event, user.uid)) return false;

  // For team events, only the team lead can submit.
  if (event.details.format === 'Team') {
    const userTeam = event.teams?.find(team => team.members?.includes(user.uid!));
    return !!userTeam && userTeam.teamLead === user.uid;
  }
  // For individual events, any participant can submit.
  return event.participants?.includes(user.uid) ?? false;
}
