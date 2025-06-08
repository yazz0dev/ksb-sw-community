import { useNotificationStore } from '@/stores/notificationStore';

export function useNotifications() {
  const notificationStore = useNotificationStore();

  /**
   * Show a notification
   * @param message Notification message
   * @param type Notification type
   * @param duration Notification duration
   * @param title Notification title
   */
  const showNotification = (
    message: string,
    type: 'success' | 'error' | 'info' | 'warning' = 'info',
    duration?: number,
    title?: string
  ): void => {
    // Create payload with required properties
    const payload: {
      message: string;
      type: 'success' | 'error' | 'info' | 'warning';
      duration?: number;
      title?: string;
    } = {
      message,
      type
    };

    // Only add optional properties if they are defined
    if (duration !== undefined) {
      payload.duration = duration;
    }

    if (title !== undefined) {
      payload.title = title;
    }

    notificationStore.showNotification(payload);
  };

  /**
   * Clear all notifications
   */
  const clearAll = () => {
    notificationStore.clearAllNotifications();
  };

  /**
   * Clear a specific notification
   * @param id Notification ID
   */
  const clearById = (id: string) => {
    notificationStore.dismissNotification(id);
  };

  return {
    showNotification,
    clearAll,
    clearById
  };
}
