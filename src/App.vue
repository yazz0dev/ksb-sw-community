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
import { useAppStore } from './stores/appStore';

import BottomNav from './components/ui/BottomNav.vue';
import TopBar from './components/ui/TopBar.vue';

import { isOneSignalConfigured } from './utils/oneSignalUtils';
import { getOneSignal, isPushSupported } from './utils/oneSignalUtils';
import { initializeOneSignal } from './utils/oneSignalService';

const studentStore = useProfileStore();
const notificationStore = useNotificationStore();
const appStore = useAppStore();
const router = useRouter();
const route = useRoute();

const showPushPermissionPrompt = ref(false);
const isOnline = computed(() => appStore.isOnline);

const isAuthenticated = computed(() => studentStore.isAuthenticated);
const userName = computed(() => studentStore.studentName);
const userProfilePicUrl = computed<string | null>(() => studentStore.currentStudentPhotoURL ?? null);
const newVersionAvailableComputed = computed(() => appStore.newAppVersionAvailable);

const mainContentClasses = computed(() => ({
  'has-bottom-nav': isAuthenticated.value,
  'is-offline': !isOnline.value
}));

const reloadApp = () => {
  if (!isOnline.value) {
    notificationStore.showNotification({
      message: 'Cannot update while offline. Please check your connection.',
      type: 'warning'
    });
    return;
  }
  appStore.setNewAppVersionAvailable(false);
  window.location.reload();
};

const dismissUpdatePrompt = () => {
  appStore.setNewAppVersionAvailable(false);
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
    await studentStore.studentSignOut();
    await router.replace({ name: 'Landing' });
  } catch (error) {
    console.error("Logout error in App.vue:", error);
    notificationStore.showNotification({
      message: 'Logout failed. Please try again.',
      type: 'error'
    });
  }
};

function checkPushPermissionState() {
  if (!isOnline.value || !isOneSignalConfigured() || !isPushSupported()) {
    return;
  }
  const OneSignal = getOneSignal();
  if (!OneSignal || typeof OneSignal.getNotificationPermission !== 'function') {
    return;
  }
  OneSignal.getNotificationPermission().then((permission: string) => {
    if (isAuthenticated.value && permission === 'default' && !sessionStorage.getItem('pushPromptDismissed')) {
      showPushPermissionPrompt.value = true;
    } else {
      showPushPermissionPrompt.value = false;
    }
  });
}

async function requestPushPermission() {
  if (!isOnline.value) {
    notificationStore.showNotification({
      message: 'Cannot enable notifications while offline.',
      type: 'warning'
    });
    return;
  }

  showPushPermissionPrompt.value = false;
  sessionStorage.setItem('pushPromptDismissed', 'true');

  if (!isOneSignalConfigured() || !isPushSupported()) {
    notificationStore.showNotification({ 
      message: 'Push notifications not supported on this browser.',
      type: 'warning'
    });
    return;
  }

  try {
    if (!studentStore.studentId) {
      notificationStore.showNotification({
        message: 'User ID not available for push notifications.',
        type: 'error'
      });
      return;
    }
    await initializeOneSignal(studentStore.studentId);

    const OneSignal = getOneSignal();
    if (!OneSignal) {
      throw new Error('OneSignal not available');
    }

    await OneSignal.registerForPushNotifications();

    if (typeof OneSignal.getNotificationPermission === 'function') {
      const permission = await OneSignal.getNotificationPermission();
      if (permission === 'granted') {
        notificationStore.showNotification({
          message: 'Push notifications enabled!',
          type: 'success'
        });
      } else if (permission === 'denied') {
        notificationStore.showNotification({
          message: 'Push permission was denied. You can enable it in browser settings.',
          type: 'warning'
        });
      }
    }
  } catch (err) {
    console.error("Error requesting push permission:", err);
    notificationStore.showNotification({
      message: 'Failed to enable push notifications.',
      type: 'error'
    });
  }
}

function dismissPushPrompt() {
  showPushPermissionPrompt.value = false;
  sessionStorage.setItem('pushPromptDismissed', 'true');
}

watch(isAuthenticated, (loggedIn) => {
  if (loggedIn && isOnline.value) {
    setTimeout(checkPushPermissionState, 1500);
  } else {
    showPushPermissionPrompt.value = false;
  }
});

watch(isOnline, (online) => {
  if (online && isAuthenticated.value) {
    studentStore.refreshUserData();
  }
});

onMounted(() => {
  appStore.initAppListeners();
  if (isAuthenticated.value && isOnline.value) {
    setTimeout(checkPushPermissionState, 1500);
  }
  try {
    if (typeof studentStore.clearStaleNameCache === 'function') {
      studentStore.clearStaleNameCache();
    }
  } catch (error) {
    console.error("Error during clearStaleNameCache:", error);
  }
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