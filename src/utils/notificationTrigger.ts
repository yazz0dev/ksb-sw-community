export interface TriggerPayload {
  notificationType: 'eventApproved' | 'ratingOpen' | 'winnerAnnounced';
  targetUserIds: string[];
  messageTitle: string;
  messageBody: string;
  eventUrl?: string;
  eventName?: string;
  winningCriteria?: string;
}

export async function triggerNotification(payload: TriggerPayload): Promise<void> {
  const workerUrl = import.meta.env.VITE_CLOUDFLARE_WORKER_URL;
  const workerSecret = import.meta.env.VITE_CLOUDFLARE_WORKER_SECRET;

  if (!workerUrl || !workerSecret) {
    console.error('Cloudflare Worker URL or Secret not set in environment variables.');
    return;
  }
  if (!Array.isArray(payload.targetUserIds) || payload.targetUserIds.length === 0 || payload.targetUserIds.some(id => typeof id !== 'string' || !id)) {
    console.error('Invalid or empty targetUserIds for notification trigger.');
    return;
  }

  try {
    const response = await fetch(workerUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, secret: workerSecret }),
    });
    const result = await response.json();
    if (response.ok && result.success) {
      console.log('Notification triggered successfully:', result.message);
    } else {
      console.error('Notification trigger failed:', result.error || result.message);
    }
  } catch (err) {
    console.error('Error triggering notification:', err);
  }
}
