// src/store/index.js
import { createStore } from 'vuex';
import user from './modules/user';
import events from './modules/events';
import resources from './modules/resources'; // Add resources
import transparency from './modules/transparency'; // Add transparency

export default createStore({
  modules: {
    user,
    events,
    resources, // Add the new modules here
    transparency,
  },
});