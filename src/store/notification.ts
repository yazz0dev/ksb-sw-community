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
    // You can add more getters if needed, e.g., getNotificationById
  },

  // Actions definition (mutations are integrated)
  actions: {
    /**
     * Shows a notification message.
     * @param notification - The notification object (message & type required).
     *                     Duration is optional (defaults to 5000ms).
     *                     Use duration: 0 for non-auto-dismissing notifications.
     * @returns The ID of the created notification.
     */
    showNotification(notification: Omit<Notification, 'id' | 'createdAt'> & { duration?: number }): string {
      // Validate required fields
      if (!notification.message || !notification.type) {
        console.error('Notification message and type are required');
        return ''; // Indicate failure
      }

      // Generate a unique ID and add createdAt timestamp
      const id = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const newNotification: Notification = {
        ...notification,
        id,
        createdAt: Date.now(), // Add creation timestamp
      };

      // Add notification to state (direct mutation)
      // Push to the start so newest appear on top (adjust if needed)
      this.notifications.unshift(newNotification);

      // Auto-dismiss after duration if specified and not 0
      const duration = notification.duration ?? 5000; // Default to 5 seconds
      if (duration > 0) {
        setTimeout(() => {
          // Call dismiss action using 'this'
          this.dismissNotification(id);
        }, duration);
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