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
import { checkDateConflictForRequest, checkExistingPendingRequestForStudent as checkExistingPendingRequestFromValidation } from './events/actions.validation'; // Corrected import & added new

import * as EventFetchingActions from './events/actions.fetching';
import * as EventLifecycleActions from './events/actions.lifecycle';
import * as EventParticipantActions from './events/actions.participants';
import * as EventSubmissionActions from './events/actions.submissions';
import * as EventTeamActions from './events/actions.teams';
import * as EventVotingActions from './events/actions.voting';
import * as EventUtils from './events/actions.utils';
import { XPData, XpFirestoreFieldKey } from '@/types/xp';
import { DateTime } from 'luxon';

// Update the EventDetails interface to match the expected structure in EventFormData
interface EventDetails {
  eventName: string;
  description: string;
  rules?: string;
  format: EventFormat;
  type: string;
  organizers: string[];
  date: {
    // Match EventFormData's expected type (string | null)
    start: string | null;
    end: string | null;
  };
  allowProjectSubmission: boolean;
  prize?: string;
}

// Fix now() function to correctly use Timestamp - renamed to avoid conflicts
const createTimestamp = () => Timestamp.now();

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
    events.value.filter(event => {
      const visibility = (event as any).settings?.visibility; 
      if (visibility === 'public') return true;
      if (visibility === 'students' && auth.isAuthenticated.value) return true;
      if (visibility === 'participants' && studentProfileStore.studentId && event.participants?.includes(studentProfileStore.studentId)) return true;
      return false;
    })
  );

  const userSubmittedEvents = computed(() => {
    if (!auth.isAuthenticated.value || !studentProfileStore.studentId) return [];
    return events.value.filter(event => event.requestedBy === studentProfileStore.studentId);
  });

  const userParticipatingEvents = computed(() => {
    if (!auth.isAuthenticated.value || !studentProfileStore.studentId) return [];
    return events.value.filter(event =>
      event.participants?.includes(studentProfileStore.studentId!)
    );
  });

  const userWaitlistedEvents = computed(() => {
    if (!auth.isAuthenticated.value || !studentProfileStore.studentId) return [];
    return []; // Current Event type doesn't support this distinction
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

  function _updateLocalEventLists(eventData: Event) {
    const updateList = (list: Ref<Event[]>) => {
        const index = list.value.findIndex(e => e.id === eventData.id);
        const updatedEvent: Event = {
            ...(index !== -1 ? list.value[index] : {}),
            ...deepClone(eventData),
            lastUpdatedAt: eventData.lastUpdatedAt || (index !==-1 ? list.value[index].lastUpdatedAt : undefined) || Timestamp.now()
        } as Event;

        if (index !== -1) {
            list.value.splice(index, 1, updatedEvent);
        } else {
            list.value.push(updatedEvent);
        }
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
      viewedEventDetails.value = {
          ...(viewedEventDetails.value as Event),
          ...deepClone(eventData),
          lastUpdatedAt: eventData.lastUpdatedAt || viewedEventDetails.value.lastUpdatedAt || Timestamp.now()
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
    if (!auth.isAuthenticated.value || !studentProfileStore.studentId) {
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
    if (!auth.isAuthenticated.value || !studentProfileStore.studentId) {
      await _handleOpError("requesting new event", new Error("User not authenticated or profile not loaded."));
      return null;
    }
    const studentId = studentProfileStore.studentId!;
    isLoading.value = true;
    try {
      if (!studentProfileStore.isAuthenticated || !studentProfileStore.studentId) {
        throw new Error('You must be authenticated to create an event.');
      }

      // Enhanced date validation with better error messages
      const startDate = formData.details.date.start;
      const endDate = formData.details.date.end;
      
      if (!startDate || !endDate) {
        throw new Error('Both start and end dates are required.');
      }

      // Convert to DateTime objects for proper comparison
      let startDateTime: DateTime;
      let endDateTime: DateTime;
      
      try {
        // Handle string dates (which is what EventFormData expects)
        if (typeof startDate === 'string') {
          startDateTime = DateTime.fromISO(startDate);
        } else {
          throw new Error('Expected string date format for start date');
        }
        
        if (typeof endDate === 'string') {
          endDateTime = DateTime.fromISO(endDate);
        } else {
          throw new Error('Expected string date format for end date');
        }
      } catch (error) {
        console.error('Date parsing error:', error);
        throw new Error('Invalid date format provided.');
      }

      if (!startDateTime.isValid || !endDateTime.isValid) {
        throw new Error(`Invalid dates provided. Start: ${startDateTime.invalidReason}, End: ${endDateTime.invalidReason}`);
      }

      // Compare full datetime instead of just dates to allow same-day events
      if (endDateTime <= startDateTime) {
        throw new Error(`Event end date and time (${endDateTime.toISO()}) must be after start date and time (${startDateTime.toISO()}).`);
      }

      // Additional validation: ensure dates are not in the past
      const now = DateTime.now().setZone('Asia/Kolkata');
      if (startDateTime < now) {
        throw new Error('Event start date cannot be in the past.');
      }

      // Check for date conflicts - convert DateTime to Date for the function
      const { hasConflict, conflictingEventName } = await checkDateConflict({
        startDate: startDateTime.toJSDate(),
        endDate: endDateTime.toJSDate()
      });

      if (hasConflict) {
        throw new Error(`Date conflict with event: ${conflictingEventName}`);
      }

      // Ensure current user is in organizers list
      if (!formData.details.organizers.includes(studentProfileStore.studentId)) {
        formData.details.organizers.push(studentProfileStore.studentId);
      }

      const mappedData = mapEventDataToFirestore(formData);
      const newEventDataForFirestore = {
        ...mappedData,
        status: EventStatus.Pending,
        requestedBy: studentId,
        createdAt: createTimestamp(),
        lastUpdatedAt: createTimestamp(),
        participants: [],
        votingOpen: false,
      };
      const newEventRef = await addDoc(collection(db, 'events'), newEventDataForFirestore);
      
      // Ensure newEventDataForStore.details has Timestamp objects for dates
      const detailsWithTimestampDates = convertEventDetailsDateFormat(formData.details);

      const newEventDataForStore: Event = {
        ...newEventDataForFirestore,
        id: newEventRef.id,
        details: detailsWithTimestampDates, 
        criteria: formData.criteria,
        teams: formData.teams,
        teamMemberFlatList: [], 
        submissions: [],        
        bestPerformerSelections: {}, 
        winners: {},            
        organizerRatings: [],   
      };
      _updateLocalEventLists(newEventDataForStore);
      notificationStore.showNotification({ message: 'Event request submitted successfully!', type: 'success' });
      return newEventRef.id;
    } catch (err) {
      await _handleOpError('creating new event', err);
      return null;
    } finally {
      isLoading.value = false;
    }
  }

  async function editMyEventRequest(eventId: string, formData: EventFormData): Promise<boolean> {
    actionError.value = null;
    if (!auth.isAuthenticated.value || !studentProfileStore.studentId) {
      await _handleOpError("editing event request", new Error("User not authenticated or profile not loaded."), eventId);
      return false;
    }
    isLoading.value = true;

    try {
      // Validate event dates before mapping
      const startDate = formData.details.date.start ? getISTTimestamp(formData.details.date.start) : null;
      const endDate = formData.details.date.end ? getISTTimestamp(formData.details.date.end) : null;

      if (!startDate || !endDate) {
        throw new Error('Event start and end dates are required.');
      }

      // For edits, we might not need to check if the start date is in the past,
      // but we must ensure the end date is not before the start date.
      // If the event has already started, the start date might be in the past.
      // However, if you want to prevent moving an event's start date to the past:
      // const todayStartIST = DateTime.now().setZone('Asia/Kolkata').startOf('day').toJSDate();
      // const todayStartTimestamp = Timestamp.fromDate(todayStartIST);
      // if (startDate.toMillis() < todayStartTimestamp.toMillis() && /* check if original start date was also in past */ ) {
      //   throw new Error('Event start date cannot be moved to the past.');
      // }

      if (endDate.toMillis() < startDate.toMillis()) { // ADDED: Allow same day
        throw new Error('Event end date must be on or after start date.'); // ADDED: Error message
      }
      
      // Check for date conflicts, excluding the current event
      const { hasConflict, conflictingEventName } = await checkDateConflict({
        startDate: startDate,
        endDate: endDate,
        excludeEventId: eventId
      });

      if (hasConflict) {
        throw new Error(`Date conflict with event: ${conflictingEventName}`);
      }

      const eventRef = doc(db, 'events', eventId);
      // formData.details.date has string dates.
      // mapEventDataToFirestore converts them to Timestamps for Firestore.
      const dataToStoreInFirestore = mapEventDataToFirestore(formData); 
      
      const firestoreUpdatePayload = {
        ...dataToStoreInFirestore,
        lastUpdatedAt: serverTimestamp()
      };
      await updateDoc(eventRef, firestoreUpdatePayload);

      // For local update, simulate the data as it would be after Firestore resolves serverTimestamp
      const dataForLocalMapping = {
        ...dataToStoreInFirestore, // This has details.date as Timestamps
        lastUpdatedAt: Timestamp.now() // Replace serverTimestamp with actual Timestamp
      };
      
      // mapFirestoreToEventData should convert Firestore-like data (with Timestamps)
      // back to the application's Event structure (which also uses Timestamps in details.date).
      const updatedEventPartial = mapFirestoreToEventData(eventId, dataForLocalMapping); // Pass object directly

      const eventIndex = events.value.findIndex(e => e.id === eventId);
      if (eventIndex !== -1) {
        events.value[eventIndex] = createCompleteEvent(
          { ...events.value[eventIndex], ...updatedEventPartial, id: eventId }, 
          events.value[eventIndex]
        );
      }
      
      if (viewedEventDetails.value?.id === eventId) {
        // For the second call, also pass the object directly
        const updatedViewedEventPartial = mapFirestoreToEventData(eventId, dataForLocalMapping);
        viewedEventDetails.value = createCompleteEvent(
          { ...(viewedEventDetails.value as Event), ...updatedViewedEventPartial, id: eventId },
          viewedEventDetails.value as Event
        );
      }
      notificationStore.showNotification({ message: 'Event request updated successfully!', type: 'success' });
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
        // Use createCompleteEvent to ensure a full Event object
        const existingEvent = getEventById(eventId);
        _updateLocalEventLists(createCompleteEvent({ id: eventId, ...updatedFields }, existingEvent));
        notificationStore.showNotification({ message: `Event status updated to ${newStatus}.`, type: 'success' });
    } catch (err) {
        await _handleOpError(`updating event status to ${newStatus}`, err, eventId);
    }
  }


  async function joinEvent(eventId: string): Promise<boolean> {
    actionError.value = null;
    if (!auth.isAuthenticated.value || !studentProfileStore.studentId) {
      await _handleOpError("joining event", new Error("User not authenticated."), eventId);
      return false;
    }
    const studentId = studentProfileStore.studentId!;
    isLoading.value = true;
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
    actionError.value = null;
    if (!auth.isAuthenticated.value || !studentProfileStore.studentId) {
      await _handleOpError("leaving event", new Error("User not authenticated."), eventId);
      return false;
    }
    const studentId = studentProfileStore.studentId!;
    isLoading.value = true;
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
    actionError.value = null;
    if (!auth.isAuthenticated.value || !studentProfileStore.studentId) {
      await _handleOpError("submitting project", new Error("User not authenticated or profile not loaded."), payload.eventId);
      return;
    }
    const studentId = studentProfileStore.studentId!;
    isLoading.value = true;
    try {
        await EventSubmissionActions.submitProjectByStudentInFirestore(payload.eventId, studentId, payload.submissionData);
        const updatedEventData = await EventFetchingActions.fetchSingleEventForStudentFromFirestore(payload.eventId, studentId);
        if (updatedEventData) _updateLocalEventLists(updatedEventData);
        notificationStore.showNotification({ message: "Project submitted successfully!", type: 'success' });
    } catch (err) {
        await _handleOpError("submitting project", err, payload.eventId);
    } finally {
        isLoading.value = false;
    }
  }

  async function submitTeamCriteriaVote(payload: { eventId: string; selections: { criteria: Record<string, string>; bestPerformer?: string } }) {
    actionError.value = null;
    if (!auth.isAuthenticated.value || !studentProfileStore.studentId) {
      await _handleOpError("submitting team criteria vote", new Error("User not authenticated."), payload.eventId);
      return;
    }
    const studentId = studentProfileStore.studentId!;
    isLoading.value = true;
    try {
        // Convert constraint keys to the format expected by backend
        const processedSelections = {
            criteria: payload.selections.criteria, // Keep as-is, backend will handle constraint index mapping
            bestPerformer: payload.selections.bestPerformer
        };
        
        await EventVotingActions.submitTeamCriteriaVoteInFirestore(payload.eventId, studentId, processedSelections);
        const updatedEventData = await EventFetchingActions.fetchSingleEventForStudentFromFirestore(payload.eventId, studentId);
        if (updatedEventData) _updateLocalEventLists(updatedEventData);
        notificationStore.showNotification({ message: "Team selections submitted!", type: 'success' });
    } catch (err) {
        await _handleOpError("submitting team selections", err, payload.eventId);
    } finally {
        isLoading.value = false;
    }
  }
  async function submitIndividualWinnerVote(payload: { eventId: string; selectedWinnerId: string }) {
    actionError.value = null;
    if (!auth.isAuthenticated.value || !studentProfileStore.studentId) {
      await _handleOpError("submitting individual winner vote", new Error("User not authenticated."), payload.eventId);
      return;
    }
    const studentId = studentProfileStore.studentId!;
    isLoading.value = true;
    try {
        await EventVotingActions.submitIndividualWinnerVoteInFirestore(payload.eventId, studentId, payload.selectedWinnerId);
        const updatedEventData = await EventFetchingActions.fetchSingleEventForStudentFromFirestore(payload.eventId, studentId);
        if (updatedEventData) _updateLocalEventLists(updatedEventData);
        notificationStore.showNotification({ message: "Winner selection submitted!", type: 'success' });
    } catch (err) {
        await _handleOpError("submitting individual winner vote", err, payload.eventId);
    } finally {
        isLoading.value = false;
    }
  }

  async function submitManualWinnerSelection(payload: { eventId: string; winnerSelections: Record<string, string> }) {
    actionError.value = null;
    if (!auth.isAuthenticated.value || !studentProfileStore.studentId) {
      await _handleOpError("submitting manual winner selection", new Error("User not authenticated."), payload.eventId);
      return;
    }
    const studentId = studentProfileStore.studentId!;
    isLoading.value = true;
    try {
        await EventVotingActions.submitManualWinnerSelectionInFirestore(payload.eventId, studentId, payload.winnerSelections);
        const updatedEventData = await EventFetchingActions.fetchSingleEventForStudentFromFirestore(payload.eventId, studentId);
        if (updatedEventData) _updateLocalEventLists(updatedEventData);
        notificationStore.showNotification({ message: "Manual winner selection saved!", type: 'success' });
    } catch (err) {
        await _handleOpError("submitting manual winner selection", err, payload.eventId);
    } finally {
        isLoading.value = false;
    }
  }


  async function submitOrganizationRating(payload: { eventId: string; score: number; feedback?: string }) {
    actionError.value = null;
    if (!auth.isAuthenticated.value || !studentProfileStore.studentId) {
      await _handleOpError("submitting organization rating", new Error("User not authenticated."), payload.eventId);
      return;
    }
    const studentId = studentProfileStore.studentId!;
    isLoading.value = true;
    try {
        // If feedback is an empty string (e.g., from trim() || ''), pass null to Firestore.
        // Otherwise, pass the feedback string.
        const commentToSend = (payload.feedback === '' || payload.feedback === undefined) ? null : payload.feedback;

        await EventVotingActions.submitOrganizationRatingInFirestore(payload.eventId, studentId, { score: payload.score, comment: commentToSend });
        const updatedEventData = await EventFetchingActions.fetchSingleEventForStudentFromFirestore(payload.eventId, studentId);
        if (updatedEventData) _updateLocalEventLists(updatedEventData);
        notificationStore.showNotification({ message: "Organizer rating submitted!", type: 'success' });
    } catch (err) {
        await _handleOpError("submitting organization rating", err, payload.eventId);
    } finally {
        isLoading.value = false;
    }
  }

  async function toggleVotingOpen({ eventId, open }: { eventId: string; open: boolean }) {
    actionError.value = null;
    try {
        if (!studentProfileStore.currentStudent) throw new Error("User not authenticated or profile not loaded.");
        // Call the consolidated function, passing the currentStudent object
        await EventVotingActions.toggleVotingStatusInFirestore(eventId, open, studentProfileStore.currentStudent);
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
            const updatePayload: Record<string, any> = { lastUpdatedAt: createTimestamp() };
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

        // Create a proper Event object with all required properties
        const existingEvent = getEventById(eventId);
        if (!existingEvent) throw new Error("Event not found");
        
        // Use the helper function to create a complete Event
        const updatedEvent = createCompleteEvent({
          id: eventId,
          status: EventStatus.Closed,
          closedAt: Timestamp.now(),
          lastUpdatedAt: Timestamp.now()
        }, existingEvent);
        
        _updateLocalEventLists(updatedEvent);
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
      return await checkExistingPendingRequestFromValidation(studentProfileStore.studentId);
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

  async function submitEventRequest(eventData: Omit<Event, 'id' | 'createdAt' | 'lastUpdatedAt' | 'status' | 'requestedBy' | 'teamSubmissions' | 'participants' | 'waitlist'>): Promise<string | null> {
    actionError.value = null;
    if (!auth.isAuthenticated.value || !studentProfileStore.studentId) {
      notificationStore.showNotification({ message: "User not authenticated or profile not loaded.", type: 'error' });
      return null;
    }
    const currentUserId = studentProfileStore.studentId!;
    isLoading.value = true;

    try {
      // Convert Event data to EventFormData format, ensuring dates are strings
      const formDataForMapping: EventFormData = {
        details: {
          eventName: eventData.details.eventName,
          description: eventData.details.description,
          format: eventData.details.format,
          type: eventData.details.type,
          organizers: eventData.details.organizers,
          date: {
            // Ensure dates are strings for EventFormData using toISOString()
            start: eventData.details.date.start instanceof Timestamp ? 
                eventData.details.date.start.toDate().toISOString() : 
                null,
            end: eventData.details.date.end instanceof Timestamp ? 
                eventData.details.date.end.toDate().toISOString() : 
                null
          },
          allowProjectSubmission: eventData.details.allowProjectSubmission,
          rules: eventData.details.rules,
          prize: eventData.details.prize
        },
        criteria: eventData.criteria || [],
        teams: eventData.teams || [],
        votingOpen: eventData.votingOpen // Required field
      };
      
      const mappedData = mapEventDataToFirestore(formDataForMapping);

      const newEventDataForFirestore = {
        ...mappedData,
        status: EventStatus.Pending,
        requestedBy: currentUserId,
        createdAt: createTimestamp(),
        lastUpdatedAt: createTimestamp(),
        participants: [],
        votingOpen: false,
        // Ensure other non-optional Event fields are present if not in mappedData
      };

      const newEventRef = await addDoc(collection(db, 'events'), newEventDataForFirestore);
      
      // Create a complete Event object with proper date formats for local update
      const newEventDataForStore = createCompleteEvent({
        ...newEventDataForFirestore,
        id: newEventRef.id,
        // Make sure details has Timestamp objects for dates
        details: convertEventDetailsDateFormat(eventData.details),
        votingOpen: false
      });
      
      _updateLocalEventLists(newEventDataForStore);
      notificationStore.showNotification({ message: 'Event request submitted successfully!', type: 'success' });
      return newEventRef.id;
    } catch (err) {
      await _handleOpError("submitting event request", err);
      return null;
    } finally {
      isLoading.value = false;
    }
  }

  async function updateEventRequest(eventId: string, eventData: Partial<Omit<Event, 'id' | 'createdAt' | 'lastUpdatedAt' | 'status' | 'requestedBy' | 'teamSubmissions' | 'participants' | 'waitlist'>>): Promise<boolean> {
    actionError.value = null;
    if (!auth.isAuthenticated.value || !studentProfileStore.studentId) {
      notificationStore.showNotification({ message: "User not authenticated or profile not loaded.", type: 'error' });
      return false;
    }
    isLoading.value = true;
    try {
      const eventRef = doc(db, 'events', eventId);
      
      // Create a properly typed form data object with votingOpen included
      let formDataForMapping: EventFormData = {
        details: {
          eventName: eventData.details?.eventName || '',
          description: eventData.details?.description || '',
          format: eventData.details?.format || EventFormat.Individual,
          type: eventData.details?.type || '',
          organizers: eventData.details?.organizers || [],
          date: {
            // Convert Timestamp to string format using toISOString()
            start: eventData.details?.date.start instanceof Timestamp ? eventData.details.date.start.toDate().toISOString() : null,
            end: eventData.details?.date.end instanceof Timestamp ? eventData.details.date.end.toDate().toISOString() : null
          },
          allowProjectSubmission: eventData.details?.allowProjectSubmission || false,
          rules: eventData.details?.rules,
          prize: eventData.details?.prize
        },
        criteria: eventData.criteria || [],
        teams: eventData.teams || [],
        votingOpen: eventData.votingOpen ?? false // Add required field with default
      };
      
      // Map data using the proper formatter
      const mappedData = mapEventDataToFirestore(formDataForMapping);
      
      // Build the update payload
      const updatePayload: any = {
        ...mappedData,
        lastUpdatedAt: serverTimestamp()
      };
      
      // Add other fields if needed using proper type checks
      if ('status' in eventData) updatePayload.status = (eventData as any).status;
      if ('rejectionReason' in eventData) updatePayload.rejectionReason = (eventData as any).rejectionReason;
      if ('lifecycleTimestamps' in eventData) updatePayload.lifecycleTimestamps = (eventData as any).lifecycleTimestamps;
      
      await updateDoc(eventRef, updatePayload);
      
      // Update local state with a properly typed Event object
      const existingEvent = getEventById(eventId);
      if (existingEvent) {
        const updatedLocalEvent = createCompleteEvent({
          ...eventData,
          lastUpdatedAt: Timestamp.now()
        }, existingEvent);
        
        _updateLocalEventLists(updatedLocalEvent);
      }
      
      notificationStore.showNotification({ message: 'Event request updated successfully!', type: 'success' });
      return true;
    } catch (err) {
      await _handleOpError("updating event request", err);
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  // Create a helper function to convert string dates to Timestamp objects
  function convertEventDetailsDateFormat(details: any): import('@/types/event').EventDetails {
    if (!details) return {} as import('@/types/event').EventDetails;
    
    // Create a deep copy to avoid modifying the original
    const convertedDetails = { ...details };
    
    // Convert date strings to Timestamp objects if they exist
    if (convertedDetails.date) {
      convertedDetails.date = {
        start: convertedDetails.date.start ? 
          (typeof convertedDetails.date.start === 'string' ? 
            Timestamp.fromDate(new Date(convertedDetails.date.start)) : 
            convertedDetails.date.start) : 
          null,
        end: convertedDetails.date.end ? 
          (typeof convertedDetails.date.end === 'string' ? 
            Timestamp.fromDate(new Date(convertedDetails.date.end)) : 
            convertedDetails.date.end) : 
          null
      };
    }
    
    return convertedDetails as import('@/types/event').EventDetails;
  }

  // Modify the createCompleteEvent function to handle date conversions
  function createCompleteEvent(partialEvent: Partial<Event>, existingEvent?: Event): Event {
    // Convert dates in details if they exist
    const convertedDetails = partialEvent.details ? 
      convertEventDetailsDateFormat(partialEvent.details) : 
      (existingEvent?.details || {
        eventName: '',
        description: '',
        format: EventFormat.Individual,
        type: '',
        organizers: [],
        date: { start: null, end: null },
        allowProjectSubmission: false
      });

    return {
      id: partialEvent.id || '',
      details: convertedDetails,
      requestedBy: partialEvent.requestedBy || existingEvent?.requestedBy || '',
      votingOpen: partialEvent.votingOpen ?? existingEvent?.votingOpen ?? false,
      createdAt: partialEvent.createdAt || existingEvent?.createdAt || Timestamp.now(),
      lastUpdatedAt: partialEvent.lastUpdatedAt || existingEvent?.lastUpdatedAt || Timestamp.now(),
      status: partialEvent.status || existingEvent?.status || EventStatus.Pending,
      participants: partialEvent.participants || existingEvent?.participants || [],
      criteria: partialEvent.criteria || existingEvent?.criteria || [],
      teams: partialEvent.teams || existingEvent?.teams || [],
      teamMemberFlatList: partialEvent.teamMemberFlatList || existingEvent?.teamMemberFlatList || [],
      submissions: partialEvent.submissions || existingEvent?.submissions || [],
      bestPerformerSelections: partialEvent.bestPerformerSelections || existingEvent?.bestPerformerSelections || {},
      winners: partialEvent.winners || existingEvent?.winners || {},
      organizerRatings: partialEvent.organizerRatings || existingEvent?.organizerRatings || [],
      lifecycleTimestamps: partialEvent.lifecycleTimestamps || existingEvent?.lifecycleTimestamps,
      closedAt: partialEvent.closedAt || existingEvent?.closedAt,
      rejectionReason: partialEvent.rejectionReason || existingEvent?.rejectionReason,
      manuallySelectedBy: partialEvent.manuallySelectedBy || existingEvent?.manuallySelectedBy
    } as Event;
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