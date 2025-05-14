<template>
  <div class="app-wrapper d-flex flex-column min-vh-100 overflow-hidden">
    <TopBar 
      :isAuthenticated="isAuthenticated"
      :userName="userName"
      @logout="handleLogout"
    />

    <div v-if="newVersionAvailable" class="update-banner alert alert-info d-flex justify-content-between align-items-center" role="alert">
      <span>A new version of the app is available.</span>
      <div>
        <button class="btn btn-primary btn-sm me-2" @click="reloadApp">Reload</button>
        <button class="btn btn-secondary btn-sm" @click="dismissUpdatePrompt">Dismiss</button>
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
import { useUserStore } from './store/user';
import { useNotificationStore } from './store/notification';
import { useAppStore } from './store/app';
import { getAuth, signOut } from 'firebase/auth';

import BottomNav from './components/ui/BottomNav.vue';
import TopBar from './components/ui/TopBar.vue';

import { isOneSignalConfigured } from './utils/oneSignalUtils';
import { getOneSignal, isPushSupported } from './utils/oneSignalUtils';
import { initializeOneSignal } from './utils/oneSignalService';

const userStore = useUserStore();
const notificationStore = useNotificationStore();
const appStore = useAppStore();
const router = useRouter();
const route = useRoute();

const showPushPermissionPrompt = ref(false);
const imgError = ref<boolean>(false); // For profile picture error

const isAuthenticated = computed(() => userStore.isAuthenticated);
const userName = computed(() => userStore.currentUser?.name || 'User');
const userProfilePicUrl = computed<string | null>(() => userStore.profilePictureUrl ?? null);
const newVersionAvailable = computed(() => appStore.newVersionAvailable);

const mainContentClasses = computed(() => {
  return {
    'has-bottom-nav': isAuthenticated.value // BottomNav is v-if="isAuthenticated" and d-lg-none
  };
});

const reloadApp = () => {
  appStore.setNewVersionAvailable(false); // Hide banner before reload
  window.location.reload();
};

const dismissUpdatePrompt = () => {
  appStore.setNewVersionAvailable(false);
  // Optionally, set a session flag to not show again for this session
  // sessionStorage.setItem('updatePromptDismissedSession', 'true');
};

const logout = async (): Promise<void> => {
  const auth = getAuth();
  try {
    await userStore.clearUserData();
    await userStore.setHasFetched(true);

    await signOut(auth);

    await router.replace({ name: 'Landing' });
  } catch (error) {
    notificationStore.showNotification({
      message: 'Logout failed. Please try again.',
      type: 'error'
    });
  }
};

const handleLogout = async (): Promise<void> => {
  await logout();
};

const handleImageError = (): void => {
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
    // Use the centralized initialization function instead
    await initializeOneSignal(userStore.uid);
    
    const OneSignal = getOneSignal();
    if (!OneSignal) {
      throw new Error('OneSignal not available');
    }
    
    // Register for push notifications
    await OneSignal.registerForPushNotifications();
    
    // Check permission status after registration attempt
    if (typeof OneSignal.getNotificationPermission === 'function') {
      const permission = await OneSignal.getNotificationPermission();
      
      if (permission === 'granted') {
        notificationStore.showNotification({ message: 'Push notifications enabled!', type: 'success' });
      } else if (permission === 'denied') {
        notificationStore.showNotification({ message: 'Push permission was denied. You can enable it in browser settings.', type: 'warning' });
      }
    }
  } catch (err) {
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
  appStore.initOfflineCapabilities();
  if (isAuthenticated.value) {
       setTimeout(checkPushPermissionState, 1500);
  }
  try {
    // Check if clearStaleCache method exists before calling it
    if (typeof userStore.clearStaleCache === 'function') {
      userStore.clearStaleCache();
    } else {
      console.log("clearStaleCache method not implemented in userStore");
    }
  } catch (error) {
    console.error("Error when calling clearStaleCache:", error);
  }
});

onUnmounted(() => {
});

</script>

<style scoped>
.app-container {
  min-height: 100vh;
  background-color: var(--bs-light);
  color: var(--bs-body-color); /* Use Bootstrap default body color */
}

.app-main-content {
  padding-top: 60px; /* Add padding to account for fixed navbar height */
}

@media (max-width: 991.98px) {
  /* Styles for the collapsed mobile menu */
  .app-main-content {
    padding-top: 56px; /* Adjust for smaller navbar on mobile */
  }
  
  #navbarNav.collapse.show,
  #navbarNav.collapsing {
    background-color: var(--bs-primary);
    padding: 0.75rem 1rem;
    margin-top: 0.5rem;
    border-top: 1px solid var(--bs-border-color-translucent);
    border-radius: var(--bs-border-radius-sm);
    box-shadow: var(--bs-box-shadow);
  }

  #navbarNav .nav-item {
    margin-bottom: 0.125rem;
  }

  #navbarNav .nav-link {
    color: rgba(255, 255, 255, 0.85);
    padding-top: 0.5rem;
    padding-bottom: 0.5rem;
    border-radius: var(--bs-border-radius-sm); /* for hover indication */
  }

  #navbarNav .nav-link:hover,
  #navbarNav .nav-link:focus {
    color: var(--bs-white);
    background-color: rgba(255, 255, 255, 0.1);
  }

  /* Ensure router-link-active styles are applied correctly for visibility */
  #navbarNav .nav-link.router-link-active.router-link-exact-active,
  #navbarNav .nav-link.active { /* This targets Bootstrap's .active and Vue Router's active class */
    color: var(--bs-white) !important; /* Ensure high contrast for active text */
    font-weight: 600; /* Corresponds to fw-semibold or Bootstrap's bold for active nav items */
    background-color: rgba(255, 255, 255, 0.15); /* Slightly more prominent active background */
  }

  .navbar-nav {
    width: 100%;
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

.dropdown-menu {
  margin-top: 0.5rem;
  box-shadow: var(--bs-box-shadow-sm);
  border-color: var(--bs-border-color-translucent);
}
.dropdown-item {
    font-size: 0.9rem;
    padding-top: 0.5rem;
    padding-bottom: 0.5rem;
}
.dropdown-item i {
    color: var(--bs-secondary);
}

.navbar-profile-pic {
  width: 28px;
  height: 28px;
  object-fit: cover;
  border: 1px solid var(--bs-border-color);
}

.nav-link, .dropdown-item, .navbar-brand {
  cursor: pointer;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
}

.update-banner {
  position: fixed;
  /* Default bottom position, accounts for safe area */
  bottom: calc(1rem + env(safe-area-inset-bottom, 0px)); 
  left: 1rem;
  right: 1rem;
  z-index: 1050; 
  border-radius: var(--bs-border-radius);
  box-shadow: var(--bs-box-shadow-lg);
}

.push-prompt-banner { /* Assuming this class exists or will be added */
  position: fixed;
  /* Default bottom position, accounts for safe area */
  bottom: calc(1rem + env(safe-area-inset-bottom, 0px));
  left: 1rem;
  right: 1rem;
  z-index: 1045;
  border-radius: var(--bs-border-radius);
  box-shadow: var(--bs-box-shadow);
  transition: bottom 0.3s ease-in-out;
}

/* Adjust banner positions if BottomNav is present and visible (not .nav-hidden) */
/* This targets mobile views implicitly because BottomNav has d-lg-none */
/* Assumes BottomNav root element will have/get the 'bottom-nav' class */
.app-wrapper:has(.bottom-nav:not(.nav-hidden)) .update-banner,
.app-wrapper:has(.bottom-nav:not(.nav-hidden)) .push-prompt-banner {
  /* $bottom-nav-height is 4rem */
  bottom: calc(4rem + max(0.5rem, env(safe-area-inset-bottom, 0))); /* Improved calculation */
}


@media (min-width: 992px) {
    .update-banner, .push-prompt-banner {
        left: auto; /* Align to right on desktop */
        max-width: 500px; 
    }
    /* On desktop, BottomNav is not shown, so the default bottom position is fine */
}

/* Remove old specific banner positioning rules if they conflict */
/* For example, the old .app-wrapper:has(.bottom-nav:not(.nav-hidden)) .update-banner can be removed if this replaces it */
/* And the old .push-prompt-banner specific rules for bottom positioning */

</style>
