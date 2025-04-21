import { Module } from 'vuex';
import { userActions } from './actions'; // Assuming actions are in './actions.ts'
import { userMutations } from './mutations'; // Assuming mutations are in './mutations.ts'
import { RootState } from '@/types/store'; // Assuming RootState type is defined here

// --- Import UserState from the central types file ---
import { UserState, User } from '@/types/user'; // Import User if needed for lists


// --- Initial State ---
// Use the imported UserState type. Ensure this object MATCHES the UserState interface in types/user.ts
const state: UserState = {
    // Core User Data Defaults
    uid: null,
    name: null,
    role: null,
    isAuthenticated: false,
    hasFetched: false,

    // Student Specific Defaults
    xpByRole: {
        developer: 0,
        presenter: 0,
        designer: 0,
        organizer: 0,
        problemSolver: 0,
        participation: 0
    },
    skills: [],
    preferredRoles: [],

    // Student List Defaults
    studentList: [], // Should match UserState definition (e.g., User[])
    studentListLastFetch: null,
    studentListTTL: 1000 * 60 * 60, // 1 hour
    studentListLoading: false,
    studentListError: null, // Should match UserState definition (Error | null)

    // General User List Default
    allUsers: [], // Should match UserState definition (e.g., User[])

    // Name Caching Defaults (Ensure this matches UserState in types/user.ts)
    nameCache: new Map(),
    nameCacheTTL: 1000 * 60 * 30, // 30 minutes

    // XP Calculation Timestamp Default
    lastXpCalculationTimestamp: null,

    // General Loading/Error Defaults
    loading: false,
    error: null, // Should match UserState definition (Error | null)
};

// --- Getters ---
// Type annotations use the imported UserState
const getters = {
    isAuthenticated: (state: UserState): boolean => state.isAuthenticated,
    getUserRole: (state: UserState): string | null => state.role,
    getUser: (state: UserState) => ({ // Return immutable copies
        uid: state.uid,
        name: state.name,
        role: state.role,
        xpByRole: state.xpByRole ? { ...state.xpByRole } : {},
        skills: state.skills ? [...state.skills] : [],
        preferredRoles: state.preferredRoles ? [...state.preferredRoles] : [],
    }),
    isAdmin: (state: UserState): boolean => state.role === 'Admin',
    hasFetchedUserData: (state: UserState): boolean => state.hasFetched,

    getAllUsers: (state: UserState): User[] => state.allUsers, // Use User[] if defined in UserState
    getStudentList: (state: UserState): User[] => state.studentList, // Use User[] if defined in UserState

    isUserLoading: (state: UserState): boolean => state.loading,
    getUserError: (state: UserState): Error | null => state.error, // Use Error | null
    isStudentListLoading: (state: UserState): boolean => state.studentListLoading,
    getStudentListError: (state: UserState): Error | null => state.studentListError, // Use Error | null

    getUserNameById: (state: UserState) => (userId: string): string => {
        const cachedEntry = state.nameCache.get(userId);
        return cachedEntry ? cachedEntry.name : userId; // Return cached name or fallback to ID
    },

    currentUserTotalXp: (state: UserState): number => {
        if (typeof state.xpByRole !== 'object' || state.xpByRole === null) {
            return 0;
        }
        return Object.values(state.xpByRole).reduce((sum, val) => sum + (Number(val) || 0), 0);
    },

    isStudentListFresh: (state: UserState): boolean => {
        if (!state.studentListLastFetch) return false;
        return (Date.now() - state.studentListLastFetch) < state.studentListTTL;
    }
};

// --- Mutations ---
// Type annotations use the imported UserState
const mutations = {
    ...userMutations,

    setUserData(state: UserState, userData: any) { // Keep 'any' for flexibility from DB/API
        state.uid = userData.uid || null;
        state.name = userData.name || null;
        state.role = userData.role || null;
        state.isAuthenticated = !!userData.uid;
        state.hasFetched = true;
        state.loading = false;
        state.error = null; // Clear error on success

        if (state.role === 'Admin') {
            state.xpByRole = {};
            state.skills = [];
            state.preferredRoles = [];
        } else if (state.role === 'Student') { // Or check if role is not Admin
            const dbXp = userData.xpByRole || {};
            const expectedRoles = ['developer', 'presenter', 'designer', 'organizer', 'problemSolver', 'participation'];
            state.xpByRole = expectedRoles.reduce((acc, key) => {
                acc[key] = Number(dbXp[key]) || 0;
                return acc;
            }, {} as Record<string, number>);
            state.skills = Array.isArray(userData.skills) ? userData.skills : [];
            state.preferredRoles = Array.isArray(userData.preferredRoles) ? userData.preferredRoles : [];
        } else {
             // Handle other roles or null roles - clear student-specific data
            state.xpByRole = {};
            state.skills = [];
            state.preferredRoles = [];
        }
    },

    SET_LOADING(state: UserState, isLoading: boolean) {
        state.loading = isLoading;
    },
    SET_ERROR(state: UserState, error: Error | null) { // Use Error | null
        state.error = error;
        state.loading = false;
    },
    // ... other mutations from userMutations should also use the imported UserState
};

// --- Actions ---
// Type annotations use the imported UserState
const actions = {
    ...userActions,
    // Ensure actions in userActions.ts correctly use the imported UserState
};

// --- Export Module ---
// Ensure the Module type uses the imported UserState
export const userModule: Module<UserState, RootState> = {
    namespaced: true,
    state,
    getters,
    actions,
    mutations,
};

export default userModule;