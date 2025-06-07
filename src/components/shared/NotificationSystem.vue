// src/components/shared/NotificationSystem.vue
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
import type { QueuedAction, Notification as AppNotification } from '@/types/store'; // Ensure types/store.ts defines these

const notificationStore = useNotificationStore();
const appStore = useAppStore();
const notifications = computed<AppNotification[]>(() => notificationStore.allNotifications); // Assuming studentNotificationStore.allNotifications matches AppNotification[]
const isOnline = computed<boolean>(() => appStore.isOnline);
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

<style lang="scss" scoped>
.notification-container {
  z-index: 1100;
}

.toast {
  width: 20rem;
  background-color: var(--bs-card-bg);
  border: 1px solid var(--bs-border-color);
  box-shadow: var(--bs-box-shadow);
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

.notification-leave-active {
  transition: all 0.2s ease-in;
  position: absolute;
  width: 100%;
}

.notification-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}

.notification-move {
  transition: transform 0.3s ease;
}

/* Enhanced feedback message styles */
.feedback-section {
  .alert {
    border: none;
    border-radius: var(--bs-border-radius-lg);
    backdrop-filter: blur(10px);
    box-shadow: var(--bs-box-shadow-sm);
    
    &.alert-success {
      background: linear-gradient(135deg, 
        rgba(var(--bs-success-rgb), 0.1) 0%, 
        rgba(var(--bs-success-rgb), 0.05) 100%);
      border-left: 4px solid var(--bs-success);
    }
    
    &.alert-danger {
      background: linear-gradient(135deg, 
        rgba(var(--bs-danger-rgb), 0.1) 0%, 
        rgba(var(--bs-danger-rgb), 0.05) 100%);
      border-left: 4px solid var(--bs-danger);
    }
    
    &.alert-warning {
      background: linear-gradient(135deg, 
        rgba(var(--bs-warning-rgb), 0.1) 0%, 
        rgba(var(--bs-warning-rgb), 0.05) 100%);
      border-left: 4px solid var(--bs-warning);
    }
    
    &.alert-info {
      background: linear-gradient(135deg, 
        rgba(var(--bs-info-rgb), 0.1) 0%, 
        rgba(var(--bs-info-rgb), 0.05) 100%);
      border-left: 4px solid var(--bs-info);
    }
    
    .btn-close {
      background-size: 0.75rem;
      opacity: 0.7;
      
      &:hover {
        opacity: 1;
      }
    }
  }
}
</style>