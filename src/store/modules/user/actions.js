import { db } from '../../../firebase';
import { doc, getDoc, updateDoc, arrayUnion, collection, getDocs, query, where, Timestamp, documentId, increment } from 'firebase/firestore';

export const userActions = {
    async fetchUserData({ commit, dispatch }, uid) {
        console.log(`fetchUserData called for UID: ${uid}`);
        commit('setHasFetched', false);
        try {
            const userDocRef = doc(db, 'users', uid);
            const userDocSnap = await getDoc(userDocRef);

            if (userDocSnap.exists()) {
                const userData = userDocSnap.data();
                console.log("Fetched user data:", userData);
                commit('setUserData', {
                    uid,
                    ...userData,
                    isAuthenticated: true,
                });
            } else {
                console.warn(`User document not found for UID: ${uid}. May need to create one.`);
                commit('clearUserData');
            }
        } catch (error) {
            console.error('Error fetching user data:', error);
            commit('clearUserData');
        } finally {
            commit('setHasFetched', true);
            console.log("fetchUserData completed.");
        }
    },

    clearUserData({ commit }) {
        console.log("Clearing user data.");
        commit('clearUserData');
    },

    async fetchAllStudentUIDs() {
        console.log("Fetching all student UIDs...");
        try {
            const usersRef = collection(db, 'users');
            const q = query(usersRef); // Fetch all users first
            const querySnapshot = await getDocs(q);

            const studentUIDs = querySnapshot.docs
                .map(doc => ({ uid: doc.id, role: doc.data().role || 'Student' })) // Assume 'Student' if role is missing
                .filter(user => user.role === 'Student') // Filter for students
                .map(student => student.uid);

            console.log(`Found ${studentUIDs.length} student UIDs.`);
            return studentUIDs;
        } catch (error) {
            console.error("Error fetching all student UIDs:", error);
            return [];
        }
    },

    async fetchUserNamesBatch(_, userIds) {
        const uniqueIds = [...new Set(userIds)].filter(Boolean); // Remove duplicates and falsy values
        if (uniqueIds.length === 0) {
            return {};
        }

        const namesMap = {};
        const chunkSize = 30; // Firestore 'in' query limit

        try {
            for (let i = 0; i < uniqueIds.length; i += chunkSize) {
                const chunk = uniqueIds.slice(i, i + chunkSize);
                if (chunk.length > 0) {
                     // Query users collection where document ID is in the current chunk
                     const usersRef = collection(db, 'users');
                     const q = query(usersRef, where(documentId(), 'in', chunk)); // Use documentId()
                     const querySnapshot = await getDocs(q);

                     querySnapshot.forEach((doc) => {
                         namesMap[doc.id] = doc.data()?.name || doc.id; // Use name or fallback to UID
                     });
                }
            }
            // Ensure all requested IDs have an entry, even if not found (use UID as fallback)
            uniqueIds.forEach(id => {
                 if (!namesMap.hasOwnProperty(id)) {
                     namesMap[id] = id;
                 }
            });
             return namesMap;
        } catch (error) {
             console.error("Error fetching user names batch:", error);
             // Fallback: return UIDs for all requested IDs on error
             uniqueIds.forEach(id => {
                 namesMap[id] = id;
             });
             return namesMap;
        }
    },

    async refreshUserData({ commit, state, dispatch }) {
        if (state.uid) {
            console.log("Refreshing user data manually...");
            await dispatch('fetchUserData', state.uid);
        } else {
            console.log("Cannot refresh, no user UID.");
        }
    },

    async addXpForAction({ commit, state }, { userId, amount, role }) {
        console.log(`addXpForAction called for User: ${userId}, Role: ${role}, Amount: ${amount}`);
        if (!userId || !role || typeof amount !== 'number' || amount <= 0) {
            console.warn('addXpForAction: Invalid parameters provided.');
            return; // Or throw an error
        }

        const userDocRef = doc(db, 'users', userId);
        const xpField = `xpByRole.${role}`;

        try {
            await updateDoc(userDocRef, {
                [xpField]: increment(amount)
            });
            console.log(`Successfully added ${amount} XP to ${role} for user ${userId}`);

            // If this is the current user, update local state
            if (state.uid === userId) {
                commit('incrementUserXpRole', { role, amount });
            }
        } catch (error) {
            console.error(`Error adding ${amount} XP to ${role} for user ${userId}:`, error);
            // Decide if we need to re-throw or handle differently
             // For now, just log it, as it's often a background task
             // throw new Error(`Failed to update XP for user ${userId}.`);
        }
    },

    async fetchAllStudents({ commit }) {
        try {
            const usersRef = collection(db, 'users');
            // Fetch ALL users first
            const q = query(usersRef); 
            console.log('Fetching ALL users...'); // Updated log
            const querySnapshot = await getDocs(q);
            console.log(`Found ${querySnapshot.size} total user documents.`); // Log total doc count

            // Filter out Admins client-side
            const students = querySnapshot.docs
                .filter(doc => doc.data().role !== 'Admin') // Filter here
                .map(doc => ({
                    uid: doc.id, 
                    name: doc.data().name || 'Unnamed',
                    role: doc.data().role || 'Student'
                }))
                .sort((a, b) => (a.name || a.uid).localeCompare(b.name || b.uid));

            // Commit the filtered list to the state
            console.log(`Committing ${students.length} students (non-Admins) to state.`); // Updated log
            commit('setStudents', students);

            return students; // Return the filtered list
        } catch (error) {
            console.error("Error fetching all students:", error);
            commit('setStudents', []); // Commit empty array on error
            return [];
        }
    },

    async fetchAllUsers({ commit }) {
        try {
            const usersRef = collection(db, 'users');
            const querySnapshot = await getDocs(usersRef);

            const users = querySnapshot.docs.map(doc => ({
                uid: doc.id,
                ...doc.data(),
            }));

            commit('setAllUsers', users);
            return users;
        } catch (error) {
            console.error("Error fetching all users:", error);
            return [];
        }
    },
};
