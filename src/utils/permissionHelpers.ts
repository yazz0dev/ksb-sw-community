import { Event, EventStatus } from '@/types/event';
import { UserData } from '@/types/user';
import {  EVENT_MANAGER_ROLES } from './constants';
import { useUserStore } from '@/store/user'; // Import the user store


/**
 * This function now checks `(currentUser as any).role` against EVENT_MANAGER_ROLES.
 * Given `currentUser.role` is undefined, this will likely return `false`
 * unless `EVENT_MANAGER_ROLES` includes `undefined`, aligning with the
 * concept that general users (students) do not have global event management rights.
 * @returns boolean
 */
export function canManageEvents( ): boolean {
  const userStore = useUserStore();
  const currentUser = userStore.currentUser;

  if (!currentUser) { // If no user is logged in, they cannot manage events.
    return false;
  }

  // This check will be true if `EVENT_MANAGER_ROLES` includes the value `undefined`
  // (when `undefined` is cast to the expected role type for type-checking purposes).
  // Given `EVENT_MANAGER_ROLES` typically contains role strings, this will usually be false.
  return EVENT_MANAGER_ROLES.includes((currentUser as any).role as typeof EVENT_MANAGER_ROLES[number]);
}

/**
 * Checks if a user is an organizer for a specific event
 * @param event The event object
 * @param userId The user's ID
 * @returns boolean
 */
export function isEventOrganizer(event: Event | null, userId?: string | null): boolean {
  if (!event || !userId) return false;
  
  const organizers = event.details?.organizers || [];
  const requestedBy = event.requestedBy;
  
  return organizers.includes(userId) || requestedBy === userId;
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
 * @param event The event object
 * @param userId The user's ID
 * @returns boolean
 */
export function canVoteInEvent(event: Event | null, userId?: string | null): boolean {
  if (!event || !userId || !event.ratingsOpen) return false;
  
  if (event.status !== EventStatus.Completed) return false;
  
  return isEventParticipant(event, userId);
}
