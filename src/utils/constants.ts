// Common constants used throughout the application

// --- Firestore Collection Names ---
export const EVENTS_COLLECTION = 'events';
export const STUDENTS_COLLECTION = 'students';
export const XP_COLLECTION = 'xp';

// --- Event Criteria Constants ---
export const BEST_PERFORMER_LABEL = 'Best Performer';
export const BEST_PERFORMER_POINTS = 10;
export const MAX_USER_CRITERIA = 5;
export const MAX_TOTAL_XP = 50; // Maximum XP that can be allocated across criteria

// --- Permission Constants ---
export const EVENT_MANAGER_ROLES = [  'eventManager', 'moderator'] as const;

// --- Error Message Constants ---
export const ERROR_MESSAGES = {
    PERMISSION_DENIED: 'Permission denied. You do not have access to perform this action.',
    AUTHENTICATION_REQUIRED: 'Authentication required. Please sign in to continue.',
    EVENT_NOT_FOUND: 'Event not found. It may have been deleted or you do not have access.',
    SERVICE_UNAVAILABLE: 'Service temporarily unavailable. Please try again later.',
    NETWORK_ERROR: 'Network error. Please check your connection and try again.',
};

// --- Other Constants ---
// Add other constants here as needed
