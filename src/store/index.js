import { createStore } from 'vuex';
import user from './modules/user';
import events from './modules/events/index'; // Point to index.js for consistency
import app from './modules/app';
import notification from './modules/notification'; // Import notification module

// Removed the duplicate local definition of _calculateWeightedAverageScore

export default createStore({
  modules: {
    user,
    events,
    app,
    notification // Register notification module
  },
  // Add the helper function directly to the root store's getters for internal access
  getters: {
     // Removed the unused 'events/_calculateWeightedAverageScore' getter
  }
});
