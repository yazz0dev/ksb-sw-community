import { createStore } from 'vuex';
import user from './modules/user';
import events from './modules/events/index';
import app from './modules/app';
import notification from './modules/notification';

import { RootState } from './types';

export default createStore<RootState>({
  modules: {
    user,
    events,
    app,
    notification
  },
  getters: {}
});
