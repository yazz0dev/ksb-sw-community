import { UserState } from '@/types/store';

interface UserData {
  uid: string;
  name: string;
  role: string;
  isAuthenticated?: boolean;
  xpByRole?: Record<string, number>;
  skills?: string[];
  preferredRoles?: string[];
  lastXpCalculationTimestamp?: number | null;
}

export const userMutations = {
    setUserData(state: UserState, userData: UserData) {
        state.uid = userData.uid;
        state.name = userData.name;
        state.role = userData.role || 'Student'; // Default role if missing

        if (state.role === 'Admin') {
            // Admins have no XP structure, skills, or preferred roles
            state.xpByRole = null;
            state.skills = [];
            state.preferredRoles = [];
        } else {
            // Set student-specific fields only for non-Admins
            const defaultXpStructure = { fullstack: 0, presenter: 0, designer: 0, organizer: 0, problemSolver: 0, participation: 0, general: 0 };
            const dbXp = userData.xpByRole || {};
            state.xpByRole = Object.keys(defaultXpStructure).reduce((acc, key) => {
                acc[key] = Number(dbXp[key]) || 0; // Ensure number, default to 0 for all keys
                return acc;
            }, {});

            state.skills = Array.isArray(userData.skills) ? userData.skills : [];
            state.preferredRoles = Array.isArray(userData.preferredRoles) ? userData.preferredRoles : [];
        }

        state.isAuthenticated = !!userData.isAuthenticated;
        state.lastXpCalculationTimestamp = userData.lastXpCalculationTimestamp || null; // Add last sync timestamp
        // hasFetched is set separately in the action's finally block
    },

    clearUserData(state: UserState) {
        state.uid = null;
        state.name = null;
        state.role = null;
        // Reset xpByRole map using the full structure
        state.xpByRole = { fullstack: 0, presenter: 0, designer: 0, organizer: 0, problemSolver: 0, participation: 0, general: 0 };
        state.skills = [];
        state.preferredRoles = [];
        state.isAuthenticated = false;
        // state.hasFetched = false; // Don't reset hasFetched on clear, only on new fetch attempt start
    },

    setUserXpByRole(state: UserState, xpByRoleMap: Record<string, number>) {
        // Ensure the map structure is correct and includes all roles
        const defaultXpStructure = { fullstack: 0, presenter: 0, designer: 0, organizer: 0, problemSolver: 0, participation: 0, general: 0 };
        const newMap = xpByRoleMap || {};
        state.xpByRole = Object.keys(defaultXpStructure).reduce((acc, key) => {
            acc[key] = Number(newMap[key]) || 0; // Ensure number, default to 0
            return acc;
        }, {});
    },

    setHasFetched(state: UserState, fetched: boolean) {
        state.hasFetched = !!fetched; // Ensure boolean
    },

    incrementUserXpRole(state: UserState, { role, amount }: { role: string; amount: number }) {
        if (state.xpByRole && typeof state.xpByRole[role] === 'number') {
            state.xpByRole[role] += amount;
        } else if (state.xpByRole) {
            // If the role doesn't exist but xpByRole does, initialize it
            state.xpByRole[role] = amount;
            console.warn(`Initialized XP for role '${role}' which was previously missing.`);
        } else {
            // Should ideally not happen if initialized correctly, but handle it
            state.xpByRole = { [role]: amount };
            console.warn(`Initialized xpByRole object which was previously missing.`);
        }
    },

    setAllUsers(state: UserState, users: UserData[]) {
        state.allUsers = users;
    },

    updateUser(state: UserState, userData: UserData) {
        const index = state.allUsers.findIndex(u => u.uid === userData.uid);
        if (index !== -1) {
            state.allUsers.splice(index, 1, userData);
        } else {
            state.allUsers.push(userData);
        }
    },

    removeUser(state: UserState, uid: string) {
        const index = state.allUsers.findIndex(u => u.uid === uid);
        if (index !== -1) {
            state.allUsers.splice(index, 1);
        }
    },

    cacheUserNames(state: UserState, namesMap: Record<string, string>) {
        state.userNameCache = { ...state.userNameCache, ...namesMap };
    },

    setLastXpCalculationTimestamp(state: UserState, timestamp: number) {
        state.lastXpCalculationTimestamp = timestamp;
    },

    setStudents(state: UserState, students: UserData[]) {
        // console.log('setStudents mutation called with payload:', students); // Removed log
        if (Array.isArray(students)) {
            state.studentList = students;
            // console.log('state.studentList updated:', state.studentList); // Removed log
        } else {
            console.error('setStudents mutation received non-array payload:', students);
            state.studentList = []; // Ensure it's always an array
        }
    },

    setStudentList(state: UserState, students: UserData[]) {
        state.studentList = students;
        state.studentListLastFetch = Date.now();
        state.studentListError = null;
    },

    setStudentListLoading(state: UserState, loading: boolean) {
        state.studentListLoading = loading;
    },

    setStudentListError(state: UserState, error: Error | null) {
        state.studentListError = error;
        state.studentListLoading = false;
    },

    addToNameCache(state: UserState, { uid, name }: { uid: string; name: string }) {
        if (!state.nameCache.has(uid)) {
            state.nameCache.set(uid, {
                name,
                timestamp: Date.now()
            });
        }
    },

    clearStaleCache(state: UserState) {
        const now = Date.now();
        
        // Clear stale name cache entries
        for (const [uid, data] of state.nameCache.entries()) {
            if (now - data.timestamp > state.nameCacheTTL) {
                state.nameCache.delete(uid);
            }
        }

        // Clear student list if TTL expired
        if (state.studentListLastFetch && 
            now - state.studentListLastFetch > state.studentListTTL) {
            state.studentList = [];
            state.studentListLastFetch = null;
        }
    },
};
