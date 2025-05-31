// src/stores/studentProfileStore.ts
import { defineStore } from 'pinia';
import { ref, computed, type Ref } from 'vue';
import {
  doc, getDoc, updateDoc, collection, query, where, getDocs, Timestamp,
  writeBatch, serverTimestamp, increment, arrayUnion, arrayRemove, orderBy, limit, startAfter, FieldPath, documentId
} from 'firebase/firestore';
import type { User as FirebaseUser, AuthError as FirebaseAuthError } from 'firebase/auth'; // Added AuthError
import { getAuth, signOut as firebaseSignOut, onAuthStateChanged } from 'firebase/auth'; // Added getAuth, signOut, onAuthStateChanged
import { getStorage, ref as storageRef, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage'; // Added Firebase Storage imports
import { db } from '@/firebase';
import { deepClone, now, isEmpty } from '@/utils/helpers'; // Added now, isEmpty
import { useNotificationStore } from './notificationStore';
import { useAppStore } from './appStore'; // Renamed to studentAppStore for clarity in this file
import type { EnrichedStudentData, StudentPortfolioGenerationData, StudentEventHistoryItem, UserData, XPData } from '@/types/student'; // Adjusted imports: Removed StudentData, Changed StudentPortfolioData
import { getDefaultXPData } from '@/types/xp';
import { Event, EventStatus, EventFormat } from '@/types/event'; // Added Event and EventStatus, EventFormat
import { mapFirestoreToEventData } from '@/utils/eventDataMapper'; // Added mapFirestoreToEventData
import type { NameCacheEntry, StudentPortfolioProject, ImageUploadOptions, ImageUploadState } from '@/types/student'; // Removed UploadStatusValue
import { UploadStatus } from '@/types/student'; // Added UploadStatus enum

const STUDENT_COLLECTION_PATH = 'students';
const XP_COLLECTION_PATH = 'xp';

// Get storage reference from the existing Firebase app
const storage = getStorage();

const NAME_CACHE_TTL = 15 * 60 * 1000; // 15 minutes

// const now = () => Timestamp.now(); // Now imported from helpers

export const useProfileStore = defineStore('studentProfile', () => {
  const auth = getAuth(); // Initialize Firebase Auth
  const notificationStore = useNotificationStore();
  const studentAppStore = useAppStore(); // Use the renamed import

  const currentStudent = ref<EnrichedStudentData | null>(null);
  const viewedStudentProfile = ref<EnrichedStudentData | null>(null);
  const viewedStudentProjects = ref<StudentPortfolioProject[]>([]); // Explicitly type if possible
  const viewedStudentEventHistory = ref<StudentEventHistoryItem[]>([]);
  const currentUserPortfolioData = ref<{ projects: StudentPortfolioProject[]; eventParticipationCount: number; }>({ projects: [], eventParticipationCount: 0 }); // Adjusted type
  const allUsers = ref<UserData[]>([]);
  const nameCache = ref<Map<string, NameCacheEntry>>(new Map()); // Changed to Map
  const isLoading = ref<boolean>(false);
  const error = ref<string | null>(null); // General error for profile loading
  const actionError = ref<string | null>(null); // Error for specific actions like update
  const fetchError = ref<string | null>(null); // Error for fetching data for other profiles/lists
  const userRequests = ref<Event[]>([]); // State for user's event requests
  const hasFetched = ref<boolean>(false); // Added hasFetched state

  // --- State ---
  const imageUploadState = ref<ImageUploadState>({
    status: UploadStatus.Idle,
    progress: 0,
    error: null,
    fileName: null,
    downloadURL: null
  });

  // --- Getters ---
  const studentId = computed(() => currentStudent.value?.uid || null);
  const studentName = computed(() => currentStudent.value?.name || 'Student');
  const studentBatchYear = computed(() => currentStudent.value?.batchYear || null);
  const studentXP = computed(() => currentStudent.value?.xpData?.totalCalculatedXp || 0);
  const currentStudentPhotoURL = computed(() => currentStudent.value?.photoURL || null);
  // Add isAuthenticated computed property
  const isAuthenticated = computed(() => !!currentStudent.value?.uid);

  // New getter for allUsers
  const getAllUsers = computed(() => allUsers.value);

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
    } else {
      nameCache.value.delete(uid); // Optionally remove if name is null
    }
  }

  async function _handleAuthError(operation: string, err: unknown, uid?: string): Promise<void> {
    const message = err instanceof Error ? err.message : `An unknown error occurred during ${operation}.`;
    error.value = message; // Set general error for auth-related issues
    notificationStore.showNotification({ message, type: 'error' });
  }

  async function _handleOpError(operation: string, err: unknown, uid?: string): Promise<void> {
    const message = err instanceof Error ? err.message : `An unknown error occurred during ${operation}.`;
    actionError.value = message;
    notificationStore.showNotification({ message, type: 'error' });
  }

  async function _handleFetchError(operation: string, err: unknown): Promise<void> {
    const message = err instanceof Error ? err.message : `An unknown error occurred during ${operation}.`;
    fetchError.value = message;
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
        return null;
      }

      const firestoreDocData = studentSnap.data();
      const studentDataFromDoc = { uid: studentSnap.id, ...firestoreDocData } as UserData; // Use UserData
      const xpData = xpSnap.exists() ? { uid: xpSnap.id, ...xpSnap.data() } as XPData : getDefaultXPData(uid);

      _updateNameCache(studentDataFromDoc.uid, studentDataFromDoc.name ?? null); 

      // Construct EnrichedStudentData carefully
      const enrichedData: EnrichedStudentData = {
        uid: studentDataFromDoc.uid,
        name: studentDataFromDoc.name ?? null,
        email: studentDataFromDoc.email ?? null,
        studentId: studentDataFromDoc.studentId,
        batchYear: studentDataFromDoc.batchYear, // UserData.batchYear is number | undefined
        batch: studentDataFromDoc.batch, // UserData.batch is string | undefined
        photoURL: studentDataFromDoc.photoURL ?? null,
        bio: studentDataFromDoc.bio,
        skills: studentDataFromDoc.skills,
        preferredRoles: studentDataFromDoc.preferredRoles,
        hasLaptop: studentDataFromDoc.hasLaptop,
        socialLinks: studentDataFromDoc.socialLinks,
        participatedEventIDs: studentDataFromDoc.participatedEventIDs,
        organizedEventIDs: studentDataFromDoc.organizedEventIDs,
        xpData: deepClone(xpData)
      };
      return enrichedData;
    } catch (err) {
      await _handleAuthError("fetching student data", err, uid);
      return null;
    }
  }

  // --- Public Actions ---
  async function handleAuthStateChange(firebaseUser: FirebaseUser | null) {
    isLoading.value = true;
    error.value = null;
    actionError.value = null;
    fetchError.value = null;
    // Removed duplicate _fetchStudentDataInternal definition that was causing the syntax error
    if (firebaseUser) {
      const enrichedData = await _fetchStudentDataInternal(firebaseUser.uid);
      if (enrichedData) {
        currentStudent.value = enrichedData;
        await fetchCurrentUserPortfolioData();
        hasFetched.value = true; // Set hasFetched to true after successful fetch
      } else {
        await clearStudentSession(false); 
        if (auth.currentUser) { 
             try { await firebaseSignOut(auth); } catch (e) {  }
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
    if (currentStudent.value && allUsers.value.length === 0) {
        await fetchAllStudentProfiles();
    }
  }

  async function fetchUserRequests(userId: string): Promise<void> {
    isLoading.value = true;
    fetchError.value = null;
    userRequests.value = []; // Clear previous requests

    try {
      const eventsRef = collection(db, 'events');
      const q = query(
        eventsRef,
        where('requestedBy', '==', userId),
        where('status', '==', EventStatus.Pending), // Assuming EventStatus.Pending is 'Pending'
        orderBy('details.eventName', 'asc') // Optional: order by name or date
      );

      const querySnapshot = await getDocs(q);
      const fetchedRequests: Event[] = [];
      querySnapshot.forEach((docSnap) => {
        // Use mapFirestoreToEventData or similar mapping if available and necessary
        // For now, directly casting, assuming data structure matches Event type
        fetchedRequests.push({ id: docSnap.id, ...docSnap.data() } as Event);
      });
      userRequests.value = fetchedRequests;
    } catch (err) {
      await _handleFetchError("fetching user event requests", err);
      userRequests.value = []; // Ensure requests are empty on error
    } finally {
      isLoading.value = false;
    }
  }

  async function clearStudentSession(performFirebaseSignOut: boolean = false) {
    if (performFirebaseSignOut && auth.currentUser) {
        try {
            await firebaseSignOut(auth);
        } catch (e) {
        }
    }
    currentStudent.value = null;
    viewedStudentProfile.value = null;
    viewedStudentProjects.value = [];
    viewedStudentEventHistory.value = [];
    currentUserPortfolioData.value = { projects: [], eventParticipationCount: 0 };
    hasFetched.value = false; // Reset hasFetched on session clear
  }

  async function studentSignOut() {
    isLoading.value = true;
    try {
      // The actual Firebase sign-out is handled by useAuth().logout().
      // This method, if called directly, should now primarily ensure local store cleanup.
      await clearStudentSession(false); // Changed to false, as useAuth().logout() handles Firebase sign-out.
      // Notification is handled by useAuth().logout() if it's the initiator.
      // If this is called standalone, a generic logout message might be missed.
      // However, for consistency, notifications should be managed at the primary action point (useAuth).
      // No explicit notificationStore call here to avoid duplicates if useAuth().logout() also shows one.
    } catch (err: any) {
      await _handleAuthError("clearing student session on sign out", err);
    } finally {
      isLoading.value = false;
    }
  }

  async function updateMyProfile(updates: Partial<Omit<UserData, 'uid' | 'email' | 'createdAt' | 'participatedEventIDs' | 'organizedEventIDs' | 'xpData' | 'lastLogin' | 'profileUpdatedAt'>>) { // Use UserData
    if (!studentId.value) {
      notificationStore.showNotification({ message: "You must be logged in to update your profile.", type: 'error'});
      return false;
    }
    isLoading.value = true; actionError.value = null;
    try {
      const studentRef = doc(db, 'students', studentId.value);
      const dataToUpdate: any = { ...updates, lastUpdatedAt: now() }; // Use any for dataToUpdate to match updateDoc flexibility
      await updateDoc(studentRef, dataToUpdate);

      if (currentStudent.value) {
        // Update currentStudent.value carefully
        currentStudent.value = { 
            ...currentStudent.value, 
            ...deepClone(dataToUpdate),
            // Ensure properties not in UserData but in EnrichedStudentData are preserved or handled
            name: dataToUpdate.name !== undefined ? dataToUpdate.name : currentStudent.value.name, // Example for name
            photoURL: dataToUpdate.photoURL !== undefined ? dataToUpdate.photoURL : currentStudent.value.photoURL, // Example for photoURL
        } as EnrichedStudentData; // Cast might be needed
        if (updates.name) _updateNameCache(studentId.value, updates.name ?? null);
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
      await _handleFetchError("fetching profile for view", err);
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
    }
  }

  async function fetchCurrentUserPortfolioData() {
    if (!studentId.value) {
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
    error.value = null;
    fetchError.value = null;

    try {
      const studentsCollectionRef = collection(db, 'students');
      const studentsSnapshot = await getDocs(studentsCollectionRef);

      if (studentsSnapshot.empty) {
        error.value = "No users found in the database for the leaderboard.";
        return [];
      }

      const enrichedUsers: EnrichedStudentData[] = [];
      const studentPromises = studentsSnapshot.docs.map(async (studentDoc) => {
        const studentData = { uid: studentDoc.id, ...studentDoc.data() } as EnrichedStudentData;
        studentData.email = studentData.email ?? null; // Ensure email is string | null, never undefined
        const xpDocRef = doc(db, XP_COLLECTION_PATH, studentDoc.id);
        const xpSnap = await getDoc(xpDocRef);
        studentData.xpData = xpSnap.exists()
          ? ({ uid: xpSnap.id, ...xpSnap.data() } as XPData)
          : (getDefaultXPData(studentDoc.id) as XPData);

        _updateNameCache(studentData.uid, studentData.name ?? '');
        return studentData;
      });

      const results = await Promise.all(studentPromises);
      enrichedUsers.push(...results);

      if (enrichedUsers.length === 0) {
         error.value = "Leaderboard data is currently empty or could not be fully processed.";
      }

      return enrichedUsers;
    } catch (err) {
      await _handleFetchError("loading leaderboard users", err);
      return [];
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
                    _updateNameCache(docSnap.id, nameVal ?? null); // Ensure name is string | null
                });
            }
             idsToFetchFromDB.forEach(id => {
                if (!namesMap[id]) {
                    const unknownName = `Student (${id.substring(0,5)})`;
                    namesMap[id] = unknownName;
                    _updateNameCache(id, unknownName ?? null); // Cache even if not found in DB to prevent re-fetch, ensure name is string | null
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
    }
  }

  async function fetchAllStudentProfiles(): Promise<UserData[]> { // Return UserData[]
    if (allUsers.value.length > 0) {
      // Return cached data if available and not forced to refetch
      return allUsers.value;
    }
    isLoading.value = true;
    fetchError.value = null;
    try {
      const studentsCollectionRef = collection(db, 'students');
      const q = query(studentsCollectionRef, orderBy('name', 'asc')); // Optional: order by name
      const querySnapshot = await getDocs(q);
      const fetchedUsers: UserData[] = []; // Use UserData[]
      querySnapshot.forEach((docSnap) => {
        const userData = { uid: docSnap.id, ...docSnap.data() } as UserData; // Use UserData
        fetchedUsers.push(userData);
        _updateNameCache(userData.uid, userData.name ?? null); 
      });
      allUsers.value = fetchedUsers;
      return fetchedUsers;
    } catch (err) {
      await _handleFetchError("fetching all student profiles", err);
      return []; // Return empty array on error
    } finally {
      isLoading.value = false;
    }
  }

  // This ensures profile data is loaded/cleared when Firebase auth state changes.
  let unsubscribeAuthStateListener: (() => void) | null = null;
  if (auth) {
    unsubscribeAuthStateListener = onAuthStateChanged(auth, handleAuthStateChange);
  } else {
  }
  
  // Expose a way to unsubscribe if needed, e.g. on app teardown.
  const unsubscribeProfileAuthListener = () => {
    if (unsubscribeAuthStateListener) {
      unsubscribeAuthStateListener();
      unsubscribeAuthStateListener = null;
    }
  };

  // --- Image Upload Functions ---
  /**
   * Upload an image file to Firebase Storage
   * @param file The file to upload
   * @param options Upload options
   * @returns Promise with the download URL
   */
  async function uploadProfileImage(file: File, options: ImageUploadOptions = {}): Promise<string> {
    if (!studentId.value) {
      throw new Error("You must be logged in to upload a profile image.");
    }

    // Reset upload state
    imageUploadState.value = {
      status: UploadStatus.Uploading,
      progress: 0,
      error: null,
      fileName: null,
      downloadURL: null
    };

    try {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        throw new Error("Only image files are allowed.");
      }

      // Validate file size (default: 2MB)
      const maxSizeMB = options.maxSizeMB || 2;
      if (file.size > maxSizeMB * 1024 * 1024) {
        throw new Error(`File size exceeds ${maxSizeMB}MB limit.`);
      }

      // Compress image if needed
      let fileToUpload = file;
      if (options.maxWidthOrHeight || options.quality) {
        try {
          // Handle browser-image-compression library safely
          try {
            // Dynamic import with error handling
            const imageCompression = await import('browser-image-compression')
              .then(module => module.default)
              .catch(() => {
                return null;
              });
              
            if (imageCompression) {
              // Fix the type error by casting options to any for the imageCompression call
              fileToUpload = await imageCompression(file, {
                maxSizeMB: options.maxSizeMB || 2,
                maxWidthOrHeight: options.maxWidthOrHeight || 1200,
                useWebWorker: true,
                fileType: file.type,
                // @ts-ignore - quality may not be in type definition but is supported
                quality: options.quality || 0.8
              });
            }
          } catch (err) {
          }
        } catch (err) {
        }
      }

      // Create file name with timestamp to avoid cache issues
      const timestamp = Date.now();
      const extension = file.name.split('.').pop() || 'jpg';
      const fileName = `${studentId.value}_${timestamp}.${extension}`;
      
      // Set storage path
      const path = options.path || 'profile-images';
      const fileRef = storageRef(storage, `${path}/${fileName}`);
      
      // Delete old profile image if it exists
      if (currentStudent.value?.photoURL) {
        try {
          const oldUrl = currentStudent.value.photoURL;
          // Only delete if it's a Firebase Storage URL
          if (oldUrl && oldUrl.includes('firebasestorage.googleapis.com')) {
            const oldRef = storageRef(storage, oldUrl);
            await deleteObject(oldRef);
          }
        } catch (err) {
          console.warn("Failed to delete old profile image:", err);
        }
      }

      // Upload the file
      const uploadTask = uploadBytesResumable(fileRef, fileToUpload);
      
      // Return a promise that resolves when the upload is complete
      return new Promise((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            // Track upload progress
            const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
            imageUploadState.value.progress = progress;
          },
          (error) => {
            // Handle upload error
            imageUploadState.value = {
              status: UploadStatus.Error,
              progress: 0,
              error: error.message || "Upload failed",
              fileName: file.name,
              downloadURL: null
            };
            reject(error);
          },
          async () => {
            // Upload complete, get download URL
            try {
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
              imageUploadState.value = {
                status: UploadStatus.Success,
                progress: 100,
                error: null,
                fileName: file.name,
                downloadURL
              };
              resolve(downloadURL);
            } catch (err: any) {
              imageUploadState.value = {
                status: UploadStatus.Error,
                progress: 0,
                error: err?.message || "Failed to get download URL",
                fileName: file.name,
                downloadURL: null
              };
              reject(err);
            }
          }
        );
      });
    } catch (err: any) {
      imageUploadState.value = {
        status: UploadStatus.Error,
        progress: 0,
        error: err?.message || "Upload failed",
        fileName: file.name,
        downloadURL: null
      };
      throw err;
    }
  }

  /**
   * Upload a profile image and update the user profile with the new image URL
   * @param file The image file to upload
   * @param options Upload options
   * @returns Promise with success status
   */
  async function updateProfileImage(file: File, options: ImageUploadOptions = {}): Promise<boolean> {
    if (!studentId.value) {
      notificationStore.showNotification({ message: "You must be logged in to update your profile image.", type: 'error'});
      return false;
    }
    
    actionError.value = null;
    isLoading.value = true;
    
    try {
      const downloadURL = await uploadProfileImage(file, options);
      
      // Update the user profile with the new image URL
      const success = await updateMyProfile({ photoURL: downloadURL });
      if (success) {
        notificationStore.showNotification({ message: "Profile image updated successfully!", type: 'success' });
        return true;
      } else {
        throw new Error(actionError.value || "Failed to update profile with new image URL.");
      }
    } catch (err: any) {
      await _handleOpError("updating profile image", err, studentId.value);
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Reset the image upload state
   */
  function resetImageUploadState(): void {
    imageUploadState.value = {
      status: UploadStatus.Idle,
      progress: 0,
      error: null,
      fileName: null,
      downloadURL: null
    };
  }

  return {
    currentStudent,
    isLoading,
    error,
    actionError,
    fetchError,
    hasFetched,
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
    isAuthenticated, // Add this to the returned object
    getCachedStudentName,
    handleAuthStateChange,
    studentSignOut,
    clearStudentSession,
    updateMyProfile,
    fetchProfileForView,
    fetchCurrentUserPortfolioData,
    loadLeaderboardUsers,
    fetchUserNamesBatch,
    clearStaleNameCache,
    getAllUsers,
    allUsers,
    fetchAllStudentProfiles,
    unsubscribeProfileAuthListener,
    // Add the new image upload related exports
    imageUploadState,
    uploadProfileImage,
    updateProfileImage,
    resetImageUploadState,
    // Expose user requests related state and actions
    userRequests,
    fetchUserRequests
  };
});