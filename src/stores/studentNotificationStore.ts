// src/stores/studentNotificationStore.ts
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

// Assuming a common Notification type structure, or define one here
// For example, if types/storeStudent.ts defines StudentNotification:
import type { StudentNotification } from '@/types/storeStudent'; // Or your common notification type path

export const useStudentNotificationStore = defineStore('studentNotification', () => {
  // --- State ---
  const notifications = ref<StudentNotification[]>([]);

  // --- Getters ---
  const allNotifications = computed(() => notifications.value);
  const hasNotifications = computed(() => notifications.value.length > 0);

  // --- Actions ---
  function showNotification(
    payload: Omit<StudentNotification, 'id' | 'createdAt'> & { duration?: number }
  ): string {
    const id = `student_notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newNotification: StudentNotification = {
      ...payload,
      id,
      createdAt: Date.now(),
    };

    // Add to the start to show newest on top (if your UI renders that way)
    notifications.value.unshift(newNotification);

    // Auto-dismiss
    const duration = payload.duration === 0 ? 0 : (payload.duration || 5000); // 0 for persistent
    if (duration > 0) {
      setTimeout(() => dismissNotification(id), duration);
    }
    return id;
  }

  function dismissNotification(id: string) {
    notifications.value = notifications.value.filter(n => n.id !== id);
  }

  function clearAllNotifications() {
    notifications.value = [];
  }

  return {
    notifications, // Expose ref for direct reactivity if needed
    allNotifications,
    hasNotifications,
    showNotification,
    dismissNotification,
    clearAllNotifications,
  };
});