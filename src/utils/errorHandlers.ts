import { ERROR_MESSAGES } from './constants';

/**
 * Handles Firestore errors by translating them into user-friendly messages
 * @param error The error object from Firestore (typed as unknown)
 * @returns A user-friendly error message
 */
export function handleFirestoreError(error: unknown, operation?: string): string {
  let baseMessage;
  if (error && typeof error === 'object' && 'code' in error) {
    const firebaseError = error as { code: string; message?: string };
    if (firebaseError.code === 'permission-denied') {
      baseMessage = ERROR_MESSAGES.PERMISSION_DENIED;
    } else if (firebaseError.code === 'not-found') {
      baseMessage = 'The requested document or resource was not found.';
    } else if (firebaseError.code === 'unavailable') {
      baseMessage = ERROR_MESSAGES.SERVICE_UNAVAILABLE;
    } else if (typeof firebaseError.message === 'string') {
      baseMessage = firebaseError.message;
    } else {
      baseMessage = 'An unknown Firebase error occurred';
    }
  } else if (error instanceof Error && typeof error.message === 'string') {
    baseMessage = error.message;
  } else {
    baseMessage = 'An unknown error occurred.';
  }

  return operation ? `Error during ${operation}: ${baseMessage}` : baseMessage;
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
