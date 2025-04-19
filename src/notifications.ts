// Supabase Push Notification Helper

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseFunctionKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = (): boolean => {
    return !!supabaseUrl && !!supabaseFunctionKey;
};

export async function invokePushNotification(payload: any): Promise<Response> {
    if (!isSupabaseConfigured()) {
        throw new Error('Supabase configuration missing');
    }
    // The Edge Function name/path may need to be adjusted to match your deployment
    return fetch(`${supabaseUrl}/functions/v1/push-notification`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseFunctionKey}`
        },
        body: JSON.stringify(payload)
    });
}
