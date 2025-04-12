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
                // Trigger XP calculation after user data is loaded
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

    // --- REFACTORED calculateUserXP (Handles Closed Events & Winner-Takes-All) ---
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
            const lastSyncTime = state.lastXpCalculationTimestamp ? Timestamp.fromDate(new Date(state.lastXpCalculationTimestamp)) : null;
            let eventsQuery;

            // Fetch events that are CLOSED and were closed after the last sync time
            if (lastSyncTime) {
                console.log("Fetching events closed after:", lastSyncTime);
                eventsQuery = query(
                    collection(db, "events"),
                    where("closed", "==", true), // Only CLOSED events
                    where("closedAt", ">", lastSyncTime) // Only events closed since last sync
                );
            } else {
                console.log("Initial XP calculation, fetching all closed events.");
                eventsQuery = query(collection(db, "events"), where("closed", "==", true)); // Fetch all CLOSED events
            }
            const eventsSnapshot = await getDocs(eventsQuery);

            if (eventsSnapshot.empty) {
                console.log("No newly closed events found since last sync. XP calculation skipped.");
                 // Update timestamp even if no events found to avoid re-checking
                 if (state.uid) { // Ensure user context exists before updating timestamp
                     const userRef = doc(db, 'users', state.uid);
                     const userSnap = await getDoc(userRef);
                     // Only update if the timestamp doesn't exist yet (initial run after adding the field)
                     if (userSnap.exists() && !userSnap.data().lastXpCalculationTimestamp) {
                         await updateDoc(userRef, { lastXpCalculationTimestamp: Timestamp.now() });
                         commit('setLastXpCalculationTimestamp', Date.now());
                         console.log("Updated initial lastXpCalculationTimestamp.");
                     } else if (userSnap.exists() && lastSyncTime) {
                         // If not initial run, update timestamp to now to prevent re-processing
                         await updateDoc(userRef, { lastXpCalculationTimestamp: Timestamp.now() });
                         commit('setLastXpCalculationTimestamp', Date.now());
                         console.log("Updated lastXpCalculationTimestamp (no new events).");
                     }
                 }
                return; // Exit early if no relevant events
            }

            // Initialize XP map based on current state or default
            const currentXpMap = state.xpByRole || {};
            // IMPORTANT: Start with the current XP, don't reset to 0 each time
            const totalXpByRole = {
                fullstack: currentXpMap.fullstack || 0,
                presenter: currentXpMap.presenter || 0,
                designer: currentXpMap.designer || 0,
                organizer: currentXpMap.organizer || 0,
                problemSolver: currentXpMap.problemSolver || 0,
                participation: currentXpMap.participation || 0,
                general: currentXpMap.general || 0
            };

            const MAX_RATING_SCORE = 5; // Used for organizer rating calculation
            const MAX_ORGANIZER_XP = 100; // Max possible XP from organization ratings
            const BEST_PERFORMER_XP_BONUS = 10; // XP Bonus for being selected best performer

            let participatedEventCount = 0;
            let organizedEventCount = 0;

            for (const eventDoc of eventsSnapshot.docs) {
                const event = eventDoc.data();
                const eventId = eventDoc.id;
                let participated = false;
                let userTeamName = null;
                const eventXpAllocation = Array.isArray(event.xpAllocation) ? event.xpAllocation : [];
                const isCurrentUserOrganizer = Array.isArray(event.organizers) && event.organizers.includes(state.uid);

                // --- Determine Participation ---
                if (event.isTeamEvent && Array.isArray(event.teams)) {
                    const userTeam = event.teams.find(team => Array.isArray(team.members) && team.members.includes(state.uid));
                    if (userTeam) {
                        participated = true;
                        userTeamName = userTeam.teamName;
                    }
                } else if (!event.isTeamEvent && Array.isArray(event.participants) && event.participants.includes(state.uid)) {
                    participated = true;
                }

                // --- XP Calculation for Participants ---
                if (participated) {
                    participatedEventCount++;

                    // 1. Participation XP (Base) - Awarded regardless of rating/winning
                    const participationXP = event.isTeamEvent ? 1 : 2;
                    totalXpByRole.participation += participationXP;
                    console.log(`Event ${eventId} (Participant): +${participationXP} XP (Participation)`);

                    // 2. Criteria-Based XP
                    if (event.isTeamEvent) {
                        // --- Team Event Criteria XP ---
                        const teamCriteriaRatings = event.teamCriteriaRatings || [];
                        if (teamCriteriaRatings.length > 0 && eventXpAllocation.length > 0) {
                            console.log(`Event ${eventId}: Calculating team criteria XP from ${teamCriteriaRatings.length} submissions.`);

                            // Aggregate votes
                            const criteriaVotes = {};
                            const bestPerformerVotes = {};
                            teamCriteriaRatings.forEach(rating => {
                                if (rating.criteriaSelections) {
                                    Object.entries(rating.criteriaSelections).forEach(([indexStr, teamName]) => {
                                        const index = parseInt(indexStr, 10);
                                        if (!criteriaVotes[index]) criteriaVotes[index] = {};
                                        criteriaVotes[index][teamName] = (criteriaVotes[index][teamName] || 0) + 1;
                                    });
                                }
                                if (rating.bestPerformer) {
                                    bestPerformerVotes[rating.bestPerformer] = (bestPerformerVotes[rating.bestPerformer] || 0) + 1;
                                }
                            });

                            // Determine winning team per criterion
                            const winningTeamsByCriterion = {};
                            Object.entries(criteriaVotes).forEach(([indexStr, teamCounts]) => {
                                let winningTeam = null; let maxVotes = 0;
                                Object.entries(teamCounts).forEach(([teamName, count]) => {
                                    if (count > maxVotes) { maxVotes = count; winningTeam = teamName; }
                                    else if (count === maxVotes) { winningTeam = null; } // Tie = no winner
                                });
                                if (winningTeam) winningTeamsByCriterion[parseInt(indexStr, 10)] = winningTeam;
                            });

                            // Determine overall best performer
                            let overallBestPerformer = null; let maxPerformerVotes = 0;
                            Object.entries(bestPerformerVotes).forEach(([userId, count]) => {
                                if (count > maxPerformerVotes) { maxPerformerVotes = count; overallBestPerformer = userId; }
                                else if (count === maxPerformerVotes) { overallBestPerformer = null; } // Tie = no winner
                            });

                            // Award XP based on winning teams (Divided among members)
                            for (const alloc of eventXpAllocation) {
                                const winningTeamName = winningTeamsByCriterion[alloc.constraintIndex];
                                // Check if the user's team is the winning team for this criterion
                                if (winningTeamName && winningTeamName === userTeamName) {
                                    const winningTeamData = event.teams.find(t => t.teamName === winningTeamName);
                                    const teamMemberCount = winningTeamData?.members?.length || 1; // Avoid division by zero
                                    
                                    const allocatedPoints = Number(alloc.points) || 0;
                                    // Divide points equally and round
                                    const pointsPerMember = teamMemberCount > 0 ? Math.round(allocatedPoints / teamMemberCount) : 0; 

                                    let targetRole = alloc.role || 'general';
                                    if (targetRole === 'organizer') targetRole = 'general'; // Redirect

                                    if (pointsPerMember > 0 && totalXpByRole.hasOwnProperty(targetRole)) {
                                        totalXpByRole[targetRole] += pointsPerMember;
                                        console.log(`Event ${eventId} (Team Participant): +${pointsPerMember} XP (Team win: ${allocatedPoints}/${teamMemberCount}) to Role '${targetRole}' for criterion '${alloc.constraintLabel}'`);
                                    } else if (pointsPerMember > 0) {
                                         totalXpByRole['general'] += pointsPerMember; // Fallback
                                         console.warn(`Event ${eventId} (Team Participant): Criterion '${alloc.constraintLabel}' specified unknown role '${targetRole}'. Awarding ${pointsPerMember} XP to 'general'.`);
                                    }
                                }
                            }

                            // Award XP for Best Performer
                            if (overallBestPerformer && overallBestPerformer === state.uid) {
                                totalXpByRole.general += BEST_PERFORMER_XP_BONUS;
                                console.log(`Event ${eventId} (Team Participant): +${BEST_PERFORMER_XP_BONUS} XP to Role 'general' for being selected Best Performer.`);
                            }

                        } else {
                             console.log(`Event ${eventId}: No team criteria ratings or XP allocation found, skipping team criteria XP.`);
                        }
                    } else {
                        // --- Individual Event Criteria XP (Winner Takes All) ---
                        const winnersData = event.winnersPerRole || {}; // { role: [winnerId], ... }
                        if (Object.keys(winnersData).length > 0 && eventXpAllocation.length > 0) {
                            console.log(`Event ${eventId}: Calculating individual winner XP based on winnersPerRole.`);

                            for (const alloc of eventXpAllocation) {
                                const targetRole = alloc.role || 'general'; // Role defined in the criterion
                                const winnerId = winnersData[targetRole]?.[0]; // Get the winner for this role/criterion

                                // Check if the current user is the winner for this criterion
                                if (winnerId && winnerId === state.uid) {
                                    const allocatedPoints = Number(alloc.points) || 0;
                                    let xpTargetRole = targetRole; // Use the role defined in allocation for XP assignment
                                    if (xpTargetRole === 'organizer') xpTargetRole = 'general'; // Redirect organizer XP

                                    if (allocatedPoints > 0) {
                                        if (totalXpByRole.hasOwnProperty(xpTargetRole)) {
                                            totalXpByRole[xpTargetRole] += allocatedPoints;
                                            console.log(`Event ${eventId} (Individual Winner): +${allocatedPoints} XP to Role '${xpTargetRole}' for winning criterion '${alloc.constraintLabel}'`);
                                        } else {
                                            totalXpByRole['general'] += allocatedPoints; // Fallback
                                            console.warn(`Event ${eventId} (Individual Winner): Criterion '${alloc.constraintLabel}' specified unknown role '${xpTargetRole}'. Awarding ${allocatedPoints} XP to 'general'.`);
                                        }
                                    }
                                }
                            }
                        } else {
                             console.log(`Event ${eventId}: No winners selected or XP allocation defined, skipping individual winner XP calculation.`);
                        }
                    }
                }

                // --- XP Calculation for Organizers (Unchanged) ---
                if (isCurrentUserOrganizer) {
                    organizedEventCount++;
                    const orgRatings = event.organizationRatings;
                    if (Array.isArray(orgRatings) && orgRatings.length > 0) {
                        let sumScores = 0; let validRatingsCount = 0;
                        for (const score of orgRatings) {
                             const numericScore = Number(score);
                             if (!isNaN(numericScore) && numericScore >= 0 && numericScore <= MAX_RATING_SCORE) {
                                 sumScores += numericScore; validRatingsCount++;
                             }
                        }
                        if (validRatingsCount > 0) {
                            const averageOrgScore = sumScores / validRatingsCount;
                            const organizerXpEarned = Math.floor((averageOrgScore / MAX_RATING_SCORE) * MAX_ORGANIZER_XP);
                            if (organizerXpEarned > 0) {
                                totalXpByRole.organizer += organizerXpEarned;
                                console.log(`Event ${eventId} (Organizer): +${organizerXpEarned} XP to Role 'organizer' based on organization rating (Avg Score: ${averageOrgScore.toFixed(2)})`);
                            }
                        } else { console.log(`Event ${eventId} (Organizer): No valid organization ratings found.`); }
                    } else { console.log(`Event ${eventId} (Organizer): No organization ratings array found or it's empty.`); }
                }
            } // End loop through events

            console.log(`Processed ${eventsSnapshot.size} newly closed events since last sync. User participated in ${participatedEventCount}, organized ${organizedEventCount}.`);
            console.log("Final Calculated XP By Role:", totalXpByRole);

            // --- Compare and Update Firestore/State ---
            let changed = false;
            const newXpMap = {}; // Build a clean map with only non-zero values if desired, or keep all
            for (const roleKey in totalXpByRole) {
                 if (totalXpByRole[roleKey] > 0) { // Only include roles with XP > 0
                     newXpMap[roleKey] = totalXpByRole[roleKey];
                 }
                 // Check against current state (including zero values)
                 if ((totalXpByRole[roleKey] || 0) !== (currentXpMap[roleKey] || 0)) {
                     changed = true;
                 }
            }
             // Also check if any roles were removed (went from >0 to 0)
             for (const roleKey in currentXpMap) {
                 if ((currentXpMap[roleKey] || 0) > 0 && !(totalXpByRole[roleKey] > 0)) {
                     changed = true;
                     break;
                 }
             }


            if (changed) {
                console.log("XP map changed. Updating Firestore and local state.");
                const userRef = doc(db, 'users', state.uid);
                await updateDoc(userRef, {
                    xpByRole: newXpMap, // Store the potentially cleaned map
                    lastXpCalculationTimestamp: Timestamp.now()
                });
                commit('setUserXpByRole', newXpMap); // Update local state with the same map
                commit('setLastXpCalculationTimestamp', Date.now());
            } else {
                console.log("XP map unchanged. Updating sync timestamp only.");
                 // Update timestamp even if XP didn't change, to avoid re-processing old events
                 const userRef = doc(db, 'users', state.uid);
                 await updateDoc(userRef, { lastXpCalculationTimestamp: Timestamp.now() });
                commit('setLastXpCalculationTimestamp', Date.now());
            }

        } catch (error) {
            console.error("Error calculating user XP distribution:", error);
            // Avoid setting timestamp on error to retry calculation later
        }
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
