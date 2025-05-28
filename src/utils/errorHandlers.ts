/**
 * Handles Firestore errors by translating them into user-friendly messages
 * @param error The error object from Firestore
 * @returns A user-friendly error message
 */
export function handleFirestoreError(error: any): string {
  if (error?.code === 'permission-denied') {
    return 'Permission denied. You might not have access to this resource.';
  }
  
  if (error?.code === 'not-found') {
    return 'The requested document or resource was not found.';
  }
  
  if (error?.code === 'unavailable') {
    return 'The service is currently unavailable. Please try again later.';
  }
  
  if (typeof error?.message === 'string') {
    return error.message;
  }
  
  return 'An unknown error occurred.';
}

/**
 * Handles authentication errors by translating them into user-friendly messages
 * @param error The error object from Firebase Auth
 * @returns A user-friendly error message
 */
export function handleAuthError(error: any): string {
  switch (error?.code) {
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
      if (typeof error?.message === 'string') {
        return error.message;
      }
      return 'An authentication error occurred. Please try again.';
  }
}
