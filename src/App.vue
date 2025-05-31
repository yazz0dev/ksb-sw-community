// src/App.vue
<template>
  <div class="app-wrapper d-flex flex-column min-vh-100 overflow-hidden">
    <!-- Offline Banner -->
    <div v-if="!isOnline" class="offline-banner alert alert-warning" role="alert">
      <i class="fas fa-wifi-slash me-2"></i>
      You're offline. Some features may be limited.
    </div>

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

    <BottomNav
      v-if="isAuthenticated"
      class="d-lg-none bottom-nav"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useProfileStore } from './stores/profileStore';
import { useNotificationStore } from './stores/notificationStore';
import { usePushNotifications } from '@/composables/usePushNotifications';
import { useAppState } from '@/composables/useAppState';
import { useAuth } from '@/composables/useAuth';

import BottomNav from './components/ui/BottomNav.vue';
import TopBar from './components/ui/TopBar.vue';

const studentStore = useProfileStore();
const notificationStore = useNotificationStore();
const router = useRouter();
const route = useRoute();

const { 
  isOnline, 
  newVersionAvailable: newVersionAvailableComputed,
  reloadApp: reloadAppOriginal,
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
  isAuthenticated
} = useAuth();

const userName = computed(() => studentStore.studentName);
const userProfilePicUrl = computed<string | null>(() => studentStore.currentStudentPhotoURL ?? null);

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

watch(isOnline, (online) => {
  if (online && isAuthenticated.value) {
    // Remove any refresh logic that might cause loops
  }
});

onMounted(() => {
  initAppState();
  
  // Remove clearStaleNameCache call that might cause issues
});

onUnmounted(() => {
  // Cleanup if needed
});
</script>

<style scoped>
.app-wrapper {
  min-height: 100vh;
  background-color: var(--bs-light);
  color: var(--bs-body-color);
  font-size: 1rem; /* Ensure base font size */
}

.app-main-content {
  padding-top: 60px;
}

.app-main-content.has-bottom-nav {
  padding-bottom: calc(4rem + max(0.5rem, env(safe-area-inset-bottom, 0)));
}

.app-main-content.is-offline {
  opacity: 0.8;
}

.offline-banner {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1060;
  margin: 0;
  text-align: center;
  border-radius: 0;
}

@media (max-width: 991.98px) {
  .app-main-content {
    padding-top: 56px;
  }
}

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
  bottom: calc(1rem + env(safe-area-inset-bottom, 0px));
  left: 1rem;
  right: 1rem;
  z-index: 1050;
  border-radius: var(--bs-border-radius);
  box-shadow: var(--bs-box-shadow-lg);
  transition: bottom 0.3s ease-in-out;
}

.app-wrapper:has(.bottom-nav:not(.nav-hidden)) .update-banner,
.app-wrapper:has(.bottom-nav:not(.nav-hidden)) .push-prompt-banner {
  bottom: calc(4rem + 1rem + env(safe-area-inset-bottom, 0px));
}

@media (min-width: 992px) {
  .update-banner,
  .push-prompt-banner {
    left: auto;
    right: 1.5rem;
    max-width: 500px;
  }
}
</style>