// src/stores/studentProfileStore.ts
import { defineStore } from 'pinia';
import { ref, computed, type Ref } from 'vue';
import { doc, getDoc, updateDoc, collection, getDocs, query, where, Timestamp, documentId } from 'firebase/firestore';
import { db, auth } from '@/firebase'; // Assuming auth is also exported from firebase.ts
import { onAuthStateChanged, signOut as firebaseSignOut, type User as FirebaseUser } from 'firebase/auth';

import type {
    EnrichedStudentData,
    NameCacheMap,
    NameCacheEntry,
    StudentPortfolioProject,
    StudentEventHistoryItem
} from '@/types/student';
import type { XPData } from '@/types/xp';
import { getDefaultXPData, XP_COLLECTION_PATH } from '@/types/xp';
import { Event, EventStatus } from '@/types/event';
import type { Submission } from '@/types/event';
import { EventFormat } from '@/types/event';

import { useNotificationStore } from './notificationStore';
import { useAppStore } from './appStore';

import { deepClone, isEmpty } from '../utils/helpers';

// Define the StudentData interface if it's missing from the imported types
interface StudentData {
  uid: string;
  name: string;
  email?: string | null; // MODIFIED HERE: string | undefined -> string | null
  batchYear?: number;
  photoURL?: string;
  createdAt?: Timestamp;
  lastUpdatedAt?: Timestamp;
  bio?: string;
  hasLaptop?: boolean;
  skills?: string[];
  participatedEventIDs?: string[];
  organizedEventIDs?: string[];
  preferredRoles?: string[];
  socialLink?: string;
}

const NAME_CACHE_TTL = 15 * 60 * 1000; // 15 minutes

const now = () => Timestamp.now();

export const useProfileStore = defineStore('studentProfile', () => {
  // --- State ---
  const currentStudent = ref<EnrichedStudentData | null>(null);
  const isAuthenticated = ref<boolean>(false);
  const isLoading = ref<boolean>(true);
  const error = ref<string | null>(null);
  const actionError = ref<string | null>(null);
  const fetchError = ref<string | null>(null);
  const hasFetched = ref<boolean>(false); // Added: Tracks if initial student data fetch is done

  const nameCache = ref<NameCacheMap>(new Map());

  const viewedStudentProfile = ref<EnrichedStudentData | null>(null);
  const viewedStudentProjects = ref<StudentPortfolioProject[]>([]);
  const viewedStudentEventHistory = ref<StudentEventHistoryItem[]>([]);

  const currentUserPortfolioData = ref<{
    projects: StudentPortfolioProject[];
    eventParticipationCount: number;
  }>({ projects: [], eventParticipationCount: 0 });

  const studentAppStore = useAppStore();
  const notificationStore = useNotificationStore();

  // --- Getters ---
  const studentId = computed(() => currentStudent.value?.uid || null);
  const studentName = computed(() => currentStudent.value?.name || 'Student');
  const studentBatchYear = computed(() => currentStudent.value?.batchYear || null);
  const studentXP = computed(() => currentStudent.value?.xpData?.totalCalculatedXp || 0);
  const currentStudentPhotoURL = computed(() => currentStudent.value?.photoURL || null);

  const getCachedStudentName = (uid: string): string | undefined => {
    const entry = nameCache.value.get(uid);
    if (entry && (Date.now() - entry.timestamp < NAME_CACHE_TTL)) {
      return entry.name;
    }
    return undefined;
  };

  // --- Internal Actions ---
  function _updateNameCache(uid: string, name: string | null) {
    if (name) {
      nameCache.value.set(uid, { name, timestamp: Date.now() });
    }
  }

  async function _handleAuthError(operation: string, err: unknown, uid?: string): Promise<void> {
    const message = err instanceof Error ? err.message : `An unknown error occurred during ${operation}.`;
    error.value = message; // Use the main 'error' for auth-related issues primarily
    console.error(`StudentProfileStore Auth/Profile Error (${operation})${uid ? ` for UID ${uid}` : ''}:`, err);
    notificationStore.showNotification({ message, type: 'error' });
  }

  async function _handleOpError(operation: string, err: unknown, uid?: string): Promise<void> {
    const message = err instanceof Error ? err.message : `An unknown error occurred during ${operation}.`;
    actionError.value = message;
    console.error(`StudentProfileStore Operation Error (${operation})${uid ? ` for UID ${uid}` : ''}:`, err);
    notificationStore.showNotification({ message, type: 'error' });
  }

  async function _handleFetchError(operation: string, err: unknown): Promise<void> {
    const message = err instanceof Error ? err.message : `An unknown error occurred during ${operation}.`;
    fetchError.value = message;
    console.error(`StudentProfileStore Fetch Error (${operation}):`, err);
  }

  async function _fetchStudentDataInternal(uid: string): Promise<EnrichedStudentData | null> {
    try {
      const studentDocRef = doc(db, 'students', uid);
      const xpDocRef = doc(db, XP_COLLECTION_PATH, uid);

      const [studentSnap, xpSnap] = await Promise.all([
        getDoc(studentDocRef),
        getDoc(xpDocRef)
      ]);

      if (!studentSnap.exists()) {
        console.warn(`Student profile for UID ${uid} not found in Firestore 'students' collection.`);
        // For leaderboard, we might still want to return partial data if XP exists, or handle this differently.
        // For now, if student doc doesn't exist, we treat as no data.
        return null;
      }

      const studentDocData = studentSnap.data(); // Guaranteed to be DocumentData because studentSnap.exists() is true
      const studentData = { uid: studentSnap.id, ...studentDocData } as StudentData;
      const xpData = xpSnap.exists() ? { uid: xpSnap.id, ...xpSnap.data() } as XPData : getDefaultXPData(uid);

      _updateNameCache(studentData.uid, studentData.name);
      return {
        ...studentData,
        batchYear: studentDocData?.batchYear ?? 0, // Ensure batchYear is a number
        xpData: deepClone(xpData)
      };
    } catch (err) {
      await _handleAuthError("fetching student data", err, uid);
      return null;
    }
  }

  // --- Public Actions ---
  async function handleAuthStateChange(firebaseUser: FirebaseUser | null) {
    isLoading.value = true;
    error.value = null; // Clear general error on auth change
    actionError.value = null; // Clear action error
    fetchError.value = null;  // Clear fetch error
    if (firebaseUser) {
      const enrichedData = await _fetchStudentDataInternal(firebaseUser.uid);
      if (enrichedData) {
        currentStudent.value = enrichedData;
        isAuthenticated.value = true;
        await fetchCurrentUserPortfolioData();
      } else {
        await clearStudentSession(false); 
        if (auth.currentUser) { 
             try { await firebaseSignOut(auth); } catch (e) { console.error("Error signing out after failed profile fetch:", e); }
        }
        notificationStore.showNotification({ message: "Student profile not found. Please contact support if you believe this is an error.", type: 'error', duration: 7000});
      }
    } else {
      await clearStudentSession(false);
    }
    isLoading.value = false;
    if (!studentAppStore.hasFetchedInitialAuth) {
        studentAppStore.setHasFetchedInitialAuth(true);
    }
  }

  async function clearStudentSession(performFirebaseSignOut: boolean = true) {
    if (performFirebaseSignOut && auth.currentUser) {
        try {
            await firebaseSignOut(auth);
        } catch (e) {
            console.error("Error during Firebase sign out:", e);
        }
    }
    currentStudent.value = null;
    isAuthenticated.value = false;
    viewedStudentProfile.value = null;
    viewedStudentProjects.value = [];
    viewedStudentEventHistory.value = [];
    currentUserPortfolioData.value = { projects: [], eventParticipationCount: 0 };
    console.log("Student session data cleared from store.");
  }

  async function studentSignOut() {
    isLoading.value = true;
    try {
      await clearStudentSession(true);
      notificationStore.showNotification({ message: "You have been logged out.", type: 'success' });
    } catch (err) {
      await _handleAuthError("signing out", err); // Use _handleAuthError for sign-out process
    } finally {
      isLoading.value = false;
    }
  }

  async function updateMyProfile(updates: Partial<Omit<StudentData, 'uid' | 'email' | 'batchYear' | 'createdAt' | 'participatedEventIDs' | 'organizedEventIDs' | 'xpData'>>) {
    if (!isAuthenticated.value || !studentId.value) {
      notificationStore.showNotification({ message: "You must be logged in to update your profile.", type: 'error'});
      return false;
    }
    isLoading.value = true; actionError.value = null;
    try {
      const studentRef = doc(db, 'students', studentId.value);
      const dataToUpdate = { ...updates, lastUpdatedAt: now() };
      await updateDoc(studentRef, dataToUpdate);

      if (currentStudent.value) {
        // Assuming StudentData (used in updates) and EnrichedStudentData are compatible after the interface change
        currentStudent.value = { ...currentStudent.value, ...deepClone(dataToUpdate) } as EnrichedStudentData;
        if (updates.name) _updateNameCache(studentId.value, updates.name);
      }
      notificationStore.showNotification({ message: "Profile updated successfully!", type: 'success' });
      return true;
    } catch (err) {
      await _handleOpError("updating profile", err, studentId.value);
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  async function fetchProfileForView(targetStudentId: string): Promise<EnrichedStudentData | null> {
    isLoading.value = true; fetchError.value = null;
    viewedStudentProfile.value = null;
    viewedStudentProjects.value = [];
    viewedStudentEventHistory.value = [];

    try {
      const enrichedData = await _fetchStudentDataInternal(targetStudentId);
      if (enrichedData) {
        viewedStudentProfile.value = enrichedData;
        await _fetchStudentDisplayProjects(targetStudentId, enrichedData.participatedEventIDs, enrichedData.organizedEventIDs);
        await _fetchStudentDisplayEventHistory(targetStudentId, enrichedData.participatedEventIDs, enrichedData.organizedEventIDs);
        return enrichedData;
      } else {
        fetchError.value = "Profile not found.";
        notificationStore.showNotification({message: fetchError.value, type: 'warning'});
        return null;
      }
    } catch (err) {
      // _fetchStudentDataInternal already calls _handleAuthError which sets 'error'
      // For a fetch operation, _handleFetchError might be more appropriate to set 'fetchError'
      await _handleFetchError("fetching profile for view", err);
      // notificationStore.showNotification({message: fetchError.value || error.value || "Failed to load profile.", type: 'error'});
      return null;
    } finally {
      isLoading.value = false;
    }
  }

  async function _fetchStudentDisplayProjects(
    targetStudentId: string,
    participatedEventIDs?: string[],
    organizedEventIDs?: string[]
  ) {
    viewedStudentProjects.value = [];
    const relevantEventIds = [...new Set([...(participatedEventIDs || []), ...(organizedEventIDs || [])])].filter(Boolean);
    if (relevantEventIds.length === 0) return;

    try {
      const projects: StudentPortfolioProject[] = [];
      for (let i = 0; i < relevantEventIds.length; i += 30) {
          const batchIds = relevantEventIds.slice(i, i + 30);
          if (batchIds.length === 0) continue;
          const eventQuery = query(collection(db, "events"), where(documentId(), 'in', batchIds));
          const eventSnapshot = await getDocs(eventQuery);

          eventSnapshot.forEach(eventDoc => {
              const event = eventDoc.data() as Event;
              (event.submissions || []).forEach(sub => {
                  let isRelevantSubmission = sub.submittedBy === targetStudentId;
                  if (event.details.format === EventFormat.Team && sub.teamName) {
                      const team = event.teams?.find(t => t.teamName === sub.teamName);
                      if (team?.members.includes(targetStudentId)) {
                          isRelevantSubmission = true;
                      }
                  }
                  if (isRelevantSubmission) {
                      projects.push({
                          id: `${event.id}-${sub.projectName.replace(/\s+/g, '-')}`,
                          eventId: event.id,
                          eventName: event.details.eventName,
                          projectName: sub.projectName,
                          description: sub.description,
                          link: sub.link,
                          submittedAt: sub.submittedAt,
                          eventFormat: event.details.format,
                          submittedBy: sub.submittedBy
                      });
                  }
              });
          });
      }
      viewedStudentProjects.value = projects.sort((a, b) =>
          (b.submittedAt instanceof Timestamp ? b.submittedAt.toMillis() : 0) -
          (a.submittedAt instanceof Timestamp ? a.submittedAt.toMillis() : 0)
      );
    } catch (err) {
        console.error("Error fetching student projects for display:", err);
    }
  }

  async function _fetchStudentDisplayEventHistory(
    targetStudentId: string,
    participatedEventIDs?: string[],
    organizedEventIDs?: string[]
  ) {
    viewedStudentEventHistory.value = [];
    const relevantEventIds = [...new Set([...(participatedEventIDs || []), ...(organizedEventIDs || [])])].filter(Boolean);
    if (relevantEventIds.length === 0) return;

    try {
        const history: StudentEventHistoryItem[] = [];
        for (let i = 0; i < relevantEventIds.length; i += 30) {
            const batchIds = relevantEventIds.slice(i, i + 30);
            if (batchIds.length === 0) continue;
            const eventQuery = query(collection(db, "events"), where(documentId(), 'in', batchIds));
            const eventSnapshot = await getDocs(eventQuery);

            eventSnapshot.forEach(eventDoc => {
                const event = eventDoc.data() as Event;
                 if (![EventStatus.Pending, EventStatus.Rejected, EventStatus.Cancelled].includes(event.status as EventStatus) ||
                    event.requestedBy === targetStudentId
                ) {
                    let roleInEvent: StudentEventHistoryItem['roleInEvent'] = 'participant';
                    if (event.details.organizers?.includes(targetStudentId)) {
                        roleInEvent = 'organizer';
                    } else if (event.details.format === EventFormat.Team) {
                        const team = event.teams?.find(t => t.members.includes(targetStudentId));
                        if (team) {
                            roleInEvent = team.teamLead === targetStudentId ? 'team_lead' : 'team_member';
                        }
                    }
                    history.push({
                        eventId: event.id,
                        eventName: event.details.eventName,
                        eventStatus: event.status,
                        eventFormat: event.details.format,
                        roleInEvent,
                        date: event.details.date
                    });
                }
            });
        }
        viewedStudentEventHistory.value = history.sort((a, b) =>
            (b.date.start instanceof Timestamp ? b.date.start.toMillis() : 0) -
            (a.date.start instanceof Timestamp ? a.date.start.toMillis() : 0)
        );
    } catch (err) {
        console.error("Error fetching student event history:", err);
    }
  }

  async function fetchCurrentUserPortfolioData() {
    if (!isAuthenticated.value || !studentId.value) {
      currentUserPortfolioData.value = { projects: [], eventParticipationCount: 0 };
      return;
    }
    isLoading.value = true;
    try {
      const studentProfile = currentStudent.value;
      if (!studentProfile) throw new Error("Current student profile not loaded.");

      await _fetchStudentDisplayProjects(studentProfile.uid, studentProfile.participatedEventIDs, studentProfile.organizedEventIDs);
      currentUserPortfolioData.value.projects = [...viewedStudentProjects.value];

      let validParticipationCount = 0;
      const participatedIds = studentProfile.participatedEventIDs || [];
      if (participatedIds.length > 0) {
          for (let i = 0; i < participatedIds.length; i += 30) {
              const batchIds = participatedIds.slice(i, i + 30);
              if (batchIds.length === 0) continue;
              const eventQuery = query(collection(db, "events"), where(documentId(), 'in', batchIds));
              const eventSnapshot = await getDocs(eventQuery);
              eventSnapshot.forEach(eventDoc => {
                  const event = eventDoc.data() as Event;
                  if (![EventStatus.Cancelled, EventStatus.Rejected, EventStatus.Pending].includes(event.status as EventStatus)) {
                      validParticipationCount++;
                  }
              });
          }
      }
      currentUserPortfolioData.value.eventParticipationCount = validParticipationCount;

    } catch (err) {
      await _handleOpError("fetching current user portfolio data", err, studentId.value);
      currentUserPortfolioData.value = { projects: [], eventParticipationCount: 0 };
    } finally {
      isLoading.value = false;
    }
  }

  async function loadLeaderboardUsers(): Promise<EnrichedStudentData[]> {
    isLoading.value = true;
    error.value = null; // Clear previous errors specific to this operation
    fetchError.value = null; // Clear fetch error as well

    try {
      const studentsCollectionRef = collection(db, 'students');
      const studentsSnapshot = await getDocs(studentsCollectionRef);

      if (studentsSnapshot.empty) {
        console.warn("No users found in the 'students' collection for leaderboard.");
        error.value = "No users found in the database for the leaderboard."; // More specific message
        return [];
      }

      const enrichedUsers: EnrichedStudentData[] = [];
      const studentPromises = studentsSnapshot.docs.map(async (studentDoc) => {
        const studentData = { uid: studentDoc.id, ...studentDoc.data() } as StudentData;
        const xpDocRef = doc(db, XP_COLLECTION_PATH, studentDoc.id);
        const xpSnap = await getDoc(xpDocRef);
        const xpData = xpSnap.exists() ? { uid: xpSnap.id, ...xpSnap.data() } as XPData : getDefaultXPData(studentDoc.id);

        _updateNameCache(studentData.uid, studentData.name);
        return {
          ...studentData,
          batchYear: studentData.batchYear ?? 0, // Ensure batchYear is a number
          xpData: deepClone(xpData),
        } as EnrichedStudentData; // Cast to EnrichedStudentData
      });

      const results = await Promise.all(studentPromises);
      // Filter out any null results if _fetchStudentDataInternal (or similar logic) could return null
      // For this direct implementation, all promises should resolve to EnrichedStudentData
      enrichedUsers.push(...results);

      if (enrichedUsers.length === 0) {
         error.value = "Leaderboard data is currently empty or could not be fully processed.";
      }

      return enrichedUsers;
    } catch (err) {
      await _handleFetchError("loading leaderboard users", err); // Use fetchError for this operation
      // error.value is now set by _handleFetchError
      return []; // Return empty array on error
    } finally {
      isLoading.value = false;
    }
  }


  async function fetchUserNamesBatch(uidsToFetchParam: string[]): Promise<Record<string, string>> {
    if (isEmpty(uidsToFetchParam)) return {};
    const uniqueUids = [...new Set(uidsToFetchParam.filter(Boolean))];
    const namesMap: { [uid: string]: string } = {};
    const idsToFetchFromDB: string[] = [];
    const nowTime = Date.now();

    uniqueUids.forEach(id => {
        const cached = nameCache.value.get(id);
        if (cached && (nowTime - cached.timestamp < NAME_CACHE_TTL)) {
            namesMap[id] = cached.name;
        } else {
            idsToFetchFromDB.push(id);
        }
    });

    if (idsToFetchFromDB.length > 0) {
        try {
            for (let i = 0; i < idsToFetchFromDB.length; i += 30) {
                const batchIds = idsToFetchFromDB.slice(i, i + 30);
                if (batchIds.length === 0) continue;
                const usersRef = collection(db, 'students');
                const q = query(usersRef, where(documentId(), 'in', batchIds));
                const snapshot = await getDocs(q);
                snapshot.forEach(docSnap => {
                    const nameVal = docSnap.data()?.name || `Student (${docSnap.id.substring(0,5)})`;
                    namesMap[docSnap.id] = nameVal;
                    _updateNameCache(docSnap.id, nameVal);
                });
            }
             idsToFetchFromDB.forEach(id => {
                if (!namesMap[id]) {
                    const unknownName = `Student (${id.substring(0,5)})`;
                    namesMap[id] = unknownName;
                    _updateNameCache(id, unknownName); // Cache even if not found in DB to prevent re-fetch
                }
            });
        } catch (err) {
            await _handleOpError("fetching user names batch", err); // _handleOpError sets actionError
             idsToFetchFromDB.forEach(id => { if (!namesMap[id]) namesMap[id] = `Error (${id.substring(0,5)})`; });
        }
    }
    return namesMap;
  }

  function clearStaleNameCache() {
    const nowTime = Date.now();
    const newCache = new Map<string, NameCacheEntry>();
    let clearedCount = 0;
    nameCache.value.forEach((entry, uid) => {
        if (nowTime - entry.timestamp < NAME_CACHE_TTL) {
            newCache.set(uid, entry);
        } else {
            clearedCount++;
        }
    });
    if (clearedCount > 0) {
        nameCache.value = newCache;
        console.log(`Cleared ${clearedCount} stale entries from name cache.`);
    }
  }

  return {
    currentStudent,
    isAuthenticated,
    isLoading,
    error,
    actionError,
    fetchError,
    hasFetched, // Expose hasFetched state
    nameCache,
    viewedStudentProfile,
    viewedStudentProjects,
    viewedStudentEventHistory,
    currentUserPortfolioData,
    studentId,
    studentName,
    studentBatchYear,
    studentXP,
    currentStudentPhotoURL,
    getCachedStudentName,
    handleAuthStateChange,
    studentSignOut,
    clearStudentSession,
    updateMyProfile,
    fetchProfileForView,
    fetchCurrentUserPortfolioData,
    loadLeaderboardUsers, // Add the new action here
    fetchUserNamesBatch,
    clearStaleNameCache,
  };
});