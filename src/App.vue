<template>
  <div id="app" class="d-flex flex-column app-container">
    <OfflineStateHandler />
    <NotificationSystem />

    <div v-if="showPushPermissionPrompt" class="push-prompt-banner alert alert-info d-flex justify-content-between align-items-center p-2">
      <span class="small">Enable push notifications for event updates?</span>
      <div>
        <button @click="requestPushPermission" class="btn btn-sm btn-light me-2">Enable</button>
        <button @click="dismissPushPrompt" class="btn btn-sm btn-link text-secondary p-0" aria-label="Dismiss prompt">
          <i class="fas fa-times"></i>
        </button>
      </div>
    </div>

    <nav
      class="navbar navbar-expand-lg navbar-dark bg-primary shadow-sm fixed-top app-navbar"
      :class="{ 'navbar-hidden': !showNavbar }"
      role="navigation"
      aria-label="main navigation"
    >
       <div class="container-lg">
        <router-link
          class="navbar-brand d-flex align-items-center app-navbar-brand"
          to="/"
        >
          <i class="fas fa-users fa-lg me-2"></i>
          <span class="fw-bold">KSB Community</span>
        </router-link>

        <button
          class="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarNav"
          aria-controls="navbarNav"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span class="navbar-toggler-icon"></span>
        </button>

        <div
          class="collapse navbar-collapse app-navbar-menu"
          id="navbarNav"
        >
          <ul class="navbar-nav me-auto mb-2 mb-lg-0">
            <li class="nav-item d-none d-lg-block">
              <router-link
                class="nav-link"
                active-class="active fw-semibold"
                to="/home"
                v-if="isAuthenticated"
                @click="closeNavbar"
                @keyup.enter="closeNavbar"
              >
                Home
              </router-link>
            </li>
            <li class="nav-item" v-if="!isAuthenticated">
              <router-link
                class="nav-link"
                active-class="active fw-semibold"
                to="/events"
                @click="closeNavbar"
              >
                Events
              </router-link>
            </li>
             <li class="nav-item d-none d-lg-block" v-if="!isAuthenticated">
               <router-link
                  class="nav-link"
                  active-class="active fw-semibold"
                  to="/leaderboard"
                  @click="closeNavbar"
               >
                  Leaderboard
               </router-link>
             </li>
            <li class="nav-item">
              <router-link
                class="nav-link"
                active-class="active fw-semibold"
                to="/resources"
                @click="closeNavbar"
              >
                Resources
              </router-link>
            </li>
            <li class="nav-item">
              <router-link
                class="nav-link"
                active-class="active fw-semibold"
                to="/transparency"
                @click="closeNavbar"
              >
                Transparency
              </router-link>
            </li>
          </ul>

          <ul class="navbar-nav ms-auto align-items-lg-center">
            <template v-if="!isAuthenticated">
              <li class="nav-item">
                <router-link
                  class="btn btn-outline-light btn-sm"
                  to="/login"
                  @click="closeNavbar"
                >
                   <i class="fas fa-sign-in-alt me-1"></i> Login
                </router-link>
              </li>
            </template>

            <template v-if="isAuthenticated">
              <li class="nav-item dropdown">
                <a class="nav-link dropdown-toggle d-flex align-items-center" href="#" id="navbarUserDropdown" role="button" data-bs-toggle="dropdown" aria-expanded="false">
                  <i class="fas fa-user-circle me-1"></i>
                  <span>{{ userName }}</span>
                </a>
                <ul class="dropdown-menu dropdown-menu-end" aria-labelledby="navbarUserDropdown">
                  <li v-if="!isAdmin">
                    <router-link
                      class="dropdown-item"
                      :to="{ name: 'Profile' }"
                      @click="closeNavbar"
                    >
                      <i class="fas fa-user fa-fw me-2"></i>Profile
                    </router-link>
                  </li>
                  <li v-if="isAdmin">
                    <router-link
                      class="dropdown-item"
                      :to="{ name: 'AdminDashboard' }"
                       @click="closeNavbar"
                    >
                      <i class="fas fa-tachometer-alt fa-fw me-2"></i>Admin Dashboard
                    </router-link>
                  </li>
                  <li><hr class="dropdown-divider"></li>
                  <li>
                    <button
                      class="dropdown-item"
                      @click="() => { closeNavbar(); handleLogout(); }"
                    >
                      <i class="fas fa-sign-out-alt fa-fw me-2"></i>Logout
                    </button>
                  </li>
                </ul>
              </li>
            </template>
          </ul>
        </div>
      </div>
    </nav>

    <main class="flex-grow-1 app-main-content">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
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
import { computed, onMounted, onUnmounted, ref, watch, nextTick } from 'vue';
import { useStore } from 'vuex';
import { useRouter } from 'vue-router';
import { getAuth, signOut } from 'firebase/auth';

import BottomNav from './components/BottomNav.vue';
import OfflineStateHandler from './components/OfflineStateHandler.vue';
import NotificationSystem from './components/NotificationSystem.vue';

import { isSupabaseConfigured } from './notifications';

interface Collapse {
  toggle(): void;
  hide(): void;
  show(): void;
  dispose(): void;
}
declare global {
  interface Window {
    bootstrap?: {
      Modal?: any;
      Collapse?: {
        new(element: Element | string, options?: any): Collapse;
        getInstance(element: Element | string): Collapse | null;
      };
    };
  }
}

const store = useStore();
const router = useRouter();

const showNavbar = ref(true);
const lastScrollPosition = ref(0);
const scrollThreshold = 50;
const showPushPermissionPrompt = ref(false);

const isAuthenticated = computed(() => store.getters['user/isAuthenticated']);
const isAdmin = computed(() => store.getters['user/isAdmin']);
const userName = computed(() => store.getters['user/getUser']?.name || 'User');
const userId = computed(() => store.getters['user/userId']);


const logout = async (): Promise<void> => {
  const auth = getAuth();
  try {
    await store.commit('user/clearUserData');
    await store.commit('user/setHasFetched', true);

    await signOut(auth);

    await router.replace({ name: 'Landing' });
  } catch (error) {
    store.dispatch('notification/showNotification', {
      message: 'Logout failed. Please try again.',
      type: 'error'
    }, { root: true });
  }
};

const closeNavbar = () => {
  try {
    const toggler = document.querySelector('.navbar-toggler') as HTMLElement | null;
    if (toggler && window.getComputedStyle(toggler).display !== 'none') {
      toggler.click();
    } else {
      const navbarContent = document.getElementById('navbarNav');
      if (navbarContent?.classList.contains('show') && window.bootstrap?.Collapse) {
        const bsCollapse = window.bootstrap.Collapse.getInstance(navbarContent);
        bsCollapse?.hide();
      }
    }
  } catch (error) {
    // Optionally handle or log the error differently if needed
  }
};

onMounted(() => {
  const collapseEl = document.getElementById('navbarNav');
  const toggler = document.querySelector('.navbar-toggler');
  const collapseParent = collapseEl?.closest('.navbar-collapse') as HTMLElement | null;
  if (!collapseEl || !toggler || !window.bootstrap?.Collapse) return;
  const bsCollapse = window.bootstrap.Collapse.getInstance(collapseEl)
    || new window.bootstrap.Collapse(collapseEl, { toggle: false });

  const outsideClickHandler = (e: MouseEvent | TouchEvent) => {
    if (window.innerWidth < 992 && collapseEl.classList.contains('show')
      && !collapseEl.contains(e.target as Node)
      && !toggler.contains(e.target as Node)) {
      bsCollapse.hide();
    }
  };
  document.addEventListener('mousedown', outsideClickHandler, true);
  document.addEventListener('touchstart', outsideClickHandler, true);

  const escapeKeyHandler = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && window.innerWidth < 992 && collapseEl.classList.contains('show')) {
      closeNavbar();
    }
  };
  document.addEventListener('keydown', escapeKeyHandler, true);

  const removeAfterEach = router.afterEach(() => {
    if (window.innerWidth < 992 && collapseEl.classList.contains('show')) {
      bsCollapse.hide();
    }
  });

  onUnmounted(() => {
    document.removeEventListener('mousedown', outsideClickHandler, true);
    document.removeEventListener('touchstart', outsideClickHandler, true);
    document.removeEventListener('keydown', escapeKeyHandler, true);
    removeAfterEach();
  });
});

const handleLogout = async (): Promise<void> => {
  closeNavbar();
  await logout();
};

function getOneSignal(): any {
  return (window as any).OneSignal;
}

function isPushSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

function checkPushPermissionState() {
  if (!isSupabaseConfigured() || !isPushSupported()) {
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

  if (!isSupabaseConfigured() || !isPushSupported()) {
    store.dispatch('notification/showNotification', { message: 'Push notifications not supported on this browser.', type: 'warning' }, { root: true });
    return;
  }

  const OneSignal = getOneSignal();
  if (!OneSignal || typeof OneSignal.registerForPushNotifications !== 'function') {
    store.dispatch('notification/showNotification', { message: 'Push notification SDK not loaded.', type: 'error' }, { root: true });
    return;
  }

  try {
    await OneSignal.registerForPushNotifications();

    if (typeof OneSignal.getNotificationPermission === 'function') {
      const permission = await OneSignal.getNotificationPermission();

      if (permission === 'granted') {
          store.dispatch('notification/showNotification', { message: 'Push notifications enabled!', type: 'success' }, { root: true });

          const currentUserId = store.state.user.uid;
          if (currentUserId && typeof OneSignal.setExternalUserId === 'function') {
              await OneSignal.setExternalUserId(currentUserId);
          } else {
               // Optionally log a warning if needed
          }

      } else if (permission === 'denied') {
           store.dispatch('notification/showNotification', { message: 'Push permission was denied. You can enable it in browser settings.', type: 'warning' }, { root: true });
      } else {
          // Prompt dismissed without granting
      }
    }
  } catch (err) {
    store.dispatch('notification/showNotification', { message: 'Failed to enable push notifications.', type: 'error' }, { root: true });
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
  store.dispatch('app/initOfflineCapabilities');
  window.addEventListener('scroll', handleScroll, { passive: true });
  if (isAuthenticated.value) {
       setTimeout(checkPushPermissionState, 1500);
  }
  try {
    store.commit('user/clearStaleCache');
  } catch (error) {
    // Optionally handle or log the error differently if needed
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

.app-navbar-brand {
  color: var(--bs-light) !important;
  white-space: nowrap;
}
.app-navbar-brand:hover {
  color: var(--bs-white) !important;
}

.navbar-dark .navbar-nav .nav-link {
    color: var(--bs-navbar-color);
    transition: color 0.2s ease-in-out;
}
.navbar-dark .navbar-nav .nav-link:hover,
.navbar-dark .navbar-nav .nav-link:focus {
    color: var(--bs-navbar-hover-color);
}
.navbar-dark .navbar-nav .nav-link.active {
  color: var(--bs-navbar-active-color) !important;
  font-weight: var(--bs-font-weight-bold);
}

@media (max-width: 991.98px) {
  .app-navbar-menu.navbar-collapse {
    background-color: var(--bs-primary);
    padding: 0.5rem 1rem;
    margin-top: 0.5rem;
    border-top: 1px solid var(--bs-border-color-translucent);
  }
  .navbar-nav {
      width: 100%;
  }
  .navbar-nav .nav-item {
      margin-bottom: 0.25rem;
  }
}

.app-main-content {
  padding-top: 72px;
  padding-bottom: 80px;
  min-height: 100vh;
  position: relative;
  z-index: 1;
  overflow-x: hidden;
}
.app-container:has(.bottom-nav) .app-main-content {
   padding-bottom: calc(64px + 1rem + env(safe-area-inset-bottom));
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