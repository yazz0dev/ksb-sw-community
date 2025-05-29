import { computed, ref } from 'vue';
import { getAuth, signOut, User } from 'firebase/auth';
import { useProfileStore } from '@/stores/profileStore';
import { useAppStore } from '@/stores/appStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { useRouter } from 'vue-router';

export function useAuth() {
  const firebaseAuthInstance = getAuth(); // Renamed to avoid conflict if 'auth' is used as a variable name elsewhere
  const profileStore = useProfileStore();
  const appStore = useAppStore();
  const notificationStore = useNotificationStore();
  const router = useRouter();

  const isAuthenticated = computed(() => profileStore.isAuthenticated);
  // Provides direct access to the current Firebase user object
  const authUser = computed(() => firebaseAuthInstance.currentUser as User | null); 
  const isInitialized = computed(() => appStore.hasFetchedInitialAuth);
  // This error ref is for errors originating from actions within this composable (e.g., logout)
  const authActionError = ref<Error | null>(null);

  const logout = async () => {
    authActionError.value = null; // Clear previous action error
    try {
      await signOut(firebaseAuthInstance);
      // The global onAuthStateChanged listener in main.ts handles profileStore.clearStudentSession
      
      notificationStore.showNotification({
        type: 'success',
        message: 'You have been successfully signed out.'
      });
      
      // It's common to redirect after logout.
      // Ensure the route 'Login' or 'Landing' exists and is appropriate.
      router.push({ name: 'Login' }).catch(err => console.error("Router push error after logout:", err));
    } catch (error) {
      console.error('Error during logout:', error);
      authActionError.value = error instanceof Error ? error : new Error(String(error));
      notificationStore.showNotification({
        type: 'error',
        message: 'Error signing out. Please try again.'
      });
    }
  };

  // This function can be used to manually re-check Firebase's current user.
  // The global listener in main.ts is the primary mechanism for state sync.
  const refreshAuthState = async () => {
    // The stores should be up-to-date via the global listener in main.ts.
    // This function primarily serves to return the current user from Firebase.
    return firebaseAuthInstance.currentUser;
  };

  return {
    isAuthenticated,
    authUser,
    authActionError, 
    isInitialized,
    logout,
    refreshAuthState
  };
}
