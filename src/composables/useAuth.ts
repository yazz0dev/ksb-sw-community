import { computed, ref } from 'vue'; // Remove onMounted
import { getAuth, signOut, type User } from 'firebase/auth';
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

  // Create a local ref for the auth state to avoid store dependency cycles
  const currentUser = ref<User | null>(firebaseAuthInstance.currentUser);

  const isAuthenticated = computed(() => {
    // First check Firebase auth directly
    if (currentUser.value) return true;
    // Then check the profile store as a backup
    return profileStore.isAuthenticated;
  });
  
  // Provides direct access to the current Firebase user object
  const authUser = computed(() => currentUser.value); 
  const isInitialized = computed(() => appStore.hasFetchedInitialAuth);
  // This error ref is for errors originating from actions within this composable (e.g., logout)
  const authActionError = ref<Error | null>(null);

  const logout = async () => {
    authActionError.value = null; // Clear previous action error
    try {
      await signOut(firebaseAuthInstance);
      currentUser.value = null;
      
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
  const refreshAuthState = async () => {
    currentUser.value = firebaseAuthInstance.currentUser;
    return currentUser.value;
  };

  return {
    isAuthenticated,
    authUser,
    authActionError, 
    isInitialized,
    logout,
    refreshAuthState,
    currentUser
  };
}
