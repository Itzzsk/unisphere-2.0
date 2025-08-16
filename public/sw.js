// Service Worker for UniSphere Oracle System
const CACHE_NAME = 'unisphere-oracle-v1';
const urlsToCache = [
  '/',
  '/script.js',
  '/manifest.json',
  '/icon-192x192.png'
];

// Install event
self.addEventListener('install', event => {
  console.log('🔮 Oracle Service Worker installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
  
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', event => {
  console.log('🔮 Oracle Service Worker activated');
  event.waitUntil(self.clients.claim());
});

// Handle push notifications
self.addEventListener('push', event => {
  console.log('🔮 Push notification received:', event);
  
  if (!event.data) return;
  
  const data = event.data.json();
  const title = data.title || '🔮 UniSphere Oracle';
  const options = {
    body: data.body || 'The universe has spoken...',
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    data: {
      url: data.url || '/',
      timestamp: Date.now(),
      type: data.type || 'oracle'
    },
    tag: `oracle-${data.type || 'default'}`,
    requireInteraction: data.requireInteraction || false,
    actions: [
      {
        action: 'open',
        title: 'Open UniSphere',
        icon: '/icon-192x192.png'
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
        icon: '/icon-192x192.png'
      }
    ],
    vibrate: [200, 100, 200, 100, 200]
  };
  
  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', event => {
  console.log('🔮 Oracle notification clicked:', event);
  
  event.notification.close();
  
  if (event.action === 'open' || !event.action) {
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then(windowClients => {
        // Check if UniSphere is already open
        for (let client of windowClients) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            return client.focus();
          }
        }
        
        // Open new window if not already open
        if (clients.openWindow) {
          return clients.openWindow(event.notification.data.url || '/');
        }
      })
    );
  }
});

// Background sync for oracle predictions
self.addEventListener('sync', event => {
  if (event.tag === 'oracle-sync') {
    event.waitUntil(syncOracleData());
  }
});

async function syncOracleData() {
  console.log('🔮 Syncing oracle data...');
  // Sync user patterns and predictions with server
}

// Handle oracle-specific messages
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'ORACLE_COMMAND') {
    console.log('🔮 Oracle command received:', event.data);
    
    switch (event.data.command) {
      case 'SEND_FORTUNE':
        // Send scheduled fortune
        self.registration.showNotification('🔮 Your Fortune', {
          body: event.data.fortune,
          icon: '/icon-192x192.png',
          tag: 'fortune'
        });
        break;
        
      case 'PSYCHIC_ALERT':
        // Send psychic alert
        self.registration.showNotification('👁️ Psychic Connection', {
          body: event.data.message,
          icon: '/icon-192x192.png',
          tag: 'psychic'
        });
        break;
    }
  }
});
