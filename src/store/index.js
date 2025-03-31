import { createStore } from 'vuex';
import user from './modules/user';
import events from './modules/events/index'; // Point to index.js for consistency
import { _calculateWeightedAverageScore } from './modules/events/helpers'; // Import the original helper

// Removed the duplicate local definition of _calculateWeightedAverageScore

export default createStore({
  modules: {
    user,
    events
  },
  // Add the helper function directly to the root store's getters for internal access
  // Prefix with underscore to indicate internal use
  getters: {
     // Use the imported helper function directly
     'events/_calculateWeightedAverageScore': () => _calculateWeightedAverageScore,
  }
});
