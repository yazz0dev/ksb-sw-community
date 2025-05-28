import type { Notification } from '@/types/store';

// The OneSignal utility functions (getOneSignal, isOneSignalConfigured, 
// isPushSupported, initializeOneSignal) have been removed from here 
// as their logic is now encapsulated within the usePushNotifications.ts composable.

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseFunctionKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = (): boolean => {
    return !!supabaseUrl && !!supabaseFunctionKey;
};

/**
 * Invokes the Supabase Edge Function to send a push notification via OneSignal.
 * @param payload - The data to send to the edge function, typically including
 *                  targetUserIds, messageTitle, messageBody, eventUrl, etc.
 * @returns The fetch Response object.
 * @throws Throws an error if Supabase is not configured or fetch fails.
 */
export async function invokePushNotification(payload: any): Promise<Response> {
    if (!isSupabaseConfigured()) {
        console.error('Supabase configuration missing. Cannot invoke push function.');
        throw new Error('Supabase configuration missing');
    }

    // Adjust the function name if you named it differently during creation
    const functionUrl = `${supabaseUrl}/functions/v1/push-notification`;

    console.log(`Invoking Supabase function at ${functionUrl} with payload:`, payload);

    try {
        const response = await fetch(functionUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${supabaseFunctionKey}`
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'Failed to parse error response' }));
            console.error(`Supabase function invocation failed (${response.status}):`, errorData);
            throw new Error(`Failed to invoke push notification function: ${errorData?.error || response.statusText}`);
        }

        console.log('Supabase function invoked successfully.');
        return response; // Return the response object

  } catch (error) {
        console.error('Error invoking Supabase function:', error);
        if (error instanceof Error) {
             throw error; // Re-throw the caught error
        } else {
             throw new Error('An unknown error occurred while invoking the push function.');
        }
    }
}
