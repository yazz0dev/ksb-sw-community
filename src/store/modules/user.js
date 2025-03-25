// /src/store/modules/user.js (Error handling, arrayUnion, refetching, namespacing)

import { db } from '../../firebase';
import { doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';

const state = {
  registerNumber: null,
  name: null,
  role: null,
  xp: 0,
  ratings: [],
  projects: [],
  skills: [],
  preferredRoles: [],
  isAuthenticated: false,
};

const getters = {
    isAuthenticated: state => state.isAuthenticated,
    getUserRole: state => state.role, // Add a getter for user role
    getUser: state => {   //getter for all userdata
        return {
            registerNumber: state.registerNumber,
            name: state.name,
            role: state.role,
            xp: state.xp,
            ratings: state.ratings,
            projects: state.projects,
            skills:state.skills,
            preferredRoles:state.preferredRoles

        }
    }
};

const actions = {
  async fetchUserData({ commit }, registerNumber) {
    try {
      const userDocRef = doc(db, 'users', registerNumber);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        commit('setUserData', {
          registerNumber,
          ...userData,
          isAuthenticated: true,
        });
      } else {
        commit('clearUserData');
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      commit('clearUserData');
    }
  },
  clearUserData({ commit }) {
    commit('clearUserData');
  },
async calculateWeightedAverageRating(_, { eventId, userId }) {
    try {
      const userDocRef = doc(db, 'users', userId);
      const userDocSnap = await getDoc(userDocRef);

      if (!userDocSnap.exists()) return 0.0;

      const ratings = userDocSnap.data().ratings || [];
      if (ratings.length === 0) return 0.0;

      let totalTeacherRating = 0;
      let teacherRatingCount = 0;
      let totalStudentRating = 0;
      let studentRatingCount = 0;

      for (const ratingEntry of ratings) {
        if (ratingEntry.eventId === eventId) {
          const rating = ratingEntry.rating;
          const overallRating =
            (rating.design +
              rating.presentation +
              rating.problemSolving +
              rating.execution +
              rating.technology) /
            5.0;

          if (rating.isTeacherRating) {
            totalTeacherRating += overallRating;
            teacherRatingCount++;
          } else {
            totalStudentRating += overallRating;
            studentRatingCount++;
          }
        }
      }

      const averageTeacherRating =
        teacherRatingCount > 0 ? totalTeacherRating / teacherRatingCount : 0;
      const averageStudentRating =
        studentRatingCount > 0 ? totalStudentRating / studentRatingCount : 0;

      return 0.7 * averageTeacherRating + 0.3 * averageStudentRating;
    } catch (error) {
      console.error('Error calculating weighted average:', error);
      return 0.0;
    }
  },

  async updateXP({ dispatch, state }, { userId, eventId }) { // Include state
    try {
      const weightedAverage = await dispatch('calculateWeightedAverageRating', { eventId, userId });
      const xpGain = Math.floor(weightedAverage * 10);

      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        xp: (state.xp || 0) + xpGain, // Ensure xp is initialized
      });
       // Refetch user data to update XP in the state.  CRITICAL!
       if(state.registerNumber)
       {
            await dispatch('fetchUserData', state.registerNumber);
       }
    } catch (error) {
      console.error('Error updating XP:', error);
    }
  },
  async submitRating({ dispatch, state }, { eventId, teamId, members, ratingData }) {

        try {
          const eventDocRef = doc(db, 'events', eventId);
          const eventDocSnap = await getDoc(eventDocRef);

          if (!eventDocSnap.exists()) {
            throw new Error('Event not found.');
          }

          if (teamId) {
            const teams = eventDocSnap.data().teams || [];
            const teamExists = teams.some((team) => team.teamName === teamId);
            if (!teamExists) {
              throw new Error('Team not found.');
            }
          }

          for (const memberRegisterNumber of members) {
            const userRef = doc(db, 'users', memberRegisterNumber);
            await updateDoc(userRef, {
              ratings: arrayUnion({ eventId, rating: ratingData }),
            });

            await dispatch('updateXP', { userId: memberRegisterNumber, eventId });
          }
          //Refetch Userdata
          await dispatch('fetchUserData', state.registerNumber);


        } catch (error) {
          console.error('Error submitting rating:', error);
            throw error; // Re-throw the error for the component to handle

        }
   },
   async refreshUserData({commit, state})
   {
        if(state.registerNumber)
        {
            const userDocRef = doc(db, 'users', state.registerNumber);
            const userDocSnap = await getDoc(userDocRef);
            if (userDocSnap.exists()) {
                const userData = userDocSnap.data();
                commit('setUserData', {
                  registerNumber : state.registerNumber,
                  ...userData,
                  isAuthenticated: true,
                });
              } else {
                commit('clearUserData');
            }
        }
   }

};

const mutations = {
  setUserData(state, userData) {
    state.registerNumber = userData.registerNumber;
    state.name = userData.name;
    state.role = userData.role;
    state.xp = userData.xp;
    state.ratings = userData.ratings;
    state.projects = userData.projects;
      state.skills = userData.skills || [];  //handle null
    state.preferredRoles = userData.preferredRoles || []; //handle null
    state.isAuthenticated = userData.isAuthenticated;
  },
  clearUserData(state) {
    state.registerNumber = null;
    state.name = null;
    state.role = null;
    state.xp = 0;
    state.ratings = [];
    state.projects = [];
    state.skills = [];
    state.preferredRoles = [];
    state.isAuthenticated = false;
  },
};

export default {
  namespaced: true, // ADDED NAMESPACING
  state,
  getters,
  actions,
  mutations,
};