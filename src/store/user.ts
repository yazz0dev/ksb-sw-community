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

// Helper to format role names (consider moving to utils/formatters)
function formatRoleName(roleKey: string): string {
    if (!roleKey) return 'Unknown Role';
    // Simple formatting, can be expanded
    return roleKey
        .replace(/([A-Z])/g, ' $1') // Add space before uppercase letters
        .replace(/^./, (str) => str.toUpperCase()) // Capitalize first letter
        .trim();
}

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
    allUsers: [], // Added
    studentList: [], // Added
    leaderboardUsers: [], // Added for leaderboard
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
    // Add getters for viewed user profile data
    getViewedUserProfile: (state): ViewedUserProfile | null => state.viewedUserProfile,
    getViewedUserProjects: (state): UserProject[] => state.viewedUserProjects,
    getViewedUserEvents: (state): AppEvent[] => state.viewedUserEvents,
    currentUserProjectsForPortfolio: (state): Project[] => state.currentUserPortfolioData.projects,
    currentUserEventParticipationCount: (state): number => state.currentUserPortfolioData.eventParticipationCount,
    
    // Helper getter for cached user names
    getCachedUserName: (state) => {
      return (userId: string): string | null => {
        const cachedEntry = state.nameCache.get(userId);
        return cachedEntry?.name || null;
      };
    },
    // Getter for all users
    getAllUsers: (state): UserData[] => state.allUsers,
    // Getter for student list
    getStudentList: (state): UserData[] => state.studentList,
    // Getter for leaderboard users (optional, component can access state directly)
    // getLeaderboardUsers: (state): UserData[] => state.leaderboardUsers,
  },

  // Actions
  actions: {
    /**
     * Fetch user data by ID
     * @param userId - The user ID to fetch data for
     * @returns The user data or null if not found
     */
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
        
        const userData = userDocSnap.data() as UserData;
        const userWithId = { ...userData, uid: userDocSnap.id };
        
        // Update the store state with the fetched user data
        this.currentUser = userWithId;
        this.isAuthenticated = true;
        
        return userWithId;
      } catch (error: any) {
        this.error = error;
        console.error('Error fetching user data:', error);
        // Make sure authentication state is set to false on error
        this.currentUser = null;
        this.isAuthenticated = false;
        return null;
      } finally {
        this.loading = false;
      }
    },

    /**
     * Update a user's profile
     * @param payload - Object containing userId and profile data
     */
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
        
        // Update the current user if this was the current user's profile
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

    /**
     * Fetch complete user profile data for viewing a profile
     * @param userId - The user ID to fetch the profile for
     */
    async fetchFullUserProfileForView(userId: string): Promise<void> {
      this.loading = true;
      this.error = null;
      
      try {
        // Clear previous data
        this.viewedUserProfile = null;
        this.viewedUserProjects = [];
        this.viewedUserEvents = [];
        
        // 1. Fetch basic profile data
        const userDocRef = doc(db, 'users', userId);
        const userDocSnap = await getDoc(userDocRef);
        
        if (!userDocSnap.exists()) {
          throw new Error("User profile not found");
        }
        
        const userData = userDocSnap.data();
        this.viewedUserProfile = {
          uid: userDocSnap.id,
          name: userData.name || 'Unknown User',
          photoURL: userData.photoURL,
          bio: userData.bio,
          socialLink: userData.socialLink,
          xpByRole: userData.xpByRole || {},
          skills: userData.skills || [],
          preferredRoles: userData.preferredRoles || [],
          participatedEvent: userData.participatedEvent || [],
          organizedEvent: userData.organizedEvent || [],
          role: userData.role,
          hasLaptop: userData.hasLaptop === undefined ? false : userData.hasLaptop,
          email: null, // Required field from UserData
        };
        
        // 2. Fetch user events
        await this.fetchUserEvents(userId);
        
        // 3. Fetch user projects
        await this.fetchUserProjects(userId);
        
      } catch (error: any) {
        this.error = error;
        console.error('Error fetching user profile for view:', error);
        throw error;
      } finally {
        this.loading = false;
      }
    },

    /**
     * Fetch user events for profile view
     */
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
        
        // Fetch events using Firestore
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
        
        // Filter and store events
        const excludedStatuses = [EventStatus.Pending, EventStatus.Cancelled, EventStatus.Rejected];
        const isCurrentUser = userId === this.currentUser?.uid;
        
        this.viewedUserEvents = events.filter(event => {
          if (isCurrentUser) {
            // Show most statuses for own profile
            return !excludedStatuses.includes(event.status as EventStatus);
          } else {
            // Show only completed/relevant statuses for public view
            return [EventStatus.Completed, EventStatus.Closed, EventStatus.InProgress, EventStatus.Approved]
              .includes(event.status as EventStatus);
          }
        });
        
      } catch (error) {
        console.error('Error fetching user events:', error);
        this.viewedUserEvents = [];
      }
    },

    /**
     * Fetch user projects
     */
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
          
          // Try to get event name if we have eventId
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

    /**
     * Fetch data for portfolio generation for the current user
     */
    async fetchCurrentUserPortfolioData(): Promise<void> {
      if (!this.currentUser?.uid) {
        throw new Error('User must be logged in to fetch portfolio data');
      }
      
      try {
        // Fetch the user's projects
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
        
        // Get the user document to count participated and organized events
        const userDocRef = doc(db, 'users', this.currentUser.uid);
        const userDocSnap = await getDoc(userDocRef);
        
        let participatedCount = 0;
        let organizedCount = 0;
        
        if (userDocSnap.exists()) {
          const data = userDocSnap.data();
          participatedCount = Array.isArray(data.participatedEvent) ? data.participatedEvent.length : 0;
          organizedCount = Array.isArray(data.organizedEvent) ? data.organizedEvent.length : 0;
        }
        
        // Update the state
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

    /**
     * Fetch user requests
     */
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

    /**
     * Fetch user names in batch
     */
    async fetchUserNamesBatch(userIds: string[]): Promise<Record<string, string>> {
      const uniqueIds = [...new Set(userIds)].filter(Boolean);
      if (uniqueIds.length === 0) return {};
      
      const result: Record<string, string> = {};
      const idsToFetch = uniqueIds.filter(id => !this.nameCache.has(id));
      
      if (idsToFetch.length === 0) {
        // Return from cache only
        uniqueIds.forEach(id => {
          const cached = this.nameCache.get(id);
          if (cached) result[id] = cached.name;
        });
        return result;
      }
      
      try {
        // We need to fetch some names
        const usersRef = collection(db, 'users');
        const batchSize = 10; // Firestore limits "in" queries
        
        for (let i = 0; i < idsToFetch.length; i += batchSize) {
          const batchIds = idsToFetch.slice(i, i + batchSize);
          const q = query(usersRef, where('__name__', 'in', batchIds));
          const snapshot = await getDocs(q);
          
          snapshot.forEach(doc => {
            const name = doc.data()?.name || `User (${doc.id.substring(0, 5)}...)`;
            result[doc.id] = name;
            
            // Update cache
            this.nameCache.set(doc.id, {
              name,
              timestamp: Date.now()
            });
          });
        }
        
        // Add any cached names we didn't need to fetch
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

    /**
     * Fetch all users and cache their names.
     */
    async fetchAllUsers(): Promise<void> {
      this.loading = true;
      this.error = null;
      try {
        const usersRef = collection(db, 'users');
        const snapshot = await getDocs(usersRef);
        const users: UserData[] = [];
        snapshot.forEach(doc => {
          const userData = doc.data() as Omit<UserData, 'uid'>; // Firestore data doesn't include uid directly
          const userWithId = { ...userData, uid: doc.id };
          users.push(userWithId);
          // Update cache
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

    /**
     * Fetch all students (users with role 'Student') and cache their names.
     * MODIFIED: Now fetches all users from the 'users' collection as students,
     * as per the clarification that there's no 'role' field and all users are students.
     */
    async fetchAllStudents(): Promise<void> {
      this.loading = true;
      this.error = null;
      try {
        const usersRef = collection(db, 'users');
        // REMOVED: const q = query(usersRef, where('role', '==', 'Student'));
        // NOW: Fetch all documents from the 'users' collection
        const snapshot = await getDocs(usersRef);

        // Log the number of documents returned by the query
        console.log(`[UserStore fetchAllStudents] Firestore query for students snapshot.docs.length: ${snapshot.docs.length}`);

        const students: UserData[] = [];
        snapshot.forEach(doc => {
          const userData = doc.data() as Omit<UserData, 'uid'>;
          // Ensure xpByRole is an object, even if undefined in Firestore
          const studentWithId = { ...userData, uid: doc.id, xpByRole: userData.xpByRole || {} };
          students.push(studentWithId);
          // Update cache
          if (studentWithId.name) {
            this.nameCache.set(doc.id, {
              name: studentWithId.name,
              timestamp: Date.now()
            });
          }
        });
        this.studentList = students;
        // Log the fetched students
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

    /**
     * Fetch users for the leaderboard.
     * Leverages fetchAllUsers if data isn't already present.
     */
    async fetchLeaderboardUsers(): Promise<void> {
      // This store's loading flag can be used if needed, but LeaderboardView has its own.
      // this.loading = true; 
      this.error = null;
      try {
        // Fetch all users if not already populated.
        // fetchAllUsers ensures xpByRole defaults to {} if undefined.
        if (this.allUsers.length === 0) {
          await this.fetchAllUsers(); // fetchAllUsers updates this.allUsers
        }
        // Assign the fetched users to leaderboardUsers.
        // Ensure xpByRole is correctly handled in UserData objects within allUsers.
        // The fetchAllUsers action should already ensure xpByRole defaults to {}
        this.leaderboardUsers = this.allUsers.map(user => ({
          ...user,
          xpByRole: user.xpByRole || {} // Defensive default
        }));
        
      } catch (error: any) {
        this.error = error;
        console.error('Error fetching leaderboard users:', error);
        this.leaderboardUsers = []; // Reset on error
      } finally {
        // this.loading = false;
      }
    },
  }
});