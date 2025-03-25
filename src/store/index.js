// src/store/index.js
import { createStore } from 'vuex';
import user from './modules/user';
import events from './modules/events';
import resources from './modules/resources';

export default createStore({
  modules: {
    user,
    events,
    resources,
  },
});