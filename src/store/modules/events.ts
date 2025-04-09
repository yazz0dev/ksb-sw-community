import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/firebase'; // Adjust the import based on your project structure

const state = {
  // ...existing state...
};

const mutations = {
  // ...existing mutations...
};

const actions = {
  // ...existing actions...
  async autoGenerateTeams({ commit }, { eventId, generationType, value }) {
    try {
      const eventRef = doc(db, 'events', eventId);
      const eventDoc = await getDoc(eventRef);
      
      if (!eventDoc.exists()) {
        throw new Error('Event not found');
      }

      const eventData = eventDoc.data();
      const participants = eventData.participants || [];
      
      // Generate teams logic
      let teams = [];
      const shuffledParticipants = [...participants].sort(() => Math.random() - 0.5);
      
      if (generationType === 'fixed-size') {
        // Split into teams of fixed size
        for (let i = 0; i < shuffledParticipants.length; i += value) {
          const teamMembers = shuffledParticipants.slice(i, i + value);
          if (teamMembers.length >= 2) { // Only create teams with 2+ members
            teams.push({
              teamName: `Team ${teams.length + 1}`,
              members: teamMembers,
              submissions: [],
              ratings: []
            });
          }
        }
      } else {
        // Split into fixed number of teams
        const teamSize = Math.floor(shuffledParticipants.length / value);
        for (let i = 0; i < value; i++) {
          const start = i * teamSize;
          const end = i === value - 1 ? shuffledParticipants.length : (i + 1) * teamSize;
          const teamMembers = shuffledParticipants.slice(start, end);
          if (teamMembers.length >= 2) {
            teams.push({
              teamName: `Team ${i + 1}`,
              members: teamMembers,
              submissions: [],
              ratings: []
            });
          }
        }
      }

      // Update the event document with new teams
      await updateDoc(eventRef, { teams });
      
      return teams;
    } catch (error) {
      console.error('Error generating teams:', error);
      throw error;
    }
  }
};

const getters = {
  // ...existing getters...
};

export default {
  namespaced: true,
  state,
  mutations,
  actions,
  getters
};