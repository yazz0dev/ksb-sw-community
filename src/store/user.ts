// src/store/user.ts
import { defineStore } from 'pinia';
import { UserState, User, NameCacheEntry, UserData } from '@/types/user'; // Import User/UserData if needed for lists
import { db } from '../firebase'; // Assuming firebase config is here
import {
    doc,
    getDoc,
    updateDoc,
    collection,
    getDocs,
    query,
    where, // Import where if needed for queries
    increment
} from 'firebase/firestore';
import { useNotificationStore } from './notification'; // Import for notifications

// Define the default XP structure helper
const defaultXpStructure: Record<string, number> = {
    developer: 0, presenter: 0, designer: 0,
    organizer: 0, problemSolver: 0, participation: 0
};

export const useUserStore = defineStore('user', {
    // --- State ---
    state: (): UserState => ({
        currentUser: null, // Initialize currentUser
        uid: null,
        name: null,
        isAuthenticated: false,
        hasFetched: false,
        xpByRole: { ...defaultXpStructure },
        skills: [],
        preferredRoles: [],
        lastXpCalculationTimestamp: null,
        studentList: [],
        studentListLastFetch: null,
        studentListTTL: 1000 * 60 * 60, // 1 hour
        studentListLoading: false,
        studentListError: null,
        allUsers: [],
        nameCache: new Map(),
        nameCacheTTL: 1000 * 60 * 30, // 30 minutes
        loading: false,
        error: null,
        photoURL: undefined,
        bio: undefined,
        socialLink: undefined,
        participatedEvent: [],
        organizedEvent: [],
        profileData: null,
        userRequests: [], // Add missing state properties
        leaderboardUsers: [], // Add missing state properties
    }),

    // --- Getters ---
    getters: {
        // isAuthenticated: (state) => state.isAuthenticated, // Direct access usually preferred
        // getUser: (state): User | null => state.currentUser, // Direct access usually preferred
        // userId: (state) => state.uid, // Direct access usually preferred
        // hasFetchedUserData: (state) => state.hasFetched, // Direct access usually preferred
        // --- Getters that provide computed values or complex lookups ---
        getAllUsers: (state): User[] => state.allUsers || [],
        getStudentList: (state): User[] => state.studentList || [],
        getCachedUserName: (state) => (userId: string): string | undefined => {
            return state.nameCache.get(userId)?.name;
        },
        currentUserTotalXp: (state): number => {
            if (typeof state.xpByRole !== 'object' || state.xpByRole === null) return 0;
            return Object.values(state.xpByRole).reduce((sum, val) => sum + (Number(val) || 0), 0);
        },
        isStudentListFresh: (state): boolean => {
            if (!state.studentListLastFetch) return false;
            return (Date.now() - state.studentListLastFetch) < state.studentListTTL;
        },
        // Expose profile data if needed
        getCurrentUserProfile: (state) => state.profileData,
        getCurrentUserRequests: (state) => state.userRequests,
    },

    // --- Actions (incorporating mutations) ---
    actions: {
        setHasFetched(fetched: boolean) {
            this.hasFetched = !!fetched;
        },

        async fetchUserData(uid: string): Promise<void> {
            console.log(`Pinia: fetchUserData called for UID: ${uid}`);
            this.setHasFetched(false); // Use action to set flag
            this.loading = true;
            this.error = null;

            try {
                const userDocRef = doc(db, 'users', uid);
                const userDocSnap = await getDoc(userDocRef);

                if (userDocSnap.exists()) {
                    const userData = userDocSnap.data();
                    console.log("Pinia: Fetched user data:", userData);

                    // --- Direct State Updates (Mutation Logic) ---
                    this.uid = uid;
                    this.name = userData.name || 'User'; // Default name
                    this.photoURL = userData.photoURL ?? undefined;
                    this.bio = userData.bio ?? undefined;
                    this.socialLink = userData.socialLink ?? undefined;

                    const dbXp = userData.xpByRole || {};
                    this.xpByRole = Object.keys(defaultXpStructure).reduce((acc, key) => {
                        acc[key] = Number(dbXp[key]) || 0;
                        return acc;
                    }, {} as Record<string, number>);

                    this.skills = Array.isArray(userData.skills) ? userData.skills : [];
                    this.preferredRoles = Array.isArray(userData.preferredRoles) ? userData.preferredRoles : [];
                    this.lastXpCalculationTimestamp = userData.lastXpCalculationTimestamp || null;
                    this.participatedEvent = Array.isArray(userData.participatedEvent) ? userData.participatedEvent : [];
                    this.organizedEvent = Array.isArray(userData.organizedEvent) ? userData.organizedEvent : [];
                    this.isAuthenticated = true; // Set authenticated state
                    // --- End State Updates ---

                     // Update profile data state as well
                     this.profileData = { uid, ...userData };

                } else {
                    console.warn(`User document not found for UID: ${uid}. Clearing data.`);
                    this.clearUserData(); // Use action to clear
                    // Keep hasFetched false if user not found, but set isAuthenticated false
                    this.isAuthenticated = false;
                }
            } catch (error) {
                console.error('Error fetching user data:', error);
                this.error = error instanceof Error ? error : new Error('Failed to fetch user data');
                this.clearUserData(); // Clear on error
                this.isAuthenticated = false;
            } finally {
                this.loading = false;
                this.setHasFetched(true); // Mark as fetched regardless of outcome
                console.log("Pinia: fetchUserData completed.");
            }
        },

        // Action to clear user data
        async clearUserData() {
             // Direct state mutation
             this.currentUser = null;
             this.uid = null;
             this.name = null;
             this.photoURL = undefined;
             this.bio = undefined;
             this.socialLink = undefined;
             this.xpByRole = { ...defaultXpStructure };
             this.skills = [];
             this.preferredRoles = [];
             this.isAuthenticated = false;
             // Do NOT reset hasFetched here, as it indicates the *attempt* was made
             this.lastXpCalculationTimestamp = null;
             this.participatedEvent = [];
             this.organizedEvent = [];
             this.profileData = null;
             this.userRequests = [];
             this.leaderboardUsers = [];
             // Don't clear allUsers or studentList here unless intended
             // Clear name cache explicitly if needed
             this.nameCache.clear();
             console.log("Pinia: User data cleared.");
             // No need to await basic state resets
        },

        async fetchAllStudentUIDs(): Promise<string[]> {
            console.log("Fetching all student UIDs...");
            try {
                const usersRef = collection(db, 'users');
                // Assuming 'Student' role exists. Adjust if needed.
                // Firestore doesn't efficiently support OR queries on different fields.
                // Fetch all and filter, or ensure a 'isStudent' boolean field exists.
                const q = query(usersRef); // Simplest: fetch all
                const querySnapshot = await getDocs(q);

                const studentUIDs = querySnapshot.docs
                    .filter(doc => (doc.data().role || 'Student') === 'Student') // Filter client-side
                    .map(doc => doc.id);

                console.log(`Found ${studentUIDs.length} student UIDs.`);
                return studentUIDs;
            } catch (error) {
                console.error("Error fetching all student UIDs:", error);
                return [];
            }
        },

        async fetchUserNamesBatch(uids: string[]): Promise<Record<string, string>> {
            // Optimization: Filter out already cached UIDs
            const idsToFetch = uids.filter(uid => uid && !this.nameCache.has(uid));
            const nameMap: Record<string, string> = {};

            // Populate map with already cached names
            uids.forEach(uid => {
                if (this.nameCache.has(uid)) {
                    nameMap[uid] = this.nameCache.get(uid)!.name;
                }
            });

            if (idsToFetch.length === 0) {
                return nameMap; // Return immediately if all names are cached
            }

            console.log('[User Store] Fetching names for UIDs:', idsToFetch);
            try {
                const usersRef = collection(db, 'users');
                const userDocs = await Promise.all(
                    idsToFetch.map(uid => getDoc(doc(usersRef, uid)))
                );

                userDocs.forEach((doc, idx) => {
                    const currentUid = idsToFetch[idx];
                    if (doc.exists()) {
                        const name = doc.data().name || `User ${currentUid.substring(0, 5)}`;
                        nameMap[currentUid] = name;
                        // Add to cache directly
                        this.nameCache.set(currentUid, { name, timestamp: Date.now() });
                    } else {
                        // Cache a fallback for non-existent UIDs to prevent refetching
                        const fallbackName = `Unknown (${currentUid.substring(0,5)})`;
                        nameMap[currentUid] = fallbackName;
                         this.nameCache.set(currentUid, { name: fallbackName, timestamp: Date.now() });
                    }
                });
                console.log('[User Store] Fetched names. Total in map:', Object.keys(nameMap).length);
                return nameMap;
            } catch (error) {
                console.error('Error fetching user names batch:', error);
                // Return map with cached names + fallbacks for errored fetches
                 idsToFetch.forEach(uid => {
                     if (!nameMap[uid]) nameMap[uid] = `Error (${uid.substring(0,5)})`;
                 });
                return nameMap;
            }
        },

        async refreshUserData(): Promise<void> {
            if (this.uid) {
                console.log("Refreshing user data manually...");
                await this.fetchUserData(this.uid);
            } else {
                console.log("Cannot refresh, no user UID.");
            }
        },

        async addXpForAction({ userId, amount, role }: { userId: string; amount: number; role: string; }): Promise<void> {
            console.log(`Pinia: addXpForAction called for User: ${userId}, Role: ${role}, Amount: ${amount}`);
            const notificationStore = useNotificationStore(); // Get notification store

            if (!userId || !role || typeof amount !== 'number' || amount <= 0) {
                console.warn('addXpForAction: Invalid parameters provided.');
                notificationStore.showNotification({ message: 'Invalid XP parameters.', type: 'error' });
                return;
            }

            const userDocRef = doc(db, 'users', userId);
            const xpField = `xpByRole.${role}`;

            try {
                await updateDoc(userDocRef, {
                    [xpField]: increment(amount)
                });
                console.log(`Successfully added ${amount} XP to ${role} for user ${userId}`);

                // If this is the current user, update local state directly
                if (this.uid === userId) {
                     // Ensure xpByRole exists
                     if (typeof this.xpByRole !== 'object' || this.xpByRole === null) {
                          this.xpByRole = { ...defaultXpStructure };
                     }
                     this.xpByRole[role] = (Number(this.xpByRole[role]) || 0) + amount;
                     notificationStore.showNotification({ message: `+${amount} XP for ${role}!`, type: 'success' });
                }
            } catch (error) {
                console.error(`Error adding ${amount} XP to ${role} for user ${userId}:`, error);
                 notificationStore.showNotification({ message: `Failed to update XP for ${role}.`, type: 'error' });
                 // Decide if re-throwing is needed
            }
        },

        async fetchAllStudents(): Promise<UserData[]> {
            this.studentListLoading = true;
            this.studentListError = null;
            try {
                const usersRef = collection(db, 'users');
                const q = query(usersRef); // Fetch all
                const querySnapshot = await getDocs(q);

                const students = querySnapshot.docs
                    .map(doc => ({ // Map to UserData structure
                        uid: doc.id,
                        name: doc.data().name || 'Unnamed',
                        role: doc.data().role || 'Student', // Default role
                        isAuthenticated: true, // Assume fetched users are valid
                        photoURL: doc.data().photoURL,
                        xpByRole: doc.data().xpByRole,
                        // Add other fields if needed
                    }))
                    .filter(user => user.role === 'Student') // Filter for students
                    .sort((a, b) => (a.name || '').localeCompare(b.name || '')); // Sort by name

                // Direct state update
                this.studentList = students;
                this.studentListLastFetch = Date.now();
                return students;
            } catch (error) {
                console.error("Error fetching all students:", error);
                this.studentList = [];
                this.studentListError = error instanceof Error ? error : new Error('Failed to fetch students');
                return [];
            } finally {
                this.studentListLoading = false;
            }
        },

        async fetchAllUsers(): Promise<UserData[]> {
             this.loading = true; // Use general loading flag
             this.error = null;
            try {
                const usersRef = collection(db, 'users');
                const querySnapshot = await getDocs(usersRef);

                const users = querySnapshot.docs.map(doc => ({
                    uid: doc.id,
                    name: doc.data().name || 'Unnamed',
                    isAuthenticated: true, // Assume valid
                    photoURL: doc.data().photoURL,
                    xpByRole: doc.data().xpByRole,
                    role: doc.data().role,
                    // Map other relevant fields from UserData
                } as UserData)); // Cast to UserData

                // Direct state update
                this.allUsers = users;
                return users;
            } catch (error) {
                console.error("Error fetching all users:", error);
                 this.error = error instanceof Error ? error : new Error('Failed to fetch users');
                return [];
            } finally {
                 this.loading = false;
            }
        },

        // Action to clear stale cache entries
        clearStaleCache() {
            const now = Date.now();
            let clearedNames = 0;
            let clearedStudents = false;

            // Clear stale name cache entries
            for (const [uid, data] of this.nameCache.entries()) {
                if (now - data.timestamp > this.nameCacheTTL) {
                    this.nameCache.delete(uid);
                    clearedNames++;
                }
            }
            if (clearedNames > 0) console.log(`Cleared ${clearedNames} stale name cache entries.`);

            // Clear student list if TTL expired AND it's not currently loading
            if (this.studentListLastFetch !== null &&
                !this.studentListLoading &&
                (now - this.studentListLastFetch > this.studentListTTL))
            {
                console.log('Student list cache expired. Clearing data.');
                this.studentList = [];
                this.studentListLastFetch = null;
                this.studentListError = null;
                clearedStudents = true;
            }
             if (clearedStudents) console.log(`Cleared stale student list.`);
        },

        // --- Profile/Request/Leaderboard Fetch Actions ---
        async fetchUserProfileData(userId: string) {
            this.loading = true;
            this.error = null;
            try {
                const userDocRef = doc(db, 'users', userId);
                const userDocSnap = await getDoc(userDocRef);
                if (userDocSnap.exists()) {
                    this.profileData = { uid: userId, ...userDocSnap.data() };
                } else {
                    this.profileData = null;
                    throw new Error("User profile not found.");
                }
            } catch (err) {
                 console.error(`Error fetching profile data for ${userId}:`, err);
                 this.error = err instanceof Error ? err : new Error('Failed to fetch profile');
                 this.profileData = null;
            } finally {
                this.loading = false;
            }
        },

        async fetchUserRequests(userId: string) {
            // Example implementation - adjust query as needed
            this.loading = true; // You might want a specific loading flag
            this.error = null;
            try {
                 const q = query(
                     collection(db, 'events'), // Assuming requests are stored as events with status Pending/Rejected
                     where('requestedBy', '==', userId),
                     where('status', 'in', ['Pending', 'Rejected'])
                 );
                 const querySnapshot = await getDocs(q);
                 this.userRequests = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            } catch (err) {
                console.error(`Error fetching requests for ${userId}:`, err);
                this.error = err instanceof Error ? err : new Error('Failed to fetch requests');
                this.userRequests = [];
            } finally {
                 this.loading = false;
            }
        },

        async fetchLeaderboardUsers() {
            this.loading = true; // You might want a specific loading flag
            this.error = null;
            try {
                 const usersRef = collection(db, 'users');
                 // Add sorting/filtering logic if needed, e.g., only students, sort by total XP
                 const querySnapshot = await getDocs(usersRef);
                 this.leaderboardUsers = querySnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
                 // Add sorting logic here based on XP if required
            } catch (err) {
                console.error("Error fetching leaderboard users:", err);
                this.error = err instanceof Error ? err : new Error('Failed to fetch leaderboard');
                this.leaderboardUsers = [];
            } finally {
                 this.loading = false;
            }
        },
        // Add calculateWeightedAverageRating if it was part of user actions
        async calculateWeightedAverageRating({ eventId, userId }: { eventId: string; userId: string }): Promise<number | null> {
            // Placeholder: Implement the actual logic to calculate rating based on event criteria and votes/ratings
            console.warn(`calculateWeightedAverageRating for event ${eventId}, user ${userId} not implemented yet.`);
            return Math.random() * 5; // Replace with actual calculation
        },
    },
});