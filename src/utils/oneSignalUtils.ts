// src/utils/oneSignalUtils.ts

/**
 * Safely gets the OneSignal SDK instance from the window object.
 * Ensures the OneSignal push queue array exists.
 * @returns The OneSignal SDK instance or undefined if not available.
 */
export function getOneSignal(): any | undefined {
  // Ensure OneSignal array exists for push queue
  (window as any).OneSignal = (window as any).OneSignal || [];
  return (window as any).OneSignal;
}

/**
 * Checks if the OneSignal App ID is configured in the environment variables.
 * @returns True if the App ID is configured, false otherwise.
 */
export function isOneSignalConfigured(): boolean {
  return !!import.meta.env.VITE_ONESIGNAL_APP_ID;
}

/**
 * Checks if the browser supports basic push notification APIs.
 * @returns True if supported, false otherwise.
 */
export function isPushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}
