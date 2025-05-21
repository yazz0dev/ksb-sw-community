// src/store/studentAppStore.ts
import { defineStore } from 'pinia';
import { ref, computed, watch } from 'vue';
import { db } from '@/firebase'; // For Firestore network toggle
import { enableNetwork, disableNetwork } from 'firebase/firestore';
import { useStudentNotificationStore } from './studentNotificationStore';
// Import studentEventStore for replaying actions.
// This creates a slight circular dependency if studentEventStore also imports studentAppStore
// for offline handling. This is usually manageable in Pinia.
// Alternatively, pass the event store instance to syncOfflineChanges if needed.
import { useStudentEventStore } from './studentEventStore';


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
export const useStudentAppStore = defineStore('studentApp', () => {
  // --- State ---
  const currentTheme = ref<'light' | 'dark'>('light');
  const isOnline = ref<boolean>(navigator.onLine);
  const hasFetchedInitialAuth = ref<boolean>(false); // Tracks if initial onAuthStateChanged has run
  const newAppVersionAvailable = ref<boolean>(false); // For PWA updates

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

  const notificationStore = useStudentNotificationStore();

  // --- Getters ---
  const getTheme = computed(() => currentTheme.value);
  const getNetworkStatus = computed(() => isOnline.value);
  const getHasFetchedInitialAuth = computed(() => hasFetchedInitialAuth.value);
  const getNewAppVersionAvailable = computed(() => newAppVersionAvailable.value);
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
    // Listen for system theme changes if no explicit theme is set by user
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
        if (!localStorage.getItem('student-app-theme')) { // Only if user hasn't set a preference
            setTheme(e.matches ? 'dark' : 'light');
        }
    });
  }
  watch(currentTheme, (newTheme) => { // Persist theme changes
      localStorage.setItem('student-app-theme', newTheme);
  });


  function setNetworkOnlineStatus(status: boolean) {
    if (isOnline.value !== status) {
      isOnline.value = status;
      console.log(`Student App Network Status: ${status ? 'Online' : 'Offline'}`);
      // Toggle Firestore network
      try {
        status ? enableNetwork(db) : disableNetwork(db);
        if (status && hasPendingOfflineActions.value) {
          syncOfflineActions(); // Attempt sync when coming online
        }
      } catch (e) {
        console.error("Error toggling Firestore network:", e);
      }
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

    const studentEventStore = useStudentEventStore(); // Get event store instance

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

  // This would be called from main.ts or App.vue
  function initAppListeners() {
    initTheme();
    window.addEventListener('online', () => setNetworkOnlineStatus(true));
    window.addEventListener('offline', () => setNetworkOnlineStatus(false));
    // Service worker update listener also belongs here or in main.ts
  }


  return {
    currentTheme,
    isOnline,
    hasFetchedInitialAuth,
    newAppVersionAvailable,
    offlineQueue, // Expose the reactive object for more detailed UI if needed
    getTheme,
    getNetworkStatus,
    getHasFetchedInitialAuth,
    getNewAppVersionAvailable,
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