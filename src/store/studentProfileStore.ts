// src/store/studentProfileStore.ts
import { defineStore } from 'pinia';
import { ref, computed, type Ref } from 'vue';
import { doc, getDoc, updateDoc, collection, getDocs, query, where, Timestamp, documentId } from 'firebase/firestore';
import { db, auth } from '@/firebase'; // Assuming auth is also exported from firebase.ts
import { onAuthStateChanged, signOut as firebaseSignOut, type User as FirebaseUser } from 'firebase/auth';

import type {
    StudentData,
    EnrichedStudentData,
    NameCacheMap,
    NameCacheEntry,
    StudentPortfolioProject,
    StudentEventHistoryItem
} from '@/types/student';
import type { XPData } from '@/types/xp';
import { getDefaultXPData, XP_COLLECTION_PATH } from '@/types/xp';
import type { Event, EventStatus, Submission } from '@/types/event'; // For portfolio/history data
import { EventFormat } from '@/types/event';

import { useStudentNotificationStore } from './studentNotificationStore';
import { useStudentAppStore } from './studentAppStore'; // For hasFetchedInitialAuth
import { deepClone, isEmpty } from '@/utils/helpers';

const NAME_CACHE_TTL = 15 * 60 * 1000; // 15 minutes

export const useStudentProfileStore = defineStore('studentProfile', () => {
  // --- State ---
  const currentStudent = ref<EnrichedStudentData | null>(null);
  const isAuthenticated = ref<boolean>(false);
  const isLoading = ref<boolean>(true); // Start true until initial auth check
  const error = ref<string | null>(null);

  const nameCache = ref<NameCacheMap>(new Map());

  // For viewing other students' profiles
  const viewedStudentProfile = ref<EnrichedStudentData | null>(null);
  const viewedStudentProjects = ref<StudentPortfolioProject[]>([]); // Projects of the viewed student
  const viewedStudentEventHistory = ref<StudentEventHistoryItem[]>([]); // Event history of viewed student

  // Portfolio data for the *current authenticated* student
  const currentUserPortfolioData = ref<{
    projects: StudentPortfolioProject[];
    eventParticipationCount: number;
    // Could add more portfolio-specific aggregated data here
  }>({ projects: [], eventParticipationCount: 0 });


  const studentAppStore = useStudentAppStore(); // Initialized later or passed if needed early
  const notificationStore = useStudentNotificationStore();


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
    return undefined; // Or a placeholder like "Loading..." / "User UID"
  };


  // --- Internal Actions ---
  function _updateNameCache(uid: string, name: string | null) {
    if (name) {
      nameCache.value.set(uid, { name, timestamp: Date.now() });
    }
  }

  async function _handleAuthError(operation: string, err: unknown, uid?: string): Promise<void> {
    const message = err instanceof Error ? err.message : `An unknown error occurred during ${operation}.`;
    error.value = message;
    console.error(`StudentProfileStore Auth/Profile Error (${operation})${uid ? ` for UID ${uid}` : ''}:`, err);
    notificationStore.showNotification({ message, type: 'error' });
    // Do not clear auth state here, let onAuthStateChanged handle it if Firebase auth state changes.
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
        // If student profile doesn't exist, they shouldn't be "authenticated" in our app's context
        console.warn(`Student profile for UID ${uid} not found in Firestore 'students' collection.`);
        return null;
      }

      const studentData = { uid: studentSnap.id, ...studentSnap.data() } as StudentData;
      const xpData = xpSnap.exists() ? { uid: xpSnap.id, ...xpSnap.data() } as XPData : getDefaultXPData(uid);

      _updateNameCache(studentData.uid, studentData.name);
      return { ...studentData, xpData: deepClone(xpData) }; // Ensure xpData is cloned
    } catch (err) {
      await _handleAuthError("fetching student data", err, uid);
      return null;
    }
  }

  // --- Public Actions ---

  // Called by onAuthStateChanged in main.ts or App.vue
  async function handleAuthStateChange(firebaseUser: FirebaseUser | null) {
    isLoading.value = true;
    error.value = null;
    if (firebaseUser) {
      const enrichedData = await _fetchStudentDataInternal(firebaseUser.uid);
      if (enrichedData) {
        currentStudent.value = enrichedData;
        isAuthenticated.value = true;
        // Fetch portfolio data for the logged-in user
        await fetchCurrentUserPortfolioData();
      } else {
        // Profile fetch failed or doesn't exist, sign out from Firebase
        // as student profile is required for app auth.
        await clearStudentSession(false); // false: don't trigger Firebase signOut again if already in process
        if (auth.currentUser) { // Only sign out if Firebase still thinks there's a user
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
            await firebaseSignOut(auth); // This will re-trigger onAuthStateChanged
        } catch (e) {
            console.error("Error during Firebase sign out:", e);
            // Even if Firebase sign out fails, clear local state
        }
    }
    currentStudent.value = null;
    isAuthenticated.value = false;
    viewedStudentProfile.value = null; // Clear viewed profile as well
    viewedStudentProjects.value = [];
    viewedStudentEventHistory.value = [];
    currentUserPortfolioData.value = { projects: [], eventParticipationCount: 0 };
    // error.value = null; // Keep error if signout was due to an error condition
    // isLoading.value = false; // Managed by caller or specific actions
    console.log("Student session data cleared from store.");
  }


  async function studentSignOut() {
    isLoading.value = true;
    try {
      await clearStudentSession(true); // This will call firebaseSignOut which triggers onAuthStateChanged
      notificationStore.showNotification({ message: "You have been logged out.", type: 'success' });
      // Router navigation handled by onAuthStateChanged or global guards
    } catch (err) {
      await _handleAuthError("signing out", err);
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
    isLoading.value = true; fetchError.value = null; // Use fetchError for this
    viewedStudentProfile.value = null;
    viewedStudentProjects.value = [];
    viewedStudentEventHistory.value = [];

    try {
      const enrichedData = await _fetchStudentDataInternal(targetStudentId);
      if (enrichedData) {
        viewedStudentProfile.value = enrichedData;
        // After fetching profile, fetch their projects and event history
        await _fetchStudentDisplayProjects(targetStudentId, enrichedData.participatedEventIDs, enrichedData.organizedEventIDs);
        await _fetchStudentDisplayEventHistory(targetStudentId, enrichedData.participatedEventIDs, enrichedData.organizedEventIDs);
        return enrichedData;
      } else {
        fetchError.value = "Profile not found.";
        notificationStore.showNotification({message: fetchError.value, type: 'warning'});
        return null;
      }
    } catch (err) {
      await _handleFetchError("fetching profile for view", err); // Use _handleFetchError
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
    viewedStudentProjects.value = []; // Reset
    const relevantEventIds = [...new Set([...(participatedEventIDs || []), ...(organizedEventIDs || [])])].filter(Boolean);
    if (relevantEventIds.length === 0) return;

    try {
      const projects: StudentPortfolioProject[] = [];
      // Batch fetch relevant events (max 30 IDs per 'in' query)
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
                          eventFormat: event.details.format
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
        // Don't show a global error notification for this, view can handle empty state.
    }
  }

  async function _fetchStudentDisplayEventHistory(
    targetStudentId: string,
    participatedEventIDs?: string[],
    organizedEventIDs?: string[]
  ) {
    viewedStudentEventHistory.value = []; // Reset
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
                 if (![EventStatus.Pending, EventStatus.Rejected, EventStatus.Cancelled].includes(event.status) || // Show only meaningful history
                    event.requestedBy === targetStudentId // Or if they requested it, show its final status
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
    isLoading.value = true; // Use main loading or a specific portfolio loading flag
    try {
      const studentProfile = currentStudent.value; // Already EnrichedStudentData
      if (!studentProfile) throw new Error("Current student profile not loaded.");

      await _fetchStudentDisplayProjects(studentProfile.uid, studentProfile.participatedEventIDs, studentProfile.organizedEventIDs);
      currentUserPortfolioData.value.projects = [...viewedStudentProjects.value]; // Copy projects

      // Calculate participation count from participatedEventIDs, ensuring events are not cancelled/rejected
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
                  if (![EventStatus.Cancelled, EventStatus.Rejected, EventStatus.Pending].includes(event.status)) {
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
                const usersRef = collection(db, 'students'); // Query 'students' collection
                const q = query(usersRef, where(documentId(), 'in', batchIds));
                const snapshot = await getDocs(q);
                snapshot.forEach(docSnap => {
                    const nameVal = docSnap.data()?.name || `Student (${docSnap.id.substring(0,5)})`;
                    namesMap[docSnap.id] = nameVal;
                    _updateNameCache(docSnap.id, nameVal);
                });
            }
             idsToFetchFromDB.forEach(id => { // Fallback for any not found in DB
                if (!namesMap[id]) {
                    const unknownName = `Student (${id.substring(0,5)})`;
                    namesMap[id] = unknownName;
                    _updateNameCache(id, unknownName);
                }
            });
        } catch (err) {
            await _handleOpError("fetching user names batch", err);
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
    // State
    currentStudent,
    isAuthenticated,
    isLoading,
    error,
    nameCache, // Expose for direct use if needed, though getters are preferred
    viewedStudentProfile,
    viewedStudentProjects,
    viewedStudentEventHistory,
    currentUserPortfolioData,
    // Getters
    studentId,
    studentName,
    studentBatchYear,
    studentXP,
    currentStudentPhotoURL,
    getCachedStudentName,
    // Actions
    handleAuthStateChange,
    studentSignOut,
    clearStudentSession,
    updateMyProfile,
    fetchProfileForView,
    fetchCurrentUserPortfolioData,
    fetchUserNamesBatch,
    clearStaleNameCache,
  };
});