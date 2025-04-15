import { Module } from 'vuex';
import { userActions } from './actions';
import { userMutations } from './mutations';
import { RootState } from '@/types/store'; // Removed UserState import from here
import { UserState } from '@/types/user'; // Import UserState from the correct file

// Removed local XpByRole interface - using Record<string, number> from UserState
const state: UserState = {
    uid: null,
    name: null,
    role: null, // Student, Admin
    xpByRole: { // ADDED xpByRole with default structure
        fullstack: 0,
        presenter: 0,
        designer: 0,
        organizer: 0,
        problemSolver: 0,
        participation: 0,
        general: 0
    },
    skills: [],
    preferredRoles: [],
    isAuthenticated: false,
    hasFetched: false, // Flag to track if initial fetch attempt completed
    allUsers: [], // Add state for all users
    studentList: [], // <<< ADDED studentList state property
    userNameCache: {}, // Add user name cache (using object for simplicity, could use Map)
    lastXpCalculationTimestamp: null, // Added for XP calculation logic
    loading: false, // Added loading state
    error: null // Added error state
};

const getters = {
    isAuthenticated: (state: UserState) => state.isAuthenticated,
    getUserRole: (state: UserState) => state.role,
    getUser: (state: UserState) => ({
        uid: state.uid,
        name: state.name,
        role: state.role,
        xpByRole: state.xpByRole ? { ...state.xpByRole } : {}, // Return copy
        skills: state.skills ? [...state.skills] : [],
        preferredRoles: state.preferredRoles ? [...state.preferredRoles] : [],
    }),
    isAdmin: (state: UserState) => state.role === 'Admin',
    hasFetchedUserData: (state: UserState) => state.hasFetched,
    getAllUsers: (state: UserState) => state.allUsers,
    getUserNameById: (state: UserState) => (userId: string) => {
        return state.userNameCache[userId] || userId; // Return cached name or ID if not found
    },
    // Getter specifically for total XP, sums up the xpByRole map
    currentUserTotalXp: (state: UserState) => {
        // Add null/undefined check for xpByRole itself
        if (typeof state.xpByRole !== 'object' || state.xpByRole === null) return 0;
        return Object.values(state.xpByRole).reduce((sum, val) => sum + (Number(val) || 0), 0); // Ensure values are numbers
    }
};

// Removed local defaultXpStructure constant
const mutations = {
    ...userMutations,
    setUserData(state: UserState, userData: any) {
        state.uid = userData.uid || null;
        state.name = userData.name || null;
        state.role = userData.role || null;
        state.isAuthenticated = !!userData.uid;
        state.hasFetched = true;

        if (state.role === 'Admin') {
            state.xpByRole = {}; // No XP structure for Admins
            state.skills = [];
            state.preferredRoles = [];
        } else {
            // Set student-specific fields only for non-Admins
            const dbXp = userData.xpByRole || {};
            // Use a predefined list of expected roles or derive from a central source if possible
            const expectedRoles = ['fullstack', 'presenter', 'designer', 'organizer', 'problemSolver', 'participation', 'general'];
            state.xpByRole = expectedRoles.reduce((acc, key) => {
                acc[key] = Number(dbXp[key]) || 0;
                return acc;
            }, {} as Record<string, number>); // Use Record<string, number> for accumulator type
            state.skills = Array.isArray(userData.skills) ? userData.skills : [];
            state.preferredRoles = Array.isArray(userData.preferredRoles) ? userData.preferredRoles : [];
        }
    }
};

export default {
    namespaced: true,
    state,
    getters,
    actions: userActions,
    mutations
} as Module<UserState, RootState>;
