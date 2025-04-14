import { Module } from 'vuex';
import { AppState } from '@/types/store';
import { RootState } from '@/store/types';
import state from './state';
import mutations from './mutations';
import actions from './actions';
import getters from './getters';

const appModule: Module<AppState, RootState> = {
  namespaced: true,
  state,
  mutations,
  actions,
  getters
};

export default appModule;
