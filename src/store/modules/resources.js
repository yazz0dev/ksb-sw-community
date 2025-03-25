import { db } from '../../firebase';
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';

const state = {
  resources: [],
};

const getters = {
  allResources: (state) => state.resources,
};

const actions = {
  async fetchResources({ commit }) { //Keep commit
    try {
      const querySnapshot = await getDocs(collection(db, 'resources'));
      const resources = [];
      querySnapshot.forEach((doc) => {
        resources.push({ id: doc.id, ...doc.data() });
      });
      commit('setResources', resources);
    } catch (error) {
      console.error('Error fetching resources:', error);
    }
  },
  async addResource({ dispatch }, resource) { //Removed commit
    try {
      await addDoc(collection(db, 'resources'), resource);
      await dispatch('fetchResources'); // Refresh list
    } catch (error) {
      console.error('Error adding resource:', error);
      throw error;
    }
  },
    async updateResource({ dispatch }, {id, resource}){ //Removed commit
        try{
            const docRef = doc(db, 'resources', id);
            await updateDoc(docRef, resource);
            await dispatch('fetchResources');
        }catch(error){
            console.error("Error updating resource", error);
            throw error;
        }
    },
    async deleteResource({ dispatch }, id) //Removed commit
    {
        try{
            const docRef = doc(db, 'resources', id);
            await deleteDoc(docRef);
             await dispatch('fetchResources');
        }catch(error){
            console.error("Error deleting resource", error);
            throw error;
        }
    }
};

const mutations = {
  setResources(state, resources) {
    state.resources = resources;
  },
};

export default {
    namespaced: true, // Good practice for modules
  state,
  getters,
  actions,
  mutations,
};