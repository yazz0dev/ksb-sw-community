// src/store/modules/events/mutations.ts
import { MutationTree } from 'vuex';
import { EventState, Event, EventStatus, OrganizerRating, Team, Submission, EventFormat } from '@/types/event'; // Add EventFormat

// Helper function to compare events for sorting
function compareEvents(a: Event, b: Event): number {
    const statusOrder: Record<EventStatus, number> = {
        [EventStatus.Pending]: 0,
        [EventStatus.Approved]: 1,
        [EventStatus.InProgress]: 2,
        [EventStatus.Completed]: 3,
        [EventStatus.Cancelled]: 4,
        [EventStatus.Rejected]: 5,
        [EventStatus.Closed]: 6,
    };
    const orderA = statusOrder[a.status as EventStatus] ?? 9;
    const orderB = statusOrder[b.status as EventStatus] ?? 9;

    if (orderA !== orderB) return orderA - orderB;

    // Secondary sort by relevant date (descending - newest first)
    let dateA = 0, dateB = 0;
    if (
      [EventStatus.Pending, EventStatus.Approved, EventStatus.InProgress].includes(a.status as EventStatus)
    ) {
        // Use start date, fallback to , fallback to creation
        dateA = a.details.date.start?.toMillis() ?? a.details.date.start?.toMillis() ?? a.createdAt?.toMillis() ?? 0;
        dateB = b.details.date.start?.toMillis() ?? b.details.date.start?.toMillis() ?? b.createdAt?.toMillis() ?? 0;
    } else { // Completed, Cancelled, Rejected, Closed
        // Use completion date, fallback to end date, fallback to creation
        dateA = a.completedAt?.toMillis() ?? a.details.date.end?.toMillis() ?? a.createdAt?.toMillis() ?? 0;
        dateB = b.completedAt?.toMillis() ?? b.details.date.end?.toMillis() ?? b.createdAt?.toMillis() ?? 0;
    }
    return dateB - dateA; // Newest first
}

export const eventMutations: MutationTree<EventState> = {
    setEvents(state: EventState, events: Event[]) {
        state.events = Array.isArray(events) ? events : [];
        state.events.sort(compareEvents); // Sort after setting
    },

    addOrUpdateEvent(state: EventState, event: Event) {
        if (!event?.id) return; // Ignore invalid data
        const index = state.events.findIndex((e: Event) => e.id === event.id);
        if (index !== -1) {
            // Merge changes: Ensure existing fields aren't overwritten with undefined
            const existingEvent = state.events[index];
            // Deep merge for details and other nested fields
            state.events[index] = {
                ...existingEvent,
                ...event,
                details: { ...existingEvent.details, ...event.details },
                criteria: event.criteria ?? existingEvent.criteria,
                // --- FIX: Always replace teams array if present ---
                teams: Array.isArray(event.teams) ? event.teams : existingEvent.teams,
                participants: event.participants ?? existingEvent.participants,
                submissions: event.submissions ?? existingEvent.submissions,
                ratings: event.ratings ?? existingEvent.ratings,
                winners: event.winners ?? existingEvent.winners,
                bestPerformerSelections: event.bestPerformerSelections ?? existingEvent.bestPerformerSelections,
                // Add any other fields as needed
            };
        } else {
            state.events.push(event);
        }
        state.events.sort(compareEvents); // Re-sort after add/update
    },

    removeEvent(state: EventState, eventId: string) {
        state.events = state.events.filter((event: Event) => event.id !== eventId);
        // Also clear details if the removed event was being viewed
        if (state.currentEventDetails?.id === eventId) {
            state.currentEventDetails = null;
        }
    },

    setCurrentEventDetails(state: EventState, eventData: Event | null) {
        state.currentEventDetails = eventData ? { ...eventData } : null;
    },

    updateCurrentEventDetails(state: EventState, { id, changes }: { id: string; changes: Partial<Event> }) {
        if (state.currentEventDetails?.id === id) {
             // Merge changes carefully, avoiding overwriting with undefined
            const updatedDetails = { ...state.currentEventDetails, ...changes };
            state.currentEventDetails = updatedDetails;
        }
    },

    clearCurrentEventDetails(state: EventState) {
        state.currentEventDetails = null;
    },

    // Simplified mutation for organization ratings (action handles logic)
    updateOrganizationRatings(state: EventState, { eventId, ratings }: { eventId: string; ratings: OrganizerRating[] }) {
        const event = state.events.find((e: Event) => e.id === eventId);
        if (event) {
            if (!event.ratings) event.ratings = {};
            event.ratings.organizer = ratings;
        }
        if (state.currentEventDetails?.id === eventId) {
            if (!state.currentEventDetails.ratings) state.currentEventDetails.ratings = {};
            state.currentEventDetails.ratings.organizer = ratings;
        }
    },

    // Simplified mutation for team ratings (action handles logic)
    updateTeamRatings(state: EventState, { eventId, teamName, ratings }: { eventId: string; teamName: string; ratings: any[] }) {
        const event = state.events.find((e: Event) => e.id === eventId);
        const team = event?.teams?.find((t: Team) => t.teamName === teamName);
        if (team) {
            team.ratings = ratings;
        }
        if (state.currentEventDetails?.id === eventId) {
            const currentTeam = state.currentEventDetails.teams?.find((t: Team) => t.teamName === teamName);
            if (currentTeam) {
                currentTeam.ratings = ratings;
            }
        }
    },

    // Simplified mutation for winners (action handles logic)
    updateWinners(state: EventState, { eventId, winners }: { eventId: string; winners: Record<string, string[]> }) {
         const event = state.events.find((e: Event) => e.id === eventId);
         if (event) {
             event.winners = winners;
         }
         if (state.currentEventDetails?.id === eventId) {
             state.currentEventDetails.winners = winners;
         }
     },

     // Simplified mutation for team updates (action handles logic)
     updateTeams(state: EventState, { eventId, teams }: { eventId: string; teams: Team[] }) {
          const event = state.events.find((e: Event) => e.id === eventId);
          if (event) {
              event.teams = teams;
          }
          if (state.currentEventDetails?.id === eventId) {
              state.currentEventDetails.teams = teams;
          }
      },

      // Simplified mutation for individual submissions (action handles logic)
      updateIndividualSubmissions(state: EventState, { eventId, submissions }: { eventId: string; submissions: Submission[] }) {
           const event = state.events.find((e: Event) => e.id === eventId);
           if (event) {
               event.submissions = submissions;
           }
           if (state.currentEventDetails?.id === eventId) {
               state.currentEventDetails.submissions = submissions;
           }
       },
};