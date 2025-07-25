// src/components/shared/NotificationSystem.vue
<template>
  <div class="notification-container toast-container position-fixed top-0 end-0 p-3">
    <transition-group name="notification">
      <div
        v-for="notification in notifications"
        :key="notification.id"
        class="toast show m-2 shadow"
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        :class="getToastClass(notification.type)"
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
import { useNotificationStore } from '@/stores/notificationStore';
import { useAppStore } from '@/stores/appStore';
import type { QueuedAction, Notification } from '@/types/store'; // Import Notification from types/store.ts

const notificationStore = useNotificationStore();
const appStore = useAppStore();

const notifications = computed(() => notificationStore.notifications);
const isOnline = computed(() => appStore.isOnline);
const queuedActions = computed<QueuedAction[]>(() => appStore.offlineQueue.actions);

const dismissNotification = (id: string): void => {
  notificationStore.dismissNotification(id);
};

watch(isOnline, (online: boolean) => {
  if (online && queuedActions.value.length > 0) {
    notificationStore.showNotification({
      message: `Back online. Syncing ${queuedActions.value.length} pending changes...`,
      type: 'info',
      duration: 3000
    });
  }
});

watch(() => queuedActions.value.length, (newCount: number, oldCount: number) => {
  if (!isOnline.value && newCount > oldCount) {
    notificationStore.showNotification({
      message: 'Action queued. Will sync when back online.',
      type: 'warning',
      duration: 3000
    });
  }
});

const getToastClass = (type: Notification['type']): string => {
  switch (type) {
    case 'success': return 'border-success';
    case 'error': return 'border-danger';
    case 'warning': return 'border-warning';
    case 'info':
    default: return 'border-info';
  }
};

const getToastHeaderClass = (type: Notification['type']): string => {
  switch (type) {
    case 'success': return 'bg-success-subtle text-success-emphasis';
    case 'error': return 'bg-danger-subtle text-danger-emphasis';
    case 'warning': return 'bg-warning-subtle text-warning-emphasis';
    case 'info':
    default: return 'bg-info-subtle text-info-emphasis';
  }
};

const getTypeIcon = (type: Notification['type']): string => {
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
  z-index: 1100;
}

.toast {
  width: 20rem;
  max-width: calc(100vw - 2rem);
  background-color: var(--bs-body-bg);
  background-clip: padding-box;
  border: 1px solid var(--bs-border-color-translucent);
  box-shadow: var(--bs-box-shadow-lg);
}

.toast.show {
  opacity: 1;
}

.toast-header {
  background-color: var(--bs-tertiary-bg);
  border-bottom: 1px solid var(--bs-border-color);
}

.toast-header .btn-close {
  filter: invert(1) grayscale(100%) brightness(200%);
}

.bg-warning-subtle .btn-close,
.bg-info-subtle .btn-close {
  filter: none;
}

.notification-enter-active,
.notification-leave-active,
.notification-move {
  transition: all 0.3s ease;
}

.notification-enter-from,
.notification-leave-to {
  opacity: 0;
  transform: translateX(30px);
}

.notification-leave-active {
  position: absolute;
}
</style>