import { db } from '../../../firebase';
import { doc, getDoc, updateDoc, arrayUnion, collection, getDocs, query, where, Timestamp } from 'firebase/firestore';

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
                dispatch('calculateUserXP').catch(err => console.error("Background XP calculation failed:", err));
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

    async calculateUserXP({ commit, state, dispatch, rootGetters }) {
        if (!state.uid) {
            console.log("calculateUserXP: No user UID found, skipping calculation.");
            return;
        }
        if (!state.isAuthenticated) {
            console.log("calculateUserXP: User not authenticated, skipping calculation.");
            return;
        }

        console.log("Calculating XP distribution for user:", state.uid);
        try {
            const eventsQuery = query(collection(db, "events"), where("status", "==", "Completed"));
            const eventsSnapshot = await getDocs(eventsQuery);

            const totalXpByRole = {
                fullstack: 0, presenter: 0, designer: 0, organizer: 0, problemSolver: 0
            };
            const defaultRoleKeys = Object.keys(totalXpByRole);

            let participatedEventCount = 0;

            for (const eventDoc of eventsSnapshot.docs) {
                const event = eventDoc.data();
                const eventId = eventDoc.id;
                let participated = false;
                let eventXp = 0;
                let teamNameIfWinner = null;

                if (event.isTeamEvent && Array.isArray(event.teams)) {
                    const userTeam = event.teams.find(team => Array.isArray(team.members) && team.members.includes(state.uid));
                    if (userTeam) {
                        participated = true;
                        teamNameIfWinner = userTeam.teamName;
                        eventXp = rootGetters['events/_calculateWeightedAverageScore'](userTeam.ratings || []) * 10;
                    }
                } else if (!event.isTeamEvent && Array.isArray(event.participants) && event.participants.includes(state.uid)) {
                    participated = true;
                    const userRatings = (Array.isArray(event.ratings) ? event.ratings : []).filter(r => r.ratedTo === state.uid);
                    eventXp = rootGetters['events/_calculateWeightedAverageScore'](userRatings) * 10;
                }

                if (participated) {
                    participatedEventCount++;
                    let isWinner = false;
                    const winnerBonus = 100;
                    if (Array.isArray(event.winners) && event.winners.length > 0) {
                        if (event.isTeamEvent && teamNameIfWinner && event.winners.includes(teamNameIfWinner)) {
                            isWinner = true;
                        } else if (!event.isTeamEvent && event.winners.includes(state.uid)) {
                            isWinner = true;
                        }

                        if (isWinner) {
                            eventXp += winnerBonus;
                            console.log(`Event ${eventId}: +${winnerBonus} XP (Winner Bonus) added.`);
                        }
                    }

                    eventXp = Math.max(0, Math.floor(eventXp));

                    if (eventXp > 0) {
                        console.log(`Event ${eventId}: Total +${eventXp} XP. Distributing to roles...`);
                        for (const roleKey of defaultRoleKeys) {
                            totalXpByRole[roleKey] = (totalXpByRole[roleKey] || 0) + eventXp;
                        }
                    }
                }
            }

            console.log(`Processed ${eventsSnapshot.size} completed events. User participated in ${participatedEventCount}.`);
            console.log("Total Calculated XP By Role:", totalXpByRole);

            const currentXpMap = state.xpByRole || {};
            let changed = false;
            if (Object.keys(totalXpByRole).length !== Object.keys(currentXpMap).length) {
                changed = true;
            } else {
                for (const roleKey of defaultRoleKeys) {
                    if ((totalXpByRole[roleKey] || 0) !== (currentXpMap[roleKey] || 0)) {
                        changed = true; break;
                    }
                }
            }

            if (changed) {
                console.log("XP map changed. Updating Firestore and local state.");
                const userRef = doc(db, 'users', state.uid);
                await updateDoc(userRef, { xpByRole: totalXpByRole });
                commit('setUserXpByRole', totalXpByRole);
            } else {
                console.log("XP map unchanged. No update needed.");
            }

        } catch (error) {
            console.error("Error calculating user XP distribution:", error);
        }
    },

    async submitRating({ state, rootGetters, dispatch }, { eventId, teamId, members, ratingData }) {
        try {
            const eventData = await dispatch('events/fetchEventDetails', eventId, { root: true });
            if (!eventData) throw new Error('Event not found.');

            if (eventData.status !== 'Completed' || !eventData.ratingsOpen) {
                throw new Error('Ratings are currently closed for this event.');
            }

            const currentUserUID = state.uid;
            if (!currentUserUID) throw new Error("User not authenticated.");
            const currentUserRole = rootGetters['user/getUserRole'];

            let alreadyRated = false;
            if (eventData.isTeamEvent) {
                if (!teamId) throw new Error("Team ID missing for team rating.");
                const team = (Array.isArray(eventData.teams) ? eventData.teams : []).find(t => t.teamName === teamId);
                alreadyRated = Array.isArray(team?.ratings) && team.ratings.some(r => r.ratedBy === currentUserUID);
            } else {
                const targetMemberUID = Array.isArray(members) ? members[0] : null;
                if (!targetMemberUID) throw new Error("Participant ID missing for individual rating.");
                alreadyRated = Array.isArray(eventData.ratings) && eventData.ratings.some(r => r.ratedBy === currentUserUID && r.ratedTo === targetMemberUID);
            }

            if (alreadyRated) {
                throw new Error('You have already submitted a rating for this participant/team.');
            }

            const ratingEntry = {
                ratedBy: currentUserUID,
                rating: { ...ratingData },
                timestamp: Timestamp.now()
            };

            const eventDocRef = doc(db, 'events', eventId);

            if (eventData.isTeamEvent) {
                const currentTeams = Array.isArray(eventData.teams) ? eventData.teams : [];
                const teamIndex = currentTeams.findIndex(t => t.teamName === teamId);
                if (teamIndex === -1) throw new Error('Team not found (consistency error).');

                const updatedTeams = JSON.parse(JSON.stringify(currentTeams));
                if (!Array.isArray(updatedTeams[teamIndex].ratings)) {
                    updatedTeams[teamIndex].ratings = [];
                }
                updatedTeams[teamIndex].ratings.push(ratingEntry);
                await updateDoc(eventDocRef, { teams: updatedTeams });

                dispatch('events/updateLocalEvent', { id: eventId, changes: { teams: updatedTeams } }, { root: true });

            } else {
                const ratedToUID = members[0];
                ratingEntry.ratedTo = ratedToUID;

                await updateDoc(eventDocRef, {
                    ratings: arrayUnion(ratingEntry)
                });

                const freshSnap = await getDoc(eventDocRef);
                const updatedRatings = freshSnap.data()?.ratings || [];
                dispatch('events/updateLocalEvent', { id: eventId, changes: { ratings: updatedRatings } }, { root: true });
            }

        } catch (error) {
            console.error('Error submitting rating:', error);
            throw error;
        }
    },

    async fetchAllStudentUIDs() {
        console.log("Fetching all student UIDs...");
        try {
            const usersRef = collection(db, 'users');
            const q = query(usersRef);
            const querySnapshot = await getDocs(q);

            const studentUIDs = querySnapshot.docs
                .map(doc => ({ uid: doc.id, role: doc.data().role || 'Student' }))
                .filter(user => user.role === 'Student')
                .map(student => student.uid);

            console.log(`Found ${studentUIDs.length} student UIDs.`);
            return studentUIDs;
        } catch (error) {
            console.error("Error fetching all student UIDs:", error);
            return [];
        }
    },

    async refreshUserData({ commit, state, dispatch }) {
        if (state.uid) {
            console.log("Refreshing user data manually...");
            await dispatch('fetchUserData', state.uid);
        } else {
            console.log("Cannot refresh, no user UID.");
        }
    }
};