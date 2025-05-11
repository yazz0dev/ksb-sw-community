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
          if (this.currentUser?.uid === userId || !this.currentUser) { 
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

        if (this.uid === userId || !this.isAuthenticated) { 
            this.currentUser = userWithId;
            this.isAuthenticated = true; 
        }

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
        if (!userId) {
          throw new Error("User ID is required");
        }
        const userDocRef = doc(db, 'users', userId);
        await updateDoc(userDocRef, profileData);
        if (this.currentUser?.uid === userId) {
          this.currentUser = { ...this.currentUser, ...profileData } as UserData; // Ensure correct type after spread
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
      }
    },

    async fetchUserEvents(userId: string): Promise<void> {
      if (!this.viewedUserProfile && this.currentUser?.uid !== userId) {
          this.viewedUserEvents = [];
          return;
      }
      this.error = null;
      try {
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
            this.viewedUserEvents = filteredEvents; 
        }


      } catch (error: any) {
        console.error(`Error fetching user events for ${userId}:`, error);
        if (error instanceof Error) this.error = error;
        else this.error = new Error('Failed to fetch user events.');
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
      const userId = this.currentUser.uid;
      this.error = null;
      this.loading = true; 

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
            if ([EventStatus.Pending, EventStatus.Cancelled, EventStatus.Rejected].includes(eventData.status as EventStatus)) {
                eventCount = Math.max(0, eventCount -1); 
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
          eventParticipationCount: eventCount, 
        };

      } catch (error: any) {
        console.error('Error fetching current user portfolio data:', error);
        if (error instanceof Error) this.error = error;
        else this.error = new Error('Failed to fetch portfolio data.');
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
      const uniqueIds = [...new Set(userIds)].filter(id => typeof id === 'string' && id.trim() !== '');
      if (uniqueIds.length === 0) return {};

      const result: Record<string, string> = {};
      const idsToFetchFromFirestore: string[] = [];

      uniqueIds.forEach(id => {
        const cachedEntry = this.nameCache.get(id);
        if (cachedEntry) {
          result[id] = cachedEntry.name;
        } else {
          idsToFetchFromFirestore.push(id);
        }
      });

      if (idsToFetchFromFirestore.length === 0) {
        return result; 
      }

      try {
        const usersRef = collection(db, 'users');
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
        idsToFetchFromFirestore.forEach(id => {
            if (!result[id]) result[id] = `User (${id.substring(0,5)}...)`;
        });
        return result; 
      }
    },

    async fetchAllUsers(): Promise<void> {
      // More effective caching: if allUsers is already populated, skip fetching.
      if (this.allUsers.length > 0) {
        console.log("[fetchAllUsers] Users already in store. Skipping fetch.");
        return;
      }

      // If an outer action (like fetchLeaderboardUsers) is already managing the global loading state,
      // this action shouldn't override it. It should only set loading if it's the top-level action.
      const wasAlreadyLoading = this.loading;
      if (!wasAlreadyLoading) {
        this.loading = true;
      }
      this.error = null;

      try {
        console.log("[fetchAllUsers] Fetching all users from Firestore...");
        const usersRef = collection(db, 'users');
        const snapshot = await getDocs(usersRef);
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
      } catch (error: any) {
        this.error = error;
        console.error('Error fetching all users:', error);
        this.allUsers = []; // Reset on error
      } finally {
        if (!wasAlreadyLoading) {
          this.loading = false;
        }
      }
    },

    async fetchAllStudents(): Promise<void> {
      // Similar caching as fetchAllUsers
      if (this.studentList.length > 0) {
        console.log("[fetchAllStudents] Students already in store. Skipping fetch.");
        return;
      }
      
      const wasAlreadyLoading = this.loading;
      if (!wasAlreadyLoading) {
        this.loading = true;
      }
      this.error = null;
      try {
        console.log("[fetchAllStudents] Fetching all students from Firestore...");
        const usersRef = collection(db, 'users');
        const q = query(usersRef, orderBy('name', 'asc')); // Assuming all users are students or filter by role if available
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
        console.log(`[fetchAllStudents] Successfully fetched ${students.length} students.`);
      } catch (error: any) {
        this.error = error;
        console.error('Error fetching students:', error);
        this.studentList = [];
      } finally {
        if (!wasAlreadyLoading) {
          this.loading = false;
        }
      }
    },

    async fetchLeaderboardUsers(): Promise<void> {
      this.loading = true; // This action sets the overall loading state for the operation
      this.error = null;
      try {
        // fetchAllUsers will now only run its Firestore query if this.allUsers is empty.
        await this.fetchAllUsers(); 

        if (this.error) { // Check if fetchAllUsers resulted in an error
          console.error('Error occurred during fetchAllUsers for leaderboard:', this.error);
          this.leaderboardUsers = []; // Ensure leaderboard is empty on error
          return; // Exit early
        }
        
        if (this.allUsers.length === 0) {
            console.warn("[fetchLeaderboardUsers] No users found after fetchAllUsers. Leaderboard will be empty.");
        }

        this.leaderboardUsers = this.allUsers.map(user => ({
          ...user,
          xpByRole: { ...defaultXpStructure, ...(user.xpByRole || {}) }
        }));
        console.log(`[fetchLeaderboardUsers] Processed ${this.leaderboardUsers.length} users for leaderboard.`);
      } catch (error: any) {
        // This catch block might be redundant if fetchAllUsers handles its own errors and sets this.error
        // but it's good for catching errors from the .map() operation.
        this.error = error;
        console.error('Error preparing leaderboard users:', error);
        this.leaderboardUsers = [];
      } finally {
        this.loading = false; // Reset loading state for this operation
      }
    },

    clearStaleCache(): void {
        const now = Date.now();
        const CACHE_TTL = 30 * 60 * 1000; 
        this.nameCache.forEach((entry, key) => {
            if (now - entry.timestamp > CACHE_TTL) {
                this.nameCache.delete(key);
            }
        });
        console.log("[clearStaleCache] Name cache cleanup executed.");
    },

  }
});