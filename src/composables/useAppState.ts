import { ref, computed } from 'vue';
import { useAppStore } from '@/stores/appStore';

export function useAppState() {
  const appStore = useAppStore();

  // Reactive computed properties that directly reflect the store's state.
  const isOnline = computed(() => appStore.isOnline);
  const currentTheme = computed(() => appStore.currentTheme);
  const newVersionAvailable = computed(() => appStore.newAppVersionAvailable);

  /**
   * Initializes app-wide listeners and state from the store.
   */
  const initAppState = (): void => {
    appStore.initAppListeners();
  };

  /**
   * Sets the theme by calling the appStore action.
   * The store is now the single source of truth for this logic.
   * @param theme The theme to set ('light' or 'dark').
   */
  const setTheme = (theme: 'light' | 'dark'): void => {
    appStore.setTheme(theme);
  };

  /**
   * Sets the new version available flag via the appStore.
   * @param status The new status.
   */
  const setNewVersionAvailable = (status: boolean): void => {
    appStore.setNewAppVersionAvailable(status);
  };

  /**
   * Reloads the application to apply a new service worker version.
   */
  const reloadApp = (): void => {
    if (!isOnline.value) return;
    appStore.setNewAppVersionAvailable(false);
    
    // Use the globally exposed PWA update function if available.
    if (window.__updateSW) {
      window.__updateSW(true);
    } else {
      window.location.reload();
    }
  };

  return {
    isOnline,
    currentTheme,
    newVersionAvailable,
    initAppState,
    setTheme,
    setNewVersionAvailable,
    reloadApp,
  };
}