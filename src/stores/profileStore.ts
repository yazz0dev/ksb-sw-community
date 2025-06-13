// src/stores/studentProfileStore.ts
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { User as FirebaseUser } from 'firebase/auth'; // Added AuthError
import { signOut as firebaseSignOut } from 'firebase/auth'; // Added signOut, onAuthStateChanged
import { auth } from '@/firebase';
import { deepClone, isEmpty } from '@/utils/eventUtils'; // Added now, isEmpty
import { useNotificationStore } from './notificationStore';
import { useAppStore } from './appStore'; // Renamed to studentAppStore for clarity in this file
import type { EnrichedStudentData, StudentEventHistoryItem, UserData, StudentPortfolioGenerationData } from '@/types/student'; // Adjusted imports: Removed StudentData, Changed StudentPortfolioData
import { type Event } from '@/types/event'; // Added Event and EventStatus, EventFormat
import type { NameCacheEntry, StudentPortfolioProject, ImageUploadOptions, ImageUploadState } from '@/types/student'; // Removed UploadStatusValue
import { UploadStatus } from '@/types/student'; // Added UploadStatus enum
import { handleAuthError as formatAuthErrorUtil, handleFirestoreError as formatFirestoreErrorUtil } from '@/utils/errorHandlers';
import { 
    fetchStudentData as fetchStudentDataService,
    updateStudentProfile as updateStudentProfileService,
    fetchUserNamesBatch as fetchUserNamesBatchService,
    fetchAllStudentProfiles as fetchAllStudentProfilesService,
    fetchLeaderboardData as fetchLeaderboardDataService
} from '@/services/profileService';
import {
    fetchStudentPortfolioProjects as fetchStudentPortfolioProjectsService,
    fetchStudentEventHistory as fetchStudentEventHistoryService,
    fetchComprehensivePortfolioData as fetchComprehensivePortfolioDataService
} from '@/services/portfolioService';
import { fetchMyEventRequests as fetchStudentEventRequestsService } from '@/services/eventService/eventQueries';
import { fetchStudentEventsWithFallback } from '@/services/eventService/eventQueries'; // Updated import
import { uploadFileService, deleteFileByUrlService, getOptimizedImageUrl } from '@/services/storageService'; // Added storage service imports

// const STUDENT_COLLECTION_PATH = 'students';
// const XP_COLLECTION_PATH = 'xp';

// Get storage reference from the existing Firebase app

const NAME_CACHE_TTL = 15 * 60 * 1000; // 15 minutes

// const now = () => Timestamp.now(); // Now imported from helpers

export const useProfileStore = defineStore('studentProfile', () => {
  // Using centralized auth instance from firebase.ts
  const notificationStore = useNotificationStore();
  const studentAppStore = useAppStore(); // Use the renamed import

  const currentStudent = ref<EnrichedStudentData | null>(null);
  const viewedStudentProfile = ref<EnrichedStudentData | null>(null);
  const viewedStudentProjects = ref<StudentPortfolioProject[]>([]); // Explicitly type if possible
  const viewedStudentEventHistory = ref<StudentEventHistoryItem[]>([]);
  const currentUserPortfolioData = ref<{ 
    projects: StudentPortfolioProject[]; 
    eventParticipationCount: number;
    comprehensiveData?: StudentPortfolioGenerationData;
  }>({ 
    projects: [], 
    eventParticipationCount: 0 
  });
  const allUsers = ref<UserData[]>([]);
  const nameCache = ref<Map<string, NameCacheEntry>>(new Map()); // Changed to Map
  const isLoading = ref<boolean>(false);
  const error = ref<string | null>(null); // General error for profile loading
  const actionError = ref<string | null>(null); // Error for specific actions like update
  const fetchError = ref<string | null>(null); // Error for fetching data for other profiles/lists
  const userRequests = ref<Event[]>([]); // State for user's event requests
  const isLoadingUserRequests = ref<boolean>(false); // New dedicated loading state for user requests
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
  const isAuthenticated = computed(() => {
    return !!currentStudent.value?.uid;
  });

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

  async function _handleAuthError(operation: string, err: unknown, _uid?: string): Promise<void> {
    const formattedMessage = formatAuthErrorUtil(err);
    let finalMessage: string;

    // If formatter gave its most generic message, or if it just returned err.message which was generic
    if (formattedMessage === 'An authentication error occurred. Please try again.' || 
        (err instanceof Error && formattedMessage === err.message && (err.message.toLowerCase().includes("unknown") || err.message.toLowerCase().includes("error occurred")))) {
      finalMessage = err instanceof Error ? `${operation}: ${err.message}` : `An unknown error occurred during ${operation}.`;
    } else {
      finalMessage = formattedMessage; // Use the more specific message from the formatter
    }
    
    error.value = finalMessage;
    notificationStore.showNotification({ message: finalMessage, type: 'error' });
  }

  async function _handleOpError(operation: string, err: unknown, _uid?: string): Promise<void> {
    let finalMessage: string;

    // Check if err has a 'code' property, suggesting it's a Firebase-related error (Firestore, Storage, etc.)
    if (err && typeof (err as any).code === 'string') {
        // Using formatFirestoreErrorUtil as a general formatter for Firebase errors with a 'code'
        const formattedMessage = formatFirestoreErrorUtil(err); 
        // Check if the message is one of the generic ones from the formatter
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
    
    actionError.value = finalMessage;
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
    fetchError.value = finalMessage; // No notification for this one, as per original implementation
  }

  // --- Public Actions ---
  async function handleAuthStateChange(firebaseUser: FirebaseUser | null) {
    // Prevent concurrent auth state changes
    if (isLoading.value) {
      return;
    }

    isLoading.value = true;
    error.value = null;
    actionError.value = null;
    fetchError.value = null;
    
    if (firebaseUser) {
      // User is authenticated with Firebase.
      // We trust this call is from the single source of truth in main.ts.
      // No need to check for existing user, as this function is now the authority.
      try {
        const enrichedData = await fetchStudentDataService(firebaseUser.uid);
        
        if (enrichedData) {
          currentStudent.value = enrichedData;
          _updateNameCache(enrichedData.uid, enrichedData.name ?? null);
          await fetchCurrentUserPortfolioData();
          hasFetched.value = true;
        } else {
          // Profile not found, but user is authenticated with Firebase.
          // The session will be in a state where user is authenticated but has no profile data.
          // This is a valid state, and UI can decide how to handle it (e.g., prompt for profile creation).
          currentStudent.value = null; // Ensure no stale profile data
          hasFetched.value = true; // Still mark as fetched to unblock UI
          notificationStore.showNotification({ 
            message: "Authentication successful, but no student profile was found. Please contact an admin to have your account set up.",
            type: 'warning',
            duration: 10000
          });
          error.value = "Student profile not found for authenticated user.";
        }
      } catch (err) {
        console.error('Error fetching student data after auth change:', err);
        await _handleAuthError("fetching student data after auth change", err, firebaseUser.uid);
        // On a critical fetch error, do not sign out. Leave the user authenticated
        // but without a profile, similar to the 'profile not found' case.
        currentStudent.value = null;
        hasFetched.value = true; // Mark as fetched to unblock UI
        notificationStore.showNotification({ 
          message: "We couldn't load your profile due to a permissions error. Please contact an admin.",
          type: 'error',
          duration: 10000
        });
      }
    } else {
      // No Firebase user, clear the session.
      // This is triggered on sign-out.
      await clearStudentSession(false);
    }
    
    isLoading.value = false;
    
    if (!studentAppStore.hasFetchedInitialAuth) {
      studentAppStore.setHasFetchedInitialAuth(true);
    }
    
    if (currentStudent.value && allUsers.value.length === 0) {
      // Consider if fetchAllStudentProfiles should also be protected by a try/catch
      try {
        await fetchAllStudentProfiles();
      } catch (err) {
        console.warn('Error fetching all student profiles:', err);
      }
    }
  }

  async function fetchMyProfile(): Promise<EnrichedStudentData | null> {
    if (!studentId.value) {
      // Not authenticated, or studentId not yet available from currentStudent
      error.value = "User not authenticated. Cannot fetch profile.";
      // notificationStore.showNotification({ message: error.value, type: 'warning' }); // Optional: notify if called when not expected
      currentStudent.value = null; // Ensure local state is cleared
      return null;
    }
    isLoading.value = true;
    error.value = null; // Clear previous general errors
    actionError.value = null; // Clear previous action errors
    try {
      const enrichedData = await fetchStudentDataService(studentId.value);
      if (enrichedData) {
        currentStudent.value = deepClone(enrichedData);
        _updateNameCache(enrichedData.uid, enrichedData.name ?? null);
        // Optionally, trigger related data fetches if needed, e.g., portfolio
        // await fetchCurrentUserPortfolioData(); 
        hasFetched.value = true;
        return currentStudent.value;
      } else {
        error.value = "Failed to fetch profile data. Profile not found for UID: " + studentId.value;
        notificationStore.showNotification({ message: error.value, type: 'error' });
        currentStudent.value = null; // Clear profile if not found
        return null;
      }
    } catch (err) {
      await _handleOpError("fetching own profile", err, studentId.value);
      currentStudent.value = null; // Clear profile on error
      return null;
    } finally {
      isLoading.value = false;
    }
  }

  async function fetchUserRequests(userId: string): Promise<void> {
    isLoadingUserRequests.value = true;
    fetchError.value = null;
    userRequests.value = [];

    try {
      const fetchedRequestsFromService = await fetchStudentEventRequestsService(userId);
      userRequests.value = fetchedRequestsFromService;
    } catch (err) {
      await _handleFetchError("fetching user event requests", err);
      userRequests.value = [];
    } finally {
      isLoadingUserRequests.value = false;
    }
  }

  function removeUserRequestById(eventId: string): void {
    userRequests.value = userRequests.value.filter(request => request.id !== eventId);
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
    userRequests.value = []; // Clear user requests as well
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

  async function updateMyProfile(updates: Partial<Omit<UserData, 'uid' | 'email' | 'createdAt' | 'xpData' | 'lastLogin' | 'profileUpdatedAt'>>) { // Removed participatedEventIDs and organizedEventIDs
    if (!studentId.value) {
      notificationStore.showNotification({ message: "You must be logged in to update your profile.", type: 'error'});
      return false;
    }
    isLoading.value = true; actionError.value = null;
    try {
      // Call the service function to update the backend
      await updateStudentProfileService(studentId.value, updates);

      // If successful, update local store state
      if (currentStudent.value) {
        // Create a new object for currentStudent to ensure reactivity
        const updatedStudentData = { ...currentStudent.value };

        // Apply updates to the local copy
        for (const key in updates) {
          if (Object.prototype.hasOwnProperty.call(updates, key)) {
            // Type assertion as updates can have various keys from UserData
            (updatedStudentData as any)[key] = (updates as any)[key];
          }
        }
        // lastUpdatedAt is handled by the service, but if we want to reflect it immediately:
        // updatedStudentData.lastUpdatedAt = now(); // or get it from service response if available/needed
        
        currentStudent.value = deepClone(updatedStudentData); // Use deepClone for safety

        if (updates.name !== undefined) { // Check if name was part of the updates
          _updateNameCache(studentId.value, updates.name ?? null);
        }
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
      const enrichedData = await fetchStudentDataService(targetStudentId);
      if (enrichedData) {
        viewedStudentProfile.value = enrichedData;
        _updateNameCache(enrichedData.uid, enrichedData.name ?? null);

        // Use direct event queries instead of stored IDs
        const projects = await fetchStudentPortfolioProjectsService(targetStudentId);
        viewedStudentProjects.value = projects;

        const history = await fetchStudentEventHistoryService(targetStudentId);
        viewedStudentEventHistory.value = history;
        
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

  async function fetchCurrentUserPortfolioData() {
    if (!studentId.value) {
      currentUserPortfolioData.value = { projects: [], eventParticipationCount: 0 };
      return;
    }
    isLoading.value = true;
    try {
      const studentProfile = currentStudent.value;
      if (!studentProfile) throw new Error("Current student profile not loaded.");

      // Use the fallback function to get participation count
      const studentEvents = await fetchStudentEventsWithFallback(studentProfile.uid);
      currentUserPortfolioData.value.eventParticipationCount = studentEvents.length;

      // Try to fetch projects, but fall back gracefully if it fails
      try {
        const projects = await fetchStudentPortfolioProjectsService(studentProfile.uid);
        currentUserPortfolioData.value.projects = projects;
      } catch (projectError) {
        console.warn("Failed to fetch portfolio projects, using empty array:", projectError);
        currentUserPortfolioData.value.projects = [];
      }

    } catch (err) {
      await _handleOpError("fetching current user portfolio data", err, studentId.value);
      currentUserPortfolioData.value = { projects: [], eventParticipationCount: 0 };
    } finally {
      isLoading.value = false;
    }
  }

  async function fetchCurrentUserComprehensivePortfolioData(): Promise<StudentPortfolioGenerationData | null> {
    if (!studentId.value) {
      return null;
    }
    isLoading.value = true;
    try {
      const studentProfile = currentStudent.value;
      if (!studentProfile) throw new Error("Current student profile not loaded.");

      // Try to fetch comprehensive data, but fall back gracefully if it fails
      try {
        const comprehensiveData = await fetchComprehensivePortfolioDataService(studentProfile.uid);
        currentUserPortfolioData.value.comprehensiveData = comprehensiveData;
        return comprehensiveData;
      } catch (comprehensiveError) {
        console.warn("Failed to fetch comprehensive portfolio data:", comprehensiveError);
        return null;
      }

    } catch (err) {
      await _handleOpError("fetching comprehensive portfolio data", err, studentId.value);
      return null;
    } finally {
      isLoading.value = false;
    }
  }

  async function loadLeaderboardUsers(): Promise<EnrichedStudentData[]> {
    isLoading.value = true;
    error.value = null;
    fetchError.value = null;

    try {
      // Call the new service function
      const enrichedUsers = await fetchLeaderboardDataService();

      if (enrichedUsers.length === 0) {
        // Set a specific fetchError if no users are returned, distinct from a catched error
        fetchError.value = "Leaderboard data is currently empty or could not be processed by the service.";
        // Optionally, show a non-error notification or handle as needed
        // notificationStore.showNotification({ message: fetchError.value, type: 'info' });
      }

      // Update name cache from the fetched users
      enrichedUsers.forEach(user => {
        _updateNameCache(user.uid, user.name ?? null); // Ensure name is string | null for cache
      });

      return enrichedUsers;
    } catch (err) {
      await _handleFetchError("loading leaderboard users", err);
      return []; // Return empty array on error, _handleFetchError sets fetchError.value
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
            // Call the service function for UIDs not found in cache
            const serviceFetchedNames = await fetchUserNamesBatchService(idsToFetchFromDB);
            
            // Merge service results into namesMap and update cache
            for (const id in serviceFetchedNames) {
                if (Object.prototype.hasOwnProperty.call(serviceFetchedNames, id)) {
                    const nameVal = serviceFetchedNames[id];
                    if (nameVal) {
                        namesMap[id] = nameVal;
                        _updateNameCache(id, nameVal); 
                    }
                }
            }
            
            // Handle any IDs that the service might not have found (it should provide placeholders)
             idsToFetchFromDB.forEach(id => {
                if (!namesMap[id]) {
                    // The service fetchUserNamesBatch is expected to return placeholders for unfound IDs.
                    // If it doesn't, this line might be needed, but service should handle it.
                    // const unknownName = `Student (${id.substring(0,5)})`;
                    // namesMap[id] = unknownName;
                    // _updateNameCache(id, unknownName ?? null); 
                }
            });
        } catch (err) {
            await _handleOpError("fetching user names batch", err); 
            // Provide error placeholders for UIDs that failed to fetch
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

  async function fetchAllStudentProfiles(): Promise<UserData[]> { 
    if (allUsers.value.length > 0 && !(studentAppStore as any).forceRefetchAllUsers) { // Added forceRefetch check
      return allUsers.value;
    }
    isLoading.value = true;
    fetchError.value = null;
    try {
      // Call the service function
      const fetchedUsers = await fetchAllStudentProfilesService();
      
      allUsers.value = fetchedUsers;
      // Update name cache from the fetched users
      fetchedUsers.forEach(user => {
        _updateNameCache(user.uid, user.name ?? null); 
      });
      studentAppStore.clearForceProfileRefetch(); // Corrected action name
      return fetchedUsers;
    } catch (err) {
      await _handleFetchError("fetching all student profiles", err);
      return []; 
    } finally {
      isLoading.value = false;
    }
  }

  // Expose a way to unsubscribe if needed, e.g. on app teardown.
  const unsubscribeProfileAuthListener = () => {
    // No longer necessary as the listener is removed.
    // This function can be kept for now to avoid breaking changes if it's called elsewhere,
    // or it can be removed if it's confirmed to be unused.
    /*
    if (unsubscribeAuthStateListener) {
      unsubscribeAuthStateListener();
      unsubscribeAuthStateListener = null;
    }
    */
  };

  // --- Image Upload Functions ---
  /**
   * Upload an image file to Cloudinary with enhanced format handling
   * @param file The file to upload
   * @param options Upload options
   * @returns Promise with the download URL
   */
  async function uploadProfileImage(file: File, options: ImageUploadOptions = {}): Promise<string> {
    if (!studentId.value) {
      throw new Error("You must be logged in to upload a profile image.");
    }

    imageUploadState.value = {
      status: UploadStatus.Uploading,
      progress: 0,
      error: null,
      fileName: file.name,
      downloadURL: null
    };

    try {
      if (!file.type.startsWith('image/')) {
        throw new Error("Only image files are allowed.");
      }
      const maxSizeMB = options.maxSizeMB || 2;
      if (file.size > maxSizeMB * 1024 * 1024) {
        throw new Error(`File size exceeds ${maxSizeMB}MB limit.`);
      }

      let fileToUpload = file;
      
      // Only apply compression if specified and it's not already handled by storage service
      if (options.maxWidthOrHeight && options.maxWidthOrHeight < 1200) {
        try {
          const imageCompression = await import('browser-image-compression')
            .then(module => module.default)
            .catch(() => null);
          if (imageCompression) {
            fileToUpload = await imageCompression(file, {
              maxSizeMB: options.maxSizeMB || 2,
              maxWidthOrHeight: options.maxWidthOrHeight,
              useWebWorker: true,
              fileType: 'image/jpeg', // Ensure JPEG output
              initialQuality: options.quality || 0.85 // Use initialQuality instead of quality
            });
            imageUploadState.value.fileName = fileToUpload.name;
          }
        } catch (compressionError) {
          console.warn("Image compression failed, using storage service conversion:", compressionError);
        }
      }

      // Delete old profile image if it exists
      if (currentStudent.value?.photoURL) {
        try {
          await deleteFileByUrlService(currentStudent.value.photoURL);
        } catch (deleteError) {
          console.warn("Failed to delete old profile image:", deleteError);
        }
      }

      // Upload the file with progress callback - storage service handles format conversion
      const downloadURL = await uploadFileService(
        fileToUpload,
        `${studentId.value}_${Date.now()}_profile`,
        (progress: number) => {
          imageUploadState.value.progress = progress;
        }
      );

      imageUploadState.value = {
        status: UploadStatus.Success,
        progress: 100,
        error: null,
        fileName: fileToUpload.name,
        downloadURL
      };
      return downloadURL;

    } catch (err: any) {
      imageUploadState.value = {
        status: UploadStatus.Error,
        progress: imageUploadState.value.progress,
        error: err?.message || "Upload failed due to an unexpected error.",
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
   * Get optimized profile image URL using Cloudinary SDK
   * @param imageUrl Original image URL
   * @param size Desired size (width and height)
   * @param quality Image quality (1-100)
   * @returns Optimized image URL
   */
  function getOptimizedProfileImageUrl(
    imageUrl: string, 
    size: number = 400, 
    quality: number = 80
  ): string {
    return getOptimizedImageUrl(imageUrl, { width: size, height: size, quality });
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

  /**
   * Clear all error states (error, actionError, fetchError)
   */
  function clearError(): void {
    error.value = null;
    actionError.value = null;
    fetchError.value = null;
  }


  return {
    currentStudent,
    isLoading, // General store loading
    isLoadingUserRequests, // Dedicated loading for user requests
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
    fetchMyProfile, // Add fetchMyProfile here
    studentSignOut,
    clearStudentSession,
    updateMyProfile,
    fetchProfileForView,
    fetchCurrentUserPortfolioData,
    fetchCurrentUserComprehensivePortfolioData,
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
    getOptimizedProfileImageUrl,
    // Expose user requests related state and actions
    userRequests,
    fetchUserRequests,
    removeUserRequestById,
    // Expose clearError
    clearError
  };
});