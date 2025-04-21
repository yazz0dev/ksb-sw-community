import { UserState, User } from '@/types/user';

// Interface for data payloads, often coming from API/forms
interface UserDataPayload {
    uid: string;
    name: string;
    role: string;
    isAuthenticated?: boolean; // Optional, as it may not always be provided
    xpByRole?: Record<string, number>;
    skills?: string[];
    preferredRoles?: string[];
    lastXpCalculationTimestamp?: number | null;
}

// Helper for default XP structure
const defaultXpStructure: Record<string, number> = {
    developer: 0,
    presenter: 0,
    designer: 0,
    organizer: 0,
    problemSolver: 0,
    participation: 0
};

export const userMutations = {
    setUserData(state: UserState, userData: UserDataPayload) {
        state.uid = userData.uid;
        state.name = userData.name;
        state.role = userData.role || 'Student'; // Default role if missing

        if (state.role === 'Admin') {
            // Admins have no XP structure, skills, or preferred roles
            state.xpByRole = {}; // Use empty object for type consistency
            state.skills = [];
            state.preferredRoles = [];
        } else {
            // Set student-specific fields only for non-Admins
            const dbXp = userData.xpByRole || {};
            // Ensure all default keys exist, taking values from payload or defaulting to 0
            state.xpByRole = Object.keys(defaultXpStructure).reduce((acc, key) => {
                acc[key] = Number(dbXp[key]) || 0;
                return acc;
            }, {} as Record<string, number>); // Ensure correct accumulator type

            state.skills = Array.isArray(userData.skills) ? userData.skills : [];
            state.preferredRoles = Array.isArray(userData.preferredRoles) ? userData.preferredRoles : [];
        }

        // Set isAuthenticated based on payload if available, otherwise derive from uid?
        // Decide on the source of truth for isAuthenticated. Payload source is flexible.
        state.isAuthenticated = typeof userData.isAuthenticated === 'boolean'
            ? userData.isAuthenticated
            : !!userData.uid; // Fallback to uid presence if payload doesn't specify

        state.lastXpCalculationTimestamp = userData.lastXpCalculationTimestamp || null;
        // hasFetched is set separately, typically in the action's finally block
    },

    clearUserData(state: UserState) {
        state.uid = null;
        state.name = null;
        state.role = null;
        // Reset xpByRole map using the full structure
        state.xpByRole = { ...defaultXpStructure }; // Reset with default 0s
        state.skills = [];
        state.preferredRoles = [];
        state.isAuthenticated = false;
        // state.hasFetched = false; // Keep existing logic: Don't reset hasFetched on clear
    },

    setUserXpByRole(state: UserState, xpByRoleMap: Record<string, number> | null | undefined) {
        // Ensure the map structure is correct and includes all roles
        const newMap = xpByRoleMap || {};
        state.xpByRole = Object.keys(defaultXpStructure).reduce((acc, key) => {
            acc[key] = Number(newMap[key]) || 0; // Ensure number, default to 0
            return acc;
        }, {} as Record<string, number>);
    },

    setHasFetched(state: UserState, fetched: boolean) {
        state.hasFetched = !!fetched; // Ensure boolean
    },

    incrementUserXpRole(state: UserState, { role, amount }: { role: string; amount: number }) {
        // Ensure xpByRole exists and is an object before modifying
        if (typeof state.xpByRole !== 'object' || state.xpByRole === null) {
             // Should ideally not happen if initialized correctly, especially for non-admins
             console.warn(`Attempted to increment XP for role '${role}', but xpByRole object was missing or null. Initializing.`);
             state.xpByRole = { ...defaultXpStructure }; // Initialize with defaults
        }

        // Now safely increment or initialize the specific role
        state.xpByRole[role] = (Number(state.xpByRole[role]) || 0) + amount;

        // Optional: Warn if incrementing a role not in the default structure
        if (!defaultXpStructure.hasOwnProperty(role)) {
             console.warn(`Incremented XP for non-standard role: '${role}'`);
        }
    },

    setAllUsers(state: UserState, users: User[]) { // Use User[] type from state definition
        // Add mapping here if UserDataPayload needs conversion to User
        state.allUsers = users;
    },

    updateUser(state: UserState, userData: User) { // Use User type from state definition
        const index = state.allUsers.findIndex(u => u.uid === userData.uid);
        // Add mapping here if UserDataPayload needs conversion to User before updating
        if (index !== -1) {
            // Use splice for reactivity if needed, or direct assignment if acceptable
             state.allUsers.splice(index, 1, userData);
            // Or: state.allUsers[index] = userData; // Might have reactivity caveats in Vue 2
        } else {
            state.allUsers.push(userData);
        }
    },

    removeUser(state: UserState, uid: string) {
        state.allUsers = state.allUsers.filter(u => u.uid !== uid); // Filter is often cleaner
    },

    // Removed cacheUserNames mutation as it's incompatible with Map-based nameCache

    setLastXpCalculationTimestamp(state: UserState, timestamp: number | null) { // Allow null
        state.lastXpCalculationTimestamp = timestamp;
    },

    // Removed setStudents mutation, using setStudentList instead

    setStudentList(state: UserState, students: User[]) { // Use User[] type from state definition
        // Add mapping here if UserDataPayload needs conversion to User
        if (Array.isArray(students)) {
            state.studentList = students;
            state.studentListLastFetch = Date.now();
            state.studentListError = null; // Clear error on successful set
            state.studentListLoading = false; // Assume loading stops on successful set
        } else {
             console.error('setStudentList mutation received non-array payload:', students);
             state.studentList = []; // Ensure it's always an array
             // Optionally set error state here
             // state.studentListError = new Error('Invalid student list data received');
        }
    },

    setStudentListLoading(state: UserState, loading: boolean) {
        state.studentListLoading = !!loading; // Ensure boolean
    },

    setStudentListError(state: UserState, error: Error | null) {
        state.studentListError = error;
        state.studentListLoading = false; // Stop loading on error
    },

    // Mutation for the Map-based nameCache
    addToNameCache(state: UserState, { uid, name }: { uid: string; name: string }) {
        // Update existing or add new, always refresh timestamp
         state.nameCache.set(uid, {
             name,
             timestamp: Date.now()
         });
    },

    // Mutation to clear stale cache entries
    clearStaleCache(state: UserState) {
        const now = Date.now();

        // Clear stale name cache entries
        for (const [uid, data] of state.nameCache.entries()) {
            if (now - data.timestamp > state.nameCacheTTL) {
                state.nameCache.delete(uid);
            }
        }

        // Clear student list if TTL expired AND it's not currently loading
        if (state.studentListLastFetch &&
            !state.studentListLoading && // Avoid clearing during a fetch
            (now - state.studentListLastFetch > state.studentListTTL))
        {
            console.log('Student list cache expired. Clearing data.'); // Optional log
            state.studentList = [];
            state.studentListLastFetch = null;
            // state.studentListError = null; // Optionally clear error too
        }
    },
};