// public/sw.js
console.log('Service Worker Loaded');

self.addEventListener('push', event => {
    console.log('[Service Worker] Push Received.');
    console.log(`[Service Worker] Push had this data: "${event.data.text()}"`);

    try {
        const data = event.data.json(); // Assuming JSON payload from Appwrite Function

        const title = data.title || 'KSB Tech Community';
        const options = {
            body: data.body || 'You received a notification.',
            icon: data.icon || '/img/icons/android-chrome-192x192.png', // Default icon
            badge: data.badge || '/img/icons/favicon-32x32.png',      // Default badge
            data: data.data || {}, // Any extra data (like URL)
            tag: data.tag || 'ksb-notification', // Optional tag to replace existing notifications
        };

        event.waitUntil(self.registration.showNotification(title, options));
    } catch (e) {
        console.error('Error parsing push data or showing notification:', e);
        // Fallback for non-JSON data
        const title = 'KSB Tech Community';
        const options = {
            body: event.data.text() || 'You received a notification.',
            icon: '/img/icons/android-chrome-192x192.png',
            badge: '/img/icons/favicon-32x32.png',
        };
        event.waitUntil(self.registration.showNotification(title, options));
    }
});

self.addEventListener('notificationclick', event => {
    console.log('[Service Worker] Notification click Received.');

    event.notification.close();

    // Example: Open a specific URL if provided in data
    if (event.notification.data && event.notification.data.url) {
        event.waitUntil(
            clients.openWindow(event.notification.data.url)
        );
    } else {
         // Default action: focus existing window or open root
         event.waitUntil(clients.matchAll({
            type: "window"
         }).then(clientList => {
            for (const client of clientList) {
                if ('focus' in client) return client.focus();
            }
            if (clients.openWindow) return clients.openWindow('/');
         }));
    }
});