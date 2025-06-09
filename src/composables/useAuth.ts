import { computed, ref, onMounted, onUnmounted, getCurrentInstance } from 'vue';
import { signOut, type User } from 'firebase/auth';
import { auth as firebaseAuthInstance } from '@/firebase';
import { useProfileStore } from '@/stores/profileStore';
import { useAppStore } from '@/stores/appStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { useRouter } from 'vue-router';

export function useAuth() {
  const profileStore = useProfileStore();
  const appStore = useAppStore();
  const notificationStore = useNotificationStore();
  const router = useRouter();

  // The single source of truth is the profileStore.
  const isAuthenticated = computed(() => profileStore.isAuthenticated);
  
  // Provides direct access to the current Firebase user object from the store's perspective.
  // Note: This might be null even if Firebase auth is signed in, before the profile is fetched.
  const authUser = computed(() => profileStore.currentStudent ? firebaseAuthInstance.currentUser : null); 

  const isInitialized = computed(() => appStore.hasFetchedInitialAuth);
  const authActionError = ref<Error | null>(null);

  const logout = async () => {
    authActionError.value = null;
    try {
      await signOut(firebaseAuthInstance);
      
      // The global onAuthStateChanged listener in main.ts handles all session clearing.
      
      notificationStore.showNotification({
        type: 'success',
        message: 'You have been successfully signed out.'
      });
      
      // Navigate to landing or login page
      router.push({ name: 'Landing' }).catch(err => console.error("Router push error after logout:", err));
    } catch (error) {
      console.error('Error during logout:', error);
      authActionError.value = error instanceof Error ? error : new Error(String(error));
      notificationStore.showNotification({
        type: 'error',
        message: 'Error signing out. Please try again.'
      });
    }
  };

  // This function is less critical now, but can be kept for debugging.
  const refreshAuthState = () => {
    // This action should be done via the store now, e.g., by re-calling `handleAuthStateChange`
    // For now, it just triggers a re-fetch in the store.
    if (firebaseAuthInstance.currentUser) {
      profileStore.handleAuthStateChange(firebaseAuthInstance.currentUser);
    }
    return firebaseAuthInstance.currentUser;
  };

  // The local onAuthStateChanged listener has been removed to prevent race conditions.
  // All auth state is now managed centrally via the listener in main.ts and the profileStore.

  return {
    isAuthenticated,
    authUser,
    authActionError, 
    isInitialized,
    logout,
    refreshAuthState,
    // The local currentUser ref is removed, authUser should be used instead.
  };
}
