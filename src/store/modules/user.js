// /src/store/modules/user.js
import { db } from '../../firebase';
import { doc, getDoc, updateDoc, arrayUnion, collection, getDocs, query, where, Timestamp } from 'firebase/firestore'; // Added Timestamp

// --- STATE ---
const state = {
  uid: null,
  name: null,
  role: null,
  // xp: 0, // REMOVED xp
  xpByRole: { // ADDED xpByRole with default structure
      fullstack: 0,
      presenter: 0,
      designer: 0,
      organizer: 0,
      problemSolver: 0
  },
  projects: [],
  skills: [],
  preferredRoles: [],
  isAuthenticated: false,
  hasFetched: false,
};

// --- GETTERS ---
const getters = {
  isAuthenticated: state => state.isAuthenticated,
  getUserRole: state => state.role,
  getUser: state => ({
      uid: state.uid,
      name: state.name,
      role: state.role,
      // Calculate total XP on the fly or provide the map
      xpByRole: { ...state.xpByRole }, // Return copy of the map
      getTotalXp: (state) => Object.values(state.xpByRole || {}).reduce((sum, val) => sum + (val || 0), 0), // Getter for total XP
      projects: state.projects ? [...state.projects] : [],
      skills: state.skills ? [...state.skills] : [],
      preferredRoles: state.preferredRoles ? [...state.preferredRoles] : [],
  }),
  isAdmin: state => state.role === 'Admin',
  hasFetchedUserData: state => state.hasFetched,
  // Getter specifically for total XP
  currentUserTotalXp: (state) => Object.values(state.xpByRole || {}).reduce((sum, val) => sum + (val || 0), 0),
};

// --- ACTIONS ---
const actions = {
  async fetchUserData({ commit, dispatch }, uid) {
    try {
      const userDocRef = doc(db, 'users', uid);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        commit('setUserData', {
          uid,
          ...userData,
          isAuthenticated: true,
          hasFetched: true,
        });
         // Consider if calculating XP distribution needs to happen here or only on event completion
      } else {
        console.warn(`User document not found for UID: ${uid}`);
        commit('clearUserData');
        commit('setHasFetched', true);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      commit('clearUserData');
      commit('setHasFetched', true);
    }
  },

  clearUserData({ commit }) {
    commit('clearUserData');
    commit('setHasFetched', true);
  },

  // --- REVISED: calculateUserXP ---
  // Calculates and updates the xpByRole map based on completed events.
  async calculateUserXP({ commit, state, dispatch }) {
    if (!state.uid) return;

    console.log("Calculating XP distribution for user:", state.uid);
    try {
      const eventsQuery = query(collection(db, "events"), where("status", "==", "Completed"));
      const eventsSnapshot = await getDocs(eventsQuery);

      // Initialize a map to accumulate XP per role
      const totalXpByRole = {
          fullstack: 0,
          presenter: 0,
          designer: 0,
          organizer: 0,
          problemSolver: 0
      };
      const defaultRoleKeys = Object.keys(totalXpByRole); // Get keys for distribution

      for (const eventDoc of eventsSnapshot.docs) {
        const event = eventDoc.data();
        const eventId = eventDoc.id;
        let eventXp = 0; // XP earned from this specific event

        // 1. Calculate Base XP from the event
        if (event.isTeamEvent && event.teams && event.teams.length > 0) {
          const userTeam = event.teams.find(team => team.members && team.members.includes(state.uid));
          if (userTeam) {
            eventXp = await dispatch('calculateTeamXP', { eventId, teamId: userTeam.teamName });
          }
        } else if (!event.isTeamEvent && event.participants && event.participants.includes(state.uid)) {
           eventXp = await dispatch('calculateIndividualXP', { eventId, userId: state.uid });
        }

        // 2. Check for Winner Bonus
        let isWinner = false;
        const winnerBonus = 100; // Define bonus amount
        if (event.winners && event.winners.length > 0) {
           if (event.isTeamEvent) {
               const userTeam = event.teams?.find(team => team.members && team.members.includes(state.uid));
               if (userTeam && event.winners.includes(userTeam.teamName)) {
                   isWinner = true;
               }
           } else {
               if (event.winners.includes(state.uid)) {
                   isWinner = true;
               }
           }
           if (isWinner) {
               eventXp += winnerBonus; // Add bonus to the event's total XP
               console.log(`Event ${eventId}: +${winnerBonus} XP (Winner Bonus) added.`);
           }
        }

        // 3. Distribute Event XP to Roles (Simple Distribution: Add to ALL roles for now)
        //    **This is the part that needs refinement based on actual role logic.**
        //    If eventXp > 0, add it to each category in the accumulator.
        if (eventXp > 0) {
            console.log(`Event ${eventId}: Total +${eventXp} XP. Distributing to roles...`);
            for (const roleKey of defaultRoleKeys) {
                totalXpByRole[roleKey] = (totalXpByRole[roleKey] || 0) + eventXp;
            }
        }

      } // End loop through events

      console.log("Total Calculated XP By Role:", totalXpByRole);

      // 4. Update Firestore and local state with the new xpByRole map
      const userRef = doc(db, 'users', state.uid);
      await updateDoc(userRef, { xpByRole: totalXpByRole });
      commit('setUserXpByRole', totalXpByRole); // Update local state

    } catch (error) {
      console.error("Error calculating user XP distribution:", error);
    }
  },


  // calculateTeamXP and calculateIndividualXP remain largely the same,
  // they return a *single* numeric XP value for the specific context (team/individual in event).
  async calculateTeamXP(_, { eventId, teamId }) {
    try {
        const eventRef = doc(db, "events", eventId);
        const eventSnap = await getDoc(eventRef);
        if (!eventSnap.exists()) return 0;
        const event = eventSnap.data();
        if (!event.isTeamEvent || !event.teams) return 0;
        const team = event.teams.find(t => t.teamName === teamId);
        if (!team || !team.ratings || team.ratings.length === 0) return 0;

        let totalTeacherRating = 0, teacherRatingCount = 0;
        let totalStudentRating = 0, studentRatingCount = 0;

        for (const ratingEntry of team.ratings) {
            if (!ratingEntry.rating) continue;
            const rating = ratingEntry.rating;
            // Using fixed keys, matching the rating form submission structure
            const overallRating = (
                (rating.design || 0) +
                (rating.presentation || 0) +
                (rating.problemSolving || 0) +
                (rating.execution || 0) +
                (rating.technology || 0)
            ) / 5.0;

            if (ratingEntry.isTeacherRating) {
                totalTeacherRating += overallRating; teacherRatingCount++;
            } else {
                totalStudentRating += overallRating; studentRatingCount++;
            }
        }
        const avgTeacher = teacherRatingCount > 0 ? totalTeacherRating / teacherRatingCount : 0;
        const avgStudent = studentRatingCount > 0 ? totalStudentRating / studentRatingCount : 0;
        const weightedAvg = 0.7 * avgTeacher + 0.3 * avgStudent;
        return Math.max(0, Math.floor(weightedAvg * 10)); // Scale to XP
    } catch (error) {
        console.error(`Error calculating XP for team ${teamId} in event ${eventId}:`, error);
        return 0;
    }
},

  async calculateIndividualXP(_, { eventId, userId }) {
    try {
        const eventRef = doc(db, "events", eventId);
        const eventSnap = await getDoc(eventRef);
        if (!eventSnap.exists()) return 0;
        const event = eventSnap.data();
        if (event.isTeamEvent || !event.ratings || event.ratings.length === 0) return 0;

        let totalTeacherRating = 0, teacherRatingCount = 0;
        let totalStudentRating = 0, studentRatingCount = 0;
        const userRatings = event.ratings.filter(r => r.ratedTo === userId);
        if (userRatings.length === 0) return 0;

        for (const ratingEntry of userRatings) {
            if (!ratingEntry.rating) continue;
            const rating = ratingEntry.rating;
             const overallRating = (
                (rating.design || 0) +
                (rating.presentation || 0) +
                (rating.problemSolving || 0) +
                (rating.execution || 0) +
                (rating.technology || 0)
            ) / 5.0;

            if (ratingEntry.isTeacherRating) {
                totalTeacherRating += overallRating; teacherRatingCount++;
            } else {
                totalStudentRating += overallRating; studentRatingCount++;
            }
        }
        const avgTeacher = teacherRatingCount > 0 ? totalTeacherRating / teacherRatingCount : 0;
        const avgStudent = studentRatingCount > 0 ? totalStudentRating / studentRatingCount : 0;
        const weightedAvg = 0.7 * avgTeacher + 0.3 * avgStudent;
        return Math.max(0, Math.floor(weightedAvg * 10));
    } catch (error) {
        console.error(`Error calculating individual XP for user ${userId} in event ${eventId}:`, error);
        return 0;
    }
},


  // submitRating remains the same - it adds rating data to the event document.
  // Calculation happens separately via calculateUserXP.
   async submitRating({ dispatch, state, rootGetters }, { eventId, teamId, members, ratingData }) {
        try {
            const eventDocRef = doc(db, 'events', eventId);
            const eventDocSnap = await getDoc(eventDocRef);
            if (!eventDocSnap.exists()) throw new Error('Event not found.');
            const eventData = eventDocSnap.data();

            if (!eventData.ratingsOpen) {
                throw new Error('Ratings are currently closed for this event.');
            }

            const currentUserUID = state.uid;
            let alreadyRated = false;
            const isAdminRating = rootGetters['user/isAdmin']; // Corrected: Use rootGetters

             // Simplified check - more robust logic might be needed depending on rules
            if (eventData.isTeamEvent) {
                const team = eventData.teams?.find(t => t.teamName === teamId);
                alreadyRated = team?.ratings?.some(r => r.ratedBy === currentUserUID);
            } else {
                const targetMemberUID = members?.[0];
                 if (targetMemberUID) {
                     alreadyRated = eventData.ratings?.some(r => r.ratedBy === currentUserUID && r.ratedTo === targetMemberUID);
                 }
            }
            if (alreadyRated) {
                throw new Error('You have already submitted a rating for this participant/team.');
            }


            const ratingEntry = {
                    ratedBy: state.uid,
                    // Renamed: Flag if admin/teacher rated, not just admin
                    isTeacherRating: rootGetters['user/isAdmin'] || rootGetters['user/getUserRole'] === 'Teacher',
                    rating: { ...ratingData },
                    timestamp: Timestamp.now()
                };

            if (eventData.isTeamEvent) {
                if (!teamId) throw new Error('Team ID is required for team events.');
                const teamIndex = eventData.teams.findIndex(t => t.teamName === teamId);
                if (teamIndex === -1) throw new Error('Team not found.');

                 const updatedTeams = [...eventData.teams];
                 const teamRatings = updatedTeams[teamIndex].ratings ? [...updatedTeams[teamIndex].ratings, ratingEntry] : [ratingEntry];
                 updatedTeams[teamIndex] = { ...updatedTeams[teamIndex], ratings: teamRatings };
                await updateDoc(eventDocRef, { teams: updatedTeams });

            } else {
                 if (!members || members.length === 0) throw new Error("No participant specified for rating.");
                 const ratedToUID = members[0];
                 // Add ratedTo field for individual ratings
                 ratingEntry.ratedTo = ratedToUID;

                 await updateDoc(eventDocRef, {
                    ratings: arrayUnion(ratingEntry)
                });
            }
            // NOTE: XP calculation is NOT triggered immediately here.
            // It should be triggered when an event status is set to 'Completed'.

        } catch (error) {
            console.error('Error submitting rating:', error);
            throw error;
        }
    },

   async refreshUserData({ commit, state }) {
        if (state.uid) {
            try {
                const userDocRef = doc(db, 'users', state.uid);
                const userDocSnap = await getDoc(userDocRef);
                if (userDocSnap.exists()) {
                     const userData = userDocSnap.data();
                    commit('setUserData', { uid: state.uid, ...userData, isAuthenticated: true, hasFetched: true });
                } else {
                    commit('clearUserData');
                    commit('setHasFetched', true);
                }
            } catch (error) {
                console.error("Error refreshing user data:", error);
            }
        }
   }
};

// --- MUTATIONS ---
const mutations = {
  setUserData(state, userData) {
    state.uid = userData.uid;
    state.name = userData.name;
    state.role = userData.role || 'Student';
    // state.xp = userData.xp ?? 0; // REMOVED xp
    // Set xpByRole, ensuring default structure if missing from DB
    state.xpByRole = {
        fullstack: userData.xpByRole?.fullstack ?? 0,
        presenter: userData.xpByRole?.presenter ?? 0,
        designer: userData.xpByRole?.designer ?? 0,
        organizer: userData.xpByRole?.organizer ?? 0,
        problemSolver: userData.xpByRole?.problemSolver ?? 0,
    };
    state.projects = userData.projects ?? [];
    state.skills = userData.skills ?? [];
    state.preferredRoles = userData.preferredRoles ?? [];
    state.isAuthenticated = userData.isAuthenticated;
    state.hasFetched = userData.hasFetched ?? state.hasFetched;
  },
  clearUserData(state) {
    state.uid = null;
    state.name = null;
    state.role = null;
    // state.xp = 0; // REMOVED xp
    // Reset xpByRole map
    state.xpByRole = {
        fullstack: 0, presenter: 0, designer: 0, organizer: 0, problemSolver: 0
    };
    state.projects = [];
    state.skills = [];
    state.preferredRoles = [];
    state.isAuthenticated = false;
    state.hasFetched = false;
  },
  // setUserXP(state, xp) { // REMOVED mutation
  //     state.xp = xp;
  // },
  setUserXpByRole(state, xpByRoleMap) { // ADDED mutation for map
      state.xpByRole = { ...xpByRoleMap };
  },
  setHasFetched(state, fetched) {
      state.hasFetched = fetched;
  }
};

export default {
  namespaced: true,
  state,
  getters,
  actions,
  mutations,
};