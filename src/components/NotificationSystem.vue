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

<script setup>
import { computed, watch } from 'vue';
import { useStore } from 'vuex';

const store = useStore();
const notifications = computed(() => store.state.notification.notifications);
const isOnline = computed(() => store.state.app.networkStatus.online);
const queuedActions = computed(() => store.state.app.offlineQueue.actions);

const dismissNotification = (id) => {
  store.dispatch('app/dismissNotification', id);
};

// Watch for network status changes
watch(isOnline, (online) => {
  if (online && queuedActions.value.length > 0) {
    store.dispatch('notification/showNotification', {
      message: `Back online. Syncing ${queuedActions.value.length} pending changes...`,
      type: 'info',
      duration: 3000
    });
  }
});

// Watch queued actions for offline notifications
watch(() => queuedActions.value.length, (newCount, oldCount) => {
  if (!isOnline.value && newCount > oldCount) {
    store.dispatch('notification/showNotification', {
      message: 'Action queued. Will sync when back online.',
      type: 'warning',
      duration: 3000
    });
  }
});

// Bootstrap classes for the toast background/border
const getToastClass = (type) => {
  switch (type) {
    case 'success': return 'border-success';
    case 'error': return 'border-danger';
    case 'warning': return 'border-warning';
    case 'info': 
    default: return 'border-info';
  }
};

// Bootstrap classes for the toast header background/text
const getToastHeaderClass = (type) => {
  switch (type) {
    case 'success': return 'bg-success-subtle text-success-emphasis';
    case 'error': return 'bg-danger-subtle text-danger-emphasis';
    case 'warning': return 'bg-warning-subtle text-warning-emphasis';
    case 'info': 
    default: return 'bg-info-subtle text-info-emphasis';
  }
};

const getTypeIcon = (type) => {
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


/* Transition styles - Adapt if needed for toast */
.notification-enter-active,
.notification-leave-active {
  transition: all 0.3s ease;
}
.notification-enter-from {
  opacity: 0;
  transform: translateX(30px);
}
.notification-leave-to {
  opacity: 0;
  transform: scale(0.8);
}

/* Adjust close button color if needed based on header */
/* .toast-header .btn-close { ... } */

</style>
