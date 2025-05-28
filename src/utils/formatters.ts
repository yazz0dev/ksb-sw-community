// src/utils/formatters.ts
import type { Notification } from '@/types/store';

export type RoleKey = string;
export type FormattedRoleName = string;

// Helper to format role keys/names for display
export const formatRoleName = (roleKeyOrName: RoleKey): FormattedRoleName => {
    if (!roleKeyOrName) return '';
    
    const name: string = roleKeyOrName
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, (str) => str.toUpperCase());
    
    // Special cases for display
    switch (name) {
        case 'Xp By Role':
            return 'Overall';
        case 'Problem Solver':
            return 'Problem Solver';
        case 'Org Role':
            return 'Organizer';
        case 'Part Role':
            return 'Participant';
        default:
            return name;
    }
};

// Add other shared formatting functions here in the future

/**
 * Format notification data for display
 * @param message Notification message
 * @param type Notification type
 * @param options Additional notification options
 * @returns Formatted notification object
 */
export const formatNotification = (
  message: string, 
  type: 'success' | 'error' | 'info' | 'warning' = 'info',
  options: Partial<Omit<Notification, 'id' | 'type' | 'message' | 'createdAt'>> = {}
): Notification => {
  return {
    id: `notification-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    type,
    message,
    createdAt: Date.now(),
    ...options
  };
};