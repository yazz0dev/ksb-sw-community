// /src/store/modules/user.js
import { db } from '../../firebase';
import { doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';

const state = {
  uid: null,
  name: null,
  role: null, // Keep role for UI purposes, even if not used in rules
  xp: 0,
  projects: [], // Keep projects
  skills:[],
  preferredRoles:[],
  isAuthenticated: false,
};

const getters = {
  isAuthenticated: state => state.isAuthenticated,
  getUserRole: state => state.role, // Keep for UI display
  getUser: state => {
    return {
      uid: state.uid,
      name: state.name,
      role: state.role,
      xp: state.xp,
      projects: state.projects,
        skills: state.skills,
      preferredRoles: state.preferredRoles
    };
  },
  // Check if the user is a teacher in the getter (for UI logic)
    isTeacher: state => state.role === 'Teacher' || state.role === 'Admin',
};

const actions = {
  async fetchUserData({ commit }, uid) {
    try {
      const userDocRef = doc(db, 'users', uid);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        commit('setUserData', {
          uid,
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

  // Calculate XP based on *all* ratings the user has received (across all events)
  async calculateUserXP({ commit, state, dispatch }) { // Add dispatch
    try{
      if(!state.uid) return; //No user.
 
      const eventsSnapshot = await getDocs(collection(db, "events"));
      let totalXp = 0;
      for(const eventDoc of eventsSnapshot.docs)
      {
       const event = eventDoc.data();
         //Check if the event is completed
         if(event.status !== 'Completed') continue;
 
       //Team Event
       if(event.isTeamEvent)
       {
           //Check the team exist and current user is a member
           if(event.teams && event.teams.length > 0)
           {
               const team = event.teams.find((team) => team.members.includes(state.uid)); //Find user's team
               if(team) //If user is member
               {
                   //calculate xp for team
                  const teamXp = await dispatch('calculateTeamXP', {eventId: eventDoc.id, team});
                  totalXp += teamXp; //add it
 
               }
           }
       }else{
           //Individual Event
           if(event.participants && event.participants.includes(state.uid))
           {
               const individualXp = await dispatch('calculateIndividualXP', {eventId: eventDoc.id, userId: state.uid});
               totalXp += individualXp;
           }
       }
 
        // Add bonus XP if the user is a winner
         if (event.winners && event.winners.includes(state.uid)) {
             totalXp += 100; // Add 100 bonus XP (or whatever amount you choose)
         }
      }
 
      //Update xp
       const userRef = doc(db, 'users', state.uid);
       await updateDoc(userRef, {
         xp: totalXp,
       });
       // Refetch user data to update XP in the state.
       await dispatch('fetchUserData', state.uid); //use uid
 
     }catch(error){
       console.error("Error: ", error);
     }
   },

    async calculateTeamXP(_,{eventId, team})
    {
        try{
            const eventRef = doc(db, "events", eventId);
            const eventSnap = await getDoc(eventRef);

            if(!eventSnap.exists()) return 0;

            const event = eventSnap.data();

            if(!event.isTeamEvent) return 0;

            if(!team || !team.ratings || team.ratings.length === 0) return 0;


          let totalTeacherRating = 0;
          let teacherRatingCount = 0;
          let totalStudentRating = 0;
          let studentRatingCount = 0;

          for (const ratingEntry of team.ratings) { // Use team rating
              const rating = ratingEntry.rating;
              const overallRating =
                (rating.design +
                  rating.presentation +
                  rating.problemSolving +
                  rating.execution +
                  rating.technology) /
                5.0;

              if (ratingEntry.isTeacherRating) {
                totalTeacherRating += overallRating;
                teacherRatingCount++;
              } else {
                totalStudentRating += overallRating;
                studentRatingCount++;
              }
          }

          const averageTeacherRating =
            teacherRatingCount > 0 ? totalTeacherRating / teacherRatingCount : 0;
          const averageStudentRating =
            studentRatingCount > 0 ? totalStudentRating / studentRatingCount : 0;

          const weightedAverage =  0.7 * averageTeacherRating + 0.3 * averageStudentRating;
          return Math.floor(weightedAverage * 10);;

        }catch(error)
        {
          console.error("Error: ", error);
          return 0;
        }
    },

     async calculateIndividualXP(_,{eventId, userId}){ //userId = UID
      try{
            const eventRef = doc(db, "events", eventId);
            const eventSnap = await getDoc(eventRef);

            if(!eventSnap.exists()) return 0;

            const event = eventSnap.data();
            //Check event is not team event
            if(event.isTeamEvent) return 0;
            if(!event.ratings || event.ratings.length === 0) return 0; //No ratings


          let totalTeacherRating = 0;
          let teacherRatingCount = 0;
          let totalStudentRating = 0;
          let studentRatingCount = 0;

          for (const ratingEntry of event.ratings) {
              //Check the rating is given to this user
              if(ratingEntry.ratedTo === userId)
              {
                  const rating = ratingEntry.rating;
                  const overallRating =
                    (rating.design +
                      rating.presentation +
                      rating.problemSolving +
                      rating.execution +
                      rating.technology) /
                    5.0;

                  if (ratingEntry.isTeacherRating) {
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

            const weightedAverage =  0.7 * averageTeacherRating + 0.3 * averageStudentRating;
            return Math.floor(weightedAverage * 10);;

        }catch(error)
        {
          console.error("Error: ", error);
          return 0;
        }
    },
      async submitRating({ dispatch, state }, { eventId, teamId, members, ratingData }) {
        try {
            const eventDocRef = doc(db, 'events', eventId);
            const eventDocSnap = await getDoc(eventDocRef);
            if (!eventDocSnap.exists()) {
                throw new Error('Event not found.');
            }
            const eventData = eventDocSnap.data();
             // If it's a team event, add the rating to the team
            if (eventData.isTeamEvent) {
              if (!teamId) {
                throw new Error('Team ID is required for team events.');
              }
              const teamIndex = eventData.teams.findIndex(t => t.teamName === teamId);
              if (teamIndex === -1) {
                throw new Error('Team not found.');
              }

              const updatedTeams = [...eventData.teams];
              updatedTeams[teamIndex] = {
                ...updatedTeams[teamIndex],
                ratings: updatedTeams[teamIndex].ratings ? [...updatedTeams[teamIndex].ratings, { ratedBy: state.uid, isTeacherRating: store.getters.isTeacher, rating: ratingData }] : [{ ratedBy: state.uid, isTeacherRating: store.getters.isTeacher, rating: ratingData }],
              };

              await updateDoc(eventDocRef, { teams: updatedTeams });
              //Recalculate Xp of the users.
              await dispatch('calculateUserXP');
            } else {
              // If it's an individual event, add the rating to the event's ratings array
              const updatedRatings = eventData.ratings ? [...eventData.ratings]: [];

              //add rating for each participants
              for(const member of members)
              {
                  updatedRatings.push({
                    ratedBy: state.uid,
                    ratedTo: member, // Add who got rated
                    isTeacherRating: store.getters.isTeacher,
                    rating: ratingData,
                  });
              }

              await updateDoc(eventDocRef, { ratings: updatedRatings });
               //Recalculate Xp of the users.
              await dispatch('calculateUserXP');
            }

        } catch (error) {
          console.error('Error submitting rating:', error);
            throw error;
        }
   },
   async refreshUserData({commit, state})
   {
        if(state.uid)
        {
            const userDocRef = doc(db, 'users', state.uid);
            const userDocSnap = await getDoc(userDocRef);
            if (userDocSnap.exists()) {
                const userData = userDocSnap.data();
                commit('setUserData', {
                  uid : state.uid,
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
    state.uid = userData.uid;
    state.name = userData.name;
    state.role = userData.role;
    state.xp = userData.xp;
    state.projects = userData.projects;
    state.skills = userData.skills || [];
    state.preferredRoles = userData.preferredRoles || [];
    state.isAuthenticated = userData.isAuthenticated;
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
  },
};

export default {
  namespaced: true,
  state,
  getters,
  actions,
  mutations,
};