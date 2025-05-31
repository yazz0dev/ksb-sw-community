import { ref, onMounted, watch } from 'vue';
import { useProfileStore } from '@/stores/profileStore';
import { useAppStore } from '@/stores/appStore';
import { useNotifications } from '@/composables/useNotifications'; // For in-app messages
import { useAuth } from '@/composables/useAuth'; // Added

// --- OneSignal Utilities (consolidated) ---

/**
 * Safely gets the OneSignal SDK instance from the window object.
 * Ensures the OneSignal push queue array exists.
 * @returns The OneSignal SDK instance or undefined if not available.
 */
function getOneSignal(): any | undefined {
  (window as any).OneSignal = (window as any).OneSignal || [];
  return (window as any).OneSignal;
}

/**
 * Checks if the OneSignal App ID is configured in the environment variables.
 * @returns True if the App ID is configured, false otherwise.
 */
function isOneSignalConfigured(): boolean {
  return !!import.meta.env.VITE_ONESIGNAL_APP_ID;
}

/**
 * Checks if the browser supports basic push notification APIs.
 * @returns True if supported, false otherwise.
 */
function isPushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

/**
 * Initialize OneSignal with proper configuration and error handling.
 * This version is simplified for use within the composable context.
 * @param userId Optional user ID to set for OneSignal
 * @returns Promise that resolves when OneSignal is initialized
 */
async function initializeOneSignalSdk(userId?: string | null): Promise<void> {
  try {
    if (!isOneSignalConfigured() || !isPushSupported()) {
      return;
    }

    const OneSignal = getOneSignal();
    if (!OneSignal) return;

    // Await OneSignal SDK readiness (simplified from original)
    await new Promise<void>((resolve) => OneSignal.push(resolve));
    
    if (OneSignal._initCalled) { // Check if already initialized
    } else {
        await new Promise<void>((resolve, reject) => {
            OneSignal.push(() => {
                OneSignal.init({
                    appId: import.meta.env.VITE_ONESIGNAL_APP_ID,
                    notifyButton: { enable: false },
                    allowLocalhostAsSecureOrigin: true,
                })
                .then(() => {
                    OneSignal._initCalled = true; // Mark as initialized
                    resolve();
                })
                .catch((error: any) => {
                    reject(error);
                });
            });
        });
    }
    
    if (userId) {
      await new Promise<void>((resolve) => {
        OneSignal.push(() => {
          OneSignal.setExternalUserId(userId)
            .then(resolve)
            .catch((error: any) => {
              resolve(); // Continue
            });
        });
      });
    }
  } catch (error) {
  }
}


// --- Composable ---

export function usePushNotifications() {
  const studentStore = useProfileStore();
  const appStore = useAppStore();
  const { showNotification } = useNotifications();
  const auth = useAuth(); // Added

  const showPushPermissionPrompt = ref(false);
  const isOnline = ref(appStore.isOnline); // Local ref synced with store

  watch(() => appStore.isOnline, (online) => {
    isOnline.value = online;
  });

  function checkPushPermissionState() {
    if (!isOnline.value || !isOneSignalConfigured() || !isPushSupported()) {
      showPushPermissionPrompt.value = false;
      return;
    }
    const OneSignal = getOneSignal();
    if (!OneSignal || typeof OneSignal.getNotificationPermission !== 'function') {
      showPushPermissionPrompt.value = false;
      return;
    }
    OneSignal.getNotificationPermission().then((permission: string) => {
      if (auth.isAuthenticated.value && permission === 'default' && !sessionStorage.getItem('pushPromptDismissed')) {
        showPushPermissionPrompt.value = true;
      } else {
        showPushPermissionPrompt.value = false;
      }
    });
  }

  async function requestPushPermission() {
    if (!isOnline.value) {
      showNotification('Cannot enable notifications while offline.', 'warning');
      return;
    }

    showPushPermissionPrompt.value = false;
    sessionStorage.setItem('pushPromptDismissed', 'true');

    if (!isOneSignalConfigured() || !isPushSupported()) {
      showNotification('Push notifications not supported on this browser.', 'warning');
      return;
    }

    try {
      if (!studentStore.studentId) {
        showNotification('User ID not available for push notifications.', 'error');
        return;
      }
      // Initialize OneSignal SDK here, ensuring studentId is available
      await initializeOneSignalSdk(studentStore.studentId); 

      const OneSignal = getOneSignal();
      if (!OneSignal) {
        throw new Error('OneSignal not available after initialization');
      }
      
      // Ensure SDK is initialized before registering
      if (!OneSignal._initCalled) {
        await initializeOneSignalSdk(studentStore.studentId); 
        if(!OneSignal._initCalled) throw new Error('OneSignal could not be initialized.');
      }

      await OneSignal.registerForPushNotifications();

      if (typeof OneSignal.getNotificationPermission === 'function') {
        const permission = await OneSignal.getNotificationPermission();
        if (permission === 'granted') {
          showNotification('Push notifications enabled!', 'success');
        } else if (permission === 'denied') {
          showNotification('Push permission was denied. You can enable it in browser settings.', 'warning');
        }
      }
    } catch (err) {
      showNotification('Failed to enable push notifications.', 'error');
    }
  }

  function dismissPushPrompt() {
    showPushPermissionPrompt.value = false;
    sessionStorage.setItem('pushPromptDismissed', 'true');
  }

  // Watch for authentication changes to check permission state
  watch(() => auth.isAuthenticated.value, (loggedIn) => {
    if (loggedIn && isOnline.value) {
      // Delay slightly to ensure app is stable and studentId is likely set
      setTimeout(checkPushPermissionState, 2000);
    } else {
      showPushPermissionPrompt.value = false;
    }
  });

  // Watch for online status changes
   watch(isOnline, (online) => {
    if (online && auth.isAuthenticated.value) {
      setTimeout(checkPushPermissionState, 2000);
    } else {
      showPushPermissionPrompt.value = false;
    }
  });


  // Initial check on mount if authenticated and online
  onMounted(() => {
    if (auth.isAuthenticated.value && isOnline.value) {
      setTimeout(checkPushPermissionState, 2000); // Delay to ensure studentId is available
    }
  });

  return {
    showPushPermissionPrompt,
    requestPushPermission,
    dismissPushPrompt,
    checkPushPermissionState, // Expose if needed externally, though mostly internal
    initializeOneSignalSdk // Expose for potential explicit initialization elsewhere, e.g., after login
  };
}