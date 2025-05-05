// src/store/user.ts
import { defineStore } from 'pinia';
// Import Event type if needed for request/leaderboard data
import { Event } from '@/types/event';
// Ensure UserData is imported if used for lists
import { UserState, User, NameCacheEntry, UserData } from '@/types/user';
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
        currentUser: null, // Holds the full User object
        // Individual properties for easier access/reactivity if needed
        uid: null,
        name: null,
        photoURL: undefined,
        bio: undefined,
        socialLink: undefined,
        isAuthenticated: false,
        hasFetched: false, // Tracks if initial auth check/fetch attempt completed
        xpByRole: { ...defaultXpStructure },
        skills: [],
        preferredRoles: [],
        lastXpCalculationTimestamp: null,
        participatedEvent: [],
        organizedEvent: [],
        profileData: null, // Holds profile data for viewed user (can be self or other)
        // Student/User Lists
        studentList: [],
        studentListLastFetch: null,
        studentListTTL: 1000 * 60 * 60, // 1 hour TTL for student list
        studentListLoading: false,
        studentListError: null,
        allUsers: [], // Potentially used for admin views or broader lookups
        // Name Caching
        nameCache: new Map(),
        nameCacheTTL: 1000 * 60 * 30, // 30 minutes TTL for names
        // General Loading/Error
        loading: false,
        error: null,
        // ADDED: Missing state properties (typed)
        userRequests: [] as Event[], // Holds the current user's event requests
        leaderboardUsers: [] as UserData[], // Holds users fetched for the leaderboard
    }),

    // --- Getters ---
    getters: {
        // Direct state access is often fine, but getters can provide computed logic
        // isAuthenticated: (state) => state.isAuthenticated,
        // currentUser: (state): User | null => state.currentUser,
        // uid: (state) => state.uid, // Direct access via store.uid
        // hasFetched: (state) => state.hasFetched, // Direct access via store.hasFetched

        // Getters for computed or derived state
        getAllUsers: (state): UserData[] => state.allUsers || [], // Ensure array
        getStudentList: (state): UserData[] => state.studentList || [], // Ensure array
        getCachedUserName: (state) => (userId: string): string | undefined => {
            return state.nameCache.get(userId)?.name;
        },
        currentUserTotalXp: (state): number => {
            // Calculate total XP from the reactive xpByRole state
            if (typeof state.xpByRole !== 'object' || state.xpByRole === null) return 0;
            return Object.values(state.xpByRole).reduce((sum, val) => sum + (Number(val) || 0), 0);
        },
        isStudentListFresh: (state): boolean => {
            if (!state.studentListLastFetch) return false;
            return (Date.now() - state.studentListLastFetch) < state.studentListTTL;
        },
        // Getter for profile data (might be self or other user)
        getCurrentUserProfile: (state): UserData | null => state.profileData,
        // Getter for the logged-in user's event requests
        getCurrentUserRequests: (state): Event[] => state.userRequests,
        // Getter for profile picture URL
        profilePictureUrl: (state): string | null => state.photoURL ?? null, // Use nullish coalescing
    },

    // --- Actions (incorporating mutations) ---
    actions: {
        // Internal helper to mark fetch status
        setHasFetched(fetched: boolean) {
            this.hasFetched = !!fetched;
        },

        // Fetches data for the *currently logged-in* user
        async fetchUserData(uid: string): Promise<void> {
            console.log(`Pinia: fetchUserData called for UID: ${uid}`);
            this.setHasFetched(false); // Mark as fetching
            this.loading = true;
            this.error = null;

            try {
                const userDocRef = doc(db, 'users', uid);
                const userDocSnap = await getDoc(userDocRef);

                if (userDocSnap.exists()) {
                    const userData = userDocSnap.data();
                    console.log("Pinia: Fetched user data:", userData);

                    // --- Update State Directly ---
                    this.uid = uid;
                    this.name = userData.name || 'User'; // Default name
                    this.photoURL = userData.photoURL ?? undefined;
                    this.bio = userData.bio ?? undefined;
                    this.socialLink = userData.socialLink ?? undefined;

                    // Safely map xpByRole, ensuring all default keys exist
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
                    this.isAuthenticated = true; // User data fetched means authenticated

                    // Update currentUser object
                    this.currentUser = {
                        uid: uid,
                        name: this.name,
                        photoURL: this.photoURL,
                        bio: this.bio,
                        socialLink: this.socialLink,
                        xpByRole: this.xpByRole,
                        skills: this.skills,
                        preferredRoles: this.preferredRoles,
                        lastXpCalculationTimestamp: this.lastXpCalculationTimestamp,
                        participatedEvent: this.participatedEvent,
                        organizedEvent: this.organizedEvent,
                        isAuthenticated: this.isAuthenticated,
                        role: userData.role || 'Student', // Add role if present
                    } as User;

                    // Set profileData if fetching own data
                    this.profileData = this.currentUser;


                } else {
                    console.warn(`User document not found for UID: ${uid}. Clearing data.`);
                    this.clearUserData(); // Use action to clear
                    this.isAuthenticated = false; // No user found, not authenticated
                }
            } catch (error) {
                console.error('Error fetching user data:', error);
                this.error = error instanceof Error ? error : new Error('Failed to fetch user data');
                this.clearUserData(); // Clear on error
                this.isAuthenticated = false;
            } finally {
                this.loading = false;
                this.setHasFetched(true); // Mark fetch attempt completed
                console.log("Pinia: fetchUserData completed.");
            }
        },

        // Clears all user-related state, typically on logout
        async clearUserData() {
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
             // Do NOT reset hasFetched here, as it indicates the *initial* auth check attempt
             this.lastXpCalculationTimestamp = null;
             this.participatedEvent = [];
             this.organizedEvent = [];
             this.profileData = null; // Clear profile data as well
             this.userRequests = [];
             this.leaderboardUsers = [];
             // Optionally clear cache on logout, or keep it for faster subsequent logins
             // this.nameCache.clear();
             console.log("Pinia: User data cleared.");
        },

        // Fetches UIDs of all users designated as 'Student'
        async fetchAllStudentUIDs(): Promise<string[]> {
            console.log("Fetching all student UIDs...");
            try {
                const usersRef = collection(db, 'users');
                // Query for users where the 'role' field is 'Student'
                const q = query(usersRef, where('role', '==', 'Student'));
                const querySnapshot = await getDocs(q);
                const studentUIDs = querySnapshot.docs.map(doc => doc.id);
                console.log(`Found ${studentUIDs.length} student UIDs.`);
                return studentUIDs;
            } catch (error) {
                console.error("Error fetching all student UIDs:", error);
                return [];
            }
        },

        // Fetches names for a batch of UIDs, using cache first
        async fetchUserNamesBatch(uids: string[]): Promise<Record<string, string>> {
            // Ensure input is a valid array of strings
            const validUids = uids.filter(uid => typeof uid === 'string' && uid.trim() !== '');
            if (validUids.length === 0) return {};

            const now = Date.now();
            const nameMap: Record<string, string> = {};
            const idsToFetch: string[] = [];

            // Check cache validity
            validUids.forEach(uid => {
                const cachedEntry = this.nameCache.get(uid);
                if (cachedEntry && (now - cachedEntry.timestamp < this.nameCacheTTL)) {
                    nameMap[uid] = cachedEntry.name;
                } else {
                    idsToFetch.push(uid); // Add to fetch list if not cached or expired
                }
            });

            if (idsToFetch.length === 0) {
                return nameMap; // All names were cached and fresh
            }

            console.log('[User Store] Fetching names for UIDs:', idsToFetch);
            try {
                // Use Firestore 'in' query for efficiency, chunking if necessary
                const chunkSize = 30; // Firestore 'in' query limit
                for (let i = 0; i < idsToFetch.length; i += chunkSize) {
                    const chunk = idsToFetch.slice(i, i + chunkSize);
                    if (chunk.length > 0) {
                        const usersRef = collection(db, 'users');
                        const q = query(usersRef, where('__name__', 'in', chunk)); // Query by document ID
                        const querySnapshot = await getDocs(q);

                        const foundIds = new Set<string>();
                        querySnapshot.forEach(doc => {
                            const currentUid = doc.id;
                            foundIds.add(currentUid);
                            const name = doc.data().name || `User ${currentUid.substring(0, 5)}`;
                            nameMap[currentUid] = name;
                            this.nameCache.set(currentUid, { name, timestamp: now });
                        });

                        // Handle UIDs in the chunk that were requested but not found in Firestore
                        chunk.forEach(uid => {
                            if (!foundIds.has(uid)) {
                                const fallbackName = `Unknown (${uid.substring(0, 5)})`;
                                nameMap[uid] = fallbackName;
                                this.nameCache.set(uid, { name: fallbackName, timestamp: now });
                            }
                        });
                    }
                }
                console.log('[User Store] Fetched names. Total in map:', Object.keys(nameMap).length);
                return nameMap;
            } catch (error) {
                console.error('Error fetching user names batch:', error);
                // Provide error fallback for UIDs that failed to fetch
                 idsToFetch.forEach(uid => {
                     if (!nameMap[uid]) nameMap[uid] = `Error (${uid.substring(0,5)})`;
                 });
                return nameMap;
            }
        },

        // Manually trigger a refresh of the current user's data
        async refreshUserData(): Promise<void> {
            if (this.uid) {
                console.log("Refreshing user data manually...");
                await this.fetchUserData(this.uid);
            } else {
                console.log("Cannot refresh, no user UID.");
            }
        },

        // Atomically adds XP for a specific role to a user in Firestore
        async addXpForAction({ userId, amount, role }: { userId: string; amount: number; role: string; }): Promise<void> {
            console.log(`Pinia: addXpForAction called for User: ${userId}, Role: ${role}, Amount: ${amount}`);
            const notificationStore = useNotificationStore(); // Get notification store

            if (!userId || !role || typeof amount !== 'number' || amount <= 0) {
                console.warn('addXpForAction: Invalid parameters provided.');
                notificationStore.showNotification({ message: 'Invalid XP parameters.', type: 'error' });
                return;
            }

            const userDocRef = doc(db, 'users', userId);
            const xpField = `xpByRole.${role}`; // Path for dot notation

            try {
                // Use Firestore atomic increment operation
                await updateDoc(userDocRef, {
                    [xpField]: increment(amount)
                });
                console.log(`Successfully added ${amount} XP to ${role} for user ${userId}`);

                // If this is the currently logged-in user, update local state for immediate UI feedback
                if (this.uid === userId && this.currentUser) {
                     // Ensure xpByRole object exists locally
                     if (typeof this.currentUser.xpByRole !== 'object' || this.currentUser.xpByRole === null) {
                          this.currentUser.xpByRole = { ...defaultXpStructure };
                     }
                     // Update the specific role's XP
                     this.currentUser.xpByRole[role] = (Number(this.currentUser.xpByRole[role]) || 0) + amount;
                     // Also update the top-level xpByRole state if components rely on it directly
                     this.xpByRole[role] = this.currentUser.xpByRole[role];
                     notificationStore.showNotification({ message: `+${amount} XP for ${role}!`, type: 'success' });
                }
            } catch (error) {
                console.error(`Error adding ${amount} XP to ${role} for user ${userId}:`, error);
                 notificationStore.showNotification({ message: `Failed to update XP for ${role}.`, type: 'error' });
                 // Optionally re-throw error if calling component needs to handle it
                 // throw error;
            }
        },

        // Fetches all users with the 'Student' role
        async fetchAllStudents(): Promise<UserData[]> {
            // Check cache first
            if (this.isStudentListFresh && this.studentList.length > 0) {
                console.log("Using cached student list.");
                return this.studentList;
            }

            this.studentListLoading = true;
            this.studentListError = null;
            try {
                const usersRef = collection(db, 'users');
                const q = query(usersRef, where('role', '==', 'Student'));
                const querySnapshot = await getDocs(q);

                const students = querySnapshot.docs
                    .map(docSnap => ({ // Map to UserData structure
                        uid: docSnap.id,
                        name: docSnap.data().name || 'Unnamed',
                        role: docSnap.data().role || 'Student',
                        isAuthenticated: true, // Assuming fetched users are valid in this context
                        photoURL: docSnap.data().photoURL,
                        xpByRole: docSnap.data().xpByRole || {},
                        // Add other fields from UserData if needed
                    } as UserData))
                    .sort((a, b) => (a.name || '').localeCompare(b.name || '')); // Sort by name

                this.studentList = students;
                this.studentListLastFetch = Date.now();
                return students;
            } catch (error) {
                console.error("Error fetching all students:", error);
                this.studentList = []; // Clear list on error
                this.studentListError = error instanceof Error ? error : new Error('Failed to fetch students');
                return [];
            } finally {
                this.studentListLoading = false;
            }
        },

        // Fetches all users (consider performance implications for large user bases)
        async fetchAllUsers(): Promise<UserData[]> {
             this.loading = true; // Use general loading flag
             this.error = null;
            try {
                const usersRef = collection(db, 'users');
                const querySnapshot = await getDocs(usersRef);

                const users = querySnapshot.docs.map(docSnap => ({
                    uid: docSnap.id,
                    name: docSnap.data().name || 'Unnamed',
                    isAuthenticated: true, // Assumption for this context
                    photoURL: docSnap.data().photoURL,
                    xpByRole: docSnap.data().xpByRole || {},
                    role: docSnap.data().role || 'Student', // Default role if missing
                    // Map other relevant fields from UserData
                } as UserData)); // Cast to UserData

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

        // Clears expired cache entries based on TTL settings
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

        // Fetches profile data for a specific user ID (could be self or other)
        async fetchUserProfileData(userId: string) {
            // Check if fetching data for the currently logged-in user and if it's already loaded
            if (userId === this.uid && this.profileData?.uid === userId && this.loading === false) {
                 console.log(`Using already loaded profile data for ${userId}`);
                 return; // Avoid redundant fetch for self if data is present
            }

            this.loading = true; // Set loading specific to this action? or use general?
            this.error = null;
            try {
                const userDocRef = doc(db, 'users', userId);
                const userDocSnap = await getDoc(userDocRef);
                if (userDocSnap.exists()) {
                    // Map to UserData type
                    this.profileData = {
                        uid: userId,
                        name: userDocSnap.data().name || 'Unnamed',
                        role: userDocSnap.data().role || 'Student',
                        isAuthenticated: true,
                        photoURL: userDocSnap.data().photoURL,
                        bio: userDocSnap.data().bio,
                        socialLink: userDocSnap.data().socialLink,
                        xpByRole: userDocSnap.data().xpByRole || {},
                        skills: userDocSnap.data().skills || [],
                        preferredRoles: userDocSnap.data().preferredRoles || [],
                        participatedEvent: userDocSnap.data().participatedEvent || [],
                        organizedEvent: userDocSnap.data().organizedEvent || [],
                    } as UserData;
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

        // Fetches event requests made *by* the specified user ID
        async fetchUserRequests(userId: string) {
            this.loading = true; // Consider a specific loading flag like `requestsLoading`
            this.error = null;
            try {
                 const q = query(
                     collection(db, 'events'),
                     where('requestedBy', '==', userId),
                     where('status', 'in', ['Pending', 'Rejected']) // Filter by relevant statuses
                 );
                 const querySnapshot = await getDocs(q);
                 // Map Firestore data to the Event type
                 this.userRequests = querySnapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as Event));
            } catch (err) {
                console.error(`Error fetching requests for ${userId}:`, err);
                this.error = err instanceof Error ? err : new Error('Failed to fetch requests');
                this.userRequests = [];
            } finally {
                 this.loading = false;
            }
        },

        // Fetches users for the leaderboard view
        async fetchLeaderboardUsers() {
            this.loading = true; // Consider a specific loading flag like `leaderboardLoading`
            this.error = null;
            try {
                 const usersRef = collection(db, 'users');
                 // Fetch all users initially. Sorting happens client-side based on selected role.
                 const querySnapshot = await getDocs(usersRef);

                 // Map Firestore data to the UserData type
                 this.leaderboardUsers = querySnapshot.docs.map(docSnap => ({
                     uid: docSnap.id,
                     name: docSnap.data().name || 'Unnamed',
                     role: docSnap.data().role || 'Student',
                     isAuthenticated: true,
                     photoURL: docSnap.data().photoURL,
                     xpByRole: docSnap.data().xpByRole || {},
                     // Map other UserData fields as needed
                 } as UserData));

                 // Initial sort by total XP (or could be done in component)
                 this.leaderboardUsers.sort((a, b) => {
                     const xpA = Object.values(a.xpByRole || {}).reduce((s, v) => s + (Number(v) || 0), 0);
                     const xpB = Object.values(b.xpByRole || {}).reduce((s, v) => s + (Number(v) || 0), 0);
                     return xpB - xpA; // Descending
                 });

            } catch (err) {
                console.error("Error fetching leaderboard users:", err);
                this.error = err instanceof Error ? err : new Error('Failed to fetch leaderboard');
                this.leaderboardUsers = [];
            } finally {
                 this.loading = false;
            }
        },

        // ADDED: Placeholder implementation for calculateWeightedAverageRating
        async calculateWeightedAverageRating({ eventId, userId }: { eventId: string; userId: string }): Promise<number | null> {
            // NOTE: Placeholder - Needs real implementation based on your rating data structure.
            console.warn(`calculateWeightedAverageRating for event ${eventId}, user ${userId} is a placeholder and returns a random value.`);
            try {
                // Simulate async work if needed
                // await new Promise(resolve => setTimeout(resolve, 50));
                const randomRating = Math.round((Math.random() * 4 + 1) * 10) / 10; // Random 1.0-5.0
                return randomRating;
            } catch (error) {
                console.error("Error in calculateWeightedAverageRating placeholder:", error);
                return null;
            }
        },
    },
});