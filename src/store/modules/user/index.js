import { userActions } from './actions';
import { userMutations } from './mutations';

// --- STATE ---
const state = {
    uid: null,
    name: null,
    role: null, // Student, Admin
    xpByRole: { // ADDED xpByRole with default structure
        fullstack: 0,
        presenter: 0,
        designer: 0,
        organizer: 0,
        problemSolver: 0,
        participation: 0, // Added participation
        general: 0 // Added general
    },
    skills: [],
    preferredRoles: [],
    isAuthenticated: false,
    hasFetched: false, // Flag to track if initial fetch attempt completed
    allUsers: [], // Add state for all users
    studentList: [], // <<< ADDED studentList state property
    userNameCache: {}, // Add user name cache (using object for simplicity, could use Map)
    lastXpCalculationTimestamp: null // Added for XP calculation logic
};

const getters = {
    isAuthenticated: state => state.isAuthenticated,
    getUserRole: state => state.role,
    getUser: state => ({
        uid: state.uid,
        name: state.name,
        role: state.role,
        xpByRole: state.xpByRole ? { ...state.xpByRole } : {}, // Return copy
        skills: state.skills ? [...state.skills] : [],
        preferredRoles: state.preferredRoles ? [...state.preferredRoles] : [],
    }),
    isAdmin: state => state.role === 'Admin',
    hasFetchedUserData: state => state.hasFetched,
    getAllUsers: state => state.allUsers,
    getUserNameById: (state) => (userId) => {
      return state.userNameCache[userId] || userId; // Return cached name or ID if not found
    },
    // Getter specifically for total XP, sums up the xpByRole map
    currentUserTotalXp: (state) => {
        // Add null/undefined check for xpByRole itself
        if (typeof state.xpByRole !== 'object' || state.xpByRole === null) return 0;
        return Object.values(state.xpByRole).reduce((sum, val) => sum + (Number(val) || 0), 0); // Ensure values are numbers
    }
};

// Add this constant before the mutations
const defaultXpStructure = {
    fullstack: 0,
    presenter: 0,
    designer: 0,
    organizer: 0,
    problemSolver: 0
};

const mutations = {
    ...userMutations,
    setUserData(state, userData) {
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
            state.xpByRole = Object.keys(defaultXpStructure).reduce((acc, key) => {
                acc[key] = Number(dbXp[key]) || 0;
                return acc;
            }, {});
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
};
