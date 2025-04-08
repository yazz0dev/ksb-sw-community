<template>
  <div class="fixed top-4 right-4 z-50 space-y-2 w-80">
    <transition-group name="notification">
      <div 
        v-for="notification in notifications" 
        :key="notification.id" 
        :class="[
          'p-4 rounded-lg shadow-lg border-l-4 flex items-start',
          'transform transition-all duration-300',
          getTypeClasses(notification.type)
        ]"
      >
        <div class="flex-shrink-0 mr-3">
          <i :class="getTypeIcon(notification.type)"></i>
        </div>
        <div class="flex-1 mr-2">
          <p class="font-medium text-sm" v-if="notification.title">{{ notification.title }}</p>
          <p class="text-sm" :class="{'mt-1': notification.title}">{{ notification.message }}</p>
        </div>
        <button 
          @click="dismissNotification(notification.id)" 
          class="flex-shrink-0 text-gray-400 hover:text-gray-600 focus:outline-none"
        >
          <i class="fas fa-times"></i>
        </button>
      </div>
    </transition-group>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useStore } from 'vuex';

const store = useStore();

// Get notifications from store
const notifications = computed(() => store.state.app.notifications || []);

// Dismiss a notification
const dismissNotification = (id) => {
  store.dispatch('app/dismissNotification', id);
};

// Get classes based on notification type
const getTypeClasses = (type) => {
  switch (type) {
    case 'success':
      return 'bg-success-light border-success text-success-dark';
    case 'error':
      return 'bg-error-light border-error text-error-dark';
    case 'warning':
      return 'bg-warning-light border-warning text-warning-dark';
    case 'info':
    default:
      return 'bg-info-light border-info text-info-dark';
  }
};

// Get icon based on notification type
const getTypeIcon = (type) => {
  switch (type) {
    case 'success':
      return 'fas fa-check-circle text-success';
    case 'error':
      return 'fas fa-exclamation-circle text-error';
    case 'warning':
      return 'fas fa-exclamation-triangle text-warning';
    case 'info':
    default:
      return 'fas fa-info-circle text-info';
  }
};
</script>

<style scoped>
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
  transform: translateX(30px);
}
</style>
