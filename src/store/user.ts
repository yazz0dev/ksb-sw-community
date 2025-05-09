// src/store/user.ts
import { defineStore } from 'pinia';
import { 
  doc, getDoc, updateDoc, collection, query, where, getDocs, orderBy 
} from 'firebase/firestore';
import { db } from '@/firebase';
import { Event as AppEvent, EventStatus } from '@/types/event';
import { Project } from '@/types/project';
import { 
  UserState, 
  UserProfileUpdatePayload,
  ViewedUserProfile,
  UserProject,
  UserData
} from '@/types/user';

// Define the default XP structure helper - centralize keys
const defaultXpRoleKeys = [
    'developer', 'presenter', 'designer',
    'organizer', 'problemSolver', 'participation', 'BestPerformer' // Added BestPerformer
] as const; // Use 'as const' for stricter typing

type XpRoleKey = typeof defaultXpRoleKeys[number]; // Type for valid role keys

const defaultXpStructure: Record<XpRoleKey, number> = defaultXpRoleKeys.reduce((acc, key) => {
    acc[key] = 0;
    return acc;
}, {} as Record<XpRoleKey, number>);


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
          console.log(`No user profile found in Firestore for Firebase user ${userId}`);
          this.currentUser = null;
          this.isAuthenticated = false;
          return null;
        }
        
        const userData = userDocSnap.data() as Omit<UserData, 'uid' | 'xpByRole'> & { xpByRole?: Partial<Record<XpRoleKey, number>> }; // More specific type
        const userWithId: UserData = {
             ...userData, 
             uid: userDocSnap.id, 
             xpByRole: { ...defaultXpStructure, ...(userData.xpByRole || {}) } 
        };
        
        this.currentUser = userWithId;
        this.isAuthenticated = true;
        
        return userWithId;
      } catch (error: any) {
        this.error = error;
        console.error('Error fetching user data:', error);
        this.currentUser = null;
        this.isAuthenticated = false;
        return null;
      } finally {
        this.loading = false;
      }
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
          this.currentUser = { ...this.currentUser, ...profileData };
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
        
        const userData = userDocSnap.data() as any; // Use 'any' or a more specific type if available
        this.viewedUserProfile = {
          uid: userDocSnap.id,
          name: userData.name || 'Unknown User',
          photoURL: userData.photoURL,
          bio: userData.bio,
          socialLink: userData.socialLink,
          xpByRole: { ...defaultXpStructure, ...(userData.xpByRole || {}) },
          skills: userData.skills || [],
          preferredRoles: userData.preferredRoles || [],
          participatedEvent: userData.participatedEvent || [],
          organizedEvent: userData.organizedEvent || [],
          hasLaptop: userData.hasLaptop === undefined ? false : userData.hasLaptop,
          email: null,
        };
        
        await this.fetchUserEvents(userId);
        await this.fetchUserProjects(userId);
        
      } catch (error: any) {
        this.error = error;
        console.error('Error fetching user profile for view:', error);
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async fetchUserEvents(userId: string): Promise<void> {
      if (!this.viewedUserProfile) return;
      
      try {
        const allIds = Array.from(new Set([
          ...(this.viewedUserProfile.participatedEvent || []),
          ...(this.viewedUserProfile.organizedEvent || [])
        ]));
        
        if (allIds.length === 0) {
          this.viewedUserEvents = [];
          return;
        }
        
        const events: AppEvent[] = [];
        const batch = allIds.length > 10 ? Math.ceil(allIds.length / 10) : 1;
        
        for (let i = 0; i < batch; i++) {
          const batchIds = allIds.slice(i * 10, (i + 1) * 10);
          const eventsRef = collection(db, 'events');
          const q = query(eventsRef, where('__name__', 'in', batchIds));
          const snapshot = await getDocs(q);
          
          snapshot.forEach(doc => {
            events.push({ id: doc.id, ...doc.data() } as AppEvent);
          });
        }
        
        const excludedStatuses = [EventStatus.Pending, EventStatus.Cancelled, EventStatus.Rejected];
        const isCurrentUser = userId === this.currentUser?.uid;
        
        this.viewedUserEvents = events.filter(event => {
          if (isCurrentUser) {
            return !excludedStatuses.includes(event.status as EventStatus);
          } else {
            return [EventStatus.Completed, EventStatus.Closed, EventStatus.InProgress, EventStatus.Approved]
              .includes(event.status as EventStatus);
          }
        });
        
      } catch (error) {
        console.error('Error fetching user events:', error);
        this.viewedUserEvents = [];
      }
    },

    async fetchUserProjects(userId: string): Promise<void> {
      try {
        const submissionsQuery = query(
          collection(db, 'submissions'),
          where('userId', '==', userId),
          orderBy('submittedAt', 'desc')
        );
        
        const snapshot = await getDocs(submissionsQuery);
        const projects: UserProject[] = [];
        
        for (const docSnap of snapshot.docs) {
          const data = docSnap.data();
          let eventName;
          
          if (data.eventId) {
            const eventRef = doc(db, 'events', data.eventId);
            const eventSnap = await getDoc(eventRef);
            if (eventSnap.exists()) {
              eventName = eventSnap.data()?.details?.eventName;
            }
          }
          
          projects.push({
            id: docSnap.id,
            projectName: data.projectName,
            link: data.link,
            description: data.description,
            eventId: data.eventId,
            eventName: eventName,
            submittedAt: data.submittedAt,
          });
        }
        
        this.viewedUserProjects = projects;
        
      } catch (error) {
        console.error('Error fetching user projects:', error);
        this.viewedUserProjects = [];
      }
    },

    async fetchCurrentUserPortfolioData(): Promise<void> {
      if (!this.currentUser?.uid) {
        throw new Error('User must be logged in to fetch portfolio data');
      }
      
      try {
        const submissionsQuery = query(
          collection(db, 'submissions'),
          where('userId', '==', this.currentUser.uid),
          orderBy('submittedAt', 'desc')
        );
        
        const snapshot = await getDocs(submissionsQuery);
        const projects: Project[] = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            projectName: data.projectName || data.details?.eventName || `Project (${doc.id.substring(0, 5)}...)`,
            eventName: data.details?.eventName || `Event (${data.eventId?.substring(0, 5) || doc.id.substring(0, 5)}...)`,
            eventType: data.details?.type || 'Unknown',
            description: data.details?.description || '',
            link: data.link || '#',
            submittedAt: data.submittedAt
          };
        });
        
        const userDocRef = doc(db, 'users', this.currentUser.uid);
        const userDocSnap = await getDoc(userDocRef);
        
        let participatedCount = 0;
        let organizedCount = 0;
        
        if (userDocSnap.exists()) {
          const data = userDocSnap.data();
          participatedCount = Array.isArray(data.participatedEvent) ? data.participatedEvent.length : 0;
          organizedCount = Array.isArray(data.organizedEvent) ? data.organizedEvent.length : 0;
        }
        
        this.currentUserPortfolioData = {
          projects,
          eventParticipationCount: participatedCount + organizedCount
        };
        
      } catch (error) {
        console.error('Error fetching portfolio data:', error);
        this.currentUserPortfolioData = {
          projects: [],
          eventParticipationCount: 0
        };
      }
    },

    async fetchUserRequests(userId: string): Promise<void> {
      try {
        const eventsRef = collection(db, 'events');
        const q = query(eventsRef, where('requestedBy', '==', userId));
        const snapshot = await getDocs(q);
        
        const requests: AppEvent[] = [];
        snapshot.forEach(doc => {
          requests.push({ id: doc.id, ...doc.data() } as AppEvent);
        });
        
        this.userRequests = requests;
      } catch (error) {
        console.error('Error fetching user requests:', error);
        this.userRequests = [];
      }
    },

    async fetchUserNamesBatch(userIds: string[]): Promise<Record<string, string>> {
      const uniqueIds = [...new Set(userIds)].filter(Boolean);
      if (uniqueIds.length === 0) return {};
      
      const result: Record<string, string> = {};
      const idsToFetch = uniqueIds.filter(id => !this.nameCache.has(id));
      
      if (idsToFetch.length === 0) {
        uniqueIds.forEach(id => {
          const cached = this.nameCache.get(id);
          if (cached) result[id] = cached.name;
        });
        return result;
      }
      
      try {
        const usersRef = collection(db, 'users');
        const batchSize = 10;
        
        for (let i = 0; i < idsToFetch.length; i += batchSize) {
          const batchIds = idsToFetch.slice(i, i + batchSize);
          const q = query(usersRef, where('__name__', 'in', batchIds));
          const snapshot = await getDocs(q);
          
          snapshot.forEach(doc => {
            const name = doc.data()?.name || `User (${doc.id.substring(0, 5)}...)`;
            result[doc.id] = name;
            
            this.nameCache.set(doc.id, {
              name,
              timestamp: Date.now()
            });
          });
        }
        
        uniqueIds.filter(id => !idsToFetch.includes(id)).forEach(id => {
          const cached = this.nameCache.get(id);
          if (cached) result[id] = cached.name;
        });
        
        return result;
      } catch (error) {
        console.error('Error fetching user names batch:', error);
        return {};
      }
    },

    async fetchAllUsers(): Promise<void> {
      this.loading = true;
      this.error = null;
      try {
        const usersRef = collection(db, 'users');
        const snapshot = await getDocs(usersRef);
        const users: UserData[] = [];
        snapshot.forEach(doc => {
          const userData = doc.data() as Omit<UserData, 'uid' | 'xpByRole'> & { xpByRole?: Partial<Record<XpRoleKey, number>> };
          const userWithId: UserData = { 
            ...userData, 
            uid: doc.id,
            xpByRole: { ...defaultXpStructure, ...(userData.xpByRole || {}) } 
          };
          users.push(userWithId);
          if (userWithId.name) {
            this.nameCache.set(doc.id, {
              name: userWithId.name,
              timestamp: Date.now()
            });
          }
        });
        this.allUsers = users;
      } catch (error: any) {
        this.error = error;
        console.error('Error fetching all users:', error);
        this.allUsers = [];
      } finally {
        this.loading = false;
      }
    },

    async fetchAllStudents(): Promise<void> {
      this.loading = true;
      this.error = null;
      try {
        const usersRef = collection(db, 'users');
        // Remove the role filter, since all users are students
        const q = query(
          usersRef,
          orderBy('name', 'asc')
        );
        const snapshot = await getDocs(q);

        console.log(`[UserStore fetchAllStudents] Firestore query for students snapshot.docs.length: ${snapshot.docs.length}`);

        const students: UserData[] = [];
        snapshot.forEach(doc => {
          const userData = doc.data() as Omit<UserData, 'uid' | 'xpByRole'> & { xpByRole?: Partial<Record<XpRoleKey, number>> };
          const studentWithId: UserData = { 
            ...userData, 
            uid: doc.id, 
            xpByRole: { ...defaultXpStructure, ...(userData.xpByRole || {}) } 
          };
          students.push(studentWithId);
          if (studentWithId.name) {
            this.nameCache.set(doc.id, {
              name: studentWithId.name,
              timestamp: Date.now()
            });
          }
        });
        this.studentList = students;
        console.log('[UserStore fetchAllStudents] Successfully fetched and set students. Count:', this.studentList.length);
        if (this.studentList.length > 0) {
          console.log('[UserStore fetchAllStudents] First fetched student:', JSON.stringify(this.studentList[0]));
        }
      } catch (error: any) {
        this.error = error;
        console.error('Error fetching students:', error);
        this.studentList = [];
      } finally {
        this.loading = false;
      }
    },

    async fetchLeaderboardUsers(): Promise<void> {
      this.error = null;
      try {
        if (this.allUsers.length === 0) {
          await this.fetchAllUsers(); // fetchAllUsers now ensures xpByRole is structured
        }
        // allUsers already have xpByRole structured by fetchAllUsers
        this.leaderboardUsers = this.allUsers.map(user => ({
          ...user 
          // No need to restructure xpByRole here if fetchAllUsers does it
        }));
        
      } catch (error: any) {
        this.error = error;
        console.error('Error fetching leaderboard users:', error);
        this.leaderboardUsers = [];
      } finally {
      }
    },
  }
});