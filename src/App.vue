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
    <div v-if="showPushPermissionPrompt" class="push-prompt-banner alert alert-info d-flex justify-content-between align-items-center" role="alert">
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
import { useStudentProfileStore } from './stores/studentProfileStore';
import { useStudentNotificationStore } from './stores/studentNotificationStore';
import { useStudentAppStore } from './stores/studentAppStore';

import BottomNav from './components/ui/BottomNav.vue';
import TopBar from './components/ui/TopBar.vue';

import { isOneSignalConfigured } from './utils/oneSignalUtils';
import { getOneSignal, isPushSupported } from './utils/oneSignalUtils';
import { initializeOneSignal } from './utils/oneSignalService';

const userStore = useStudentProfileStore();
const notificationStore = useStudentNotificationStore();
const appStore = useStudentAppStore();
const router = useRouter();
const route = useRoute();

const showPushPermissionPrompt = ref(false);
const imgError = ref<boolean>(false); // This seems unused, consider removing if not needed for profile pic fallback

const isAuthenticated = computed(() => userStore.isAuthenticated);
const userName = computed(() => userStore.studentName);
const userProfilePicUrl = computed<string | null>(() => userStore.currentStudentPhotoURL ?? null);
const newVersionAvailableComputed = computed(() => appStore.newAppVersionAvailable); // Renamed for clarity

const mainContentClasses = computed(() => {
  return {
    'has-bottom-nav': isAuthenticated.value // This class will be applied if user is authenticated
  };
});

const reloadApp = () => {
  appStore.setNewAppVersionAvailable(false);
  window.location.reload();
};

const dismissUpdatePrompt = () => {
  appStore.setNewAppVersionAvailable(false);
};

const handleLogout = async (): Promise<void> => {
  try {
    await userStore.studentSignOut();
    await router.replace({ name: 'Landing' });
  } catch (error) {
    console.error("Logout error in App.vue:", error);
    notificationStore.showNotification({
      message: 'Logout failed. Please try again.',
      type: 'error'
    });
  }
};

const handleImageError = (): void => { // Unused if profile pic not directly in App.vue
  imgError.value = true;
};

function checkPushPermissionState() {
  if (!isOneSignalConfigured() || !isPushSupported()) {
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
  showPushPermissionPrompt.value = false;
  sessionStorage.setItem('pushPromptDismissed', 'true');

  if (!isOneSignalConfigured() || !isPushSupported()) {
    notificationStore.showNotification({ message: 'Push notifications not supported on this browser.', type: 'warning' });
    return;
  }

  try {
    if (!userStore.studentId) {
      notificationStore.showNotification({ message: 'User ID not available for push notifications.', type: 'error' });
      return;
    }
    await initializeOneSignal(userStore.studentId);

    const OneSignal = getOneSignal();
    if (!OneSignal) {
      throw new Error('OneSignal not available');
    }

    await OneSignal.registerForPushNotifications();

    if (typeof OneSignal.getNotificationPermission === 'function') {
      const permission = await OneSignal.getNotificationPermission();

      if (permission === 'granted') {
        notificationStore.showNotification({ message: 'Push notifications enabled!', type: 'success' });
      } else if (permission === 'denied') {
        notificationStore.showNotification({ message: 'Push permission was denied. You can enable it in browser settings.', type: 'warning' });
      }
    }
  } catch (err) {
    console.error("Error requesting push permission:", err);
    notificationStore.showNotification({ message: 'Failed to enable push notifications.', type: 'error' });
  }
}

function dismissPushPrompt() {
    showPushPermissionPrompt.value = false;
    sessionStorage.setItem('pushPromptDismissed', 'true');
}

watch(isAuthenticated, (loggedIn) => {
    if (loggedIn) {
        setTimeout(checkPushPermissionState, 1500);
    } else {
        showPushPermissionPrompt.value = false;
    }
});

onMounted(() => {
  appStore.initAppListeners(); // Corrected method name
  if (isAuthenticated.value) {
       setTimeout(checkPushPermissionState, 1500);
  }
  try {
    if (typeof userStore.clearStaleNameCache === 'function') {
      userStore.clearStaleNameCache();
    } else {
      console.warn("clearStaleNameCache method not available in userStore");
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
.app-wrapper { /* Changed from .app-container to .app-wrapper to match template */
  min-height: 100vh;
  background-color: var(--bs-light);
  color: var(--bs-body-color);
}

.app-main-content {
  padding-top: 60px; /* Default for desktop, adjust if TopBar height changes */
  /* Mobile padding-bottom is dynamic via :class="mainContentClasses" */
}

.app-main-content.has-bottom-nav {
  padding-bottom: calc(4rem + max(0.5rem, env(safe-area-inset-bottom, 0))); /* 4rem is BottomNav height */
}


@media (max-width: 991.98px) {
  .app-main-content {
    padding-top: 56px; /* Adjust for smaller navbar on mobile */
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

.update-banner, .push-prompt-banner {
  position: fixed;
  bottom: calc(1rem + env(safe-area-inset-bottom, 0px));
  left: 1rem;
  right: 1rem;
  z-index: 1050;
  border-radius: var(--bs-border-radius);
  box-shadow: var(--bs-box-shadow-lg);
  transition: bottom 0.3s ease-in-out; /* Added for smooth transition */
}

.app-wrapper:has(.bottom-nav:not(.nav-hidden)) .update-banner,
.app-wrapper:has(.bottom-nav:not(.nav-hidden)) .push-prompt-banner {
  bottom: calc(4rem + 1rem + env(safe-area-inset-bottom, 0px)); /* 4rem is bottom-nav-height, 1rem is desired gap */
}


@media (min-width: 992px) {
    .update-banner, .push-prompt-banner {
        left: auto; /* Align to right on desktop */
        right: 1.5rem; /* Consistent with other elements */
        max-width: 500px;
        /* On desktop, BottomNav is not shown, so the default bottom position is fine */
    }
}
</style>