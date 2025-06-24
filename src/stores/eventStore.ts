// src/stores/eventStore.ts
import { defineStore } from 'pinia';
import { ref, computed, type Ref } from 'vue';
import type { Event, EventFormData, Submission } from '@/types/event';
import { EventStatus } from '@/types/event';
import { useProfileStore } from './profileStore';
import { useNotificationStore } from './notificationStore';
import { useAppStore } from './appStore';
import { compareEventsForSort } from '@/utils/eventUtils';
import { handleFirestoreError as formatFirestoreErrorUtil } from '@/utils/errorHandlers';

// Service Imports
import { createEventRequest, updateEventRequestInService } from '@/services/eventService/eventCreation';
import { updateEventStatusInFirestore, deleteEventRequestInFirestore } from '@/services/eventService/eventManagement';
import { fetchMyEventRequests as fetchMyEventRequestsService, fetchSingleEventForStudent, fetchPubliclyViewableEvents, hasPendingRequest } from '@/services/eventService/eventQueries';
import { joinEventByStudentInFirestore, leaveEventByStudentInFirestore, submitProject as submitProjectService } from '@/services/eventService/eventParticipation';
import { autoGenerateEventTeamsInFirestore } from '@/services/eventService/eventTeams';
import { submitOrganizationRatingInFirestore } from '@/services/eventService/eventVoting';

export const useEventStore = defineStore('studentEvents', () => {
  // --- State ---
  const events = ref<Event[]>([]);
  const viewedEventDetails = ref<Event | null>(null);
  const myEventRequests = ref<Event[]>([]);
  const isLoading = ref(false);
  const isSubmitting = ref(false); // Added for form submissions
  const actionError = ref<string | null>(null);
  const fetchError = ref<string | null>(null);

  // --- Dependencies ---
  const profileStore = useProfileStore();
  const notificationStore = useNotificationStore();
  const appStore = useAppStore();

  // --- Getters (Computed) ---
  const allPubliclyViewableEvents = computed(() => events.value);
  const currentEventDetails = computed(() => viewedEventDetails.value);
  const upcomingEvents = computed(() => events.value.filter(e => e.status === EventStatus.Approved && new Date((e.details.date.start as any)?.toDate() || e.details.date.start) > new Date()));
  const activeEvents = computed(() => events.value.filter(e => e.status === EventStatus.InProgress));
  const pastEvents = computed(() => events.value.filter(e => [EventStatus.Completed, EventStatus.Closed].includes(e.status as EventStatus)));

  // --- Internal Helpers ---
  function _updateLocalEvent(eventData: Event) {
    const updateList = (list: Ref<Event[]>) => {
      const index = list.value.findIndex(e => e.id === eventData.id);
      if (index !== -1) {
        list.value.splice(index, 1, { ...list.value[index], ...eventData });
      } else {
        list.value.push(eventData);
      }
      list.value.sort(compareEventsForSort);
    };

    if ([EventStatus.Approved, EventStatus.InProgress, EventStatus.Completed, EventStatus.Closed].includes(eventData.status as EventStatus)) {
      updateList(events);
    } else {
      events.value = events.value.filter(e => e.id !== eventData.id);
    }

    if (profileStore.studentId && eventData.requestedBy === profileStore.studentId && [EventStatus.Pending, EventStatus.Rejected].includes(eventData.status as EventStatus)) {
      updateList(myEventRequests);
    } else {
      myEventRequests.value = myEventRequests.value.filter(e => e.id !== eventData.id);
    }

    if (viewedEventDetails.value?.id === eventData.id) {
      viewedEventDetails.value = { ...viewedEventDetails.value, ...eventData };
    }
  }

  async function _handleOpError(operation: string, err: unknown): Promise<void> {
    const finalMessage = formatFirestoreErrorUtil(err, operation);
    actionError.value = finalMessage;
    notificationStore.showNotification({ message: finalMessage, type: 'error' });
  }

  // --- Public Actions ---

  async function fetchEvents() {
    isLoading.value = true;
    fetchError.value = null;
    try {
      events.value = await fetchPubliclyViewableEvents();
    } catch (err) {
      fetchError.value = formatFirestoreErrorUtil(err, "fetching all events");
    } finally {
      isLoading.value = false;
    }
  }

  async function fetchMyEventRequests() {
    const studentId = profileStore.studentId;
    if (!studentId) { myEventRequests.value = []; return; }
    isLoading.value = true;
    fetchError.value = null;
    try {
      myEventRequests.value = await fetchMyEventRequestsService(studentId);
    } catch (err) {
      fetchError.value = formatFirestoreErrorUtil(err, "fetching my event requests");
    } finally {
      isLoading.value = false;
    }
  }

  async function fetchEventDetails(eventId: string): Promise<Event | null> {
    isLoading.value = true;
    fetchError.value = null;
    try {
      const eventData = await fetchSingleEventForStudent(eventId, profileStore.studentId);
      if (eventData) {
        _updateLocalEvent(eventData);
        viewedEventDetails.value = eventData;
      }
      return eventData;
    } catch (err) {
      fetchError.value = formatFirestoreErrorUtil(err, `fetching event ${eventId}`);
      notificationStore.showNotification({ message: fetchError.value, type: 'error' });
      return null;
    } finally {
      isLoading.value = false;
    }
  }

  async function requestNewEvent(formData: EventFormData): Promise<string | null> {
    const studentId = profileStore.studentId;
    if (!studentId) {
      return _handleOpError("requesting new event", new Error("User not authenticated.")).then(() => null);
    }
    isSubmitting.value = true;
    try {
      const newEventId = await createEventRequest(formData, studentId);
      await fetchEventDetails(newEventId);
      notificationStore.showNotification({ message: 'Event request submitted successfully!', type: 'success' });
      return newEventId;
    } catch (err) {
      await _handleOpError('creating new event', err);
      return null;
    } finally {
      isSubmitting.value = false;
    }
  }

  async function editMyEventRequest(eventId: string, formData: EventFormData): Promise<boolean> {
    const studentId = profileStore.studentId;
    if (!studentId) {
      return _handleOpError("editing event request", new Error("User not authenticated.")).then(() => false);
    }
    isSubmitting.value = true;
    try {
      await updateEventRequestInService(eventId, formData, studentId);
      await fetchEventDetails(eventId);
      notificationStore.showNotification({ message: 'Event request updated successfully!', type: 'success' });
      return true;
    } catch (err) {
      await _handleOpError("editing my event request", err);
      return false;
    } finally {
      isSubmitting.value = false;
    }
  }

  async function deleteEventRequest(eventId: string): Promise<boolean> {
    const studentId = profileStore.studentId;
    if (!studentId) {
      return _handleOpError("deleting event request", new Error("User not authenticated.")).then(() => false);
    }
    isLoading.value = true;
    try {
      await deleteEventRequestInFirestore(eventId, studentId);
      myEventRequests.value = myEventRequests.value.filter(e => e.id !== eventId);
      events.value = events.value.filter(e => e.id !== eventId);
      if (viewedEventDetails.value?.id === eventId) viewedEventDetails.value = null;
      profileStore.removeUserRequestById(eventId);
      notificationStore.showNotification({ message: 'Event request deleted successfully!', type: 'success' });
      return true;
    } catch (err) {
      await _handleOpError("deleting event request", err);
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  async function updateEventStatus(payload: { eventId: string; newStatus: EventStatus; rejectionReason?: string }) {
    if (!profileStore.currentStudent) return _handleOpError("updating status", new Error("User not authenticated."));
    await updateEventStatusInFirestore(payload.eventId, payload.newStatus, profileStore.currentStudent, payload.rejectionReason);
    await fetchEventDetails(payload.eventId);
  }

  // --- Offline-Capable Actions ---

  async function _queueAction(actionName: string, payload: any) {
    actionError.value = null;
    const studentId = profileStore.studentId;
    if (!studentId) {
      return _handleOpError(actionName, new Error("User not authenticated."));
    }
    
    try {
      await appStore.tryQueueAction({
        type: `studentEvents/${actionName}`,
        payload: { ...payload, studentId } // Automatically add studentId to payload
      });
    } catch (err) {
      await _handleOpError(actionName, err);
    }
  }

  async function _executeAndRefresh(action: () => Promise<any>, eventId: string, successMessage: string) {
    try {
      await action();
      await fetchEventDetails(eventId);
      notificationStore.showNotification({ message: successMessage, type: 'success' });
    } catch (err) {
      // Error is handled by the calling queued action handler in appStore
      throw err;
    }
  }
  
  async function joinEvent(eventId: string) { await _queueAction('_joinEvent', { eventId }); }
  async function _joinEvent(payload: { eventId: string; studentId: string }) {
    await _executeAndRefresh(
      () => joinEventByStudentInFirestore(payload.eventId, payload.studentId),
      payload.eventId,
      "Successfully joined the event!"
    );
  }

  async function leaveEvent(eventId: string) { await _queueAction('_leaveEvent', { eventId }); }
  async function _leaveEvent(payload: { eventId: string; studentId: string }) {
    await _executeAndRefresh(
      () => leaveEventByStudentInFirestore(payload.eventId, payload.studentId),
      payload.eventId,
      "Successfully left the event."
    );
  }

  async function submitProject(payload: { eventId: string; submissionData: Omit<Submission, 'submittedBy' | 'submittedAt' | 'teamName' | 'participantId'> }) {
    await _queueAction('_submitProject', payload);
  }
  async function _submitProject(payload: { eventId: string; studentId: string; submissionData: any }) {
    await _executeAndRefresh(
      () => submitProjectService(payload.eventId, payload.studentId, payload.submissionData),
      payload.eventId,
      "Project submitted successfully!"
    );
  }

  async function submitOrganizationRating(payload: { eventId: string; score: number; feedback?: string | null }) {
    await _queueAction('_submitOrganizationRating', payload);
  }
  async function _submitOrganizationRating(payload: { eventId: string; studentId: string; score: number; feedback?: string | null }) {
    await _executeAndRefresh(
      () => submitOrganizationRatingInFirestore({
        eventId: payload.eventId,
        userId: payload.studentId,
        score: payload.score,
        feedback: payload.feedback ?? null
      }),
      payload.eventId,
      "Organizer rating submitted!"
    );
  }

  async function autoGenerateTeams(payload: { eventId: string; studentUids: string[]; minMembers: number; maxMembers: number }) {
    isLoading.value = true;
    try {
      await autoGenerateEventTeamsInFirestore(
        payload.eventId, 
        payload.studentUids.map(uid => ({ uid })), 
        payload.minMembers, 
        payload.maxMembers
      );
      await fetchEventDetails(payload.eventId);
      notificationStore.showNotification({ message: "Teams auto-generated successfully!", type: 'success' });
    } catch (err) {
      await _handleOpError("auto-generating teams", err);
    } finally {
      isLoading.value = false;
    }
  }
  
  async function checkExistingPendingRequest(): Promise<boolean> {
    if (!profileStore.studentId) return false;
    try {
      return await hasPendingRequest(profileStore.studentId);
    } catch (err) {
      await _handleOpError("checking for existing pending request", err);
      return false;
    }
  }

  function clearError() {
    actionError.value = null;
  }

  return {
    // State
    events,
    viewedEventDetails,
    myEventRequests,
    isLoading,
    isSubmitting,
    actionError,
    fetchError,

    // Getters
    allPubliclyViewableEvents,
    currentEventDetails,
    upcomingEvents,
    activeEvents,
    pastEvents,
    
    // Actions
    fetchEvents,
    fetchMyEventRequests,
    fetchEventDetails,
    requestNewEvent,
    editMyEventRequest,
    deleteEventRequest,
    updateEventStatus,
    joinEvent,
    leaveEvent,
    submitProject,
    autoGenerateTeams,
    submitOrganizationRating,
    checkExistingPendingRequest,
    clearError,

    // Internals exposed for offline queue processing
    _joinEvent,
    _leaveEvent,
    _submitProject,
    _submitOrganizationRating,
    // Add other actions here as needed, wrapping them in _queueAction if they can be offline
  };
});