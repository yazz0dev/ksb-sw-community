/**
 * Performs a deep clone of an object.
 * Note: This simple version using JSON.stringify/parse has limitations
 * (e.g., doesn't handle Dates, Functions, undefined, Infinity, NaN, RegExps, Maps, Sets correctly).
 * For more robust cloning, consider a library like lodash.cloneDeep.
 * @param obj The object to clone.
 * @returns A deep clone of the object.
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  try {
    return JSON.parse(JSON.stringify(obj));
  } catch (e) {
    console.error("deepClone failed:", e);
    // Fallback or re-throw, depending on desired error handling
    // For simplicity, returning the original object on failure,
    // but this means it's not a true clone in case of error.
    return obj;
  }
}

/**
 * Gets the current Firestore Timestamp.
 * @returns A Firestore Timestamp representing the current time.
 */
import { Timestamp } from 'firebase/firestore'; // Add this import

export function now(): Timestamp {
  return Timestamp.now();
}

/**
 * Checks if a value is empty.
 * Considers null, undefined, empty string, empty array, or empty object as empty.
 * @param value The value to check.
 * @returns True if the value is empty, false otherwise.
 */
export function isEmpty(value: any): boolean {
  if (value === null || value === undefined) {
    return true;
  }
  if (typeof value === 'string' && value.trim() === '') {
    return true;
  }
  if (Array.isArray(value) && value.length === 0) {
    return true;
  }
  if (typeof value === 'object' && Object.keys(value).length === 0 && !(value instanceof Date)) {
    return true;
  }
  return false;
}
