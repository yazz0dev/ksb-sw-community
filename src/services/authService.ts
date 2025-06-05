import { 
  signInWithEmailAndPassword, 
  signOut, 
  setPersistence, 
  browserLocalPersistence,
  onAuthStateChanged,
  type User as FirebaseUser
} from 'firebase/auth';
import { auth } from '@/firebase';

/**
 * Initialize the auth service with persistent authentication
 * This should be called as early as possible in the app lifecycle
 */
export const initializeAuth = async (): Promise<void> => {
  try {
    // Set persistent authentication to ensure user stays logged in across refreshes
    await setPersistence(auth, browserLocalPersistence);
    console.log('Auth persistence initialized with browserLocalPersistence');
  } catch (error) {
    console.error('Error initializing auth persistence:', error);
  }
};

/**
 * Set persistent authentication mode
 */
export const setAuthPersistence = async (): Promise<void> => {
  try {
    await setPersistence(auth, browserLocalPersistence);
  } catch (error) {
    console.error('Error setting auth persistence:', error);
    throw error;
  }
};

/**
 * Sign in with email and password
 * @param email User's email
 * @param password User's password
 * @returns Promise that resolves with the user credentials
 */
export const signInWithEmail = async (email: string, password: string) => {
  try {
    return await signInWithEmailAndPassword(auth, email, password);
  } catch (error: any) {
    console.error('Sign in error:', error);
    throw error;
  }
};

/**
 * Sign out the current user
 * @returns Promise that resolves when sign out is complete
 */
export const signOutUser = async (): Promise<void> => {
  try {
    return await signOut(auth);
  } catch (error) {
    console.error('Sign out error:', error);
    throw error;
  }
};

/**
 * Set up an auth state change listener
 * @param callback Function to call when auth state changes
 * @returns Unsubscribe function
 */
export const setupAuthStateListener = (
  callback: (user: FirebaseUser | null) => void
): (() => void) => {
  return onAuthStateChanged(auth, callback);
};

/**
 * Get the current auth user
 * @returns The current user or null if not authenticated
 */
export const getCurrentUser = (): FirebaseUser | null => {
  return auth.currentUser;
};
