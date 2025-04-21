import { Timestamp } from 'firebase/firestore';
import { DateTime } from 'luxon';

export const toIST = (date: Date | string | Timestamp | null): DateTime | null => {
  if (!date) return null;
  try {
    let dt: DateTime;
    if (date instanceof Timestamp) {
      dt = DateTime.fromJSDate(date.toDate());
    } else if (date instanceof Date) {
      dt = DateTime.fromJSDate(date);
    } else {
      dt = DateTime.fromISO(date);
    }
    return dt.setZone('Asia/Kolkata');
  } catch (e) {
    console.error('DateTime conversion error:', e);
    return null;
  }
};

export const formatISTDate = (date: Date | string | Timestamp | null, format: string = 'dd MMM yyyy'): string => {
  const dt = toIST(date);
  return dt ? dt.toFormat(format) : '';
};

export const getISTTimestamp = (date: Date | string | null): Timestamp | null => {
  const dt = toIST(date);
  return dt ? Timestamp.fromDate(dt.toJSDate()) : null;
};

export const validateEventDates = (
  startDate: Timestamp | Date | string | null,
  endDate: Timestamp | Date | string | null
): boolean => {
  const start = toIST(startDate)?.startOf('day');
  const end = toIST(endDate)?.startOf('day');
  if (!start || !end) return false;
  const now = DateTime.now().setZone('Asia/Kolkata').startOf('day');
  return start >= now && end >= start;
};

// Returns true if today (IST, date only) is between startDate and endDate (inclusive)
export const isEventInProgress = (event: { startDate: any; endDate: any; }): boolean => {
  const today = DateTime.now().setZone('Asia/Kolkata').startOf('day');
  const start = toIST(event.startDate)?.startOf('day');
  const end = toIST(event.endDate)?.startOf('day');
  if (!start || !end) return false;
  return today >= start && today <= end;
};

// Returns true if today (IST, date only) is between startDate and endDate (inclusive)
export const canStartEvent = (event: { startDate: any; endDate: any; }): boolean => {
  const today = DateTime.now().setZone('Asia/Kolkata').startOf('day');
  const start = toIST(event.startDate)?.startOf('day');
  const end = toIST(event.endDate)?.startOf('day');
  if (!start || !end) return false;
  return today >= start && today <= end;
};
