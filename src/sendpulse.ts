// src/sendpulse.ts
import { functions, isAppwriteConfigured } from './appwrite';

// --- Appwrite/SendPulse Integration ---

declare global {
    interface Window {
        // Define SendPulse's expected global object/functions based on their SDK
        oSpP?: {
            detectSite?: () => void;
            push?: (command: string, callback: (result: any) => void) => void;
            // Add other methods/properties as needed from SendPulse docs
        };
    }
}

// Function to update Appwrite preferences with the SendPulse ID
async function updatePushPreferences(subscriberId: string) {
    if (!subscriberId || !isAppwriteConfigured()) {
        console.warn("Missing subscriberId or Appwrite config, cannot update prefs.");
        return;
    }

    try {
        const payload = { sendpulseSubscriberId: subscriberId };
        console.log("Updating Appwrite push prefs with:", payload);
        // Function ID must match the deployed function name in Appwrite
        await functions.createExecution(
            'update-user-push-prefs', // <- Ensure this matches your deployed function name/ID
            JSON.stringify(payload),
            false // async
        );
        console.log('Successfully requested update for push preferences.');
    } catch (error) {
        console.error('Error updating Appwrite push preferences:', error);
        // Optionally notify the user via Vuex notification store
    }
}

// Function to initialize SendPulse and handle subscription
export function initSendpulse() {
    // Check if SendPulse script has loaded
    if (typeof window.oSpP === 'undefined') {
        console.warn("SendPulse SDK (oSpP) not found. Ensure the script is loaded in index.html.");
        return;
    }

    console.log("Initializing SendPulse...");

    // Example: Get subscription status and subscriber ID
    // IMPORTANT: Adapt this based on the actual SendPulse SDK methods
    window.oSpP.push?.('getSubscriptionStatus', (status) => {
        console.log('SendPulse Subscription Status:', status);
        if (status === 'subscribed') {
            window.oSpP?.push?.('getSubscriberId', (subscriberId) => {
                console.log('SendPulse Subscriber ID:', subscriberId);
                if (subscriberId) {
                    // Store this ID in Appwrite user preferences
                    updatePushPreferences(subscriberId);
                }
            });
        } else {
            // Optional: Prompt user to subscribe if not already subscribed
            // showSubscriptionPrompt(); // Implement this UI function elsewhere
            console.log("User not subscribed to SendPulse notifications.");
        }
    });

    // You might need other initialization steps based on SendPulse docs
    // E.g., window.oSpP.detectSite?.();
}

// Example: Function to trigger the SendPulse subscription prompt (call this from UI)
export function promptForPushSubscription() {
    if (typeof window.oSpP === 'undefined' || typeof window.oSpP.push !== 'function') {
        console.error("SendPulse SDK not available to prompt for subscription.");
        return;
    }

    console.log("Prompting user for push subscription...");
    // IMPORTANT: This is a guess based on common patterns. Check SendPulse docs.
    // It might involve showing a native prompt or a custom UI element.
    // SendPulse might handle the prompt automatically on init or via a specific method.
    // If manual, after user clicks "Allow", you'd call the getSubscriberId logic again.

    // Example if SendPulse has a direct subscribe method:
    // window.oSpP.push('subscribe', (result) => {
    //     console.log('Subscription attempt result:', result);
    //     if (result.success && result.subscriber_id) {
    //         updatePushPreferences(result.subscriber_id);
    //     } else {
    //         console.error('Failed to subscribe:', result.error);
    //     }
    // });
}