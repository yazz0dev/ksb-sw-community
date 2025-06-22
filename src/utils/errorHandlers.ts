import { ERROR_MESSAGES } from './constants';

/**
 * Handles Firestore errors by translating them into user-friendly messages
 * @param error The error object from Firestore (typed as unknown)
 * @returns A user-friendly error message
 */
export function handleFirestoreError(error: unknown): string {
  if (error && typeof error === 'object' && 'code' in error) {
    const firebaseError = error as { code: string; message?: string };
    if (firebaseError.code === 'permission-denied') {
      return ERROR_MESSAGES.PERMISSION_DENIED;
    }
    if (firebaseError.code === 'not-found') {
      return 'The requested document or resource was not found.';
    }
    if (firebaseError.code === 'unavailable') {
      return ERROR_MESSAGES.SERVICE_UNAVAILABLE;
    }
    if (typeof firebaseError.message === 'string') {
      return firebaseError.message;
    }
  } else if (error instanceof Error && typeof error.message === 'string') {
    return error.message;
  }
  return 'An unknown error occurred.';
}

/**
 * Handles authentication errors by translating them into user-friendly messages
 * @param error The error object from Firebase Auth (typed as unknown)
 * @returns A user-friendly error message
 */
export function handleAuthError(error: unknown): string {
  if (error && typeof error === 'object' && 'code' in error) {
    const firebaseError = error as { code: string; message?: string };
    switch (firebaseError.code) {
      case 'auth/user-not-found':
        return 'No user found with this email address.';
    case 'auth/wrong-password':
      return 'Incorrect password. Please try again.';
    case 'auth/invalid-email':
      return 'The email address is not valid.';
    case 'auth/user-disabled':
      return 'This account has been disabled. Please contact support.';
    case 'auth/email-already-in-use':
      return 'This email is already in use by another account.';
    case 'auth/weak-password':
      return 'The password is too weak. Please use a stronger password.';
    case 'auth/operation-not-allowed':
      return 'This operation is not allowed.';
    case 'auth/too-many-requests':
      return 'Too many unsuccessful login attempts. Please try again later.';
    default:
      if (typeof firebaseError.message === 'string') {
        return firebaseError.message;
      }
      return 'An authentication error occurred. Please try again.';
    }
  } else if (error instanceof Error && typeof error.message === 'string') {
    return error.message;
  }
  return 'An authentication error occurred. Please try again.';
}
