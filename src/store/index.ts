import { createStore } from 'vuex';
import user from './user';
import events from './events/index';
import app from './app';
import notification from './notification';

import { RootState } from '@/types/store';

export default createStore<RootState>({
  modules: {
    user,
    events,
    app,
    notification
  },
  getters: {}
});
