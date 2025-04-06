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
                fullstack: 0, presenter: 0, designer: 0, organizer: 0, problemSolver: 0,
                participation: 0, general: 0
            };
            const MAX_RATING_SCORE = 5; // Assume rating scale is 1-5
            const MAX_ORGANIZER_XP = 100; // Max possible XP from organization ratings

            let participatedEventCount = 0;
            let organizedEventCount = 0; // Track events organized by this user

            for (const eventDoc of eventsSnapshot.docs) {
                const event = eventDoc.data();
                const eventId = eventDoc.id;
                let participated = false;
                let userRatings = [];
                const eventXpAllocation = Array.isArray(event.xpAllocation) ? event.xpAllocation : [];
                const isCurrentUserOrganizer = Array.isArray(event.organizers) && event.organizers.includes(state.uid);

                // Determine participation and collect relevant ratings
                if (event.isTeamEvent && Array.isArray(event.teams)) {
                    const userTeam = event.teams.find(team => Array.isArray(team.members) && team.members.includes(state.uid));
                    if (userTeam) {
                        participated = true;
                        userRatings = Array.isArray(userTeam.ratings) ? userTeam.ratings : [];
                    }
                } else if (!event.isTeamEvent && Array.isArray(event.participants) && event.participants.includes(state.uid)) {
                    participated = true;
                    userRatings = (Array.isArray(event.ratings) ? event.ratings : []).filter(r => r.ratedTo === state.uid);
                }

                // --- XP Calculation for Participants ---
                if (participated) {
                    participatedEventCount++;

                    // 1. Participation XP
                    const participationXP = event.isTeamEvent ? 1 : 2;
                    totalXpByRole.participation += participationXP;
                    console.log(`Event ${eventId} (Participant): +${participationXP} XP (Participation)`);

                    // 2. Criteria-Based XP from Ratings
                    if (userRatings.length > 0 && eventXpAllocation.length > 0) {
                        console.log(`Event ${eventId}: Calculating criteria XP from ${userRatings.length} ratings.`);

                        // Calculate average score PER criterion
                        const avgScoresPerCriterion = {};
                        const ratingCountsPerCriterion = {};

                        for (const ratingEntry of userRatings) {
                             // Assuming ratingEntry.rating is an object like { 'criterionLabel': score, ... }
                            if (ratingEntry.rating && typeof ratingEntry.rating === 'object') {
                                for (const [criterionLabel, score] of Object.entries(ratingEntry.rating)) {
                                    const numericScore = Number(score);
                                    if (!isNaN(numericScore) && numericScore >= 0 && numericScore <= MAX_RATING_SCORE) {
                                        avgScoresPerCriterion[criterionLabel] = (avgScoresPerCriterion[criterionLabel] || 0) + numericScore;
                                        ratingCountsPerCriterion[criterionLabel] = (ratingCountsPerCriterion[criterionLabel] || 0) + 1;
                                    }
                                }
                            }
                        }

                        // Normalize averages
                        for (const criterionLabel in avgScoresPerCriterion) {
                            if (ratingCountsPerCriterion[criterionLabel] > 0) {
                                avgScoresPerCriterion[criterionLabel] /= ratingCountsPerCriterion[criterionLabel];
                            }
                        }
                        // console.log(`Event ${eventId}: Average scores:`, avgScoresPerCriterion);

                        // Allocate XP based on average scores and event allocation
                        for (const alloc of eventXpAllocation) {
                            const criterionLabel = alloc.constraintLabel;
                            const averageScore = avgScoresPerCriterion[criterionLabel] || 0;
                            const allocatedPoints = Number(alloc.points) || 0;
                            let targetRole = alloc.role || 'general';

                            // *** REDIRECT ORGANIZER XP TO GENERAL ***
                            if (targetRole === 'organizer') {
                                console.log(`Event ${eventId} (Participant): Redirecting XP for criterion '${criterionLabel}' from 'organizer' to 'general' role.`);
                                targetRole = 'general';
                            }
                            // ****************************************

                            if (allocatedPoints > 0 && criterionLabel) {
                                const earnedXp = Math.floor((averageScore / MAX_RATING_SCORE) * allocatedPoints);

                                if (earnedXp > 0) {
                                    if (totalXpByRole.hasOwnProperty(targetRole)) {
                                        totalXpByRole[targetRole] += earnedXp;
                                         console.log(`Event ${eventId} (Participant): +${earnedXp} XP to Role '${targetRole}' for criterion '${criterionLabel}' (Avg Score: ${averageScore.toFixed(2)})`);
                                    } else {
                                        // Handle case where targetRole from allocation isn't in our map (shouldn't happen with defaults)
                                        totalXpByRole['general'] += earnedXp; // Fallback to general
                                        console.warn(`Event ${eventId} (Participant): Criterion '${criterionLabel}' specified unknown role '${targetRole}'. Awarding ${earnedXp} XP to 'general'.`);
                                    }
                                }
                            }
                        }
                    } else if (userRatings.length === 0) {
                        console.log(`Event ${eventId}: No ratings received, skipping criteria XP calculation.`);
                    } else if (eventXpAllocation.length === 0) {
                         console.log(`Event ${eventId}: No XP allocation defined, skipping criteria XP calculation.`);
                    }
                }

                // --- XP Calculation for Organizers (Only if current user IS an organizer) ---
                if (isCurrentUserOrganizer) {
                    organizedEventCount++;
                    const orgRatings = event.organizationRatings; // Assuming this field exists now

                    if (Array.isArray(orgRatings) && orgRatings.length > 0) {
                        let sumScores = 0;
                        let validRatingsCount = 0;
                        for (const score of orgRatings) {
                             const numericScore = Number(score);
                             if (!isNaN(numericScore) && numericScore >= 0 && numericScore <= MAX_RATING_SCORE) {
                                 sumScores += numericScore;
                                 validRatingsCount++;
                             }
                        }

                        if (validRatingsCount > 0) {
                            const averageOrgScore = sumScores / validRatingsCount;
                            const organizerXpEarned = Math.floor((averageOrgScore / MAX_RATING_SCORE) * MAX_ORGANIZER_XP);

                            if (organizerXpEarned > 0) {
                                totalXpByRole.organizer += organizerXpEarned;
                                console.log(`Event ${eventId} (Organizer): +${organizerXpEarned} XP to Role 'organizer' based on organization rating (Avg Score: ${averageOrgScore.toFixed(2)})`);
                            }
                        } else {
                            console.log(`Event ${eventId} (Organizer): No valid organization ratings found.`);
                        }
                    } else {
                        console.log(`Event ${eventId} (Organizer): No organization ratings array found or it's empty.`);
                    }
                }
            }

            console.log(`Processed ${eventsSnapshot.size} completed events. User participated in ${participatedEventCount}, organized ${organizedEventCount}.`);
            console.log("Final Calculated XP By Role:", totalXpByRole);

            // Compare and update if changed
            const currentXpMap = state.xpByRole || {};
            let changed = false;
            const allRoleKeys = Object.keys(totalXpByRole);
            if (allRoleKeys.length !== Object.keys(currentXpMap).length) {
                changed = true;
            } else {
                for (const roleKey of allRoleKeys) {
                    if ((totalXpByRole[roleKey] || 0) !== (currentXpMap[roleKey] || 0)) {
                        changed = true;
                        break;
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
                if (!team) throw new Error("Target team not found for rating.");

                // *** ADD CHECK: Prevent self-team rating ***
                const usersTeam = (Array.isArray(eventData.teams) ? eventData.teams : [])
                                  .find(t => Array.isArray(t.members) && t.members.includes(currentUserUID));
                if (usersTeam && usersTeam.teamName === teamId) { 
                    throw new Error("Participants cannot rate their own team.");
                }
                // *** END CHECK ***

                alreadyRated = Array.isArray(team.ratings) && team.ratings.some(r => r.ratedBy === currentUserUID);
            } else {
                const targetMemberUID = Array.isArray(members) ? members[0] : null;
                if (!targetMemberUID) throw new Error("Participant ID missing for individual rating.");

                // *** ADD CHECK: Prevent self-rating ***
                if (currentUserUID === targetMemberUID) {
                    throw new Error("Participants cannot rate themselves.");
                }
                // *** END CHECK ***

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
            const q = query(usersRef, where('role', '!=', 'Admin')); // Exclude Admins
            const querySnapshot = await getDocs(q);

            const students = querySnapshot.docs
                .map(doc => ({ 
                    uid: doc.id, 
                    name: doc.data().name || 'Unnamed',
                    role: doc.data().role || 'Student'
                }))
                .sort((a, b) => (a.name || a.uid).localeCompare(b.name || b.uid));

            return students;
        } catch (error) {
            console.error("Error fetching all students:", error);
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