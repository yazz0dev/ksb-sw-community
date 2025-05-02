// src/store/user/mutations.ts

// Import necessary types from the centralized location
import { UserState, User, NameCacheEntry } from '@/types/user';

// Interface for data payloads, often coming from API/forms
// This interface remains useful for defining the expected shape of data
// received by the mutations, distinct from the User interface used in state.
interface UserDataPayload {
    uid: string;
    name: string;
    role?: string; // Made optional as it might not always be in payload
    isAuthenticated?: boolean; // Optional, as it may not always be provided
    xpByRole?: Record<string, number>;
    skills?: string[];
    preferredRoles?: string[];
    lastXpCalculationTimestamp?: number | null;
    participatedEvent?: string[]; // Added as it's used in fetchUserData
    organizedEvent?: string[]; // Added as it's used in fetchUserData
    photoURL?: string; // Added as used in EditProfileView/ProfileViewContent
    bio?: string; // Added as used in EditProfileView/ProfileViewContent
    socialLink?: string; // Added as used in EditProfileView/ProfileViewContent
}


// Helper for default XP structure (Define once, use consistently)
const defaultXpStructure: Record<string, number> = {
    developer: 0,
    presenter: 0,
    designer: 0,
    organizer: 0,
    problemSolver: 0,
    participation: 0 // Added participation role based on usage
};

export const userMutations = {
    /**
     * Sets the core user data in the state based on fetched payload.
     * Ensures default XP roles are present.
     */
    setUserData(state: UserState, userData: UserDataPayload) {
        // Update core user fields
        state.uid = userData.uid;
        state.name = userData.name;
        state.photoURL = userData.photoURL ?? state.photoURL; // Keep existing if undefined
        state.bio = userData.bio ?? state.bio;
        state.socialLink = userData.socialLink ?? state.socialLink;


        // Update student-specific fields, ensuring defaults and type correctness
        const dbXp = userData.xpByRole || {};
        // Ensure all default keys exist in xpByRole, taking values from payload or defaulting to 0
        state.xpByRole = Object.keys(defaultXpStructure).reduce((acc, key) => {
            acc[key] = Number(dbXp[key]) || 0; // Ensure number, default to 0
            return acc;
        }, {} as Record<string, number>); // Ensure correct accumulator type

        state.skills = Array.isArray(userData.skills) ? userData.skills : [];
        state.preferredRoles = Array.isArray(userData.preferredRoles) ? userData.preferredRoles : [];

        // Set isAuthenticated based on payload if available, otherwise derive from uid?
        // Relying on action logic for isAuthenticated state seems more robust.
        // Mutation only sets the data payload provides. Action confirms auth status.
        // state.isAuthenticated = typeof userData.isAuthenticated === 'boolean'
        //     ? userData.isAuthenticated
        //     : !!userData.uid; // Fallback to uid presence if payload doesn't specify

        state.lastXpCalculationTimestamp = userData.lastXpCalculationTimestamp || null;

        // Also update participated/organized event IDs if provided in the payload
        state.participatedEvent = Array.isArray(userData.participatedEvent) ? userData.participatedEvent : (state.participatedEvent || []);
        state.organizedEvent = Array.isArray(userData.organizedEvent) ? userData.organizedEvent : (state.organizedEvent || []);
    },

    /**
     * Clears the current user data and resets student-specific fields to defaults.
     */
    clearUserData(state: UserState) {
        state.currentUser = null; // Explicitly clear currentUser object
        state.uid = null;
        state.name = null;
        state.photoURL = undefined;
        state.bio = undefined;
        state.socialLink = undefined;
        // Reset xpByRole map using the full structure
        state.xpByRole = { ...defaultXpStructure }; // Reset with default 0s
        state.skills = [];
        state.preferredRoles = [];
        state.isAuthenticated = false; // Assume not authenticated when data is cleared
        // state.hasFetched = false; // Keep existing logic: Don't reset hasFetched on clear
        state.lastXpCalculationTimestamp = null;
        state.participatedEvent = []; // Clear event lists
        state.organizedEvent = []; // Clear event lists
    },

    // Removed SET_CURRENT_USER as it seemed redundant based on analysis.
    // If it was used somewhere, logic needs to be moved to setUserData or similar.

    /**
     * Updates only the xpByRole map, ensuring correct structure.
     */
    setUserXpByRole(state: UserState, xpByRoleMap: Record<string, number> | null | undefined) {
        // Ensure the map structure is correct and includes all roles
        const newMap = xpByRoleMap || {};
        state.xpByRole = Object.keys(defaultXpStructure).reduce((acc, key) => {
            acc[key] = Number(newMap[key]) || 0; // Ensure number, default to 0
            return acc;
        }, {} as Record<string, number>);
    },

    /**
     * Sets the hasFetched flag, indicating whether initial user data fetch completed.
     */
    setHasFetched(state: UserState, fetched: boolean) {
        state.hasFetched = !!fetched; // Ensure boolean
    },

    /**
     * Increments the XP for a specific role for the current user.
     */
    incrementUserXpRole(state: UserState, { role, amount }: { role: string; amount: number }) {
        // Ensure xpByRole exists and is an object before modifying
        if (typeof state.xpByRole !== 'object' || state.xpByRole === null) {
             console.warn(`Attempted to increment XP for role '${role}', but xpByRole object was missing or null. Initializing.`);
             state.xpByRole = { ...defaultXpStructure }; // Initialize with defaults
        }

        // Now safely increment or initialize the specific role
        state.xpByRole[role] = (Number(state.xpByRole[role]) || 0) + amount;

        // Optional: Warn if incrementing a role not in the default structure
        // if (!defaultXpStructure.hasOwnProperty(role)) {
        //      console.warn(`Incremented XP for non-standard role: '${role}'`);
        // }
    },

    /**
     * Sets the list of all users.
     */
    setAllUsers(state: UserState, users: User[]) { // Use User[] type
        // Add mapping here if UserDataPayload needs conversion to User
        state.allUsers = Array.isArray(users) ? users : []; // Ensure array
    },

    /**
     * Updates or adds a single user in the allUsers list.
     * Assumes the payload is a User object.
     */
    updateUser(state: UserState, userData: User) { // Use User type
        const index = state.allUsers.findIndex(u => u.uid === userData.uid);
        if (index !== -1) {
             state.allUsers.splice(index, 1, userData); // Use splice for reactivity
        } else {
            state.allUsers.push(userData);
        }
    },

    /**
     * Removes a user from the allUsers list by UID.
     */
    removeUser(state: UserState, uid: string) {
        state.allUsers = state.allUsers.filter(u => u.uid !== uid); // Filter is clean
    },

    // Removed cacheUserNames mutation as it's incompatible with Map-based nameCache

    /**
     * Sets the timestamp of the last XP calculation for the current user.
     */
    setLastXpCalculationTimestamp(state: UserState, timestamp: number | null) { // Allow null
        state.lastXpCalculationTimestamp = timestamp;
    },

    // Removed setStudents mutation, using setStudentList instead

    /**
     * Sets the list of students and updates fetch metadata.
     */
    setStudentList(state: UserState, students: User[]) { // Use User[] type
        if (Array.isArray(students)) {
            state.studentList = students;
            state.studentListLastFetch = Date.now();
            state.studentListError = null; // Clear error on successful set
        } else {
             console.error('setStudentList mutation received non-array payload:', students);
             state.studentList = []; // Ensure it's always an array
             // Optionally set error state here
             // state.studentListError = new Error('Invalid student list data received');
        }
        state.studentListLoading = false; // Assume loading stops on set (success or fail)
    },

    /**
     * Sets the loading status for the student list.
     */
    setStudentListLoading(state: UserState, loading: boolean) {
        state.studentListLoading = !!loading; // Ensure boolean
    },

    /**
     * Sets the error state for student list fetching.
     */
    setStudentListError(state: UserState, error: Error | null) {
        state.studentListError = error;
        state.studentListLoading = false; // Stop loading on error
    },

    /**
     * Adds or updates a name entry in the nameCache Map.
     */
    addToNameCache(state: UserState, { uid, name }: { uid: string; name: string }) {
        if (!uid) return; // Prevent caching empty uids
        // Update existing or add new, always refresh timestamp
         state.nameCache.set(uid, {
             name,
             timestamp: Date.now()
         } as NameCacheEntry); // Cast to NameCacheEntry for clarity
    },

    /**
     * Clears stale entries from the nameCache and studentList cache.
     */
    clearStaleCache(state: UserState) {
        const now = Date.now();

        // Clear stale name cache entries
        for (const [uid, data] of state.nameCache.entries()) {
            if (now - data.timestamp > state.nameCacheTTL) {
                state.nameCache.delete(uid);
            }
        }

        // Clear student list if TTL expired AND it's not currently loading
        if (state.studentListLastFetch !== null &&
            !state.studentListLoading && // Avoid clearing during a fetch
            (now - state.studentListLastFetch > state.studentListTTL))
        {
            console.log('Student list cache expired. Clearing data.'); // Optional log
            state.studentList = [];
            state.studentListLastFetch = null;
            state.studentListError = null; // Optionally clear error too
        }

        // Potentially add logic for other caches here if they exist
    },

    /**
     * Sets the authentication state.
     */
    setIsAuthenticated(state: UserState, isAuthenticated: boolean) {
        state.isAuthenticated = !!isAuthenticated;
    },
};