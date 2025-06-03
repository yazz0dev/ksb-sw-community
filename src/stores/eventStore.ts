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
import { checkDateConflictForRequest, checkExistingPendingRequestForStudent as checkExistingPendingRequestFromValidation } from './events/actions.validation';
import { handleFirestoreError as formatFirestoreErrorUtil } from '@/utils/errorHandlers';

// import * as EventLifecycleActions from './events/actions.lifecycle';
import { XPData, XpFirestoreFieldKey } from '@/types/xp';
import { DateTime } from 'luxon';
import { compareEventsForSort, mergeLifecycleTimestamps, convertEventDetailsDateFormat } from '@/utils/eventUtils';
import { 
  createEventRequest as createEventRequestService, 
  updateEventRequestInService, 
  closeEventAndAwardXP as closeEventAndAwardXPService,
  fetchMyEventRequests as fetchMyEventRequestsService,             // Renamed import
  fetchSingleEventForStudent as fetchSingleEventForStudentService, // Renamed import
  fetchPubliclyViewableEvents as fetchPubliclyViewableEventsService, // Renamed import
  updateEventStatusInFirestore as updateEventStatusService,
  joinEventByStudentInFirestore as joinEventService, 
  leaveEventByStudentInFirestore as leaveEventService,
  submitProject as submitProjectService,
  autoGenerateEventTeamsInFirestore as autoGenerateEventTeamsService,
  submitTeamCriteriaVoteInFirestore as submitTeamCriteriaVoteService,
  submitIndividualWinnerVoteInFirestore as submitIndividualWinnerVoteService,
  submitOrganizationRatingInFirestore as submitOrganizationRatingService,
  toggleVotingStatusInFirestore as toggleVotingStatusService,
  calculateWinnersFromVotes as calculateWinnersFromVotesService,
  saveWinnersToFirestore as saveWinnersToFirestoreService,
  submitManualWinnerSelectionInFirestore as submitManualWinnerSelectionService
} from '@/services/eventService';

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

export const useEventStore = defineStore('studentEvents', () => {
  // Refs (State)
  const events = ref<Event[]>([]);
  const viewedEventDetails = ref<Event | null>(null);
  const myEventRequests = ref<Event[]>([]);
  const isLoading = ref<boolean>(false);
  const actionError = ref<string | null>(null);
  const fetchError = ref<string | null>(null);

  // Store instances
  const studentProfileStore = useProfileStore();
  const notificationStore = useNotificationStore();
  const appStore = useAppStore();
  const auth = useAuth();

  // Computed (Getters)
  const allPubliclyViewableEvents = computed(() => {
    return events.value;
  });

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

  // Actions (methods)
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
    let finalMessage: string;
    const context = eventId ? `${operation} for event ${eventId}` : operation;

    if (err && typeof (err as any).code === 'string') {
        const formattedMessage = formatFirestoreErrorUtil(err);
        if (formattedMessage === 'An unknown error occurred.' || formattedMessage === 'The service is currently unavailable. Please try again later.') {
            finalMessage = err instanceof Error ? `${context}: ${err.message}` : `An error occurred during ${context}. Details: ${formattedMessage}`;
        } else {
            finalMessage = formattedMessage;
        }
    } else if (err instanceof Error) {
        finalMessage = `${context}: ${err.message}`;
    } else {
        finalMessage = `An unknown error occurred during ${context}.`;
    }
    
    actionError.value = finalMessage;
    console.error(`StudentEventStore Operation Error (${operation})${eventId ? ` for event ${eventId}` : ''}:`, err instanceof Error ? err.message : err);
    notificationStore.showNotification({ message: finalMessage, type: 'error' });
  }

  async function _handleFetchError(operation: string, err: unknown): Promise<void> {
    let finalMessage: string;

    if (err && typeof (err as any).code === 'string') {
        const formattedMessage = formatFirestoreErrorUtil(err);
        if (formattedMessage === 'An unknown error occurred.' || formattedMessage === 'The service is currently unavailable. Please try again later.') {
            finalMessage = err instanceof Error ? `${operation}: ${err.message}` : `An error occurred during ${operation}. Details: ${formattedMessage}`;
        } else {
            finalMessage = formattedMessage;
        }
    } else if (err instanceof Error) {
        finalMessage = `${operation}: ${err.message}`;
    } else {
        finalMessage = `An unknown error occurred during ${operation}.`;
    }

    fetchError.value = finalMessage;
    console.error(`StudentEventStore Fetch Error (${operation}):`, err instanceof Error ? err.message : err);
  }

  async function fetchEvents() {
    isLoading.value = true;
    fetchError.value = null;
    try {
        const fetchedEvents = await fetchPubliclyViewableEventsService(); 
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
      const requests = await fetchMyEventRequestsService(studentProfileStore.studentId);
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
      const eventData = await fetchSingleEventForStudentService(eventId, studentProfileStore.studentId);

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
      // --- Start of existing validation logic (to be kept in store) ---
      const startDate = formData.details.date.start;
      const endDate = formData.details.date.end;
      if (!startDate || !endDate) {
        throw new Error('Both start and end dates are required.');
      }
      let startDateTime: DateTime;
      let endDateTime: DateTime;
      try {
        if (typeof startDate === 'string') startDateTime = DateTime.fromISO(startDate); else throw new Error('Expected string date format for start date');
        if (typeof endDate === 'string') endDateTime = DateTime.fromISO(endDate); else throw new Error('Expected string date format for end date');
      } catch (error) { console.error('Date parsing error:', error); throw new Error('Invalid date format provided.'); }
      if (!startDateTime.isValid || !endDateTime.isValid) throw new Error(`Invalid dates provided. Start: ${startDateTime.invalidReason}, End: ${endDateTime.invalidReason}`);
      if (endDateTime < startDateTime) throw new Error(`Event end date must be on or after the start date.`);
      const nowInIST = DateTime.now().setZone('Asia/Kolkata');
      if (startDateTime < nowInIST) throw new Error('Event start date cannot be in the past.');

      // The checkDateConflict function in the store might need to be adapted if it directly uses Firestore.
      // For now, assuming it works as is or will be refactored separately.
      const { hasConflict, conflictingEventName } = await checkDateConflict({ startDate: startDateTime.toJSDate(), endDate: endDateTime.toJSDate() });
      if (hasConflict) throw new Error(`Date conflict with event: ${conflictingEventName}`);
      // --- End of existing validation logic ---

      // Ensure current user is in organizers list (can be part of formData preparation if service doesn't handle it)
      // The service version already ensures requester is an organizer.
      // if (!formData.details.organizers.includes(studentId)) {
      //   formData.details.organizers.push(studentId);
      // }

      // Call the service function
      // The service's mapEventDataToFirestore is expected to handle date to Timestamp conversion
      // and setting default fields like rules/prize to null if empty.
      const newEventId = await createEventRequestService(formData, studentId);

      if (!newEventId) { // Should not happen if service throws on error
        throw new Error("Failed to create event request via service.");
      }

      // Create a complete Event object for local store using the ID from the service
      // We need to simulate the data that would have been written to Firestore to pass to createCompleteEvent
      // or fetch the event data using the newEventId. Fetching is safer for consistency.
      // For now, let's try to construct it, assuming service sets reasonable defaults.
      
      // Construct a partial event data based on formData and known defaults set by the service
      // to pass to createCompleteEvent. This part might need refinement based on what createCompleteEvent needs
      // and what the service guarantees.
      const eventDataForStoreCreation: Partial<Event> = {
        id: newEventId,
        details: {
            ...formData.details,
            // Dates in formData.details are strings, convertEventDetailsDateFormat will handle them if createCompleteEvent calls it.
            // Or, ensure they are Timestamps if createCompleteEvent expects them directly.
            // For now, let's assume createCompleteEvent will call convertEventDetailsDateFormat, which expects strings or Timestamps.
        date: {
                start: Timestamp.fromDate(startDateTime.toJSDate()), // Convert to Timestamp for createCompleteEvent
                end: Timestamp.fromDate(endDateTime.toJSDate())     // Convert to Timestamp for createCompleteEvent
            },
            rules: formData.details.rules || undefined, // Match Event type (undefined vs null)
            prize: formData.details.prize || undefined, // Match Event type (undefined vs null)
        },
        requestedBy: studentId,
        status: EventStatus.Pending, // Service sets this
        createdAt: Timestamp.now(), // Approximate, service sets actual
        lastUpdatedAt: Timestamp.now(), // Approximate, service sets actual
        participants: [], // Default
        votingOpen: false, // Default, service sets this
        criteria: formData.criteria || [],
        teams: formData.teams || [],
        // Other fields like teamMemberFlatList, submissions, etc., will be defaulted by createCompleteEvent
      };

      const newEventDataForStore: Event = createCompleteEvent(eventDataForStoreCreation);
        
        _updateLocalEventLists(newEventDataForStore);
        notificationStore.showNotification({ message: 'Event request submitted successfully!', type: 'success' });
      return newEventId;

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
      const startDate = formData.details.date.start ? getISTTimestamp(formData.details.date.start) : null;
      const endDate = formData.details.date.end ? getISTTimestamp(formData.details.date.end) : null;
      if (!startDate || !endDate) throw new Error('Event start and end dates are required.');
      if (endDate.toMillis() < startDate.toMillis()) throw new Error('Event end date must be on or after start date.');
      const { hasConflict, conflictingEventName } = await checkDateConflict({
        startDate: startDate,
        endDate: endDate,
        excludeEventId: eventId
      });
      if (hasConflict) throw new Error(`Date conflict with event: ${conflictingEventName}`);

      const existingEvent = await fetchSingleEventForStudentService(eventId, studentProfileStore.studentId);
      if (!existingEvent) {
        throw new Error("Event not found or you don\'t have permission to edit it.");
      }
      if (existingEvent.status !== EventStatus.Pending && existingEvent.status !== EventStatus.Rejected) {
        throw new Error(`Event in status '${existingEvent.status}' cannot be edited by the requester.`);
      }

      await updateEventRequestInService(eventId, formData, existingEvent.details.format);
      
      const updatedEvent = await fetchSingleEventForStudentService(eventId, studentProfileStore.studentId);
      if (updatedEvent) {
        _updateLocalEventLists(updatedEvent);
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
        if (!studentProfileStore.currentStudent) throw new Error("User not authenticated.");
        // Call the service function
        const updatedFields = await updateEventStatusService(eventId, newStatus, studentProfileStore.currentStudent, rejectionReason);
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
        await joinEventService(eventId, studentId);
        const updatedEventData = await fetchSingleEventForStudentService(eventId, studentId);
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
        await leaveEventService(eventId, studentId);
        const updatedEventData = await fetchSingleEventForStudentService(eventId, studentId);
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
        await submitProjectService(payload.eventId, studentId, payload.submissionData);
        const updatedEventData = await fetchSingleEventForStudentService(payload.eventId, studentId);
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
      // Service function now contains all validation and Firestore logic
      await submitTeamCriteriaVoteService(payload.eventId, studentId, payload.selections);
      const updatedEventData = await fetchSingleEventForStudentService(payload.eventId, studentId);
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
      // Service function now contains all validation and Firestore logic
      await submitIndividualWinnerVoteService(payload.eventId, studentId, payload.selectedWinnerId);
      const updatedEventData = await fetchSingleEventForStudentService(payload.eventId, studentId);
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
    const studentId = studentProfileStore.studentId!; // This should be an organizer/admin ID
    isLoading.value = true;
    try {
      // Service function contains validation (including permission check if studentId is organizer/admin)
      await submitManualWinnerSelectionService(payload.eventId, studentId, payload.winnerSelections);
      const updatedEventData = await fetchSingleEventForStudentService(payload.eventId, studentProfileStore.studentId); // Refetch with current user's view
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
      const ratingData = { 
        score: payload.score, 
        comment: (payload.feedback === '' || payload.feedback === undefined) ? null : payload.feedback 
      };
      // Service function contains all validation and Firestore logic
      await submitOrganizationRatingService(payload.eventId, studentId, ratingData);
      const updatedEventData = await fetchSingleEventForStudentService(payload.eventId, studentId);
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
    isLoading.value = true; // Added isLoading true
    try {
      if (!studentProfileStore.currentStudent) throw new Error("User not authenticated or profile not loaded for voting toggle.");
      // Service function contains permission checks and Firestore logic
      await toggleVotingStatusService(eventId, open, studentProfileStore.currentStudent);
      const updatedEventData = await fetchSingleEventForStudentService(eventId, studentProfileStore.studentId);
        if (updatedEventData) _updateLocalEventLists(updatedEventData);
        notificationStore.showNotification({ message: `Voting is now ${open ? 'OPEN' : 'CLOSED'}.`, type: 'success' });
    } catch (err) {
        await _handleOpError(`toggling voting to ${open ? 'open' : 'closed'}`, err, eventId);
    } finally {
      isLoading.value = false; // Added isLoading false
    }
  }

  async function findWinner(eventId: string) {
    actionError.value = null;
    isLoading.value = true; // Added isLoading true
    try {
      // Service function for calculation
      const calculatedWinners = await calculateWinnersFromVotesService(eventId);
        if (Object.keys(calculatedWinners).length === 0) {
            notificationStore.showNotification({ message: "No winners could be determined based on selections.", type: 'info' });
        isLoading.value = false; // Added isLoading false before early return
            return;
        }
      // Service function for saving
      await saveWinnersToFirestoreService(eventId, calculatedWinners);
      const updatedEventData = await fetchSingleEventForStudentService(eventId, studentProfileStore.studentId);
        if (updatedEventData) _updateLocalEventLists(updatedEventData);
        notificationStore.showNotification({ message: "Winner(s) determined and saved.", type: 'success' });
    } catch (err) {
        await _handleOpError("finding winner", err, eventId);
    } finally {
      isLoading.value = false; // Added isLoading false
    }
  }

  async function closeEventPermanently({ eventId }: { eventId: string }) {
    actionError.value = null;
    try {
      if (!studentProfileStore.currentStudent) {
        throw new Error("User not authenticated or profile not loaded.");
      }

      // Call the service function to handle closing and XP awarding
      const result = await closeEventAndAwardXPService(eventId, studentProfileStore.currentStudent);

      if (!result.success) {
        // The service should throw on error, but as a fallback:
        throw new Error(result.message || "Failed to close event via service.");
                    }

      // Update local event state
        const existingEvent = getEventById(eventId);
      if (!existingEvent) {
        // This case should ideally not happen if the event existed before closing
        console.warn(`Event ${eventId} not found locally after service call to close.`);
        // Potentially fetch it if really needed, but service interaction should be source of truth
      }
      // Create a representative local update. The service already updated Firestore.
      // The service returns xpAwarded map; we primarily need to update status and timestamps locally.
      const updatedEventForStore = createCompleteEvent({
          id: eventId,
          status: EventStatus.Closed,
        closedAt: Timestamp.now(), // Approximate with client time, server set actual
        lastUpdatedAt: Timestamp.now() // Approximate
      }, existingEvent || { id: eventId } as Event ); // Provide a minimal existing event if not found
        
      _updateLocalEventLists(updatedEventForStore);

      // If current user received XP, refresh their profile
      if (result.xpAwarded && studentProfileStore.studentId && result.xpAwarded[studentProfileStore.studentId]) {
            await studentProfileStore.fetchProfileForView(studentProfileStore.studentId);
        }

      notificationStore.showNotification({ message: result.message, type: 'success' });
      return { success: true, message: result.message, xpAwarded: result.xpAwarded };

    } catch (err: any) {
      // The service now throws detailed errors, so _handleOpError can use err.message
        await _handleOpError("closing event permanently", err, eventId);
        return { success: false, message: err.message || "Failed to close event." };
    }
  }

   async function autoGenerateTeams(payload: { eventId: string; minMembersPerTeam?: number; maxMembersPerTeam?: number; }) {
    const { eventId, minMembersPerTeam = 2, maxMembersPerTeam = 8 } = payload;
    actionError.value = null;
    isLoading.value = true;
    try {
      const event = getEventById(eventId);
      if (!event) throw new Error('Event data not loaded locally. Cannot auto-generate teams.');
      if (event.details.format !== EventFormat.Team) throw new Error("Auto-generation only for 'Team' events.");

      if (studentProfileStore.allUsers.length === 0) {
        await studentProfileStore.fetchUserNamesBatch([]);
      }
      const studentsToPassToService = studentProfileStore.allUsers;

      await autoGenerateEventTeamsService(eventId, studentsToPassToService, minMembersPerTeam, maxMembersPerTeam);

      const updatedEventData = await fetchSingleEventForStudentService(eventId, studentProfileStore.studentId);
      if (updatedEventData) _updateLocalEventLists(updatedEventData);
      notificationStore.showNotification({ message: `Teams auto-generated successfully.`, type: 'success' });
    } catch (err) {
      await _handleOpError("auto-generating teams", err, eventId);
    } finally {
      isLoading.value = false;
    }
  }

  async function checkExistingRequests(): Promise<boolean> {
    if (!studentProfileStore.studentId) return false;
    try {
      return await checkExistingPendingRequestFromValidation(studentProfileStore.studentId);
    } catch (error) {
      await _handleOpError("checking existing requests", error);
      return false;
    }
  }

  async function checkDateConflict(payload: { startDate: Date | string | Timestamp | null; endDate: Date | string | Timestamp | null; excludeEventId?: string | null }): Promise<{ hasConflict: boolean; nextAvailableDate: string | null; conflictingEvent: Event | null, conflictingEventName?: string | null }> {
    try {
         const result = await checkDateConflictForRequest(payload.startDate, payload.endDate, payload.excludeEventId);
         return { hasConflict: result.hasConflict, nextAvailableDate: null, conflictingEvent: null, conflictingEventName: result.conflictingEventName };
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
      // Prepare EventFormData for the service call
      const formDataForService: EventFormData = {
        details: {
          eventName: eventData.details.eventName,
          description: eventData.details.description,
          format: eventData.details.format,
          type: eventData.details.type,
          organizers: eventData.details.organizers,
          date: {
            start: eventData.details.date.start instanceof Timestamp ? eventData.details.date.start.toDate().toISOString() : null,
            end: eventData.details.date.end instanceof Timestamp ? eventData.details.date.end.toDate().toISOString() : null
          },
          allowProjectSubmission: eventData.details.allowProjectSubmission,
          rules: eventData.details.rules,
          prize: eventData.details.prize
        },
        criteria: eventData.criteria || [],
        teams: eventData.teams || [],
        votingOpen: eventData.votingOpen // This is part of EventFormData
      };
      
      // Call the service function
      const newEventId = await createEventRequestService(formDataForService, currentUserId);

      if (!newEventId) { // Should not happen if service throws on error
        throw new Error("Failed to submit event request via service.");
      }
      
      // Create a complete Event object for local update
      // Pass the original eventData (which has Timestamps if they existed) and the new ID to createCompleteEvent
      const newEventDataForStore = createCompleteEvent({
        ...eventData, // Spread original eventData which might have Timestamps for dates
        id: newEventId,
        requestedBy: currentUserId,
        status: EventStatus.Pending, // Service sets this
        createdAt: Timestamp.now(), // Approximate, service sets actual
        lastUpdatedAt: Timestamp.now(), // Approximate, service sets actual
        participants: [], // Default
        // votingOpen is part of eventData and will be carried over by spread
      });
      
      _updateLocalEventLists(newEventDataForStore);
      notificationStore.showNotification({ message: 'Event request submitted successfully!', type: 'success' });
      return newEventId;
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
      const existingEvent = await fetchSingleEventForStudentService(eventId, studentProfileStore.studentId);
      if (!existingEvent) {
        throw new Error("Event not found or you don\'t have permission to edit it.");
      }
      
      const formDataForService: EventFormData = {
        details: {
          eventName: eventData.details?.eventName || existingEvent.details.eventName, 
          description: eventData.details?.description || existingEvent.details.description, 
          format: eventData.details?.format || existingEvent.details.format, 
          type: eventData.details?.type || existingEvent.details.type, 
          organizers: eventData.details?.organizers || existingEvent.details.organizers, 
          date: {
            start: eventData.details?.date?.start instanceof Timestamp ? eventData.details.date.start.toDate().toISOString() : (existingEvent.details.date.start instanceof Timestamp ? existingEvent.details.date.start.toDate().toISOString() : null),
            end: eventData.details?.date?.end instanceof Timestamp ? eventData.details.date.end.toDate().toISOString() : (existingEvent.details.date.end instanceof Timestamp ? existingEvent.details.date.end.toDate().toISOString() : null)
          },
          allowProjectSubmission: eventData.details?.allowProjectSubmission ?? existingEvent.details.allowProjectSubmission, 
          rules: eventData.details?.rules !== undefined ? eventData.details.rules : existingEvent.details.rules, 
          prize: eventData.details?.prize !== undefined ? eventData.details.prize : existingEvent.details.prize
        },
        criteria: eventData.criteria || existingEvent.criteria || [],
        teams: eventData.teams || existingEvent.teams || [],
        votingOpen: eventData.votingOpen ?? existingEvent.votingOpen ?? false
      };
      
      await updateEventRequestInService(eventId, formDataForService, existingEvent.details.format);
      
      const updatedEventDataFromFirestore = await fetchSingleEventForStudentService(eventId, studentProfileStore.studentId);
      if (updatedEventDataFromFirestore) {
        _updateLocalEventLists(updatedEventDataFromFirestore);
      } else {
        console.warn(`Failed to refetch event ${eventId} after update, local state might be stale.`);
      }
      
      notificationStore.showNotification({ message: 'Event request updated successfully!', type: 'success' });
      return true;
    } catch (err) {
      await _handleOpError("updating event request", err, eventId);
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  function createCompleteEvent(partialEvent: Partial<Event>, existingEvent?: Event): Event {
    const detailsToConvert = partialEvent.details || existingEvent?.details;
    const convertedDetails = detailsToConvert ? 
      convertEventDetailsDateFormat(detailsToConvert) : // Uses imported version from eventUtils
      { eventName: '', description: '', format: EventFormat.Individual, type: '', organizers: [], date: { start: null, end: null }, allowProjectSubmission: false };

    return {
      id: partialEvent.id || existingEvent?.id || '',
      details: {
        ...convertedDetails, // Spread converted (which now contains Timestamps)
        // Ensure string dates from formData are not overriding Timestamps if they were passed in partialEvent.details directly
        // This part needs care. The current convertEventDetailsDateFormat expects strings or Timestamps.
        // If partialEvent.details.date still contains strings, they will be converted.
        // If partialEvent.details.date contained Timestamps (like from eventDataForStoreCreation), they should be preserved.
      },
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
      lifecycleTimestamps: mergeLifecycleTimestamps(existingEvent?.lifecycleTimestamps, partialEvent.lifecycleTimestamps),
      closedAt: partialEvent.closedAt || existingEvent?.closedAt,
      rejectionReason: partialEvent.rejectionReason || existingEvent?.rejectionReason,
      manuallySelectedBy: partialEvent.manuallySelectedBy || existingEvent?.manuallySelectedBy
    } as Event;
  }

  return {
    events, viewedEventDetails, myEventRequests, isLoading, actionError, fetchError,
    allPubliclyViewableEvents, userSubmittedEvents, userParticipatingEvents, userWaitlistedEvents,
    getEventById, currentEventDetails, upcomingEvents, activeEvents, pastEvents,
    _updateLocalEventLists, _handleOpError, _handleFetchError,
    fetchEvents, fetchMyEventRequests, fetchEventDetails,
    requestNewEvent, editMyEventRequest, updateEventStatus,
    joinEvent, leaveEvent,
    submitProject,
    submitTeamCriteriaVote, submitIndividualWinnerVote, submitManualWinnerSelection, submitOrganizationRating,
    toggleVotingOpen, findWinner, closeEventPermanently, autoGenerateTeams,
    checkExistingRequests, checkDateConflict,
    createCompleteEvent,
    submitEventRequest, updateEventRequest
  };
});