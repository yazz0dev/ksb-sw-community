// src/store/studentEventStore.ts
import { defineStore } from 'pinia';
import { ref, computed, type Ref } from 'vue';
import {
  doc, getDoc, updateDoc, collection, getDocs, query, where, orderBy, Timestamp, addDoc, arrayUnion, arrayRemove, deleteField
} from 'firebase/firestore';
import { db } from '@/firebase';
import { Event, EventStatus, EventFormData, Team, Submission, EventCriterion, EventLifecycleTimestamps } from '@/types/event';
import { EventFormat } from '@/types/event';
import { useStudentProfileStore } from './studentProfileStore';
import { useStudentNotificationStore } from './studentNotificationStore';
import { useStudentAppStore } from './studentAppStore';
import { mapEventDataToFirestore, type MappedEventForFirestore } from '@/utils/eventDataMapper';
import { toAppTimezone } from '@/utils/dateTime';
import { deepClone, isEmpty } from '@/utils/helpers';
import { Interval } from 'luxon'; // For date range overlap checks

// --- Constants ---
const now = () => Timestamp.now(); // Helper for Firestore Timestamps

// --- Helper for Sorting Events ---
function compareEventsForSort(a: Event, b: Event): number {
    const statusOrder: Record<string, number> = {
        [EventStatus.InProgress]: 1, [EventStatus.Approved]: 2, [EventStatus.Pending]: 3,
        [EventStatus.Completed]: 4, [EventStatus.Rejected]: 5, [EventStatus.Cancelled]: 6,
        [EventStatus.Closed]: 7,
    };
    const orderA = statusOrder[a.status] ?? 99;
    const orderB = statusOrder[b.status] ?? 99;
    if (orderA !== orderB) return orderA - orderB;

    const nowDate = toAppTimezone(new Date())!;
    const getDateValue = (dateField: Timestamp | Date | string | null | undefined, fallbackDate?: Timestamp | Date | string | null | undefined): number => {
        let dt = toAppTimezone(dateField);
        if (!dt || !dt.isValid) dt = toAppTimezone(fallbackDate);
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
        else if (a.status === EventStatus.Cancelled) timeA = getDateValue(a.lastUpdatedAt); // No dedicated cancelledAt
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

export const useStudentEventStore = defineStore('studentEvents', () => {
  // --- State ---
  const events = ref<Event[]>([]);
  const viewedEventDetails = ref<Event | null>(null);
  const myEventRequests = ref<Event[]>([]);
  const isLoading = ref<boolean>(false);
  const actionError = ref<string | null>(null); // Specific for errors from actions
  const fetchError = ref<string | null>(null);  // Specific for errors from fetching

  const studentProfileStore = useStudentProfileStore();
  const notificationStore = useStudentNotificationStore();
  const appStore = useStudentAppStore();


  // --- Getters ---
  const allPubliclyViewableEvents = computed(() =>
    events.value.filter(e =>
        [EventStatus.Approved, EventStatus.InProgress, EventStatus.Completed, EventStatus.Closed].includes(e.status)
    ).sort(compareEventsForSort)
  );

  const getEventById = (eventId: string): Event | undefined => {
    return events.value.find(e => e.id === eventId) ||
           myEventRequests.value.find(e => e.id === eventId) ||
           (viewedEventDetails.value?.id === eventId ? viewedEventDetails.value : undefined);
  };

  const upcomingEvents = computed(() =>
    allPubliclyViewableEvents.value.filter(e => e.status === EventStatus.Approved && toAppTimezone(e.details.date.start)! > toAppTimezone(new Date())!)
  );
  const activeEvents = computed(() =>
    allPubliclyViewableEvents.value.filter(e => e.status === EventStatus.InProgress)
  );
  const pastEvents = computed(() => // Combines Completed and Closed for student view
    allPubliclyViewableEvents.value.filter(e => [EventStatus.Completed, EventStatus.Closed].includes(e.status))
  );


  // --- Internal Actions ---
  function _updateLocalEventLists(eventData: Partial<Event> & { id: string }) {
    const updateList = (list: Ref<Event[]>) => {
        const index = list.value.findIndex(e => e.id === eventData.id);
        const existingEvent = index !== -1 ? list.value[index] : ({} as Partial<Event>);

        const mergedLifecycleTimestamps = eventData.lifecycleTimestamps
            ? { ...(existingEvent.lifecycleTimestamps || {}), ...eventData.lifecycleTimestamps }
            : existingEvent.lifecycleTimestamps;

        if (eventData.lifecycleTimestamps) {
            for (const key in eventData.lifecycleTimestamps) {
                if (eventData.lifecycleTimestamps[key as keyof EventLifecycleTimestamps] === null ||
                    (eventData.lifecycleTimestamps[key as keyof EventLifecycleTimestamps] as any)?._methodName === 'delete') {
                    if (mergedLifecycleTimestamps) delete mergedLifecycleTimestamps[key as keyof EventLifecycleTimestamps];
                }
            }
        }
        const newEventData = { ...eventData }; // Clone to avoid direct mutation issues if eventData is reactive
        const fullEventData = {
            ...existingEvent,
            ...deepClone(newEventData),
            lifecycleTimestamps: isEmpty(mergedLifecycleTimestamps) ? undefined : mergedLifecycleTimestamps
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
      viewedEventDetails.value = {
          ...(viewedEventDetails.value as Event),
          ...deepClone(eventData),
          lifecycleTimestamps: isEmpty(mergedLifecycleTimestamps) ? undefined : mergedLifecycleTimestamps
      } as Event;
    }
  }

  async function _handleOpError(operation: string, err: unknown, eventId?: string): Promise<void> {
    const message = err instanceof Error ? err.message : `An unknown error occurred during ${operation}.`;
    actionError.value = message; // Use actionError for operation failures
    console.error(`StudentEventStore Operation Error (${operation})${eventId ? ` for event ${eventId}` : ''}:`, err);
    notificationStore.showNotification({ message, type: 'error' });
    // Do not throw here, let the calling action handle the return based on success/failure
  }

  async function _handleFetchError(operation: string, err: unknown): Promise<void> {
    const message = err instanceof Error ? err.message : `An unknown error occurred during ${operation}.`;
    fetchError.value = message; // Use fetchError for data fetching failures
    console.error(`StudentEventStore Fetch Error (${operation}):`, err);
    // Notification can be shown by the component observing fetchError or here
    // notificationStore.showNotification({ message, type: 'error' });
  }


  // --- Public Actions ---

  // Fetching
  async function fetchPublicEvents() {
    isLoading.value = true;
    fetchError.value = null;
    try {
        const q = query(
            collection(db, "events"),
            where('status', 'in', [EventStatus.Approved, EventStatus.InProgress, EventStatus.Completed, EventStatus.Closed]),
            orderBy('details.date.start', 'desc')
        );
        const snapshot = await getDocs(q);
        events.value = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as Event)).sort(compareEventsForSort);
    } catch (err) {
      await _handleFetchError("fetching public events", err);
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
      const q = query(
        collection(db, "events"),
        where('requestedBy', '==', studentProfileStore.studentId),
        where('status', 'in', [EventStatus.Pending, EventStatus.Rejected]),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      myEventRequests.value = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as Event)).sort(compareEventsForSort);
    } catch (err) {
      await _handleFetchError("fetching my event requests", err);
      myEventRequests.value = [];
    } finally {
      isLoading.value = false;
    }
  }

  async function fetchEventDetailsForStudent(eventId: string): Promise<Event | null> {
    isLoading.value = true;
    fetchError.value = null;
    viewedEventDetails.value = null;
    try {
      const eventRef = doc(db, 'events', eventId);
      const docSnap = await getDoc(eventRef);
      if (!docSnap.exists()) {
        notificationStore.showNotification({ message: `Event (ID: ${eventId}) not found.`, type: 'warning' });
        return null;
      }
      const eventData = { id: docSnap.id, ...docSnap.data() } as Event;
      const currentStudentId = studentProfileStore.studentId;
      const isPubliclyViewable = [EventStatus.Approved, EventStatus.InProgress, EventStatus.Completed, EventStatus.Closed].includes(eventData.status);
      const isMyRequest = eventData.requestedBy === currentStudentId && [EventStatus.Pending, EventStatus.Rejected].includes(eventData.status);

      if (isPubliclyViewable || isMyRequest) {
          viewedEventDetails.value = deepClone(eventData);
          _updateLocalEventLists(eventData);
          return viewedEventDetails.value;
      } else {
          throw new Error("You do not have permission to view this event's details.");
      }
    } catch (err) {
      await _handleFetchError("fetching event details for student", err); // Use fetchError
      notificationStore.showNotification({ message: actionError.value || "Failed to load event details.", type: 'error' });
      return null;
    } finally {
      isLoading.value = false;
    }
  }

  // Lifecycle (Student initiated)
  async function requestNewEvent(formData: EventFormData): Promise<string | null> {
    if (!studentProfileStore.isAuthenticated || !studentProfileStore.studentId) {
      notificationStore.showNotification({ message: "You must be logged in to request an event.", type: 'error' });
      return null;
    }
    const studentId = studentProfileStore.studentId;
    actionError.value = null; // Clear previous action error

    // Validation: Check for existing PENDING request by the same user
    const q = query(collection(db, "events"), where('requestedBy', '==', studentId), where('status', '==', EventStatus.Pending));
    const existingPendingSnapshot = await getDocs(q);
    if (!existingPendingSnapshot.empty) {
        notificationStore.showNotification({ message: "You already have a pending event request. Please wait for it to be reviewed.", type: 'warning', duration: 7000 });
        return null;
    }

    // Validation: Date conflict check
    if (formData.details.date.start && formData.details.date.end) {
        const checkStartLuxon = toAppTimezone(formData.details.date.start)?.startOf('day');
        const checkEndLuxon = toAppTimezone(formData.details.date.end)?.startOf('day');
        if (!checkStartLuxon?.isValid || !checkEndLuxon?.isValid || checkEndLuxon < checkStartLuxon) {
            notificationStore.showNotification({ message: "Invalid event dates provided.", type: 'error'}); return null;
        }
        const conflictQuery = query(collection(db, 'events'), where('status', 'in', [EventStatus.Approved, EventStatus.InProgress]));
        const conflictSnapshot = await getDocs(conflictQuery);
        for (const docSnap of conflictSnapshot.docs) {
            const event = docSnap.data() as Event;
            const eventStartLuxon = toAppTimezone(event.details?.date?.start)?.startOf('day');
            const eventEndLuxon = toAppTimezone(event.details?.date?.end)?.startOf('day');
            if (eventStartLuxon?.isValid && eventEndLuxon?.isValid) {
                const requestedInterval = Interval.fromDateTimes(checkStartLuxon, checkEndLuxon.endOf('day'));
                const existingEventInterval = Interval.fromDateTimes(eventStartLuxon, eventEndLuxon.endOf('day'));
                if (requestedInterval.overlaps(existingEventInterval)) {
                    notificationStore.showNotification({ message: `Chosen dates conflict with "${event.details.eventName || 'an existing event'}". Please select different dates.`, type: 'error', duration: 7000 });
                    return null;
                }
            }
        }
    } else {
        notificationStore.showNotification({ message: "Event start and end dates are required.", type: 'error'}); return null;
    }


    isLoading.value = true;
    try {
      const mappedEventData = mapEventDataToFirestore(formData, true);
      const dataToSubmit: Partial<Event> = {
        ...mappedEventData,
        requestedBy: studentId,
        status: EventStatus.Pending,
        votingOpen: false,
        organizerRatings: [],
        submissions: [],
        winners: {},
        bestPerformerSelections: {},
        createdAt: mappedEventData.createdAt || now(), // Ensure createdAt
        lastUpdatedAt: mappedEventData.lastUpdatedAt || now(), // Ensure lastUpdatedAt
      };
      if (dataToSubmit.details && !dataToSubmit.details.organizers?.includes(studentId)) {
          dataToSubmit.details.organizers = [studentId, ...(dataToSubmit.details.organizers || [])];
      }

      const docRef = await addDoc(collection(db, "events"), dataToSubmit);
      const newEvent = { id: docRef.id, ...dataToSubmit } as Event;
      _updateLocalEventLists(newEvent);
      notificationStore.showNotification({ message: "Event request submitted successfully!", type: 'success' });
      return docRef.id;
    } catch (err) {
      await _handleOpError("requesting new event", err);
      return null;
    } finally {
      isLoading.value = false;
    }
  }

  async function editMyEventRequest(eventId: string, formData: EventFormData): Promise<boolean> {
    if (!studentProfileStore.isAuthenticated || !studentProfileStore.studentId) {
      notificationStore.showNotification({ message: "Authentication required.", type: 'error' }); return false;
    }
    const studentId = studentProfileStore.studentId;
    const eventRef = doc(db, 'events', eventId);
    isLoading.value = true; actionError.value = null;

    try {
      const eventSnap = await getDoc(eventRef);
      if (!eventSnap.exists()) throw new Error("Event request not found.");
      const currentEvent = eventSnap.data() as Event;

      if (currentEvent.requestedBy !== studentId) throw new Error("You can only edit your own requests.");
      if (currentEvent.status !== EventStatus.Pending) throw new Error(`Cannot edit request with status: ${currentEvent.status}.`);

      // Date conflict check for editing
        if (formData.details.date.start && formData.details.date.end) {
            const checkStartLuxon = toAppTimezone(formData.details.date.start)?.startOf('day');
            const checkEndLuxon = toAppTimezone(formData.details.date.end)?.startOf('day');
            if (!checkStartLuxon?.isValid || !checkEndLuxon?.isValid || checkEndLuxon < checkStartLuxon) {
                notificationStore.showNotification({ message: "Invalid event dates provided.", type: 'error'}); return false;
            }
            const conflictQuery = query(collection(db, 'events'), where('status', 'in', [EventStatus.Approved, EventStatus.InProgress]));
            const conflictSnapshot = await getDocs(conflictQuery);
            for (const docSnap of conflictSnapshot.docs) {
                 if (docSnap.id === eventId) continue; // Exclude current event
                const event = docSnap.data() as Event;
                const eventStartLuxon = toAppTimezone(event.details?.date?.start)?.startOf('day');
                const eventEndLuxon = toAppTimezone(event.details?.date?.end)?.startOf('day');
                if (eventStartLuxon?.isValid && eventEndLuxon?.isValid) {
                    const requestedInterval = Interval.fromDateTimes(checkStartLuxon, checkEndLuxon.endOf('day'));
                    const existingEventInterval = Interval.fromDateTimes(eventStartLuxon, eventEndLuxon.endOf('day'));
                    if (requestedInterval.overlaps(existingEventInterval)) {
                        notificationStore.showNotification({ message: `Chosen dates conflict with "${event.details.eventName || 'an existing event'}". Please select different dates.`, type: 'error', duration: 7000 });
                        return false;
                    }
                }
            }
        } else {
            notificationStore.showNotification({ message: "Event start and end dates are required.", type: 'error'}); return false;
        }

      const updatesFromForm = mapEventDataToFirestore(formData, false);
      const updates: Partial<MappedEventForFirestore> = {
          details: updatesFromForm.details, // Student can update all details
          criteria: updatesFromForm.criteria, // Student can update criteria
          teams: updatesFromForm.teams,       // Student can update teams
          lastUpdatedAt: now()
      };
      // Fields student cannot change when editing their PENDING request
      delete updates.status;
      delete updates.requestedBy;
      // Lifecycle timestamps are not managed by student edit
      delete updates.lifecycleTimestamps;
      delete updates.closedAt;


      await updateDoc(eventRef, updates);
      // For local update, merge formData with existing event data carefully
      const updatedLocalEvent = { ...currentEvent, id: eventId, ...deepClone(formData), lastUpdatedAt: updates.lastUpdatedAt } as Event;
      _updateLocalEventLists(updatedLocalEvent);
      notificationStore.showNotification({ message: "Event request updated successfully.", type: 'success' });
      return true;
    } catch (err) {
      await _handleOpError("editing my event request", err, eventId);
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  // Participation
  async function joinEvent(eventId: string): Promise<boolean> {
    if (!studentProfileStore.isAuthenticated || !studentProfileStore.studentId) {
        notificationStore.showNotification({ message: "You must be logged in to join events.", type: 'error'}); return false;
    }
    const studentId = studentProfileStore.studentId;
    // if (await appStore.tryQueueAction({ type: 'events/joinEvent', payload: { eventId, studentId } })) return true;

    const eventRef = doc(db, 'events', eventId);
    isLoading.value = true; actionError.value = null;
    try {
        const eventSnap = await getDoc(eventRef);
        if (!eventSnap.exists()) throw new Error("Event not found.");
        const eventData = eventSnap.data() as Event;

        if (![EventStatus.Approved, EventStatus.InProgress].includes(eventData.status as EventStatus)) {
            throw new Error(`Cannot join event with status: ${eventData.status}`);
        }
        if (eventData.details.format === EventFormat.Team) {
            throw new Error("To join a team event, find and join a specific team or ask an organizer.");
        }
        if (eventData.participants?.includes(studentId)) {
            notificationStore.showNotification({ message: "You are already participating in this event.", type: 'info'}); return true;
        }
        if (eventData.details.organizers?.includes(studentId)) {
             throw new Error("Organizers are automatically part of the event.");
        }

        const updates = { participants: arrayUnion(studentId), lastUpdatedAt: now() };
        await updateDoc(eventRef, updates);
        _updateLocalEventLists({ id: eventId, participants: [...(eventData.participants || []), studentId], lastUpdatedAt: updates.lastUpdatedAt } as Partial<Event> & {id: string});
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
    const studentId = studentProfileStore.studentId;
    // if (await appStore.tryQueueAction({ type: 'events/leaveEvent', payload: { eventId, studentId } })) return true;

    const eventRef = doc(db, 'events', eventId);
    isLoading.value = true; actionError.value = null;
    try {
        const eventSnap = await getDoc(eventRef);
        if (!eventSnap.exists()) throw new Error("Event not found.");
        const eventData = eventSnap.data() as Event;

        if ([EventStatus.Completed, EventStatus.Cancelled, EventStatus.Closed].includes(eventData.status as EventStatus)) {
            throw new Error(`Cannot leave event with status: ${eventData.status}`);
        }
        if (eventData.details.organizers?.includes(studentId)) {
            throw new Error("Organizers cannot leave the event via this action.");
        }

        const updates: Partial<MappedEventForFirestore> = { lastUpdatedAt: now() };
        let userFoundAndRemoved = false;
        let newLocalParticipants = [...(eventData.participants || [])];
        let newLocalTeams = eventData.teams ? deepClone(eventData.teams) : [];
        let newLocalTeamMemberFlatList = eventData.teamMemberFlatList ? [...eventData.teamMemberFlatList] : [];


        if (eventData.details.format !== EventFormat.Team && eventData.participants?.includes(studentId)) {
            updates.participants = arrayRemove(studentId) as any;
            userFoundAndRemoved = true;
            newLocalParticipants = newLocalParticipants.filter(p => p !== studentId);
        } else if (eventData.details.format === EventFormat.Team && eventData.teams) {
            newLocalTeams = newLocalTeams.map(team => {
                if (team.members.includes(studentId)) {
                    userFoundAndRemoved = true;
                    team.members = team.members.filter(m => m !== studentId);
                    if (team.teamLead === studentId) {
                        team.teamLead = team.members.length > 0 ? team.members[0] : '';
                    }
                }
                return team;
            }).filter(team => team.members.length > 0); // Keep teams with members

            if (userFoundAndRemoved) {
                updates.teams = newLocalTeams;
                newLocalTeamMemberFlatList = [...new Set(newLocalTeams.flatMap(team => team.members).filter(Boolean))];
                updates.teamMemberFlatList = newLocalTeamMemberFlatList;
            }
        }

        if (!userFoundAndRemoved) throw new Error("You are not currently registered for this event or team.");

        await updateDoc(eventRef, updates);
        _updateLocalEventLists({
            id: eventId,
            participants: updates.participants !== undefined ? newLocalParticipants : undefined,
            teams: updates.teams !== undefined ? newLocalTeams : undefined,
            teamMemberFlatList: updates.teamMemberFlatList !== undefined ? newLocalTeamMemberFlatList : undefined,
            lastUpdatedAt: updates.lastUpdatedAt
        } as Partial<Event> & {id: string});

        notificationStore.showNotification({ message: "Successfully left the event.", type: 'success' });
        return true;
    } catch (err) {
        await _handleOpError("leaving event", err, eventId);
        return false;
    } finally {
        isLoading.value = false;
    }
  }

  // Submissions
  async function submitProject(eventId: string, submissionData: Omit<Submission, 'submittedBy' | 'submittedAt' | 'teamName' | 'participantId'>) {
    if (!studentProfileStore.isAuthenticated || !studentProfileStore.studentId) {
        notificationStore.showNotification({ message: "You must be logged in.", type: 'error'}); return;
    }
    const studentId = studentProfileStore.studentId;
    // if (await appStore.tryQueueAction({ type: 'events/submitProject', payload: { eventId, studentId, submissionData } })) return;

    const eventRef = doc(db, 'events', eventId);
    isLoading.value = true; actionError.value = null;
    try {
        const eventSnap = await getDoc(eventRef);
        if (!eventSnap.exists()) throw new Error("Event not found.");
        const eventData = eventSnap.data() as Event;

        if (eventData.status !== EventStatus.InProgress) throw new Error("Submissions only for 'In Progress' events.");
        if (eventData.details.allowProjectSubmission === false) throw new Error("Submissions not allowed for this event.");

        const newSubmission: Submission = {
            ...submissionData,
            submittedBy: studentId,
            submittedAt: now(),
        };
        if (eventData.details.format === EventFormat.Team) {
            const userTeam = eventData.teams?.find(t => t.members.includes(studentId));
            if (!userTeam) throw new Error("You are not part of a team in this event.");
            newSubmission.teamName = userTeam.teamName;
        } else {
            if (!eventData.participants?.includes(studentId)) throw new Error("You are not a participant.");
            newSubmission.participantId = studentId;
        }
        const existingSubmissions = eventData.submissions || [];
        const isDuplicate = existingSubmissions.some(s =>
            s.projectName.toLowerCase() === newSubmission.projectName.toLowerCase() &&
            ((s.teamName && s.teamName === newSubmission.teamName) || (s.participantId && s.participantId === newSubmission.participantId))
        );
        if (isDuplicate) throw new Error(`Project "${newSubmission.projectName}" already submitted.`);

        const updates = { submissions: arrayUnion(newSubmission), lastUpdatedAt: now() };
        await updateDoc(eventRef, updates as any); // Cast for arrayUnion
        _updateLocalEventLists({ id: eventId, submissions: [...existingSubmissions, newSubmission], lastUpdatedAt: updates.lastUpdatedAt } as Partial<Event> & {id: string});
        notificationStore.showNotification({ message: "Project submitted successfully!", type: 'success' });
    } catch (err) {
        await _handleOpError("submitting project", err, eventId);
    } finally {
        isLoading.value = false;
    }
  }

  // Voting / Selections
  async function submitEventSelections(
    eventId: string,
    selections: { criteria?: Record<string, string>; bestPerformer?: string }
  ) {
    if (!studentProfileStore.isAuthenticated || !studentProfileStore.studentId) {
        notificationStore.showNotification({ message: "You must be logged in.", type: 'error'}); return;
    }
    const studentId = studentProfileStore.studentId;
    // if (await appStore.tryQueueAction({ type: 'events/submitSelections', payload: { eventId, studentId, selections } })) return;

    const eventRef = doc(db, 'events', eventId);
    isLoading.value = true; actionError.value = null;
    try {
        const eventSnap = await getDoc(eventRef);
        if (!eventSnap.exists()) throw new Error("Event not found.");
        const eventData = eventSnap.data() as Event;

        if (eventData.status !== EventStatus.Completed || eventData.votingOpen !== true) {
            throw new Error("Selections/Voting is not currently open.");
        }
        const isParticipant = (eventData.details.format === EventFormat.Team && eventData.teams?.some(t=>t.members.includes(studentId))) ||
                              (eventData.details.format !== EventFormat.Team && eventData.participants?.includes(studentId));
        if (!isParticipant) throw new Error("Only participants can submit selections.");

        const updates: Partial<MappedEventForFirestore> = { lastUpdatedAt: now() };
        let hasChanges = false;
        const currentCriteria = deepClone(eventData.criteria || []);
        const currentBestSelections = deepClone(eventData.bestPerformerSelections || {});

        if (selections.criteria && Array.isArray(currentCriteria)) {
            currentCriteria.forEach(criterion => {
                const selKey = String(criterion.constraintIndex);
                if (selections.criteria!.hasOwnProperty(selKey)) {
                    const selVal = selections.criteria![selKey];
                    if (eventData.details.format !== EventFormat.Team && selVal === studentId) {
                         throw new Error(`Self-vote for "${criterion.constraintLabel}" not allowed.`);
                    }
                    if (!criterion.selections) criterion.selections = {};
                    if (criterion.selections[studentId] !== selVal) {
                        criterion.selections[studentId] = selVal;
                        hasChanges = true;
                    }
                }
            });
            if(hasChanges) updates.criteria = currentCriteria;
        }

        if (eventData.details.format === EventFormat.Team && selections.hasOwnProperty('bestPerformer')) {
            const bpSel = selections.bestPerformer!;
            if (bpSel === studentId) throw new Error("Self-selection for Best Performer not allowed.");
            if (currentBestSelections[studentId] !== bpSel) {
                currentBestSelections[studentId] = bpSel;
                updates.bestPerformerSelections = currentBestSelections;
                hasChanges = true;
            }
        }

        if (!hasChanges) {
            notificationStore.showNotification({ message: "No changes in your selections.", type: 'info' });
            isLoading.value = false; return;
        }

        await updateDoc(eventRef, updates);
        _updateLocalEventLists({ id: eventId, ...updates } as Partial<Event> & {id: string});
        notificationStore.showNotification({ message: "Selections submitted!", type: 'success' });
    } catch (err) {
        await _handleOpError("submitting selections", err, eventId);
    } finally {
        isLoading.value = false;
    }
  }

  // Organizer Rating
  async function submitOrganizerRating(eventId: string, ratingScore: number, feedbackText?: string) {
     if (!studentProfileStore.isAuthenticated || !studentProfileStore.studentId) {
        notificationStore.showNotification({ message: "You must be logged in.", type: 'error'}); return;
    }
    const studentId = studentProfileStore.studentId;
    // if (await appStore.tryQueueAction({ type: 'events/rateOrganizer', payload: { eventId, studentId, ratingScore, feedbackText } })) return;

    const eventRef = doc(db, 'events', eventId);
    isLoading.value = true; actionError.value = null;
    try {
        const eventSnap = await getDoc(eventRef);
        if (!eventSnap.exists()) throw new Error("Event not found.");
        const eventData = eventSnap.data() as Event;

        if (eventData.status !== EventStatus.Completed && eventData.status !== EventStatus.Closed) {
            throw new Error("Can only rate organizers for completed/closed events.");
        }
        if (eventData.details.organizers?.includes(studentId)) throw new Error("Organizers cannot rate their own event.");
        const isParticipant = (eventData.participants?.includes(studentId) || eventData.teams?.some(t => t.members.includes(studentId)));
        if(!isParticipant) throw new Error("Only participants can rate organizers.");


        const newRatingEntry: OrganizerRating = { userId: studentId, rating: ratingScore, feedback: feedbackText?.trim() || undefined, ratedAt: now() };
        const existingRatings = eventData.organizerRatings || [];
        const userOldRatingIndex = existingRatings.findIndex(r => r.userId === studentId);
        let updatedRatings = userOldRatingIndex !== -1 ? [...existingRatings] : [...existingRatings, newRatingEntry];
        if(userOldRatingIndex !== -1) updatedRatings[userOldRatingIndex] = newRatingEntry;


        const updates = { organizerRatings: updatedRatings, lastUpdatedAt: now() };
        await updateDoc(eventRef, updates as any); // Cast for arrayUnion/arrayRemove like behavior
         _updateLocalEventLists({ id: eventId, organizerRatings: updatedRatings, lastUpdatedAt: updates.lastUpdatedAt } as Partial<Event> & {id: string});
        notificationStore.showNotification({ message: "Organizer rating submitted!", type: 'success' });
    } catch (err) {
        await _handleOpError("submitting organizer rating", err, eventId);
    } finally {
        isLoading.value = false;
    }
  }

  return {
    events, viewedEventDetails, myEventRequests, isLoading, actionError, fetchError,
    allPubliclyViewableEvents, getEventById, upcomingEvents, activeEvents, pastEvents,
    fetchPublicEvents, fetchMyEventRequests, fetchEventDetailsForStudent,
    requestNewEvent, editMyEventRequest,
    joinEvent, leaveEvent,
    submitProject,
    submitEventSelections,
    submitOrganizerRating,
  };
});