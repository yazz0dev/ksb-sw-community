// src/utils/formatters.ts
import type { Notification } from '@/types/store';

/**
 * Formats a role key (e.g., 'xp_developer', 'problemSolver') into a user-friendly display name.
 * This is the single source of truth for role name formatting.
 *
 * @param roleKey The role key string.
 * @returns A formatted, capitalized role name (e.g., "Developer", "Problem Solver").
 */
export function formatRoleName(roleKey: string): string {
  if (!roleKey || typeof roleKey !== 'string') return 'Unknown Role';

  const cleanKey = roleKey.trim().replace(/^xp_/, '');

  switch (cleanKey.toLowerCase()) {
    case 'developer': return 'Developer';
    case 'presenter': return 'Presenter';
    case 'designer': return 'Designer';
    case 'problemsolver': return 'Problem Solver';
    case 'organizer': return 'Organizer';
    case 'participation': return 'Participant';
    case 'bestperformer': return 'Best Performer';
    case 'orgrole': return 'Organizer';
    case 'partrole': return 'Participant';
    default:
      // Handle camelCase and snake_case/kebab-case
      return cleanKey
        .replace(/([A-Z])/g, ' $1') // Add space before uppercase letters
        .replace(/[_-]/g, ' ')      // Replace underscores/hyphens with spaces
        .replace(/^./, (str) => str.toUpperCase()) // Capitalize first letter
        .trim();
  }
}

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