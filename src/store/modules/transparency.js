import { db } from '../../firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

const state = {
  transparencyContent: '',
};

const getters = {
  getTransparencyContent: (state) => state.transparencyContent,
};

const actions = {
  async fetchTransparencyContent({ commit }) { //Keep commit
    try {
      const docRef = doc(db, 'transparency', 'community-guidelines'); // Assuming a single document
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        commit('setTransparencyContent', docSnap.data().content);
      } else {
        commit('setTransparencyContent', 'No transparency information found.');
      }
    } catch (error) {
      console.error('Error fetching transparency content:', error);
    }
  },
  async updateTransparencyContent( content) {  // Removed commit and dispatch
    try {
      const docRef = doc(db, 'transparency', 'community-guidelines');
      await updateDoc(docRef, { content });
      //No need to refetch, since it not listed.
      // await dispatch('fetchTransparencyContent'); // Refresh content in store.

    } catch (error) {
      console.error('Error updating transparency content:', error);
      throw error; // Re-throw for component to handle
    }
  },
};

const mutations = {
  setTransparencyContent(state, content) {
    state.transparencyContent = content;
  },
};

export default {
    namespaced: true,
  state,
  getters,
  actions,
  mutations,
};