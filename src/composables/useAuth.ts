import { computed, ref } from 'vue';
import { signOut } from 'firebase/auth';
import { useProfileStore } from '@/stores/profileStore';
import { useAppStore } from '@/stores/appStore';
import { auth as firebaseAuthInstance } from '@/firebase'; // Added import for auth

export function useAuth() {
  const profileStore = useProfileStore();
  const appStore = useAppStore();

  // The single source of truth is the profileStore.
  const isAuthenticated = computed(() => profileStore.isAuthenticated); // Added
  const authUser = computed(() => profileStore.currentStudent); // Fixed: use currentStudent instead of user

  // Provides direct access to the current Firebase user object from the store's perspective.
  // Note: This might be null even if Firebase auth is signed in, before the profile is fetched.

  const isInitialized = computed(() => appStore.hasFetchedInitialAuth);
  const authActionError = ref<Error | null>(null);

  const logout = async () => {
    authActionError.value = null;
    try {
      await signOut(firebaseAuthInstance);
    } catch (error) {
      authActionError.value = error as Error;
      console.error("Logout failed:", error); // Optional: for debugging
    }
  };
      
  // The global onAuthStateChanged listener in main.ts manages state changes centrally via the profileStore.

  return {
    isAuthenticated,
    authUser,
    authActionError, 
    isInitialized,
    logout,
  };
}
