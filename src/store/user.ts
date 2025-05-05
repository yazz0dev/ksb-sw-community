// src/store/user.ts
import { defineStore } from 'pinia';
// Import Event type if needed for request/leaderboard data
import type { Event } from '@/types/event';
// Ensure correct types are imported
import type { UserState, User, NameCacheEntry, UserData } from '@/types/user';
import { db } from '../firebase'; // Assuming firebase config is here
import {
    doc,
    getDoc,
    updateDoc,
    collection,
    getDocs,
    query,
    where, // Import where if needed for queries
    increment,
    Timestamp // Added Timestamp for last fetch time
} from 'firebase/firestore';
import { useNotificationStore } from './notification'; // Import for notifications

// Define the default XP structure helper
const defaultXpStructure: Record<string, number> = {
    developer: 0, presenter: 0, designer: 0,
    organizer: 0, problemSolver: 0, participation: 0
    // Add 'Best Performer' if it's a distinct XP category tracked on the user
    // 'BestPerformer': 0
};

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
            // Calculate total XP from the currentUser.xpByRole state
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
        // Renamed getter for clarity, accessing currentUser directly
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
            console.log(`Pinia: fetchUserData called for UID: ${uid}`);
            // Don't reset hasFetched here, it tracks the *initial* fetch attempt
            this.loading = true;
            this.error = null;

            try {
                const userDocRef = doc(db, 'users', uid);
                const userDocSnap = await getDoc(userDocRef);

                if (userDocSnap.exists()) {
                    const userData = userDocSnap.data();
                    console.log("Pinia: Fetched user data:", userData);

                    // --- Populate the currentUser object ---
                    const dbXp = userData.xpByRole || {};
                    const mergedXp = Object.keys(defaultXpStructure).reduce((acc, key) => {
                        acc[key] = Number(dbXp[key]) || 0;
                        return acc;
                    }, {} as Record<string, number>);

                    this.currentUser = {
                        uid: uid,
                        name: userData.name || 'User',
                        role: userData.role || 'Student', // Default role
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
                    } as User; // Assert type User here

                    this.isAuthenticated = true; // User data fetched means authenticated

                    // Set profileData *only if* this fetch is for the logged-in user's own profile view context
                    // This depends on how profileData is used. If it's *always* for the viewed profile,
                    // it should be set by fetchUserProfileData instead. Let's assume it can be self here.
                    this.profileData = { ...this.currentUser } as UserData; // Map to UserData

                } else {
                    console.warn(`User document not found for UID: ${uid}. Clearing data.`);
                    await this.clearUserData(); // Use action to clear
                    // Don't set isAuthenticated to false here, let the auth listener handle it
                }
            } catch (error) {
                console.error('Error fetching user data:', error);
                this.error = error instanceof Error ? error : new Error('Failed to fetch user data');
                await this.clearUserData(); // Clear on error
                // Don't set isAuthenticated to false here, let the auth listener handle it
            } finally {
                this.loading = false;
                // Mark initial fetch attempt completed regardless of success/failure
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
             // Do NOT reset hasFetched here
             this.profileData = null; // Clear profile data as well
             this.userRequests = [];
             this.leaderboardUsers = [];
             // Keep caches or clear them based on desired logout behavior
             // this.nameCache.clear();
             console.log("Pinia: User data cleared.");
        },

        // Fetches UIDs of all users designated as 'Student' (remains the same)
        async fetchAllStudentUIDs(): Promise<string[]> {
             // ... implementation ...
             return []; // Placeholder
        },

        // Fetches names for a batch of UIDs, using cache first (remains the same)
        async fetchUserNamesBatch(uids: string[]): Promise<Record<string, string>> {
            // ... implementation ...
            return {}; // Placeholder
        },

        // Manually trigger a refresh of the current user's data
        async refreshUserData(): Promise<void> {
            if (this.currentUser?.uid) { // Check currentUser.uid
                console.log("Refreshing user data manually...");
                await this.fetchUserData(this.currentUser.uid);
            } else {
                console.log("Cannot refresh, no current user UID.");
            }
        },

        // Atomically adds XP for a specific role to a user in Firestore
        async addXpForAction({ userId, amount, role }: { userId: string; amount: number; role: string; }): Promise<void> {
            console.log(`Pinia: addXpForAction called for User: ${userId}, Role: ${role}, Amount: ${amount}`);
            const notificationStore = useNotificationStore(); // Get notification store

            if (!userId || !role || typeof amount !== 'number' || amount <= 0) {
                // ... error handling ...
                return;
            }

            const userDocRef = doc(db, 'users', userId);
            const xpField = `xpByRole.${role}`; // Path for dot notation

            try {
                // Firestore atomic increment
                await updateDoc(userDocRef, {
                    [xpField]: increment(amount)
                });
                console.log(`Successfully added ${amount} XP to ${role} for user ${userId}`);

                // --- Update local currentUser state if it's the affected user ---
                if (this.currentUser && this.currentUser.uid === userId) {
                     // Ensure xpByRole object exists locally
                     if (typeof this.currentUser.xpByRole !== 'object' || this.currentUser.xpByRole === null) {
                          this.currentUser.xpByRole = { ...defaultXpStructure };
                     }
                     // Update the specific role's XP in the currentUser object
                     this.currentUser.xpByRole[role] = (Number(this.currentUser.xpByRole[role]) || 0) + amount;
                     notificationStore.showNotification({ message: `+${amount} XP for ${formatRoleName(role)}!`, type: 'success' }); // Assume formatRoleName exists
                }
            } catch (error) {
                 // ... error handling ...
            }
        },

        // Fetches all users with the 'Student' role (remains largely the same)
        async fetchAllStudents(): Promise<UserData[]> {
            // ... implementation ...
            return []; // Placeholder
        },

        // Fetches all users (remains largely the same)
        async fetchAllUsers(): Promise<UserData[]> {
             // ... implementation ...
            return []; // Placeholder
        },

        // Clears expired cache entries (remains the same)
        clearStaleCache() {
            // ... implementation ...
        },

        // --- Profile/Request/Leaderboard Fetch Actions ---

        // Fetches profile data for a specific user ID (could be self or other)
        async fetchUserProfileData(userId: string) {
             // Check if fetching data for the currently logged-in user AND it's already loaded in currentUser
            if (userId === this.currentUser?.uid && this.isAuthenticated) {
                 console.log(`Using already loaded currentUser data for profile view ${userId}`);
                 // Map currentUser to profileData (UserData structure)
                 this.profileData = { ...this.currentUser } as UserData;
                 return; // Avoid redundant fetch for self if data is present
            }

            // Proceed to fetch if it's another user or current user data isn't loaded
            this.loading = true;
            this.error = null;
            try {
                const userDocRef = doc(db, 'users', userId);
                const userDocSnap = await getDoc(userDocRef);
                if (userDocSnap.exists()) {
                     const data = userDocSnap.data();
                     const dbXp = data.xpByRole || {};
                     const mergedXp = Object.keys(defaultXpStructure).reduce((acc, key) => {
                         acc[key] = Number(dbXp[key]) || 0;
                         return acc;
                     }, {} as Record<string, number>);

                    // Map to UserData type
                    this.profileData = {
                        uid: userId,
                        name: data.name || 'Unnamed',
                        role: data.role || 'Student',
                        // Assume fetched profile is valid in this context, don't set isAuthenticated
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

        // Fetches event requests made *by* the specified user ID (remains largely the same)
        async fetchUserRequests(userId: string) {
             // ... implementation ...
             this.userRequests = []; // Placeholder
        },

        // Fetches users for the leaderboard view (remains largely the same)
        async fetchLeaderboardUsers() {
             // ... implementation ...
             this.leaderboardUsers = []; // Placeholder
        },

        // Placeholder implementation (remains the same)
        async calculateWeightedAverageRating({ eventId, userId }: { eventId: string; userId: string }): Promise<number | null> {
            // ... implementation ...
            return null; // Placeholder
        },
    },
});

// Helper function (assuming it exists in utils/formatters)
function formatRoleName(roleKey: string): string {
    return roleKey.charAt(0).toUpperCase() + roleKey.slice(1); // Basic example
}