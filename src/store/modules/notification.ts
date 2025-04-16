// src/store/modules/notification.js

import { Module, ActionContext } from 'vuex';
import { RootState } from '@/store/types';
import { Notification } from '@/types/store';

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
  showNotification({ commit, dispatch }: ActionContext<NotificationState, RootState>, notification: Omit<Notification, 'id'>) {
    // Validate required fields
    if (!notification.message) {
      console.error('Notification message is required');
      return;
    }

    // Generate a unique ID for this notification
    const id = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const notificationWithId: Notification = { ...notification, id };
    
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
  
  dismissNotification({ commit }: ActionContext<NotificationState, RootState>, notificationId: string) {
    commit('REMOVE_NOTIFICATION', notificationId);
  },
  
  clearAllNotifications({ commit }: ActionContext<NotificationState, RootState>) {
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
