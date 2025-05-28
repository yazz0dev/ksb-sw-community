import { ref, computed } from 'vue';
import { 
  signInWithEmailAndPassword, 
  signOut, 
  setPersistence, 
  browserLocalPersistence,
  onAuthStateChanged,
  type User as FirebaseUser
} from 'firebase/auth';
import { auth } from '@/firebase';
import { useProfileStore } from '@/stores/profileStore';
import { useNotificationStore } from '@/stores/notificationStore';

export function useAuth() {
  const currentUser = ref<FirebaseUser | null>(null);
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const isAuthenticated = computed(() => !!currentUser.value);
  
  const profileStore = useProfileStore();
  const notificationStore = useNotificationStore();

  /**
   * Set persistent authentication mode
   */
  const setAuthPersistence = async (): Promise<void> => {
    try {
      await setPersistence(auth, browserLocalPersistence);
    } catch (err) {
      console.error('Error setting auth persistence:', err);
      throw err;
    }
  };

  /**
   * Sign in with email and password
   * @param email User's email
   * @param password User's password
   * @returns Promise that resolves with the user credentials
   */
  const login = async (email: string, password: string) => {
    isLoading.value = true;
    error.value = null;
    
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      currentUser.value = userCredential.user;
      return userCredential;
    } catch (err: any) {
      error.value = err.message || 'Failed to sign in';
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * Sign out the current user
   */
  const logout = async (): Promise<void> => {
    isLoading.value = true;
    error.value = null;
    
    try {
      await signOut(auth);
      currentUser.value = null;
      await profileStore.clearStudentSession(false);
      notificationStore.showNotification({ message: "You have been logged out.", type: 'success' });
    } catch (err: any) {
      error.value = err.message || 'Failed to sign out';
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * Set up an auth state change listener
   * @param callback Function to call when auth state changes
   * @returns Unsubscribe function
   */
  const setupAuthStateListener = (
    callback: (user: FirebaseUser | null) => void
  ): (() => void) => {
    return onAuthStateChanged(auth, (user) => {
      currentUser.value = user;
      callback(user);
    });
  };

  /**
   * Get the current auth user
   * @returns The current user or null if not authenticated
   */
  const getCurrentUser = (): FirebaseUser | null => {
    return auth.currentUser;
  };

  return {
    currentUser,
    isLoading,
    error,
    isAuthenticated,
    login,
    logout,
    setAuthPersistence,
    setupAuthStateListener,
    getCurrentUser
  };
}
