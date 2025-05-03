// src/store/notification.ts
import { defineStore } from 'pinia';
import { Notification, NotificationState } from '@/types/store'; // Use types from store.ts

// Define the Pinia store
export const useNotificationStore = defineStore('notification', {
  // State definition
  state: (): NotificationState => ({
    notifications: [],
  }),

  // Getters definition
  getters: {
    allNotifications: (state): Notification[] => state.notifications,
  },

  // Actions definition
  actions: {
    /**
     * Shows a notification message.
     * @param notification - The notification object (message is required).
     * @returns The ID of the created notification.
     */
    showNotification(notification: Omit<Notification, 'id' | 'createdAt'> & { duration?: number; timeout?: number }): string {
      // Validate required fields
      if (!notification.message) {
        console.error('Notification message is required');
        // Consider throwing an error or returning a specific value for failure
        return '';
      }

      // Generate a unique ID and add createdAt timestamp
      const id = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const notificationWithId: Notification = {
        ...notification,
        id,
        createdAt: Date.now(), // Add creation timestamp
      };

      // Add notification to state (direct mutation)
      this.notifications.push(notificationWithId);

      // Auto-dismiss after duration/timeout if specified
      // Prefer 'duration' if present, fallback to 'timeout', default 5000ms
      const duration = notification.duration ?? notification.timeout;
      if (duration !== 0) { // 0 means don't auto-dismiss
        setTimeout(() => {
          // Call another action within the store
          this.dismissNotification(id);
        }, duration || 5000);
      }

      return id; // Return ID for potential manual dismissal
    },

    /**
     * Dismisses a notification by its ID.
     * @param notificationId - The ID of the notification to remove.
     */
    dismissNotification(notificationId: string) {
      // Filter out the notification (direct mutation)
      this.notifications = this.notifications.filter(n => n.id !== notificationId);
    },

    /**
     * Clears all currently displayed notifications.
     */
    clearAllNotifications() {
      // Reset the notifications array (direct mutation)
      this.notifications = [];
    },
  },
});
