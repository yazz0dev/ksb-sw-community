import { ref } from 'vue';
import type { Notification } from '@/types/store';
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
    notificationStore.showNotification({
      message,
      type,
      duration,
      title
    });
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
