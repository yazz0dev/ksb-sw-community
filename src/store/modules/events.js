// /src/store/modules/events.js

import { db } from '../../firebase';
import { collection, addDoc, getDocs, doc, getDoc, Timestamp, updateDoc } from 'firebase/firestore';

const state = {
  events: [],
  eventRequests: [],
};

const getters = {
  allEvents: (state) => state.events,
  getEventById: (state) => (id) => {
    return state.events.find(event => event.id === id)
  },
  allEventRequests: (state) => state.eventRequests,
};

const actions = {
    async createEvent({ rootState, dispatch }, eventData) {
    try {
        if (!rootState.user.isTeacher) { //use isTeacher getter
            throw new Error('Only teachers can create events.');
        }

        const docRef = await addDoc(collection(db, 'events'), {
            ...eventData,
            startDate: Timestamp.fromDate(new Date(eventData.startDate)),
            endDate: Timestamp.fromDate(new Date(eventData.endDate)),
            organizer: rootState.user.uid, // Use UID
            status: 'Upcoming',
            teams: [],      // Initialize teams as empty
            participants: [],//Initialize participants
            ratings: []     // Initialize ratings as empty
        });

        await dispatch('fetchEvents');
        return docRef.id;
    } catch (error) {
        console.error('Error creating event:', error);
        throw error;
    }
},
async requestEvent({ dispatch, rootState }, eventData) {
  try {
    // No direct event creation, always create a request
    const requestData = {
      ...eventData,
      requester: rootState.user.uid,
      status: 'Pending',
      desiredStartDate: eventData.startDate, // Use consistent naming
      desiredEndDate: eventData.endDate,
      createdAt: Timestamp.now(), // Add this line
    };

    await addDoc(collection(db, 'eventRequests'), requestData);
    await dispatch('fetchEventRequests'); // Refresh requests
  } catch (error) {
    console.error('Error requesting event:', error);
    throw error;
  }
},
  async fetchEvents({ commit }) {
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
    async addTeamToEvent({ dispatch, rootState }, { eventId, teamName, members }) {
    try {
        const eventRef = doc(db, 'events', eventId);
        const eventSnap = await getDoc(eventRef);

        if (!eventSnap.exists()) {
            throw new Error('Event not found.');
        }

        const eventData = eventSnap.data();

        // Check if the user adding the team is the event organizer
        if (eventData.organizer !== rootState.user.uid) {
          throw new Error('Only the event organizer can add teams.');
        }

        if (!eventData.isTeamEvent) {
            throw new Error('Cannot add teams to a non-team event.');
        }

        const existingTeams = eventData.teams || [];
        existingTeams.push({
            teamName,
            members, // This should be an array of user UIDs
            ratings: [] // Initialize ratings for the team
        });

        await updateDoc(eventRef, { teams: existingTeams });
        await dispatch('fetchEvents');
    } catch (error) {
        console.error('Error adding team:', error);
        throw error;
    }
},

    async submitEventRequest({ dispatch }, requestData) {
        try {
            await addDoc(collection(db, 'eventRequests'), requestData);
            await dispatch('fetchEventRequests');
        } catch (error) {
            console.error('Error submitting event request:', error);
            throw error;
        }
    },

    async fetchEventRequests({ commit }) {
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

   async approveEventRequest({ dispatch }, requestId) {
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
            organizer: requestData.requester,
            status: 'Upcoming',
            isTeamEvent: requestData.isTeamEvent, // Include isTeamEvent
            teams: [], // Initialize for team events
            participants: [], //Initialize participants
            ratings: [] // Initialize ratings
          };

          await addDoc(collection(db, 'events'), eventData);
          await updateDoc(requestRef, { status: 'Approved' });
          await dispatch('fetchEvents');
          await dispatch('fetchEventRequests');


        } catch (error) {
          console.error('Error approving event request:', error);
          throw error;
        }
      },

      async rejectEventRequest({ dispatch }, requestId){
        try{
            const requestRef = doc(db, 'eventRequests', requestId);
            await updateDoc(requestRef, {status: 'Rejected'});

            await dispatch('fetchEventRequests');
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
  namespaced: true,
  state,
  getters,
  actions,
  mutations,
};