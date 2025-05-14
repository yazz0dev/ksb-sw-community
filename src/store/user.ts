// src/store/user.ts
import { defineStore } from 'pinia';
import {
  doc, getDoc, updateDoc, collection, query, where, getDocs, orderBy, Timestamp
} from 'firebase/firestore';
import { db } from '@/firebase';
import { Event as AppEvent, EventStatus, Submission } from '@/types/event';
import { Project } from '@/types/project';
import {
  UserState,
  UserProfileUpdatePayload,
  ViewedUserProfile, // This will be EnrichedUserData
  UserProject,
  UserData, // Base profile data from /users collection
  EnrichedUserData, // Combined UserData + XPData
  NameCacheEntry,
  // formatRoleName is already in types/user.ts, no need to re-import if used locally
} from '@/types/user';
import { XPData, getDefaultXPData } from '@/types/xp'; // Import XP types

// Define the user store
export const useUserStore = defineStore('user', {
  // State
  state: (): UserState => ({
    currentUser: null, // Will be EnrichedUserData | null
    isAuthenticated: false,
    nameCache: new Map<string, NameCacheEntry>(), // Explicitly type Map
    hasFetched: false,
    viewedUserProfile: null, // Will be EnrichedUserData | null
    viewedUserProjects: [],
    viewedUserEvents: [],
    userRequests: [],
    currentUserPortfolioData: {
      projects: [],
      eventParticipationCount: 0
    },
    allUsers: [], // Will be UserData[] by default, can be enriched on demand
    studentList: [], // Will be UserData[] by default
    leaderboardUsers: [], // Will be EnrichedUserData[]
    loading: false,
    error: null
  }),

  // Getters
  getters: {
    uid: (state) => state.currentUser?.uid || null,
    currentUserTotalXp: (state): number => {
      return state.currentUser?.xpData?.totalCalculatedXp ?? 0;
    },
    getViewedUserProfile: (state): ViewedUserProfile | null => state.viewedUserProfile, // Type is EnrichedUserData
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
    // These getters return base UserData. Components needing XP for these users
    // would need a separate mechanism or an "enrich" action.
    getAllUsers: (state): UserData[] => state.allUsers,
    getStudentList: (state): UserData[] => state.studentList,
    // Leaderboard users are already enriched
    getLeaderboardUsers: (state): EnrichedUserData[] => state.leaderboardUsers,

    profilePictureUrl: (state): string | null => state.currentUser?.photoURL ?? null,
    getHasFetched: (state): boolean => state.hasFetched,
  },

  // Actions
  actions: {
    async fetchUserData(userId: string): Promise<EnrichedUserData | null> {
      this.loading = true;
      this.error = null;
      try {
        if (!userId) throw new Error("User ID is required");

        // 1. Fetch base user profile data
        const userDocRef = doc(db, 'users', userId);
        const userDocSnap = await getDoc(userDocRef);
        if (!userDocSnap.exists()) {
          if (this.currentUser?.uid === userId || !this.currentUser) {
            this.currentUser = null;
            this.isAuthenticated = false;
          }
          return null;
        }
        const userDataFromDb = userDocSnap.data() as Omit<UserData, 'uid'>; // No XP here
        const baseUserData: UserData = { ...userDataFromDb, uid: userDocSnap.id };

        // 2. Fetch XP data
        const xpDocRef = doc(db, 'xp', userId);
        const xpDocSnap = await getDoc(xpDocRef);
        let userXPData: XPData;
        if (xpDocSnap.exists()) {
          userXPData = xpDocSnap.data() as XPData;
        } else {
          // If XP doc doesn't exist, use default (all zeros)
          console.warn(`XP document for user ${userId} not found. Using default XP data.`);
          userXPData = getDefaultXPData(userId);
          // Optionally, you could create the XP document here if it's missing
          // await setDoc(xpDocRef, userXPData);
        }

        // 3. Merge into EnrichedUserData
        const enrichedUser: EnrichedUserData = {
          ...baseUserData,
          xpData: userXPData,
        };

        // Update current user state if it's this user
        if (this.uid === userId || (!this.isAuthenticated && !this.currentUser)) {
            this.currentUser = enrichedUser;
            this.isAuthenticated = true;
        }

        // Update name cache
        if (enrichedUser.name) {
            this.nameCache.set(enrichedUser.uid, { name: enrichedUser.name, timestamp: Date.now() });
        }

        return enrichedUser;
      } catch (error: any) {
        this.error = error;
        console.error('Error fetching user data (profile + XP):', error);
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
      this.viewedUserProfile = null;
      this.viewedUserProjects = [];
      this.viewedUserEvents = [];
      this.userRequests = [];
      this.currentUserPortfolioData = {
        projects: [],
        eventParticipationCount: 0
      };
      this.error = null;
    },

    setHasFetched(status: boolean): void {
      this.hasFetched = status;
    },

    async updateUserProfile(payload: UserProfileUpdatePayload): Promise<void> {
      this.loading = true;
      this.error = null;
      try {
        const { userId, profileData } = payload;
        if (!userId) throw new Error("User ID is required");
        if (this.currentUser?.uid !== userId) throw new Error("Permission denied to update this profile");

        // `profileData` should NOT contain `xpData` or `xpByRole`
        if ((profileData as any).xpData || (profileData as any).xpByRole) {
            console.warn("Attempted to update XP data via updateUserProfile. This is not allowed.");
            delete (profileData as any).xpData;
            delete (profileData as any).xpByRole;
        }

        const userDocRef = doc(db, 'users', userId);
        await updateDoc(userDocRef, profileData);

        if (this.currentUser?.uid === userId) {
          // Create a new object for currentUser to ensure reactivity
          this.currentUser = {
            ...(this.currentUser as EnrichedUserData), // Cast to ensure xpData is preserved
            ...profileData,
          };
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
        this.viewedUserProfile = null; // Reset before fetching
        this.viewedUserProjects = [];
        this.viewedUserEvents = [];

        // Fetch enriched user data (profile + XP)
        const enrichedUser = await this.fetchUserData(userId); // Use the existing action

        if (!enrichedUser) {
          throw new Error("User profile not found or failed to load.");
        }
        this.viewedUserProfile = enrichedUser;

        // Fetch user's events and projects (these actions might need adjustment if they relied on XP being on the user object)
        // For now, assuming they primarily use `participatedEvent` and `organizedEvent` arrays from UserData.
        await this.fetchUserEvents(userId); // Pass the EnrichedUserData if needed by fetchUserEvents
        await this.fetchUserProjects(userId, this.viewedUserEvents); // Pass events if needed for context

      } catch (error: any) {
        this.error = error;
        this.viewedUserProfile = null; // Clear on error
        console.error('Error fetching user profile for view:', error);
      } finally {
        this.loading = false;
      }
    },

    // fetchUserEvents and fetchUserProjects remain largely the same logic
    // as they primarily use `participatedEvent` and `organizedEvent` lists
    // from the base UserData.
    async fetchUserEvents(userId: string): Promise<void> {
      if (!this.viewedUserProfile && this.currentUser?.uid !== userId) {
          this.viewedUserEvents = [];
          return;
      }
      this.error = null;
      try {
        // Use the profile data already fetched (either viewedUserProfile or currentUser)
        const profileToUse = this.viewedUserProfile?.uid === userId
                             ? this.viewedUserProfile
                             : (this.currentUser?.uid === userId ? this.currentUser : null);

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

        // Set to viewedUserEvents if it's for the viewed profile,
        // otherwise, this data is implicitly part of currentUser's context if needed.
        if(this.viewedUserProfile?.uid === userId) {
            this.viewedUserEvents = filteredEvents;
        } else if (this.currentUser?.uid === userId) {
            // This data could be stored in a dedicated field for current user's events if needed elsewhere
            // For ProfileView, it will re-fetch if viewing self, which is fine.
            // For now, ProfileViewContent will use viewedUserEvents primarily.
            this.viewedUserEvents = filteredEvents; // Also set if it's the current user being viewed
        }

      } catch (error: any) {
        console.error(`Error fetching user events for ${userId}:`, error);
        if (error instanceof Error) this.error = error;
        else this.error = new Error('Failed to fetch user events.');
        if(this.viewedUserProfile?.uid === userId) this.viewedUserEvents = [];
      }
    },

    async fetchUserProjects(userId: string, eventsToScan?: AppEvent[]): Promise<void> {
      // This function's logic mostly remains the same as it depends on event submissions.
      // Ensure `eventsData` is correctly populated.
      this.error = null;
      const userProjects: UserProject[] = [];
      try {
        if (!userId) {
          this.viewedUserProjects = [];
          return;
        }

        let eventsData = eventsToScan;
        if (!eventsData) { // If events are not passed, try to get them from state or fetch
            const profileToUse = this.viewedUserProfile?.uid === userId ? this.viewedUserProfile : (this.currentUser?.uid === userId ? this.currentUser : null);
            if (profileToUse) {
                // If events already fetched for this user, use them
                if (this.viewedUserEvents.length > 0 && (this.viewedUserProfile?.uid === userId || this.currentUser?.uid === userId)) {
                    eventsData = this.viewedUserEvents;
                } else { // Fetch events if not available
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
                  id: `${eventData.id}-${submission.projectName.replace(/\s+/g, '-')}-${submission.submittedBy}`,
                  projectName: submission.projectName,
                  link: submission.link,
                  description: submission.description || '',
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
        if (error instanceof Error) this.error = error;
        else this.error = new Error('Failed to fetch user projects.');
        this.viewedUserProjects = [];
      }
    },

    async fetchCurrentUserPortfolioData(): Promise<void> {
      if (!this.currentUser?.uid) {
        this.currentUserPortfolioData = { projects: [], eventParticipationCount: 0 };
        return;
      }
      // The currentUser object (EnrichedUserData) should already have participatedEvent.
      // The XP data is in currentUser.xpData.
      // This action now primarily focuses on assembling project data based on events.
      const userId = this.currentUser.uid;
      this.error = null;
      this.loading = true;

      try {
        const projectsForPortfolio: Project[] = [];
        // Get participation count from the length of the participatedEvent array
        // Need to ensure these events are not cancelled/rejected for an accurate count.
        // Fetching these events might be needed if status isn't on the UserData.
        // For simplicity here, we'll use the raw count. A more accurate count might require
        // fetching the status of each event in `participatedEvent`.
        // Let's refine this to fetch events for status check.

        let validParticipationCount = 0;
        const participatedEventIds = this.currentUser.participatedEvent || [];
        if (participatedEventIds.length > 0) {
            const eventPromises = participatedEventIds.map(eventId =>
                getDoc(doc(db, "events", eventId)).then(snap => snap.exists() ? snap.data() as AppEvent : null)
            );
            const participatedEvents = (await Promise.all(eventPromises)).filter(Boolean) as AppEvent[];
            validParticipationCount = participatedEvents.filter(e =>
                ![EventStatus.Pending, EventStatus.Cancelled, EventStatus.Rejected].includes(e.status as EventStatus)
            ).length;
        }
        this.currentUserPortfolioData.eventParticipationCount = validParticipationCount;


        // Fetch projects based on all relevant events (participated or organized)
        const organizedEventIds = this.currentUser.organizedEvent || [];
        const relevantEventIds = Array.from(new Set([...participatedEventIds, ...organizedEventIds])).filter(Boolean);

        if (relevantEventIds.length > 0) {
          const eventPromises: Promise<AppEvent | null>[] = relevantEventIds.map(eventId => {
            const eventRef = doc(db, 'events', eventId);
            return getDoc(eventRef).then(eventSnap =>
              eventSnap.exists() ? ({ id: eventSnap.id, ...eventSnap.data() } as AppEvent) : null
            );
          });
          const fetchedEvents = (await Promise.all(eventPromises)).filter(Boolean) as AppEvent[];

          for (const eventData of fetchedEvents) {
            // Filter out events that shouldn't contribute to portfolio (e.g., pending, cancelled)
            if ([EventStatus.Pending, EventStatus.Cancelled, EventStatus.Rejected].includes(eventData.status as EventStatus)) {
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
        this.currentUserPortfolioData.projects = projectsForPortfolio;

      } catch (error: any) {
        console.error('Error fetching current user portfolio data:', error);
        if (error instanceof Error) this.error = error;
        else this.error = new Error('Failed to fetch portfolio data.');
        this.currentUserPortfolioData = { projects: [], eventParticipationCount: 0 };
      } finally {
        this.loading = false;
      }
    },

    async fetchUserRequests(userId: string): Promise<void> {
      // This logic remains the same as it queries events based on `requestedBy`.
      this.error = null;
      try {
        if (!userId) {
          this.userRequests = [];
          return;
        }
        const eventsRef = collection(db, 'events');
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
        requests.sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0));
        this.userRequests = requests;
      } catch (error: any) {
        console.error(`Error fetching user requests for ${userId}:`, error);
        if (error instanceof Error) this.error = error;
        else this.error = new Error('Failed to fetch user requests.');
        this.userRequests = [];
      }
    },

    async fetchUserNamesBatch(userIds: string[]): Promise<Record<string, string>> {
      // This logic remains the same, operating on /users collection for names.
      const uniqueIds = [...new Set(userIds)].filter(id => typeof id === 'string' && id.trim() !== '');
      if (uniqueIds.length === 0) return {};

      const result: Record<string, string> = {};
      const idsToFetchFromFirestore: string[] = [];

      uniqueIds.forEach(id => {
        const cachedEntry = this.nameCache.get(id);
        if (cachedEntry) { // && (Date.now() - cachedEntry.timestamp < CACHE_TTL) -> add TTL later if needed
          result[id] = cachedEntry.name;
        } else {
          idsToFetchFromFirestore.push(id);
        }
      });

      if (idsToFetchFromFirestore.length === 0) return result;

      try {
        const usersRef = collection(db, 'users');
        const batchSize = 30; // Firestore 'in' query limit

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
        // Provide fallback for IDs that failed to fetch
        idsToFetchFromFirestore.forEach(id => {
            if (!result[id]) result[id] = `User (${id.substring(0,5)}...)`;
        });
        return result;
      }
    },

    // fetchAllUsers and fetchAllStudents will return UserData[] (base profile)
    // If XP is needed for these lists, a separate enrichment step would be required.
    async fetchAllUsers(): Promise<void> {
      if (this.allUsers.length > 0 && !this.error) { // Basic caching
          console.log("[fetchAllUsers] Using cached allUsers data.");
          return;
      }
      const wasAlreadyLoading = this.loading;
      if (!wasAlreadyLoading) this.loading = true;
      this.error = null;
      try {
        const usersRef = collection(db, 'users');
        const snapshot = await getDocs(usersRef);
        const users: UserData[] = []; // Store as UserData (base profile)
        snapshot.forEach(docSnap => {
          const userDataFromDb = docSnap.data() as Omit<UserData, 'uid'>;
          const userWithId: UserData = { ...userDataFromDb, uid: docSnap.id };
          users.push(userWithId);
          if (userWithId.name) {
            this.nameCache.set(docSnap.id, { name: userWithId.name, timestamp: Date.now() });
          }
        });
        this.allUsers = users;
      } catch (error: any) {
        this.error = error;
        this.allUsers = [];
      } finally {
        if (!wasAlreadyLoading) this.loading = false;
      }
    },

    async fetchAllStudents(): Promise<void> {
      if (this.studentList.length > 0 && !this.error) { // Basic caching
          console.log("[fetchAllStudents] Using cached studentList data.");
          return;
      }
      const wasAlreadyLoading = this.loading;
      if (!wasAlreadyLoading) this.loading = true;
      this.error = null;
      try {
        const usersRef = collection(db, 'users');
        // Add filtering for 'student' role if such a field exists on user documents
        // const q = query(usersRef, where('role', '==', 'student'), orderBy('name', 'asc'));
        const q = query(usersRef, orderBy('name', 'asc')); // Assuming all users are students for now
        const snapshot = await getDocs(q);
        const students: UserData[] = []; // Store as UserData
        snapshot.forEach(docSnap => {
          const userDataFromDb = docSnap.data() as Omit<UserData, 'uid'>;
          const studentWithId: UserData = { ...userDataFromDb, uid: docSnap.id };
          students.push(studentWithId);
          if (studentWithId.name) {
            this.nameCache.set(docSnap.id, { name: studentWithId.name, timestamp: Date.now() });
          }
        });
        this.studentList = students;
      } catch (error: any) {
        this.error = error;
        this.studentList = [];
      } finally {
        if (!wasAlreadyLoading) this.loading = false;
      }
    },

    async fetchXPForUsers(userIds: string[]): Promise<Map<string, XPData>> {
      const uniqueIds = [...new Set(userIds)].filter(id => typeof id === 'string' && id.trim() !== '');
      const xpMap = new Map<string, XPData>();

      if (uniqueIds.length === 0) {
        return xpMap;
      }

      this.loading = true; // Consider if a separate loading state for this is needed or if global is fine
      this.error = null;

      try {
        const batchSize = 30; // Firestore 'in' query limit for document IDs.

        for (let i = 0; i < uniqueIds.length; i += batchSize) {
          const batchUserIds = uniqueIds.slice(i, i + batchSize);
          if (batchUserIds.length === 0) continue;

          const xpQuery = query(collection(db, 'xp'), where('__name__', 'in', batchUserIds));
          const snapshot = await getDocs(xpQuery);

          snapshot.forEach(docSnap => {
            // For documents returned by a `where('__name__', 'in', ...)` query,
            // docSnap.exists() will always be true.
            // So, we can directly access data.
            xpMap.set(docSnap.id, docSnap.data() as XPData);
          });
        }
        // For any UIDs that were in uniqueIds but not found in the 'xp' collection (and thus not in any snapshot)
        uniqueIds.forEach(uid => {
            if (!xpMap.has(uid)) {
                console.warn(`XP document for user ${uid} not found. Using default XP data in returned map.`);
                xpMap.set(uid, getDefaultXPData(uid));
            }
        });

        return xpMap;
      } catch (error: any) {
        console.error('Error fetching XP data for users:', error);
        this.error = error; // Set global error state
        // Ensure all requested UIDs get a default if fetch failed broadly or for specific UIDs not caught above
        uniqueIds.forEach(uid => { 
            if (!xpMap.has(uid)) {
                xpMap.set(uid, getDefaultXPData(uid));
            }
        });
        return xpMap; // Or throw error depending on desired behavior
      } finally {
        this.loading = false;
      }
    },

    async fetchLeaderboardUsers(): Promise<void> {
      this.loading = true;
      this.error = null;
      try {
        // 1. Fetch all XP data, ordered by totalCalculatedXp
        const xpRef = collection(db, 'xp');
        // Limit if necessary, e.g., .limit(100)
        const xpQuery = query(xpRef, orderBy('totalCalculatedXp', 'desc'));
        const xpSnapshot = await getDocs(xpQuery);

        const leaderboardData: EnrichedUserData[] = [];
        const userIdsForProfileFetch: string[] = [];
        const xpDataMap = new Map<string, XPData>();

        xpSnapshot.forEach(docSnap => {
          const xpEntry = docSnap.data() as XPData;
          if (xpEntry.uid) { // Ensure UID exists
            userIdsForProfileFetch.push(xpEntry.uid);
            xpDataMap.set(xpEntry.uid, xpEntry);
          }
        });

        if (userIdsForProfileFetch.length === 0) {
          this.leaderboardUsers = [];
          console.log("[fetchLeaderboardUsers] No XP data found.");
          return;
        }

        // 2. Batch fetch profile data for these UIDs
        const usersRef = collection(db, 'users');
        const profilesMap = new Map<string, UserData>();
        const batchSize = 30; // Firestore 'in' query limit

        for (let i = 0; i < userIdsForProfileFetch.length; i += batchSize) {
            const batchIds = userIdsForProfileFetch.slice(i, i + batchSize);
            if (batchIds.length === 0) continue;
            const profileQuery = query(usersRef, where('__name__', 'in', batchIds));
            const profileSnapshot = await getDocs(profileQuery);
            profileSnapshot.forEach(docSnap => {
                profilesMap.set(docSnap.id, { uid: docSnap.id, ...docSnap.data() } as UserData);
                if (docSnap.data().name) {
                     this.nameCache.set(docSnap.id, { name: docSnap.data().name, timestamp: Date.now() });
                }
            });
        }

        // 3. Merge profile and XP data, maintaining order from XP query
        for (const userId of userIdsForProfileFetch) {
            const profile = profilesMap.get(userId);
            const xpEntry = xpDataMap.get(userId);
            if (profile && xpEntry) {
                leaderboardData.push({
                    ...profile,
                    xpData: xpEntry,
                });
            } else {
                // Handle cases where profile might be missing for an XP entry (should be rare)
                // Or XP entry missing for a profile (already filtered by XP query)
                console.warn(`Missing profile or XP data for user ${userId} in leaderboard assembly.`);
                if(xpEntry && !profile){ // If we have XP but no profile, create a minimal entry
                    leaderboardData.push({
                        uid: userId,
                        name: `User ${userId.substring(0,5)}`, // Fallback name
                        email: null,
                        xpData: xpEntry
                    } as EnrichedUserData);
                }
            }
        }
        this.leaderboardUsers = leaderboardData;
        console.log(`[fetchLeaderboardUsers] Successfully processed ${this.leaderboardUsers.length} users.`);

      } catch (error: any) {
        this.error = error;
        this.leaderboardUsers = [];
        console.error('Error fetching leaderboard users:', error);
      } finally {
        this.loading = false;
      }
    },

    clearStaleCache(): void {
        const now = Date.now();
        const CACHE_TTL = 30 * 60 * 1000; // 30 minutes
        this.nameCache.forEach((entry, key) => {
            if (now - entry.timestamp > CACHE_TTL) {
                this.nameCache.delete(key);
            }
        });
        console.log("[clearStaleCache] Name cache cleanup executed.");
    },
  }
});