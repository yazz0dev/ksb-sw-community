<template>
  <div class="notification-container toast-container position-fixed top-0 end-0 p-3">
    <transition-group name="notification" tag="div">
      <div
        v-for="notification in notifications"
        :key="notification.id"
        class="toast show m-2 shadow"
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        :class="getToastClass(notification.type)"
        style="width: 20rem;"
      >
        <div class="toast-header" :class="getToastHeaderClass(notification.type)">
          <span class="me-2">
            <i :class="['fas', getTypeIcon(notification.type)]"></i>
          </span>
          <strong class="me-auto">{{ notification.title || notification.type.charAt(0).toUpperCase() + notification.type.slice(1) }}</strong>
          <button
            type="button"
            class="btn-close"
            @click="dismissNotification(notification.id)"
            aria-label="Close"
          ></button>
        </div>
        <div class="toast-body">
          {{ notification.message }}
        </div>
      </div>
    </transition-group>
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue';
import { useNotificationStore } from '@/store/studentNotificationStore';
import { useAppStore } from '@/store/studentAppStore';
// FIX: Import QueuedAction type if not globally defined (assuming it's in store types)
import type { QueuedAction, Notification as AppNotification } from '@/types/store'; // Assuming Notification is also defined here

// Define Notification type locally if not imported globally
// interface AppNotification {
//   id: string;
//   type: 'success' | 'error' | 'warning' | 'info';
//   message: string;
//   title?: string;
//   duration?: number;
// }

// Removed QueuedAction interface definition as it should be imported


const notificationStore = useNotificationStore();
const appStore = useAppStore();
const notifications = computed<AppNotification[]>(() => notificationStore.allNotifications);
const isOnline = computed<boolean>(() => appStore.isOnline);
// FIX: Access the 'actions' array within the offlineQueue state
const queuedActions = computed<QueuedAction[]>(() => appStore.offlineQueue.actions);

const dismissNotification = (id: string): void => {
  notificationStore.dismissNotification(id);
};

// Watch for network status changes
watch(isOnline, (online: boolean) => {
  // FIX: Use .value for computed refs inside watch
  if (online && queuedActions.value.length > 0) {
    notificationStore.showNotification({
      message: `Back online. Syncing ${queuedActions.value.length} pending changes...`,
      type: 'info',
      duration: 3000
    });
  }
});

// Watch queued actions for offline notifications
watch(() => queuedActions.value.length, (newCount: number, oldCount: number) => {
  // FIX: Use .value for computed ref inside watch
  if (!isOnline.value && newCount > oldCount) {
    notificationStore.showNotification({
      message: 'Action queued. Will sync when back online.',
      type: 'warning',
      duration: 3000
    });
  }
});

const getToastClass = (type: AppNotification['type']): string => {
  switch (type) {
    case 'success': return 'border-success';
    case 'error': return 'border-danger';
    case 'warning': return 'border-warning';
    case 'info':
    default: return 'border-info';
  }
};

const getToastHeaderClass = (type: AppNotification['type']): string => {
  switch (type) {
    case 'success': return 'bg-success-subtle text-success-emphasis';
    case 'error': return 'bg-danger-subtle text-danger-emphasis';
    case 'warning': return 'bg-warning-subtle text-warning-emphasis';
    case 'info':
    default: return 'bg-info-subtle text-info-emphasis';
  }
};

const getTypeIcon = (type: AppNotification['type']): string => {
  switch (type) {
    case 'success': return 'fa-check-circle';
    case 'error': return 'fa-exclamation-circle';
    case 'warning': return 'fa-exclamation-triangle';
    case 'info':
    default: return 'fa-info-circle';
  }
};
</script>

<style scoped>
.notification-container {
  /* Position fixed is handled by toast-container */
  z-index: 1100; /* Ensure it's above Bootstrap modals (1050+) */
}

/* --- Vue Transition Classes --- */
/* Enter */
.notification-enter-active {
  transition: all 0.3s ease-out;
}
.notification-enter-from {
  opacity: 0;
  transform: translateX(30px);
}
.notification-enter-to {
  opacity: 1;
  transform: translateX(0);
}

/* Leave */
.notification-leave-active {
  transition: all 0.2s ease-in;
  /* Ensure leaving item stays in place initially */
  position: absolute; /* Or adjust based on layout needs */
  width: 100%; /* Prevent width collapsing */
}
.notification-leave-to {
  opacity: 0;
  transform: translateY(-20px); /* Or scale(0.8) */
}

/* Move */
.notification-move {
  transition: transform 0.3s ease;
}
/* --- End Vue Transition Classes --- */


.toast.show {
  opacity: 1;
  /* transition: opacity 0.3s; */ /* Let Vue handle transitions */
}

/* Adjust close button color if needed based on header */
.toast-header .btn-close {
  filter: invert(1) grayscale(100%) brightness(200%); /* Make close button visible on colored backgrounds */
}
.bg-warning-subtle .btn-close,
.bg-info-subtle .btn-close {
   filter: none; /* Reset filter for lighter backgrounds */
}
</style>