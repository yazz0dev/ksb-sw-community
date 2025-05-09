import { DateTime } from 'luxon';
import { Timestamp } from 'firebase/firestore';

/**
 * Type for acceptable date inputs
 */
export type DateInput = Date | Timestamp | string | null | undefined;

/**
 * Converts various date formats to IST DateTime
 * @param date Date input (Date, Timestamp, ISO string)
 * @returns DateTime object in Asia/Kolkata timezone or null if invalid
 */
export function convertToISTDateTime(date: DateInput): DateTime | null {
  if (!date) return null;
  
  let dt: DateTime;
  if (date instanceof Timestamp) {
    dt = DateTime.fromJSDate(date.toDate());
  } else if (date instanceof Date) {
    dt = DateTime.fromJSDate(date);
  } else if (typeof date === 'string') {
    dt = DateTime.fromISO(date);
  } else {
    return null;
  }
  
  return dt.isValid ? dt.setZone('Asia/Kolkata') : null;
}

/**
 * Formats a date to IST date string
 * @param date Date input
 * @param format Optional format string (default: 'ccc, dd LLL yyyy')
 * @returns Formatted date string or empty string if invalid
 */
export function formatISTDate(date: DateInput, format: string = 'ccc, dd LLL yyyy'): string {
  const dt = convertToISTDateTime(date);
  return dt?.toFormat(format) || '';
}

/**
 * Checks if the current date is within the given event date range
 * @param startDate The event start date
 * @param endDate The event end date
 * @returns boolean True if current date is within range
 */
export function isDateWithinEventRange(startDate: DateInput, endDate: DateInput): boolean {
  try {
    // Convert both dates to IST DateTime objects
    const nowIST = DateTime.now().setZone('Asia/Kolkata').startOf('day');
    const startIST = convertToISTDateTime(startDate)?.startOf('day');
    const endIST = convertToISTDateTime(endDate)?.startOf('day');
    
    if (!startIST?.isValid || !endIST?.isValid) {
      console.warn("Invalid dates for date range check:", startIST, endIST);
      return false;
    }
    
    return nowIST >= startIST && nowIST <= endIST;
  } catch (e) {
    console.error("Error checking date range:", e);
    return false;
  }
}

// Use the consolidated function for both checks
export const isEventInProgress = isDateWithinEventRange;
export const canStartEvent = isDateWithinEventRange;
