// src/utils/eventDataUtils.ts

import { serverTimestamp, type DocumentData } from 'firebase/firestore'; // Import serverTimestamp & DocumentData
import type { 
    Event as EventBaseData, // Aliasing to clarify it's the base structure
    EventFormData, 
    EventCriteria,
    Team // Import Team
} from '@/types/event';
import { EventFormat, EventStatus } from '@/types/event';
import { type DateInput, toFirestoreTimestamp } from '@/utils/dateTime'; // Added import, toFirestoreTimestamp

// EventWithId is no longer needed as EventBaseData (Event) includes id.
// type EventWithId = EventBaseData & { id: string }; // Removed

export const BEST_PERFORMER_LABEL = "Best Performer";

// ------------------------------------------------
// TIMESTAMP CONVERSION UTILITIES
// ------------------------------------------------

// TIMESTAMP CONVERSION UTILITIES
// ------------------------------------------------

// convertToTimestamp function removed, moved to utils/dateTime.ts as toFirestoreTimestamp

// ------------------------------------------------
// FIRESTORE DATA MAPPING FUNCTIONS
// ------------------------------------------------

/**
 * Maps event data from application format to Firestore format
 * Handles date conversions and ensures proper timestamps
 */
// Changed EventWithId to EventBaseData, return type to Record<string, unknown>
export const mapEventDataToFirestore = (data: EventFormData | Partial<EventBaseData>): Record<string, unknown> => {
    const firestoreData: Record<string, unknown> = { ...data }; // Changed from any
    
    if ('id' in firestoreData) {
        delete firestoreData.id;
    }

    // Cast details to a flexible type to handle properties not yet in the official type definition
    const details = firestoreData.details as Record<string, any> | undefined;

    const isChildEvent = !!details?.parentId;
    
    // Sanitize fields based on event format and whether it's a child event
    if (details && typeof details.format === 'string') {
        const format = details.format as EventFormat;

        // If the event itself (or phase) is marked as a competition
        if (details.isCompetition) {
            // For a competitive event/phase, certain fields might be handled differently
            // This logic seems to be more about overall event structure vs phase structure.
            // If format is MultiEvent and it's a competition, criteria/teams are per-phase.
            if (format === EventFormat.MultiEvent) {
                firestoreData.criteria = []; // Overall criteria cleared for MultiEvent
                firestoreData.teams = []; // Overall teams cleared for MultiEvent
                details.coreParticipants = []; // Overall coreParticipants cleared
            }
            // Prize logic:
            // If it's a child event (phase) and it's a competition, it can have its own prize.
            // If it's a parent event and a competition, it can have an overall prize.
            // If it's NOT a competition (regardless of parent/child), prize should be null.
        } else { // Not a competition
            if (!isChildEvent) { // Parent events that are not competitions don't have prizes
                details.prize = null;
            }
            // For child events, prize is allowed regardless of parent's format, if child itself is competition.
            // If child is not competition, its prize should be null.
            else if (!details.isCompetition) {
                 details.prize = null;
            }


            if (format !== EventFormat.Team) { // Individual
                firestoreData.teams = [];
            } else { // Team
                 details.coreParticipants = [];
            }
        }
    }

    if (details) { // Use the typed 'details' variable
        details.prize = details.prize || null;
        details.rules = details.rules || null;
        details.coreParticipants = (details.format === EventFormat.Individual && Array.isArray(details.coreParticipants))
                                               ? details.coreParticipants.filter((uid: string) => typeof uid === 'string' && uid.trim() !== '').slice(0, 10) // Changed uid: any to uid: string
                                               : [];
        
        if (!isChildEvent) { // Organizers only relevant for parent events in this mapping stage
            if (!details.organizers || !Array.isArray(details.organizers)) {
                details.organizers = [];
            }
        }
        // parentId is taken as is from formData
        details.parentId = details.parentId || null;
    }
    
    // Handle date conversion to Firestore Timestamps (only if not a child event, or if dates are explicitly passed for child - currently inherited)
    if (details && !isChildEvent && (details.date?.start || details.date?.end)) {
        const currentDetailsDate = details.date as { start: DateInput, end: DateInput }; // Assert type
        details.date = { // Ensure details.date is an object
            start: toFirestoreTimestamp(currentDetailsDate.start), // Use toFirestoreTimestamp from dateTime.ts
            end: toFirestoreTimestamp(currentDetailsDate.end)   // Use toFirestoreTimestamp from dateTime.ts
        };
    } else if (isChildEvent && details) {
        // For child events, date is inherited.
        // Ensure this object is not undefined if details itself exists.
        details.date = details.date || { start: null, end: null };
    }
    
    // Clean and validate criteria array
    if (Array.isArray(firestoreData.criteria)) {
        firestoreData.criteria = (firestoreData.criteria as EventCriteria[])
            .filter((criteria: EventCriteria) => { // Typed criteria
                const isValid = criteria && 
                       typeof criteria.title === 'string' && criteria.title.trim() !== '' &&
                       typeof criteria.role === 'string' && criteria.role.trim() !== '' &&
                       typeof criteria.points === 'number' && criteria.points > 0 &&
                       typeof criteria.constraintIndex === 'number' && criteria.constraintIndex >= 0;
                return isValid;
            })
            .map((criteria: EventCriteria) => { // Typed criteria
                return {
                    constraintIndex: criteria.constraintIndex,
                    title: criteria.title.trim(),
                    points: criteria.points,
                    role: criteria.role.trim()
                    // Removed targetRole as it's not in the cleaned object structure here
                };
            });
    } else {
        firestoreData.criteria = [];
    }

    // Clean and validate teams array
    if (Array.isArray(firestoreData.teams)) {
        firestoreData.teams = (firestoreData.teams as Team[])
            .filter((team: Team) => { // Typed team
                return team && 
                       typeof team.teamName === 'string' && team.teamName.trim() !== '' &&
                       Array.isArray(team.members) && team.members.length > 0;
            })
            .map((team: Team) => { // Typed team
                const cleanTeam: Partial<Team> = { // Typed cleanTeam
                    teamName: team.teamName.trim(),
                    members: Array.isArray(team.members) ? team.members.filter((member: string) => typeof member === 'string' && member.trim() !== '') : [] // Typed member
                };
                if (typeof team.teamLead === 'string' && team.teamLead.trim() !== '') {
                    cleanTeam.teamLead = team.teamLead.trim();
                }
                return cleanTeam;
            });
         } else {
         firestoreData.teams = [];
     }

     // Generate teamMemberFlatList from teams
     if (Array.isArray(firestoreData.teams) && (firestoreData.teams as Team[]).length > 0) {
         const allTeamMembers = (firestoreData.teams as Team[]).reduce((acc: string[], team: Team) => { // Typed team
             if (Array.isArray(team.members)) {
                 acc.push(...team.members);
             }
             return acc;
         }, []);
         // Remove duplicates in case a member is in multiple teams
         firestoreData.teamMemberFlatList = [...new Set(allTeamMembers)];
     } else {
         firestoreData.teamMemberFlatList = [];
     }

     firestoreData.participants = firestoreData.participants || [];
    firestoreData.submissions = firestoreData.submissions || [];
    
    // Ensure objects are properly initialized (not undefined)
    firestoreData.organizerRatings = firestoreData.organizerRatings || {};
    firestoreData.winners = firestoreData.winners || {};
    firestoreData.criteriaVotes = firestoreData.criteriaVotes || {};
    firestoreData.bestPerformerSelections = firestoreData.bestPerformerSelections || {};
    
    // Ensure optional fields that can be null are explicitly set
    if (firestoreData.rejectionReason === undefined) {
        firestoreData.rejectionReason = null;
    }
    if (firestoreData.manuallySelectedBy === undefined) {
        firestoreData.manuallySelectedBy = null;
    }
    if (firestoreData.gallery === undefined) {
        firestoreData.gallery = null;
    }
    if (firestoreData.lifecycleTimestamps === undefined) {
        firestoreData.lifecycleTimestamps = null;
    }
    
    // Always set/update lastUpdatedAt with server's current time
    firestoreData.lastUpdatedAt = serverTimestamp();
    
    // Ensure coreParticipants is an array in details if it exists
    if (details && !Array.isArray(details.coreParticipants)) {
      details.coreParticipants = [];
    }
    
    return firestoreData;
};

// Changed data type from any to DocumentData | Record<string, unknown>
export const mapFirestoreToEventData = (id: string, data: DocumentData | Record<string, unknown> | null): EventBaseData | null => {
  try {
    if (!data) return null;
    
    // Use type assertion for data if needed, or access properties carefully
    const eventData = data as Record<string, any>;

    const event: EventBaseData = {
      id,
      details: {
        eventName: eventData.details?.eventName || '',
        description: eventData.details?.description || '',
        format: eventData.details?.format || EventFormat.Individual,
        isCompetition: eventData.details?.isCompetition || false,
        organizers: eventData.details?.organizers || [],
        coreParticipants: eventData.details?.coreParticipants || [],
        parentId: eventData.details?.parentId || null,
        date: { // Ensure date objects are correctly formed, possibly converting Timestamps
          start: eventData.details?.date?.start || null,
          end: eventData.details?.date?.end || null
        },
        allowProjectSubmission: eventData.details?.allowProjectSubmission ?? true,
        prize: eventData.details?.prize || null,
        rules: eventData.details?.rules || null,
        phases: eventData.details?.phases || null,
        type: eventData.details?.type || '', // Ensure type is present
      } as any, // Cast to any to allow properties not defined in the static type
      status: eventData.status || EventStatus.Pending,
      requestedBy: eventData.requestedBy || '',
      votingOpen: eventData.votingOpen || false,
      lastUpdatedAt: eventData.lastUpdatedAt || null,
      participants: eventData.participants || [],
      submissions: eventData.submissions || [],
      criteria: eventData.criteria || [],
      teams: eventData.teams || [],
      organizerRatings: eventData.organizerRatings || {},
      winners: eventData.winners || {},
      criteriaVotes: eventData.criteriaVotes || {},
      bestPerformerSelections: eventData.bestPerformerSelections || {},
      rejectionReason: eventData.rejectionReason || null,
      manuallySelectedBy: eventData.manuallySelectedBy || null,
      gallery: eventData.gallery || null,
      lifecycleTimestamps: eventData.lifecycleTimestamps || null,
      teamMemberFlatList: eventData.teamMemberFlatList || [],
    };
    
    return event;
  } catch (error) {
    console.error('Error mapping Firestore data to Event:', error);
    return null;
  }
};

// ------------------------------------------------
// EVENT DATA UTILITY FUNCTIONS
// ------------------------------------------------

/**
 * Checks if voting is currently open for an event
 */
export function isVotingOpen(event: EventBaseData | null): boolean { // Changed EventWithId to EventBaseData
  if (!event) return false;
  return event.status === EventStatus.Completed && event.votingOpen === true;
}

/**
 * Checks if a user has already submitted votes/selections for an event
 */
export function hasUserSubmittedVotes(event: EventBaseData | null, userId: string | null): boolean { // Changed EventWithId to EventBaseData
  if (!event || !userId) return false;
  
  // Check if user has any votes in the criteriaVotes structure
  if (event.criteriaVotes && event.criteriaVotes[userId] && Object.keys(event.criteriaVotes[userId] || {}).length > 0) {
    return true;
  }
  // Check if user has selected a best performer
  if (event.bestPerformerSelections && event.bestPerformerSelections[userId]) { // Removed BEST_PERFORMER_LABEL
    return true;
  }
  return false;
}

/**
 * Filters and returns valid criteria for voting/display
 */
export function getValidCriteria(
  event: EventBaseData | null, // Changed EventWithId to EventBaseData
  excludeBestPerformer: boolean = false
): EventCriteria[] {
  if (!event || !Array.isArray(event.criteria)) return [];

  let criteriaToConsider = event.criteria;

  if (excludeBestPerformer) {
    criteriaToConsider = criteriaToConsider.filter(
      (c) => c.title !== BEST_PERFORMER_LABEL 
    );
  }
  return criteriaToConsider.filter(c => c.title && c.title.trim() !== '' && c.role && c.role.trim() !== '');
}

/**
 * Creates a payload for submitting team criteria votes
 */
export function createTeamVotePayload(
  eventId: string, 
  criteriaVotes: Record<string, string>, 
  bestPerformerSelection?: string
): { eventId: string; selections: { criteria: Record<string, string>; bestPerformer?: string } } {
  const selections: { criteria: Record<string, string>; bestPerformer?: string } = {
    criteria: criteriaVotes,
  };
  if (bestPerformerSelection !== undefined) {
    selections.bestPerformer = bestPerformerSelection;
  }
  return {
    eventId,
    selections,
  };
}
/**
 * Creates a payload for submitting individual winner votes
 */
export function createIndividualVotePayload(
  eventId: string,
  winnerVotes: Record<string, string>
): { eventId: string; winnervotes: Record<string, string> } {
  return { eventId, winnervotes: winnerVotes };
}
/**
 * Creates a payload for submitting manual winner selections
 */
export function createManualWinnerPayload(
  eventId: string,
  manualSelections: Record<string, string>,
  bestPerformerSelection?: string
): { eventId: string; winnerSelections: Record<string, string[]> } {
  const winnerSelections: Record<string, string[]> = {};
  
  // Convert constraint selections to array format
  Object.entries(manualSelections).forEach(([constraintKey, selectedValue]) => {
    if (selectedValue && selectedValue.trim() !== '') {
      // Extract constraint index from key (e.g., "constraint0" -> "0")
      const constraintIndex = constraintKey.replace('constraint', '');
      winnerSelections[constraintIndex] = [selectedValue];
    }
  });
  
  // Add best performer selection if provided
  if (bestPerformerSelection && bestPerformerSelection.trim() !== '') {
    winnerSelections['bestPerformer'] = [bestPerformerSelection];
  }
  
  return {
    eventId,
    winnerSelections
  };
}

export function hasStudentVotedForEvent(event: EventBaseData | null, userId: string | null): boolean { // Changed EventWithId to EventBaseData
  if (!event || !userId) return false;
  if (event.criteriaVotes && event.criteriaVotes[userId] && Object.keys(event.criteriaVotes[userId] || {}).length > 0) {
    return true;
  }
  if (event.bestPerformerSelections && event.bestPerformerSelections[userId]) {
    return true;
  }
  return false;
}

export function getStudentVoteForcriteria(
  event: EventBaseData | null, // Changed EventWithId to EventBaseData
  userId: string | null, 
  criteriaConstraintIndex: number | string 
): string | undefined { 
  if (!event || !userId || !event.criteriaVotes || !event.criteriaVotes[userId]) {
    return undefined;
  }
  
  if (typeof criteriaConstraintIndex === 'string') {
    // After the checks above, event.criteriaVotes[userId] is Record<string, string>
    const userVotes = event.criteriaVotes[userId];
    if (userVotes) {
      const specificVote = userVotes[criteriaConstraintIndex]; // specificVote is of type string | undefined

      // Check if specificVote is a string. If so, it's a valid vote.
      if (typeof specificVote === 'string') {
        return specificVote; // specificVote is narrowed to 'string' here.
      } else {
        // specificVote is 'undefined' here.
        return undefined; 
      }
    }
  }
  
  // Fallback for non-string criteriaConstraintIndex or if the vote is not found under a string key.
  return undefined;
}