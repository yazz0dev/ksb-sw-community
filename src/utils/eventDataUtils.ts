import { Timestamp, serverTimestamp } from 'firebase/firestore'; // Import serverTimestamp
import type { 
    Event as EventBaseData, // Aliasing to clarify it's the base structure
    EventFormData, 
    EventCriteria} from '@/types/event';
import { EventFormat, EventStatus } from '@/types/event';
import { convertToISTDateTime, type DateInput } from '@/utils/dateTime'; // Added import

// Define EventWithId locally or import if available globally
type EventWithId = EventBaseData & { id: string };

export const BEST_PERFORMER_LABEL = "Best Performer"; // Define the missing constant

// ------------------------------------------------
// TIMESTAMP CONVERSION UTILITIES
// ------------------------------------------------

/**
 * Helper function to convert different date formats to Firestore Timestamp
 */
function convertToTimestamp(dateValue: DateInput): Timestamp | null {
    if (!dateValue) return null;
    
    try {
        // If it's already a Firestore Timestamp, return it directly.
        if (dateValue instanceof Timestamp) {
            return dateValue;
        }

        // If it's a plain object with seconds and nanoseconds (typical for Firestore Timestamps in some contexts, but not an instance of Timestamp class)
        if (typeof dateValue === 'object' && 'seconds' in dateValue && 'nanoseconds' in dateValue && !(dateValue instanceof Date)) {
            return new Timestamp(dateValue.seconds, dateValue.nanoseconds);
        }

        // For Date objects or string representations, use convertToISTDateTime to get a Luxon DateTime object.
        // convertToISTDateTime handles Date, string, and also Firestore Timestamp (converting the latter to Luxon DateTime).
        const luxonDt = convertToISTDateTime(dateValue);

        if (!luxonDt || !luxonDt.isValid) {
            console.warn('Invalid date or failed conversion by convertToISTDateTime. Input:', dateValue, 'Reason:', luxonDt?.invalidReason);
            return null;
        }
        
        // Convert the Luxon DateTime object to a JS Date, then to a Firestore Timestamp.
        return Timestamp.fromDate(luxonDt.toJSDate());
    } catch (error) {
        console.error('Error converting date to Firestore Timestamp:', error, 'Input:', dateValue);
        return null;
    }
}

// ------------------------------------------------
// FIRESTORE DATA MAPPING FUNCTIONS
// ------------------------------------------------

/**
 * Maps event data from application format to Firestore format
 * Handles date conversions and ensures proper timestamps
 */
export const mapEventDataToFirestore = (data: EventFormData | Partial<EventWithId>): any => {
    const firestoreData: any = { ...data };
    
    if ('id' in firestoreData) {
        delete firestoreData.id;
    }

    const isChildEvent = !!firestoreData.details?.parentId;
    
    // Sanitize fields based on event format and whether it's a child event
    if (firestoreData.details && typeof firestoreData.details.format === 'string') {
        const format = firestoreData.details.format as EventFormat;

        // If the event itself (or phase) is marked as a competition
        if (firestoreData.details.isCompetition) {
            // For a competitive event/phase, certain fields might be handled differently
            // This logic seems to be more about overall event structure vs phase structure.
            // If format is MultiEvent and it's a competition, criteria/teams are per-phase.
            if (format === EventFormat.MultiEvent) {
                firestoreData.criteria = []; // Overall criteria cleared for MultiEvent
                firestoreData.teams = []; // Overall teams cleared for MultiEvent
                firestoreData.details.coreParticipants = []; // Overall coreParticipants cleared
            }
            // Prize logic:
            // If it's a child event (phase) and it's a competition, it can have its own prize.
            // If it's a parent event and a competition, it can have an overall prize.
            // If it's NOT a competition (regardless of parent/child), prize should be null.
        } else { // Not a competition
            if (!isChildEvent) { // Parent events that are not competitions don't have prizes
                firestoreData.details.prize = null;
            }
            // For child events, prize is allowed regardless of parent's format, if child itself is competition.
            // If child is not competition, its prize should be null.
            else if (!firestoreData.details.isCompetition) {
                 firestoreData.details.prize = null;
            }


            if (format !== EventFormat.Team) { // Individual
                firestoreData.teams = [];
            } else { // Team
                 firestoreData.details.coreParticipants = [];
            }
        }
    }

    if (firestoreData.details) {
        firestoreData.details.prize = firestoreData.details.prize || null;
        firestoreData.details.rules = firestoreData.details.rules || null;
        firestoreData.details.coreParticipants = (firestoreData.details.format === EventFormat.Individual && Array.isArray(firestoreData.details.coreParticipants))
                                               ? firestoreData.details.coreParticipants.filter((uid: any) => typeof uid === 'string' && uid.trim() !== '').slice(0, 10)
                                               : [];
        
        if (!isChildEvent) { // Organizers only relevant for parent events in this mapping stage
            if (!firestoreData.details.organizers || !Array.isArray(firestoreData.details.organizers)) {
                firestoreData.details.organizers = [];
            }
        }
        // parentId is taken as is from formData
        firestoreData.details.parentId = firestoreData.details.parentId || null;
    }
    
    // Handle date conversion to Firestore Timestamps (only if not a child event, or if dates are explicitly passed for child - currently inherited)
    if (!isChildEvent && (data.details?.date?.start || data.details?.date?.end)) {
        firestoreData.details = firestoreData.details || {};
        firestoreData.details.date = firestoreData.details.date || {};

        if (data.details.date.start) {
            (firestoreData.details.date as any).start = convertToTimestamp(data.details.date.start);
        } else {
            (firestoreData.details.date as any).start = null;
        }
        
        if (data.details.date.end) {
            (firestoreData.details.date as any).end = convertToTimestamp(data.details.date.end);
        } else {
            (firestoreData.details.date as any).end = null;
        }
    } else if (isChildEvent && firestoreData.details) {
        // For child events, date is inherited, so we might not transform it here,
        // assuming it's already in Timestamp format from parent or correctly set by service.
        // If formData for a child event could somehow provide its own dates, conversion would be needed.
        // For now, let's assume service layer handles setting correct date object from parent.
        // delete firestoreData.details.date; // Or ensure it's set correctly by service
    }
    
    // Clean and validate criteria array
    if (Array.isArray(firestoreData.criteria)) {
        // Remove unused variable
        firestoreData.criteria = firestoreData.criteria
            .filter((criterion: any) => {
                // Filter out invalid criteria (empty role, negative constraintIndex, etc.)
                const isValid = criterion && 
                       typeof criterion.title === 'string' && criterion.title.trim() !== '' &&
                       typeof criterion.role === 'string' && criterion.role.trim() !== '' &&
                       typeof criterion.points === 'number' && criterion.points > 0 &&
                       typeof criterion.constraintIndex === 'number' && criterion.constraintIndex >= 0;
                
                if (!isValid) {
            
                }
                return isValid;
            })
            .map((criterion: any) => {
                // Clean the criterion object to remove frontend-specific fields
                return {
                    constraintIndex: criterion.constraintIndex,
                    title: criterion.title.trim(),
                    points: criterion.points,
                    role: criterion.role.trim()
                };
            });
        
    
    } else {
        firestoreData.criteria = [];
    }

    // Clean and validate teams array
    if (Array.isArray(firestoreData.teams)) {
        firestoreData.teams = firestoreData.teams
            .filter((team: any) => {
                // Filter out invalid teams
                return team && 
                       typeof team.teamName === 'string' && team.teamName.trim() !== '' &&
                       Array.isArray(team.members) && team.members.length > 0;
            })
            .map((team: any) => {
                // Clean the team object to remove frontend-specific fields
                const cleanTeam: any = {
                    teamName: team.teamName.trim(),
                    members: Array.isArray(team.members) ? team.members.filter((member: any) => typeof member === 'string' && member.trim() !== '') : []
                };
                
                // Only include teamLead if it's a valid string
                if (typeof team.teamLead === 'string' && team.teamLead.trim() !== '') {
                    cleanTeam.teamLead = team.teamLead.trim();
                }
                
                return cleanTeam;
            });
         } else {
         firestoreData.teams = [];
     }

     // Generate teamMemberFlatList from teams
     if (Array.isArray(firestoreData.teams) && firestoreData.teams.length > 0) {
         const allTeamMembers = firestoreData.teams.reduce((acc: string[], team: any) => {
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
    if (firestoreData.details && !Array.isArray(firestoreData.details.coreParticipants)) {
      firestoreData.details.coreParticipants = [];
    }

    // Handle childEventIds - Removed as childEventIds is no longer part of the types
    // firestoreData.childEventIds = Array.isArray(data.childEventIds) ? data.childEventIds : [];
    
    return firestoreData;
};

export const mapFirestoreToEventData = (id: string, data: any): EventBaseData | null => {
  try {
    if (!data) return null;
    
    const event: EventBaseData = {
      id,
      details: {
        // title: data.details?.eventName || '', // title is not part of EventDetails
        eventName: data.details?.eventName || '',
        description: data.details?.description || '',
        format: data.details?.format || EventFormat.Individual,
        // type: data.details?.type || '', // 'type' removed from EventDetails
        isCompetition: data.details?.isCompetition || false,
        organizers: data.details?.organizers || [],
        coreParticipants: data.details?.coreParticipants || [],
        parentId: data.details?.parentId || null, // Map parentId
        date: {
          start: data.details?.date?.start || null,
          end: data.details?.date?.end || null
        },
        allowProjectSubmission: data.details?.allowProjectSubmission ?? true,
        prize: data.details?.prize || null,
        rules: data.details?.rules || null,
        phases: data.details?.phases || null,
      },
      // childEventIds: data.childEventIds || [], // 'childEventIds' removed from EventBaseData
      // ...copy the rest of the properties from data
      ...data // Spread after explicit mappings to allow overrides from data if necessary
    };
    
    // Ensure event.id is not overwritten by spread if data contains an 'id' field
    event.id = id;
    // Ensure details are not overwritten if data contains a 'details' field at top level
    // This is tricky with spread. Better to map field by field or ensure data structure is clean.
    // For now, assuming data structure from Firestore is as expected.

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
export function isVotingOpen(event: EventWithId | null): boolean { // Parameter type changed
  if (!event) return false;
  return event.status === EventStatus.Completed && event.votingOpen === true;
}

/**
 * Checks if a user has already submitted votes/selections for an event
 */
export function hasUserSubmittedVotes(event: EventWithId | null, userId: string | null): boolean { // Parameter type changed
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
  event: EventWithId | null, // Parameter type changed
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
  const payloadWinners: Record<string, string[]> = {};
  for (const key in manualSelections) {
    const selection = manualSelections[key];
    if (selection) {
      payloadWinners[key] = [selection]; // Wrap in array
    }
  }
  if (bestPerformerSelection) {
    payloadWinners['bestPerformer'] = [bestPerformerSelection];
  }
  return { eventId, winnerSelections: payloadWinners };
}

export function hasStudentVotedForEvent(event: EventWithId | null, userId: string | null): boolean { // Parameter type changed
  if (!event || !userId) return false;
  if (event.criteriaVotes && event.criteriaVotes[userId] && Object.keys(event.criteriaVotes[userId] || {}).length > 0) {
    return true;
  }
  if (event.bestPerformerSelections && event.bestPerformerSelections[userId]) {
    return true;
  }
  return false;
}

export function getStudentVoteForCriterion(
  event: EventWithId | null, 
  userId: string | null, 
  criterionConstraintIndex: number | string 
): string | undefined { 
  if (!event || !userId || !event.criteriaVotes || !event.criteriaVotes[userId]) {
    return undefined;
  }
  
  if (typeof criterionConstraintIndex === 'string') {
    // After the checks above, event.criteriaVotes[userId] is Record<string, string>
    const userVotes = event.criteriaVotes[userId];
    if (userVotes) {
      const specificVote = userVotes[criterionConstraintIndex]; // specificVote is of type string | undefined

      // Check if specificVote is a string. If so, it's a valid vote.
      if (typeof specificVote === 'string') {
        return specificVote; // specificVote is narrowed to 'string' here.
      } else {
        // specificVote is 'undefined' here.
        return undefined; 
      }
    }
  }
  
  // Fallback for non-string criterionConstraintIndex or if the vote is not found under a string key.
  return undefined;
}