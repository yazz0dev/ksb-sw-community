import { get, set, del } from 'idb-keyval'; // Assuming idb-keyval is available

const PROFILE_DRAFT_KEY = 'profileFormDraft';
const EVENT_REQUEST_DRAFT_KEY = 'eventRequestFormDraft';
const MANAGE_MULTI_EVENT_DRAFT_KEY = 'manageMultiEventFormDraft';


export interface ProfileDraftData {
  name: string;
  // photoURL is handled differently as it involves uploads; we save the URL if one was set.
  // The actual file upload can't happen offline easily with this simple draft model.
  // We'd save the URL that was in the form, which might be an old one or a newly uploaded one before going offline.
  photoURL?: string;
  bio?: string;
  socialLink?: string;
  instagramLink?: string;
  portfolio?: string;
  skills?: string; // Stored as a comma-separated string, as in the form
  hasLaptop?: boolean;
}
export interface ProfileDraft extends ProfileDraftData {
  savedAt: number; // Timestamp of when the draft was saved
}

export interface EventFormDraftData { // Generic enough for EventFormData
  details: {
    eventName: string;
    description: string;
    rules?: string | null;
    format: string; // EventFormat enum value
    isCompetition?: boolean;
    organizers: string[];
    coreParticipants: string[];
    type?: string;
    date: {
      start: string | null;
      end: string | null;
    };
    allowProjectSubmission: boolean;
    prize?: string | null;
    phases?: any[] | null; // EventPhase[]
  };
  participants?: string[];
  criteria?: any[]; // EventCriteria[]
  teams?: any[]; // Team[]
  // Not saving status or votingOpen in draft
}

export interface EventDraft extends EventFormDraftData {
  savedAt: number;
}


// Profile Draft Functions
export async function saveProfileDraft(draftData: ProfileDraftData): Promise<void> {
  try {
    const draft: ProfileDraft = { ...draftData, savedAt: Date.now() };
    await set(PROFILE_DRAFT_KEY, draft);
    console.log('Profile draft saved.');
  } catch (error) {
    console.error('Error saving profile draft:', error);
  }
}

export async function loadProfileDraft(): Promise<ProfileDraft | undefined> {
  try {
    const draft = await get<ProfileDraft>(PROFILE_DRAFT_KEY);
    if (draft) console.log('Profile draft loaded.');
    return draft;
  } catch (error) {
    console.error('Error loading profile draft:', error);
    return undefined;
  }
}

export async function clearProfileDraft(): Promise<void> {
  try {
    await del(PROFILE_DRAFT_KEY);
    console.log('Profile draft cleared.');
  } catch (error) {
    console.error('Error clearing profile draft:', error);
  }
}


// Event Request Draft Functions (for RequestEventView)
export async function saveEventRequestDraft(draftData: EventFormDraftData): Promise<void> {
  try {
    const draft: EventDraft = { ...draftData, savedAt: Date.now() };
    await set(EVENT_REQUEST_DRAFT_KEY, draft);
    console.log('Event request draft saved.');
  } catch (error) {
    console.error('Error saving event request draft:', error);
  }
}

export async function loadEventRequestDraft(): Promise<EventDraft | undefined> {
  try {
    const draft = await get<EventDraft>(EVENT_REQUEST_DRAFT_KEY);
    if (draft) console.log('Event request draft loaded.');
    return draft;
  } catch (error) {
    console.error('Error loading event request draft:', error);
    return undefined;
  }
}

export async function clearEventRequestDraft(): Promise<void> {
  try {
    await del(EVENT_REQUEST_DRAFT_KEY);
    console.log('Event request draft cleared.');
  } catch (error) {
    console.error('Error clearing event request draft:', error);
  }
}

// Manage Multi-Event Draft Functions (for ManageMultiEventView)
export async function saveManageMultiEventDraft(draftData: EventFormDraftData): Promise<void> {
  try {
    const draft: EventDraft = { ...draftData, savedAt: Date.now() };
    await set(MANAGE_MULTI_EVENT_DRAFT_KEY, draft);
    console.log('Manage multi-event draft saved.');
  } catch (error) {
    console.error('Error saving manage multi-event draft:', error);
  }
}

export async function loadManageMultiEventDraft(): Promise<EventDraft | undefined> {
  try {
    const draft = await get<EventDraft>(MANAGE_MULTI_EVENT_DRAFT_KEY);
    if (draft) console.log('Manage multi-event draft loaded.');
    return draft;
  } catch (error) {
    console.error('Error loading manage multi-event draft:', error);
    return undefined;
  }
}

export async function clearManageMultiEventDraft(): Promise<void> {
  try {
    await del(MANAGE_MULTI_EVENT_DRAFT_KEY);
    console.log('Manage multi-event draft cleared.');
  } catch (error) {
    console.error('Error clearing manage multi-event draft:', error);
  }
}
