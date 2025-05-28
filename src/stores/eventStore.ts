// src/stores/studentEventStore.ts
import { defineStore } from 'pinia';
import { ref, computed, type Ref } from 'vue';
import {
  doc, getDoc, updateDoc, collection, getDocs, query, where, orderBy, Timestamp, addDoc, arrayUnion, arrayRemove, deleteField, writeBatch, increment, serverTimestamp, setDoc
} from 'firebase/firestore';
import { db } from '@/firebase';
import { Event, EventStatus, EventFormData, Team, Submission, EventCriterion, EventLifecycleTimestamps, OrganizerRating, EventFormat } from '@/types/event';
import { useProfileStore } from './profileStore';
import { useNotificationStore } from './notificationStore';
import { useAppStore } from './appStore';
import { useAuth } from '@/composables/useAuth';
import { mapEventDataToFirestore, mapFirestoreToEventData, getISTTimestamp } from '@/utils/eventDataMapper';
import { convertToISTDateTime } from '@/utils/dateTime';
import { deepClone, isEmpty } from '@/utils/helpers';
import { Interval } from 'luxon';
import { checkDateConflictForRequest } from './events/actions.validation'; // Corrected import

import * as EventFetchingActions from './events/actions.fetching';
import * as EventLifecycleActions from './events/actions.lifecycle';
import * as EventParticipantActions from './events/actions.participants';
import * as EventSubmissionActions from './events/actions.submissions';
import * as EventTeamActions from './events/actions.teams';
import * as EventVotingActions from './events/actions.voting';
import * as EventUtils from './events/actions.utils';
import { XPData, XpFirestoreFieldKey } from '@/types/xp';
import { DateTime } from 'luxon';


const now = () => Timestamp.now();

function compareEventsForSort(a: Event, b: Event): number {
    const statusOrder: Record<string, number> = {
        [EventStatus.InProgress]: 1, [EventStatus.Approved]: 2, [EventStatus.Pending]: 3,
        [EventStatus.Completed]: 4, [EventStatus.Rejected]: 5, [EventStatus.Cancelled]: 6,
        [EventStatus.Closed]: 7,
    };
    const orderA = statusOrder[a.status] ?? 99;
    const orderB = statusOrder[b.status] ?? 99;
    if (orderA !== orderB) return orderA - orderB;

    const nowDate = convertToISTDateTime(new Date())!;
    const getDateValue = (dateField: Timestamp | Date | string | null | undefined, fallbackDate?: Timestamp | Date | string | null | undefined): number => {
        let dt = convertToISTDateTime(dateField);
        if (!dt || !dt.isValid) dt = convertToISTDateTime(fallbackDate);
        return (dt && dt.isValid ? dt : nowDate).toMillis();
    };

    if ([EventStatus.Pending, EventStatus.Approved, EventStatus.InProgress].includes(a.status as EventStatus)) {
        const dateA = getDateValue(a.details?.date?.start, a.createdAt);
        const dateB = getDateValue(b.details?.date?.start, b.createdAt);
        return dateA - dateB;
    } else {
        let timeA = 0;
        if (a.status === EventStatus.Closed) timeA = getDateValue(a.closedAt, a.lastUpdatedAt);
        else if (a.status === EventStatus.Completed) timeA = getDateValue(a.lifecycleTimestamps?.completedAt, a.lastUpdatedAt);
        else if (a.status === EventStatus.Rejected) timeA = getDateValue(a.lifecycleTimestamps?.rejectedAt, a.lastUpdatedAt);
        else if (a.status === EventStatus.Cancelled) timeA = getDateValue(a.lastUpdatedAt);
        else timeA = getDateValue(a.details?.date?.end, a.lastUpdatedAt);

        let timeB = 0;
        if (b.status === EventStatus.Closed) timeB = getDateValue(b.closedAt, b.lastUpdatedAt);
        else if (b.status === EventStatus.Completed) timeB = getDateValue(b.lifecycleTimestamps?.completedAt, b.lastUpdatedAt);
        else if (b.status === EventStatus.Rejected) timeB = getDateValue(b.lifecycleTimestamps?.rejectedAt, b.lastUpdatedAt);
        else if (b.status === EventStatus.Cancelled) timeB = getDateValue(b.lastUpdatedAt);
        else timeB = getDateValue(b.details?.date?.end, b.lastUpdatedAt);

        return timeB - timeA;
    }
}

function _mergeLifecycleTimestamps(
    baseTimestamps: EventLifecycleTimestamps | undefined | null,
    updates: Partial<EventLifecycleTimestamps> | undefined | null
): EventLifecycleTimestamps | undefined {
    if (!updates) {
        return isEmpty(baseTimestamps) ? undefined : (baseTimestamps as EventLifecycleTimestamps);
    }
    const merged = { ...(baseTimestamps || {}), ...updates };
    for (const key in updates) {
        if (updates.hasOwnProperty(key)) {
            const typedKey = key as keyof EventLifecycleTimestamps;
            if (updates[typedKey] === null || (updates[typedKey] as any)?._methodName === 'delete') {
                delete merged[typedKey];
            }
        }
    }
    return isEmpty(merged) ? undefined : (merged as EventLifecycleTimestamps);
}


export const useEventStore = defineStore('studentEvents', () => {
  const events = ref<Event[]>([]);
  const viewedEventDetails = ref<Event | null>(null);
  const myEventRequests = ref<Event[]>([]);
  const isLoading = ref<boolean>(false);
  const actionError = ref<string | null>(null);
  const fetchError = ref<string | null>(null);

  const studentProfileStore = useProfileStore();
  const notificationStore = useNotificationStore();
  const appStore = useAppStore();
  const auth = useAuth();

  const allPubliclyViewableEvents = computed(() =>
    events.value.filter(event => 
      event.settings?.visibility === 'public' || 
      (event.settings?.visibility === 'students' && auth.isAuthenticated.value) ||
      (event.settings?.visibility === 'participants' && studentProfileStore.studentId && event.participants?.[studentProfileStore.studentId])
    )
  );

  const userSubmittedEvents = computed(() => {
    if (!auth.isAuthenticated.value || !studentProfileStore.studentId) return [];
    return events.value.filter(event => event.submittedBy?.userId === studentProfileStore.studentId);
  });

  const userParticipatingEvents = computed(() => {
    if (!auth.isAuthenticated.value || !studentProfileStore.studentId) return [];
    return events.value.filter(event => 
      Object.values(event.participants || {}).some(p => p.userId === studentProfileStore.studentId && p.status === 'approved')
    );
  });

  const userWaitlistedEvents = computed(() => {
    if (!auth.isAuthenticated.value || !studentProfileStore.studentId) return [];
    return events.value.filter(event => 
      Object.values(event.participants || {}).some(p => p.userId === studentProfileStore.studentId && p.status === 'waitlisted')
    );
  });

  const getEventById = (eventId: string): Event | undefined => {
    return events.value.find(e => e.id === eventId) ||
           myEventRequests.value.find(e => e.id === eventId) ||
           (viewedEventDetails.value?.id === eventId ? viewedEventDetails.value : undefined);
  };
  const currentEventDetails = computed(() => viewedEventDetails.value);

  const upcomingEvents = computed(() =>
    allPubliclyViewableEvents.value.filter(e => e.status === EventStatus.Approved && convertToISTDateTime(e.details.date.start)! > convertToISTDateTime(new Date())!)
  );
  const activeEvents = computed(() =>
    allPubliclyViewableEvents.value.filter(e => e.status === EventStatus.InProgress)
  );
  const pastEvents = computed(() =>
    allPubliclyViewableEvents.value.filter(e => [EventStatus.Completed, EventStatus.Closed].includes(e.status))
  );

  function _updateLocalEventLists(eventData: Partial<Event> & { id: string }) {
    const updateList = (list: Ref<Event[]>) => {
        const index = list.value.findIndex(e => e.id === eventData.id);
        const existingEvent = index !== -1 ? list.value[index] : ({} as Partial<Event>);
        const finalMergedTimestamps = _mergeLifecycleTimestamps(
            existingEvent.lifecycleTimestamps,
            eventData.lifecycleTimestamps
        );
        const newEventData = { ...eventData };
        const fullEventData = {
            ...existingEvent,
            ...deepClone(newEventData),
            lifecycleTimestamps: finalMergedTimestamps
        } as Event;
        if (index !== -1) list.value.splice(index, 1, fullEventData);
        else list.value.push(fullEventData);
        list.value.sort(compareEventsForSort);
    };

    if ([EventStatus.Approved, EventStatus.InProgress, EventStatus.Completed, EventStatus.Closed].includes(eventData.status as EventStatus) ||
        events.value.some(e => e.id === eventData.id)) {
        updateList(events);
    } else {
        events.value = events.value.filter(e => e.id !== eventData.id);
    }

    if (eventData.requestedBy === studentProfileStore.studentId &&
        [EventStatus.Pending, EventStatus.Rejected].includes(eventData.status as EventStatus)) {
        updateList(myEventRequests);
    } else {
        myEventRequests.value = myEventRequests.value.filter(e => e.id !== eventData.id);
    }

    if (viewedEventDetails.value?.id === eventData.id) {
      const finalMergedTimestampsForViewed = _mergeLifecycleTimestamps(
          viewedEventDetails.value.lifecycleTimestamps,
          eventData.lifecycleTimestamps
      );
      viewedEventDetails.value = {
          ...(viewedEventDetails.value as Event),
          ...deepClone(eventData),
          lifecycleTimestamps: finalMergedTimestampsForViewed
      } as Event;
    }
  }

  async function _handleOpError(operation: string, err: unknown, eventId?: string): Promise<void> {
    const message = err instanceof Error ? err.message : `An unknown error occurred during ${operation}.`;
    actionError.value = message;
    console.error(`StudentEventStore Operation Error (${operation})${eventId ? ` for event ${eventId}` : ''}:`, err);
    notificationStore.showNotification({ message, type: 'error' });
  }

  async function _handleFetchError(operation: string, err: unknown): Promise<void> {
    const message = err instanceof Error ? err.message : `An unknown error occurred during ${operation}.`;
    fetchError.value = message;
    console.error(`StudentEventStore Fetch Error (${operation}):`, err);
  }

  async function fetchEvents() {
    isLoading.value = true;
    fetchError.value = null;
    try {
        const fetchedEvents = await EventFetchingActions.fetchPubliclyViewableEventsFromFirestore(); // Corrected function name
        events.value = fetchedEvents.sort(compareEventsForSort);
    } catch (err) {
      await _handleFetchError("fetching all events", err);
      events.value = [];
    } finally {
      isLoading.value = false;
    }
  }

  async function fetchMyEventRequests() {
    if (!studentProfileStore.isAuthenticated || !studentProfileStore.studentId) {
      myEventRequests.value = [];
      return;
    }
    isLoading.value = true;
    fetchError.value = null;
    try {
      const requests = await EventFetchingActions.fetchMyEventRequestsFromFirestore(studentProfileStore.studentId);
      myEventRequests.value = requests.sort(compareEventsForSort);
    } catch (err) {
      await _handleFetchError("fetching my event requests", err);
      myEventRequests.value = [];
    } finally {
      isLoading.value = false;
    }
  }

  async function fetchEventDetails(eventId: string): Promise<Event | null> {
    isLoading.value = true;
    fetchError.value = null;
    viewedEventDetails.value = null;
    try {
      const eventData = await EventFetchingActions.fetchSingleEventForStudentFromFirestore(eventId, studentProfileStore.studentId);

      if (eventData) {
          viewedEventDetails.value = deepClone(eventData);
          _updateLocalEventLists(eventData);
          return viewedEventDetails.value;
      } else {
          notificationStore.showNotification({ message: `Event (ID: ${eventId}) not found or inaccessible.`, type: 'warning' });
          return null;
      }
    } catch (err) {
      await _handleFetchError(`fetching event details for ${eventId}`, err);
      notificationStore.showNotification({ message: fetchError.value || "Failed to load event details.", type: 'error' });
      return null;
    } finally {
      isLoading.value = false;
    }
  }

  async function requestNewEvent(formData: EventFormData): Promise<string | null> {
    actionError.value = null;
    try {
      if (!studentProfileStore.isAuthenticated || !studentProfileStore.studentId) {
        throw new Error('You must be authenticated to create an event.');
      }

      // Validate event dates
      const now = Timestamp.now();
      const startDate = formData.details.date.start ? getISTTimestamp(formData.details.date.start) : null;
      const endDate = formData.details.date.end ? getISTTimestamp(formData.details.date.end) : null;

      if (!startDate || !endDate) {
        throw new Error('Event start and end dates are required.');
      }

      // Get start of current day in IST
      const todayStartIST = DateTime.now()
        .setZone('Asia/Kolkata')
        .startOf('day')
        .toJSDate();
      const todayStartTimestamp = Timestamp.fromDate(todayStartIST);

      // Compare with start of current day instead of current time
      if (startDate.toMillis() < todayStartTimestamp.toMillis()) {
        throw new Error('Event must start from today onwards.');
      }

      if (endDate.toMillis() <= startDate.toMillis()) {
        throw new Error('Event end date must be after start date.');
      }

      // Check for date conflicts
      const { hasConflict, conflictingEventName } = await checkDateConflict({
        startDate: startDate,
        endDate: endDate
      });

      if (hasConflict) {
        throw new Error(`Date conflict with event: ${conflictingEventName}`);
      }

      // Ensure current user is in organizers list
      if (!formData.details.organizers.includes(studentProfileStore.studentId)) {
        formData.details.organizers.push(studentProfileStore.studentId);
      }

      const eventData = mapEventDataToFirestore({
        ...formData,
        status: EventStatus.Pending,
        requestedBy: studentProfileStore.studentId,
        votingOpen: false,
        createdAt: now,
        lastUpdatedAt: now
      }, true); // Pass isNew=true to enforce additional validations

      const eventRef = await addDoc(collection(db, 'events'), eventData);
      const newEventId = eventRef.id;

      // Update local state
      _updateLocalEventLists({
        id: newEventId,
        ...mapFirestoreToEventData(newEventId, eventData)
      } as Event);

      notificationStore.showNotification({
        message: 'Event request submitted successfully!',
        type: 'success'
      });

      return newEventId;
    } catch (err) {
      await _handleOpError('creating new event', err);
      return null;
    }
  }

  async function editMyEventRequest(eventId: string, formData: EventFormData): Promise<boolean> {
    if (!studentProfileStore.isAuthenticated || !studentProfileStore.studentId) {
      notificationStore.showNotification({ message: "Authentication required.", type: 'error' }); return false;
    }
    const studentId = studentProfileStore.studentId!;
    isLoading.value = true; actionError.value = null;

    try {
      if (formData.details.date.start && formData.details.date.end) {
        const conflictResult = await checkDateConflict({
            startDate: formData.details.date.start,
            endDate: formData.details.date.end,
            excludeEventId: eventId
        });
        if (conflictResult.hasConflict) {
            notificationStore.showNotification({ message: `Chosen dates conflict with "${conflictResult.conflictingEventName || 'an existing event'}".`, type: 'error', duration: 7000 });
            isLoading.value = false; return false;
        }
      } else {
          notificationStore.showNotification({ message: "Event start and end dates are required.", type: 'error'}); isLoading.value = false; return false;
      }

      await EventLifecycleActions.updateMyEventRequestInFirestore(eventId, formData, studentId);
      const updatedEventData = await EventFetchingActions.fetchSingleEventForStudentFromFirestore(eventId, studentId);
      if (updatedEventData) _updateLocalEventLists(updatedEventData);

      notificationStore.showNotification({ message: "Event request updated successfully.", type: 'success' });
      return true;
    } catch (err) {
      await _handleOpError("editing my event request", err, eventId);
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  async function updateEventStatus({ eventId, newStatus, rejectionReason }: { eventId: string; newStatus: EventStatus; rejectionReason?: string }) {
    actionError.value = null;
    try {
        if (!studentProfileStore.currentStudent) throw new Error("User not authenticated."); // Use currentStudent from profileStore
        const updatedFields = await EventLifecycleActions.updateEventStatusInFirestore(eventId, newStatus, studentProfileStore.currentStudent, rejectionReason);
        _updateLocalEventLists({ id: eventId, ...updatedFields });
        notificationStore.showNotification({ message: `Event status updated to ${newStatus}.`, type: 'success' });
    } catch (err) {
        await _handleOpError(`updating event status to ${newStatus}`, err, eventId);
    }
  }


  async function joinEvent(eventId: string): Promise<boolean> {
    if (!studentProfileStore.isAuthenticated || !studentProfileStore.studentId) {
        notificationStore.showNotification({ message: "You must be logged in to join events.", type: 'error'}); return false;
    }
    const studentId = studentProfileStore.studentId!;
    isLoading.value = true; actionError.value = null;
    try {
        await EventParticipantActions.joinEventByStudentInFirestore(eventId, studentId);
        const updatedEventData = await EventFetchingActions.fetchSingleEventForStudentFromFirestore(eventId, studentId);
        if (updatedEventData) _updateLocalEventLists(updatedEventData);
        notificationStore.showNotification({ message: "Successfully joined the event!", type: 'success' });
        return true;
    } catch (err) {
        await _handleOpError("joining event", err, eventId);
        return false;
    } finally {
        isLoading.value = false;
    }
  }

  async function leaveEvent(eventId: string): Promise<boolean> {
    if (!studentProfileStore.isAuthenticated || !studentProfileStore.studentId) {
        notificationStore.showNotification({ message: "You must be logged in.", type: 'error'}); return false;
    }
    const studentId = studentProfileStore.studentId!;
    isLoading.value = true; actionError.value = null;
    try {
        await EventParticipantActions.leaveEventByStudentInFirestore(eventId, studentId);
        const updatedEventData = await EventFetchingActions.fetchSingleEventForStudentFromFirestore(eventId, studentId);
        if (updatedEventData) _updateLocalEventLists(updatedEventData);
        notificationStore.showNotification({ message: "Successfully left the event.", type: 'success' });
        return true;
    } catch (err) {
        await _handleOpError("leaving event", err, eventId);
        return false;
    } finally {
        isLoading.value = false;
    }
  }

  async function submitProject(payload: { eventId: string; submissionData: Omit<Submission, 'submittedBy' | 'submittedAt' | 'teamName' | 'participantId'> }) {
    const { eventId, submissionData } = payload;
    if (!studentProfileStore.isAuthenticated || !studentProfileStore.studentId) {
        notificationStore.showNotification({ message: "You must be logged in.", type: 'error'}); return;
    }
    const studentId = studentProfileStore.studentId!;
    isLoading.value = true; actionError.value = null;
    try {
        await EventSubmissionActions.submitProjectByStudentInFirestore(eventId, studentId, submissionData);
        const updatedEventData = await EventFetchingActions.fetchSingleEventForStudentFromFirestore(eventId, studentId);
        if (updatedEventData) _updateLocalEventLists(updatedEventData);
        notificationStore.showNotification({ message: "Project submitted successfully!", type: 'success' });
    } catch (err) {
        await _handleOpError("submitting project", err, eventId);
    } finally {
        isLoading.value = false;
    }
  }

  async function submitTeamCriteriaVote(payload: { eventId: string; selections: { criteria: Record<string, string>; bestPerformer?: string } }) {
    const { eventId, selections } = payload;
    if (!studentProfileStore.isAuthenticated || !studentProfileStore.studentId) {
        notificationStore.showNotification({ message: "You must be logged in.", type: 'error' }); return;
    }
    const studentId = studentProfileStore.studentId!;
    isLoading.value = true; actionError.value = null;
    try {
        // Convert constraint keys to the format expected by backend
        const processedSelections = {
            criteria: selections.criteria, // Keep as-is, backend will handle constraint index mapping
            bestPerformer: selections.bestPerformer
        };
        
        await EventVotingActions.submitTeamCriteriaVoteInFirestore(eventId, studentId, processedSelections);
        const updatedEventData = await EventFetchingActions.fetchSingleEventForStudentFromFirestore(eventId, studentId);
        if (updatedEventData) _updateLocalEventLists(updatedEventData);
        notificationStore.showNotification({ message: "Team selections submitted!", type: 'success' });
    } catch (err) {
        await _handleOpError("submitting team selections", err, eventId);
    } finally {
        isLoading.value = false;
    }
  }
  async function submitIndividualWinnerVote(payload: { eventId: string; selectedWinnerId: string }) {
    const { eventId, selectedWinnerId } = payload;
     if (!studentProfileStore.isAuthenticated || !studentProfileStore.studentId) {
        notificationStore.showNotification({ message: "You must be logged in.", type: 'error' }); return;
    }
    const studentId = studentProfileStore.studentId!;
    isLoading.value = true; actionError.value = null;
    try {
        await EventVotingActions.submitIndividualWinnerVoteInFirestore(eventId, studentId, selectedWinnerId);
        const updatedEventData = await EventFetchingActions.fetchSingleEventForStudentFromFirestore(eventId, studentId);
        if (updatedEventData) _updateLocalEventLists(updatedEventData);
        notificationStore.showNotification({ message: "Winner selection submitted!", type: 'success' });
    } catch (err) {
        await _handleOpError("submitting individual winner vote", err, eventId);
    } finally {
        isLoading.value = false;
    }
  }

  async function submitManualWinnerSelection(payload: { eventId: string; winnerSelections: Record<string, string> }) { // Changed winnerSelections to Record<string, string>
    const { eventId, winnerSelections } = payload;
    if (!studentProfileStore.isAuthenticated || !studentProfileStore.studentId) {
        notificationStore.showNotification({ message: "You must be logged in.", type: 'error' }); return;
    }
    const studentId = studentProfileStore.studentId!;
    isLoading.value = true; actionError.value = null;
    try {
        await EventVotingActions.submitManualWinnerSelectionInFirestore(eventId, studentId, winnerSelections); // Pass Record<string, string>
        const updatedEventData = await EventFetchingActions.fetchSingleEventForStudentFromFirestore(eventId, studentId);
        if (updatedEventData) _updateLocalEventLists(updatedEventData);
        notificationStore.showNotification({ message: "Manual winner selection saved!", type: 'success' });
    } catch (err) {
        await _handleOpError("submitting manual winner selection", err, eventId);
    } finally {
        isLoading.value = false;
    }
  }


  async function submitOrganizationRating(payload: { eventId: string; score: number; feedback?: string }) {
    const { eventId, score, feedback } = payload; // feedback from OrganizerRatingForm is '' or a string
     if (!studentProfileStore.isAuthenticated || !studentProfileStore.studentId) {
        notificationStore.showNotification({ message: "You must be logged in.", type: 'error' }); return;
    }
    const studentId = studentProfileStore.studentId!;
    isLoading.value = true; actionError.value = null;
    try {
        // If feedback is an empty string (e.g., from trim() || ''), pass null to Firestore.
        // Otherwise, pass the feedback string.
        const commentToSend = (feedback === '' || feedback === undefined) ? null : feedback;

        await EventVotingActions.submitOrganizationRatingInFirestore(eventId, studentId, { score, comment: commentToSend });
        const updatedEventData = await EventFetchingActions.fetchSingleEventForStudentFromFirestore(eventId, studentId);
        if (updatedEventData) _updateLocalEventLists(updatedEventData);
        notificationStore.showNotification({ message: "Organizer rating submitted!", type: 'success' });
    } catch (err) {
        await _handleOpError("submitting organization rating", err, eventId);
    } finally {
        isLoading.value = false;
    }
  }

  async function toggleVotingOpen({ eventId, open }: { eventId: string; open: boolean }) {
    actionError.value = null;
    try {
        if (!studentProfileStore.studentId) throw new Error("User not authenticated.");
        await EventVotingActions.togglevotingOpenInFirestore(eventId, open, studentProfileStore.studentId);
        const updatedEventData = await EventFetchingActions.fetchSingleEventForStudentFromFirestore(eventId, studentProfileStore.studentId);
        if (updatedEventData) _updateLocalEventLists(updatedEventData);
        notificationStore.showNotification({ message: `Voting is now ${open ? 'OPEN' : 'CLOSED'}.`, type: 'success' });
    } catch (err) {
        await _handleOpError(`toggling voting to ${open ? 'open' : 'closed'}`, err, eventId);
    }
  }

  async function findWinner(eventId: string) {
    actionError.value = null;
    try {
        const calculatedWinners = await EventVotingActions.calculateWinnersFromVotes(eventId);
        if (Object.keys(calculatedWinners).length === 0) {
            notificationStore.showNotification({ message: "No winners could be determined based on selections.", type: 'info' });
            return;
        }
        await EventVotingActions.saveWinnersToFirestore(eventId, calculatedWinners);
        const updatedEventData = await EventFetchingActions.fetchSingleEventForStudentFromFirestore(eventId, studentProfileStore.studentId);
        if (updatedEventData) _updateLocalEventLists(updatedEventData);
        notificationStore.showNotification({ message: "Winner(s) determined and saved.", type: 'success' });
    } catch (err) {
        await _handleOpError("finding winner", err, eventId);
    }
  }

  async function closeEventPermanently({ eventId }: { eventId: string }) {
    actionError.value = null;
    try {
        if (!studentProfileStore.currentStudent) throw new Error("User not authenticated."); // Use currentStudent
        await EventLifecycleActions.closeEventDocumentInFirestore(eventId, studentProfileStore.currentStudent);

        const eventData = EventFetchingActions.fetchSingleEventFromFirestore(eventId) as (Event | null); // Corrected function name, ensure return type allows null
        if (!eventData) throw new Error("Failed to fetch event data after closing for XP calculation.");

        const xpChangesMap = await EventUtils.calculateEventXP(eventData); // Use EventUtils

        const batch = writeBatch(db); // Use writeBatch from firebase/firestore

        let totalXpAwarded = 0;
        let usersAwardedCount = 0;

        for (const [userId, xpIncrementsUntyped] of Object.entries(xpChangesMap)) {
             const xpIncrements = xpIncrementsUntyped as Partial<Pick<XPData, XpFirestoreFieldKey | 'count_wins' | 'totalCalculatedXp'>>;
            const xpDocRef = doc(db, 'xp', userId);
            const updatePayload: Record<string, any> = { lastUpdatedAt: now() };
            let userTotalIncrement = 0;

            for (const key in xpIncrements) {
                if (key.startsWith('xp_') || key === 'count_wins' || key === 'totalCalculatedXp') {
                    const typedKey = key as keyof typeof xpIncrements;
                    const incrementValue = xpIncrements[typedKey];
                    if (typeof incrementValue === 'number' && incrementValue !== 0) {
                        updatePayload[key] = increment(incrementValue); // Use increment from firebase/firestore
                        if (key.startsWith('xp_')) userTotalIncrement += incrementValue;
                    }
                }
            }
            if (Object.keys(updatePayload).length > 1) {
                batch.set(xpDocRef, updatePayload, { merge: true });
                totalXpAwarded += userTotalIncrement;
                if (userTotalIncrement > 0 || (xpIncrements.count_wins && xpIncrements.count_wins > 0)) {
                    usersAwardedCount++;
                }
            }
        }
        await batch.commit();

        _updateLocalEventLists({ id: eventId, status: EventStatus.Closed, closedAt: now(), lastUpdatedAt: now() });
        // appStore.setEventClosedState({ eventId, isClosed: true }); // Define in appStore if needed

        if (studentProfileStore.studentId && xpChangesMap[studentProfileStore.studentId]) {
            await studentProfileStore.fetchProfileForView(studentProfileStore.studentId);
        }
        const successMessage = `Event closed. ${totalXpAwarded} XP awarded to ${usersAwardedCount} users.`;
        notificationStore.showNotification({ message: successMessage, type: 'success' });
        return { success: true, message: successMessage, xpAwarded: xpChangesMap };

    } catch (err: any) {
        await _handleOpError("closing event permanently", err, eventId);
        return { success: false, message: err.message || "Failed to close event." };
    }
  }

   async function autoGenerateTeams(payload: { eventId: string; minMembersPerTeam?: number; maxMembersPerTeam?: number; }) {
    const { eventId, minMembersPerTeam = 2, maxMembersPerTeam = 8 } = payload;
    actionError.value = null;
    try {
      const event = getEventById(eventId);
      if (!event) throw new Error('Event data not loaded locally. Cannot auto-generate teams.');
      if (event.details.format !== EventFormat.Team) throw new Error("Auto-generation only for 'Team' events.");
      if (!event.teams || event.teams.length < 2) {
        throw new Error("Auto-generation requires at least 2 teams to be pre-defined for the event.");
      }
      const numberOfTeams = event.teams.length;

      if ((studentProfileStore as any).allUsers.length === 0) {
        await studentProfileStore.fetchUserNamesBatch([]); // Or appropriate fetch all students action
      }
      const students = (studentProfileStore as any).allUsers;

      if (students.length < numberOfTeams * minMembersPerTeam) {
        throw new Error(`Not enough students (${students.length}) available to populate ${numberOfTeams} teams with at least ${minMembersPerTeam} members each.`);
      }

      // Use the new function that combines both operations
      await EventTeamActions.autoGenerateEventTeamsInFirestore(eventId, students, minMembersPerTeam, maxMembersPerTeam);

      const updatedEventData = await EventFetchingActions.fetchSingleEventForStudentFromFirestore(eventId, studentProfileStore.studentId);
      if (updatedEventData) _updateLocalEventLists(updatedEventData);
      notificationStore.showNotification({ message: `Teams auto-generated successfully for ${numberOfTeams} teams.`, type: 'success' });
    } catch (err) {
      await _handleOpError("auto-generating teams", err, eventId);
    }
  }

  async function checkExistingRequests(): Promise<boolean> {
    if (!studentProfileStore.studentId) return false;
    try {
      return await EventFetchingActions.checkExistingPendingRequestForStudent(studentProfileStore.studentId);
    } catch (error) {
       _handleOpError("checking existing requests", error);
       return false;
    }
  }

  async function checkDateConflict(payload: { startDate: Date | string | Timestamp | null; endDate: Date | string | Timestamp | null; excludeEventId?: string | null }): Promise<{ hasConflict: boolean; nextAvailableDate: string | null; conflictingEvent: Event | null, conflictingEventName?: string | null }> { // Added conflictingEventName
    try {
         const result = await checkDateConflictForRequest(payload.startDate, payload.endDate, payload.excludeEventId); // Use the corrected function
         // The return type of checkDateConflictForRequest is { hasConflict: boolean; conflictingEventName: string | null }
         // Need to adapt it or the calling code.
         // For now, assuming the store action is the source of truth and will return what's needed by the component.
         // The component uses `result.conflictingEvent?.details.eventName` which implies `conflictingEvent` is needed.
         // `checkDateConflictForRequest` from the diff only returns `conflictingEventName`.
         // Let's assume `checkDateConflictForRequest` in actions.validation.ts will be updated to match the structure of `checkDateConflictInFirestore`
         // which returns { hasConflict, nextAvailableDate, conflictingEvent }

         // For now, I'll adapt this to return a structure similar to what the component expects,
         // but the actual Firestore logic is in checkDateConflictForRequest which has a different return.
         // This is a temporary bridge:
         return {
            hasConflict: result.hasConflict,
            nextAvailableDate: null, // checkDateConflictForRequest doesn't return this
            conflictingEvent: null, // checkDateConflictForRequest doesn't return this
            conflictingEventName: result.conflictingEventName
         };

    } catch (error: any) {
         _handleOpError("checking date conflict", error);
         notificationStore.showNotification({ message: `Date check failed: ${error.message || 'Unknown error'}`, type: 'error' });
         return { hasConflict: true, nextAvailableDate: null, conflictingEvent: null, conflictingEventName: 'an error occurred' };
    }
  }

  async function submitEventRequest(eventData: Omit<Event, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'submittedBy' | 'teamSubmissions' | 'participants' | 'waitlist'>): Promise<string | null> {
    actionError.value = null;
    isLoading.value = true;

    if (!auth.isAuthenticated.value || !studentProfileStore.studentId) {
      actionError.value = "User not authenticated or profile not loaded.";
      isLoading.value = false;
      return null;
    }

    try {
      const currentUserId = studentProfileStore.studentId;
      const newEventRef = doc(collection(db, 'events'));
      const newEventData: Event = {
        ...eventData,
        id: newEventRef.id,
        status: EventStatus.Pending,
        createdAt: serverTimestamp() as Timestamp,
        updatedAt: serverTimestamp() as Timestamp,
        submittedBy: { userId: currentUserId, name: studentProfileStore.studentName, submittedAt: serverTimestamp() as Timestamp },
        participants: [],
        votingOpen: false
      };
      await setDoc(newEventRef, mapEventDataToFirestore(newEventData));
      events.value.unshift(newEventData); 
      return newEventRef.id;
    } catch (err) {
      await _handleOpError("submitting event request", err);
      return null;
    } finally {
      isLoading.value = false;
    }
  }

  async function updateEventRequest(eventId: string, eventData: Partial<Omit<Event, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'submittedBy' | 'teamSubmissions' | 'participants' | 'waitlist'>>): Promise<boolean> {
    actionError.value = null;
    isLoading.value = true;

    try {
      if (!auth.isAuthenticated.value || !studentProfileStore.studentId) {
        actionError.value = "User not authenticated or profile not loaded.";
        return false;
      }
      const eventRef = doc(db, 'events', eventId);
      const eventSnap = await getDoc(eventRef);
      if (!eventSnap.exists() || eventSnap.data()?.submittedBy?.userId !== studentProfileStore.studentId) {
        actionError.value = "Event not found or you do not have permission to edit it.";
        return false;
      }

      const updates = {
        ...mapEventDataToFirestore(eventData as Partial<Event>),
        updatedAt: serverTimestamp() as Timestamp
      };
      await updateDoc(eventRef, updates);
      
      const eventIndex = events.value.findIndex(e => e.id === eventId);
      if (eventIndex !== -1) {
        events.value[eventIndex] = { ...events.value[eventIndex], ...eventData, updatedAt: Timestamp.now() };
      }
      if (viewedEventDetails.value && viewedEventDetails.value.id === eventId) {
        viewedEventDetails.value = { ...viewedEventDetails.value, ...eventData, updatedAt: Timestamp.now() };
      }
      return true;
    } catch (err) {
      await _handleOpError("updating event request", err);
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  return {
    events, viewedEventDetails, myEventRequests, isLoading, actionError, fetchError,
    allPubliclyViewableEvents, getEventById, currentEventDetails, upcomingEvents, activeEvents, pastEvents,
    fetchEvents, fetchMyEventRequests, fetchEventDetails,
    requestNewEvent, editMyEventRequest, updateEventStatus,
    joinEvent, leaveEvent,
    submitProject,
    submitTeamCriteriaVote, submitIndividualWinnerVote, submitManualWinnerSelection, submitOrganizationRating,
    toggleVotingOpen, findWinner, closeEventPermanently, autoGenerateTeams,
    checkExistingRequests, checkDateConflict,
    userSubmittedEvents, userParticipatingEvents, userWaitlistedEvents,
    submitEventRequest, updateEventRequest
  };
});