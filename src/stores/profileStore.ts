// src/stores/studentProfileStore.ts
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { User as FirebaseUser } from 'firebase/auth';
import { signOut as firebaseSignOut } from 'firebase/auth';
import { auth } from '@/firebase';
import { deepClone, isEmpty } from '@/utils/eventUtils';
import { useNotificationStore } from './notificationStore';
import { useAppStore } from './appStore';
import type { EnrichedStudentData, StudentEventHistoryItem, UserData, StudentPortfolioGenerationData, AvatarUploadState } from '@/types/student';
import { type Event } from '@/types/event';
import type { NameCacheEntry, StudentPortfolioProject, ImageUploadOptions } from '@/types/student';
import { UploadStatus } from '@/types/student';
import { handleAuthError as formatAuthErrorUtil, handleFirestoreError as formatFirestoreErrorUtil } from '@/utils/errorHandlers';
import { 
    fetchStudentData as fetchStudentDataService,
    updateStudentProfile as updateStudentProfileService,
    fetchUserNamesBatch as fetchUserNamesBatchService,
    fetchAllStudentProfiles as fetchAllStudentProfilesService,
    fetchLeaderboardData as fetchLeaderboardDataService,
    deleteAvatar as deleteAvatarService,
    updateAvatarUrl as updateAvatarUrlService
} from '@/services/profileService';
import {
    fetchStudentPortfolioProjects as fetchStudentPortfolioProjectsService,
    fetchStudentEventHistory as fetchStudentEventHistoryService,
    fetchComprehensivePortfolioData as fetchComprehensivePortfolioDataService
} from '@/services/portfolioService';
import { fetchMyEventRequests as fetchStudentEventRequestsService } from '@/services/eventService/eventQueries';
import { fetchStudentEventsWithFallback } from '@/services/eventService/eventQueries';
import { uploadAvatarService } from '@/services/storageService';

const NAME_CACHE_TTL = 15 * 60 * 1000; // 15 minutes

export const useProfileStore = defineStore('studentProfile', () => {
  const notificationStore = useNotificationStore();
  const studentAppStore = useAppStore();

  const currentStudent = ref<EnrichedStudentData | null>(null);
  const viewedStudentProfile = ref<EnrichedStudentData | null>(null);
  const viewedStudentProjects = ref<StudentPortfolioProject[]>([]);
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
  const nameCache = ref<Map<string, NameCacheEntry>>(new Map());
  const isLoading = ref<boolean>(false);
  const error = ref<string | null>(null);
  const actionError = ref<string | null>(null);
  const fetchError = ref<string | null>(null);
  const userRequests = ref<Event[]>([]);
  const isLoadingUserRequests = ref<boolean>(false);
  const hasFetched = ref<boolean>(false);

  const avatarUploadState = ref<AvatarUploadState>({
    status: UploadStatus.Idle,
    progress: 0,
    error: null,
    fileName: null,
    downloadURL: null
  });

  const studentId = computed(() => currentStudent.value?.uid || null);
  const studentName = computed(() => currentStudent.value?.name || 'Student');
  const studentBatchYear = computed(() => currentStudent.value?.batchYear || null);
  const studentXP = computed(() => currentStudent.value?.xpData?.totalCalculatedXp || 0);
  const currentStudentPhotoURL = computed(() => currentStudent.value?.photoURL || null);
  const isAuthenticated = computed(() => !!currentStudent.value?.uid);
  const getAllUsers = computed(() => allUsers.value);

  const getCachedStudentName = (uid: string): string | undefined => {
    const entry = nameCache.value.get(uid);
    if (entry && (Date.now() - entry.timestamp < NAME_CACHE_TTL)) {
      return entry.name;
    }
    return undefined;
  };

  function _updateNameCache(uid: string, name: string | null) {
    if (name) {
      nameCache.value.set(uid, { name, timestamp: Date.now() });
    } else {
      nameCache.value.delete(uid);
    }
  }

  async function _handleAuthError(operation: string, err: unknown, _uid?: string): Promise<void> {
    const formattedMessage = formatAuthErrorUtil(err);
    let finalMessage: string;

    if (formattedMessage === 'An authentication error occurred. Please try again.' || 
        (err instanceof Error && formattedMessage === err.message && (err.message.toLowerCase().includes("unknown") || err.message.toLowerCase().includes("error occurred")))) {
      finalMessage = err instanceof Error ? `${operation}: ${err.message}` : `An unknown error occurred during ${operation}.`;
    } else {
      finalMessage = formattedMessage;
    }
    
    error.value = finalMessage;
    notificationStore.showNotification({ message: finalMessage, type: 'error' });
  }

  async function _handleOpError(operation: string, err: unknown, _uid?: string): Promise<void> {
    let finalMessage: string;

    if (err && typeof err === 'object' && 'code' in err && typeof (err as { code: unknown }).code === 'string') {
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
    
    actionError.value = finalMessage;
    notificationStore.showNotification({ message: finalMessage, type: 'error' });
  }

  async function _handleFetchError(operation: string, err: unknown): Promise<void> {
    let finalMessage: string;

    if (err && typeof err === 'object' && 'code' in err && typeof (err as { code: unknown }).code === 'string') {
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
    fetchError.value = finalMessage;
  }

  async function handleAuthStateChange(firebaseUser: FirebaseUser | null) {
    if (isLoading.value) {
      return;
    }

    isLoading.value = true;
    error.value = null;
    actionError.value = null;
    fetchError.value = null;
    
    if (firebaseUser) {
      try {
        const enrichedData = await fetchStudentDataService(firebaseUser.uid);
        
        if (enrichedData) {
          currentStudent.value = enrichedData;
          _updateNameCache(enrichedData.uid, enrichedData.name ?? null);
          await fetchCurrentUserPortfolioData();
          hasFetched.value = true;
        } else {
          currentStudent.value = null;
          hasFetched.value = true;
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
        currentStudent.value = null;
        hasFetched.value = true;
        notificationStore.showNotification({ 
          message: "We couldn't load your profile due to a permissions error. Please contact an admin.",
          type: 'error',
          duration: 10000
        });
      }
    } else {
      await clearStudentSession(false);
    }
    
    isLoading.value = false;
    
    if (!studentAppStore.hasFetchedInitialAuth) {
      studentAppStore.setHasFetchedInitialAuth(true);
    }
    
    if (currentStudent.value && allUsers.value.length === 0) {
      try {
        await fetchAllStudentProfiles();
      } catch (err) {
        console.warn('Error fetching all student profiles:', err);
      }
    }
  }

  async function fetchMyProfile(): Promise<EnrichedStudentData | null> {
    if (!studentId.value) {
      error.value = "User not authenticated. Cannot fetch profile.";
      currentStudent.value = null;
      return null;
    }
    isLoading.value = true;
    error.value = null;
    actionError.value = null;
    try {
      const enrichedData = await fetchStudentDataService(studentId.value);
      if (enrichedData) {
        currentStudent.value = deepClone(enrichedData);
        _updateNameCache(enrichedData.uid, enrichedData.name ?? null);
        hasFetched.value = true;
        return currentStudent.value;
      } else {
        error.value = "Failed to fetch profile data. Profile not found for UID: " + studentId.value;
        notificationStore.showNotification({ message: error.value, type: 'error' });
        currentStudent.value = null;
        return null;
      }
    } catch (err) {
      await _handleOpError("fetching own profile", err, studentId.value);
      currentStudent.value = null;
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
        } catch (e: unknown) {
        }
    }
    currentStudent.value = null;
    viewedStudentProfile.value = null;
    viewedStudentProjects.value = [];
    viewedStudentEventHistory.value = [];
    currentUserPortfolioData.value = { projects: [], eventParticipationCount: 0 };
    userRequests.value = [];
    hasFetched.value = false;
  }

  async function studentSignOut() {
    isLoading.value = true;
    try {
      await clearStudentSession(false);
    } catch (err: unknown) {
      await _handleAuthError("clearing student session on sign out", err);
    } finally {
      isLoading.value = false;
    }
  }

  async function updateMyProfile(updates: Partial<Omit<UserData, 'uid' | 'email' | 'createdAt' | 'xpData' | 'lastLogin' | 'profileUpdatedAt'>>) {
    if (!studentId.value) {
      notificationStore.showNotification({ message: "You must be logged in to update your profile.", type: 'error'});
      return false;
    }
    isLoading.value = true; actionError.value = null;
    try {
      await updateStudentProfileService(studentId.value, updates);

      if (currentStudent.value) {
        const updatedStudentData = { ...currentStudent.value };

        for (const key in updates) {
          if (Object.prototype.hasOwnProperty.call(updates, key)) {
            (updatedStudentData as Record<string, unknown>)[key] = (updates as Record<string, unknown>)[key];
          }
        }
        
        currentStudent.value = deepClone(updatedStudentData);

        if (updates.name !== undefined) {
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

      const studentEvents = await fetchStudentEventsWithFallback(studentProfile.uid);
      currentUserPortfolioData.value.eventParticipationCount = studentEvents.length;

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
      const enrichedUsers = await fetchLeaderboardDataService();

      if (enrichedUsers.length === 0) {
        fetchError.value = "Leaderboard data is currently empty or could not be processed by the service.";
      }

      enrichedUsers.forEach(user => {
        _updateNameCache(user.uid, user.name ?? null);
      });

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
            const serviceFetchedNames = await fetchUserNamesBatchService(idsToFetchFromDB);
            
            for (const id in serviceFetchedNames) {
                if (Object.prototype.hasOwnProperty.call(serviceFetchedNames, id)) {
                    const nameVal = serviceFetchedNames[id];
                    if (nameVal) {
                        namesMap[id] = nameVal;
                        _updateNameCache(id, nameVal); 
                    }
                }
            }
            
             idsToFetchFromDB.forEach(id => {
                if (!namesMap[id]) {
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
    }
  }

  async function fetchAllStudentProfiles(): Promise<UserData[]> { 
    if (allUsers.value.length > 0 && !studentAppStore.forceRefetchAllUsers) {
      return allUsers.value;
    }
    isLoading.value = true;
    fetchError.value = null;
    try {
      const fetchedUsers = await fetchAllStudentProfilesService();
      
      allUsers.value = fetchedUsers;
      fetchedUsers.forEach(user => {
        _updateNameCache(user.uid, user.name ?? null); 
      });
      studentAppStore.clearForceProfileRefetch();
      return fetchedUsers;
    } catch (err) {
      await _handleFetchError("fetching all student profiles", err);
      return []; 
    } finally {
      isLoading.value = false;
    }
  }

  const unsubscribeProfileAuthListener = () => {
  };

  async function uploadAvatar(file: File, options: ImageUploadOptions = {}): Promise<string> {
    if (!studentId.value) {
      throw new Error("You must be logged in to upload a profile image.");
    }

    avatarUploadState.value = {
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
      
      if (options.maxWidthOrHeight && options.maxWidthOrHeight < 1200) {
        try {
          const imageCompression = (await import('browser-image-compression')).default;
          fileToUpload = await imageCompression(file, {
            maxSizeMB: options.maxSizeMB || 2,
            maxWidthOrHeight: options.maxWidthOrHeight,
            useWebWorker: true,
            fileType: 'image/jpeg',
            initialQuality: options.quality || 0.85
          });
          avatarUploadState.value.fileName = fileToUpload.name;
        } catch (compressionError) {
          console.warn("Image compression failed, using storage service conversion:", compressionError);
        }
      }

      if (currentStudent.value?.photoURL) {
        try {
          await deleteAvatarService(currentStudent.value.photoURL);
        } catch (deleteError) {
          console.warn("Failed to delete old profile image:", deleteError);
        }
      }

      const downloadURL = await uploadAvatarService(
        studentId.value,
        fileToUpload,
        (progress: number) => {
          avatarUploadState.value.progress = progress;
        }
      );

      avatarUploadState.value = {
        status: UploadStatus.Success,
        progress: 100,
        error: null,
        fileName: fileToUpload.name,
        downloadURL
      };

      await updateAvatarUrlService(studentId.value, downloadURL);
      if(currentStudent.value) {
        currentStudent.value.photoURL = downloadURL;
      }

      return downloadURL;

    } catch (err: any) {
      avatarUploadState.value = {
        status: UploadStatus.Error,
        progress: avatarUploadState.value.progress,
        error: err?.message || "Upload failed due to an unexpected error.",
        fileName: file.name,
        downloadURL: null
      };
      throw err;
    }
  }

  async function updateAvatar(file: File, options: ImageUploadOptions = {}): Promise<boolean> {
    if (!studentId.value) {
      notificationStore.showNotification({ message: "You must be logged in to update your profile image.", type: 'error'});
      return false;
    }
    
    actionError.value = null;
    isLoading.value = true;
    
    try {
      await uploadAvatar(file, options);
      notificationStore.showNotification({ message: "Profile image updated successfully!", type: 'success' });
      return true;
    } catch (err: unknown) {
      await _handleOpError("updating profile image", err, studentId.value);
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  function resetAvatarUploadState(): void {
    avatarUploadState.value = {
      status: UploadStatus.Idle,
      progress: 0,
      error: null,
      fileName: null,
      downloadURL: null
    };
  }

  function clearError(): void {
    error.value = null;
    actionError.value = null;
    fetchError.value = null;
  }


  return {
    currentStudent,
    isLoading,
    isLoadingUserRequests,
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
    isAuthenticated,
    getCachedStudentName,
    handleAuthStateChange,
    fetchMyProfile,
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
    avatarUploadState,
    uploadAvatar,
    updateAvatar,
    resetAvatarUploadState,
    userRequests,
    fetchUserRequests,
    removeUserRequestById,
    clearError
  };
});