// src/store/modules/notification.js

import { Module } from 'vuex';
import { RootState } from '@/store/types';

interface Notification {
  id: string;
  message: string;
  timeout?: number;
  type?: string;
}

interface NotificationState {
  notifications: Notification[];
}

const state: NotificationState = {
  notifications: []
};

const getters = {
  allNotifications: (state: NotificationState): Notification[] => state.notifications
};

const actions = {
  showNotification({ commit, dispatch }, notification: Omit<Notification, 'id'>) {
    // Validate required fields
    if (!notification.message) {
      console.error('Notification message is required');
      return;
    }

    // Generate a unique ID for this notification
    const id = Date.now().toString();
    const notificationWithId = { ...notification, id };
    
    // Add notification to state
    commit('ADD_NOTIFICATION', notificationWithId);
    
    // Auto-dismiss after timeout if specified
    if (notification.timeout !== 0) { // 0 means don't auto-dismiss
      const timeout = notification.timeout || 5000; // Default 5 seconds
      setTimeout(() => {
        dispatch('dismissNotification', id);
      }, timeout);
    }
    
    return id; // Return ID for potential manual dismissal
  },
  
  dismissNotification({ commit }, notificationId: string) {
    commit('REMOVE_NOTIFICATION', notificationId);
  },
  
  clearAllNotifications({ commit }) {
    commit('CLEAR_ALL_NOTIFICATIONS');
  }
};

const mutations = {
  ADD_NOTIFICATION(state: NotificationState, notification: Notification) {
    state.notifications.push(notification);
  },
  REMOVE_NOTIFICATION(state: NotificationState, notificationId: string) {
    state.notifications = state.notifications.filter(n => n.id !== notificationId);
  },
  CLEAR_ALL_NOTIFICATIONS(state: NotificationState) {
    state.notifications = [];
  }
};

export default {
  namespaced: true,
  state,
  getters,
  actions,
  mutations
} as Module<NotificationState, RootState>;
