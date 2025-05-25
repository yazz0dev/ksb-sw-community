// src/stores/events.ts
import { defineStore } from 'pinia';
import { Timestamp, doc, writeBatch, increment } from 'firebase/firestore';
import { db } from '../firebase'; // Adjusted path
import { DateTime } from 'luxon';

// --- Import Types ---
import {
    Event, EventStatus, EventFormat,
    EventCriteria, Team, Submission, OrganizerRating // Added OrganizerRating for clarity
} from '@/types/event';
// Import new XP types
import { XPData, XpFirestoreFieldKey, mapCalcRoleToFirestoreKey, XpCalculationRoleKey, getDefaultXPData } from '@/types/xp';


// --- Import Stores ---
import { useUserStore } from './user';
import { useNotificationStore } from './notification';
import { useAppStore } from './app';

// --- Import Action Helpers ---
import { fetchAllEventsFromFirestore, fetchSingleEventFromFirestore } from './events/actions.fetching';
import {
    createEventRequestInFirestore, updateEventDetailsInFirestore,
    updateEventStatusInFirestore
} from './events/actions.lifecycle';
import { joinEventInFirestore, leaveEventInFirestore } from './events/actions.participants';
import {
    togglevotingOpenInFirestore, submitTeamCriteriaVoteInFirestore,
    submitIndividualWinnerVoteInFirestore, submitOrganizationRatingInFirestore,
    calculateWinnersFromVotes, saveWinnersToFirestore, submitManualWinnerSelectionInFirestore
} from './events/actions.voting';
import { submitProjectToEventInFirestore } from './events/actions.submissions';
import { addTeamToEventInFirestore, updateEventTeamsInFirestore } from './events/actions.teams';
import { checkExistingRequestsForUser, checkDateConflictInFirestore } from './events/actions.validation';
import { calculateEventXP, handleFirestoreError } from './events/actions.utils';

// --- Helper for Sorting (remains the same) ---
function compareEvents(a: Event, b: Event): number {
    const statusOrder: Record<string, number> = {
        [EventStatus.Pending]: 0, [EventStatus.Approved]: 1, [EventStatus.InProgress]: 2,
        [EventStatus.Completed]: 3, [EventStatus.Cancelled]: 4, [EventStatus.Rejected]: 5,
        [EventStatus.Closed]: 6,
    };
    const orderA = statusOrder[a.status as EventStatus] ?? 9;
    const orderB = statusOrder[b.status as EventStatus] ?? 9;
    if (orderA !== orderB) return orderA - orderB;

    let dateA = a.createdAt ? a.createdAt.toDate?.() : null;
    let dateB = b.createdAt ? b.createdAt.toDate?.() : null;

    let dateATime = dateA ? dateA.getTime() : 0;
    let dateBTime = dateB ? dateB.getTime() : 0;

    if ([EventStatus.Pending, EventStatus.Approved, EventStatus.InProgress].includes(a.status as EventStatus)) {
        const startA = a.details?.date?.start;
        const startB = b.details?.date?.start;
        dateATime = startA?.toDate ? startA.toDate().getTime() : dateATime;
        dateBTime = startB?.toDate ? startB.toDate().getTime() : dateBTime;
    } else {
        const endA = a.completedAt || a.details?.date?.end;
        const endB = b.closedAt || b.details?.date?.end; // Use closedAt for sorting closed events
        dateATime = endA?.toDate ? endA.toDate().getTime() : dateATime;
        dateBTime = endB?.toDate ? endB.toDate().getTime() : dateBTime;
    }

    return [EventStatus.Pending, EventStatus.Approved, EventStatus.InProgress].includes(a.status as EventStatus)
        ? dateATime - dateBTime // Ascending for active/upcoming
        : dateBTime - dateATime; // Descending for completed/past
}

// --- Store Definition ---
export const useEventStore = defineStore('events', {
    state: () => ({
        events: [] as Event[],
        currentEventDetails: null as Event | null,
        error: null as string | null,
    }),

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
            const userStore = useUserStore();
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

    actions: {
        _updateLocalEvent(eventData: Event) {
            // ... (internal action remains largely the same)
            if (!eventData?.id) return;

            let normalizedCriteria = eventData.criteria;
            if (eventData.criteria && typeof eventData.criteria === 'object' && !Array.isArray(eventData.criteria)) {
                normalizedCriteria = Object.values(eventData.criteria);
            } else if (!eventData.criteria) {
                normalizedCriteria = [];
            }

            const index = this.events.findIndex((e: Event) => e.id === eventData.id);
            const eventWithDefaults = {
                ...eventData,
                criteria: normalizedCriteria,
                votingOpen: typeof eventData.votingOpen === 'boolean' ? eventData.votingOpen : false,
                details: eventData.details || {},
            };
            if (index !== -1) {
                this.events.splice(index, 1, eventWithDefaults);
            } else {
                this.events.push(eventWithDefaults);
            }
            this.events.sort(compareEvents);
            if (this.currentEventDetails?.id === eventData.id) {
                this.currentEventDetails = { ...eventWithDefaults };
            }
        },

        // --- Fetching Actions (remain the same) ---
        async fetchEvents() {
            const notificationStore = useNotificationStore();
            try {
                const events = await fetchAllEventsFromFirestore();
                this.events = events.sort(compareEvents);
            } catch (error) {
                notificationStore.showNotification({ message: handleFirestoreError(error), type: 'error' });
            }
        },

        async fetchEventDetails(eventId: string): Promise<Event | null> {
            const notificationStore = useNotificationStore();
            this.currentEventDetails = null;
            try {
                const event = await fetchSingleEventFromFirestore(eventId);
                this.currentEventDetails = event;
                if (event) {
                    this._updateLocalEvent(event);
                } else {
                     notificationStore.showNotification({ message: `Event (ID: ${eventId}) not found.`, type: 'warning' });
                }
                return event;
            } catch (error) {
                this.currentEventDetails = null;
                notificationStore.showNotification({ message: `Failed to load event details: ${handleFirestoreError(error)}`, type: 'error' });
                throw error;
            }
        },

        // --- Validation Actions (remain the same) ---
        async checkExistingRequests(): Promise<boolean> {
            const userStore = useUserStore();
            if (!userStore.uid) return false;
            try {
                return await checkExistingRequestsForUser(userStore.uid);
            } catch (error) {
                 this.error = handleFirestoreError(error) || 'Failed to check existing requests.';
                 return false;
            }
        },

        async checkEventDateAvailability(
            startDate: Date,
            endDate: Date,
            excludeEventId: string | null = null
        ): Promise<{ isAvailable: boolean; nextAvailableDate: DateTime | null }> {
            this.error = null;
            try {
                const result = await checkDateConflictInFirestore(startDate, endDate, excludeEventId);
                let nextAvailableLuxon: DateTime | null = null;
                if (result.nextAvailableDate) {
                    nextAvailableLuxon = DateTime.fromISO(result.nextAvailableDate);
                    if (!nextAvailableLuxon.isValid) nextAvailableLuxon = null;
                }
                return { isAvailable: !result.hasConflict, nextAvailableDate: nextAvailableLuxon };
            } catch (err: any) {
                this.error = err.message || 'Failed to check date availability.';
                return { isAvailable: false, nextAvailableDate: null };
            }
        },

        // --- Lifecycle Actions (requestEvent, updateEventDetails, updateEventStatus, cancelEvent remain largely the same) ---
        async requestEvent(initialData: Partial<Event>): Promise<string> {
            const userStore = useUserStore();
            const notificationStore = useNotificationStore();
            if (!userStore.uid) {
                 notificationStore.showNotification({ message: "You must be logged in.", type: 'error' });
                 throw new Error('User not logged in');
             }
             const hasPending = await this.checkExistingRequests();
             if (hasPending) {
                 const msg = 'You already have a pending event request.';
                  notificationStore.showNotification({ message: msg, type: 'warning' });
                  throw new Error(msg);
             }
            try {
                const newEventId = await createEventRequestInFirestore(initialData, userStore.uid);
                await this.fetchEventDetails(newEventId);
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
            try {
                await updateEventDetailsInFirestore(eventId, updates, userStore.currentUser);
                await this.fetchEventDetails(eventId);
                notificationStore.showNotification({ message: "Event updated successfully.", type: 'success' });
            } catch (error) {
                notificationStore.showNotification({ message: `Event update failed: ${handleFirestoreError(error)}`, type: 'error' });
                throw error;
            }
        },

        async updateEventStatus({ eventId, newStatus }: { eventId: string; newStatus: EventStatus }) {
             const notificationStore = useNotificationStore();
             const userStore = useUserStore();
             try {
                 await updateEventStatusInFirestore(eventId, newStatus, userStore.currentUser);
                 await this.fetchEventDetails(eventId);
                 notificationStore.showNotification({ message: `Event status updated to ${newStatus}.`, type: 'success' });
             } catch (error) {
                 notificationStore.showNotification({ message: `Status update failed: ${handleFirestoreError(error)}`, type: 'error' });
                 throw error;
             }
         },

        async cancelEvent(eventId: string) {
            await this.updateEventStatus({ eventId, newStatus: EventStatus.Cancelled });
        },

        // --- Participants Actions (joinEvent, leaveEvent remain the same) ---
        async joinEvent(eventId: string) {
             const userStore = useUserStore();
             const notificationStore = useNotificationStore();
             const appStore = useAppStore();
             const offlineResult = await appStore.handleOfflineAction({ type: 'events/joinEvent', payload: { eventId } });
             if (offlineResult.queued) return;
             try {
                 if (!userStore.uid) throw new Error("User not authenticated.");
                 await joinEventInFirestore(eventId, userStore.uid);
                 await this.fetchEventDetails(eventId);
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
              const offlineResult = await appStore.handleOfflineAction({ type: 'events/leaveEvent', payload: { eventId } });
              if (offlineResult.queued) return;
             try {
                 if (!userStore.uid) throw new Error("User not authenticated.");
                 await leaveEventInFirestore(eventId, userStore.uid);
                 await this.fetchEventDetails(eventId);
                 notificationStore.showNotification({ message: "Successfully left event.", type: 'success' });
             } catch (error) {
                 notificationStore.showNotification({ message: `Failed to leave: ${handleFirestoreError(error)}`, type: 'error' });
                 throw error;
             }
         },

         // --- Voting Actions (toggleVotingOpen, submit votes remain largely the same, payload changes for XP are in closeEventPermanently) ---
         async toggleVotingOpen({ eventId, open }: { eventId: string; open: boolean }) {
              const userStore = useUserStore();
              const notificationStore = useNotificationStore();
              try {
                  if (!userStore.uid) throw new Error("Authentication required to modify voting status.");
                  await togglevotingOpenInFirestore(eventId, open, userStore.uid);
                  await this.fetchEventDetails(eventId);
                  notificationStore.showNotification({
                      message: `Voting is now ${open ? 'open' : 'closed'}.`,
                      type: 'success'
                  });
              } catch (error) {
                  notificationStore.showNotification({
                      message: `Failed to toggle voting status: ${handleFirestoreError(error)}`,
                      type: 'error'
                  });
                  throw error;
              }
          },
        async submitTeamCriteriaVote({ eventId, selections }: { eventId: string; selections: { criteria: Record<string, string>, bestPerformer?: string } }) {
             const userStore = useUserStore();
             const notificationStore = useNotificationStore();
             const appStore = useAppStore();
             const offlineResult = await appStore.handleOfflineAction({ type: 'events/submitTeamCriteriaVote', payload: { eventId, selections } });
             if (offlineResult.queued) return;
             try {
                 if (!userStore.uid) throw new Error("User not authenticated.");
                 await submitTeamCriteriaVoteInFirestore(eventId, userStore.uid, selections);
                 await this.fetchEventDetails(eventId);
                 notificationStore.showNotification({ message: "Team selections submitted.", type: 'success' });
             } catch (error) {
                 notificationStore.showNotification({ message: `Failed to submit selections: ${handleFirestoreError(error)}`, type: 'error' });
                 throw error;
             }
         },

         async submitIndividualWinnerVote({ eventId, selectedWinnerId }: { eventId: string; selectedWinnerId: string }) { // MODIFIED PAYLOAD
             const userStore = useUserStore();
             const notificationStore = useNotificationStore();
             const appStore = useAppStore();
             // MODIFIED PAYLOAD for offline action as well
             const offlineResult = await appStore.handleOfflineAction({ type: 'events/submitIndividualWinnerVote', payload: { eventId, selectedWinnerId } });
             if (offlineResult.queued) return;
             try {
                 if (!userStore.uid) throw new Error("User not authenticated.");
                 // MODIFIED call to helper
                 await submitIndividualWinnerVoteInFirestore(eventId, userStore.uid, selectedWinnerId);
                 await this.fetchEventDetails(eventId);
                 notificationStore.showNotification({ message: "Winner selection submitted.", type: 'success' }); // Message updated for single selection
             } catch (error) {
                 notificationStore.showNotification({ message: `Failed to submit selection: ${handleFirestoreError(error)}`, type: 'error' });
                 throw error;
             }
          },

          async submitManualWinnerSelection({ eventId, winnerSelections }: { eventId: string; winnerSelections: Record<string, string> }) { // MODIFIED PAYLOAD (string[] to string)
              const userStore = useUserStore();
              const notificationStore = useNotificationStore();
              try {
                  if (!userStore.uid) throw new Error("User not authenticated.");
                  // Call to helper is now consistent with its signature
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
              const ratingData = { score, comment: feedback }; // Create object for helper
              // MODIFIED PAYLOAD for offline action
              const offlineResult = await appStore.handleOfflineAction({ type: 'events/submitOrganizationRating', payload: { eventId, ratingData } });
              if (offlineResult.queued) return;
              try {
                  if (!userStore.uid) throw new Error("User not authenticated.");
                  // MODIFIED call to helper
                  await submitOrganizationRatingInFirestore(eventId, userStore.uid, ratingData);
                  await this.fetchEventDetails(eventId);
                  notificationStore.showNotification({ message: "Organizer rating submitted.", type: 'success' });
              } catch (error) {
                  notificationStore.showNotification({ message: `Failed to submit rating: ${handleFirestoreError(error)}`, type: 'error' });
                  throw error;
              }
          },

           async findWinner(eventId: string) {
                 const notificationStore = useNotificationStore();
                 try {
                     const event = this.getEventById(eventId);
                     if (!event) throw new Error("Event data not loaded locally.");
                     // calculateWinnersFromVotes expects a full Event object, which getEventById should provide with details nested.
                     const calculatedWinners = await calculateWinnersFromVotes(eventId); // Pass eventId, helper will fetch
                     if (Object.keys(calculatedWinners).length === 0) {
                          notificationStore.showNotification({ message: "No winners could be determined based on selections.", type: 'info' });
                          return;
                     }
                     await saveWinnersToFirestore(eventId, calculatedWinners);
                     await this.fetchEventDetails(eventId);
                     notificationStore.showNotification({ message: "Winner(s) determined and saved.", type: 'success' });
                 } catch (error) {
                     notificationStore.showNotification({ message: `Failed to find winners: ${handleFirestoreError(error)}`, type: 'error' });
                     throw error;
                 }
             },

         // --- Submissions Actions (submitProjectToEvent remains the same) ---
         async submitProjectToEvent({ eventId, submissionData }: { eventId: string; submissionData: Partial<Submission> }) {
              const userStore = useUserStore();
              const notificationStore = useNotificationStore();
              const appStore = useAppStore();
               const payload = { eventId, submissionData };
               const offlineResult = await appStore.handleOfflineAction({ type: 'submission/submitProjectToEvent', payload });
               if (offlineResult.queued) return;
              try {
                  if (!userStore.uid) throw new Error("User not authenticated.");
                  await submitProjectToEventInFirestore(eventId, userStore.uid, submissionData);
                  await this.fetchEventDetails(eventId);
                  notificationStore.showNotification({ message: "Project submitted successfully!", type: 'success' });
              } catch (error) {
                  notificationStore.showNotification({ message: `Failed to submit project: ${handleFirestoreError(error)}`, type: 'error' });
                  throw error;
              }
          },

         // --- Teams Actions (addTeamToEvent, updateTeams, autoGenerateTeams remain largely the same) ---
         async addTeamToEvent({ eventId, teamName, members }: { eventId: string; teamName: string; members: string[] }) {
             const notificationStore = useNotificationStore();
              try {
                  const currentEvent = this.getEventById(eventId) || await this.fetchEventDetails(eventId);
                  if (!currentEvent) throw new Error("Event not found for adding team.");
                  await addTeamToEventInFirestore(eventId, teamName, members, currentEvent.teams || []);
                  await this.fetchEventDetails(eventId);
                  notificationStore.showNotification({ message: `Team "${teamName}" added.`, type: 'success' });
              } catch (error) {
                  notificationStore.showNotification({ message: `Failed to add team: ${handleFirestoreError(error)}`, type: 'error' });
                  throw error;
              }
          },
          async updateTeams({ eventId, teams }: { eventId: string; teams: Team[] }) {
               const notificationStore = useNotificationStore();
               try {
                   await updateEventTeamsInFirestore(eventId, teams);
                   await this.fetchEventDetails(eventId);
                   notificationStore.showNotification({ message: `Teams updated successfully.`, type: 'success' });
               } catch (error) {
                   notificationStore.showNotification({ message: `Failed to update teams: ${handleFirestoreError(error)}`, type: 'error' });
                   throw error;
               }
           },
          async autoGenerateTeams({ eventId, minMembersPerTeam = 2, maxMembersPerTeam = 8 }: { eventId: string; minMembersPerTeam?: number; maxMembersPerTeam?: number; }) {
             const notificationStore = useNotificationStore();
             const userStore = useUserStore();
             if (!eventId) throw new Error('Event ID required.');
             try {
                 const event = this.getEventById(eventId);
                 if (!event) throw new Error('Event data not loaded locally. Cannot auto-generate teams.');
                 if (event.details.format !== EventFormat.Team) throw new Error("Auto-generation only for 'Team' events.");
                 if (!event.teams || event.teams.length < 2) {
                    throw new Error("Auto-generation requires at least 2 teams to be pre-defined for the event.");
                 }
                 const numberOfTeams = event.teams.length;
                 if (userStore.studentList.length === 0) {
                     await userStore.fetchAllStudents();
                 }
                 const students = userStore.getStudentList;
                 if (students.length < numberOfTeams * minMembersPerTeam) {
                     throw new Error(`Not enough students (${students.length}) available to populate ${numberOfTeams} teams with at least ${minMembersPerTeam} members each.`);
                 }
                 const teamsToPopulate: Team[] = event.teams.map(team => ({
                     teamName: team.teamName,
                     members: [],
                     teamLead: '',
                 }));
                 const shuffledStudents = [...students].sort(() => 0.5 - Math.random());
                 shuffledStudents.forEach((student, idx) => {
                     teamsToPopulate[idx % numberOfTeams].members.push(student.uid);
                 });
                 const finalTeams = teamsToPopulate
                     .filter(team => team.members.length >= minMembersPerTeam)
                     .map(team => {
                         const currentMembers = team.members.slice(0, maxMembersPerTeam);
                         const newTeamLead = currentMembers[0] || '';
                         return { ...team, members: currentMembers, teamLead: newTeamLead };
                     });
                 if (finalTeams.length !== numberOfTeams) {
                    if (finalTeams.length < 2) throw new Error("Could not generate at least 2 valid teams after distribution.");
                 }
                 await this.updateTeams({ eventId, teams: finalTeams });
                 notificationStore.showNotification({ message: `Teams auto-generated successfully for ${finalTeams.length} teams.`, type: 'success' });
             } catch (error) {
                 notificationStore.showNotification({ message: `Failed to generate teams: ${handleFirestoreError(error)}`, type: 'error' });
                 throw error;
             }
         },
         async checkDateConflict(payload: { startDate: string | Date | Timestamp | null; endDate: string | Date | Timestamp | null; excludeEventId?: string | null }): Promise<{ hasConflict: boolean; nextAvailableDate: string | null; conflictingEvent: Event | null }> {
              try {
                   return await checkDateConflictInFirestore(payload.startDate, payload.endDate, payload.excludeEventId);
              } catch (error) {
                   const notificationStore = useNotificationStore();
                   this.error = handleFirestoreError(error) || 'Date conflict check failed.';
                   notificationStore.showNotification({ message: `Date check failed: ${this.error}`, type: 'error' });
                   return { hasConflict: true, nextAvailableDate: null, conflictingEvent: null };
              }
         },
         clearDateCheck() {
             console.log("Pinia: clearDateCheck called.");
         },

        // --- Closing Event Action (MODIFIED FOR NEW XP STRUCTURE) ---
        async closeEventPermanently({ eventId }: { eventId: string }): Promise<{ success: boolean; message: string; xpAwarded?: Record<string, Partial<Pick<XPData, XpFirestoreFieldKey | 'count_wins' | 'totalCalculatedXp'>>> }> {
            const userStore = useUserStore();
            const notificationStore = useNotificationStore();
            const appStore = useAppStore();

            try {
                // 1. Fetch latest event data
                const eventData = this.getEventById(eventId) || await this.fetchEventDetails(eventId);
                if (!eventData) throw new Error("Event not found.");
                // eventData here will have the correct structure due to mappers in fetching actions

                // 2. Perform Checks
                const currentUserUid = userStore.uid;
                const isOrganizer = eventData.details?.organizers?.includes(currentUserUid ?? '') || eventData.requestedBy === currentUserUid;
                if (!isOrganizer) throw new Error("Unauthorized: Only organizers can close events.");
                if (eventData.status !== EventStatus.Completed) throw new Error("Event must be 'Completed' to be closed.");
                if (eventData.votingOpen) throw new Error("Voting must be closed before closing the event.");
                if (!eventData.winners || Object.keys(eventData.winners).length === 0) throw new Error("Winners must be determined before closing.");

                // 3. Calculate XP Changes (using updated helper)
                const xpChangesMap = await calculateEventXP(eventData);

                // 4. Award XP (batch write to Firestore /xp/{userId} collection)
                const batch = writeBatch(db);
                let totalXpPointsAwarded = 0;
                let usersAwardedCount = 0;

                for (const [userId, xpIncrements] of Object.entries(xpChangesMap)) {
                    const xpDocRef = doc(db, 'xp', userId);
                    const updatePayload: Record<string, any> = {
                        lastUpdatedAt: Timestamp.now()
                    };
                    let userTotalIncrement = 0;

                    // Increment specific XP fields
                    for (const key in xpIncrements) {
                        if (key.startsWith('xp_') || key === 'count_wins' || key === 'totalCalculatedXp') {
                            const incrementValue = (xpIncrements as any)[key];
                            if (typeof incrementValue === 'number' && incrementValue !== 0) {
                                updatePayload[key] = increment(incrementValue);
                                if (key.startsWith('xp_')) {
                                    userTotalIncrement += incrementValue;
                                }
                            }
                        }
                    }
                    
                    // It's important totalCalculatedXp is also incremented if individual xp_ fields are.
                    // The calculateEventXP function should already include totalCalculatedXp in its return.
                    // If not, ensure it's calculated and added to updatePayload with increment().
                    // For example, if xpIncrements.totalCalculatedXp contains the sum of new XP for this user:
                    if (xpIncrements.totalCalculatedXp && xpIncrements.totalCalculatedXp > 0) {
                        // updatePayload.totalCalculatedXp = increment(xpIncrements.totalCalculatedXp); // This might double count if xp_fields are also incremented.
                        // Better: totalCalculatedXp should be the sum of all xp_ increments for this user.
                        // The calculateEventXP should return this correctly.
                    } else if (userTotalIncrement > 0 && !xpIncrements.totalCalculatedXp) {
                        // Fallback if calculateEventXP didn't provide total, but this implies an issue in calculateEventXP.
                        updatePayload.totalCalculatedXp = increment(userTotalIncrement);
                    }


                    if (Object.keys(updatePayload).length > 1) { // More than just lastUpdatedAt
                        batch.set(xpDocRef, updatePayload, { merge: true }); // Use set with merge to create if not exists
                        totalXpPointsAwarded += userTotalIncrement;
                        if (userTotalIncrement > 0 || (xpIncrements.count_wins && xpIncrements.count_wins > 0)) {
                           usersAwardedCount++;
                        }
                    }
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
                await this.fetchEventDetails(eventId);
                appStore.setEventClosedState({ eventId, isClosed: true });

                // 8. Refresh current user's data if they earned XP
                // This now involves fetching both profile and XP data for the current user.
                if (currentUserUid && xpChangesMap[currentUserUid]) {
                   await userStore.fetchUserData(currentUserUid); // This action in userStore should now fetch both user and XP data.
                }

                const successMessage = `Event closed. ${totalXpPointsAwarded} XP awarded to ${usersAwardedCount} users. Win counts updated.`;
                notificationStore.showNotification({ message: successMessage, type: 'success' });
                return { success: true, message: successMessage, xpAwarded: xpChangesMap };

            } catch (error) {
                notificationStore.showNotification({ message: `Failed to close event: ${handleFirestoreError(error)}`, type: 'error' });
                throw error;
            }
        },
    },
});