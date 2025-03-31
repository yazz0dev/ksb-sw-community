export const userMutations = {
    setUserData(state, userData) {
        state.uid = userData.uid;
        state.name = userData.name;
        state.role = userData.role || 'Student'; // Default role if missing

        // Clear student-specific fields if the user is an Admin
        if (state.role === 'Admin') {
            state.xpByRole = { fullstack: 0, presenter: 0, designer: 0, organizer: 0, problemSolver: 0 };
            state.skills = [];
            state.preferredRoles = [];
            // Add any other student-specific fields here to clear them for Admins
        } else {
            // Set student-specific fields only for non-Admins
            // Set xpByRole, ensuring default structure and numbers if missing/invalid from DB
            const defaultXp = { fullstack: 0, presenter: 0, designer: 0, organizer: 0, problemSolver: 0 };
            const dbXp = userData.xpByRole || {};
            state.xpByRole = Object.keys(defaultXp).reduce((acc, key) => {
                acc[key] = Number(dbXp[key]) || 0; // Ensure number, default to 0
                return acc;
            }, {});

            state.skills = Array.isArray(userData.skills) ? userData.skills : []; // Ensure array
            state.preferredRoles = Array.isArray(userData.preferredRoles) ? userData.preferredRoles : []; // Ensure array
        }

        state.isAuthenticated = !!userData.isAuthenticated; // Ensure boolean
        // hasFetched is set separately in the action's finally block
    },
    clearUserData(state) {
        state.uid = null;
        state.name = null;
        state.role = null;
        // Reset xpByRole map
        state.xpByRole = {
            fullstack: 0, presenter: 0, designer: 0, organizer: 0, problemSolver: 0
        };
        state.skills = [];
        state.preferredRoles = [];
        state.isAuthenticated = false;
        // state.hasFetched = false; // Don't reset hasFetched on clear, only on new fetch attempt start
    },
    setUserXpByRole(state, xpByRoleMap) {
        // Ensure the map structure is correct and values are numbers
        const defaultXp = { fullstack: 0, presenter: 0, designer: 0, organizer: 0, problemSolver: 0 };
        const newMap = xpByRoleMap || {};
        state.xpByRole = Object.keys(defaultXp).reduce((acc, key) => {
            acc[key] = Number(newMap[key]) || 0; // Ensure number, default to 0
            return acc;
        }, {});
    },
    setHasFetched(state, fetched) {
        state.hasFetched = !!fetched; // Ensure boolean
    }
};
