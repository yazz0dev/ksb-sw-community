// src/store/user.ts
import { defineStore } from 'pinia';
import type { Event } from '@/types/event'; // Import Event type for requests/leaderboard
import type { UserState, User, NameCacheEntry, UserData } from '@/types/user';
import { db } from '../firebase'; // Assuming firebase config is here
import {
    doc,
    getDoc,
    updateDoc,
    collection,
    getDocs,
    query,
    where,
    increment,
    Timestamp // Added Timestamp for last fetch time
} from 'firebase/firestore';
import { useNotificationStore } from './notification'; // Import for notifications

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

export const useUserStore = defineStore('user', {
    // --- State ---
    // Aligned with the simplified UserState interface
    state: (): UserState => ({
        // Core Authentication & Current User
        currentUser: null,
        isAuthenticated: false,
        hasFetched: false,

        // Data for Specific Views/Features
        profileData: null,
        userRequests: [],
        leaderboardUsers: [],

        // Fetched Lists & Management
        studentList: [],
        studentListLastFetch: null,
        studentListTTL: 1000 * 60 * 60, // 1 hour TTL
        studentListLoading: false,
        studentListError: null,

        allUsers: [], // Cache of all users

        // Caching
        nameCache: new Map(),
        nameCacheTTL: 1000 * 60 * 30, // 30 minutes TTL

        // General Store Status
        loading: false,
        error: null,
    }),

    // --- Getters ---
    getters: {
        // --- Accessing currentUser data ---
        uid: (state): string | null => state.currentUser?.uid ?? null,
        userName: (state): string | null => state.currentUser?.name ?? null,
        userPhotoURL: (state): string | undefined => state.currentUser?.photoURL,
        userBio: (state): string | undefined => state.currentUser?.bio,
        userSocialLink: (state): string | undefined => state.currentUser?.socialLink,
        userXpByRole: (state): Record<string, number> => state.currentUser?.xpByRole ?? { ...defaultXpStructure },
        userSkills: (state): string[] => state.currentUser?.skills ?? [],
        userPreferredRoles: (state): string[] => state.currentUser?.preferredRoles ?? [],
        userParticipatedEvents: (state): string[] => state.currentUser?.participatedEvent ?? [],
        userOrganizedEvents: (state): string[] => state.currentUser?.organizedEvent ?? [],

        // --- Direct state access ---
        // isAuthenticated: (state) => state.isAuthenticated, // Direct access is fine: userStore.isAuthenticated
        // hasFetched: (state) => state.hasFetched, // Direct access is fine: userStore.hasFetched

        // --- Computed/Derived state ---
        getAllUsers: (state): UserData[] => state.allUsers || [], // Ensure array
        getStudentList: (state): UserData[] => state.studentList || [], // Ensure array
        getCachedUserName: (state) => (userId: string): string | undefined => {
            return state.nameCache.get(userId)?.name;
        },
        currentUserTotalXp: (state): number => {
            const xpRoles = state.currentUser?.xpByRole;
            if (typeof xpRoles !== 'object' || xpRoles === null) return 0;
            return Object.values(xpRoles).reduce((sum, val) => sum + (Number(val) || 0), 0);
        },
        isStudentListFresh: (state): boolean => {
            if (!state.studentListLastFetch) return false;
            return (Date.now() - state.studentListLastFetch) < state.studentListTTL;
        },
        getCurrentUserProfile: (state): UserData | null => state.profileData,
        getCurrentUserRequests: (state): Event[] => state.userRequests,
        profilePictureUrl: (state): string | null => state.currentUser?.photoURL ?? null,
    },

    // --- Actions (incorporating mutations) ---
    actions: {
        // Internal helper to mark fetch status
        setHasFetched(fetched: boolean) {
            this.hasFetched = !!fetched;
        },

        // Fetches data for the *currently logged-in* user
        async fetchUserData(uid: string): Promise<void> {
            if (!uid) {
                console.warn("fetchUserData called with no UID.");
                await this.clearUserData();
                this.setHasFetched(true); // Still mark as fetched attempt completed
                return;
            }
            console.log(`Pinia: fetchUserData called for UID: ${uid}`);
            this.loading = true;
            this.error = null;

            try {
                const userDocRef = doc(db, 'users', uid);
                const userDocSnap = await getDoc(userDocRef);

                if (userDocSnap.exists()) {
                    const userData = userDocSnap.data();
                    console.log("Pinia: Fetched user data:", userData);

                    const dbXp = userData.xpByRole || {};
                    // Merge with default structure to ensure all roles exist
                    const mergedXp = Object.keys(defaultXpStructure).reduce((acc, key) => {
                        acc[key as XpRoleKey] = Number(dbXp[key]) || 0;
                        return acc;
                    }, {} as Record<XpRoleKey, number>);

                    this.currentUser = {
                        uid: uid,
                        name: userData.name || 'User',
                        role: userData.role || 'Student',
                        photoURL: userData.photoURL ?? undefined,
                        bio: userData.bio ?? undefined,
                        socialLink: userData.socialLink ?? undefined,
                        xpByRole: mergedXp,
                        skills: Array.isArray(userData.skills) ? userData.skills : [],
                        preferredRoles: Array.isArray(userData.preferredRoles) ? userData.preferredRoles : [],
                        lastXpCalculationTimestamp: userData.lastXpCalculationTimestamp instanceof Timestamp
                             ? userData.lastXpCalculationTimestamp.toMillis()
                             : userData.lastXpCalculationTimestamp ?? null,
                        participatedEvent: Array.isArray(userData.participatedEvent) ? userData.participatedEvent : [],
                        organizedEvent: Array.isArray(userData.organizedEvent) ? userData.organizedEvent : [],
                    } as User; // Assert User type

                    this.isAuthenticated = true;
                    this.profileData = { ...this.currentUser } as UserData; // Set profile data for self

                } else {
                    console.warn(`User document not found for UID: ${uid}. Clearing local data.`);
                    await this.clearUserData(); // Clears currentUser and sets isAuthenticated false
                }
            } catch (error) {
                console.error('Error fetching user data:', error);
                this.error = error instanceof Error ? error : new Error('Failed to fetch user data');
                await this.clearUserData(); // Clear on error
            } finally {
                this.loading = false;
                // Mark initial fetch attempt completed only once
                if (!this.hasFetched) {
                    this.setHasFetched(true);
                }
                console.log("Pinia: fetchUserData completed.");
            }
        },

        // Clears all user-related state, typically on logout
        async clearUserData() {
             this.currentUser = null;
             this.isAuthenticated = false;
             // Do NOT reset hasFetched
             this.profileData = null;
             this.userRequests = [];
             this.leaderboardUsers = [];
             // Optionally clear caches
             // this.nameCache.clear();
             // this.studentList = [];
             // this.studentListLastFetch = null;
             console.log("Pinia: User data cleared.");
        },

        // Fetches UIDs of all users designated as 'Student'
        async fetchAllStudentUIDs(): Promise<string[]> {
            console.log("Fetching all student UIDs...");
            try {
                const usersRef = collection(db, 'users');
                const q = query(usersRef, where('role', '==', 'Student'));
                const querySnapshot = await getDocs(q);
                const studentUIDs = querySnapshot.docs.map(doc => doc.id);
                console.log(`Found ${studentUIDs.length} student UIDs.`);
                return studentUIDs;
            } catch (error) {
                console.error("Error fetching all student UIDs:", error);
                this.error = error instanceof Error ? error : new Error('Failed to fetch student UIDs');
                return [];
            }
        },

        // Fetches names for a batch of UIDs, using cache first
        async fetchUserNamesBatch(uids: string[]): Promise<Record<string, string>> {
            const validUids = Array.from(new Set(uids.filter(uid => typeof uid === 'string' && uid.trim() !== ''))); // Ensure unique and valid
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
                    idsToFetch.push(uid);
                }
            });

            if (idsToFetch.length === 0) {
                console.log('[User Store] All names fetched from cache.');
                return nameMap;
            }

            console.log('[User Store] Fetching names for UIDs:', idsToFetch);
            try {
                const chunkSize = 30; // Firestore 'in' query limit (max 30 as of recent updates)
                for (let i = 0; i < idsToFetch.length; i += chunkSize) {
                    const chunk = idsToFetch.slice(i, i + chunkSize);
                    if (chunk.length > 0) {
                        const usersRef = collection(db, 'users');
                        const q = query(usersRef, where('__name__', 'in', chunk)); // Query by document ID (__name__)
                        const querySnapshot = await getDocs(q);

                        const foundIdsInChunk = new Set<string>();
                        querySnapshot.forEach(doc => {
                            const currentUid = doc.id;
                            foundIdsInChunk.add(currentUid);
                            const name = doc.data()?.name || `User (${currentUid.substring(0, 5)}...)`;
                            nameMap[currentUid] = name;
                            this.nameCache.set(currentUid, { name, timestamp: now });
                        });

                        // Handle UIDs in the chunk that were requested but not found in Firestore
                        chunk.forEach(uid => {
                            if (!foundIdsInChunk.has(uid)) {
                                const fallbackName = `Unknown (${uid.substring(0, 5)})`;
                                console.warn(`User with UID ${uid} not found in Firestore during batch fetch.`);
                                nameMap[uid] = fallbackName;
                                this.nameCache.set(uid, { name: fallbackName, timestamp: now }); // Cache fallback
                            }
                        });
                    }
                }
                console.log('[User Store] Fetched names. Total in map:', Object.keys(nameMap).length);
                return nameMap;
            } catch (error) {
                console.error('Error fetching user names batch:', error);
                this.error = error instanceof Error ? error : new Error('Batch name fetch failed');
                // Provide error fallback for UIDs that were attempted but might have failed
                 idsToFetch.forEach(uid => {
                     if (!nameMap[uid]) nameMap[uid] = `Error (${uid.substring(0,5)})`;
                 });
                return nameMap;
            }
        },

        // Manually trigger a refresh of the current user's data
        async refreshUserData(): Promise<void> {
            const currentUid = this.currentUser?.uid; // Access via getter/state
            if (currentUid) {
                console.log("Refreshing user data manually...");
                await this.fetchUserData(currentUid);
            } else {
                console.log("Cannot refresh, no current user UID.");
            }
        },

        // Atomically adds XP for a specific role to a user in Firestore
        async addXpForAction({ userId, amount, role }: { userId: string; amount: number; role: string; }): Promise<void> {
            console.log(`Pinia: addXpForAction called for User: ${userId}, Role: ${role}, Amount: ${amount}`);
            const notificationStore = useNotificationStore();

            if (!userId || !role || typeof amount !== 'number' || amount <= 0) {
                console.warn('addXpForAction: Invalid parameters provided.');
                notificationStore.showNotification({ message: 'Invalid XP parameters.', type: 'error' });
                return;
            }

            // Validate role key
            if (!defaultXpRoleKeys.includes(role as XpRoleKey)) {
                 console.warn(`addXpForAction: Invalid role key '${role}'.`);
                 notificationStore.showNotification({ message: `Invalid XP role specified: ${role}.`, type: 'error' });
                 return;
            }

            const userDocRef = doc(db, 'users', userId);
            const xpField = `xpByRole.${role}`;

            try {
                await updateDoc(userDocRef, {
                    [xpField]: increment(amount)
                });
                console.log(`Successfully added ${amount} XP to ${role} for user ${userId}`);

                // --- Update local currentUser state if it's the affected user ---
                if (this.currentUser && this.currentUser.uid === userId) {
                     if (!this.currentUser.xpByRole) {
                          this.currentUser.xpByRole = { ...defaultXpStructure };
                     }
                     this.currentUser.xpByRole[role] = (Number(this.currentUser.xpByRole[role]) || 0) + amount;
                     notificationStore.showNotification({ message: `+${amount} XP for ${formatRoleName(role)}!`, type: 'success' });
                }
            } catch (error) {
                console.error(`Error adding ${amount} XP to ${role} for user ${userId}:`, error);
                 notificationStore.showNotification({ message: `Failed to update XP for ${role}.`, type: 'error' });
            }
        },

        // Fetches all users with the 'Student' role
        async fetchAllStudents(): Promise<UserData[]> {
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

                const students: UserData[] = querySnapshot.docs
                    .map(docSnap => {
                        const data = docSnap.data();
                        const dbXp = data.xpByRole || {};
                        const mergedXp = Object.keys(defaultXpStructure).reduce((acc, key) => {
                             acc[key as XpRoleKey] = Number(dbXp[key]) || 0;
                             return acc;
                        }, {} as Record<XpRoleKey, number>);
                        return { // Map to UserData structure
                            uid: docSnap.id,
                            name: data.name || 'Unnamed Student',
                            role: 'Student',
                            photoURL: data.photoURL,
                            xpByRole: mergedXp,
                            // Add other fields from UserData if needed
                            // Ensure all required fields of UserData (extending User) are present
                            skills: data.skills || [],
                            preferredRoles: data.preferredRoles || [],
                            participatedEvent: data.participatedEvent || [],
                            organizedEvent: data.organizedEvent || [],
                        } as UserData; // Assert UserData type
                    })
                    .sort((a, b) => (a.name || '').localeCompare(b.name || '')); // Sort by name

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

        // Fetches all users (consider performance implications)
        async fetchAllUsers(): Promise<UserData[]> {
            // Consider adding caching like fetchAllStudents if this is called frequently
             this.loading = true;
             this.error = null;
            try {
                const usersRef = collection(db, 'users');
                const querySnapshot = await getDocs(usersRef);

                const users: UserData[] = querySnapshot.docs.map(docSnap => {
                    const data = docSnap.data();
                    const dbXp = data.xpByRole || {};
                    const mergedXp = Object.keys(defaultXpStructure).reduce((acc, key) => {
                        acc[key as XpRoleKey] = Number(dbXp[key]) || 0;
                        return acc;
                    }, {} as Record<XpRoleKey, number>);
                    return {
                        uid: docSnap.id,
                        name: data.name || 'Unnamed User',
                        role: data.role || 'Student',
                        photoURL: data.photoURL,
                        xpByRole: mergedXp,
                        // Map other relevant fields from UserData
                        bio: data.bio,
                        socialLink: data.socialLink,
                        skills: data.skills || [],
                        preferredRoles: data.preferredRoles || [],
                        participatedEvent: data.participatedEvent || [],
                        organizedEvent: data.organizedEvent || [],
                    } as UserData; // Assert UserData type
                });

                this.allUsers = users;
                return users;
            } catch (error) {
                console.error("Error fetching all users:", error);
                 this.error = error instanceof Error ? error : new Error('Failed to fetch users');
                 this.allUsers = [];
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
                 if (clearedStudents) console.log(`Cleared stale student list.`);
            }
        },

        // --- Profile/Request/Leaderboard Fetch Actions ---

        // Fetches profile data for a specific user ID (could be self or other)
        async fetchUserProfileData(userId: string) {
            if (!userId) {
                this.error = new Error("User ID is required to fetch profile data.");
                this.profileData = null;
                return;
            }
            // Check if fetching data for the currently logged-in user AND it's already loaded in currentUser
            if (userId === this.currentUser?.uid && this.isAuthenticated) {
                 console.log(`Using already loaded currentUser data for profile view ${userId}`);
                 this.profileData = { ...this.currentUser } as UserData;
                 return;
            }

            this.loading = true;
            this.error = null;
            try {
                const userDocRef = doc(db, 'users', userId);
                const userDocSnap = await getDoc(userDocRef);
                if (userDocSnap.exists()) {
                     const data = userDocSnap.data();
                     const dbXp = data.xpByRole || {};
                     const mergedXp = Object.keys(defaultXpStructure).reduce((acc, key) => {
                         acc[key as XpRoleKey] = Number(dbXp[key]) || 0;
                         return acc;
                     }, {} as Record<XpRoleKey, number>);
                    // Map to UserData type
                    this.profileData = {
                        uid: userId,
                        name: data.name || 'Unnamed User',
                        role: data.role || 'Student',
                        photoURL: data.photoURL,
                        bio: data.bio,
                        socialLink: data.socialLink,
                        xpByRole: mergedXp,
                        skills: data.skills || [],
                        preferredRoles: data.preferredRoles || [],
                        participatedEvent: data.participatedEvent || [],
                        organizedEvent: data.organizedEvent || [],
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
            if (!userId) {
                 this.userRequests = [];
                 return;
            }
            this.loading = true; // Consider a specific loading flag
            this.error = null;
            try {
                 const q = query(
                     collection(db, 'events'),
                     where('requestedBy', '==', userId),
                     // Fetch Pending and Rejected to show in "My Requests"
                     where('status', 'in', ['Pending', 'Rejected'])
                 );
                 const querySnapshot = await getDocs(q);
                 this.userRequests = querySnapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as Event));
                 console.log(`Fetched ${this.userRequests.length} requests for user ${userId}`);
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
            this.loading = true; // Consider a specific loading flag
            this.error = null;
            try {
                 const usersRef = collection(db, 'users');
                 const querySnapshot = await getDocs(usersRef);

                 this.leaderboardUsers = querySnapshot.docs.map(docSnap => {
                     const data = docSnap.data();
                     const dbXp = data.xpByRole || {};
                     const mergedXp = Object.keys(defaultXpStructure).reduce((acc, key) => {
                         acc[key as XpRoleKey] = Number(dbXp[key]) || 0;
                         return acc;
                     }, {} as Record<XpRoleKey, number>);
                     return {
                         uid: docSnap.id,
                         name: data.name || 'Unnamed User',
                         role: data.role || 'Student',
                         photoURL: data.photoURL,
                         xpByRole: mergedXp,
                         // Include other UserData fields if needed by the leaderboard component
                     } as UserData; // Assert UserData type
                 });

                 // Initial sort by total XP (can be moved to component if role filtering is dynamic)
                 this.leaderboardUsers.sort((a, b) => {
                     const xpA = Object.values(a.xpByRole || {}).reduce((s, v) => s + (Number(v) || 0), 0);
                     const xpB = Object.values(b.xpByRole || {}).reduce((s, v) => s + (Number(v) || 0), 0);
                     return xpB - xpA; // Descending
                 });
                 console.log(`Fetched ${this.leaderboardUsers.length} users for leaderboard.`);

            } catch (err) {
                console.error("Error fetching leaderboard users:", err);
                this.error = err instanceof Error ? err : new Error('Failed to fetch leaderboard');
                this.leaderboardUsers = [];
            } finally {
                 this.loading = false;
            }
        },

    },
});