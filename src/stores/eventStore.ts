// src/stores/studentEventStore.ts
import { defineStore } from 'pinia';
import { ref, computed, type Ref } from 'vue';
import { Timestamp } from 'firebase/firestore';
// Import Event as EventBaseData, as it likely represents the data structure without an 'id'.
// Removed unused Team and EventGalleryItem imports
import { type Event as EventBaseData, EventFormat, EventStatus, type EventFormData, type Submission } from '@/types/event';
import { useProfileStore } from './profileStore';
import { useNotificationStore } from './notificationStore';
import { useAuth } from '@/composables/useAuth';
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
import { 
  MIN_TEAM_MEMBERS, 
  MAX_TEAM_MEMBERS 
} from '@/utils/constants';


// Define the type that includes 'id', which will be primarily used within this store.
type EventWithId = EventBaseData & { id: string };

// Add createCompleteEvent function before the store definition
function createCompleteEvent(
  partialDataInput: Partial<EventWithId>, 
  existingEventInput?: EventWithId | undefined
): EventWithId {
  
  const idToUse = partialDataInput.id || existingEventInput?.id || '';

  // Extract data parts, removing 'id' property to handle EventBaseData separately
  const partialEventBaseData = partialDataInput ? (({ id: _id, ...rest }) => rest)(partialDataInput) : {};
  const existingEventBaseData = existingEventInput ? (({ id: _id, ...rest }) => rest)(existingEventInput) : undefined;

  // Construct the EventBaseData part
  const baseData = {
    // Include id property directly in baseData
    id: idToUse,
    // Provide comprehensive defaults for all fields in EventBaseData
    details: {
      eventName: '', 
      description: '', 
      format: EventFormat.Individual, 
      type: '',
      organizers: [], 
      date: { start: null, end: null }, 
      allowProjectSubmission: false,
      prize: null, // Default to null
      rules: null, // Default to null
      // Spread details from existingEventBaseData first, then from partialEventBaseData
      ...(existingEventBaseData?.details || {}),
      ...(partialEventBaseData.details || {}),
    },
    lastUpdatedAt: Timestamp.now(), // Default, will be overridden if present in spreads
    status: EventStatus.Pending,
    requestedBy: '',
    votingOpen: false,
    lifecycleTimestamps: {
      createdAt: Timestamp.now(), // Default, will be overridden if present in spreads
    },
    participants: [],
    submissions: [],
    criteria: [], 
    teams: [],    
    organizerRatings: {}, 
    winners: {},
    criteriaVotes: {},
    bestPerformerSelections: {},
    rejectionReason: null, // Default to null
    manuallySelectedBy: null, // Default to null
    gallery: null, // Initialize new gallery property
    teamMemberFlatList: [], // Default to empty array

    // Spread remaining properties from existingEventBaseData, then partialEventBaseData
    ...(existingEventBaseData || {}),
    ...partialEventBaseData,
  };

  // Ensure specific optional fields that should be null (if not provided explicitly by spreads) are correctly set to null.
  // This is important if the types are `Something | null` and not `Something | null | undefined`.
  baseData.details.prize = (baseData.details.prize === undefined) ? null : baseData.details.prize;
  baseData.details.rules = (baseData.details.rules === undefined) ? null : baseData.details.rules;
  baseData.rejectionReason = (baseData.rejectionReason === undefined) ? null : baseData.rejectionReason;
  baseData.manuallySelectedBy = (baseData.manuallySelectedBy === undefined) ? null : baseData.manuallySelectedBy;
  baseData.gallery = (baseData.gallery === undefined) ? null : baseData.gallery;
  baseData.lifecycleTimestamps = (baseData.lifecycleTimestamps === undefined) ? null : baseData.lifecycleTimestamps;
  
  // Ensure array/object fields that are not nullable are empty arrays/objects if not provided by spreads.
  baseData.participants = baseData.participants ?? [];
  baseData.submissions = baseData.submissions ?? [];
  baseData.criteria = baseData.criteria ?? [];
  baseData.teams = baseData.teams ?? [];
  baseData.organizerRatings = baseData.organizerRatings ?? {};
  baseData.winners = baseData.winners ?? {};
  baseData.criteriaVotes = baseData.criteriaVotes ?? {};
  baseData.bestPerformerSelections = baseData.bestPerformerSelections ?? {};
  baseData.teamMemberFlatList = baseData.teamMemberFlatList ?? [];

  // Ensure details.eventName is a non-empty string, defaulting from eventName if necessary
  if (!baseData.details.eventName || typeof baseData.details.eventName !== 'string' || baseData.details.eventName.trim() === '') {
    if (baseData.details.eventName && typeof baseData.details.eventName === 'string' && baseData.details.eventName.trim() !== '') {
      baseData.details.eventName = baseData.details.eventName.trim();
    } else {
      baseData.details.eventName = 'Untitled Event'; // Final fallback
    }
  }
  // Ensure eventName is also a string (it's required by EventDetails type)
  if (!baseData.details.eventName || typeof baseData.details.eventName !== 'string' || baseData.details.eventName.trim() === '') {
    baseData.details.eventName = baseData.details.eventName; // If eventName was empty, use the (now guaranteed) title
  }


  // Return the fully formed data with id
  return baseData as EventWithId;
}

export const useEventStore = defineStore('studentEvents', () => {
  // Refs (State) - Update to use EventWithId
  const events = ref<EventWithId[]>([]);
  const viewedEventDetails = ref<EventWithId | null>(null);
  const myEventRequests = ref<EventWithId[]>([]);
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

  const getEventById = (eventId: string): EventWithId | undefined => { // Updated return type
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
  function _updateLocalEventLists(eventData: EventWithId) { // Updated parameter type
    const updateList = (list: Ref<EventWithId[]>) => { // Updated list type
        const index = list.value.findIndex(e => e.id === eventData.id);
        const existingEvent = index !== -1 ? list.value[index] : null;
        // Ensure the spread results in EventWithId
        const updatedEvent: EventWithId = {
            ...(existingEvent || {} as EventWithId), // Cast to satisfy spread if existingEvent is null
            ...deepClone(eventData), // eventData is already EventWithId
            lastUpdatedAt: eventData.lastUpdatedAt || (existingEvent?.lastUpdatedAt || Timestamp.now())
        };

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
          ...(viewedEventDetails.value as EventWithId), // Ensure viewedEventDetails is treated as EventWithId
          ...deepClone(eventData), // eventData is EventWithId
          lastUpdatedAt: eventData.lastUpdatedAt || viewedEventDetails.value.lastUpdatedAt || Timestamp.now()
      };
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
        // Assuming fetchPubliclyViewableEventsService returns EventWithId[] or compatible
        events.value = fetchedEvents.sort(compareEventsForSort) as EventWithId[];
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
      // Assuming fetchMyEventRequestsService returns EventWithId[] or compatible
      myEventRequests.value = requests.sort(compareEventsForSort) as EventWithId[];
    } catch (err) {
      await _handleFetchError("fetching my event requests", err);
      myEventRequests.value = [];
    } finally {
      isLoading.value = false;
    }
  }

  async function fetchEventDetails(eventId: string): Promise<EventWithId | null> { // Updated return type
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
          
          // Assuming eventData from service is compatible with EventWithId
          viewedEventDetails.value = deepClone(eventData) as EventWithId;
          _updateLocalEventLists(viewedEventDetails.value);
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

      // Create a sanitized payload
      const payload = deepClone(formData);

      if (payload.details.format === EventFormat.Competition) {
        payload.criteria = [];
        payload.teams = [];
        // prize can exist for Competition
        // allowProjectSubmission is handled by RequestEventView watcher
      } else { // Not Competition (Team or Individual)
        payload.details.prize = null; // Changed from undefined to null
        // criteria can exist
        // allowProjectSubmission is true
        if (payload.details.format !== EventFormat.Team) { // Individual
          payload.teams = [];
        }
        // If Team, teams can exist
      }
      
      // Ensure organizers array includes the requestor if empty
      if (!payload.details.organizers || payload.details.organizers.length === 0) {
        payload.details.organizers = [studentId];
      } else if (!payload.details.organizers.includes(studentId)) {
         payload.details.organizers = [studentId, ...payload.details.organizers];
      }


      const newEventId = await createEventRequestService(payload, studentId);

      if (!newEventId) {
        throw new Error("Failed to create event request via service.");
      }

      // Create a complete Event object for local store using the ID from the service
      // We need to simulate the data that would have been written to Firestore to pass to createCompleteEvent
      // or fetch the event data using the newEventId. Fetching is safer for consistency.
      // For now, let's try to construct it, assuming service sets reasonable defaults.
      
      // Construct a partial event data based on formData and known defaults set by the service
      // to pass to createCompleteEvent. This part might need refinement based on what createCompleteEvent needs
      // and what the service guarantees.
      const eventDataForStoreCreation: Partial<EventWithId> = { // Use Partial<EventWithId>
        id: newEventId,
        details: {
            // title is now handled robustly by createCompleteEvent,
            // it will use title from payload.details if present and valid,
            // otherwise default to eventName from payload.details, or "Untitled Event".
            // Spread details from payload (EventFormData)
            ...payload.details, 
            // Explicitly set dates as Timestamps, overriding from payload if necessary
            date: {
                start: Timestamp.fromDate(startDateTime.toJSDate()),
                end: Timestamp.fromDate(endDateTime.toJSDate())
            },
            // Ensure optional fields align with EventBaseData['details']
            rules: payload.details.rules || null, 
            prize: payload.details.prize || null,
        },
        requestedBy: studentId,
        status: EventStatus.Pending, // Default status for new requests
        // criteria and teams come from payload (EventFormData)
        criteria: payload.criteria || [], 
        teams: payload.teams || [],
        rejectionReason: null, // Explicitly null for a new request
        // gallery will be defaulted to null by createCompleteEvent
        // Other fields like createdAt, lastUpdatedAt, participants, submissions, etc.,
        // will be handled by createCompleteEvent's defaults.
      };

      const newEventDataForStore: EventWithId = createCompleteEvent(eventDataForStoreCreation);
        
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
      // Use convertToISTDateTime instead of getISTTimestamp
      const startDate = formData.details.date.start ? convertToISTDateTime(formData.details.date.start) : null;
      const endDate = formData.details.date.end ? convertToISTDateTime(formData.details.date.end) : null;
      
      if (!startDate || !endDate) throw new Error('Event start and end dates are required.');
      // Luxon DateTime objects also have toMillis(), so this comparison remains valid.
      if (endDate.toMillis() < startDate.toMillis()) throw new Error('Event end date must be on or after start date.');
      
      const { hasConflict, conflictingEventName } = await checkDateConflict({
        // Pass JS Date objects to checkDateConflict as it expects Date | Timestamp
        startDate: startDate.toJSDate(), 
        endDate: endDate.toJSDate(),
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

      // Create a sanitized payload
      const payload = deepClone(formData);
      if (payload.details.format === EventFormat.Competition) {
        payload.criteria = [];
        payload.teams = [];
        // prize can exist for Competition
      } else { // Not Competition (Team or Individual)
        payload.details.prize = null; // Changed from undefined to null
        if (payload.details.format !== EventFormat.Team) { // Individual
          payload.teams = [];
        }
      }
      
      // Ensure rejectionReason is explicitly null if not provided in formData,
      // especially if its type in EventFormData is `string | null | undefined`
      // and the target type in EventBaseData (via createCompleteEvent) expects `string | null`.
      if (payload.rejectionReason === undefined) {
        payload.rejectionReason = null;
      }
      
      // Ensure organizers array includes the requestor if empty, or adds if not present
      if (!payload.details.organizers || payload.details.organizers.length === 0) {
        payload.details.organizers = [currentStudentId];
      } else if (!payload.details.organizers.includes(currentStudentId)) {
         payload.details.organizers = [currentStudentId, ...payload.details.organizers];
      }

      await updateEventRequestInService(eventId, payload, currentStudentId);
      
      const updatedEvent = await fetchSingleEventForStudentService(eventId, currentStudentId); // Use currentStudentId
      if (updatedEvent) {
        _updateLocalEventLists(updatedEvent as EventWithId); // Added 'as EventWithId'
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
        const existingEvent = getEventById(eventId); // existingEvent is EventWithId | undefined
        // Pass id explicitly along with updatedFields (which should be Partial<EventBaseData>)
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
        if (updatedEventData) _updateLocalEventLists(updatedEventData as EventWithId); // Added 'as EventWithId'
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
        if (updatedEventData) _updateLocalEventLists(updatedEventData as EventWithId); // Added 'as EventWithId'
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
        if (updatedEventData) _updateLocalEventLists(updatedEventData as EventWithId); // Added 'as EventWithId'
        notificationStore.showNotification({ message: "Project submitted successfully!", type: 'success' });
    } catch (err) {
        await _handleOpError("submitting project", err, payload.eventId);
    } finally {
        isLoading.value = false;
    }
  }

  async function submitTeamCriteriaVote(payload: { 
    eventId: string; 
    votes: { 
      criteria: Record<string, string>; 
      bestPerformer?: string 
    } 
  }) {
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
        if (updatedEventData) _updateLocalEventLists(updatedEventData as EventWithId); // Added 'as EventWithId'
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
        if (updatedEventData) _updateLocalEventLists(updatedEventData as EventWithId); // Added 'as EventWithId'
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
        if (updatedEventData) _updateLocalEventLists(updatedEventData as EventWithId); // Added 'as EventWithId'
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
      // This directly uses submitOrganizationRatingInFirestore from eventVoting.ts
      await submitOrganizationRatingService({ 
        ...payload, 
        userId: studentProfileStore.studentId 
      });

      // Optimistically update the local state
      const eventToUpdate = viewedEventDetails.value;
      if (eventToUpdate) {
        if (!eventToUpdate.organizerRatings) {
          eventToUpdate.organizerRatings = {};
        }
        eventToUpdate.organizerRatings[studentProfileStore.studentId] = {
          userId: studentProfileStore.studentId,
          rating: payload.score,
          feedback: payload.feedback || '',
          ratedAt: Timestamp.now()
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
      if (updatedEventData) _updateLocalEventLists(updatedEventData as EventWithId); // Added 'as EventWithId'
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
        _updateLocalEventLists(updatedEventData as EventWithId); // Added 'as EventWithId'
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
      
      // Use payload's min/max but ensure they are within global constant bounds
      // The service function autoGenerateEventTeamsInFirestore will also apply these constants.
      // However, it's good practice to prepare the payload with sensible values.
      const minMembers = Math.max(payload.minMembers, MIN_TEAM_MEMBERS);
      const maxMembers = Math.min(payload.maxMembers, MAX_TEAM_MEMBERS);
      
      const newTeams = await autoGenerateEventTeamsService(
        payload.eventId, 
        studentsToAssign, 
        minMembers, // Pass the validated/constrained minMembers
        maxMembers  // Pass the validated/constrained maxMembers
      );
      
      const updatedEventData = await fetchSingleEventForStudentService(payload.eventId, studentProfileStore.studentId);
      if (updatedEventData) {
        _updateLocalEventLists(updatedEventData as EventWithId); // Added 'as EventWithId'
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