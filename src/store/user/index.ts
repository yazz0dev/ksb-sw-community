import { Module } from 'vuex';
import { userActions } from './actions'; // Assuming actions are in './actions.ts'
import { userMutations } from './mutations'; // Assuming mutations are in './mutations.ts'
import { RootState } from '@/types/store'; // Assuming RootState type is defined here

// --- Import UserState from the central types file ---
import { UserState, User } from '@/types/user'; // Import User if needed for lists
import initialState from './state'; // Import the initial state object

// --- Getters ---
// Type annotations use the imported UserState
const getters = {
    isAuthenticated: (state: UserState): boolean => state.isAuthenticated,
    getUser: (state: UserState): User | null => { // Return User or null
        if (!state.uid) return null;
        // Construct a User object from the state pieces
        return {
            uid: state.uid,
            name: state.name || 'User', // Provide default name if null
            xpByRole: state.xpByRole ? { ...state.xpByRole } : {},
            skills: state.skills ? [...state.skills] : [],
            preferredRoles: state.preferredRoles ? [...state.preferredRoles] : [],
            isAuthenticated: state.isAuthenticated,
            lastXpCalculationTimestamp: state.lastXpCalculationTimestamp,
            // Add other fields from User type if they exist in state
        };
    },
    userId: (state: UserState): string | null => state.uid, // Getter for just the UID
    hasFetchedUserData: (state: UserState): boolean => state.hasFetched,

    getAllUsers: (state: UserState): User[] => state.allUsers || [], // Ensure array return
    getStudentList: (state: UserState): User[] => state.studentList || [], // Ensure array return

    isUserLoading: (state: UserState): boolean => state.loading,
    getUserError: (state: UserState): Error | null => state.error, // Use Error | null
    isStudentListLoading: (state: UserState): boolean => state.studentListLoading,
    getStudentListError: (state: UserState): Error | null => state.studentListError, // Use Error | null

    // Use the map directly for lookup
    getCachedUserName: (state: UserState) => (userId: string): string | undefined => {
        return state.nameCache.get(userId)?.name;
    },

    currentUserTotalXp: (state: UserState): number => {
        if (typeof state.xpByRole !== 'object' || state.xpByRole === null) {
            return 0;
        }
        // Ensure values are numbers before reducing
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
    ...userMutations, // Spread mutations from mutations.ts
};

// --- Actions ---
// Type annotations use the imported UserState
const actions = {
    ...userActions,
};

// --- Export Module ---
// Ensure the Module type uses the imported UserState
export const userModule: Module<UserState, RootState> = {
    namespaced: true,
    state: initialState,
    getters,
    actions,
    mutations,
};

export default userModule;