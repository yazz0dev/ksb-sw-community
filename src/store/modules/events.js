// /src/store/modules/events.js 

import { db } from '../../firebase';
import { collection, addDoc, getDocs, doc, getDoc, Timestamp, updateDoc } from 'firebase/firestore';

const state = {
  events: [], // Store events data
  eventRequests: [], // Store event requests
};
  const getters = {
    allEvents: (state) => state.events,
    getEventById: (state) => (id) => {
        return state.events.find(event => event.id === id)
      },
    allEventRequests: (state) => state.eventRequests, // Getter for event requests
  };
const actions = {
  async createEvent({ rootState, dispatch }, eventData) { //rootState for accessing user data, removed commit
    try {
        if (rootState.user.role !== 'Teacher') {  //access user role from rootState.
          throw new Error('Only teachers can create events.'); // Throw error
        }
      const docRef = await addDoc(collection(db, 'events'), {
          ...eventData,
        startDate: Timestamp.fromDate(new Date(eventData.startDate)),
        endDate: Timestamp.fromDate(new Date(eventData.endDate)),
        organizer: rootState.user.registerNumber,  //access user register number
        status: 'Upcoming',
        teams: [],
      });
       // Refetch events to update the list.  IMPORTANT!
      await dispatch('fetchEvents');

      return docRef.id; // Return the new event ID
    } catch (error) {
      console.error('Error creating event:', error);
      throw error; // Re-throw for the component to handle
    }
  },
  async fetchEvents({ commit }) { // Keep commit, it's used in mutations.
    try {
      const querySnapshot = await getDocs(collection(db, 'events'));
      const events = [];
      querySnapshot.forEach((doc) => {
        events.push({ id: doc.id, ...doc.data() });
      });
      commit('setEvents', events);
    } catch (error) {
      console.error('Error fetching events:', error);
    }
  },
  async fetchEventDetails(eventId)
  {
    try{
        const docRef = doc(db, "events", eventId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          return {id: docSnap.id, ...docSnap.data()};
        } else {
          console.log("No such document!");
            return null;
        }

    }catch(error)
    {
        console.error("Error fetching event details:", error);
        return null;
    }
  },
    async addTeamToEvent({ dispatch }, { eventId, teamName, members }) { // Removed commit
      try {
        const eventRef = doc(db, 'events', eventId);
        const eventSnap = await getDoc(eventRef);

        if (!eventSnap.exists()) {
          throw new Error('Event not found');
        }


        const existingTeams = eventSnap.data().teams || [];

        existingTeams.push({
          teamName,
          members,
          teamXP: 0,
        });

        await updateDoc(eventRef, { teams: existingTeams });
        //Refetch event
        await dispatch('fetchEvents');


      } catch (error) {
        console.error('Error adding team:', error);
        throw error; // Re-throw the error
      }
    },

  // New action for submitting event requests
  async submitEventRequest({ dispatch }, requestData) {  // Removed commit
    try {
      await addDoc(collection(db, 'eventRequests'), requestData);
       await dispatch('fetchEventRequests'); // Refetch requests
    } catch (error) {
      console.error('Error submitting event request:', error);
      throw error; // Re-throw the error
    }
  },
    // New action for fetching event requests
    async fetchEventRequests({ commit }) {  //Keep commit
        try {
          const querySnapshot = await getDocs(collection(db, 'eventRequests'));
          const eventRequests = [];
          querySnapshot.forEach((doc) => {
            eventRequests.push({ id: doc.id, ...doc.data() });
          });
          commit('setEventRequests', eventRequests);
        } catch (error) {
          console.error('Error fetching event requests:', error);
        }
      },
    // New action for approving event requests
    async approveEventRequest({ dispatch }, requestId) { //Removed commit
        try {
          const requestRef = doc(db, 'eventRequests', requestId);
          const requestSnap = await getDoc(requestRef);

          if (!requestSnap.exists()) {
            throw new Error('Event request not found');
          }

          const requestData = requestSnap.data();

          // Create the event
          const eventData = {
            eventName: requestData.eventName,
            eventType: requestData.eventType,
            description: requestData.description,
            startDate: Timestamp.fromDate(new Date(requestData.desiredStartDate)),
            endDate: Timestamp.fromDate(new Date(requestData.desiredEndDate)),
            organizer: requestData.requester, // Or a designated teacher
            status: 'Upcoming', // Or 'Approved'
            teams: [],
          };

          await addDoc(collection(db, 'events'), eventData);

          // Update the request status
          await updateDoc(requestRef, { status: 'Approved' });
            // Refetch both events and event requests
          await dispatch('fetchEvents');
          await dispatch('fetchEventRequests');


        } catch (error) {
          console.error('Error approving event request:', error);
          throw error; // Re-throw for handling in the component
        }
      },

      // Action to reject a request.
      async rejectEventRequest({ dispatch }, requestId){ //Removed commit
        try{
            const requestRef = doc(db, 'eventRequests', requestId);
            await updateDoc(requestRef, {status: 'Rejected'});

            await dispatch('fetchEventRequests'); //update the requests
        }catch(error){
            console.error("Error on rejecting event request: ", error);
            throw error;
        }
      }
};

const mutations = {
  setEvents(state, events) {
    state.events = events;
  },
    setEventRequests(state, eventRequests) {
    state.eventRequests = eventRequests;
  },
};

export default {
    namespaced: true, // Add namespacing!  Important for larger stores.
  state,
    getters,
  actions,
  mutations,
};