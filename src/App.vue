// src/App.vue
<template>
  <div class="app-wrapper d-flex flex-column min-vh-100 overflow-hidden">
    <TopBar
      :isAuthenticated="isAuthenticated"
      :userName="userName"
      @logout="handleLogout"
    />

    <div v-if="newVersionAvailableComputed" class="update-banner alert alert-info d-flex justify-content-between align-items-center" role="alert">
      <span>A new version of the app is available.</span>
      <div>
        <button class="btn btn-primary btn-sm me-2" @click="reloadApp">Reload</button>
        <button class="btn btn-secondary btn-sm" @click="dismissUpdatePrompt">Dismiss</button>
      </div>
    </div>

    <!-- Push Notification Prompt Banner -->
    <div v-if="showPushPermissionPrompt && isOnline" class="push-prompt-banner alert alert-info d-flex justify-content-between align-items-center" role="alert">
      <span>Enable push notifications to stay updated?</span>
      <div>
        <button class="btn btn-primary btn-sm me-2" @click="requestPushPermission">Enable</button>
        <button class="btn btn-outline-secondary btn-sm" @click="dismissPushPrompt">Later</button>
      </div>
    </div>

    <main class="flex-grow-1 app-main-content" :class="mainContentClasses">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" :key="route.fullPath" />
        </transition>
      </router-view>
    </main>

    <!-- Always show BottomNav on mobile when authenticated -->
    <BottomNav v-if="isAuthenticated" />
    
    <!-- Offline State Handler Component -->
    <OfflineStateHandler />

    <!-- Notification System -->
    <NotificationSystem />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useProfileStore } from './stores/profileStore';
import { useNotificationStore } from './stores/notificationStore';
import { usePushNotifications } from '@/composables/usePushNotifications';
import { useAppState } from '@/composables/useAppState';
import { useAuth } from '@/composables/useAuth';

import BottomNav from './components/ui/BottomNav.vue';
import TopBar from './components/ui/TopBar.vue';
import OfflineStateHandler from './components/shared/OfflineStateHandler.vue';
import NotificationSystem from './components/shared/NotificationSystem.vue'; // Added import

const studentStore = useProfileStore();
const notificationStore = useNotificationStore();
const router = useRouter();
const route = useRoute();

const { 
  isOnline, 
  newVersionAvailable: newVersionAvailableComputed,
  setNewVersionAvailable,
  initAppState
} = useAppState();

const { 
  showPushPermissionPrompt, 
  requestPushPermission, 
  dismissPushPrompt,
} = usePushNotifications();

const { 
  logout: performLogout,
  isAuthenticated} = useAuth();

const userName = computed(() => studentStore.studentName);

const mainContentClasses = computed(() => ({
  'has-bottom-nav': isAuthenticated.value,
  'is-offline': !isOnline.value
}));

const dismissUpdatePrompt = () => {
  setNewVersionAvailable(false);
};

const reloadApp = async () => {
  try {
    // Use the global updateSW function if available
    if (window.__updateSW) {
      await window.__updateSW(true);
    } else {
      // Fallback to regular reload
      window.location.reload();
    }
  } catch (error) {
    console.error('Error updating app:', error);
    window.location.reload();
  }
};

const handleLogout = async (): Promise<void> => {
  if (!isOnline.value) {
    notificationStore.showNotification({
      message: 'Cannot logout while offline. Please check your connection.',
      type: 'warning'
    });
    return;
  }
  
  try {
    await performLogout();
    await router.replace({ name: 'Landing' });
  } catch (error) {
    console.error("Logout error in App.vue (after calling useAuth.logout):", error);
    notificationStore.showNotification({
      message: 'Logout failed. Please try again.',
      type: 'error'
    });
  }
};

// Add a flag to prevent multiple auth refresh attempts
// const isRefreshingAuth = ref(false); // This can be removed as we are removing the logic that uses it.

watch(isOnline, (online) => {
  if (online && isAuthenticated.value) {
    // Removed refresh logic that was causing loops
  }
});

onMounted(async () => {
  initAppState();
  
  // Removed the block that checked for auth state mismatch and called refreshAuthState.
  // The initial auth state is now expected to be fully handled by main.ts,
  // initializeAuth service, and the main onAuthStateChanged listener.
  // isAuthenticated computed property will reflect this state.
});

onUnmounted(() => {
  // Cleanup if needed
});
</script>

<style scoped>
.app-wrapper {
  background-color: var(--bs-light);
  color: var(--bs-body-color);
  /* font-size is inherited from body now */
  position: relative;
  overflow-x: hidden; /* Prevent horizontal scroll on the main wrapper */
}

/* .app-main-content styles are now handled globally in main.scss */
/* This ensures consistency across all views */

/* Mobile-specific styles */
/* Media queries for .app-main-content are now in main.scss */

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease-out;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.update-banner,
.push-prompt-banner {
  position: fixed;
  bottom: 1rem;
  left: 1rem;
  right: 1rem;
  z-index: 1050;
  border-radius: var(--bs-border-radius);
  box-shadow: var(--bs-box-shadow-lg);
  transition: bottom 0.3s ease-in-out;
}

/* Adjust banner position when bottom nav is present */
@media (max-width: 991.98px) {
  .app-wrapper:has(.bottom-nav) .update-banner,
  .app-wrapper:has(.bottom-nav) .push-prompt-banner {
    bottom: calc(var(--bottom-nav-height-mobile) + 1rem + env(safe-area-inset-bottom, 0px));
  }
}

@media (min-width: 992px) {
  .update-banner,
  .push-prompt-banner {
    left: auto;
    right: 1.5rem;
    max-width: 500px;
    /* Ensure banners don't account for bottom nav on desktop */
    bottom: 1rem;
  }
}
</style>