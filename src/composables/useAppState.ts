import { ref } from 'vue';
import { useAppStore } from '@/stores/appStore';

export function useAppState() {
  const appStore = useAppStore();
  const isOnline = ref(navigator.onLine);
  const currentTheme = ref<'light' | 'dark'>(appStore.currentTheme || 'light');
  const newVersionAvailable = ref(appStore.newAppVersionAvailable);

  /**
   * Initialize the app state
   */
  const initAppState = (): void => {
    appStore.initAppListeners();
    setNetworkStatus(navigator.onLine);
    initTheme();
  };

  /**
   * Set the network status
   * @param status Network status
   */
  const setNetworkStatus = (status: boolean): void => {
    isOnline.value = status;
    appStore.setNetworkOnlineStatus(status);
  };

  /**
   * Initialize the theme
   */
  const initTheme = (): void => {
    const storedTheme = localStorage.getItem('student-app-theme') as 'light' | 'dark' | null;
    
    if (storedTheme) {
      setTheme(storedTheme);
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setTheme('dark');
    } else {
      setTheme('light');
    }
  };

  /**
   * Set the theme
   * @param theme Theme
   */
  const setTheme = (theme: 'light' | 'dark'): void => {
    currentTheme.value = theme;
    appStore.setTheme(theme);
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('student-app-theme', theme);
  };

  /**
   * Set the new version available flag
   * @param status New version available status
   */
  const setNewVersionAvailable = (status: boolean): void => {
    newVersionAvailable.value = status;
    appStore.setNewAppVersionAvailable(status);
  };

  /**
   * Reload the app
   */
  const reloadApp = (): void => {
    if (!isOnline.value) return;
    appStore.setNewAppVersionAvailable(false);
    window.location.reload();
  };

  return {
    isOnline,
    currentTheme,
    newVersionAvailable,
    initAppState,
    setNetworkStatus,
    setTheme,
    setNewVersionAvailable,
    reloadApp
  };
}
