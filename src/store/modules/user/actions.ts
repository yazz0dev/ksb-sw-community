import { ActionTree } from 'vuex';
import { UserState, UserData, User, NameCacheMap } from '@/types/user';
import { RootState } from '@/types/store';
import { db } from '../../../firebase';
import { 
    doc, 
    getDoc, 
    updateDoc, 
    collection, 
    getDocs, 
    query, 
    where, 
    documentId, 
    increment 
} from 'firebase/firestore';

export const userActions: ActionTree<UserState, RootState> = {
    async fetchUserData({ commit, dispatch }, uid: string): Promise<void> {
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

    async fetchAllStudentUIDs(): Promise<string[]> {
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

    async fetchUserNamesBatch({ commit }, uids: string[]): Promise<Record<string, string>> {
        try {
            // Debug log
            console.log('[User Actions] Fetching names for UIDs:', uids);
            
            const usersRef = collection(db, 'users');
            const userDocs = await Promise.all(
                uids.map(uid => getDoc(doc(usersRef, uid)))
            );

            const nameMap: Record<string, string> = {};
            userDocs.forEach((doc, idx) => {
                if (doc.exists()) {
                    const name = doc.data().name || `User ${uids[idx].substring(0, 5)}`;
                    nameMap[uids[idx]] = name;
                    // Add to cache with individual commits
                    commit('addToNameCache', { uid: uids[idx], name });
                }
            });

            // Debug log
            console.log('[User Actions] Fetched names:', nameMap);
            
            return nameMap;
        } catch (error) {
            console.error('Error fetching user names:', error);
            return {};
        }
    },

    async refreshUserData({ commit, state, dispatch }): Promise<void> {
        if (state.uid) {
            console.log("Refreshing user data manually...");
            await dispatch('fetchUserData', state.uid);
        } else {
            console.log("Cannot refresh, no user UID.");
        }
    },

    async addXpForAction({ commit, state }, { 
        userId, 
        amount, 
        role 
    }: { 
        userId: string; 
        amount: number; 
        role: string;
    }): Promise<void> {
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

    async fetchAllStudents({ commit }): Promise<UserData[]> {
        try {
            const usersRef = collection(db, 'users');
            const q = query(usersRef); 
            console.log('Fetching ALL users...');
            const querySnapshot = await getDocs(q);
            console.log(`Found ${querySnapshot.size} total user documents.`);

            const students = querySnapshot.docs
                .filter(doc => doc.data())
                .map(doc => ({
                    uid: doc.id, 
                    name: doc.data().name || 'Unnamed',
                    role: doc.data().role || 'Student',
                    isAuthenticated: true // Add required field
                }))
                .sort((a, b) => (a.name || a.uid).localeCompare(b.name || b.uid));

            commit('setStudentList', students);
            return students;
        } catch (error) {
            console.error("Error fetching all students:", error);
            commit('setStudentList', []);
            return [];
        }
    },

    async fetchAllUsers({ commit }): Promise<UserData[]> {
        try {
            const usersRef = collection(db, 'users');
            const querySnapshot = await getDocs(usersRef);

            const users = querySnapshot.docs.map(doc => ({
                uid: doc.id,
                ...doc.data(),
                name: doc.data().name || 'Unnamed', // Ensure name is present
                isAuthenticated: true // Add required field
            }));

            commit('setAllUsers', users);
            return users;
        } catch (error) {
            console.error("Error fetching all users:", error);
            return [];
        }
    },

    async clearUserData({ commit }): Promise<void> {
        try {
            commit('clearUserData');
            commit('setHasFetched', false);
            // Clear other related states
            commit('setStudentList', []);
            commit('setAllUsers', []);
            // Clear the name cache
            const emptyMap = new Map();
            commit('setNameCache', emptyMap);
        } catch (error) {
            console.error('Error clearing user data:', error);
        }
    },
};
