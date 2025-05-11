<template>
  <div class="app-wrapper d-flex flex-column min-vh-100">
    <TopBar 
      :isAuthenticated="isAuthenticated"
      :userName="userName"
      :showNavbar="showNavbar"
      @logout="handleLogout"
    />

    <main class="flex-grow-1 app-main-content">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" :key="route.fullPath" />
        </transition>
      </router-view>
    </main>

    <BottomNav
      v-if="isAuthenticated"
      class="d-lg-none"
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

const showNavbar = ref(true);
const lastScrollPosition = ref(0);
const scrollThreshold = 50;
const showPushPermissionPrompt = ref(false);
const imgError = ref<boolean>(false); // For profile picture error

const isAuthenticated = computed(() => userStore.isAuthenticated);
const userName = computed(() => userStore.currentUser?.name || 'User');
const userProfilePicUrl = computed<string | null>(() => userStore.profilePictureUrl ?? null);

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

const handleScroll = () => {
  const currentScrollPosition = window.scrollY;
  if (Math.abs(currentScrollPosition - lastScrollPosition.value) < scrollThreshold && currentScrollPosition > 0) {
    return;
  }
  showNavbar.value = currentScrollPosition < lastScrollPosition.value || currentScrollPosition < 10;
  lastScrollPosition.value = currentScrollPosition;
};

onMounted(() => {
  appStore.initOfflineCapabilities();
  window.addEventListener('scroll', handleScroll, { passive: true });
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
  window.removeEventListener('scroll', handleScroll);
});

</script>

<style scoped>
.app-container {
  min-height: 100vh;
  background-color: var(--bs-light);
  color: var(--bs-body-color); /* Use Bootstrap default body color */
}

.app-navbar {
  border-bottom: 1px solid var(--bs-border-color-translucent);
  transition: transform 0.3s ease-in-out;
  will-change: transform;
}

.navbar-hidden {
  transform: translateY(-100%);
}

@media (max-width: 991.98px) {
  /* Styles for the collapsed mobile menu */
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

.push-prompt-banner {
  position: fixed;
  bottom: calc(64px + 1rem);
  left: 1rem;
  right: 1rem;
  z-index: 1045;
  border-radius: var(--bs-border-radius);
  box-shadow: var(--bs-box-shadow);
  transition: bottom 0.3s ease-in-out;
}
.app-container:has(.bottom-nav.nav-hidden) .push-prompt-banner {
    bottom: 1rem;
}
@media (min-width: 992px) {
    .push-prompt-banner {
        bottom: 1rem;
        left: auto;
        right: 1rem;
        width: auto;
        max-width: 400px;
    }
}
</style>
