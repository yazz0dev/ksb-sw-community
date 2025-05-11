// Import the OneSignal SDK worker script
importScripts('https://cdn.onesignal.com/sdks/OneSignalSDKWorker.js');

// Configure OneSignal service worker
self.addEventListener('message', function(event) {
  // Handle any required custom service worker events
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});