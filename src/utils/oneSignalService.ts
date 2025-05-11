import { getOneSignal, isOneSignalConfigured, isPushSupported } from './oneSignalUtils';

/**
 * Initialize OneSignal with proper configuration and error handling
 * @param userId Optional user ID to set for OneSignal
 * @returns Promise that resolves when OneSignal is initialized
 */
export async function initializeOneSignal(userId?: string | null): Promise<void> {
  try {
    // Skip if OneSignal is not configured or push is not supported
    if (!isOneSignalConfigured() || !isPushSupported()) {
      console.log('OneSignal not available for push registration');
      return;
    }

    const OneSignal = getOneSignal();
    if (!OneSignal) return;

    // Only initialize once
    if (OneSignal._initCalled) return;

    // Wait for OneSignal to be ready
    await new Promise<void>((resolve) => {
      OneSignal.push(() => {
        console.log('OneSignal SDK ready to be initialized');
        resolve();
      });
    });

    // Initialize with app ID from environment variable
    await new Promise<void>((resolve, reject) => {
      try {
        OneSignal.push(() => {
          OneSignal.init({
            appId: import.meta.env.VITE_ONESIGNAL_APP_ID,
            notifyButton: { enable: false },
            allowLocalhostAsSecureOrigin: true,
          })
            .then(() => {
              console.log('OneSignal initialized successfully');
              resolve();
            })
            .catch((error: any) => {
              console.error('OneSignal initialization error:', error);
              reject(error);
            });
        });
      } catch (err) {
        console.error('OneSignal push error:', err);
        reject(err);
      }
    });

    // Set external user ID if provided
    if (userId) {
      await new Promise<void>((resolve) => {
        OneSignal.push(() => {
          console.log('Setting OneSignal external user ID:', userId);
          OneSignal.setExternalUserId(userId)
            .then(() => resolve())
            .catch((error: any) => {
              console.error('Failed to set external user ID:', error);
              resolve(); // Continue even if this fails
            });
        });
      });
    }

    console.log('OneSignal setup complete');
  } catch (error) {
    console.error('OneSignal initialization failed:', error);
  }
}
