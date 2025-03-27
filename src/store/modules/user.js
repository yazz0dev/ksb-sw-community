// /src/store/modules/user.js
import { db } from '../../firebase';
import { doc, getDoc, updateDoc, arrayUnion, collection, getDocs, query, where, Timestamp } from 'firebase/firestore';

// --- STATE ---
const state = {
  uid: null,
  name: null,
  role: null, // Student, Teacher, Admin
  xpByRole: { // ADDED xpByRole with default structure
      fullstack: 0,
      presenter: 0,
      designer: 0,
      organizer: 0,
      problemSolver: 0
      // Add more roles as needed, matching rating criteria/event types
  },
  // projects: [], // REMOVED - Projects are now derived from event submissions
  skills: [],
  preferredRoles: [],
  isAuthenticated: false,
  hasFetched: false, // Flag to track if initial fetch attempt completed
};

// --- GETTERS ---
const getters = {
  isAuthenticated: state => state.isAuthenticated,
  getUserRole: state => state.role,
  getUser: state => ({
      uid: state.uid,
      name: state.name,
      role: state.role,
      xpByRole: state.xpByRole ? { ...state.xpByRole } : {}, // Return copy
      // getTotalXp getter removed, use currentUserTotalXp instead for clarity
      // projects: state.projects ? [...state.projects] : [], // Removed
      skills: state.skills ? [...state.skills] : [],
      preferredRoles: state.preferredRoles ? [...state.preferredRoles] : [],
  }),
  isAdmin: state => state.role === 'Admin',
  hasFetchedUserData: state => state.hasFetched,
  // Getter specifically for total XP, sums up the xpByRole map
  currentUserTotalXp: (state) => {
       // Add null/undefined check for xpByRole itself
      if (typeof state.xpByRole !== 'object' || state.xpByRole === null) return 0;
      return Object.values(state.xpByRole).reduce((sum, val) => sum + (Number(val) || 0), 0); // Ensure values are numbers
  }
};

// --- ACTIONS ---
const actions = {
  async fetchUserData({ commit, dispatch }, uid) {
    // If already fetched for this UID, potentially skip refetch unless forced?
    // For now, always fetch on login/auth change.
    console.log(`fetchUserData called for UID: ${uid}`);
    commit('setHasFetched', false); // Mark as fetching
    try {
      const userDocRef = doc(db, 'users', uid);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        console.log("Fetched user data:", userData);
        commit('setUserData', {
          uid,
          ...userData,
          isAuthenticated: true, // Mark as authenticated since data exists
        });
         // Trigger XP calculation after fetching data (can run in background)
         dispatch('calculateUserXP').catch(err => console.error("Background XP calculation failed:", err));
      } else {
        // Handle case where user exists in Auth but not Firestore (e.g., first login)
        console.warn(`User document not found for UID: ${uid}. May need to create one.`);
        // For now, clear local data but keep authenticated state? Or treat as error?
        // Let's clear data and mark as not fully authenticated in our system context
        commit('clearUserData'); // Clears user data but might leave auth state inconsistent
        // Decide if a user without a Firestore doc should be logged out or handled differently.
        // For now, we might allow login but features needing roles/XP won't work.
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      commit('clearUserData'); // Clear data on error
    } finally {
       commit('setHasFetched', true); // Mark fetch attempt as complete
       console.log("fetchUserData completed. hasFetched:", state.hasFetched);
    }
  },

  clearUserData({ commit }) {
    console.log("Clearing user data.");
    commit('clearUserData');
    // Don't reset hasFetched here, it indicates the *attempt* completed.
  },

  // --- Calculate User XP ---
  // Recalculates the entire xpByRole map based on all completed events.
  async calculateUserXP({ commit, state, dispatch, rootGetters }) { // Added rootGetters
    if (!state.uid) {
        console.log("calculateUserXP: No user UID found, skipping calculation.");
        return;
    }
    if (!state.isAuthenticated) {
         console.log("calculateUserXP: User not authenticated, skipping calculation.");
         return; // Don't calculate if not properly authenticated/fetched
    }

    console.log("Calculating XP distribution for user:", state.uid);
    try {
        // Query completed events relevant to the user
        // This is complex: involves checking participants array OR teams array.
        // Firestore doesn't easily support OR queries across different structures.
        // Strategy: Fetch ALL completed events and filter client-side. Less efficient for many events, but simpler.
        const eventsQuery = query(collection(db, "events"), where("status", "==", "Completed"));
        const eventsSnapshot = await getDocs(eventsQuery);

        // Initialize/Reset XP map for accumulation
        const totalXpByRole = {
            fullstack: 0, presenter: 0, designer: 0, organizer: 0, problemSolver: 0
        };
        const defaultRoleKeys = Object.keys(totalXpByRole);

        let participatedEventCount = 0; // Track participation

        for (const eventDoc of eventsSnapshot.docs) {
            const event = eventDoc.data();
            const eventId = eventDoc.id;
            let participated = false;
            let eventXp = 0;
            let teamNameIfWinner = null; // For winner check

            // 1. Check Participation & Calculate Base XP
            if (event.isTeamEvent && Array.isArray(event.teams)) {
                const userTeam = event.teams.find(team => Array.isArray(team.members) && team.members.includes(state.uid));
                if (userTeam) {
                    participated = true;
                    teamNameIfWinner = userTeam.teamName; // Store team name for winner check
                    // Calculate XP based on team ratings
                    eventXp = rootGetters['events/_calculateWeightedAverageScore'](userTeam.ratings || []) * 10; // Use internal getter/helper
                    // console.log(`Event ${eventId} (Team ${userTeam.teamName}): Base XP = ${eventXp.toFixed(0)}`);
                }
            } else if (!event.isTeamEvent && Array.isArray(event.participants) && event.participants.includes(state.uid)) {
                participated = true;
                // Calculate XP based on individual ratings (filtered from event.ratings)
                const userRatings = (Array.isArray(event.ratings) ? event.ratings : []).filter(r => r.ratedTo === state.uid);
                eventXp = rootGetters['events/_calculateWeightedAverageScore'](userRatings) * 10; // Use internal getter/helper
                 // console.log(`Event ${eventId} (Individual): Base XP = ${eventXp.toFixed(0)}`);
            }

            if (participated) {
                participatedEventCount++;
                // 2. Check for Winner Bonus
                let isWinner = false;
                const winnerBonus = 100; // Define bonus amount
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

                // Ensure XP is non-negative
                eventXp = Math.max(0, Math.floor(eventXp));


                // 3. Distribute Event XP to Roles
                // Simple Distribution: Add eventXP to ALL role categories for now.
                // TODO: Refine distribution based on event type or rated criteria if needed.
                if (eventXp > 0) {
                    console.log(`Event ${eventId}: Total +${eventXp} XP. Distributing to roles...`);
                    for (const roleKey of defaultRoleKeys) {
                        totalXpByRole[roleKey] = (totalXpByRole[roleKey] || 0) + eventXp;
                    }
                }
            }
        } // End loop through events

        console.log(`Processed ${eventsSnapshot.size} completed events. User participated in ${participatedEventCount}.`);
        console.log("Total Calculated XP By Role:", totalXpByRole);

        // 4. Update Firestore and local state ONLY if XP map has changed
        // Avoid unnecessary writes if XP hasn't changed
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
            commit('setUserXpByRole', totalXpByRole); // Update local state
        } else {
             console.log("XP map unchanged. No update needed.");
        }

    } catch (error) {
        console.error("Error calculating user XP distribution:", error);
    }
  },

  // --- Submit Rating ---
   async submitRating({ state, rootGetters, dispatch }, { eventId, teamId, members, ratingData }) {
        try {
            // Fetch fresh event details to check status/ratingsOpen accurately
            const eventData = await dispatch('events/fetchEventDetails', eventId, { root: true }); // Use root dispatch
             if (!eventData) throw new Error('Event not found.');

             if (eventData.status !== 'Completed' || !eventData.ratingsOpen) {
                throw new Error('Ratings are currently closed for this event.');
            }

            const currentUserUID = state.uid;
             if (!currentUserUID) throw new Error("User not authenticated.");
            const currentUserRole = rootGetters['user/getUserRole']; // Get role via rootGetter


            // Check if user has already rated
            let alreadyRated = false;
             if (eventData.isTeamEvent) {
                 if (!teamId) throw new Error("Team ID missing for team rating.");
                 const team = (Array.isArray(eventData.teams) ? eventData.teams : []).find(t => t.teamName === teamId);
                 // Ensure ratings array exists before checking
                 alreadyRated = Array.isArray(team?.ratings) && team.ratings.some(r => r.ratedBy === currentUserUID);
             } else {
                 // Rating an individual participant
                 const targetMemberUID = Array.isArray(members) ? members[0] : null;
                 if (!targetMemberUID) throw new Error("Participant ID missing for individual rating.");
                 // Ensure ratings array exists before checking
                 alreadyRated = Array.isArray(eventData.ratings) && eventData.ratings.some(r => r.ratedBy === currentUserUID && r.ratedTo === targetMemberUID);
             }

            if (alreadyRated) {
                throw new Error('You have already submitted a rating for this participant/team.');
            }


            // Construct the rating entry
            const ratingEntry = {
                    ratedBy: currentUserUID,
                    // Flag if Admin or Teacher is rating (higher weight)
                    isTeacherRating: currentUserRole === 'Admin' || currentUserRole === 'Teacher',
                    rating: { ...ratingData }, // The 5 constraint values
                    timestamp: Timestamp.now()
                };

             const eventDocRef = doc(db, 'events', eventId);

            // Add the rating to the appropriate array in Firestore
            if (eventData.isTeamEvent) {
                 // Find team index again (could be optimized)
                 const currentTeams = Array.isArray(eventData.teams) ? eventData.teams : [];
                 const teamIndex = currentTeams.findIndex(t => t.teamName === teamId);
                 if (teamIndex === -1) throw new Error('Team not found (consistency error).');

                 // Use arrayUnion within the team's ratings array (requires fetching team object first, more complex)
                 // Simpler approach: Read current teams, modify array, write back full teams array (less atomic but easier)
                 const updatedTeams = JSON.parse(JSON.stringify(currentTeams)); // Deep copy
                  if (!Array.isArray(updatedTeams[teamIndex].ratings)) {
                      updatedTeams[teamIndex].ratings = []; // Initialize if missing
                  }
                 updatedTeams[teamIndex].ratings.push(ratingEntry); // Add to the copied array
                 await updateDoc(eventDocRef, { teams: updatedTeams });

                 // Update local event cache
                 dispatch('events/updateLocalEvent', { id: eventId, changes: { teams: updatedTeams } }, { root: true });


            } else {
                 // Rating an individual
                 const ratedToUID = members[0];
                 ratingEntry.ratedTo = ratedToUID; // Add the target user ID

                 // Use arrayUnion to add to the top-level ratings array
                 await updateDoc(eventDocRef, {
                    ratings: arrayUnion(ratingEntry)
                });

                 // Update local event cache (fetch fresh data for arrayUnion)
                 const freshSnap = await getDoc(eventDocRef);
                 const updatedRatings = freshSnap.data()?.ratings || [];
                 dispatch('events/updateLocalEvent', { id: eventId, changes: { ratings: updatedRatings } }, { root: true });
            }

            // NOTE: XP calculation is NOT triggered immediately here.
            // It's triggered when an event status is set to 'Completed'.

        } catch (error) {
            console.error('Error submitting rating:', error);
            throw error; // Re-throw for the component
        }
    },

    // --- NEW ACTION: Get All Student UIDs ---
  async fetchAllStudentUIDs() {
    console.log("Fetching all student UIDs...");
    try {
      const usersRef = collection(db, 'users');
      // Fetch all users and filter client-side is simpler than complex OR query
      const q = query(usersRef);
      const querySnapshot = await getDocs(q);

      const studentUIDs = querySnapshot.docs
          .map(doc => ({ uid: doc.id, role: doc.data().role || 'Student' })) // Default role if missing
          .filter(user => user.role === 'Student')
          .map(student => student.uid);

      console.log(`Found ${studentUIDs.length} student UIDs.`);
      return studentUIDs;
    } catch (error) {
      console.error("Error fetching all student UIDs:", error);
      return []; // Return empty array on error
    }
  },

   // Action to refresh user data manually if needed
   async refreshUserData({ commit, state, dispatch }) {
        if (state.uid) {
            console.log("Refreshing user data manually...");
             await dispatch('fetchUserData', state.uid); // Re-run the fetch logic
        } else {
             console.log("Cannot refresh, no user UID.");
        }
   }
};

// --- MUTATIONS ---
const mutations = {
  setUserData(state, userData) {
    state.uid = userData.uid;
    state.name = userData.name;
    state.role = userData.role || 'Student'; // Default role if missing
    // Set xpByRole, ensuring default structure and numbers if missing/invalid from DB
    const defaultXp = { fullstack: 0, presenter: 0, designer: 0, organizer: 0, problemSolver: 0 };
    const dbXp = userData.xpByRole || {};
    state.xpByRole = Object.keys(defaultXp).reduce((acc, key) => {
        acc[key] = Number(dbXp[key]) || 0; // Ensure number, default to 0
        return acc;
    }, {});

    // state.projects = userData.projects ?? []; // Removed
    state.skills = Array.isArray(userData.skills) ? userData.skills : []; // Ensure array
    state.preferredRoles = Array.isArray(userData.preferredRoles) ? userData.preferredRoles : []; // Ensure array
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
    // state.projects = []; // Removed
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

export default {
  namespaced: true,
  state,
  getters,
  actions,
  mutations,
};