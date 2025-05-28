import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  Timestamp,
  updateDoc,
  arrayUnion,
  addDoc,
  setDoc
} from 'firebase/firestore';
import { db } from '@/firebase';
import { 
  Event, 
  EventStatus, 
  EventFormData, 
  Submission,
  EventFormat
} from '@/types/event';
import { mapEventDataToFirestore, mapFirestoreToEventData } from '@/utils/eventDataMapper';
import { StudentPortfolioProject } from '@/types/student';

const now = () => Timestamp.now();

const EVENTS_COLLECTION = 'events';

/**
 * Fetch publicly viewable events
 * @returns Promise that resolves with an array of events
 */
export const fetchPublicEvents = async (): Promise<Event[]> => {
  try {
    const q = query(
      collection(db, EVENTS_COLLECTION),
      where('status', 'in', [EventStatus.Approved, EventStatus.InProgress, EventStatus.Completed, EventStatus.Closed]),
      orderBy('details.date.start', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as Event));
  } catch (error) {
    console.error("Error fetching public events:", error);
    throw error;
  }
};

/**
 * Fetch event requests made by a student
 * @param studentId Student's UID
 * @returns Promise that resolves with an array of events
 */
export const fetchStudentEventRequests = async (studentId: string): Promise<Event[]> => {
  if (!studentId) return [];
  
  try {
    const q = query(
      collection(db, EVENTS_COLLECTION),
      where('requestedBy', '==', studentId),
      where('status', 'in', [EventStatus.Pending, EventStatus.Rejected]),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as Event));
  } catch (error) {
    console.error(`Error fetching event requests for ${studentId}:`, error);
    throw error;
  }
};

/**
 * Fetch details for a single event
 * @param eventId Event ID
 * @param currentStudentId Current student's UID for permission checks
 * @returns Promise that resolves with the event or null
 */
export const fetchEventDetails = async (eventId: string, currentStudentId: string | null): Promise<Event | null> => {
  if (!eventId) throw new Error('Event ID required for fetching details.');
  
  try {
    const eventRef = doc(db, EVENTS_COLLECTION, eventId);
    const eventSnap = await getDoc(eventRef);
    
    if (!eventSnap.exists()) {
      return null;
    }
    
    const eventData = { id: eventSnap.id, ...eventSnap.data() } as Event;
    
    // Access control logic
    const isPubliclyViewable = [
      EventStatus.Approved, 
      EventStatus.InProgress, 
      EventStatus.Completed, 
      EventStatus.Closed
    ].includes(eventData.status);
    
    const isMyRequest = eventData.requestedBy === currentStudentId && [
      EventStatus.Pending, 
      EventStatus.Rejected
    ].includes(eventData.status);
    
    if (isPubliclyViewable || isMyRequest) {
      return eventData;
    } else {
      throw new Error("You don't have permission to view this event's details.");
    }
  } catch (error) {
    console.error(`Error fetching event details for ${eventId}:`, error);
    throw error;
  }
};

/**
 * Submit a project to an event
 * @param eventId Event ID
 * @param studentId Student's UID
 * @param submissionData Submission data
 * @returns Promise that resolves when submission is complete
 */
export const submitProject = async (
  eventId: string,
  studentId: string,
  submissionData: Omit<Submission, 'submittedBy' | 'submittedAt' | 'teamName' | 'participantId'>
): Promise<void> => {
  if (!eventId || !studentId) throw new Error("Event ID and Student ID are required.");
  if (!submissionData?.projectName?.trim()) throw new Error("Project Name is required.");
  if (!submissionData?.link?.trim()) throw new Error("Project Link is required.");
  
  try { 
    new URL(submissionData.link); 
  } catch (_) { 
    throw new Error("Invalid Project Link URL."); 
  }

  try {
    const eventRef = doc(db, EVENTS_COLLECTION, eventId);
    const eventSnap = await getDoc(eventRef);
    
    if (!eventSnap.exists()) throw new Error('Event not found.');
    
    const eventData = mapFirestoreToEventData(eventSnap.id, eventSnap.data());
    if (!eventData) throw new Error('Failed to map event data.');

    if (eventData.status !== EventStatus.InProgress) {
      throw new Error("Submissions only allowed for 'In Progress' events.");
    }
    
    if (eventData.details.allowProjectSubmission === false) {
      throw new Error("Project submissions are not allowed for this event.");
    }

    const newSubmission: Submission = {
      projectName: submissionData.projectName.trim(),
      link: submissionData.link.trim(),
      description: submissionData.description?.trim() || undefined,
      submittedBy: studentId,
      submittedAt: now(),
    };

    if (eventData.details.format === EventFormat.Team) {
      const userTeam = eventData.teams?.find(t => t.members.includes(studentId));
      if (!userTeam) throw new Error("You are not part of a team in this event.");
      newSubmission.teamName = userTeam.teamName;
    } else {
      if (!eventData.participants?.includes(studentId)) {
        throw new Error("You are not a participant in this event.");
      }
      newSubmission.participantId = studentId;
    }

    // Check for duplicates
    const existingSubmissions = eventData.submissions || [];
    const isDuplicate = existingSubmissions.some(s =>
      s.projectName.toLowerCase() === newSubmission.projectName.toLowerCase() &&
      ((s.teamName && s.teamName === newSubmission.teamName) || 
       (s.participantId && s.participantId === newSubmission.participantId))
    );
    
    if (isDuplicate) {
      throw new Error(`Project "${newSubmission.projectName}" has already been submitted for your ${newSubmission.teamName ? 'team' : 'entry'}.`);
    }

    await updateDoc(eventRef, {
      submissions: arrayUnion(newSubmission),
      lastUpdatedAt: now()
    });
  } catch (error) {
    console.error(`Error submitting project for event ${eventId}:`, error);
    throw error;
  }
};

/**
 * Create a new event request
 * @param formData Event form data
 * @param studentId Student's UID
 * @returns Promise that resolves with the new event ID
 */
export const createEventRequest = async (
  formData: EventFormData, 
  studentId: string
): Promise<string> => {
  if (!studentId) throw new Error('Student ID is required to request an event.');
  if (!formData.details?.eventName?.trim()) throw new Error('Event name is required.');

  try {
    const newEventRef = doc(collection(db, EVENTS_COLLECTION));
    const newEventId = newEventRef.id;

    const mappedData = mapEventDataToFirestore(formData, true);
    
    const dataToSubmit: Partial<Event> = {
      ...mappedData,
      id: newEventId,
      requestedBy: studentId,
      status: EventStatus.Pending,
      votingOpen: false,
      organizerRatings: [],
      submissions: [],
      winners: {},
      bestPerformerSelections: {},
    };
    
    // Ensure organizers include the requester
    if (dataToSubmit.details && !dataToSubmit.details.organizers?.includes(studentId)) {
      dataToSubmit.details.organizers = [studentId, ...(dataToSubmit.details.organizers || [])];
    }

    await setDoc(newEventRef, dataToSubmit);
    return newEventId;
  } catch (error) {
    console.error('Error creating event request:', error);
    throw error;
  }
};
