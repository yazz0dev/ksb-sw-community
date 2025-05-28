// src/stores/appStore.ts
import { defineStore } from 'pinia';
import { ref, computed, watch } from 'vue';
import { db } from '@/firebase'; // For Firestore network toggle
import { enableNetwork, disableNetwork } from 'firebase/firestore';
import { useNotificationStore } from './notificationStore';
// Import studentEventStore for replaying actions.
// This creates a slight circular dependency if studentEventStore also imports studentAppStore
// for offline handling. This is usually manageable in Pinia.
// Alternatively, pass the event store instance to syncOfflineChanges if needed.
import { useEventStore } from './eventStore';


// --- Types for Offline Queue ---
interface QueuedStudentAction {
  id: string;
  type: string; // e.g., 'events/submitSelections', 'events/submitProject'
  payload: any;
  timestamp: number;
  retries?: number;
  error?: string;
}

// --- Store Definition ---
export const useAppStore = defineStore('studentApp', () => {
  // --- State ---
  const currentTheme = ref<'light' | 'dark'>('light');
  const isOnline = ref<boolean>(navigator.onLine);
  const hasFetchedInitialAuth = ref<boolean>(false);
  const newAppVersionAvailable = ref<boolean>(false);
  const lastOnlineTime = ref<number>(Date.now());
  const isFirestoreEnabled = ref<boolean>(true);

  const offlineQueue = ref<{
    actions: QueuedStudentAction[];
    isSyncing: boolean;
    supportedActionTypes: string[]; // Student actions that can be queued
  }>({
    actions: [],
    isSyncing: false,
    supportedActionTypes: [
      'studentEvents/submitEventSelections', // Example action type
      'studentEvents/submitProject',
      'studentEvents/submitOrganizerRating',
      'studentEvents/joinEvent', // If you want to queue joining
      'studentEvents/leaveEvent', // If you want to queue leaving
      // Add other student actions here
    ],
  });

  const notificationStore = useNotificationStore();

  // --- Getters ---
  const getTheme = computed(() => currentTheme.value);
  const getNetworkStatus = computed(() => isOnline.value);
  const getHasFetchedInitialAuth = computed(() => hasFetchedInitialAuth.value);
  const getNewAppVersionAvailable = computed(() => newAppVersionAvailable.value);
  const getLastOnlineTime = computed(() => lastOnlineTime.value);
  const hasPendingOfflineActions = computed(() => offlineQueue.value.actions.length > 0);
  const pendingActionCount = computed(() => offlineQueue.value.actions.length);

  // --- Actions ---
  function setTheme(theme: 'light' | 'dark') {
    currentTheme.value = theme;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('student-app-theme', theme);
  }

  function initTheme() {
    const storedTheme = localStorage.getItem('student-app-theme') as 'light' | 'dark' | null;
    if (storedTheme) {
      setTheme(storedTheme);
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setTheme('dark');
    } else {
      setTheme('light');
    }
    
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
      if (!localStorage.getItem('student-app-theme')) {
        setTheme(e.matches ? 'dark' : 'light');
      }
    });
  }

  watch(currentTheme, (newTheme) => {
    localStorage.setItem('student-app-theme', newTheme);
  });

  async function setNetworkOnlineStatus(status: boolean) {
    if (isOnline.value !== status) {
      isOnline.value = status;
      
      if (status) {
        lastOnlineTime.value = Date.now();
        if (!isFirestoreEnabled.value) {
          try {
            await enableNetwork(db);
            isFirestoreEnabled.value = true;
            notificationStore.showNotification({
              message: 'You are back online! Syncing data...',
              type: 'success',
              duration: 3000
            });
            // Trigger data refresh in relevant stores
            const eventStore = useEventStore();
            await eventStore.fetchEvents();
          } catch (e) {
            console.error("Error enabling Firestore network:", e);
          }
        }
      } else {
        try {
          await disableNetwork(db);
          isFirestoreEnabled.value = false;
          notificationStore.showNotification({
            message: 'You are offline. Some features will be limited.',
            type: 'warning',
            duration: 5000
          });
        } catch (e) {
          console.error("Error disabling Firestore network:", e);
        }
      }

      // Save offline status to localStorage for persistence
      localStorage.setItem('lastOnlineTime', lastOnlineTime.value.toString());
      localStorage.setItem('isOnline', status.toString());
    }
  }

  function setHasFetchedInitialAuth(status: boolean) {
    hasFetchedInitialAuth.value = status;
  }

  function setNewAppVersionAvailable(status: boolean) {
    newAppVersionAvailable.value = status;
  }

  // --- Offline Queue Management ---
  /**
   * Tries to execute an action or queues it if offline.
   * @param action - The action to perform ({ type, payload }).
   * @returns Promise<boolean> - True if queued, false if executed immediately or failed to queue.
   */
  async function tryQueueAction(action: { type: string; payload: any }): Promise<boolean> {
    if (isOnline.value) {
      return false; // Not queued, execute immediately
    }

    if (offlineQueue.value.supportedActionTypes.includes(action.type)) {
      const newQueuedAction: QueuedStudentAction = {
        id: `queued_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        type: action.type,
        payload: action.payload,
        timestamp: Date.now(),
      };
      offlineQueue.value.actions.push(newQueuedAction);
      notificationStore.showNotification({
        message: `Action '${action.type.split('/')[1] || 'Task'}' queued. Will sync when online.`,
        type: 'info',
        duration: 3000
      });
      return true; // Queued
    } else {
      notificationStore.showNotification({
        message: `Action '${action.type.split('/')[1] || 'Task'}' cannot be performed offline.`,
        type: 'warning'
      });
      return false; // Not supported for offline
    }
  }

  async function syncOfflineActions() {
    if (!isOnline.value || offlineQueue.value.isSyncing || !hasPendingOfflineActions.value) {
      return;
    }

    offlineQueue.value.isSyncing = true;
    notificationStore.showNotification({
      message: `Syncing ${pendingActionCount.value} offline action(s)...`,
      type: 'info',
      duration: 2000
    });

    const studentEventStore = useEventStore(); // Get event store instance

    const actionsToProcess = [...offlineQueue.value.actions];
    let successCount = 0;
    const failedActions: QueuedStudentAction[] = [];

    for (const action of actionsToProcess) {
      try {
        const [storeName, actionName] = action.type.split('/');
        let storeInstance: any;

        // Map storeName to actual store instance
        if (storeName === 'studentEvents') {
          storeInstance = studentEventStore;
        }
        // Add other stores here if they have offline-queued actions
        // else if (storeName === 'anotherStore') { storeInstance = useAnotherStore(); }

        if (storeInstance && typeof storeInstance[actionName] === 'function') {
          await storeInstance[actionName](action.payload); // Replay the action
          // Remove from queue on success
          offlineQueue.value.actions = offlineQueue.value.actions.filter(a => a.id !== action.id);
          successCount++;
        } else {
          throw new Error(`Action ${action.type} not found or store not recognized.`);
        }
      } catch (err: any) {
        console.error(`Failed to sync action ${action.type} (ID: ${action.id}):`, err);
        action.error = err.message || "Unknown sync error";
        action.retries = (action.retries || 0) + 1;
        failedActions.push(action);
        // Remove from main queue, will be in failedActions (or retry logic can be added)
        offlineQueue.value.actions = offlineQueue.value.actions.filter(a => a.id !== action.id);
      }
    }

    offlineQueue.value.isSyncing = false;

    if (failedActions.length > 0) {
      // Handle failed actions - e.g., notify user, offer retry, or store them persistently
      notificationStore.showNotification({
        message: `${failedActions.length} action(s) failed to sync. Some changes may not be saved.`,
        type: 'error',
        duration: 7000
      });
       // For simplicity, we are just logging them here.
       console.error("Failed to sync actions:", failedActions);
       // You might want to re-queue them or provide UI to retry.
    } else if (successCount > 0) {
      notificationStore.showNotification({
        message: `Offline actions synced successfully (${successCount} processed).`,
        type: 'success'
      });
    } else if (actionsToProcess.length > 0 && successCount === 0 && failedActions.length === 0) {
        // This case should ideally not happen if actions were processed
        console.warn("Sync process completed, but no actions were marked as success or failure.");
    }
  }

  function initAppListeners() {
    // Network status listeners
    window.addEventListener('online', () => setNetworkOnlineStatus(true));
    window.addEventListener('offline', () => setNetworkOnlineStatus(false));

    // Initialize network status
    setNetworkOnlineStatus(navigator.onLine);

    // Initialize theme
    initTheme();

    // Service worker registration for PWA
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!newAppVersionAvailable.value) {
          newAppVersionAvailable.value = true;
        }
      });
    }

    // Restore last online time from localStorage
    const savedLastOnlineTime = localStorage.getItem('lastOnlineTime');
    if (savedLastOnlineTime) {
      lastOnlineTime.value = parseInt(savedLastOnlineTime, 10);
    }

    // Handle page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        setNetworkOnlineStatus(navigator.onLine);
      }
    });

    // Handle beforeunload to save state
    window.addEventListener('beforeunload', () => {
      localStorage.setItem('lastOnlineTime', lastOnlineTime.value.toString());
      localStorage.setItem('isOnline', isOnline.value.toString());
    });
  }

  return {
    currentTheme,
    isOnline,
    hasFetchedInitialAuth,
    newAppVersionAvailable,
    lastOnlineTime,
    offlineQueue,
    getTheme,
    getNetworkStatus,
    getHasFetchedInitialAuth,
    getNewAppVersionAvailable,
    getLastOnlineTime,
    hasPendingOfflineActions,
    pendingActionCount,
    setTheme,
    initTheme,
    setNetworkOnlineStatus,
    setHasFetchedInitialAuth,
    setNewAppVersionAvailable,
    tryQueueAction,
    syncOfflineActions,
    initAppListeners,
  };
});