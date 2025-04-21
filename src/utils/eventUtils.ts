import { EventStatus } from '@/types/event';

/**
 * Returns the Bootstrap badge class for a given event status.
 */
export function getEventStatusBadgeClass(status: EventStatus | string | undefined): string {
  switch (status) {
    case EventStatus.Approved:
      return 'bg-success-subtle text-success-emphasis';
    case EventStatus.Pending:
      return 'bg-warning-subtle text-warning-emphasis';
    case EventStatus.InProgress:
      return 'bg-info-subtle text-info-emphasis';
    case EventStatus.Rejected:
      return 'bg-danger-subtle text-danger-emphasis';
    case EventStatus.Completed:
      return 'bg-dark text-white';
    case EventStatus.Cancelled:
      return 'bg-secondary-subtle text-secondary-emphasis';
    case EventStatus.Closed:
      return 'bg-dark text-white';
    default:
      return 'bg-secondary-subtle text-secondary-emphasis';
  }
}
