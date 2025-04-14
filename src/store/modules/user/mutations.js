export const userMutations = {
    setUserData(state, userData) {
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

    clearUserData(state) {
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

    setUserXpByRole(state, xpByRoleMap) {
        // Ensure the map structure is correct and includes all roles
        const defaultXpStructure = { fullstack: 0, presenter: 0, designer: 0, organizer: 0, problemSolver: 0, participation: 0, general: 0 };
        const newMap = xpByRoleMap || {};
        state.xpByRole = Object.keys(defaultXpStructure).reduce((acc, key) => {
            acc[key] = Number(newMap[key]) || 0; // Ensure number, default to 0
            return acc;
        }, {});
    },

    setHasFetched(state, fetched) {
        state.hasFetched = !!fetched; // Ensure boolean
    },

    incrementUserXpRole(state, { role, amount }) {
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

    // Add mutations for handling all users
    setAllUsers(state, users) {
        state.allUsers = users;
    },

    updateUser(state, userData) {
        const index = state.allUsers.findIndex(u => u.uid === userData.uid);
        if (index !== -1) {
            state.allUsers.splice(index, 1, userData);
        } else {
            state.allUsers.push(userData);
        }
    },

    removeUser(state, uid) {
        const index = state.allUsers.findIndex(u => u.uid === uid);
        if (index !== -1) {
            state.allUsers.splice(index, 1);
        }
    },
    cacheUserNames(state, namesMap) {
        state.userNameCache = { ...state.userNameCache, ...namesMap };
    },

    setLastXpCalculationTimestamp(state, timestamp) {
        state.lastXpCalculationTimestamp = timestamp;
    },

    // Mutation to store the fetched student list
    setStudents(state, students) {
        // console.log('setStudents mutation called with payload:', students); // Removed log
        if (Array.isArray(students)) {
            state.studentList = students;
            // console.log('state.studentList updated:', state.studentList); // Removed log
        } else {
            console.error('setStudents mutation received non-array payload:', students);
            state.studentList = []; // Ensure it's always an array
        }
    },
};
