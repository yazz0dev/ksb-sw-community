import { Event, EventCriteria, EventFormat, EventStatus } from '@/types/event';
import { BEST_PERFORMER_LABEL } from '@/utils/constants';

/**
 * Checks if voting is currently open for an event
 * @param event The event object
 * @returns boolean indicating if voting is open
 */
export function isVotingOpen(event: Event | null): boolean {
  if (!event) return false;
  return event.status === EventStatus.Completed && event.votingOpen === true;
}

/**
 * Checks if a user has already submitted votes/selections for an event
 * @param event The event object
 * @param userId The user's ID
 * @returns boolean indicating if the user has voted
 */
export function hasUserSubmittedVotes(event: Event | null, userId: string | null): boolean {
  if (!event || !userId) return false;
  
  const criteriaArray = Array.isArray(event.criteria) ? event.criteria : [];
  
  if (event.details?.format === EventFormat.Team) {
    const criteriaVoted = criteriaArray.some((c: EventCriteria) => 
      c.votes&& c.votes[userId] !== undefined
    );
    const bestPerformerVoted = !!(event.bestPerformerSelections && 
      event.bestPerformerSelections[userId] !== undefined);
    
    return criteriaVoted || bestPerformerVoted;
  } else {
    return criteriaArray.some((c: EventCriteria) => 
      c.votes&& c.votes[userId] !== undefined
    );
  }
}

/**
 * Filters and returns valid criteria for voting/display
 * @param event The event object
 * @param excludeBestPerformer Whether to exclude the best performer criterion
 * @returns Array of valid criteria
 */
export function getValidCriteria(
  event: Event | null, 
  excludeBestPerformer: boolean = false
): EventCriteria[] {
  if (!event || !Array.isArray(event.criteria)) return [];
  
  return event.criteria.filter(c => {
    const hasLabel = !!c.title;
    const hasValidPoints = typeof c.points === 'number' && c.points > 0;
    const hasValidIndex = typeof c.constraintIndex === 'number';
    
    // Skip best performer if requested
    const isBestPerformer = c.title === BEST_PERFORMER_LABEL;
    if (excludeBestPerformer && isBestPerformer) {
      return false;
    }
    
    return hasLabel && hasValidPoints && hasValidIndex;
  });
}

/**
 * Creates a payload for submitting team criteria votes
 * @param eventId The event ID
 * @param criteriaVotes Object with constraint indexes as keys and team names as values
 * @param bestPerformerSelection Optional user ID of the best performer
 * @returns Payload object ready for submission
 */
export function createTeamVotePayload(
  eventId: string, 
  criteriaVotes: Record<string, string>, 
  bestPerformerSelection?: string
): { eventId: string; selections: { criteria: Record<string, string>; bestPerformer?: string } } {
  const criteriaPayload: Record<string, string> = {};
  
  Object.entries(criteriaVotes).forEach(([key, value]) => {
    // Extract constraint index from keys like "constraint0"
    const constraintIndex = key.replace('constraint', '');
    if (value) {
      criteriaPayload[constraintIndex] = value;
    }
  });
  
  return {
    eventId,
    selections: {
      criteria: criteriaPayload,
      bestPerformer: bestPerformerSelection
    }
  };
}

/**
 * Creates a payload for submitting individual winner votes
 * @param eventId The event ID
 * @param winnerVotes Object with constraint indexes as keys and user IDs as values
 * @returns Payload object ready for submission
 */
export function createIndividualVotePayload(
  eventId: string,
  winnerVotes: Record<string, string>
): { eventId: string; winnervotes: Record<string, string> } {
  const winnervotes: Record<string, string> = {};
  
  Object.entries(winnerVotes).forEach(([key, value]) => {
    // Extract constraint index from keys like "constraint0" 
    const constraintIndex = key.replace('constraint', '');
    if (value) {
      winnervotes[constraintIndex] = value;
    }
  });
  
  return {
    eventId,
    winnervotes
  };
}

/**
 * Creates a payload for submitting manual winner selections
 * @param eventId The event ID
 * @param manualSelections Object with constraint keys and selection values
 * @param bestPerformerSelection Optional user ID for best performer
 * @returns Payload object ready for submission
 */
export function createManualWinnerPayload(
  eventId: string,
  manualSelections: Record<string, string>,
  bestPerformerSelection?: string
): { eventId: string; winnervotes: Record<string, string[]> } {
  const winnervotes: Record<string, string[]> = {};
  
  Object.entries(manualSelections).forEach(([key, value]) => {
    // Extract constraint index from keys like "constraint0"
    const constraintIndex = key.replace('constraint', '');
    if (value) {
      winnervotes[constraintIndex] = [value];
    }
  });
  
  if (bestPerformerSelection) {
    winnervotes['bestPerformer'] = [bestPerformerSelection];
  }
  
  return {
    eventId,
    winnervotes
  };
}

/**
 * Checks if a student has voted for an event
 * @param event The event object
 * @param userId The user's ID
 * @returns boolean indicating if the student has voted
 */
export function hasStudentVotedForEvent(event: Event | null, userId: string | null): boolean {
  if (!event || !userId || !event.criteria) return false;
  return event.criteria.some(c =>
    c.votes && c.votes[userId] !== undefined
  );
}

/**
 * Gets the student's vote for a specific criterion
 * @param event The event object
 * @param userId The user's ID
 * @param criterionConstraintIndex The constraint index of the criterion
 * @returns The vote value or undefined if not voted
 */
export function getStudentVoteForCriterion(event: Event | null, userId: string | null, criterionConstraintIndex: number | string): string | undefined {
  if (!event || !userId || !event.criteria) return undefined;
  const criterion = event.criteria.find(c => c.constraintIndex === criterionConstraintIndex);
  return criterion?.votes?.[userId];
}
