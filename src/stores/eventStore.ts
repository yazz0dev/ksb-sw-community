// src/stores/studentEventStore.ts
import { defineStore } from 'pinia';
import { ref, computed, type Ref } from 'vue';
import {
  Timestamp} from 'firebase/firestore';
import { type Event, EventStatus, type EventFormData, type Submission, EventFormat } from '@/types/event';
import { useProfileStore } from './profileStore';
import { useNotificationStore } from './notificationStore';
import { useAuth } from '@/composables/useAuth';
import { getISTTimestamp } from '@/utils/eventDataUtils';
import { convertToISTDateTime } from '@/utils/dateTime';
import { deepClone } from '@/utils/eventUtils';
import { checkDateConflictForRequest } from '@/services/eventService/eventValidation';
import { handleFirestoreError as formatFirestoreErrorUtil } from '@/utils/errorHandlers';
import { DateTime } from 'luxon';
import { compareEventsForSort } from '@/utils/eventUtils';
import { 
  createEventRequest as createEventRequestService, 
  updateEventRequestInService, 
} from '@/services/eventService/eventCreation';
import {
  closeEventAndAwardXP as closeEventAndAwardXPService,
  updateEventStatusInFirestore as updateEventStatusService,
  deleteEventRequestInFirestore as deleteEventRequestService,
} from '@/services/eventService/eventManagement';
import {
  fetchMyEventRequests as fetchMyEventRequestsService,
  fetchSingleEventForStudent as fetchSingleEventForStudentService,
  fetchPubliclyViewableEvents as fetchPubliclyViewableEventsService,
  hasPendingRequest,
} from '@/services/eventService/eventQueries';
import {
  joinEventByStudentInFirestore as joinEventService, 
  leaveEventByStudentInFirestore as leaveEventService,
  submitProject as submitProjectService,
} from '@/services/eventService/eventParticipation';
import {
  autoGenerateEventTeamsInFirestore as autoGenerateEventTeamsService,
} from '@/services/eventService/eventTeams';
import {
  submitTeamCriteriaVoteInFirestore as submitTeamCriteriaVoteService,
  submitIndividualWinnerVoteInFirestore as submitIndividualWinnerVoteService,
  submitOrganizationRatingInFirestore as submitOrganizationRatingService,
  toggleVotingStatusInFirestore as toggleVotingStatusService,
  submitManualWinnerSelectionInFirestore as submitManualWinnerSelectionService
} from '@/services/eventService/eventVoting';
import type { UserData } from '@/types/student';


// Add createCompleteEvent function before the store definition
function createCompleteEvent(partialEventData: Partial<Event>, existingEvent?: Event | undefined): Event {
  // Create a complete Event object with defaults for missing fields
  const defaultEvent: Event = {
    id: partialEventData.id || '',
    details: {
      eventName: '',
      description: '',
      format: EventFormat.Individual,
      type: '',
      organizers: [],
      date: {
        start: null,
        end: null
      },
      allowProjectSubmission: false,
      ...(partialEventData.details || {})
    },
    status: EventStatus.Pending,
    requestedBy: '',
    votingOpen: false,
    createdAt: Timestamp.now(),
    lastUpdatedAt: Timestamp.now(),
    participants: [],
    submissions: [],
    ...(existingEvent || {}),
    ...partialEventData
  };

  return defaultEvent;
}

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
        const existingEvent = index !== -1 ? list.value[index] : null;
        const updatedEvent: Event = {
            ...(existingEvent || {}),
            ...deepClone(eventData),
            lastUpdatedAt: eventData.lastUpdatedAt || (existingEvent?.lastUpdatedAt || Timestamp.now())
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
          // Manually convert date objects to Timestamps if they aren't already.
          // This can happen if data comes from a source that loses the class instance (e.g., deepClone, some state management).
          if (eventData.details.date?.start && typeof eventData.details.date.start === 'object' && 'seconds' in eventData.details.date.start) {
            eventData.details.date.start = new Timestamp((eventData.details.date.start as any).seconds, (eventData.details.date.start as any).nanoseconds);
          }
          if (eventData.details.date?.end && typeof eventData.details.date.end === 'object' && 'seconds' in eventData.details.date.end) {
            eventData.details.date.end = new Timestamp((eventData.details.date.end as any).seconds, (eventData.details.date.end as any).nanoseconds);
          }
          
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
      
      // FIX: Normalize to start of day for comparison
      const nowInIST = DateTime.now().setZone('Asia/Kolkata').startOf('day');
      if (startDateTime.startOf('day') < nowInIST) throw new Error('Event start date cannot be in the past.');

      const { hasConflict, conflictingEventName } = await checkDateConflict({ startDate: startDateTime.toJSDate(), endDate: endDateTime.toJSDate() });
      if (hasConflict) throw new Error(`Date conflict with event: ${conflictingEventName}`);
      // --- End of existing validation logic ---

      const newEventId = await createEventRequestService(deepClone(formData), studentId);

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
    const currentStudentId = studentProfileStore.studentId; // Store studentId
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

      const existingEvent = await fetchSingleEventForStudentService(eventId, currentStudentId); // Use currentStudentId
      if (!existingEvent) {
        throw new Error("Event not found or you don't have permission to edit it.");
      }
      if (existingEvent.status !== EventStatus.Pending && existingEvent.status !== EventStatus.Rejected) {
        throw new Error(`Event in status '${existingEvent.status}' cannot be edited by the requester.`);
      }

      // Fix: Pass currentStudentId instead of existingEvent.details.format
      await updateEventRequestInService(eventId, deepClone(formData), currentStudentId);
      
      const updatedEvent = await fetchSingleEventForStudentService(eventId, currentStudentId); // Use currentStudentId
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

  async function deleteEventRequest(eventId: string): Promise<boolean> {
    actionError.value = null;
    if (!auth.isAuthenticated.value || !studentProfileStore.studentId) {
      await _handleOpError("deleting event request", new Error("User not authenticated."), eventId);
      return false;
    }
    const studentId = studentProfileStore.studentId;
    isLoading.value = true;
    try {
      await deleteEventRequestService(eventId, studentId);

      // Remove from local lists
      myEventRequests.value = myEventRequests.value.filter(e => e.id !== eventId);
      events.value = events.value.filter(e => e.id !== eventId);
      if (viewedEventDetails.value?.id === eventId) {
          viewedEventDetails.value = null;
      }

      notificationStore.showNotification({ message: 'Event request deleted successfully!', type: 'success' });
      return true;
    } catch (err) {
      await _handleOpError("deleting event request", err, eventId);
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  async function updateEventStatus({ eventId, newStatus, rejectionReason }: { eventId: string; newStatus: EventStatus; rejectionReason?: string }) {
    actionError.value = null;
    try {
        if (!studentProfileStore.currentStudent) throw new Error("User not authenticated.");
        // Ensure photoURL is not undefined to match UserData type
        const currentUser: UserData = {
            ...studentProfileStore.currentStudent,
            photoURL: studentProfileStore.currentStudent.photoURL || null
        };
        // Call the service function
        const updatedFields = await updateEventStatusService(eventId, newStatus, currentUser, rejectionReason);
        const existingEvent = getEventById(eventId);
        _updateLocalEventLists(createCompleteEvent({ id: eventId, ...updatedFields }, existingEvent));
        notificationStore.showNotification({ message: `Event status updated to ${newStatus}.`, type: 'success' });
    }  catch (err) {
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

  async function submitTeamCriteriaVote(payload: { eventId: string; votes: { criteria: Record<string, string>; bestPerformer?: string } }) {
    actionError.value = null;
    if (!auth.isAuthenticated.value || !studentProfileStore.studentId) {
      await _handleOpError("submitting team criteria vote", new Error("User not authenticated."), payload.eventId);
      return;
    }
    const studentId = studentProfileStore.studentId!;
    isLoading.value = true;
    try {
      // Service function now contains all validation and Firestore logic
      await submitTeamCriteriaVoteService(payload.eventId, studentId, payload.votes);
      const updatedEventData = await fetchSingleEventForStudentService(payload.eventId, studentId);
        if (updatedEventData) _updateLocalEventLists(updatedEventData);
        notificationStore.showNotification({ message: "Team votes submitted!", type: 'success' });
    } catch (err) {
        await _handleOpError("submitting team votes", err, payload.eventId);
    } finally {
        isLoading.value = false;
    }
  }

  async function submitIndividualWinnerVote(payload: { eventId: string; votes: { criteria: Record<string, string> } }) {
    actionError.value = null;
    if (!auth.isAuthenticated.value || !studentProfileStore.studentId) {
      await _handleOpError("submitting individual winner vote", new Error("User not authenticated."), payload.eventId);
      return;
    }
    const studentId = studentProfileStore.studentId!;
    isLoading.value = true;
    try {
      // Service function now contains all validation and Firestore logic
      await submitIndividualWinnerVoteService(payload.eventId, studentId, payload.votes);
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

  async function submitOrganizationRating(payload: { eventId: string; score: number; feedback?: string | null }) {
    actionError.value = null;
    if (!auth.isAuthenticated.value || !studentProfileStore.studentId) {
      await _handleOpError("submitting organization rating", new Error("User not authenticated."), payload.eventId);
      return;
    }
    isLoading.value = true;
    try {
      // The service function now expects the user ID to create a map-based entry
      await submitOrganizationRatingService({ ...payload, userId: studentProfileStore.studentId });

      // Optimistically update the local state to reflect the change
      const eventToUpdate = viewedEventDetails.value;
      if (eventToUpdate) {
        if (!eventToUpdate.organizerRatings) {
          eventToUpdate.organizerRatings = {};
        }
        // This is a client-side representation, so we use a client timestamp for immediate feedback.
        // The server will have the authoritative serverTimestamp.
        eventToUpdate.organizerRatings[studentProfileStore.studentId] = {
          userId: studentProfileStore.studentId,
          rating: payload.score,
          feedback: payload.feedback || '',
          ratedAt: Timestamp.now() // Use Timestamp instead of Date for consistency
        };
        _updateLocalEventLists(eventToUpdate);
      }
      notificationStore.showNotification({
        message: 'Organization rating submitted successfully!',
        type: 'success',
      });
    } catch (err) {
      await _handleOpError('submitting organization rating', err, payload.eventId);
    } finally {
      isLoading.value = false;
    }
  }

  async function toggleVotingOpen({ eventId, open }: { eventId: string; open: boolean }) {
    actionError.value = null;
    isLoading.value = true;
    try {
      if (!studentProfileStore.currentStudent) throw new Error("User not authenticated or profile not loaded for voting toggle.");
      const currentUser: UserData = {
        ...studentProfileStore.currentStudent,
        photoURL: studentProfileStore.currentStudent.photoURL || null
      };
      await toggleVotingStatusService(eventId, open, currentUser);
      const updatedEventData = await fetchSingleEventForStudentService(eventId, studentProfileStore.studentId);
      if (updatedEventData) _updateLocalEventLists(updatedEventData);
      notificationStore.showNotification({ message: `Voting is now ${open ? 'OPEN' : 'CLOSED'}.`, type: 'success' });
    } catch (err) {
      await _handleOpError(`toggling voting to ${open ? 'open' : 'closed'}`, err, eventId);
    } finally {
      isLoading.value = false;
    }
  }

  async function checkDateConflict({ 
    startDate, 
    endDate, 
    excludeEventId 
  }: { 
    startDate: Date | Timestamp; 
    endDate: Date | Timestamp; 
    excludeEventId?: string 
  }): Promise<{ hasConflict: boolean; conflictingEventName: string | null; nextAvailableDate: string | null }> { // Updated return type
    try {
      // Convert to Timestamps if they are JS Dates
      const startTimestamp = startDate instanceof Date ? Timestamp.fromDate(startDate) : startDate;
      const endTimestamp = endDate instanceof Date ? Timestamp.fromDate(endDate) : endDate;

      // Call the service function with individual arguments
      const result = await checkDateConflictForRequest(
        startTimestamp,
        endTimestamp,
        excludeEventId
      );

      // Explicitly return the properties expected by the Promise type
      return {
        hasConflict: result.hasConflict,
        conflictingEventName: result.conflictingEventName,
        nextAvailableDate: result.nextAvailableDate
        // conflictingEvent from service result is not part of this store function's promised type, so it's fine.
      };
    } catch (error) {
      console.error("Error checking date conflict:", error);
      throw new Error(`Failed to check date conflict: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async function closeEventPermanently({ eventId }: { eventId: string }): Promise<void> {
    actionError.value = null;
    if (!auth.isAuthenticated.value || !studentProfileStore.currentStudent) {
      await _handleOpError("closing event permanently", new Error("User not authenticated or profile not loaded."), eventId);
      return;
    }
    
    isLoading.value = true;
    try {
      // Ensure photoURL is not undefined to match UserData type
      const currentUser: UserData = {
        ...studentProfileStore.currentStudent,
        photoURL: studentProfileStore.currentStudent.photoURL || null
      };
      // Service function contains all validation and Firestore logic
      // Call the service function
      const result = await closeEventAndAwardXPService(eventId, currentUser);
      
      // Refetch the event to update local state
      const updatedEventData = await fetchSingleEventForStudentService(eventId, studentProfileStore.studentId);
      if (updatedEventData) {
        _updateLocalEventLists(updatedEventData);
      }
      
      notificationStore.showNotification({ 
        message: result.message || "Event closed successfully! XP has been awarded.", 
        type: 'success' 
      });
    } catch (err) {
      await _handleOpError("closing event permanently", err, eventId);
    } finally {
      isLoading.value = false;
    }
  }

  async function autoGenerateTeams(payload: { eventId: string; studentUids: string[]; minMembers: number; maxMembers: number }): Promise<void> {
    actionError.value = null;
    if (!auth.isAuthenticated.value || !studentProfileStore.studentId) {
      await _handleOpError("auto-generating teams", new Error("User not authenticated or profile not loaded."), payload.eventId);
      return;
    }
    
    isLoading.value = true;
    try {
      const studentsToAssign = payload.studentUids.map(uid => ({ uid }));
      
      const newTeams = await autoGenerateEventTeamsService(
        payload.eventId, 
        studentsToAssign, 
        payload.minMembers, 
        payload.maxMembers
      );
      
      const updatedEventData = await fetchSingleEventForStudentService(payload.eventId, studentProfileStore.studentId);
      if (updatedEventData) {
        _updateLocalEventLists(updatedEventData);
      }
      
      notificationStore.showNotification({ 
        message: `Teams auto-generated successfully! (${newTeams.length} teams created)`, 
        type: 'success' 
      });
    } catch (err) {
      await _handleOpError("auto-generating teams", err, payload.eventId);
    } finally {
      isLoading.value = false;
    }
  }

  async function checkExistingPendingRequest(): Promise<boolean> {
    if (!studentProfileStore.studentId) {
      console.warn("checkExistingPendingRequest called but user is not logged in.");
      return false;
    }
    try {
      return await hasPendingRequest(studentProfileStore.studentId);
    } catch (err) {
      await _handleOpError("checking for existing pending request", err);
      return false; // Assume no request on error to avoid blocking user.
    }
  }

  /**
   * Clear all error states (actionError, fetchError)
   */
  function clearError(): void {
    actionError.value = null;
    fetchError.value = null;
  }
  
  return {
    events, viewedEventDetails, myEventRequests, isLoading, actionError, fetchError,
    allPubliclyViewableEvents, userSubmittedEvents, userParticipatingEvents, userWaitlistedEvents,
    getEventById, currentEventDetails, upcomingEvents, activeEvents, pastEvents,
    fetchEvents, fetchMyEventRequests, fetchEventDetails,
    requestNewEvent, editMyEventRequest, updateEventStatus,
    deleteEventRequest,
    joinEvent, leaveEvent, submitProject,
    submitTeamCriteriaVote, submitIndividualWinnerVote, submitManualWinnerSelection, submitOrganizationRating,
    toggleVotingOpen,
    checkDateConflict,
    checkExistingPendingRequest,
    closeEventPermanently, autoGenerateTeams,
    clearError
  };
});