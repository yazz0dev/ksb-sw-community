import { computed } from 'vue';
import { useEventStore } from '@/stores/eventStore';
import type { Event, Submission } from '@/types/event';

export function useEvents() {
  const eventStore = useEventStore();

  // --- State (derived from eventStore) ---
  const events = computed(() => eventStore.allPubliclyViewableEvents);
  const currentEvent = computed(() => eventStore.currentEventDetails);
  const myRequests = computed(() => eventStore.myEventRequests);
  
  const isLoading = computed(() => eventStore.isLoading);
  const error = computed(() => eventStore.fetchError || eventStore.actionError);

  // --- Delegated Actions ---

  /**
   * Fetches publicly viewable events via the store.
   * The store handles caching and state updates.
   */
  const fetchPublicEvents = async (): Promise<Event[]> => {
    await eventStore.fetchEvents();
    return eventStore.allPubliclyViewableEvents;
  };

  /**
   * Fetches event requests made by the current student via the store.
   */
  const fetchUserRequests = async (): Promise<Event[]> => {
    await eventStore.fetchMyEventRequests();
    return eventStore.myEventRequests;
  };

  /**
   * Fetches a single event by ID via the store.
   * @param eventId Event ID
   */
  const fetchEventById = async (eventId: string): Promise<Event | null> => {
    return eventStore.fetchEventDetails(eventId);
  };

  /**
   * Submits a project to an event via the store.
   * @param eventId Event ID
   * @param submissionData Submission data (Omit some fields as per original composable)
   */
  const submitProject = async (
    eventId: string,
    submissionData: Omit<Submission, 'submittedBy' | 'submittedAt' | 'teamName' | 'participantId'>
  ): Promise<void> => {
    await eventStore.submitProject({ eventId, submissionData });
  };

  // --- Computed properties (can re-expose from store or create UI-specific ones) ---
  const upcomingEvents = computed(() => eventStore.upcomingEvents);
  const activeEvents = computed(() => eventStore.activeEvents);
  const pastEvents = computed(() => eventStore.pastEvents);

  return {
    events,
    currentEvent,
    myRequests,
    isLoading,
    error,
    upcomingEvents,
    activeEvents,
    pastEvents,
    fetchPublicEvents,
    fetchUserRequests,
    fetchEventById,
    submitProject
  };
}
