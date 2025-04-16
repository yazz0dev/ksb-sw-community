// src/store/modules/events/mutations.ts
import { MutationTree } from 'vuex';
import { EventState, Event, EventStatus, OrganizationRating, Rating, Team, Submission } from '@/types/event'; // Added Rating, Team, Submission

// Helper function to compare events for sorting
function compareEvents(a: Event, b: Event): number {
    const statusOrder: Record<EventStatus, number> = {
        [EventStatus.Pending]: 0,
        [EventStatus.Approved]: 1,
        [EventStatus.InProgress]: 2,
        [EventStatus.Completed]: 3,
        [EventStatus.Cancelled]: 4,
        [EventStatus.Rejected]: 5,
    };
    const orderA = statusOrder[a.status] ?? 9;
    const orderB = statusOrder[b.status] ?? 9;

    if (orderA !== orderB) return orderA - orderB;

    // Secondary sort by relevant date (descending - newest first)
    let dateA = 0, dateB = 0;
    if ([EventStatus.Pending, EventStatus.Approved, EventStatus.InProgress].includes(a.status)) {
        // Use start date, fallback to desired, fallback to creation
        dateA = a.startDate?.toMillis() ?? a.desiredStartDate?.toMillis() ?? a.createdAt?.toMillis() ?? 0;
        dateB = b.startDate?.toMillis() ?? b.desiredStartDate?.toMillis() ?? b.createdAt?.toMillis() ?? 0;
    } else { // Completed, Cancelled, Rejected
        // Use completion date, fallback to end date, fallback to creation
        dateA = a.completedAt?.toMillis() ?? a.endDate?.toMillis() ?? a.createdAt?.toMillis() ?? 0;
        dateB = b.completedAt?.toMillis() ?? b.endDate?.toMillis() ?? b.createdAt?.toMillis() ?? 0;
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
        const index = state.events.findIndex(e => e.id === event.id);
        if (index !== -1) {
            // Merge changes: Ensure existing fields aren't overwritten with undefined
            const existingEvent = state.events[index];
            const updatedEvent = { ...existingEvent };
            for (const key in event) {
                if (Object.prototype.hasOwnProperty.call(event, key)) {
                     // Only update if the new value is not undefined
                     if ((event as any)[key] !== undefined) {
                         (updatedEvent as any)[key] = (event as any)[key];
                     }
                }
            }
             state.events[index] = updatedEvent;
        } else {
            state.events.push(event);
        }
        state.events.sort(compareEvents); // Re-sort after add/update
    },

    removeEvent(state: EventState, eventId: string) {
        state.events = state.events.filter(event => event.id !== eventId);
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
            const updatedDetails = { ...state.currentEventDetails };
            for (const key in changes) {
                if (Object.prototype.hasOwnProperty.call(changes, key)) {
                    if ((changes as any)[key] !== undefined) {
                        (updatedDetails as any)[key] = (changes as any)[key];
                    }
                }
            }
             state.currentEventDetails = updatedDetails;
        }
    },

    clearCurrentEventDetails(state: EventState) {
        state.currentEventDetails = null;
    },

    // Simplified mutation for organization ratings (action handles logic)
    updateOrganizationRatings(state: EventState, { eventId, ratings }: { eventId: string; ratings: OrganizationRating[] }) {
        const event = state.events.find(e => e.id === eventId);
        if (event) {
            event.organizationRatings = ratings;
        }
        if (state.currentEventDetails?.id === eventId) {
            state.currentEventDetails.organizationRatings = ratings;
        }
    },

    // Simplified mutation for team ratings (action handles logic)
    updateTeamRatings(state: EventState, { eventId, teamName, ratings }: { eventId: string; teamName: string; ratings: Rating[] }) {
        const event = state.events.find(e => e.id === eventId);
        const team = event?.teams?.find(t => t.teamName === teamName);
        if (team) {
            team.ratings = ratings;
        }
        if (state.currentEventDetails?.id === eventId) {
            const currentTeam = state.currentEventDetails.teams?.find(t => t.teamName === teamName);
            if (currentTeam) {
                currentTeam.ratings = ratings;
            }
        }
    },

    // Simplified mutation for winners (action handles logic)
    updateWinners(state: EventState, { eventId, winners }: { eventId: string; winners: Record<string, string[]> }) {
         const event = state.events.find(e => e.id === eventId);
         if (event) {
             event.winnersPerRole = winners;
         }
         if (state.currentEventDetails?.id === eventId) {
             state.currentEventDetails.winnersPerRole = winners;
         }
     },

     // Simplified mutation for team updates (action handles logic)
     updateTeams(state: EventState, { eventId, teams }: { eventId: string; teams: Team[] }) {
          const event = state.events.find(e => e.id === eventId);
          if (event) {
              event.teams = teams;
          }
          if (state.currentEventDetails?.id === eventId) {
              state.currentEventDetails.teams = teams;
          }
      },

      // Simplified mutation for individual submissions (action handles logic)
      updateIndividualSubmissions(state: EventState, { eventId, submissions }: { eventId: string; submissions: Submission[] }) {
           const event = state.events.find(e => e.id === eventId);
           if (event) {
               event.submissions = submissions;
           }
           if (state.currentEventDetails?.id === eventId) {
               state.currentEventDetails.submissions = submissions;
           }
       },
};