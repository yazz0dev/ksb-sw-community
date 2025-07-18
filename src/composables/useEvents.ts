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
    try {
      await eventStore.fetchEvents();
      return eventStore.allPubliclyViewableEvents;
    } catch (error) {
      console.error('Error fetching public events:', error);
      return []; // Return empty array on error
    }
  };

  /**
   * Fetches event requests made by the current student via the store.
   */
  const fetchUserRequests = async (): Promise<Event[]> => {
    try {
      await eventStore.fetchMyEventRequests();
      return eventStore.myEventRequests;
    } catch (error) {
      console.error('Error fetching user requests:', error);
      return []; // Return empty array on error
    }
  };

  /**
   * Fetches a single event by ID via the store.
   * @param eventId Event ID
   */
  const fetchEventById = async (eventId: string): Promise<Event | null> => {
    try {
      return await eventStore.fetchEventDetails(eventId);
    } catch (error) {
      console.error('Error fetching event by ID:', error);
      return null;
    }
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
  const pastEvents = computed(() => eventStore.pastEvents);

  return {
    events,
    currentEvent,
    myRequests,
    isLoading,
    error,
    upcomingEvents,
    pastEvents,
    fetchPublicEvents,
    fetchUserRequests,
    fetchEventById,
    submitProject
  };
}
