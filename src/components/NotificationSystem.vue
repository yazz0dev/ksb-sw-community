<template>
  <div class="notification-container">
    <transition-group name="notification" tag="div">
      <div
        v-for="notification in notifications"
        :key="notification.id"
        class="notification m-2 is-light"
        :class="getNotificationClass(notification.type)"
        style="width: 20rem; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);"
      >
        <button 
          class="delete" 
          @click="dismissNotification(notification.id)"
          aria-label="Dismiss notification"
        ></button>
        <div class="media is-align-items-flex-start">
          <div class="media-left">
            <span class="icon is-medium">
              <i :class="['fas', getTypeIcon(notification.type), 'fa-lg']"></i>
            </span>
          </div>
          <div class="media-content">
            <p v-if="notification.title" class="is-size-6 has-text-weight-medium mb-1">
              {{ notification.title }}
            </p>
            <p class="is-size-7">
              {{ notification.message }}
            </p>
          </div>
        </div>
      </div>
    </transition-group>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useStore } from 'vuex';

const store = useStore();
const notifications = computed(() => store.state.app.notifications || []);

const dismissNotification = (id) => {
  store.dispatch('app/dismissNotification', id);
};

const getNotificationClass = (type) => {
  switch (type) {
    case 'success': return 'is-success';
    case 'error': return 'is-danger';
    case 'warning': return 'is-warning';
    case 'info': 
    default: return 'is-info';
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
  position: fixed;
  top: 1rem;      /* Adjust as needed */
  right: 1rem;    /* Adjust as needed */
  z-index: 1050;  /* Ensure it's above most elements */
  display: flex;
  flex-direction: column;
  align-items: flex-end; /* Align notifications to the right */
}

.notification {
  border-radius: 6px; /* Optional: match Chakra */
}

/* Transition styles */
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

/* Adjust icon size if needed */
.icon.is-medium {
  font-size: 1.5rem;
}
</style>
