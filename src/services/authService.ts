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
