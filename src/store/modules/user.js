// /src/store/modules/user.js
import { db } from '../../firebase';
// Added: collection, getDocs, query, where
import { doc, getDoc, updateDoc, arrayUnion, collection, getDocs, query, where } from 'firebase/firestore';

const state = {
  uid: null,
  name: null,
  role: null,
  xp: 0,
  projects: [],
  skills: [],
  preferredRoles: [],
  isAuthenticated: false,
  // Add a flag to indicate if data has been fetched initially
  hasFetched: false,
};

const getters = {
  isAuthenticated: state => state.isAuthenticated,
  getUserRole: state => state.role,
  getUser: state => ({ // Return a copy to prevent direct mutation
      uid: state.uid,
      name: state.name,
      role: state.role,
      xp: state.xp,
      projects: state.projects ? [...state.projects] : [], // Return copy
      skills: state.skills ? [...state.skills] : [], // Return copy
      preferredRoles: state.preferredRoles ? [...state.preferredRoles] : [], // Return copy
  }),
  isTeacher: state => state.role === 'Teacher' || state.role === 'Admin', // Keep Admin check here too
   // Getter to check if initial user data fetch is complete
  hasFetchedUserData: state => state.hasFetched,
};

const actions = {
  async fetchUserData({ commit, dispatch }, uid) { // Added dispatch
    try {
      const userDocRef = doc(db, 'users', uid);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        commit('setUserData', {
          uid,
          ...userData,
          isAuthenticated: true,
          hasFetched: true, // Mark as fetched
        });
         // Optionally calculate XP immediately after fetching user data
         // await dispatch('calculateUserXP'); // Can be intensive, consider triggering elsewhere
      } else {
        console.warn(`User document not found for UID: ${uid}`);
        commit('clearUserData'); // Clear if user doc doesn't exist
         commit('setHasFetched', true); // Mark as fetched even if user not found
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      commit('clearUserData');
       commit('setHasFetched', true); // Mark as fetched even on error
    }
  },

  clearUserData({ commit }) {
    commit('clearUserData');
    commit('setHasFetched', true); // If logging out, we consider the "fetch" complete (no user)
  },

  // Calculate XP based on *all* ratings the user has received (across all COMPLETED events)
  async calculateUserXP({ commit, state, dispatch }) { // Add dispatch
    if (!state.uid) return; // No user logged in

    console.log("Calculating XP for user:", state.uid);
    try {
      // Fetch all COMPLETED events
      const eventsQuery = query(collection(db, "events"), where("status", "==", "Completed"));
      const eventsSnapshot = await getDocs(eventsQuery);

      let totalXp = 0;
      for (const eventDoc of eventsSnapshot.docs) {
        const event = eventDoc.data();
        const eventId = eventDoc.id;

        // Team Event XP Calculation
        if (event.isTeamEvent && event.teams && event.teams.length > 0) {
          const userTeam = event.teams.find(team => team.members && team.members.includes(state.uid));
          if (userTeam) {
            // Use calculateTeamXP which now fetches event data itself if needed
            const teamXp = await dispatch('calculateTeamXP', { eventId, teamId: userTeam.teamName }); // Pass teamId
            console.log(`Event ${eventId} (Team ${userTeam.teamName}): +${teamXp} XP`);
            totalXp += teamXp;
          }
        }
        // Individual Event XP Calculation
        else if (!event.isTeamEvent && event.participants && event.participants.includes(state.uid)) {
           // Use calculateIndividualXP which now fetches event data itself
           const individualXp = await dispatch('calculateIndividualXP', { eventId, userId: state.uid });
           console.log(`Event ${eventId} (Individual): +${individualXp} XP`);
           totalXp += individualXp;
        }

        // Bonus XP for Winners
        if (event.winners && event.winners.length > 0) {
           let isWinner = false;
           if (event.isTeamEvent) {
               // Find the team the user was in
               const userTeam = event.teams?.find(team => team.members && team.members.includes(state.uid));
               // Check if that team's name is in the winners list
               if (userTeam && event.winners.includes(userTeam.teamName)) {
                   isWinner = true;
               }
           } else {
               // Check if the user's UID is directly in the winners list
               if (event.winners.includes(state.uid)) {
                   isWinner = true;
               }
           }

           if (isWinner) {
               const winnerBonus = 100; // Define bonus amount
               console.log(`Event ${eventId}: +${winnerBonus} XP (Winner Bonus)`);
               totalXp += winnerBonus;
           }
        }
      } // End loop through events

      console.log("Total Calculated XP:", totalXp);

      // Update XP in Firestore and local state
      const userRef = doc(db, 'users', state.uid);
      await updateDoc(userRef, { xp: totalXp });
      commit('setUserXP', totalXp); // Update only XP in local state

    } catch (error) {
      console.error("Error calculating user XP:", error);
    }
  },

  async calculateTeamXP(_, { eventId, teamId }) { // Changed to accept teamId
    try {
        const eventRef = doc(db, "events", eventId);
        const eventSnap = await getDoc(eventRef);

        if (!eventSnap.exists()) return 0;
        const event = eventSnap.data();

        if (!event.isTeamEvent || !event.teams) return 0;

        // Find the specific team using teamId
        const team = event.teams.find(t => t.teamName === teamId);
        if (!team || !team.ratings || team.ratings.length === 0) return 0; // Team not found or no ratings

        let totalTeacherRating = 0;
        let teacherRatingCount = 0;
        let totalStudentRating = 0;
        let studentRatingCount = 0;

        // Process ratings for THIS team
        for (const ratingEntry of team.ratings) {
            if (!ratingEntry.rating) continue; // Skip if rating data is missing
            const rating = ratingEntry.rating;
            // Ensure all constraints exist, default to 0 if not
            const overallRating = (
                (rating.design || 0) +
                (rating.presentation || 0) +
                (rating.problemSolving || 0) +
                (rating.execution || 0) +
                (rating.technology || 0)
            ) / 5.0;

            if (ratingEntry.isTeacherRating) {
                totalTeacherRating += overallRating;
                teacherRatingCount++;
            } else {
                totalStudentRating += overallRating;
                studentRatingCount++;
            }
        }

        const averageTeacherRating = teacherRatingCount > 0 ? totalTeacherRating / teacherRatingCount : 0;
        const averageStudentRating = studentRatingCount > 0 ? totalStudentRating / studentRatingCount : 0;

        // Apply weighting (e.g., 70% Teacher, 30% Student)
        const weightedAverage = 0.7 * averageTeacherRating + 0.3 * averageStudentRating;

        // Scale the XP (e.g., 1-5 rating average * 10 = 10-50 XP)
        return Math.max(0, Math.floor(weightedAverage * 10)); // Ensure XP isn't negative

    } catch (error) {
        console.error(`Error calculating XP for team ${teamId} in event ${eventId}:`, error);
        return 0;
    }
},


  async calculateIndividualXP(_, { eventId, userId }) { // userId = UID
    try {
        const eventRef = doc(db, "events", eventId);
        const eventSnap = await getDoc(eventRef);

        if (!eventSnap.exists()) return 0;
        const event = eventSnap.data();

        // Ensure it's an individual event and has ratings
        if (event.isTeamEvent || !event.ratings || event.ratings.length === 0) return 0;

        let totalTeacherRating = 0;
        let teacherRatingCount = 0;
        let totalStudentRating = 0;
        let studentRatingCount = 0;

        // Filter ratings specifically for this user
        const userRatings = event.ratings.filter(r => r.ratedTo === userId);

        if (userRatings.length === 0) return 0; // No ratings for this user in this event

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
                totalTeacherRating += overallRating;
                teacherRatingCount++;
            } else {
                totalStudentRating += overallRating;
                studentRatingCount++;
            }
        }

        const averageTeacherRating = teacherRatingCount > 0 ? totalTeacherRating / teacherRatingCount : 0;
        const averageStudentRating = studentRatingCount > 0 ? totalStudentRating / studentRatingCount : 0;

        const weightedAverage = 0.7 * averageTeacherRating + 0.3 * averageStudentRating;
        return Math.max(0, Math.floor(weightedAverage * 10));

    } catch (error) {
        console.error(`Error calculating individual XP for user ${userId} in event ${eventId}:`, error);
        return 0;
    }
},

  async submitRating({ dispatch, state, rootGetters }, { eventId, teamId, members, ratingData }) { // Use rootGetters
        try {
            const eventDocRef = doc(db, 'events', eventId);
            const eventDocSnap = await getDoc(eventDocRef);
            if (!eventDocSnap.exists()) throw new Error('Event not found.');

            const eventData = eventDocSnap.data();

            // Check if ratings are open
            if (!eventData.ratingsOpen) {
                throw new Error('Ratings are currently closed for this event.');
            }
            // Check if user has already rated (more robust check needed)
            // This basic check might not be sufficient if users can rate multiple times or edit
             const currentUserUID = state.uid;
             let alreadyRated = false;

             if (eventData.isTeamEvent) {
                const team = eventData.teams?.find(t => t.teamName === teamId);
                alreadyRated = team?.ratings?.some(r => r.ratedBy === currentUserUID);
             } else {
                 // Check if user has rated *any* of the members they are trying to rate now
                 const targetMemberUID = members[0]; // Assuming rating one individual at a time based on loop structure
                 alreadyRated = eventData.ratings?.some(r => r.ratedBy === currentUserUID && r.ratedTo === targetMemberUID);
             }

             if (alreadyRated) {
                 throw new Error('You have already submitted a rating for this participant/team.');
             }


            const isTeacherRating = rootGetters['user/isTeacher']; // Use rootGetter correctly

            if (eventData.isTeamEvent) {
                if (!teamId) throw new Error('Team ID is required for team events.');

                const teamIndex = eventData.teams.findIndex(t => t.teamName === teamId);
                if (teamIndex === -1) throw new Error('Team not found.');

                const ratingEntry = {
                    ratedBy: state.uid,
                    isTeacherRating: isTeacherRating, // Correctly use the getter result
                    rating: { ...ratingData }, // Ensure it's a copy
                    timestamp: Timestamp.now() // Add timestamp
                };

                // Use arrayUnion for safer updates if multiple ratings happen concurrently (less likely here)
                // But direct update is simpler for this structure
                 const updatedTeams = [...eventData.teams];
                 const teamRatings = updatedTeams[teamIndex].ratings ? [...updatedTeams[teamIndex].ratings, ratingEntry] : [ratingEntry];
                 updatedTeams[teamIndex] = { ...updatedTeams[teamIndex], ratings: teamRatings };

                await updateDoc(eventDocRef, { teams: updatedTeams });

            } else { // Individual Event
                 if (!members || members.length === 0) throw new Error("No participant specified for rating.");
                 // Assuming the 'members' array contains the single UID being rated in this specific call
                 const ratedToUID = members[0];

                const ratingEntry = {
                    ratedBy: state.uid,
                    ratedTo: ratedToUID,
                    isTeacherRating: isTeacherRating, // Correctly use the getter result
                    rating: { ...ratingData }, // Ensure it's a copy
                    timestamp: Timestamp.now() // Add timestamp
                };

                // Use arrayUnion to add the rating to the event's top-level ratings array
                await updateDoc(eventDocRef, {
                    ratings: arrayUnion(ratingEntry)
                });
            }

            // Optionally, trigger XP calculation immediately after rating
            // await dispatch('calculateUserXP'); // Be mindful of performance impact

        } catch (error) {
            console.error('Error submitting rating:', error);
            throw error; // Re-throw to handle in component
        }
    },

   async refreshUserData({ commit, state }) { // Simpler refresh
        if (state.uid) {
            try {
                const userDocRef = doc(db, 'users', state.uid);
                const userDocSnap = await getDoc(userDocRef);
                if (userDocSnap.exists()) {
                    commit('setUserData', { uid: state.uid, ...userDocSnap.data(), isAuthenticated: true, hasFetched: true });
                } else {
                    commit('clearUserData'); // User might have been deleted
                    commit('setHasFetched', true);
                }
            } catch (error) {
                console.error("Error refreshing user data:", error);
                 // Don't clear data on fetch error, keep existing state
            }
        }
   }
};

const mutations = {
  setUserData(state, userData) {
    state.uid = userData.uid;
    state.name = userData.name;
    state.role = userData.role;
    state.xp = userData.xp ?? 0; // Default XP to 0 if undefined
    state.projects = userData.projects ?? []; // Default projects to empty array
    state.skills = userData.skills ?? [];
    state.preferredRoles = userData.preferredRoles ?? [];
    state.isAuthenticated = userData.isAuthenticated;
     state.hasFetched = userData.hasFetched ?? state.hasFetched; // Preserve hasFetched if not provided
  },
  clearUserData(state) {
    state.uid = null;
    state.name = null;
    state.role = null;
    state.xp = 0;
    state.projects = [];
    state.skills = [];
    state.preferredRoles = [];
    state.isAuthenticated = false;
     state.hasFetched = false; // Reset hasFetched on clear
  },
  setUserXP(state, xp) { // Mutation specifically for XP update
      state.xp = xp;
  },
  setHasFetched(state, fetched) { // Mutation to update fetch status
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