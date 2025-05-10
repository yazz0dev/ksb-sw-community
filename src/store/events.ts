// src/store/events.ts
import { defineStore } from 'pinia';
// Remove unused getDoc
import { Timestamp, doc, writeBatch, increment } from 'firebase/firestore'; 
import { db } from '../firebase'; // Adjusted path
import { DateTime } from 'luxon'; // Import DateTime

// --- Import Types ---
import {
    Event, EventStatus, EventFormat,
    EventCriteria, Team, Submission // Remove unused OrganizerRating
} from '@/types/event'; // Removed EventState

// --- Import Stores ---
import { useUserStore } from './user';
import { useNotificationStore } from './notification';
import { useAppStore } from './app';

// --- Import Action Helpers ---
import { fetchAllEventsFromFirestore, fetchSingleEventFromFirestore } from './events/actions.fetching';
import {
    createEventRequestInFirestore, updateEventDetailsInFirestore,
    updateEventStatusInFirestore // Remove unused closeEventDocumentInFirestore
} from './events/actions.lifecycle';
import { joinEventInFirestore, leaveEventInFirestore } from './events/actions.participants';
import {
    toggleRatingsOpenInFirestore, submitTeamCriteriaVoteInFirestore,
    submitIndividualWinnerVoteInFirestore, submitOrganizationRatingInFirestore,
    calculateWinnersFromVotes, saveWinnersToFirestore, submitManualWinnerSelectionInFirestore
} from './events/actions.ratings';
import { submitProjectToEventInFirestore } from './events/actions.submissions';
import { addTeamToEventInFirestore, updateEventTeamsInFirestore } from './events/actions.teams';
import { checkExistingRequestsForUser, checkDateConflictInFirestore } from './events/actions.validation';
import { calculateEventXP, handleFirestoreError } from './events/actions.utils'; // Ensure correct import path

// --- Helper for Sorting ---
function compareEvents(a: Event, b: Event): number {
    const statusOrder: Record<string, number> = {
        [EventStatus.Pending]: 0, [EventStatus.Approved]: 1, [EventStatus.InProgress]: 2,
        [EventStatus.Completed]: 3, [EventStatus.Cancelled]: 4, [EventStatus.Rejected]: 5,
        [EventStatus.Closed]: 6,
    };
    const orderA = statusOrder[a.status as EventStatus] ?? 9;
    const orderB = statusOrder[b.status as EventStatus] ?? 9;
    if (orderA !== orderB) return orderA - orderB;

    // Safely handle toDate with null checks
    let dateA = a.createdAt ? a.createdAt.toDate?.() : null;
    let dateB = b.createdAt ? b.createdAt.toDate?.() : null;
    
    // Convert to milliseconds or use 0 as fallback
    let dateATime = dateA ? dateA.getTime() : 0;
    let dateBTime = dateB ? dateB.getTime() : 0;

    if ([EventStatus.Pending, EventStatus.Approved, EventStatus.InProgress].includes(a.status as EventStatus)) {
        const startA = a.details?.date?.start;
        const startB = b.details?.date?.start;
        dateATime = startA?.toDate ? startA.toDate().getTime() : dateATime;
        dateBTime = startB?.toDate ? startB.toDate().getTime() : dateBTime;
    } else {
        const endA = a.completedAt || a.details?.date?.end;
        const endB = b.closedAt || b.details?.date?.end;
        dateATime = endA?.toDate ? endA.toDate().getTime() : dateATime;
        dateBTime = endB?.toDate ? endB.toDate().getTime() : dateBTime;
    }
    
    return [EventStatus.Pending, EventStatus.Approved, EventStatus.InProgress].includes(a.status as EventStatus)
        ? dateATime - dateBTime
        : dateBTime - dateATime;
}

// --- Store Definition ---
export const useEventStore = defineStore('events', {
    // State definition
    state: () => ({
        events: [] as Event[], // Initialize with empty array and type
        currentEventDetails: null as Event | null, // Initialize with null and type
        error: null as string | null, // Add error state property
    }),

    // Getters definition
    getters: {
        allEvents: (state): Event[] => state.events,
        getEventById: (state) => (eventId: string): Event | undefined => {
            if (state.currentEventDetails?.id === eventId) return state.currentEventDetails;
            return state.events.find((event: Event) => event.id === eventId);
        },
        getEventsByIds: (state) => (ids: string[]): Event[] => {
            if (!Array.isArray(ids) || ids.length === 0) return [];
            const idSet = new Set(ids);
            return state.events.filter((e: Event) => idSet.has(e.id));
        },
        userRequests: (state): Event[] => {
            const userStore = useUserStore(); // Access other store in getter
            const userId = userStore.uid;
            if (!userId) return [];
            return state.events
                .filter(e => e.requestedBy === userId && [EventStatus.Pending, EventStatus.Rejected].includes(e.status as EventStatus))
                .sort(compareEvents);
        },
        getEventCriteria: (state) => (eventId: string): EventCriteria[] => {
            const event = state.events.find(e => e.id === eventId);
            if (!event?.criteria || !Array.isArray(event.criteria)) return [];
            return [...event.criteria]
                .filter(alloc => typeof alloc.constraintIndex === 'number')
                .sort((a, b) => a.constraintIndex - b.constraintIndex);
        },
    },

    // Actions (incorporating mutations)
    actions: {
        /** Internal action to update local state consistently */
        _updateLocalEvent(eventData: Event) {
            if (!eventData?.id) return;

            let normalizedCriteria = eventData.criteria;
            // Check if criteria exists, is an object, and not already an array
            if (eventData.criteria && typeof eventData.criteria === 'object' && !Array.isArray(eventData.criteria)) {
                // Convert object (e.g., {0: critA, 1: critB}) to array [critA, critB]
                normalizedCriteria = Object.values(eventData.criteria);
            } else if (!eventData.criteria) {
                // Ensure it's at least an empty array if undefined or null
                normalizedCriteria = [];
            }

            const index = this.events.findIndex((e: Event) => e.id === eventData.id);
            const eventWithDefaults = { // Ensure defaults for safety
                ...eventData,
                criteria: normalizedCriteria, // Use the normalized criteria
                ratingsOpen: typeof eventData.ratingsOpen === 'boolean' ? eventData.ratingsOpen : false,
                details: eventData.details || {},
            };
            if (index !== -1) {
                // Use splice or direct assignment for reactivity
                this.events.splice(index, 1, eventWithDefaults);
            } else {
                this.events.push(eventWithDefaults);
            }
            this.events.sort(compareEvents);
            if (this.currentEventDetails?.id === eventData.id) {
                this.currentEventDetails = { ...eventWithDefaults };
            }
        },

        // --- Fetching Actions ---
        async fetchEvents() {
            const notificationStore = useNotificationStore();
            try {
                const events = await fetchAllEventsFromFirestore();
                this.events = events; // Direct state update
                this.events.sort(compareEvents);
            } catch (error) {
                notificationStore.showNotification({ message: handleFirestoreError(error), type: 'error' });
                // Decide if the component needs the error re-thrown
            }
        },

        async fetchEventDetails(eventId: string): Promise<Event | null> {
            const notificationStore = useNotificationStore();
            this.currentEventDetails = null; // Clear previous
            try {
                const event = await fetchSingleEventFromFirestore(eventId);
                this.currentEventDetails = event; // Set current details
                if (event) {
                    this._updateLocalEvent(event); // Ensure it's in the main list
                } else {
                     notificationStore.showNotification({ message: `Event (ID: ${eventId}) not found.`, type: 'warning' });
                }
                return event;
            } catch (error) {
                this.currentEventDetails = null;
                notificationStore.showNotification({ message: `Failed to load event details: ${handleFirestoreError(error)}`, type: 'error' });
                throw error; // Re-throw for component handling
            }
        },

        // --- Validation Actions ---
        async checkExistingRequests(): Promise<boolean> {
            const userStore = useUserStore();
            if (!userStore.uid) return false;
            try {
                return await checkExistingRequestsForUser(userStore.uid);
            } catch (error) {
                 console.error("checkExistingRequests failed:", error);
                 // Set error state
                 this.error = handleFirestoreError(error) || 'Failed to check existing requests.';
                 return false; // Assume no request on error
            }
        },

        async checkEventDateAvailability(
            startDate: Date,
            endDate: Date,
            excludeEventId: string | null = null
        ): Promise<{ isAvailable: boolean; nextAvailableDate: DateTime | null }> {
            this.error = null; // Clear previous errors
            try {
                const result = await checkDateConflictInFirestore(startDate, endDate, excludeEventId);

                let nextAvailableLuxon: DateTime | null = null;
                if (result.nextAvailableDate) { // Only process if there's a date string
                    nextAvailableLuxon = DateTime.fromISO(result.nextAvailableDate);
                    if (!nextAvailableLuxon.isValid) {
                        console.warn(
                            "checkDateConflictInFirestore returned an unparsable string for nextAvailableDate:",
                            result.nextAvailableDate
                        );
                        nextAvailableLuxon = null; // Treat as no specific next date if unparsable
                    }
                }
                // If result.nextAvailableDate was null, nextAvailableLuxon remains null, which is correct.

                return {
                    isAvailable: !result.hasConflict,
                    nextAvailableDate: nextAvailableLuxon
                };
            } catch (err: any) {
                console.error("Pinia checkEventDateAvailability error:", err);
                // Set error state
                this.error = err.message || 'Failed to check date availability.';
                return { isAvailable: false, nextAvailableDate: null };
            }
        },

        // --- Lifecycle Actions ---
        async requestEvent(initialData: Partial<Event>): Promise<string> {
            const userStore = useUserStore();
            const notificationStore = useNotificationStore();
            // Remove unused appStore variable
            // const appStore = useAppStore(); 

            if (!userStore.uid) {
                 notificationStore.showNotification({ message: "You must be logged in.", type: 'error' });
                 throw new Error('User not logged in');
             }

            // Check for existing requests first
             const hasPending = await this.checkExistingRequests(); // Use 'this' for other actions
             if (hasPending) {
                 const msg = 'You already have a pending event request.';
                  notificationStore.showNotification({ message: msg, type: 'warning' });
                  throw new Error(msg);
             }

            // Offline check - Assuming handleOfflineAction exists on appStore
            // const offlineResult = await useAppStore().handleOfflineAction({ type: 'events/requestEvent', payload: initialData });
            // if (offlineResult.queued) return ''; // Indicate queued
            
            try {
                const newEventId = await createEventRequestInFirestore(initialData, userStore.uid);
                // Fetch the newly created event to update state correctly
                await this.fetchEventDetails(newEventId); // Use 'this' for other actions
                notificationStore.showNotification({ message: "Event requested successfully!", type: 'success' });
                return newEventId;
            } catch (error) {
                notificationStore.showNotification({ message: `Event request failed: ${handleFirestoreError(error)}`, type: 'error' });
                throw error;
            }
        },

        async updateEventDetails({ eventId, updates }: { eventId: string; updates: Partial<Event> }) {
            const userStore = useUserStore();
            const notificationStore = useNotificationStore();
            // Remove unused appStore variable
            // const appStore = useAppStore();

            // Offline check - Assuming handleOfflineAction exists on appStore
            // const offlineResult = await useAppStore().handleOfflineAction({ type: 'events/updateEventDetails', payload: { eventId, updates } });
            // if (offlineResult.queued) return;

            try {
                await updateEventDetailsInFirestore(eventId, updates, userStore.currentUser);
                // Fetch fresh data to ensure consistency
                await this.fetchEventDetails(eventId); // Use 'this' for other actions
                notificationStore.showNotification({ message: "Event updated successfully.", type: 'success' });
            } catch (error) {
                notificationStore.showNotification({ message: `Event update failed: ${handleFirestoreError(error)}`, type: 'error' });
                throw error;
            }
        },

        async updateEventStatus({ eventId, newStatus }: { eventId: string; newStatus: EventStatus }) {
             const notificationStore = useNotificationStore();
             // Remove unused appStore variable
             // const appStore = useAppStore();

             // Offline check (might be unsuitable for some status changes)
             // const offlineResult = await appStore.handleOfflineAction({ type: 'events/updateEventStatus', payload: { eventId, newStatus } });
             // if (offlineResult.queued) return;

             try {
                 // Remove unused appliedUpdates variable
                 // const appliedUpdates = await updateEventStatusInFirestore(eventId, newStatus);
                 await updateEventStatusInFirestore(eventId, newStatus);
                 // Fetch fresh details to get the fully updated object
                 await this.fetchEventDetails(eventId); // Use 'this' for other actions
                 notificationStore.showNotification({ message: `Event status updated to ${newStatus}.`, type: 'success' });
             } catch (error) {
                 notificationStore.showNotification({ message: `Status update failed: ${handleFirestoreError(error)}`, type: 'error' });
                 throw error;
             }
         },

        async cancelEvent(eventId: string) {
            await this.updateEventStatus({ eventId, newStatus: EventStatus.Cancelled }); // Use 'this' for other actions
        },

        // --- Participants Actions ---
        async joinEvent(eventId: string) {
             const userStore = useUserStore();
             const notificationStore = useNotificationStore();
             const appStore = useAppStore();

             // Offline check
             const offlineResult = await appStore.handleOfflineAction({ type: 'events/joinEvent', payload: { eventId } });
             if (offlineResult.queued) return;

             try {
                 if (!userStore.uid) throw new Error("User not authenticated.");
                 await joinEventInFirestore(eventId, userStore.uid);
                 await this.fetchEventDetails(eventId); // Use 'this' for other actions
                 notificationStore.showNotification({ message: "Successfully joined event!", type: 'success' });
             } catch (error) {
                 notificationStore.showNotification({ message: `Failed to join: ${handleFirestoreError(error)}`, type: 'error' });
                 throw error;
             }
         },

        async leaveEvent(eventId: string) {
             const userStore = useUserStore();
             const notificationStore = useNotificationStore();
             const appStore = useAppStore();

              // Offline check
              const offlineResult = await appStore.handleOfflineAction({ type: 'events/leaveEvent', payload: { eventId } });
              if (offlineResult.queued) return;

             try {
                 if (!userStore.uid) throw new Error("User not authenticated.");
                 await leaveEventInFirestore(eventId, userStore.uid);
                 await this.fetchEventDetails(eventId); // Use 'this' for other actions
                 notificationStore.showNotification({ message: "Successfully left event.", type: 'success' });
             } catch (error) {
                 notificationStore.showNotification({ message: `Failed to leave: ${handleFirestoreError(error)}`, type: 'error' });
                 throw error;
             }
         },

         // --- Ratings Actions ---
         async toggleRatingsOpen({ eventId, open }: { eventId: string; open: boolean }) {
              const userStore = useUserStore();
              const notificationStore = useNotificationStore();

              try {
                  if (!userStore.uid) throw new Error("Authentication required to modify ratings.");
                  
                  await toggleRatingsOpenInFirestore(eventId, open, userStore.uid);
                  await this.fetchEventDetails(eventId);
                  notificationStore.showNotification({ 
                      message: `Ratings are now ${open ? 'Open' : 'Closed'}.`, 
                      type: 'success' 
                  });
              } catch (error) {
                  notificationStore.showNotification({ 
                      message: `Failed to toggle ratings: ${handleFirestoreError(error)}`, 
                      type: 'error' 
                  });
                  throw error;
              }
          },

        async submitTeamCriteriaVote({ eventId, selections }: { eventId: string; selections: { criteria: Record<string, string>, bestPerformer?: string } }) {
             const userStore = useUserStore();
             const notificationStore = useNotificationStore();
             const appStore = useAppStore();

             // Offline check
             const offlineResult = await appStore.handleOfflineAction({ type: 'events/submitTeamCriteriaVote', payload: { eventId, selections } });
             if (offlineResult.queued) return;

             try {
                 if (!userStore.uid) throw new Error("User not authenticated.");
                 await submitTeamCriteriaVoteInFirestore(eventId, userStore.uid, selections);
                 await this.fetchEventDetails(eventId); // Use 'this' for other actions
                 notificationStore.showNotification({ message: "Team selections submitted.", type: 'success' });
             } catch (error) {
                 notificationStore.showNotification({ message: `Failed to submit selections: ${handleFirestoreError(error)}`, type: 'error' });
                 throw error;
             }
         },

         async submitIndividualWinnerVote({ eventId, winnerSelections }: { eventId: string; winnerSelections: Record<string, string> }) {
              const userStore = useUserStore();
              const notificationStore = useNotificationStore();
              const appStore = useAppStore();

              // Offline check
              const offlineResult = await appStore.handleOfflineAction({ type: 'events/submitIndividualWinnerVote', payload: { eventId, winnerSelections } });
              if (offlineResult.queued) return;

              try {
                  if (!userStore.uid) throw new Error("User not authenticated.");
                  await submitIndividualWinnerVoteInFirestore(eventId, userStore.uid, winnerSelections);
                  await this.fetchEventDetails(eventId); // Use 'this' for other actions
                  notificationStore.showNotification({ message: "Winner selections submitted.", type: 'success' });
              } catch (error) {
                  notificationStore.showNotification({ message: `Failed to submit selections: ${handleFirestoreError(error)}`, type: 'error' });
                  throw error;
              }
          },

          async submitManualWinnerSelection({ eventId, winnerSelections }: { eventId: string; winnerSelections: Record<string, string[]> }) {
              const userStore = useUserStore();
              const notificationStore = useNotificationStore();
              
              try {
                  if (!userStore.uid) throw new Error("User not authenticated.");
                  await submitManualWinnerSelectionInFirestore(eventId, userStore.uid, winnerSelections);
                  await this.fetchEventDetails(eventId);
                  notificationStore.showNotification({ message: "Manual winner selection successfully saved.", type: 'success' });
              } catch (error) {
                  notificationStore.showNotification({ message: `Failed to save manual winner selection: ${handleFirestoreError(error)}`, type: 'error' });
                  throw error;
              }
          },

          async submitOrganizationRating({ eventId, score, feedback }: { eventId: string; score: number; feedback?: string }) {
              const userStore = useUserStore();
              const notificationStore = useNotificationStore();
              const appStore = useAppStore();

              // Offline check
              const payload = { eventId, score, feedback };
              const offlineResult = await appStore.handleOfflineAction({ type: 'events/submitOrganizationRating', payload });
              if (offlineResult.queued) return;


              try {
                  if (!userStore.uid) throw new Error("User not authenticated.");
                  await submitOrganizationRatingInFirestore(eventId, userStore.uid, score, feedback);
                  await this.fetchEventDetails(eventId); // Use 'this' for other actions
                  notificationStore.showNotification({ message: "Organizer rating submitted.", type: 'success' });
              } catch (error) {
                  notificationStore.showNotification({ message: `Failed to submit rating: ${handleFirestoreError(error)}`, type: 'error' });
                  throw error;
              }
          },

           async findWinner(eventId: string) {
                 const notificationStore = useNotificationStore();
                 // Offline check - Not suitable.

                 try {
                     const event = this.getEventById(eventId); // Use getter
                     if (!event) throw new Error("Event data not loaded locally.");

                     // Permission check happens within calculate/save helpers implicitly if needed, or add here.

                     const calculatedWinners = await calculateWinnersFromVotes(event); // Use helper

                     if (Object.keys(calculatedWinners).length === 0) {
                          notificationStore.showNotification({ message: "No winners could be determined based on selections.", type: 'info' });
                          return;
                     }

                     await saveWinnersToFirestore(eventId, calculatedWinners); // Use helper
                     await this.fetchEventDetails(eventId); // Use 'this' for other actions
                     notificationStore.showNotification({ message: "Winner(s) determined and saved.", type: 'success' });

                 } catch (error) {
                     notificationStore.showNotification({ message: `Failed to find winners: ${handleFirestoreError(error)}`, type: 'error' });
                     throw error;
                 }
             },

         // --- Submissions Actions ---
         async submitProjectToEvent({ eventId, submissionData }: { eventId: string; submissionData: Partial<Submission> }) {
              const userStore = useUserStore();
              const notificationStore = useNotificationStore();
              const appStore = useAppStore();

               // Offline check
               const payload = { eventId, submissionData };
               const offlineResult = await appStore.handleOfflineAction({ type: 'submission/submitProjectToEvent', payload }); // Use distinct type
               if (offlineResult.queued) return;

              try {
                  if (!userStore.uid) throw new Error("User not authenticated.");
                  await submitProjectToEventInFirestore(eventId, userStore.uid, submissionData);
                  await this.fetchEventDetails(eventId); // Use 'this' for other actions
                  notificationStore.showNotification({ message: "Project submitted successfully!", type: 'success' });
              } catch (error) {
                  notificationStore.showNotification({ message: `Failed to submit project: ${handleFirestoreError(error)}`, type: 'error' });
                  throw error;
              }
          },

         // --- Teams Actions ---
         async addTeamToEvent({ eventId, teamName, members }: { eventId: string; teamName: string; members: string[] }) {
             const notificationStore = useNotificationStore();
              // Offline check - complex?

              try {
                  await addTeamToEventInFirestore(eventId, teamName, members);
                  await this.fetchEventDetails(eventId); // Use 'this' for other actions
                  notificationStore.showNotification({ message: `Team "${teamName}" added.`, type: 'success' });
              } catch (error) {
                  notificationStore.showNotification({ message: `Failed to add team: ${handleFirestoreError(error)}`, type: 'error' });
                  throw error;
              }
          },

          async updateTeams({ eventId, teams }: { eventId: string; teams: Team[] }) {
               const notificationStore = useNotificationStore();
               // Offline check - complex?

               try {
                   await updateEventTeamsInFirestore(eventId, teams);
                   await this.fetchEventDetails(eventId); // Use 'this' for other actions
                   notificationStore.showNotification({ message: `Teams updated successfully.`, type: 'success' });
               } catch (error) {
                   notificationStore.showNotification({ message: `Failed to update teams: ${handleFirestoreError(error)}`, type: 'error' });
                   throw error;
               }
           },

          // Auto-generate now calls updateTeams internally after calculation
          async autoGenerateTeams({ eventId, minMembersPerTeam = 2, maxMembersPerTeam = 8 }: { eventId: string; minMembersPerTeam?: number; maxMembersPerTeam?: number; }) {
             const notificationStore = useNotificationStore();
             const userStore = useUserStore(); // Need user store for student list

             if (!eventId) throw new Error('Event ID required.');
             // Removed numberOfTeams parameter and its validation

             try {
                 const event = this.getEventById(eventId); // Get current local data
                 if (!event) throw new Error('Event data not loaded locally. Cannot auto-generate teams.');
                 if (event.details.format !== EventFormat.Team) throw new Error("Auto-generation only for 'Team' events.");
                 if (!event.teams || event.teams.length < 2) {
                    throw new Error("Auto-generation requires at least 2 teams to be pre-defined for the event.");
                 }
                 const numberOfTeams = event.teams.length; // Use existing number of teams

                 // Ensure student list is loaded
                 if (userStore.studentList.length === 0) {
                     await userStore.fetchAllStudents();
                 }
                 const students = userStore.getStudentList; // Use getter
                 if (students.length < numberOfTeams * minMembersPerTeam) {
                     throw new Error(`Not enough students (${students.length}) available to populate ${numberOfTeams} teams with at least ${minMembersPerTeam} members each.`);
                 }

                 // --- Generation Logic  ---
                 // Start with copies of existing teams, but clear their members for redistribution
                 const teamsToPopulate: Team[] = event.teams.map(team => ({
                     ...team, // Preserve name, lead (though lead might become invalid and need reset)
                     members: [], // Clear members for redistribution
                 }));

                 const shuffledStudents = [...students].sort(() => 0.5 - Math.random());

                 shuffledStudents.forEach((student, idx) => {
                     teamsToPopulate[idx % numberOfTeams].members.push(student.uid);
                 });

                 const finalTeams = teamsToPopulate
                     .filter(team => team.members.length >= minMembersPerTeam) // Should always pass if initial student check is correct
                     .map(team => {
                         const currentMembers = team.members.slice(0, maxMembersPerTeam);
                         // Ensure team lead is one of the new members, or clear/default it
                         const newTeamLead = currentMembers.includes(team.teamLead) ? team.teamLead : (currentMembers[0] || '');
                         return {
                             ...team,
                             members: currentMembers,
                             teamLead: newTeamLead
                         };
                     });

                 if (finalTeams.length !== numberOfTeams) {
                    // This case should ideally not be hit if student count and team structure are validated properly
                    console.warn(`Team generation resulted in ${finalTeams.length} teams, expected ${numberOfTeams}. This might indicate an issue with member distribution or filtering.`);
                    // Decide if to throw error or proceed with what was generated
                    if (finalTeams.length < 2) throw new Error("Could not generate at least 2 valid teams after distribution.");
                 }
                 // --- End Generation Logic ---

                 // Use the updateTeams action to save the result
                 await this.updateTeams({ eventId, teams: finalTeams });
                 notificationStore.showNotification({ message: `Teams auto-generated successfully for ${finalTeams.length} teams.`, type: 'success' });
                 // The notification from updateTeams might be redundant or could be combined.
                 // For now, this specific message for generation is kept.

             } catch (error) {
                 notificationStore.showNotification({ message: `Failed to generate teams: ${handleFirestoreError(error)}`, type: 'error' });
                 throw error;
             }
         },

         async checkDateConflict(payload: { startDate: string | Date | Timestamp | null; endDate: string | Date | Timestamp | null; excludeEventId?: string | null }): Promise<{ hasConflict: boolean; nextAvailableDate: string | null; conflictingEvent: Event | null }> {
              // Directly call the helper function
              try {
                   return await checkDateConflictInFirestore(payload.startDate, payload.endDate, payload.excludeEventId);
              } catch (error) {
                   const notificationStore = useNotificationStore();
                   // Set error state
                   this.error = handleFirestoreError(error) || 'Date conflict check failed.';
                   notificationStore.showNotification({ message: `Date check failed: ${this.error}`, type: 'error' });
                   // Return a default conflicting state on error?
                   return { hasConflict: true, nextAvailableDate: null, conflictingEvent: null };
              }
         },

         clearDateCheck() {
             // No state to clear in Pinia for this specifically
             console.log("Pinia: clearDateCheck called.");
         },

         // --- Closing Event Action ---
         async closeEventPermanently({ eventId }: { eventId: string }): Promise<{ success: boolean; message: string; xpAwarded?: Record<string, Record<string, number>> }> {
             const userStore = useUserStore();
             const notificationStore = useNotificationStore();
             const appStore = useAppStore(); // For setting closed state cache

             try {
                 // 1. Fetch latest event data locally first
                 const event = this.getEventById(eventId); // Use getter
                 if (!event) {
                      // Attempt fetch if not found locally
                      await this.fetchEventDetails(eventId); // Use 'this' for other actions
                      const freshEvent = this.currentEventDetails;
                      if (!freshEvent) throw new Error("Event not found.");
                      // Use freshEvent for checks below
                 }
                 const eventData = this.getEventById(eventId)!; // Should exist now

                 // 2. Perform Checks (using local/fresh data)
                  const currentUserUid = userStore.uid;
                  const isOrganizer = eventData.details?.organizers?.includes(currentUserUid ?? '') || eventData.requestedBy === currentUserUid;
                  if (!isOrganizer) throw new Error("Unauthorized: Only organizers can close events.");
                  if (eventData.status !== EventStatus.Completed) throw new Error("Event must be 'Completed' to be closed.");
                  if (eventData.ratingsOpen) throw new Error("Ratings must be closed before closing the event.");
                  if (!eventData.winners || Object.keys(eventData.winners).length === 0) throw new Error("Winners must be determined before closing.");

                 // 3. Calculate XP (using helper)
                 const xpMap = await calculateEventXP(eventData);

                 // 4. Award XP (batch write to Firestore)
                 const batch = writeBatch(db);
                 let totalXpAwarded = 0;
                 let usersAwarded = 0;
                 for (const [userId, roles] of Object.entries(xpMap)) {
                     const userRef = doc(db, 'users', userId);
                     let userTotal = 0;
                     for (const [role, xp] of Object.entries(roles)) {
                         if (xp > 0) {
                             batch.update(userRef, { [`xpByRole.${role}`]: increment(xp) });
                             userTotal += xp;
                         }
                     }
                      if (userTotal > 0) { totalXpAwarded += userTotal; usersAwarded++; }
                 }

                 // 5. Update Event Status in Firestore within the same batch
                 const eventRef = doc(db, 'events', eventId);
                 batch.update(eventRef, {
                     status: EventStatus.Closed,
                     closedAt: Timestamp.now(),
                     lastUpdatedAt: Timestamp.now()
                 });

                 // 6. Commit Batch
                 await batch.commit();

                 // 7. Update Local State
                 await this.fetchEventDetails(eventId); // Use 'this' for other actions // Fetch final state
                 appStore.setEventClosedState({ eventId, isClosed: true }); // Update app cache

                 // 8. Refresh current user's data if they earned XP
                 if (currentUserUid && xpMap[currentUserUid]) {
                    await userStore.fetchUserData(currentUserUid); // Refresh local user data
                 }

                 const successMessage = `Event closed. ${totalXpAwarded} XP awarded to ${usersAwarded} users.`;
                 notificationStore.showNotification({ message: successMessage, type: 'success' });
                 return { success: true, message: successMessage, xpAwarded: xpMap };

             } catch (error) {
                 notificationStore.showNotification({ message: `Failed to close event: ${handleFirestoreError(error)}`, type: 'error' });
                 throw error;
             }
         },

     },
 });