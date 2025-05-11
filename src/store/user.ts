// src/store/user.ts
import { defineStore } from 'pinia';
import {
  doc, getDoc, updateDoc, collection, query, where, getDocs, orderBy, Timestamp
} from 'firebase/firestore';
import { db } from '@/firebase';
import { Event as AppEvent, EventStatus, Submission } from '@/types/event'; // Added Submission
import { Project } from '@/types/project';
import {
  UserState,
  UserProfileUpdatePayload,
  ViewedUserProfile,
  UserProject,
  UserData,
  XpRoleKey,
  defaultXpStructure
} from '@/types/user';

// Define the user store
export const useUserStore = defineStore('user', {
  // State
  state: (): UserState => ({
    currentUser: null,
    isAuthenticated: false,
    nameCache: new Map(),
    hasFetched: false,
    viewedUserProfile: null,
    viewedUserProjects: [],
    viewedUserEvents: [],
    userRequests: [],
    currentUserPortfolioData: {
      projects: [],
      eventParticipationCount: 0
    },
    allUsers: [],
    studentList: [],
    leaderboardUsers: [],
    loading: false,
    error: null
  }),

  // Getters
  getters: {
    uid: (state) => state.currentUser?.uid || null,
    currentUserTotalXp: (state) => {
      if (!state.currentUser?.xpByRole) return 0;
      return Object.values(state.currentUser.xpByRole).reduce(
        (sum, val) => sum + (Number(val) || 0), 0
      );
    },
    getViewedUserProfile: (state): ViewedUserProfile | null => state.viewedUserProfile,
    getViewedUserProjects: (state): UserProject[] => state.viewedUserProjects,
    getViewedUserEvents: (state): AppEvent[] => state.viewedUserEvents,
    currentUserProjectsForPortfolio: (state): Project[] => state.currentUserPortfolioData.projects,
    currentUserEventParticipationCount: (state): number => state.currentUserPortfolioData.eventParticipationCount,
    getCachedUserName: (state) => {
      return (userId: string): string | null => {
        const cachedEntry = state.nameCache.get(userId);
        return cachedEntry?.name || null;
      };
    },
    getAllUsers: (state): UserData[] => state.allUsers,
    getStudentList: (state): UserData[] => state.studentList,
    profilePictureUrl: (state): string | null => state.currentUser?.photoURL ?? null, // Getter for profile picture
    
    // Added getter, though not strictly necessary with state reset in clearUserData
    // Might be useful if other parts of the app want to react to this directly.
    getHasFetched: (state): boolean => state.hasFetched,
  },

  // Actions
  actions: {
    async fetchUserData(userId: string): Promise<UserData | null> {
      this.loading = true;
      this.error = null;
      try {
        if (!userId) {
          throw new Error("User ID is required");
        }
        const userDocRef = doc(db, 'users', userId);
        const userDocSnap = await getDoc(userDocRef);
        if (!userDocSnap.exists()) {
          if (this.currentUser?.uid === userId || !this.currentUser) { // also handle case where currentUser was null
            this.currentUser = null;
            this.isAuthenticated = false;
          }
          return null;
        }
        const userDataFromDb = userDocSnap.data() as Omit<UserData, 'uid' | 'xpByRole'> & { xpByRole?: Partial<Record<XpRoleKey, number>> };
        const userWithId: UserData = {
             ...userDataFromDb,
             uid: userDocSnap.id,
             xpByRole: { ...defaultXpStructure, ...(userDataFromDb.xpByRole || {}) }
        };
        // Only set as currentUser if the fetched userId matches the intended current user context
        // This avoids overwriting currentUser if fetchUserData is called for a different profile view
        if (this.uid === userId || !this.isAuthenticated) { // Check if current user or if no user is currently authenticated
            this.currentUser = userWithId;
            this.isAuthenticated = true; // Mark as authenticated since profile exists
        }

        // Update name cache
        if (userWithId.name) {
            this.nameCache.set(userWithId.uid, { name: userWithId.name, timestamp: Date.now() });
        }

        return userWithId;
      } catch (error: any) {
        this.error = error;
        console.error('Error fetching user data:', error);
        if (this.currentUser?.uid === userId || !this.currentUser) {
            this.currentUser = null;
            this.isAuthenticated = false;
        }
        return null;
      } finally {
        this.loading = false;
      }
    },

    async clearUserData(): Promise<void> {
      this.currentUser = null;
      this.isAuthenticated = false;
      // this.hasFetched = false; // Controversial: depends on if you want to re-trigger initial auth logic
                                // For logout, keeping hasFetched=true is fine. For full app reset, false.
                                // Let's assume for logout, we keep hasFetched as true.

      // Resetting fields related to a viewed profile or current user's specific data
      this.viewedUserProfile = null;
      this.viewedUserProjects = [];
      this.viewedUserEvents = [];
      this.userRequests = [];
      this.currentUserPortfolioData = {
        projects: [],
        eventParticipationCount: 0
      };
      // Name cache, allUsers, studentList, leaderboardUsers are typically kept
      // as they represent global app data, not specific to the logged-in user.
      // If you want a full reset, clear them too:
      // this.nameCache.clear();
      // this.allUsers = [];
      // this.studentList = [];
      // this.leaderboardUsers = [];
      this.error = null; // Clear any previous errors
    },

    // Add setHasFetched action
    setHasFetched(status: boolean): void {
      this.hasFetched = status;
    },


    async updateUserProfile(payload: UserProfileUpdatePayload): Promise<void> {
      this.loading = true;
      this.error = null;
      try {
        const { userId, profileData } = payload;
        if (!userId) {
          throw new Error("User ID is required");
        }
        const userDocRef = doc(db, 'users', userId);
        await updateDoc(userDocRef, profileData);
        if (this.currentUser?.uid === userId) {
          // Create a new object for currentUser to ensure reactivity
          this.currentUser = { ...this.currentUser, ...profileData };
          // Update name cache if name changed
          if (profileData.name && this.nameCache.get(userId)?.name !== profileData.name) {
            this.nameCache.set(userId, { name: profileData.name, timestamp: Date.now() });
          }
        }
      } catch (error: any) {
        this.error = error;
        console.error('Error updating user profile:', error);
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async fetchFullUserProfileForView(userId: string): Promise<void> {
      this.loading = true;
      this.error = null;
      try {
        this.viewedUserProfile = null;
        this.viewedUserProjects = [];
        this.viewedUserEvents = [];

        const userDocRef = doc(db, 'users', userId);
        const userDocSnap = await getDoc(userDocRef);
        if (!userDocSnap.exists()) {
          throw new Error("User profile not found");
        }
        const userDataFromDb = userDocSnap.data() as Omit<UserData, 'uid' | 'xpByRole' | 'email'> & { xpByRole?: Partial<Record<XpRoleKey, number>>, email?: string | null };
        this.viewedUserProfile = {
          ...userDataFromDb,
          uid: userDocSnap.id,
          name: userDataFromDb.name || 'Unknown User',
          xpByRole: { ...defaultXpStructure, ...(userDataFromDb.xpByRole || {}) },
          skills: userDataFromDb.skills || [],
          preferredRoles: userDataFromDb.preferredRoles || [],
          participatedEvent: userDataFromDb.participatedEvent || [],
          organizedEvent: userDataFromDb.organizedEvent || [],
          hasLaptop: userDataFromDb.hasLaptop === undefined ? false : userDataFromDb.hasLaptop,
          email: userDataFromDb.email || null,        
        };

        await this.fetchUserEvents(userId);        
        await this.fetchUserProjects(userId, this.viewedUserEvents);
      } catch (error: any) {
        this.error = error;
        console.error('Error fetching user profile for view:', error);
      } finally {
        this.loading = false;
        // Additional logic if needed
      }
    },

    async fetchUserEvents(userId: string): Promise<void> {
      if (!this.viewedUserProfile && this.currentUser?.uid !== userId) {
          this.viewedUserEvents = [];
          return;
      }
      this.error = null;
      try {
        // Use viewedUserProfile if available, otherwise fallback to currentUser if it's for the current user
        const profileToUse = this.viewedUserProfile?.uid === userId ? this.viewedUserProfile : (this.currentUser?.uid === userId ? this.currentUser : null);

        if (!profileToUse) {
            this.viewedUserEvents = [];
            return;
        }

        const participatedIds = profileToUse.participatedEvent || [];
        const organizedIds = profileToUse.organizedEvent || [];
        const allIds = Array.from(new Set([...participatedIds, ...organizedIds])).filter(Boolean);

        if (allIds.length === 0) {
          this.viewedUserEvents = [];
          return;
        }

        const events: AppEvent[] = [];
        // Firestore 'in' query supports up to 30 elements per query
        const batchSize = 30;

        for (let i = 0; i < allIds.length; i += batchSize) {
          const batchIds = allIds.slice(i, i + batchSize);
          if (batchIds.length === 0) continue;

          const eventsRef = collection(db, 'events');
          const q = query(eventsRef, where('__name__', 'in', batchIds));
          const snapshot = await getDocs(q);
          snapshot.forEach(docSnap => {
            events.push({ id: docSnap.id, ...docSnap.data() } as AppEvent);
          });
        }

        const excludedStatuses = [EventStatus.Pending, EventStatus.Cancelled, EventStatus.Rejected];
        const isTargetCurrentUser = userId === this.currentUser?.uid;

        const filteredEvents = events.filter(event => {
          if (isTargetCurrentUser) {
            return !excludedStatuses.includes(event.status as EventStatus);
          } else {
            return [EventStatus.Completed, EventStatus.Closed, EventStatus.InProgress, EventStatus.Approved]
              .includes(event.status as EventStatus);
          }
        });

        if(this.viewedUserProfile?.uid === userId) {
            this.viewedUserEvents = filteredEvents;
        } else if (this.currentUser?.uid === userId) {
            // If fetching for current user and no specific viewedUserProfile is set (e.g., direct call)
            // This path might be less common now with fetchFullUserProfileForView
            this.viewedUserEvents = filteredEvents; // Or decide if this should populate a different state property
        }


      } catch (error: any) {
        console.error(`Error fetching user events for ${userId}:`, error);
        this.error = error.message || 'Failed to fetch user events.';
        if(this.viewedUserProfile?.uid === userId) this.viewedUserEvents = [];
      }
    },

    async fetchUserProjects(userId: string, eventsToScan?: AppEvent[]): Promise<void> {
      this.error = null;
      const userProjects: UserProject[] = [];
      try {
        if (!userId) {
          this.viewedUserProjects = [];
          return;
        }

        let eventsData = eventsToScan;
        if (!eventsData) {
            // If eventsToScan is not provided, fetch them based on the user's profile
            // This assumes viewedUserProfile or currentUser has participated/organized event IDs
            const profileToUse = this.viewedUserProfile?.uid === userId ? this.viewedUserProfile : (this.currentUser?.uid === userId ? this.currentUser : null);
            if (profileToUse) {
                const participatedIds = profileToUse.participatedEvent || [];
                const organizedIds = profileToUse.organizedEvent || [];
                const allEventIds = Array.from(new Set([...participatedIds, ...organizedIds])).filter(Boolean);

                if (allEventIds.length > 0) {
                    const tempEvents: AppEvent[] = [];
                    const batchSize = 30;
                    for (let i = 0; i < allEventIds.length; i += batchSize) {
                        const batchIds = allEventIds.slice(i, i + batchSize);
                        if (batchIds.length === 0) continue;
                        const eventsRef = collection(db, 'events');
                        const q = query(eventsRef, where('__name__', 'in', batchIds));
                        const snapshot = await getDocs(q);
                        snapshot.forEach(docSnap => {
                            tempEvents.push({ id: docSnap.id, ...docSnap.data() } as AppEvent);
                        });
                    }
                    eventsData = tempEvents;
                } else {
                    eventsData = [];
                }
            } else {
                eventsData = [];
            }
        }


        if (!Array.isArray(eventsData) || eventsData.length === 0) {
          this.viewedUserProjects = [];
          return;
        }

        for (const eventData of eventsData) {
          if (eventData.submissions && Array.isArray(eventData.submissions)) {
            eventData.submissions.forEach((submission: Submission) => {
              if (submission.submittedBy === userId) {
                userProjects.push({
                  id: `${eventData.id}-${submission.projectName.replace(/\s+/g, '-')}-${submission.submittedBy}`, // More robust unique ID
                  projectName: submission.projectName,
                  link: submission.link,
                  description: submission.description || '', // Ensure description is string
                  eventId: eventData.id,
                  eventName: eventData.details?.eventName || 'Unknown Event',
                  submittedAt: submission.submittedAt,
                });
              }
            });
          }
        }

        userProjects.sort((a, b) => {
            const timeA = a.submittedAt instanceof Timestamp ? a.submittedAt.toMillis() : (typeof a.submittedAt === 'number' ? a.submittedAt : 0);
            const timeB = b.submittedAt instanceof Timestamp ? b.submittedAt.toMillis() : (typeof b.submittedAt === 'number' ? b.submittedAt : 0);
            return timeB - timeA;
        });

        this.viewedUserProjects = userProjects;

      } catch (error: any) {
        console.error(`Error fetching user projects for ${userId}:`, error);
        this.error = error.message || 'Failed to fetch user projects.';
        this.viewedUserProjects = [];
      }
    },

    async fetchCurrentUserPortfolioData(): Promise<void> {
      if (!this.currentUser?.uid) {
        this.currentUserPortfolioData = { projects: [], eventParticipationCount: 0 };
        return;
      }
      const userId = this.currentUser.uid;
      this.error = null;
      this.loading = true; // Indicate loading state for portfolio data

      try {
        const projectsForPortfolio: Project[] = [];
        let eventCount = 0;

        const participatedEventIds = this.currentUser.participatedEvent || [];
        const organizedEventIds = this.currentUser.organizedEvent || [];
        const relevantEventIds = Array.from(new Set([...participatedEventIds, ...organizedEventIds])).filter(Boolean);
        eventCount = relevantEventIds.length;

        if (relevantEventIds.length > 0) {
          const eventPromises: Promise<AppEvent | null>[] = relevantEventIds.map(eventId => {
            const eventRef = doc(db, 'events', eventId);
            return getDoc(eventRef).then(eventSnap =>
              eventSnap.exists() ? ({ id: eventSnap.id, ...eventSnap.data() } as AppEvent) : null
            );
          });
          const fetchedEvents = (await Promise.all(eventPromises)).filter(Boolean) as AppEvent[];

          for (const eventData of fetchedEvents) {
            // Filter out events that are Pending, Cancelled, or Rejected for portfolio
            if ([EventStatus.Pending, EventStatus.Cancelled, EventStatus.Rejected].includes(eventData.status as EventStatus)) {
                eventCount = Math.max(0, eventCount -1); // Decrement count for these events
                continue;
            }

            if (eventData.submissions && Array.isArray(eventData.submissions)) {
              eventData.submissions.forEach((submission: Submission) => {
                if (submission.submittedBy === userId) {
                  projectsForPortfolio.push({
                    id: `${eventData.id}-${submission.projectName.replace(/\s+/g, '-')}`,
                    projectName: submission.projectName,
                    eventName: eventData.details?.eventName || `Event (${eventData.id.substring(0,5)})`,
                    eventType: eventData.details?.type || 'Unknown',
                    description: submission.description || '',
                    link: submission.link,
                    submittedAt: submission.submittedAt,
                  });
                }
              });
            }
          }
        }

        projectsForPortfolio.sort((a, b) => {
            const timeA = a.submittedAt instanceof Timestamp ? a.submittedAt.toMillis() : (typeof a.submittedAt === 'number' ? a.submittedAt : 0);
            const timeB = b.submittedAt instanceof Timestamp ? b.submittedAt.toMillis() : (typeof b.submittedAt === 'number' ? b.submittedAt : 0);
            return timeB - timeA;
        });

        this.currentUserPortfolioData = {
          projects: projectsForPortfolio,
          eventParticipationCount: eventCount, // Use the adjusted event count
        };

      } catch (error: any) {
        console.error('Error fetching current user portfolio data:', error);
        this.error = error.message || 'Failed to fetch portfolio data.';
        this.currentUserPortfolioData = {
          projects: [],
          eventParticipationCount: 0,
        };
      } finally {
        this.loading = false;
      }
    },

    async fetchUserRequests(userId: string): Promise<void> {
      this.error = null;
      try {
        if (!userId) {
          this.userRequests = [];
          return;
        }
        const eventsRef = collection(db, 'events');
        // Fetch only Pending and Rejected requests for the "My Requests" section
        const q = query(
            eventsRef,
            where('requestedBy', '==', userId),
            where('status', 'in', [EventStatus.Pending, EventStatus.Rejected])
        );
        const snapshot = await getDocs(q);
        const requests: AppEvent[] = [];
        snapshot.forEach(docSnap => {
          requests.push({ id: docSnap.id, ...docSnap.data() } as AppEvent);
        });
        // Sort by creation date, newest first
        requests.sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0));
        this.userRequests = requests;
      } catch (error: any) {
        console.error(`Error fetching user requests for ${userId}:`, error);
        this.error = error.message || 'Failed to fetch user requests.';
        this.userRequests = [];
      }
    },

    async fetchUserNamesBatch(userIds: string[]): Promise<Record<string, string>> {
      const uniqueIds = [...new Set(userIds)].filter(id => typeof id === 'string' && id.trim() !== '');
      if (uniqueIds.length === 0) return {};

      const result: Record<string, string> = {};
      const idsToFetchFromFirestore: string[] = [];

      // Populate from cache first
      uniqueIds.forEach(id => {
        const cachedEntry = this.nameCache.get(id);
        if (cachedEntry) {
          // Optional: Check cache entry timestamp for staleness if needed
          // const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
          // if (Date.now() - cachedEntry.timestamp < CACHE_TTL) {
          result[id] = cachedEntry.name;
          // } else {
          //   idsToFetchFromFirestore.push(id); // Stale, refetch
          // }
        } else {
          idsToFetchFromFirestore.push(id);
        }
      });

      if (idsToFetchFromFirestore.length === 0) {
        return result; // All names were cached and fresh
      }

      try {
        const usersRef = collection(db, 'users');
        // Firestore 'in' query supports up to 30 elements.
        const batchSize = 30;

        for (let i = 0; i < idsToFetchFromFirestore.length; i += batchSize) {
          const batchIds = idsToFetchFromFirestore.slice(i, i + batchSize);
          if (batchIds.length === 0) continue;

          const q = query(usersRef, where('__name__', 'in', batchIds));
          const snapshot = await getDocs(q);
          snapshot.forEach(docSnap => {
            const name = docSnap.data()?.name || `User (${docSnap.id.substring(0, 5)}...)`;
            result[docSnap.id] = name;
            this.nameCache.set(docSnap.id, { name, timestamp: Date.now() });
          });
        }
        return result;
      } catch (error: any) {
        console.error('Error fetching user names batch:', error);
        // For IDs that failed to fetch, provide a fallback if they were requested
        idsToFetchFromFirestore.forEach(id => {
            if (!result[id]) result[id] = `User (${id.substring(0,5)}...)`;
        });
        return result; // Return partial results or fallbacks
      }
    },

    async fetchAllUsers(): Promise<void> {
      console.log('[fetchAllUsers] Action called. Initial state - allUsers.length:', this.allUsers.length, 'loading:', this.loading, 'error:', this.error);

      // If data exists and not currently loading, use cache.
      if (this.allUsers.length > 0 && !this.loading) {
        console.log('[fetchAllUsers] Guard 1: Using cached allUsers data as allUsers.length > 0 and not loading. Returning.');
        return;
      }
      console.log('[fetchAllUsers] Guard 1: Condition not met (allUsers.length:', this.allUsers.length, 'loading:', this.loading, ')');

      // If already loading (e.g., from another call), let the ongoing fetch complete.
      if (this.loading) {
        console.log('[fetchAllUsers] Guard 2: Store is already in a loading state (this.loading is true). Returning to let ongoing fetch complete.');
        // This is a potential point where fetchAllUsers might return prematurely if loading was set by the caller (e.g., fetchLeaderboardUsers)
        // and allUsers is empty.
        return;
      }
      console.log('[fetchAllUsers] Guard 2: Condition not met (loading:', this.loading, ')');
    
      console.log('[fetchAllUsers] Proceeding to fetch users from Firestore.');
      this.loading = true;
      this.error = null; // Clear previous errors specific to this fetch attempt
      
      const maxRetries = 3;
      let retryCount = 0;
      let lastError: any = null;
      
      while (retryCount <= maxRetries) {
        try {
          // Add a small delay before retries (but not on first attempt)
          if (retryCount > 0) {
            const delay = Math.min(1000 * Math.pow(2, retryCount - 1), 5000); // Exponential backoff with 5s max
            console.log(`[fetchAllUsers] Retrying fetchAllUsers (attempt ${retryCount}/${maxRetries}) after ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
          
          console.log(`[fetchAllUsers] Attempting getDocs (attempt ${retryCount + 1}/${maxRetries +1})`);
          const usersRef = collection(db, 'users');
          const snapshot = await getDocs(usersRef);
          console.log('[fetchAllUsers] getDocs completed. Snapshot empty:', snapshot.empty, 'Snapshot size:', snapshot.size);
          
          if (snapshot.empty) {
            console.warn('[fetchAllUsers] User collection is empty. Setting error and clearing allUsers.');
            this.allUsers = [];
            this.error = new Error('No users found in the database. The collection might be empty or inaccessible.');
            this.loading = false;
            console.log('[fetchAllUsers] Finished due to empty snapshot. Final state - allUsers.length:', this.allUsers.length, 'loading:', this.loading, 'error:', this.error);
            return;
          }
          
          const users: UserData[] = [];
          snapshot.forEach(docSnap => {
            const userDataFromDb = docSnap.data() as Omit<UserData, 'uid' | 'xpByRole'> & { xpByRole?: Partial<Record<XpRoleKey, number>> };
            const userWithId: UserData = {
              ...userDataFromDb,
              uid: docSnap.id,
              xpByRole: { ...defaultXpStructure, ...(userDataFromDb.xpByRole || {}) }
            };
            users.push(userWithId);
            if (userWithId.name) {
              this.nameCache.set(docSnap.id, { name: userWithId.name, timestamp: Date.now() });
            }
          });
          
          this.allUsers = users;
          
          console.log(`[fetchAllUsers] Successfully fetched ${users.length} users.`);
          this.loading = false;
          this.error = null; // Ensure error is null on success
          console.log('[fetchAllUsers] Finished successfully. Final state - allUsers.length:', this.allUsers.length, 'loading:', this.loading, 'error:', this.error);
          return;
        } catch (error: any) {
          lastError = error;
          console.error(`[fetchAllUsers] Error fetching users (attempt ${retryCount+1}/${maxRetries+1}):`, error);
          retryCount++;
          
          // Only continue retrying if it looks like a network or temporary issue
          if (!navigator.onLine || 
              error.code === 'unavailable' || 
              error.code === 'resource-exhausted' ||
              error.message?.includes('network') ||
              error.name === 'AbortError') {
            continue;
          } else {
            // For other types of errors, don't retry
            break;
          }
        }
      }
      
      // If we get here, all retries failed
      this.error = lastError || new Error('Failed to fetch users after multiple attempts');
      console.error('[fetchAllUsers] All attempts to fetch users failed:', this.error);
      this.allUsers = []; // Reset on error to ensure fresh fetch next time
      this.loading = false;
      console.log('[fetchAllUsers] Finished after all retries failed. Final state - allUsers.length:', this.allUsers.length, 'loading:', this.loading, 'error:', this.error);
    },

    async fetchLeaderboardUsers(): Promise<void> {
      console.log('[fetchLeaderboardUsers] Action called. Initial state - loading:', this.loading, 'error:', this.error, 'leaderboardUsers.length:', this.leaderboardUsers.length);
      this.loading = true;
      this.error = null;

      try {
        console.log('[fetchLeaderboardUsers] Calling fetchAllUsers...');
        await this.fetchAllUsers();
        console.log('[fetchLeaderboardUsers] fetchAllUsers completed. Current state - allUsers.length:', this.allUsers.length, 'loading:', this.loading, 'error:', this.error);

        if (this.error) {
          console.error('[fetchLeaderboardUsers] Error detected after fetchAllUsers:', this.error, '. Setting leaderboardUsers to empty and returning.');
          this.leaderboardUsers = [];
          // this.loading will be set to false in finally
          return;
        }
        console.log('[fetchLeaderboardUsers] No error from fetchAllUsers. Proceeding.');

        if (this.allUsers.length === 0) {
          console.warn('[fetchLeaderboardUsers] Condition: allUsers.length is 0. Error state:', this.error, '. This leads to the "unexpected" warning if error is null.');
          this.leaderboardUsers = [];
          // Optionally set an error here if this state is considered erroneous for leaderboard
          // this.error = 'Leaderboard processing failed: No user data available after fetch.';
          return;
        }
        console.log('[fetchLeaderboardUsers] allUsers.length is not 0. Proceeding to map users for leaderboard. Count:', this.allUsers.length);

        // Process users for leaderboard display
        this.leaderboardUsers = this.allUsers.map(user => ({
          ...user,
          xpByRole: { ...defaultXpStructure, ...(user.xpByRole || {}) }
        }));
        // Successfully processed, this.error remains null.
      } catch (processingError: any) {
        console.error('[fetchLeaderboardUsers] Error during leaderboard processing (map, sort):', processingError);
        this.error = processingError.message || 'An error occurred while processing leaderboard data';
        this.leaderboardUsers = [];
      } finally {
        this.loading = false;
        console.log('[fetchLeaderboardUsers] Action finished. Final state - loading:', this.loading, 'error:', this.error, 'leaderboardUsers.length:', this.leaderboardUsers.length);
      }
    },

    async fetchAllStudents(): Promise<void> {
      this.loading = true;
      this.error = null;
      try {
        const usersRef = collection(db, 'users');
        // Assuming all users are students. If there's a 'role' field, filter by it.
        // Example: const q = query(usersRef, where('role', '==', 'student'), orderBy('name', 'asc'));
        const q = query(usersRef, orderBy('name', 'asc'));
        const snapshot = await getDocs(q);

        const students: UserData[] = [];
        snapshot.forEach(docSnap => {
          const userDataFromDb = docSnap.data() as Omit<UserData, 'uid' | 'xpByRole'> & { xpByRole?: Partial<Record<XpRoleKey, number>> };
          const studentWithId: UserData = {
            ...userDataFromDb,
            uid: docSnap.id,
            xpByRole: { ...defaultXpStructure, ...(userDataFromDb.xpByRole || {}) }
          };
          students.push(studentWithId);
          if (studentWithId.name) {
            this.nameCache.set(docSnap.id, { name: studentWithId.name, timestamp: Date.now() });
          }
        });
        this.studentList = students;
      } catch (error: any) {
        this.error = error;
        console.error('Error fetching students:', error);
        this.studentList = [];
      } finally {
        this.loading = false;
      }
    },

    clearStaleCache(): void {
        const now = Date.now();
        const CACHE_TTL = 30 * 60 * 1000; // 30 minutes, adjust as needed
        this.nameCache.forEach((entry, key) => {
            if (now - entry.timestamp > CACHE_TTL) {
                this.nameCache.delete(key);
            }
        });
    },

    // Handle OneSignal external user ID setting with retry mechanism
    async setOneSignalExternalUserId(userId: string | null): Promise<boolean> {
      if (!userId) return false;
      
      // Get OneSignal from window if it exists
      const oneSignal = (window as any).OneSignal;
      if (!oneSignal) {
        console.warn('OneSignal SDK not found in global scope.');
        return false;
      }

      // Try to set the external user ID with exponential backoff
      const maxRetries = 5;
      const initialDelayMs = 500;
      
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          // Check if OneSignal is initialized and the function is available
          if (oneSignal.setExternalUserId) {
            await oneSignal.setExternalUserId(userId);
            console.log('OneSignal external user ID set successfully.');
            return true;
          } else {
            // Wait with exponential backoff
            const delayMs = initialDelayMs * Math.pow(2, attempt);
            console.log(`OneSignal setExternalUserId not available yet. Retrying in ${delayMs}ms...`);
            await new Promise(resolve => setTimeout(resolve, delayMs));
          }
        } catch (error) {
          console.error('Error setting OneSignal external user ID:', error);
          // Wait before retrying
          const delayMs = initialDelayMs * Math.pow(2, attempt);
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      }
      
      console.error('Failed to set OneSignal external user ID after maximum retries.');
      return false;
    }
  }
});