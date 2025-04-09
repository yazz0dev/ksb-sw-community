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
        problemSolver: 0
    },
    skills: [],
    preferredRoles: [],
    isAuthenticated: false,
    hasFetched: false, // Flag to track if initial fetch attempt completed
    allUsers: [], // Add state for all users
    userNameCache: {} // Add user name cache (using object for simplicity, could use Map)
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

export default {
    namespaced: true,
    state,
    getters,
    actions: userActions,
    mutations: userMutations
};
