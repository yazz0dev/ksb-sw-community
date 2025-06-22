import { 
  signInWithEmailAndPassword,
  setPersistence,
  browserLocalPersistence,
  signOut,
  sendPasswordResetEmail,
  verifyPasswordResetCode,
  confirmPasswordReset
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
  } catch (error: unknown) { // Explicitly type error
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
  } catch (error: unknown) { // Changed from any
    console.error('Sign in error:', error);
    throw error;
  }
};

/**
 * Sign out the current user
 * @returns Promise that resolves when sign out is complete
 */
export const signOutAuth = async () => {
  try {
    return await signOut(auth);
  } catch (error: unknown) { // Changed from any
    console.error('Sign out error:', error);
    throw error;
  }
};

/**
 * Send a password reset email
 * @param email User's email
 * @returns Promise that resolves when the email is sent
 */
export const sendPasswordResetEmailAuth = async (email: string) => {
  try {
    return await sendPasswordResetEmail(auth, email);
  } catch (error: unknown) { // Changed from any
    console.error('Password reset email error:', error);
    throw error;
  }
};

/**
 * Verify a password reset code
 * @param code Password reset code from the email link
 * @returns Promise that resolves with the user's email if the code is valid
 */
export const verifyPasswordResetCodeAuth = async (code: string) => {
  try {
    return await verifyPasswordResetCode(auth, code);
  } catch (error: unknown) { // Changed from any
    console.error('Verify password reset code error:', error);
    throw error;
  }
};

/**
 * Confirm a password reset
 * @param code Password reset code
 * @param newPassword New password
 * @returns Promise that resolves when the password is reset
 */
export const confirmPasswordResetAuth = async (code: string, newPassword: string) => {
  try {
    return await confirmPasswordReset(auth, code, newPassword);
  } catch (error: unknown) { // Changed from any
    console.error('Confirm password reset error:', error);
    throw error;
  }
};
