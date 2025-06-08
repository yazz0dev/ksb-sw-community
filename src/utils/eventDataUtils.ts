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
export const mapEventDataToFirestore = (data: EventFormData | Partial<EventWithId>): any => { // Changed Partial<Event> to Partial<EventWithId>
    const firestoreData: any = { ...data };
    
    // Remove id if present, as it's not part of the document data
    if ('id' in firestoreData) {
        delete firestoreData.id;
    }
    
    // Sanitize fields based on event format
    if (firestoreData.details && typeof firestoreData.details.format === 'string') {
        const format = firestoreData.details.format as EventFormat;

        if (format === EventFormat.Competition) {
            firestoreData.criteria = [];
            firestoreData.teams = [];
            // Prize is allowed for competitions, allowProjectSubmission is handled by caller/form logic
        } else { // Not Competition (Team or Individual)
            firestoreData.details.prize = null; // No prize for non-competition events
            // Criteria are allowed for Team/Individual
            if (format !== EventFormat.Team) { // Individual
                firestoreData.teams = []; // No teams for individual events
            }
            // If Team, teams array is preserved or initialized by || [] below
        }
    }

    // Ensure optional fields are null, not undefined, and arrays are initialized
    if (firestoreData.details) {
        firestoreData.details.prize = firestoreData.details.prize || null;
        firestoreData.details.rules = firestoreData.details.rules || null;
        
        // Ensure organizers is always an array
        if (!firestoreData.details.organizers || !Array.isArray(firestoreData.details.organizers)) {
            firestoreData.details.organizers = [];
        }
    }
    
    // Handle date conversion to Firestore Timestamps
    if (data.details?.date?.start || data.details?.date?.end) {
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
    }
    
    // Clean and validate criteria array
    if (Array.isArray(firestoreData.criteria)) {
        const originalCriteria = firestoreData.criteria;
        firestoreData.criteria = firestoreData.criteria
            .filter((criterion: any) => {
                // Filter out invalid criteria (empty role, negative constraintIndex, etc.)
                const isValid = criterion && 
                       typeof criterion.title === 'string' && criterion.title.trim() !== '' &&
                       typeof criterion.role === 'string' && criterion.role.trim() !== '' &&
                       typeof criterion.points === 'number' && criterion.points > 0 &&
                       typeof criterion.constraintIndex === 'number' && criterion.constraintIndex >= 0;
                
                if (!isValid) {
                    console.log('Filtering out invalid criterion:', criterion);
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
        
        console.log('Criteria filtering: original count =', originalCriteria.length, ', final count =', firestoreData.criteria.length);
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
    
    return firestoreData;
};

/**
 * Maps Firestore document data back to application Event format
 * Handles type conversions and ensures proper timestamps
 */
export const mapFirestoreToEventData = (id: string, data: any): EventBaseData | null => {
  try {
    if (!data) return null;
    
    // Create a properly formatted Event object
    const event: EventBaseData = {
      id, // Set id directly without using spread operator that would overwrite it
      details: {
        title: data.details?.eventName || '', // Add title property, defaulting to eventName
        eventName: data.details?.eventName || '',
        description: data.details?.description || '',
        format: data.details?.format || EventFormat.Individual,
        type: data.details?.type || '',
        organizers: data.details?.organizers || [],
        date: {
          start: data.details?.date?.start || null,
          end: data.details?.date?.end || null
        },
        allowProjectSubmission: data.details?.allowProjectSubmission ?? true,
        prize: data.details?.prize || null,
        rules: data.details?.rules || null
      },
      // ...copy the rest of the properties from data
      ...data
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
  if (event.criteriaVotes && event.criteriaVotes[userId] && Object.keys(event.criteriaVotes[userId]).length > 0) {
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
  if (event.criteriaVotes && event.criteriaVotes[userId] && Object.keys(event.criteriaVotes[userId]).length > 0) {
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
    const specificVote = event.criteriaVotes[userId][criterionConstraintIndex]; // specificVote is of type string | undefined

    // Check if specificVote is a string. If so, it's a valid vote.
    if (typeof specificVote === 'string') {
      return specificVote; // specificVote is narrowed to 'string' here.
    } else {
      // specificVote is 'undefined' here.
      return undefined; 
    }
  }
  
  // Fallback for non-string criterionConstraintIndex or if the vote is not found under a string key.
  return undefined;
}